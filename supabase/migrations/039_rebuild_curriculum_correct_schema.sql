-- ═══════════════════════════════════════════════════════════
-- Migration 039: Rebuild Core Curriculum Tables with Correct Schema
-- Drops tables from 035-038 that had wrong schema and recreates
-- per the authoritative PROMPT-1A specification.
-- ═══════════════════════════════════════════════════════════

-- ─── PHASE 1: DROP old tables (CASCADE handles FK dependencies) ───

-- From migration 037 (refs curriculum_vocabulary)
DROP TABLE IF EXISTS curriculum_vocabulary_srs CASCADE;

-- From migration 035 (wrong schema tables)
DROP TABLE IF EXISTS curriculum_comprehension_questions CASCADE;
DROP TABLE IF EXISTS curriculum_vocabulary_exercises CASCADE;
DROP TABLE IF EXISTS curriculum_vocabulary CASCADE;
DROP TABLE IF EXISTS curriculum_grammar_exercises CASCADE;
DROP TABLE IF EXISTS curriculum_grammar CASCADE;
DROP TABLE IF EXISTS curriculum_readings CASCADE;
DROP TABLE IF EXISTS curriculum_writing CASCADE;
DROP TABLE IF EXISTS curriculum_listening CASCADE;
DROP TABLE IF EXISTS curriculum_speaking CASCADE;
DROP TABLE IF EXISTS curriculum_pronunciation CASCADE;
DROP TABLE IF EXISTS curriculum_video_sections CASCADE;
DROP TABLE IF EXISTS curriculum_assessments CASCADE;
DROP TABLE IF EXISTS curriculum_irregular_verb_exercises CASCADE;
DROP TABLE IF EXISTS curriculum_irregular_verbs_v2 CASCADE;

-- student_curriculum_progress (from 027, altered in 035 — will be recreated with new schema)
DROP TABLE IF EXISTS student_curriculum_progress CASCADE;

-- Old curriculum_units from 027 (uses level INTEGER, needs level_id UUID)
DROP TABLE IF EXISTS curriculum_units CASCADE;

-- Old curriculum_levels from 035 (uses INTEGER PK, needs UUID PK)
DROP TABLE IF EXISTS curriculum_levels CASCADE;

-- Old curriculum_irregular_verbs from 030 (different column names, will be recreated)
DROP TABLE IF EXISTS curriculum_irregular_verbs CASCADE;

-- ─── PHASE 2: CREATE 17 tables with correct schema ───

-- 1. curriculum_levels
CREATE TABLE curriculum_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  cefr TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  color TEXT NOT NULL,
  icon TEXT,
  passage_word_range TEXT,
  vocab_per_unit INTEGER DEFAULT 16,
  mcq_choices INTEGER DEFAULT 3,
  sentence_complexity TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. curriculum_units
CREATE TABLE curriculum_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  unit_number INTEGER NOT NULL,
  theme_ar TEXT NOT NULL,
  theme_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  cover_image_url TEXT,
  warmup_questions JSONB DEFAULT '[]',
  grammar_topic_ids JSONB DEFAULT '[]',
  estimated_minutes INTEGER DEFAULT 90,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_id, unit_number)
);

-- 3. curriculum_readings
CREATE TABLE curriculum_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  reading_label TEXT NOT NULL CHECK (reading_label IN ('A', 'B')),
  title_en TEXT NOT NULL,
  title_ar TEXT,
  before_read_exercise_a JSONB,
  before_read_exercise_b JSONB,
  before_read_image_url TEXT,
  before_read_caption TEXT,
  passage_content JSONB NOT NULL DEFAULT '{"paragraphs":[]}',
  passage_word_count INTEGER,
  passage_footnotes JSONB DEFAULT '[]',
  passage_image_urls JSONB DEFAULT '[]',
  infographic_type TEXT,
  infographic_data JSONB,
  infographic_image_url TEXT,
  reading_skill_name_en TEXT,
  reading_skill_name_ar TEXT,
  reading_skill_explanation TEXT,
  reading_skill_exercises JSONB DEFAULT '[]',
  critical_thinking_type TEXT,
  critical_thinking_prompt_en TEXT,
  critical_thinking_prompt_ar TEXT,
  passage_audio_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, reading_label)
);

-- 4. curriculum_comprehension_questions
CREATE TABLE curriculum_comprehension_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id UUID NOT NULL REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('mcq', 'summary')),
  question_type TEXT,
  question_en TEXT NOT NULL,
  question_ar TEXT,
  choices JSONB,
  correct_answer TEXT,
  explanation_en TEXT,
  explanation_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. curriculum_vocabulary
