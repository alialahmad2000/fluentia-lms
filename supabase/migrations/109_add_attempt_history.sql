-- ============================================
-- 109: Retry support for speaking & writing submissions
-- Adds attempt tracking (attempt_number, is_latest, is_best)
-- with automatic management via triggers
-- ============================================

-- ─── 1. Add columns to speaking_recordings ───
ALTER TABLE speaking_recordings
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_best boolean NOT NULL DEFAULT true;

-- ─── 2. Add columns to writing_history ───
ALTER TABLE writing_history
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_best boolean NOT NULL DEFAULT true;

-- ─── 3. Backfill existing rows ───
UPDATE speaking_recordings SET attempt_number = 1, is_latest = true, is_best = true;
UPDATE writing_history SET attempt_number = 1, is_latest = true, is_best = true;

-- For speaking: if multiple recordings exist per (student, unit, question), fix them
-- Mark only the newest as is_latest, and the highest-scored as is_best
WITH ranked_speaking AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY student_id, unit_id, question_index ORDER BY created_at) AS rn,
    ROW_NUMBER() OVER (PARTITION BY student_id, unit_id, question_index ORDER BY created_at DESC) AS rn_desc
  FROM speaking_recordings
)
UPDATE speaking_recordings sr
SET attempt_number = rs.rn,
    is_latest = (rs.rn_desc = 1)
FROM ranked_speaking rs
WHERE sr.id = rs.id;

-- For writing: if multiple submissions exist per (student, task_type, prompt_used)
WITH ranked_writing AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY student_id, task_type, COALESCE(prompt_used, '') ORDER BY created_at) AS rn,
    ROW_NUMBER() OVER (PARTITION BY student_id, task_type, COALESCE(prompt_used, '') ORDER BY created_at DESC) AS rn_desc
  FROM writing_history
)
UPDATE writing_history wh
SET attempt_number = rw.rn,
    is_latest = (rw.rn_desc = 1)
FROM ranked_writing rw
WHERE wh.id = rw.id;

-- ─── 4. Indexes for fast latest/best queries ───
CREATE INDEX IF NOT EXISTS idx_speaking_latest ON speaking_recordings(student_id, unit_id, question_index) WHERE is_latest;
CREATE INDEX IF NOT EXISTS idx_speaking_best ON speaking_recordings(student_id, unit_id, question_index) WHERE is_best;
CREATE INDEX IF NOT EXISTS idx_writing_latest ON writing_history(student_id, task_type) WHERE is_latest;
CREATE INDEX IF NOT EXISTS idx_writing_best ON writing_history(student_id, task_type) WHERE is_best;

-- ─── 5. Trigger: speaking_recordings — auto-manage attempts on INSERT ───
CREATE OR REPLACE FUNCTION speaking_attempt_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_attempt integer;
BEGIN
  -- Get current max attempt number for this activity
  SELECT COALESCE(MAX(attempt_number), 0) INTO max_attempt
  FROM speaking_recordings
  WHERE student_id = NEW.student_id
    AND unit_id = NEW.unit_id
    AND question_index = NEW.question_index;

  NEW.attempt_number := max_attempt + 1;
  NEW.is_latest := true;
  NEW.is_best := (max_attempt = 0); -- First attempt is always best until evaluated

  -- Mark all previous attempts as not latest
  UPDATE speaking_recordings
  SET is_latest = false
  WHERE student_id = NEW.student_id
    AND unit_id = NEW.unit_id
    AND question_index = NEW.question_index
    AND is_latest = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speaking_attempt_before_insert_trigger ON speaking_recordings;
CREATE TRIGGER speaking_attempt_before_insert_trigger
  BEFORE INSERT ON speaking_recordings
  FOR EACH ROW
  EXECUTE FUNCTION speaking_attempt_before_insert();

-- ─── 6. Trigger: speaking_recordings — recompute is_best when evaluation arrives ───
CREATE OR REPLACE FUNCTION speaking_recompute_best()
RETURNS TRIGGER AS $$
DECLARE
  best_id uuid;
BEGIN
  -- Only act when ai_evaluation changes
  IF OLD.ai_evaluation IS NOT DISTINCT FROM NEW.ai_evaluation THEN
    RETURN NEW;
  END IF;

  -- Find the attempt with highest overall_score (tie: latest wins)
  SELECT id INTO best_id
  FROM speaking_recordings
  WHERE student_id = NEW.student_id
    AND unit_id = NEW.unit_id
    AND question_index = NEW.question_index
    AND ai_evaluation IS NOT NULL
  ORDER BY (ai_evaluation->>'overall_score')::numeric DESC, created_at DESC
  LIMIT 1;

  -- Reset all is_best for this activity
  UPDATE speaking_recordings
  SET is_best = (id = best_id)
  WHERE student_id = NEW.student_id
    AND unit_id = NEW.unit_id
    AND question_index = NEW.question_index;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speaking_recompute_best_trigger ON speaking_recordings;
CREATE TRIGGER speaking_recompute_best_trigger
  AFTER UPDATE ON speaking_recordings
  FOR EACH ROW
  EXECUTE FUNCTION speaking_recompute_best();

-- ─── 7. Trigger: writing_history — auto-manage attempts on INSERT ───
CREATE OR REPLACE FUNCTION writing_attempt_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  max_attempt integer;
  best_id uuid;
  best_score numeric;
BEGIN
  -- Get current max attempt number for this activity
  SELECT COALESCE(MAX(attempt_number), 0) INTO max_attempt
  FROM writing_history
  WHERE student_id = NEW.student_id
    AND task_type = NEW.task_type
    AND COALESCE(prompt_used, '') = COALESCE(NEW.prompt_used, '');

  NEW.attempt_number := max_attempt + 1;
  NEW.is_latest := true;

  -- Mark all previous attempts as not latest
  UPDATE writing_history
  SET is_latest = false
  WHERE student_id = NEW.student_id
    AND task_type = NEW.task_type
    AND COALESCE(prompt_used, '') = COALESCE(NEW.prompt_used, '')
    AND is_latest = true;

  -- Determine if this is best (compare with previous best score)
  SELECT id, COALESCE(fluency_score, 0) INTO best_id, best_score
  FROM writing_history
  WHERE student_id = NEW.student_id
    AND task_type = NEW.task_type
    AND COALESCE(prompt_used, '') = COALESCE(NEW.prompt_used, '')
    AND is_best = true
  LIMIT 1;

  IF best_id IS NULL OR COALESCE(NEW.fluency_score, 0) >= best_score THEN
    NEW.is_best := true;
    -- Unmark previous best
    IF best_id IS NOT NULL THEN
      UPDATE writing_history SET is_best = false WHERE id = best_id;
    END IF;
  ELSE
    NEW.is_best := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS writing_attempt_before_insert_trigger ON writing_history;
CREATE TRIGGER writing_attempt_before_insert_trigger
  BEFORE INSERT ON writing_history
  FOR EACH ROW
  EXECUTE FUNCTION writing_attempt_before_insert();
