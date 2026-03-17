-- ═══════════════════════════════════════════════════════════
-- Curriculum Content Bank — Full content tables for all skills
-- Reading passages, speaking topics, writing prompts, listening,
-- irregular verbs, grammar lessons
-- ═══════════════════════════════════════════════════════════

-- Reading passages bank
CREATE TABLE IF NOT EXISTS curriculum_reading_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  passage text NOT NULL,
  word_count integer NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  questions jsonb NOT NULL DEFAULT '[]',
  vocabulary_words jsonb DEFAULT '[]',
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_reading_level ON curriculum_reading_passages(level, topic);

-- Speaking topics bank
CREATE TABLE IF NOT EXISTS curriculum_speaking_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  topic_number integer NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  category text NOT NULL,
  guiding_questions jsonb NOT NULL DEFAULT '[]',
  vocabulary_hints jsonb DEFAULT '[]',
  tips jsonb DEFAULT '[]',
  duration_min integer DEFAULT 60,
  duration_max integer DEFAULT 90,
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(level, topic_number)
);
CREATE INDEX idx_speaking_level ON curriculum_speaking_topics(level, category);

-- Writing prompts bank
CREATE TABLE IF NOT EXISTS curriculum_writing_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  prompt_type text NOT NULL,
  prompt text NOT NULL,
  prompt_ar text NOT NULL,
  instructions jsonb NOT NULL DEFAULT '[]',
  word_count_min integer NOT NULL,
  word_count_max integer NOT NULL,
  hints jsonb DEFAULT '[]',
  example_starter text,
  evaluation_criteria jsonb DEFAULT '["grammar","vocabulary","structure","clarity"]',
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_writing_level ON curriculum_writing_prompts(level, prompt_type);

-- Listening exercises bank
CREATE TABLE IF NOT EXISTS curriculum_listening_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  youtube_url text NOT NULL,
  youtube_title text NOT NULL,
  channel text NOT NULL,
  duration_minutes integer,
  description_ar text,
  mode text NOT NULL DEFAULT 'mcq',
  questions jsonb NOT NULL DEFAULT '[]',
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_listening_level ON curriculum_listening_exercises(level);

-- Irregular verbs master list
CREATE TABLE IF NOT EXISTS curriculum_irregular_verbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  difficulty_order integer NOT NULL,
  base text NOT NULL UNIQUE,
  past text NOT NULL,
  past_participle text NOT NULL,
  meaning_ar text NOT NULL,
  example_sentence text NOT NULL,
  category text DEFAULT 'general'
);
CREATE INDEX idx_verbs_level ON curriculum_irregular_verbs(level, difficulty_order);

-- Grammar lessons bank
CREATE TABLE IF NOT EXISTS curriculum_grammar_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  unit_number integer NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  explanation_ar text NOT NULL,
  explanation_en text NOT NULL,
  examples jsonb NOT NULL DEFAULT '[]',
  practice_questions jsonb NOT NULL DEFAULT '[]',
  common_mistakes jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(level, unit_number)
);
CREATE INDEX idx_grammar_level ON curriculum_grammar_lessons(level);

-- RLS for all tables
ALTER TABLE curriculum_reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_speaking_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_listening_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_irregular_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_grammar_lessons ENABLE ROW LEVEL SECURITY;

-- Everyone can read curriculum content
CREATE POLICY "anyone_read_reading" ON curriculum_reading_passages FOR SELECT USING (true);
CREATE POLICY "anyone_read_speaking" ON curriculum_speaking_topics FOR SELECT USING (true);
CREATE POLICY "anyone_read_writing" ON curriculum_writing_prompts FOR SELECT USING (true);
CREATE POLICY "anyone_read_listening" ON curriculum_listening_exercises FOR SELECT USING (true);
CREATE POLICY "anyone_read_verbs" ON curriculum_irregular_verbs FOR SELECT USING (true);
CREATE POLICY "anyone_read_grammar" ON curriculum_grammar_lessons FOR SELECT USING (true);

-- Only admin can write
CREATE POLICY "admin_write_reading" ON curriculum_reading_passages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write_speaking" ON curriculum_speaking_topics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write_writing" ON curriculum_writing_prompts FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write_listening" ON curriculum_listening_exercises FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write_verbs" ON curriculum_irregular_verbs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_write_grammar" ON curriculum_grammar_lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role full access for edge functions
CREATE POLICY "service_reading" ON curriculum_reading_passages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_speaking" ON curriculum_speaking_topics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_writing" ON curriculum_writing_prompts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_listening" ON curriculum_listening_exercises FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_verbs" ON curriculum_irregular_verbs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_grammar" ON curriculum_grammar_lessons FOR ALL USING (auth.role() = 'service_role');
