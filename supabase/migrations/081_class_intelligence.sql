-- Add current unit tracking to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS current_unit_id uuid REFERENCES curriculum_units(id);

-- Class summaries table
CREATE TABLE IF NOT EXISTS class_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id),
  class_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes integer,
  attendance_count integer,
  total_students integer,
  points_summary jsonb,
  trainer_notes text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  shared_with_students boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE class_summaries ENABLE ROW LEVEL SECURITY;

-- Trainer can manage summaries for their groups (trainers.id = profiles.id)
CREATE POLICY "Trainers manage class summaries" ON class_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = class_summaries.group_id
      AND g.trainer_id = auth.uid()
    )
  );

-- Students see shared summaries for their group (students.id = profiles.id)
CREATE POLICY "Students see shared summaries" ON class_summaries
  FOR SELECT USING (
    shared_with_students = true
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.group_id = class_summaries.group_id
      AND s.id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin full access summaries" ON class_summaries
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
