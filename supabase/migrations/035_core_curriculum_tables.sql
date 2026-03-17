-- ═══════════════════════════════════════════════════════════
-- Migration 035: Core Curriculum Database Tables (17 tables)
-- Structured curriculum schema based on Reading Explorer + Grammar in Use analysis
-- NOTE: curriculum_units and student_curriculum_progress already exist from 027.
--       This migration creates 15 new tables and alters the 2 existing ones.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. curriculum_levels (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_levels (
  id integer PRIMARY KEY CHECK (id BETWEEN 1 AND 6),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  cefr text NOT NULL,
  description_en text,
  description_ar text,
  total_units integer NOT NULL DEFAULT 12,
  created_at timestamptz DEFAULT now()
);

-- Seed the 6 levels
INSERT INTO curriculum_levels (id, name_en, name_ar, cefr, description_en, description_ar, total_units) VALUES
  (1, 'First Step', 'الخطوة الأولى', 'Pre-A1', 'Absolute Beginner', 'مبتدئ تماماً', 12),
  (2, 'Building Confidence', 'بداية الثقة', 'A1', 'Beginner', 'مبتدئ', 12),
  (3, 'Starting to Speak', 'صار يتكلم', 'A2', 'Elementary', 'ابتدائي', 12),
  (4, 'Full Confidence', 'ثقة كاملة', 'B1', 'Intermediate', 'متوسط', 12),
  (5, 'Ready for the World', 'جاهز للعالم', 'B2', 'Upper Intermediate', 'فوق المتوسط', 12),
  (6, 'IELTS Track', 'مسار آيلتس', 'C1', 'Advanced / IELTS', 'متقدم / آيلتس', 12)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. ALTER curriculum_units (exists from 027) ───
-- Extend level range from 1-5 to 1-6
DO $$ BEGIN
  ALTER TABLE curriculum_units DROP CONSTRAINT IF EXISTS curriculum_units_level_check;
  ALTER TABLE curriculum_units ADD CONSTRAINT curriculum_units_level_check CHECK (level BETWEEN 1 AND 6);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add missing columns
ALTER TABLE curriculum_units ADD COLUMN IF NOT EXISTS theme_en text;
ALTER TABLE curriculum_units ADD COLUMN IF NOT EXISTS theme_ar text;

-- Backfill theme columns from existing title columns
UPDATE curriculum_units SET theme_en = title_en WHERE theme_en IS NULL;
UPDATE curriculum_units SET theme_ar = title_ar WHERE theme_ar IS NULL;

-- ─── 3. curriculum_readings (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  passage_label text NOT NULL CHECK (passage_label IN ('A', 'B')),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  passage_text text NOT NULL,
  passage_text_ar text,
  word_count integer NOT NULL DEFAULT 0,
  paragraph_count integer NOT NULL DEFAULT 0,
  topic text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reading_skill text,
  reading_skill_ar text,
  critical_thinking jsonb DEFAULT '[]',
  warm_up_questions jsonb DEFAULT '[]',
  before_you_read jsonb DEFAULT '[]',
  infographic_url text,
  infographic_description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(unit_id, passage_label)
);
CREATE INDEX IF NOT EXISTS idx_cr_unit ON curriculum_readings(unit_id);

-- ─── 4. curriculum_comprehension_questions (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_comprehension_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid NOT NULL REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('A', 'B')),
  question_number integer NOT NULL,
  question_type text NOT NULL CHECK (question_type IN (
    'gist', 'detail', 'inference', 'vocabulary', 'reference',
    'purpose', 'paraphrase', 'sequence', 'main_idea', 'scanning',
    'summary', 'completion', 'matching'
  )),
  question_en text NOT NULL,
  question_ar text,
  options jsonb DEFAULT '[]',
  correct_answer text NOT NULL,
  explanation_en text,
  explanation_ar text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ccq_reading ON curriculum_comprehension_questions(reading_id, section);

-- ─── 5. curriculum_vocabulary (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  word text NOT NULL,
  meaning_en text NOT NULL,
  meaning_ar text NOT NULL,
  part_of_speech text,
  pronunciation_ipa text,
  example_sentence text,
  example_sentence_ar text,
  collocations jsonb DEFAULT '[]',
  word_family jsonb DEFAULT '[]',
  is_bold_in_passage boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cv_unit ON curriculum_vocabulary(unit_id);
CREATE INDEX IF NOT EXISTS idx_cv_reading ON curriculum_vocabulary(reading_id);
CREATE INDEX IF NOT EXISTS idx_cv_word ON curriculum_vocabulary(word);

-- ─── 6. curriculum_vocabulary_exercises (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_vocabulary_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid NOT NULL REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  exercise_label text NOT NULL CHECK (exercise_label IN ('A', 'B', 'C')),
  exercise_type text NOT NULL CHECK (exercise_type IN (
    'definitions', 'completion', 'word_forms', 'word_usage',
    'collocations', 'synonyms', 'antonyms', 'matching'
  )),
  instructions_en text NOT NULL,
  instructions_ar text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cve_reading ON curriculum_vocabulary_exercises(reading_id);

-- ─── 7. curriculum_grammar (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_grammar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  grammar_point_en text NOT NULL,
  grammar_point_ar text NOT NULL,
  explanation_en text NOT NULL,
  explanation_ar text NOT NULL,
  structure text,
  examples jsonb NOT NULL DEFAULT '[]',
  common_mistakes jsonb DEFAULT '[]',
  usage_notes_en text,
  usage_notes_ar text,
  difficulty_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cg_unit ON curriculum_grammar(unit_id);

-- ─── 8. curriculum_grammar_exercises (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_grammar_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grammar_id uuid NOT NULL REFERENCES curriculum_grammar(id) ON DELETE CASCADE,
  exercise_number integer NOT NULL,
  exercise_type text NOT NULL CHECK (exercise_type IN (
    'fill_blank', 'multiple_choice', 'rewrite', 'error_correction',
    'matching', 'transformation', 'free_practice'
  )),
  instructions_en text NOT NULL,
  instructions_ar text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cge_grammar ON curriculum_grammar_exercises(grammar_id);

-- ─── 9. curriculum_writing (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_writing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  prompt_type text NOT NULL CHECK (prompt_type IN (
    'paragraph', 'essay', 'email', 'letter', 'story',
    'description', 'opinion', 'comparison', 'report', 'summary'
  )),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  prompt_en text NOT NULL,
  prompt_ar text NOT NULL,
  instructions jsonb DEFAULT '[]',
  word_count_min integer NOT NULL DEFAULT 50,
  word_count_max integer NOT NULL DEFAULT 200,
  evaluation_criteria jsonb DEFAULT '["grammar","vocabulary","structure","clarity","coherence"]',
  model_answer text,
  hints jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cw_unit ON curriculum_writing(unit_id);

-- ─── 10. curriculum_listening (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_listening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  audio_url text,
  video_url text,
  transcript text,
  transcript_ar text,
  duration_seconds integer,
  source text,
  mode text NOT NULL DEFAULT 'mcq' CHECK (mode IN ('mcq', 'fill_blank', 'dictation', 'mixed')),
  before_listening jsonb DEFAULT '[]',
  while_listening jsonb DEFAULT '[]',
  after_listening jsonb DEFAULT '[]',
  questions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cl_unit ON curriculum_listening(unit_id);

-- ─── 11. curriculum_speaking (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_speaking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  topic_en text NOT NULL,
  topic_ar text NOT NULL,
  category text NOT NULL,
  guiding_questions jsonb NOT NULL DEFAULT '[]',
  vocabulary_hints jsonb DEFAULT '[]',
  tips jsonb DEFAULT '[]',
  duration_min_seconds integer DEFAULT 60,
  duration_max_seconds integer DEFAULT 120,
  evaluation_criteria jsonb DEFAULT '["pronunciation","fluency","vocabulary","grammar","coherence"]',
  model_response text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_unit ON curriculum_speaking(unit_id);

-- ─── 12. curriculum_irregular_verbs_v2 (NEW — enhanced version) ───
CREATE TABLE IF NOT EXISTS curriculum_irregular_verbs_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id integer NOT NULL REFERENCES curriculum_levels(id),
  unit_id uuid REFERENCES curriculum_units(id) ON DELETE SET NULL,
  difficulty_order integer NOT NULL DEFAULT 0,
  base_form text NOT NULL,
  past_simple text NOT NULL,
  past_participle text NOT NULL,
  meaning_ar text NOT NULL,
  example_present text,
  example_past text,
  example_perfect text,
  phonetic_base text,
  phonetic_past text,
  phonetic_participle text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_civ2_level ON curriculum_irregular_verbs_v2(level_id, difficulty_order);
CREATE INDEX IF NOT EXISTS idx_civ2_unit ON curriculum_irregular_verbs_v2(unit_id);

-- ─── 13. curriculum_irregular_verb_exercises (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_irregular_verb_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id integer NOT NULL REFERENCES curriculum_levels(id),
  exercise_type text NOT NULL CHECK (exercise_type IN (
    'fill_blank', 'matching', 'multiple_choice', 'conjugation', 'sentence_building'
  )),
  instructions_en text NOT NULL,
  instructions_ar text,
  items jsonb NOT NULL DEFAULT '[]',
  verb_ids jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cive_level ON curriculum_irregular_verb_exercises(level_id);

-- ─── 14. curriculum_pronunciation (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_pronunciation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sound text NOT NULL,
  sound_description_en text NOT NULL,
  sound_description_ar text NOT NULL,
  ipa_symbol text,
  example_words jsonb NOT NULL DEFAULT '[]',
  minimal_pairs jsonb DEFAULT '[]',
  practice_sentences jsonb DEFAULT '[]',
  common_arabic_errors text,
  tips_ar text,
  audio_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cp_unit ON curriculum_pronunciation(unit_id);

-- ─── 15. curriculum_video_sections (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_video_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  video_url text,
  video_source text,
  duration_seconds integer,
  before_watching jsonb DEFAULT '[]',
  while_watching jsonb DEFAULT '[]',
  after_watching jsonb DEFAULT '[]',
  vocabulary_review jsonb DEFAULT '[]',
  critical_thinking jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cvs_unit ON curriculum_video_sections(unit_id);

-- ─── 16. curriculum_assessments (NEW) ───
CREATE TABLE IF NOT EXISTS curriculum_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id integer NOT NULL REFERENCES curriculum_levels(id),
  unit_id uuid REFERENCES curriculum_units(id) ON DELETE SET NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'unit_quiz', 'mid_level', 'final_level', 'skill_check', 'placement'
  )),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  description_en text,
  description_ar text,
  time_limit_minutes integer,
  pass_score integer DEFAULT 60,
  questions jsonb NOT NULL DEFAULT '[]',
  skills_tested jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ca_level ON curriculum_assessments(level_id);
CREATE INDEX IF NOT EXISTS idx_ca_unit ON curriculum_assessments(unit_id);
CREATE INDEX IF NOT EXISTS idx_ca_type ON curriculum_assessments(assessment_type);

-- ─── 17. ALTER student_curriculum_progress (exists from 027) ───
-- Add granular completion tracking columns
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS reading_a_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS reading_b_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS vocabulary_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS grammar_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS writing_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS listening_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS speaking_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS video_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS irregular_verbs_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS pronunciation_completed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS assessment_score integer;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS assessment_passed boolean DEFAULT false;
ALTER TABLE student_curriculum_progress ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scp_completion ON student_curriculum_progress(student_id, completion_percentage);

-- ═══════════════════════════════════════════════════════════
-- RLS Policies for NEW tables
-- ═══════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE curriculum_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_comprehension_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_vocabulary_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_grammar ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_grammar_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_writing ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_listening ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_speaking ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_irregular_verbs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_irregular_verb_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_pronunciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_video_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "anyone_read_levels" ON curriculum_levels;
  DROP POLICY IF EXISTS "admin_write_levels" ON curriculum_levels;
  DROP POLICY IF EXISTS "service_levels" ON curriculum_levels;
  DROP POLICY IF EXISTS "anyone_read_readings" ON curriculum_readings;
  DROP POLICY IF EXISTS "admin_write_readings" ON curriculum_readings;
  DROP POLICY IF EXISTS "service_readings" ON curriculum_readings;
  DROP POLICY IF EXISTS "anyone_read_comp_q" ON curriculum_comprehension_questions;
  DROP POLICY IF EXISTS "admin_write_comp_q" ON curriculum_comprehension_questions;
  DROP POLICY IF EXISTS "service_comp_q" ON curriculum_comprehension_questions;
  DROP POLICY IF EXISTS "anyone_read_vocab" ON curriculum_vocabulary;
  DROP POLICY IF EXISTS "admin_write_vocab" ON curriculum_vocabulary;
  DROP POLICY IF EXISTS "service_vocab" ON curriculum_vocabulary;
  DROP POLICY IF EXISTS "anyone_read_vocab_ex" ON curriculum_vocabulary_exercises;
  DROP POLICY IF EXISTS "admin_write_vocab_ex" ON curriculum_vocabulary_exercises;
  DROP POLICY IF EXISTS "service_vocab_ex" ON curriculum_vocabulary_exercises;
  DROP POLICY IF EXISTS "anyone_read_grammar_v2" ON curriculum_grammar;
  DROP POLICY IF EXISTS "admin_write_grammar_v2" ON curriculum_grammar;
  DROP POLICY IF EXISTS "service_grammar_v2" ON curriculum_grammar;
  DROP POLICY IF EXISTS "anyone_read_grammar_ex" ON curriculum_grammar_exercises;
  DROP POLICY IF EXISTS "admin_write_grammar_ex" ON curriculum_grammar_exercises;
  DROP POLICY IF EXISTS "service_grammar_ex" ON curriculum_grammar_exercises;
  DROP POLICY IF EXISTS "anyone_read_writing_v2" ON curriculum_writing;
  DROP POLICY IF EXISTS "admin_write_writing_v2" ON curriculum_writing;
  DROP POLICY IF EXISTS "service_writing_v2" ON curriculum_writing;
  DROP POLICY IF EXISTS "anyone_read_listening_v2" ON curriculum_listening;
  DROP POLICY IF EXISTS "admin_write_listening_v2" ON curriculum_listening;
  DROP POLICY IF EXISTS "service_listening_v2" ON curriculum_listening;
  DROP POLICY IF EXISTS "anyone_read_speaking_v2" ON curriculum_speaking;
  DROP POLICY IF EXISTS "admin_write_speaking_v2" ON curriculum_speaking;
  DROP POLICY IF EXISTS "service_speaking_v2" ON curriculum_speaking;
  DROP POLICY IF EXISTS "anyone_read_verbs_v2" ON curriculum_irregular_verbs_v2;
  DROP POLICY IF EXISTS "admin_write_verbs_v2" ON curriculum_irregular_verbs_v2;
  DROP POLICY IF EXISTS "service_verbs_v2" ON curriculum_irregular_verbs_v2;
  DROP POLICY IF EXISTS "anyone_read_verb_ex" ON curriculum_irregular_verb_exercises;
  DROP POLICY IF EXISTS "admin_write_verb_ex" ON curriculum_irregular_verb_exercises;
  DROP POLICY IF EXISTS "service_verb_ex" ON curriculum_irregular_verb_exercises;
  DROP POLICY IF EXISTS "anyone_read_pronunciation" ON curriculum_pronunciation;
  DROP POLICY IF EXISTS "admin_write_pronunciation" ON curriculum_pronunciation;
  DROP POLICY IF EXISTS "service_pronunciation" ON curriculum_pronunciation;
  DROP POLICY IF EXISTS "anyone_read_video" ON curriculum_video_sections;
  DROP POLICY IF EXISTS "admin_write_video" ON curriculum_video_sections;
  DROP POLICY IF EXISTS "service_video" ON curriculum_video_sections;
  DROP POLICY IF EXISTS "anyone_read_assessments" ON curriculum_assessments;
  DROP POLICY IF EXISTS "admin_write_assessments" ON curriculum_assessments;
  DROP POLICY IF EXISTS "service_assessments" ON curriculum_assessments;
END $$;

-- ─── Read Policies (everyone can read curriculum content) ───
CREATE POLICY "anyone_read_levels" ON curriculum_levels FOR SELECT USING (true);
CREATE POLICY "anyone_read_readings" ON curriculum_readings FOR SELECT USING (true);
CREATE POLICY "anyone_read_comp_q" ON curriculum_comprehension_questions FOR SELECT USING (true);
CREATE POLICY "anyone_read_vocab" ON curriculum_vocabulary FOR SELECT USING (true);
CREATE POLICY "anyone_read_vocab_ex" ON curriculum_vocabulary_exercises FOR SELECT USING (true);
CREATE POLICY "anyone_read_grammar_v2" ON curriculum_grammar FOR SELECT USING (true);
CREATE POLICY "anyone_read_grammar_ex" ON curriculum_grammar_exercises FOR SELECT USING (true);
CREATE POLICY "anyone_read_writing_v2" ON curriculum_writing FOR SELECT USING (true);
CREATE POLICY "anyone_read_listening_v2" ON curriculum_listening FOR SELECT USING (true);
CREATE POLICY "anyone_read_speaking_v2" ON curriculum_speaking FOR SELECT USING (true);
CREATE POLICY "anyone_read_verbs_v2" ON curriculum_irregular_verbs_v2 FOR SELECT USING (true);
CREATE POLICY "anyone_read_verb_ex" ON curriculum_irregular_verb_exercises FOR SELECT USING (true);
CREATE POLICY "anyone_read_pronunciation" ON curriculum_pronunciation FOR SELECT USING (true);
CREATE POLICY "anyone_read_video" ON curriculum_video_sections FOR SELECT USING (true);
CREATE POLICY "anyone_read_assessments" ON curriculum_assessments FOR SELECT USING (true);

-- ─── Admin Write Policies ───
CREATE POLICY "admin_write_levels" ON curriculum_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_readings" ON curriculum_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_comp_q" ON curriculum_comprehension_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_vocab" ON curriculum_vocabulary FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_vocab_ex" ON curriculum_vocabulary_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_grammar_v2" ON curriculum_grammar FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_grammar_ex" ON curriculum_grammar_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_writing_v2" ON curriculum_writing FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_listening_v2" ON curriculum_listening FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_speaking_v2" ON curriculum_speaking FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_verbs_v2" ON curriculum_irregular_verbs_v2 FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_verb_ex" ON curriculum_irregular_verb_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_pronunciation" ON curriculum_pronunciation FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_video" ON curriculum_video_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_write_assessments" ON curriculum_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── Service Role Full Access ───
CREATE POLICY "service_levels" ON curriculum_levels FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_readings" ON curriculum_readings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_comp_q" ON curriculum_comprehension_questions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_vocab" ON curriculum_vocabulary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_vocab_ex" ON curriculum_vocabulary_exercises FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_grammar_v2" ON curriculum_grammar FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_grammar_ex" ON curriculum_grammar_exercises FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_writing_v2" ON curriculum_writing FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_listening_v2" ON curriculum_listening FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_speaking_v2" ON curriculum_speaking FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_verbs_v2" ON curriculum_irregular_verbs_v2 FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_verb_ex" ON curriculum_irregular_verb_exercises FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_pronunciation" ON curriculum_pronunciation FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_video" ON curriculum_video_sections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_assessments" ON curriculum_assessments FOR ALL USING (auth.role() = 'service_role');