CREATE TABLE curriculum_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id UUID NOT NULL REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition_en TEXT NOT NULL,
  definition_ar TEXT,
  example_sentence TEXT,
  part_of_speech TEXT,
  pronunciation_ipa TEXT,
  audio_url TEXT,
  image_url TEXT,
  difficulty_tier TEXT DEFAULT 'high_frequency',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. curriculum_vocabulary_exercises
CREATE TABLE curriculum_vocabulary_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id UUID NOT NULL REFERENCES curriculum_readings(id) ON DELETE CASCADE,
  exercise_label TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  instructions_en TEXT,
  instructions_ar TEXT,
  mini_passage TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. curriculum_grammar
CREATE TABLE curriculum_grammar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  unit_id UUID REFERENCES curriculum_units(id),
  topic_name_en TEXT NOT NULL,
  topic_name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  grammar_in_use_unit INTEGER,
  explanation_content JSONB NOT NULL DEFAULT '{"sections":[]}',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. curriculum_grammar_exercises
CREATE TABLE curriculum_grammar_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grammar_id UUID NOT NULL REFERENCES curriculum_grammar(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  instructions_en TEXT,
  instructions_ar TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  is_auto_gradeable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. curriculum_writing
CREATE TABLE curriculum_writing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  task_number INTEGER DEFAULT 1,
  task_type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  prompt_en TEXT NOT NULL,
  prompt_ar TEXT,
  hints JSONB DEFAULT '[]',
  word_count_min INTEGER DEFAULT 50,
  word_count_max INTEGER DEFAULT 200,
  vocabulary_to_use JSONB DEFAULT '[]',
  grammar_to_use TEXT,
  model_answer TEXT,
  rubric JSONB DEFAULT '{"content":25,"grammar":25,"vocabulary":25,"organization":25}',
  difficulty TEXT DEFAULT 'standard',
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. curriculum_listening
CREATE TABLE curriculum_listening (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  listening_number INTEGER DEFAULT 1,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcript TEXT,
  audio_type TEXT DEFAULT 'monologue',
  before_listen JSONB,
  exercises JSONB NOT NULL DEFAULT '[]',
  discussion_prompts JSONB DEFAULT '[]',
  difficulty TEXT DEFAULT 'standard',
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. curriculum_speaking
CREATE TABLE curriculum_speaking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  topic_number INTEGER DEFAULT 1,
  topic_type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  prompt_en TEXT NOT NULL,
  prompt_ar TEXT,
  preparation_notes JSONB DEFAULT '[]',
  useful_phrases JSONB DEFAULT '[]',
  model_audio_url TEXT,
  min_duration_seconds INTEGER DEFAULT 30,
  max_duration_seconds INTEGER DEFAULT 120,
  evaluation_criteria JSONB DEFAULT '{"pronunciation":25,"fluency":25,"grammar":25,"content":25}',
  difficulty TEXT DEFAULT 'standard',
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. curriculum_irregular_verbs
CREATE TABLE curriculum_irregular_verbs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  verb_base TEXT NOT NULL,
  verb_past TEXT NOT NULL,
  verb_past_participle TEXT NOT NULL,
  meaning_ar TEXT NOT NULL,
  example_sentence TEXT,
  audio_base_url TEXT,
  audio_past_url TEXT,
  audio_pp_url TEXT,
  group_tag TEXT,
  difficulty INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. curriculum_irregular_verb_exercises
CREATE TABLE curriculum_irregular_verb_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  exercise_type TEXT NOT NULL,
  instructions_ar TEXT,
  instructions_en TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  is_auto_gradeable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. curriculum_pronunciation
CREATE TABLE curriculum_pronunciation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_id UUID NOT NULL REFERENCES curriculum_levels(id),
  unit_id UUID REFERENCES curriculum_units(id),
  word TEXT NOT NULL,
  phonetic_ipa TEXT,
  audio_url TEXT,
  audio_slow_url TEXT,
  common_mistakes_ar TEXT,
  tips_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. curriculum_video_sections
CREATE TABLE curriculum_video_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id),
  video_title_en TEXT NOT NULL,
  video_title_ar TEXT,
  video_url TEXT,
  video_thumbnail_url TEXT,
  before_watch JSONB,
  while_watch JSONB,
  after_watch JSONB,
  vocabulary_review JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id)
);

-- 16. curriculum_assessments
CREATE TABLE curriculum_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES curriculum_units(id),
  level_id UUID REFERENCES curriculum_levels(id),
  assessment_type TEXT DEFAULT 'unit_quiz',
  title_ar TEXT,
  title_en TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. student_curriculum_progress
