-- Add trainer SELECT policies for spelling/verb progress tables
-- These were missing, preventing trainers from viewing student spelling & verb mastery

-- Trainers can read spelling progress of their group students
CREATE POLICY "trainers_read_spelling_progress"
  ON student_spelling_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = student_spelling_progress.student_id
      AND g.trainer_id = (SELECT id FROM trainers WHERE id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trainers can read verb progress of their group students
CREATE POLICY "trainers_read_verb_progress"
  ON student_verb_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = student_verb_progress.student_id
      AND g.trainer_id = (SELECT id FROM trainers WHERE id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trainers can read spelling sessions of their group students
CREATE POLICY "trainers_read_spelling_sessions"
  ON spelling_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = spelling_sessions.student_id
      AND g.trainer_id = (SELECT id FROM trainers WHERE id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
