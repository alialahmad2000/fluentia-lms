-- ═══════════════════════════════════════════════════════════
-- Migration 036: IELTS Track Database Tables (8 tables)
-- ═══════════════════════════════════════════════════════════

-- ─── 1. ielts_diagnostic ───
CREATE TABLE IF NOT EXISTS ielts_diagnostic (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  reading_band NUMERIC,
  writing_band NUMERIC,
  listening_band NUMERIC,
  speaking_band NUMERIC,
  overall_band NUMERIC,
  weakness_map JSONB,
  recommended_plan JSONB,
  estimated_weeks_to_target INTEGER,
  target_band NUMERIC DEFAULT 7.0,
  answers JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. ielts_reading_passages ───
CREATE TABLE IF NOT EXISTS ielts_reading_passages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER,
  topic_category TEXT,
  difficulty_band TEXT NOT NULL,
  questions JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  time_limit_minutes INTEGER DEFAULT 20,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. ielts_reading_skills ───
CREATE TABLE IF NOT EXISTS ielts_reading_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_type TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  explanation_ar TEXT NOT NULL,
  strategy_steps JSONB NOT NULL,
  common_mistakes_ar TEXT,
  worked_example JSONB,
  practice_items JSONB NOT NULL,
  timed_practice_items JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. ielts_writing_tasks ───
CREATE TABLE IF NOT EXISTS ielts_writing_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL CHECK (task_type IN ('task1', 'task2')),
  sub_type TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT,
  chart_data JSONB,
  template_structure JSONB,
  key_phrases JSONB DEFAULT '[]',
  model_answer_band6 TEXT,
  model_answer_band7 TEXT,
  model_answer_band8 TEXT,
  rubric JSONB DEFAULT '{"ta":25,"cc":25,"lr":25,"gra":25}',
  word_count_target INTEGER DEFAULT 150,
  time_limit_minutes INTEGER DEFAULT 20,
  difficulty_band TEXT,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. ielts_listening_sections ───
CREATE TABLE IF NOT EXISTS ielts_listening_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id INTEGER NOT NULL,
  section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 4),
  title TEXT NOT NULL,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcript TEXT,
  speaker_count INTEGER DEFAULT 1,
  accent TEXT DEFAULT 'british',
  context_description TEXT,
  questions JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, section_number)
);

-- ─── 6. ielts_speaking_questions ───
CREATE TABLE IF NOT EXISTS ielts_speaking_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  part INTEGER NOT NULL CHECK (part BETWEEN 1 AND 3),
  topic TEXT NOT NULL,
  questions JSONB NOT NULL,
  cue_card JSONB,
  follow_up_questions JSONB,
  model_answer_audio_url TEXT,
  model_answer_text TEXT,
  useful_phrases JSONB DEFAULT '[]',
  band_descriptors JSONB,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. ielts_mock_tests ───
CREATE TABLE IF NOT EXISTS ielts_mock_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_number INTEGER NOT NULL UNIQUE,
  title_ar TEXT,
  title_en TEXT,
  reading_passage_ids JSONB NOT NULL,
  listening_test_id INTEGER NOT NULL,
  writing_task1_id UUID REFERENCES ielts_writing_tasks(id),
  writing_task2_id UUID REFERENCES ielts_writing_tasks(id),
  speaking_questions JSONB NOT NULL,
  total_time_minutes INTEGER DEFAULT 165,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. ielts_student_results ───
CREATE TABLE IF NOT EXISTS ielts_student_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  mock_test_id UUID REFERENCES ielts_mock_tests(id),
  result_type TEXT NOT NULL,
  reading_score NUMERIC,
  reading_details JSONB,
  writing_score NUMERIC,
  writing_feedback JSONB,
  listening_score NUMERIC,
  listening_details JSONB,
  speaking_score NUMERIC,
  speaking_feedback JSONB,
  overall_band NUMERIC,
  strengths JSONB,
  weaknesses JSONB,
  recommendations JSONB,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_ielts_diag_student ON ielts_diagnostic(student_id);
