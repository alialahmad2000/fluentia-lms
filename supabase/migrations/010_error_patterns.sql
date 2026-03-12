-- 010: Error Pattern Detection + Targeted Exercises
-- Tracks recurring errors from graded submissions, generates personalized exercises

-- Error patterns table
CREATE TABLE error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill TEXT NOT NULL CHECK (skill IN ('grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing')),
  pattern_type TEXT NOT NULL, -- e.g. 'tense_confusion', 'article_misuse', 'spelling', 'word_order'
  description TEXT NOT NULL, -- Arabic description of the pattern
  examples JSONB DEFAULT '[]', -- [{source, error, correction}]
  frequency INTEGER DEFAULT 1, -- how many times detected
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_detected_at TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Targeted exercises table
CREATE TABLE targeted_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pattern_id UUID REFERENCES error_patterns(id) ON DELETE SET NULL,
  skill TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  content JSONB NOT NULL, -- exercise content (questions, sentences, etc.)
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  score NUMERIC(5,2),
  student_answers JSONB,
  ai_feedback TEXT,
  xp_awarded INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_error_patterns_student ON error_patterns(student_id);
CREATE INDEX idx_error_patterns_skill ON error_patterns(student_id, skill);
CREATE INDEX idx_error_patterns_unresolved ON error_patterns(student_id, resolved) WHERE resolved = false;
CREATE INDEX idx_targeted_exercises_student ON targeted_exercises(student_id);
CREATE INDEX idx_targeted_exercises_pending ON targeted_exercises(student_id, status) WHERE status = 'pending';

-- RLS
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE targeted_exercises ENABLE ROW LEVEL SECURITY;

-- Students can view their own patterns
CREATE POLICY "students_view_own_patterns" ON error_patterns
  FOR SELECT USING (student_id = auth.uid());

-- Trainers can view patterns for their students
CREATE POLICY "trainers_view_patterns" ON error_patterns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = error_patterns.student_id
      AND g.trainer_id = auth.uid()
    )
  );

-- Service role can insert/update (edge functions)
CREATE POLICY "service_insert_patterns" ON error_patterns
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_patterns" ON error_patterns
  FOR UPDATE USING (true);

-- Admin full access
CREATE POLICY "admin_all_patterns" ON error_patterns
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Students can view and update their own exercises
CREATE POLICY "students_view_own_exercises" ON targeted_exercises
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "students_update_own_exercises" ON targeted_exercises
  FOR UPDATE USING (student_id = auth.uid());

-- Trainers can view exercises for their students
CREATE POLICY "trainers_view_exercises" ON targeted_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN groups g ON s.group_id = g.id
      WHERE s.id = targeted_exercises.student_id
      AND g.trainer_id = auth.uid()
    )
  );

-- Service role can insert/update
CREATE POLICY "service_insert_exercises" ON targeted_exercises
  FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_exercises" ON targeted_exercises
  FOR UPDATE USING (true);

-- Admin full access
CREATE POLICY "admin_all_exercises" ON targeted_exercises
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
