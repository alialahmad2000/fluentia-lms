-- Universal multi-attempt schema: drop constraints blocking retry,
-- add indexes, add phantom-audit columns, install guard trigger.

BEGIN;

-- ─── Phantom audit columns (for heal migration + future tracking) ───────────
ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS is_phantom        BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phantom_healed_at TIMESTAMPTZ;

-- ─── Drop unique constraints that forced the single-row upsert model ─────────
-- These prevented Reading and Listening from creating multiple attempt rows.
-- Grammar never had these (INSERT-per-attempt) and already works correctly.
ALTER TABLE student_curriculum_progress
  DROP CONSTRAINT IF EXISTS scp_unique_reading;

ALTER TABLE student_curriculum_progress
  DROP CONSTRAINT IF EXISTS scp_unique_listening;

-- ─── Indexes for fast latest/best lookup (replaces the unique-constraint scan) ─
CREATE INDEX IF NOT EXISTS idx_scp_reading_latest
  ON student_curriculum_progress(student_id, reading_id)
  WHERE is_latest AND reading_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scp_reading_best
  ON student_curriculum_progress(student_id, reading_id)
  WHERE is_best AND reading_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scp_listening_latest
  ON student_curriculum_progress(student_id, listening_id)
  WHERE is_latest AND listening_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scp_listening_best
  ON student_curriculum_progress(student_id, listening_id)
  WHERE is_best AND listening_id IS NOT NULL;

-- ─── DB-level guard: block phantom submissions ───────────────────────────────
-- Rejects any INSERT or UPDATE that tries to mark a row as completed/graded
-- while the answers field is empty or null. This is the load-bearing guarantee:
-- even if a future code regression tries to auto-submit, the DB rejects it.
CREATE OR REPLACE FUNCTION block_phantom_submission()
RETURNS TRIGGER AS $$
DECLARE
  answers_empty BOOLEAN;
BEGIN
  IF NEW.status IN ('completed', 'submitted', 'graded') THEN
    -- Determine if answers are empty
    IF NEW.answers IS NULL THEN
      answers_empty := true;
    ELSIF jsonb_typeof(NEW.answers) = 'object' THEN
      answers_empty := (NEW.answers = '{}'::jsonb);
    ELSIF jsonb_typeof(NEW.answers) = 'array' THEN
      answers_empty := (jsonb_array_length(NEW.answers) = 0);
    ELSIF NEW.answers::text IN ('null', '[]', '{}') THEN
      answers_empty := true;
    ELSE
      answers_empty := false;
    END IF;

    IF answers_empty THEN
      RAISE EXCEPTION 'PHANTOM_BLOCK: cannot mark section_type=% as % with empty answers. This is the auto-submit-on-reload guard.',
        COALESCE(NEW.section_type, '?'), NEW.status
        USING HINT = 'Student must have real answers before submission is accepted.';
    END IF;

    -- Extra check for listening: block if all questions have null studentAnswer
    IF NEW.section_type = 'listening' AND jsonb_typeof(NEW.answers) = 'object'
       AND NEW.answers ? 'questions'
       AND jsonb_typeof(NEW.answers->'questions') = 'array' THEN
      IF (
        SELECT COUNT(*) FROM jsonb_array_elements(NEW.answers->'questions') q
        WHERE q->>'studentAnswer' IS NOT NULL AND q->>'studentAnswer' != 'null'
      ) = 0 THEN
        RAISE EXCEPTION 'PHANTOM_BLOCK: listening submission blocked — all %s questions have null studentAnswer',
          jsonb_array_length(NEW.answers->'questions')
          USING HINT = 'All listening answers are null — student did not actually answer.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_phantom ON student_curriculum_progress;
CREATE TRIGGER trg_block_phantom
  BEFORE INSERT OR UPDATE ON student_curriculum_progress
  FOR EACH ROW
  EXECUTE FUNCTION block_phantom_submission();

COMMIT;
