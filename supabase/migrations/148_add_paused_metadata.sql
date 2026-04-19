-- Add paused_at and paused_reason columns to students
-- Used for soft-blocking students who leave but may return.
-- Reversible: restore status to 'active' and clear these columns.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS paused_reason TEXT NULL;

COMMENT ON COLUMN students.paused_at     IS 'When the student was paused from the academy';
COMMENT ON COLUMN students.paused_reason IS 'JSON: reason, original_group_id, paused_by — used to restore if student returns';
