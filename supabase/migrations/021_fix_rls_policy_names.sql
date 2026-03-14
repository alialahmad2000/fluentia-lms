-- 021: Fix duplicate RLS policies on weekly_tasks
-- Migration 019 added policies with wrong names, leaving originals from 017 intact.
-- This drops the duplicates from 019 and updates the originals to include deleted_at filter.

-- Drop the duplicate policies added by 019 (wrong names)
DROP POLICY IF EXISTS "Students can view their own weekly tasks" ON weekly_tasks;
DROP POLICY IF EXISTS "Trainers can view weekly tasks for their group students" ON weekly_tasks;

-- Drop the original policies from 017
DROP POLICY IF EXISTS "students_own_tasks" ON weekly_tasks;
DROP POLICY IF EXISTS "trainers_group_tasks" ON weekly_tasks;

-- Recreate with deleted_at filter
CREATE POLICY "students_own_tasks" ON weekly_tasks FOR SELECT
  USING (student_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "trainers_group_tasks" ON weekly_tasks FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = weekly_tasks.student_id
      AND (p.role = 'admin' OR g.trainer_id = auth.uid())
    )
  );
