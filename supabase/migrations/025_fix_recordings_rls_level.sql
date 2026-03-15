-- Migration 025: Fix recordings RLS to filter by student level
-- Problem: Migration 024 showed ALL recordings to ALL students regardless of level
-- Fix: Match class_recordings.level to students.academic_level

DROP POLICY IF EXISTS "students_view_recordings" ON class_recordings;

-- Students see visible recordings matching their academic level
CREATE POLICY "students_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = auth.uid()
      AND s.academic_level = class_recordings.level
      AND s.deleted_at IS NULL
    )
  );
