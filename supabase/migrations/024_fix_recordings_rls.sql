-- Migration 024: Fix class_recordings RLS for student visibility
-- Problem: Students couldn't see recordings because:
-- 1. NULL group_id comparisons (NULL = NULL is FALSE in SQL)
-- 2. Missing student rows in students table
-- Fix: Simplify — all authenticated students see all visible recordings

DROP POLICY IF EXISTS "students_view_recordings" ON class_recordings;
DROP POLICY IF EXISTS "staff_view_recordings" ON class_recordings;

-- Students see all visible, non-deleted recordings
CREATE POLICY "students_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Staff see all non-deleted recordings (including hidden ones)
CREATE POLICY "staff_view_recordings" ON class_recordings FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );
