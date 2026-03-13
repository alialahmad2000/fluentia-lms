-- 016: Testimonials + Content Library + AI Chat Messages

-- Testimonials table (used by AdminTestimonials and public Testimonials page)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  student_name TEXT,
  quote TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  level_from TEXT,
  level_to TEXT,
  is_approved BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(is_approved);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY everyone_view_approved_testimonials ON testimonials
  FOR SELECT USING (is_approved = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY admin_manage_testimonials ON testimonials
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY students_insert_testimonials ON testimonials
  FOR INSERT WITH CHECK (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Content Library table (used by AdminContent page)
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'document', 'audio', 'link', 'exercise')),
  level INTEGER CHECK (level BETWEEN 1 AND 5),
  skill TEXT CHECK (skill IN ('grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing', 'general')),
  content TEXT,
  file_url TEXT,
  external_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_level ON content_library(level);
CREATE INDEX IF NOT EXISTS idx_content_library_skill ON content_library(skill);

ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY everyone_view_published_content ON content_library
  FOR SELECT USING (is_published = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY admin_manage_content ON content_library
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY trainer_manage_content ON content_library
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI Chat Messages table (used by ai-student-chatbot for rate limiting)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_student ON ai_chat_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_date ON ai_chat_messages(student_id, created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY students_own_chat ON ai_chat_messages
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY admin_view_chat ON ai_chat_messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY service_manage_chat ON ai_chat_messages
  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
