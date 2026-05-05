BEGIN;

-- 1. Add status tracking columns (idempotent)
ALTER TABLE speaking_recordings
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (evaluation_status IN ('pending','evaluating','completed','failed_retrying','failed_manual')),
  ADD COLUMN IF NOT EXISTS evaluation_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 2. Backfill: rows that already have ai_evaluation → completed
UPDATE speaking_recordings
   SET evaluation_status = 'completed',
       evaluation_attempts = 1
 WHERE ai_evaluation IS NOT NULL
   AND evaluation_status = 'pending';

-- ASSERT: backfill count must match rows with ai_evaluation
DO $$
DECLARE
  expected INT;
  actual INT;
BEGIN
  SELECT COUNT(*) INTO expected FROM speaking_recordings WHERE ai_evaluation IS NOT NULL;
  SELECT COUNT(*) INTO actual   FROM speaking_recordings WHERE evaluation_status = 'completed';
  IF expected <> actual THEN
    RAISE EXCEPTION 'Backfill mismatch: expected %, got %', expected, actual;
  END IF;
END $$;

-- 3. Index for the sweeper query
CREATE INDEX IF NOT EXISTS idx_speaking_eval_sweep
  ON speaking_recordings (evaluation_status, last_attempt_at)
  WHERE evaluation_status IN ('pending','evaluating','failed_retrying');

-- 4. Add speaking_needs_manual_review to notification type enum (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%notification%type%'
      AND e.enumlabel = 'speaking_needs_manual_review'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'speaking_needs_manual_review';
  END IF;
END $$;

COMMIT;
