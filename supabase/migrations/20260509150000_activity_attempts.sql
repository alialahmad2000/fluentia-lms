-- activity_attempts: generic attempt table for curriculum assessments.
-- Each row is one student attempt at one activity (curriculum_assessments).
-- Security model:
--   Students: INSERT own rows (status auto-defaults to in_progress)
--             UPDATE only the `answers` column (everything else via edge function)
--   Edge functions (service role): UPDATE status, score, graded_details, etc.

BEGIN;

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_attempts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id         UUID        NOT NULL REFERENCES curriculum_assessments(id) ON DELETE CASCADE,

  -- Attempt sequencing
  attempt_number      INT         NOT NULL DEFAULT 1,

  -- Lifecycle
  status              TEXT        NOT NULL DEFAULT 'in_progress'
                                  CHECK (status IN ('in_progress','submitted','abandoned')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at        TIMESTAMPTZ,
  abandoned_at        TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,                  -- soft delete; never hard-delete

  -- Student work (updated by client directly)
  answers             JSONB       NOT NULL DEFAULT '{}',

  -- Grading results (written only by submit edge function via service role)
  score               NUMERIC,                      -- 0–100 percentage
  correct_count       INT,
  total_questions     INT,
  graded_details      JSONB,                        -- per-question breakdown

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at auto-stamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_attempts_updated_at ON activity_attempts;
CREATE TRIGGER trg_activity_attempts_updated_at
  BEFORE UPDATE ON activity_attempts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-increment attempt_number per (student, activity)
CREATE OR REPLACE FUNCTION set_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO NEW.attempt_number
  FROM activity_attempts
  WHERE student_id  = NEW.student_id
    AND activity_id = NEW.activity_id
    AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_attempt_number ON activity_attempts;
CREATE TRIGGER trg_set_attempt_number
  BEFORE INSERT ON activity_attempts
  FOR EACH ROW EXECUTE FUNCTION set_attempt_number();

-- Block phantom: only allow submission when answers is non-empty
CREATE OR REPLACE FUNCTION block_phantom_activity_attempt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' THEN
    IF NEW.answers IS NULL OR NEW.answers = '{}'::jsonb THEN
      RAISE EXCEPTION 'PHANTOM_BLOCK: cannot submit activity_attempt with empty answers'
        USING HINT = 'Student must answer at least one question before submitting.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_phantom_activity ON activity_attempts;
CREATE TRIGGER trg_block_phantom_activity
  BEFORE INSERT OR UPDATE ON activity_attempts
  FOR EACH ROW EXECUTE FUNCTION block_phantom_activity_attempt();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_attempts_student
  ON activity_attempts(student_id, activity_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_attempts_in_progress
  ON activity_attempts(student_id, activity_id)
  WHERE status = 'in_progress' AND deleted_at IS NULL;

-- ─── View: best score per student per activity ────────────────────────────────
CREATE OR REPLACE VIEW student_activity_best_score AS
SELECT
  student_id,
  activity_id,
  MAX(score)    AS best_score,
  COUNT(*)      AS attempt_count,
  MAX(score) >= 80 AS is_mastered
FROM activity_attempts
WHERE status = 'submitted'
  AND deleted_at IS NULL
GROUP BY student_id, activity_id;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE activity_attempts ENABLE ROW LEVEL SECURITY;

-- Students: see only their own attempts
DROP POLICY IF EXISTS "student_select_own_attempts" ON activity_attempts;
CREATE POLICY "student_select_own_attempts"
  ON activity_attempts FOR SELECT
  USING (student_id = auth.uid() AND deleted_at IS NULL);

-- Students: create new attempts for themselves (status must be in_progress on INSERT)
DROP POLICY IF EXISTS "student_insert_own_attempts" ON activity_attempts;
CREATE POLICY "student_insert_own_attempts"
  ON activity_attempts FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'in_progress'       -- cannot INSERT as submitted
  );

-- Students: update ONLY the answers column on their own in_progress attempts
DROP POLICY IF EXISTS "student_update_answers_only" ON activity_attempts;
CREATE POLICY "student_update_answers_only"
  ON activity_attempts FOR UPDATE
  USING (student_id = auth.uid() AND status = 'in_progress' AND deleted_at IS NULL)
  WITH CHECK (
    student_id   = student_id       -- cannot change ownership
    AND activity_id = activity_id   -- cannot change which activity
    AND status   = 'in_progress'    -- cannot change status (edge function does that)
    AND score    IS NULL            -- cannot write score (edge function does that)
  );

-- Trainers: read all attempts for their group's students
DROP POLICY IF EXISTS "trainer_select_student_attempts" ON activity_attempts;
CREATE POLICY "trainer_select_student_attempts"
  ON activity_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer','admin')
    )
    AND deleted_at IS NULL
  );

-- Service role (edge functions): unrestricted
DROP POLICY IF EXISTS "service_role_all" ON activity_attempts;
CREATE POLICY "service_role_all"
  ON activity_attempts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
