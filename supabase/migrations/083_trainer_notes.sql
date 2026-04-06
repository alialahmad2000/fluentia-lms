-- Trainer notes table for student-level notes
CREATE TABLE IF NOT EXISTS trainer_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid REFERENCES trainers(id) NOT NULL,
  student_id uuid REFERENCES students(id) NOT NULL,
  note_type text CHECK (note_type IN ('encouragement', 'observation', 'warning', 'reminder')) DEFAULT 'observation',
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trainer_notes ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own notes (trainers.id = profiles.id = auth.uid())
CREATE POLICY "Trainers manage own notes" ON trainer_notes
  FOR ALL USING (trainer_id = auth.uid());

-- Admin sees all notes
CREATE POLICY "Admin sees all notes" ON trainer_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer ON trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_student ON trainer_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_created ON trainer_notes(created_at DESC);