CREATE INDEX IF NOT EXISTS idx_ielts_passages_band ON ielts_reading_passages(difficulty_band);
CREATE INDEX IF NOT EXISTS idx_ielts_writing_type ON ielts_writing_tasks(task_type, sub_type);
CREATE INDEX IF NOT EXISTS idx_ielts_listening_test ON ielts_listening_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_ielts_speaking_part ON ielts_speaking_questions(part);
CREATE INDEX IF NOT EXISTS idx_ielts_results_student ON ielts_student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_ielts_results_mock ON ielts_student_results(mock_test_id);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE ielts_diagnostic ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_reading_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_writing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_listening_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_speaking_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ielts_student_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DO $$ BEGIN
  -- Content tables
  DROP POLICY IF EXISTS "admin_all_ielts_reading_passages" ON ielts_reading_passages;
  DROP POLICY IF EXISTS "auth_read_ielts_reading_passages" ON ielts_reading_passages;
  DROP POLICY IF EXISTS "service_ielts_reading_passages" ON ielts_reading_passages;
  DROP POLICY IF EXISTS "admin_all_ielts_reading_skills" ON ielts_reading_skills;
  DROP POLICY IF EXISTS "auth_read_ielts_reading_skills" ON ielts_reading_skills;
  DROP POLICY IF EXISTS "service_ielts_reading_skills" ON ielts_reading_skills;
  DROP POLICY IF EXISTS "admin_all_ielts_writing_tasks" ON ielts_writing_tasks;
  DROP POLICY IF EXISTS "auth_read_ielts_writing_tasks" ON ielts_writing_tasks;
  DROP POLICY IF EXISTS "service_ielts_writing_tasks" ON ielts_writing_tasks;
  DROP POLICY IF EXISTS "admin_all_ielts_listening_sections" ON ielts_listening_sections;
  DROP POLICY IF EXISTS "auth_read_ielts_listening_sections" ON ielts_listening_sections;
  DROP POLICY IF EXISTS "service_ielts_listening_sections" ON ielts_listening_sections;
  DROP POLICY IF EXISTS "admin_all_ielts_speaking_questions" ON ielts_speaking_questions;
  DROP POLICY IF EXISTS "auth_read_ielts_speaking_questions" ON ielts_speaking_questions;
  DROP POLICY IF EXISTS "service_ielts_speaking_questions" ON ielts_speaking_questions;
  DROP POLICY IF EXISTS "admin_all_ielts_mock_tests" ON ielts_mock_tests;
  DROP POLICY IF EXISTS "auth_read_ielts_mock_tests" ON ielts_mock_tests;
  DROP POLICY IF EXISTS "service_ielts_mock_tests" ON ielts_mock_tests;
  -- Student data tables
  DROP POLICY IF EXISTS "students_own_diagnostic" ON ielts_diagnostic;
  DROP POLICY IF EXISTS "staff_read_diagnostic" ON ielts_diagnostic;
  DROP POLICY IF EXISTS "service_ielts_diagnostic" ON ielts_diagnostic;
  DROP POLICY IF EXISTS "students_own_results" ON ielts_student_results;
  DROP POLICY IF EXISTS "staff_read_results" ON ielts_student_results;
  DROP POLICY IF EXISTS "service_ielts_student_results" ON ielts_student_results;
END $$;

-- Content tables: admin writes, authenticated reads
CREATE POLICY "admin_all_ielts_reading_passages" ON ielts_reading_passages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_reading_passages" ON ielts_reading_passages FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_ielts_reading_skills" ON ielts_reading_skills FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_reading_skills" ON ielts_reading_skills FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_ielts_writing_tasks" ON ielts_writing_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_writing_tasks" ON ielts_writing_tasks FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_ielts_listening_sections" ON ielts_listening_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_listening_sections" ON ielts_listening_sections FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_ielts_speaking_questions" ON ielts_speaking_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_speaking_questions" ON ielts_speaking_questions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_all_ielts_mock_tests" ON ielts_mock_tests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_ielts_mock_tests" ON ielts_mock_tests FOR SELECT USING (auth.role() = 'authenticated');

-- Student personal data: own data + staff read
CREATE POLICY "students_own_diagnostic" ON ielts_diagnostic FOR ALL USING (student_id = auth.uid());
CREATE POLICY "staff_read_diagnostic" ON ielts_diagnostic FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

CREATE POLICY "students_own_results" ON ielts_student_results FOR ALL USING (student_id = auth.uid());
CREATE POLICY "staff_read_results" ON ielts_student_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

-- Service role full access on all tables
CREATE POLICY "service_ielts_diagnostic" ON ielts_diagnostic FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_reading_passages" ON ielts_reading_passages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_reading_skills" ON ielts_reading_skills FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_writing_tasks" ON ielts_writing_tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_listening_sections" ON ielts_listening_sections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_speaking_questions" ON ielts_speaking_questions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_mock_tests" ON ielts_mock_tests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_ielts_student_results" ON ielts_student_results FOR ALL USING (auth.role() = 'service_role');
