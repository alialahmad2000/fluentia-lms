-- AI Coach B2: hint_usage cap tracking on writing submissions
-- Adds hint_usage column to student_curriculum_progress for writing rows.
-- Each entry: { "action": "ideas", "used_at": "...", "tokens": 230 }
-- Max 3 entries enforced server-side in ai-writing-assistant edge function.

BEGIN;

ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS hint_usage jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN student_curriculum_progress.hint_usage IS
  'Hint requests for this submission (writing only). Cap: 3 per submission. Enforced server-side.';

-- Backfill: all existing writing rows already have empty array from DEFAULT
-- No explicit UPDATE needed — ADD COLUMN IF NOT EXISTS DEFAULT handles it.

COMMIT;
