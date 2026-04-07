-- Migration 092: Fix class_recordings RLS for students
--
-- Problem: Migration 025 created an RLS policy that matches class_recordings.level
-- to students.academic_level. But migrations 071-073 changed recordings to be
-- unit-based (not level-based) and made the level column nullable. When level is
-- NULL, the comparison always fails (SQL NULL semantics), blocking all students.
--
-- Fix: Allow any authenticated student to SELECT visible, non-deleted recordings.
-- The application already filters by unit_id, and students access units through
-- the curriculum which is level-gated at the UI layer.

DROP POLICY IF EXISTS "students_view_recordings" ON class_recordings;

CREATE POLICY "students_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND is_archive = false
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = auth.uid()
      AND s.deleted_at IS NULL
    )
  );
