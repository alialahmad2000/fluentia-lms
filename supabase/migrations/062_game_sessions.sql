-- Game sessions table for tracking all game completions
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) NOT NULL,
  game_type text NOT NULL,
  context text NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id),
  level_number int,
  score int NOT NULL DEFAULT 0,
  max_score int,
  accuracy_percent numeric(5,2),
  time_seconds int,
  items_count int,
  items_correct int,
  details jsonb,
  xp_awarded int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_game_sessions_student ON game_sessions(student_id, created_at DESC);
CREATE INDEX idx_game_sessions_context ON game_sessions(context, game_type);

-- RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Students can insert own game sessions
CREATE POLICY "Students insert own game sessions" ON game_sessions
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can read own game sessions
CREATE POLICY "Students read own game sessions" ON game_sessions
FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Trainers read their group students' game sessions
CREATE POLICY "Trainers read group game sessions" ON game_sessions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN groups g ON s.group_id = g.id
    WHERE s.id = game_sessions.student_id
    AND g.trainer_id = (SELECT id FROM trainers WHERE id = auth.uid())
  )
);

-- Admins read all game sessions
CREATE POLICY "Admins read all game sessions" ON game_sessions
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
