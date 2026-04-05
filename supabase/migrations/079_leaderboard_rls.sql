-- ============================================================
-- Leaderboard RLS — Allow students to see same-group activity scores
-- ============================================================

-- Students can see curriculum progress of students in the same group
CREATE POLICY "students_same_group_progress_select" ON student_curriculum_progress
  FOR SELECT USING (
    student_id IN (
      SELECT s2.id FROM students s1
      JOIN students s2 ON s1.group_id = s2.group_id
      WHERE s1.id = auth.uid()
    )
  );

-- Students can see speaking recordings of students in the same group
CREATE POLICY "students_same_group_recordings_select" ON speaking_recordings
  FOR SELECT USING (
    student_id IN (
      SELECT s2.id FROM students s1
      JOIN students s2 ON s1.group_id = s2.group_id
      WHERE s1.id = auth.uid()
    )
  );
