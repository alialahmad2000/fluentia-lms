-- ════════════════════════════════════════════════════════════════
-- 112: Reading features — notes per paragraph, vocab cache, AI content cache
-- ════════════════════════════════════════════════════════════════

-- Reading notes per paragraph
CREATE TABLE IF NOT EXISTS reading_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  unit_id uuid REFERENCES curriculum_units(id),
  reading_id uuid REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  paragraph_index int NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id, reading_id, paragraph_index)
);

ALTER TABLE reading_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own reading notes" ON reading_notes
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admin full access reading notes" ON reading_notes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Vocab quick-meaning cache (shared across all students)
CREATE TABLE IF NOT EXISTS vocab_cache (
  word text PRIMARY KEY,
  meaning_ar text,
  part_of_speech text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vocab_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read cache, only service role writes
CREATE POLICY "Anyone can read vocab cache" ON vocab_cache
  FOR SELECT USING (true);

-- Passage AI content cache
CREATE TABLE IF NOT EXISTS passage_ai_content (
  passage_id text PRIMARY KEY,
  summary_ar text,
  word_count int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE passage_ai_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read passage AI content" ON passage_ai_content
  FOR SELECT USING (true);

-- Extend student_saved_words with source tracking
ALTER TABLE student_saved_words ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE student_saved_words ADD COLUMN IF NOT EXISTS source_reference text;
