-- P0-B: Add attempt tracking columns for curriculum progress retry
ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS attempt_number int DEFAULT 1;

ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS attempt_history jsonb DEFAULT '[]'::jsonb;
