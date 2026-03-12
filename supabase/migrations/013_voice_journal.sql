-- 013: Voice Journal
-- Students record daily voice entries, AI transcribes and provides feedback

CREATE TABLE voice_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT,
  ai_feedback TEXT,
  ai_corrections JSONB,
  fluency_score NUMERIC(5,2),
  topic TEXT,
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'struggling')),
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_journals_student ON voice_journals(student_id);
CREATE INDEX idx_voice_journals_date ON voice_journals(created_at DESC);

ALTER TABLE voice_journals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY students_own_journals ON voice_journals
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY trainers_view_journals ON voice_journals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s JOIN groups g ON s.group_id = g.id
      WHERE s.id = voice_journals.student_id AND g.trainer_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY admin_all_journals ON voice_journals
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY service_manage_journals ON voice_journals
  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
