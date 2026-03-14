-- 019: Weekly Tasks Enhancements
-- Adds: difficulty_score, is_edited_by_trainer, deleted_at, vocabulary task type support
-- Run in Supabase SQL Editor

-- 1. Add difficulty_score to weekly_task_sets (adaptive difficulty 0.00-1.00)
ALTER TABLE weekly_task_sets
  ADD COLUMN IF NOT EXISTS difficulty_score numeric(3,2) DEFAULT 0.50;

-- 2. Add is_edited_by_trainer and deleted_at to weekly_tasks
ALTER TABLE weekly_tasks
  ADD COLUMN IF NOT EXISTS is_edited_by_trainer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- 3. Add 'vocabulary' to the allowed task types (if using a check constraint)
-- The type column is text, so no constraint change needed — just ensure the edge function
-- and frontend handle 'vocabulary' as a valid type.

-- 4. Add index for soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_deleted_at ON weekly_tasks(deleted_at) WHERE deleted_at IS NULL;

-- 5. Add difficulty_score index for adaptive queries
CREATE INDEX IF NOT EXISTS idx_weekly_task_sets_difficulty ON weekly_task_sets(student_id, difficulty_score);

-- 6. Update RLS policies to exclude soft-deleted tasks
-- Drop and recreate the student select policy to include deleted_at IS NULL
DROP POLICY IF EXISTS "Students can view their own weekly tasks" ON weekly_tasks;
CREATE POLICY "Students can view their own weekly tasks"
  ON weekly_tasks FOR SELECT
  USING (student_id = auth.uid() AND deleted_at IS NULL);

-- Trainer/admin policies already use role checks, add deleted_at filter
DROP POLICY IF EXISTS "Trainers can view weekly tasks for their group students" ON weekly_tasks;
CREATE POLICY "Trainers can view weekly tasks for their group students"
  ON weekly_tasks FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')
      )
    )
  );
