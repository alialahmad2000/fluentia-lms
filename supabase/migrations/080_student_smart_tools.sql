-- Student bookmarks (mark specific content items)
CREATE TABLE IF NOT EXISTS student_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id) NOT NULL,
  section_type text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, unit_id, section_type)
);

-- Student personal notes (tied to units)
CREATE TABLE IF NOT EXISTS student_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id) NOT NULL,
  content text NOT NULL,
  section_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Saved words (personal vocabulary list)
CREATE TABLE IF NOT EXISTS student_saved_words (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) NOT NULL,
  word text NOT NULL,
  meaning text,
  source_unit_id uuid REFERENCES curriculum_units(id),
  context_sentence text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, word)
);

-- Help requests (student signals "I don't understand")
CREATE TABLE IF NOT EXISTS help_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id) NOT NULL,
  section_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'seen', 'resolved')),
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE student_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_saved_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Students manage own data
CREATE POLICY "Students manage own bookmarks" ON student_bookmarks
  FOR ALL USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Students manage own notes" ON student_notes
  FOR ALL USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Students manage own saved words" ON student_saved_words
  FOR ALL USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Students create help requests" ON help_requests
  FOR ALL USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

-- Trainers see help requests for their groups
CREATE POLICY "Trainers see group help requests" ON help_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN group_members gm ON gm.student_id = s.id
      JOIN groups g ON g.id = gm.group_id
      JOIN trainers t ON t.id = g.trainer_id
      WHERE s.id = help_requests.student_id
      AND t.profile_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin full access bookmarks" ON student_bookmarks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access notes" ON student_notes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access saved words" ON student_saved_words FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin full access help requests" ON help_requests FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
