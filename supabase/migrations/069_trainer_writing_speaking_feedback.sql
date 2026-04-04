-- 069: Add trainer feedback/grading columns to student_curriculum_progress
-- Also add RLS policy for trainer UPDATE on feedback columns

-- Add trainer feedback columns
ALTER TABLE student_curriculum_progress
ADD COLUMN IF NOT EXISTS trainer_feedback text,
ADD COLUMN IF NOT EXISTS trainer_grade text,
ADD COLUMN IF NOT EXISTS trainer_graded_at timestamptz,
ADD COLUMN IF NOT EXISTS trainer_graded_by uuid REFERENCES profiles(id);

-- Set admin's onboarding as completed (while we're at it)
UPDATE trainers SET onboarding_completed = true
WHERE id IN (SELECT id FROM profiles WHERE role = 'admin');

-- RLS: Trainers can update feedback on their group students' progress
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'student_curriculum_progress'
    AND policyname = 'Trainers can grade student progress'
  ) THEN
    CREATE POLICY "Trainers can grade student progress" ON student_curriculum_progress
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM students s
        JOIN groups g ON s.group_id = g.id
        WHERE s.id = student_curriculum_progress.student_id
        AND g.trainer_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM students s
        JOIN groups g ON s.group_id = g.id
        WHERE s.id = student_curriculum_progress.student_id
        AND g.trainer_id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;
