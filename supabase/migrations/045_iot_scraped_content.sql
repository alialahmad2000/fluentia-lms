-- IOT SCRAPED IELTS CONTENT — Tables for ieltsonlinetests.com data
-- Separate from AI-generated ielts_* tables

-- 1. Collections
CREATE TABLE IF NOT EXISTS iot_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  volume_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_iot_collections_slug ON iot_collections(slug);

-- 2. Volumes (one per scraped JSON file)
CREATE TABLE IF NOT EXISTS iot_volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES iot_collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  test_counts jsonb DEFAULT '{}',
  imported_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, name)
);
CREATE INDEX idx_iot_volumes_collection ON iot_volumes(collection_id);
CREATE INDEX idx_iot_volumes_source_url ON iot_volumes(source_url);

-- 3. Tests (one row per skill test)
CREATE TABLE IF NOT EXISTS iot_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id uuid NOT NULL REFERENCES iot_volumes(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('reading', 'writing', 'speaking', 'listening')),
  practice_test_num integer NOT NULL,
  source_url text NOT NULL UNIQUE,
  is_valid boolean DEFAULT true,
  total_questions integer DEFAULT 0,
  content jsonb DEFAULT '{}',
  full_text text,
  solution_text text,
  time_limit_minutes integer,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_iot_tests_volume ON iot_tests(volume_id);
CREATE INDEX idx_iot_tests_skill ON iot_tests(skill);
CREATE INDEX idx_iot_tests_source_url ON iot_tests(source_url);
CREATE INDEX idx_iot_tests_valid_skill ON iot_tests(is_valid, skill) WHERE is_valid = true;

-- 4. Reading passages (split-screen UI needs separate rows)
CREATE TABLE IF NOT EXISTS iot_reading_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES iot_tests(id) ON DELETE CASCADE,
  passage_index integer NOT NULL,
  title text,
  description text,
  text_content text NOT NULL,
  html_content text,
  paragraphs jsonb DEFAULT '[]',
  question_start integer,
  question_end integer,
  UNIQUE(test_id, passage_index)
);
CREATE INDEX idx_iot_reading_passages_test ON iot_reading_passages(test_id);

-- 5. Answer keys (for auto-grading reading + listening)
CREATE TABLE IF NOT EXISTS iot_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES iot_tests(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  correct_answer text NOT NULL,
  acceptable_answers text[] DEFAULT '{}',
  UNIQUE(test_id, question_number)
);
CREATE INDEX idx_iot_answers_test ON iot_answers(test_id);

-- 6. Images (stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS iot_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES iot_tests(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  alt_text text DEFAULT '',
  image_type text DEFAULT 'other' CHECK (image_type IN ('listening_diagram', 'writing_chart', 'reading_image', 'other')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_iot_images_test ON iot_images(test_id);

-- 7. Student attempts
CREATE TABLE IF NOT EXISTS iot_student_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id),
  test_id uuid NOT NULL REFERENCES iot_tests(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_spent_seconds integer,
  responses jsonb DEFAULT '{}',
  score integer,
  total_questions integer,
  band_score numeric(2,1),
  writing_response text,
  speaking_recording_url text,
  ai_feedback jsonb,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_iot_attempts_student ON iot_student_attempts(student_id);
CREATE INDEX idx_iot_attempts_test ON iot_student_attempts(test_id);
CREATE INDEX idx_iot_attempts_status ON iot_student_attempts(student_id, status);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('iot-images', 'iot-images', true, 5242880, ARRAY['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE iot_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_reading_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_student_attempts ENABLE ROW LEVEL SECURITY;

-- Read policies (all authenticated)
CREATE POLICY "auth_read_iot_collections" ON iot_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_iot_volumes" ON iot_volumes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_iot_tests" ON iot_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_iot_reading_passages" ON iot_reading_passages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_iot_answers" ON iot_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_iot_images" ON iot_images FOR SELECT TO authenticated USING (true);

-- Student attempts: own data
CREATE POLICY "students_manage_own_attempts" ON iot_student_attempts FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "trainers_read_attempts" ON iot_student_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer','admin')));

-- Admin write on content tables
CREATE POLICY "admin_manage_iot_collections" ON iot_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_iot_volumes" ON iot_volumes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_iot_tests" ON iot_tests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_iot_reading_passages" ON iot_reading_passages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_iot_answers" ON iot_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_manage_iot_images" ON iot_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Storage policies
CREATE POLICY "public_read_iot_images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'iot-images');
CREATE POLICY "auth_upload_iot_images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'iot-images');

-- Trigger: auto-update volume_count
CREATE OR REPLACE FUNCTION update_collection_volume_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE iot_collections SET volume_count = volume_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE iot_collections SET volume_count = volume_count - 1 WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_iot_volume_count
  AFTER INSERT OR DELETE ON iot_volumes
  FOR EACH ROW EXECUTE FUNCTION update_collection_volume_count();