CREATE TABLE student_curriculum_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  unit_id UUID REFERENCES curriculum_units(id),
  reading_id UUID REFERENCES curriculum_readings(id),
  grammar_id UUID REFERENCES curriculum_grammar(id),
  assessment_id UUID REFERENCES curriculum_assessments(id),
  writing_id UUID REFERENCES curriculum_writing(id),
  listening_id UUID REFERENCES curriculum_listening(id),
  speaking_id UUID REFERENCES curriculum_speaking(id),
  section_type TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',
  score NUMERIC,
  answers JSONB,
  recording_url TEXT,
  ai_feedback JSONB,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── PHASE 3: Recreate curriculum_vocabulary_srs (from 037, refs new curriculum_vocabulary) ───
CREATE TABLE curriculum_vocabulary_srs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_at TIMESTAMPTZ DEFAULT now(),
  last_quality INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, vocabulary_id)
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES (drop conflicting names from migration 030 first)
-- ═══════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_grammar_level;
DROP INDEX IF EXISTS idx_verbs_level;

CREATE INDEX idx_units_level ON curriculum_units(level_id);
CREATE INDEX idx_readings_unit ON curriculum_readings(unit_id);
CREATE INDEX idx_vocab_reading ON curriculum_vocabulary(reading_id);
CREATE INDEX idx_comp_reading ON curriculum_comprehension_questions(reading_id);
CREATE INDEX idx_vocab_ex_reading ON curriculum_vocabulary_exercises(reading_id);
CREATE INDEX idx_grammar_level ON curriculum_grammar(level_id);
CREATE INDEX idx_grammar_unit ON curriculum_grammar(unit_id);
CREATE INDEX idx_grammar_ex ON curriculum_grammar_exercises(grammar_id);
CREATE INDEX idx_writing_unit ON curriculum_writing(unit_id);
CREATE INDEX idx_listening_unit ON curriculum_listening(unit_id);
CREATE INDEX idx_speaking_unit ON curriculum_speaking(unit_id);
CREATE INDEX idx_verbs_level ON curriculum_irregular_verbs(level_id);
CREATE INDEX idx_verb_ex_level ON curriculum_irregular_verb_exercises(level_id);
CREATE INDEX idx_pron_level ON curriculum_pronunciation(level_id);
CREATE INDEX idx_pron_unit ON curriculum_pronunciation(unit_id);
CREATE INDEX idx_assessments_unit ON curriculum_assessments(unit_id);
CREATE INDEX idx_assessments_level ON curriculum_assessments(level_id);
CREATE INDEX idx_progress_student ON student_curriculum_progress(student_id);
CREATE INDEX idx_progress_unit ON student_curriculum_progress(unit_id);
CREATE INDEX idx_progress_reading ON student_curriculum_progress(reading_id);
-- SRS indexes
CREATE INDEX idx_srs_student ON curriculum_vocabulary_srs(student_id);
CREATE INDEX idx_srs_next_review ON curriculum_vocabulary_srs(next_review_at);
CREATE INDEX idx_srs_vocab ON curriculum_vocabulary_srs(vocabulary_id);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Admin full access + authenticated read on all 16 content tables
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'curriculum_levels','curriculum_units','curriculum_readings',
    'curriculum_comprehension_questions','curriculum_vocabulary',
    'curriculum_vocabulary_exercises','curriculum_grammar',
    'curriculum_grammar_exercises','curriculum_writing',
    'curriculum_listening','curriculum_speaking',
    'curriculum_irregular_verbs','curriculum_irregular_verb_exercises',
    'curriculum_pronunciation','curriculum_video_sections',
    'curriculum_assessments'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_all_%1$s" ON %1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%1$s" ON %1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "service_%1$s" ON %1$I', t);
    EXECUTE format('CREATE POLICY "admin_all_%1$s" ON %1$I FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ''admin''))', t);
    EXECUTE format('CREATE POLICY "auth_read_%1$s" ON %1$I FOR SELECT USING (auth.role() = ''authenticated'')', t);
    EXECUTE format('CREATE POLICY "service_%1$s" ON %1$I FOR ALL USING (auth.role() = ''service_role'')', t);
  END LOOP;
END $$;

-- Student progress table
ALTER TABLE student_curriculum_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_own_progress" ON student_curriculum_progress FOR ALL USING (student_id = auth.uid());
CREATE POLICY "staff_read_progress" ON student_curriculum_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "service_progress" ON student_curriculum_progress FOR ALL USING (auth.role() = 'service_role');

-- SRS table
ALTER TABLE curriculum_vocabulary_srs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_srs" ON curriculum_vocabulary_srs FOR ALL USING (student_id = auth.uid());
CREATE POLICY "staff_read_srs" ON curriculum_vocabulary_srs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "service_srs" ON curriculum_vocabulary_srs FOR ALL USING (auth.role() = 'service_role');
