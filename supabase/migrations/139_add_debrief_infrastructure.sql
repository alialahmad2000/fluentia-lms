-- Unit Debrief infrastructure: skill snapshots + synthesis RPCs

-- Before/After skill radar snapshots (captured when student first opens a unit)
CREATE TABLE IF NOT EXISTS student_unit_skill_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 0-100 normalized scores (synthesized from completed activities at snapshot time)
  reading_score SMALLINT DEFAULT 0,
  vocabulary_score SMALLINT DEFAULT 0,
  grammar_score SMALLINT DEFAULT 0,
  listening_score SMALLINT DEFAULT 0,
  writing_score SMALLINT DEFAULT 0,
  speaking_score SMALLINT DEFAULT 0,
  pronunciation_score SMALLINT DEFAULT 0,

  UNIQUE(student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_uss_student_unit
  ON student_unit_skill_snapshots (student_id, unit_id);

ALTER TABLE student_unit_skill_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uss_self_select ON student_unit_skill_snapshots;
CREATE POLICY uss_self_select ON student_unit_skill_snapshots
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS uss_self_insert ON student_unit_skill_snapshots;
CREATE POLICY uss_self_insert ON student_unit_skill_snapshots
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS uss_trainer_admin_read ON student_unit_skill_snapshots;
CREATE POLICY uss_trainer_admin_read ON student_unit_skill_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('trainer','admin'))
  );

-- RPC: synthesize current skill scores from student_curriculum_progress
-- (Uses completed activity counts; each activity type contributes to the relevant skill)
DROP FUNCTION IF EXISTS get_student_skill_scores(UUID);
CREATE OR REPLACE FUNCTION get_student_skill_scores(p_student_id UUID)
RETURNS TABLE(
  reading_score SMALLINT,
  vocabulary_score SMALLINT,
  grammar_score SMALLINT,
  listening_score SMALLINT,
  writing_score SMALLINT,
  speaking_score SMALLINT,
  pronunciation_score SMALLINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'reading') * 8)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type IN ('vocabulary','vocabulary_exercise')) * 4)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'grammar') * 10)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'listening') * 10)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'writing') * 14)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'speaking') * 12)::SMALLINT,
    LEAST(100, COUNT(*) FILTER (WHERE section_type = 'pronunciation') * 8)::SMALLINT
  FROM student_curriculum_progress
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND is_latest = true;
$$;

GRANT EXECUTE ON FUNCTION get_student_skill_scores(UUID) TO authenticated;

-- RPC: median completion time for a unit (uses MIN(created_at) as start proxy)
DROP FUNCTION IF EXISTS get_unit_median_completion_minutes(UUID);
CREATE OR REPLACE FUNCTION get_unit_median_completion_minutes(p_unit_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT ROUND(
        EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (
          ORDER BY (unit_max - unit_min)
        )) / 60
      )::INTEGER
      FROM (
        SELECT
          student_id,
          MIN(created_at) AS unit_min,
          MAX(completed_at) AS unit_max
        FROM student_curriculum_progress
        WHERE unit_id = p_unit_id
          AND status = 'completed'
          AND completed_at IS NOT NULL
        GROUP BY student_id
        HAVING COUNT(*) >= 3
      ) t
    ),
    NULL
  );
$$;

GRANT EXECUTE ON FUNCTION get_unit_median_completion_minutes(UUID) TO authenticated;
