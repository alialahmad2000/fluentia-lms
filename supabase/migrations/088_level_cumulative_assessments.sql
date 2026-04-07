-- Migration 088: Level cumulative assessments schema
-- Adds promotion gate infrastructure for level-end exit tests

-- assessment_type column already exists (default 'unit_quiz')
-- unit_id is already nullable
-- Add CHECK constraint for assessment_type values if not already constrained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%assessment_type%'
  ) THEN
    ALTER TABLE curriculum_assessments
    ADD CONSTRAINT chk_assessment_type
    CHECK (assessment_type IN ('unit_quiz', 'level_cumulative', 'progress_checkpoint'));
  END IF;
END $$;

-- Add is_promotion_gate column
ALTER TABLE curriculum_assessments
  ADD COLUMN IF NOT EXISTS is_promotion_gate BOOLEAN DEFAULT FALSE;

-- Create student_level_assessment_attempts table
CREATE TABLE IF NOT EXISTS student_level_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES curriculum_assessments(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score_percent NUMERIC(5,2),
  total_questions INTEGER,
  correct_answers INTEGER,
  answers JSONB,
  passed BOOLEAN,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  duration_seconds INTEGER,
  UNIQUE(student_id, assessment_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_slaa_student
  ON student_level_assessment_attempts(student_id, level_id);

CREATE INDEX IF NOT EXISTS idx_slaa_passed
  ON student_level_assessment_attempts(student_id, passed);

-- RLS
ALTER TABLE student_level_assessment_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_level_assessment_attempts' AND policyname = 'Students view own attempts'
  ) THEN
    CREATE POLICY "Students view own attempts" ON student_level_assessment_attempts
      FOR SELECT USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer'))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_level_assessment_attempts' AND policyname = 'Students insert own attempts'
  ) THEN
    CREATE POLICY "Students insert own attempts" ON student_level_assessment_attempts
      FOR INSERT WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_level_assessment_attempts' AND policyname = 'Students update own attempts'
  ) THEN
    CREATE POLICY "Students update own attempts" ON student_level_assessment_attempts
      FOR UPDATE USING (student_id = auth.uid());
  END IF;
END $$;

-- Helper view: has student passed the level exit test?
CREATE OR REPLACE VIEW student_level_exit_status AS
SELECT
  p.id AS student_id,
  cl.id AS level_id,
  cl.level_number,
  bool_or(slaa.passed) AS has_passed,
  MAX(slaa.score_percent) AS best_score,
  COUNT(slaa.id) AS total_attempts,
  MAX(slaa.submitted_at) AS last_attempt_at
FROM profiles p
CROSS JOIN curriculum_levels cl
LEFT JOIN student_level_assessment_attempts slaa
  ON slaa.student_id = p.id AND slaa.level_id = cl.id
WHERE p.role = 'student'
GROUP BY p.id, cl.id, cl.level_number;

GRANT SELECT ON student_level_exit_status TO authenticated;

-- RPC: check if student is eligible to take the level exit test
CREATE OR REPLACE FUNCTION check_level_exit_eligibility(
  p_student_id UUID,
  p_level_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    units_total INTEGER;
    units_completed INTEGER;
    already_passed BOOLEAN;
    last_attempt_at TIMESTAMPTZ;
    cooldown_until TIMESTAMPTZ;
    attempt_count INTEGER;
BEGIN
    -- Count units in level
    SELECT COUNT(*) INTO units_total
    FROM curriculum_units WHERE level_id = p_level_id;

    -- Count completed units for this student
    -- A unit is "completed" if student has at least one completed section in it
    SELECT COUNT(DISTINCT cu.id) INTO units_completed
    FROM curriculum_units cu
    WHERE cu.level_id = p_level_id
      AND EXISTS (
        SELECT 1 FROM student_curriculum_progress scp
        WHERE scp.unit_id = cu.id
          AND scp.student_id = p_student_id
          AND scp.status = 'completed'
      );

    -- Already passed?
    SELECT bool_or(passed), MAX(submitted_at), COUNT(*)
    INTO already_passed, last_attempt_at, attempt_count
    FROM student_level_assessment_attempts slaa
    JOIN curriculum_assessments ca ON ca.id = slaa.assessment_id
    WHERE slaa.student_id = p_student_id
      AND ca.level_id = p_level_id
      AND ca.assessment_type = 'level_cumulative';

    already_passed := COALESCE(already_passed, FALSE);
    cooldown_until := COALESCE(last_attempt_at + INTERVAL '24 hours', NOW() - INTERVAL '1 hour');

    RETURN jsonb_build_object(
      'units_total', units_total,
      'units_completed', units_completed,
      'completion_ratio', ROUND((units_completed::numeric / NULLIF(units_total,0)) * 100, 1),
      'meets_completion_threshold', units_completed >= CEIL(units_total * 0.8)::int,
      'already_passed', already_passed,
      'last_attempt_at', last_attempt_at,
      'cooldown_until', cooldown_until,
      'attempt_count', COALESCE(attempt_count, 0),
      'can_take_test',
        (units_completed >= CEIL(units_total * 0.8)::int)
        AND NOT already_passed
        AND (last_attempt_at IS NULL OR NOW() > (last_attempt_at + INTERVAL '24 hours'))
    );
END $$;

GRANT EXECUTE ON FUNCTION check_level_exit_eligibility(UUID, UUID) TO authenticated;
