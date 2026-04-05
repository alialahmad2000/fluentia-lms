-- ============================================================
-- Vocabulary Word Mastery System
-- Each word requires passing 3 exercise types to be "mastered"
-- ============================================================

CREATE TABLE IF NOT EXISTS vocabulary_word_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vocabulary_id uuid NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,

  -- Exercise 1: Choose correct Arabic meaning (MCQ)
  meaning_exercise_passed boolean DEFAULT false,
  meaning_exercise_attempts integer DEFAULT 0,
  meaning_exercise_passed_at timestamptz,

  -- Exercise 2: Complete the sentence (fill in blank)
  sentence_exercise_passed boolean DEFAULT false,
  sentence_exercise_attempts integer DEFAULT 0,
  sentence_exercise_passed_at timestamptz,

  -- Exercise 3: Listen & recognize (hear audio, choose word)
  listening_exercise_passed boolean DEFAULT false,
  listening_exercise_attempts integer DEFAULT 0,
  listening_exercise_passed_at timestamptz,

  -- Derived mastery: 'new' | 'learning' | 'mastered'
  mastery_level text DEFAULT 'new' CHECK (mastery_level IN ('new', 'learning', 'mastered')),

  last_practiced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(student_id, vocabulary_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vwm_student_vocab ON vocabulary_word_mastery(student_id, vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vwm_student_mastery ON vocabulary_word_mastery(student_id, mastery_level);

-- Auto-update mastery_level trigger
CREATE OR REPLACE FUNCTION update_vocabulary_mastery_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meaning_exercise_passed AND NEW.sentence_exercise_passed AND NEW.listening_exercise_passed THEN
    NEW.mastery_level := 'mastered';
  ELSIF NEW.meaning_exercise_passed OR NEW.sentence_exercise_passed OR NEW.listening_exercise_passed THEN
    NEW.mastery_level := 'learning';
  ELSE
    NEW.mastery_level := 'new';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_mastery_level ON vocabulary_word_mastery;
CREATE TRIGGER trg_update_mastery_level
  BEFORE INSERT OR UPDATE ON vocabulary_word_mastery
  FOR EACH ROW EXECUTE FUNCTION update_vocabulary_mastery_level();

-- RLS
ALTER TABLE vocabulary_word_mastery ENABLE ROW LEVEL SECURITY;

-- students.id IS the auth UUID in this project
CREATE POLICY "students_own_mastery_select" ON vocabulary_word_mastery
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "students_own_mastery_insert" ON vocabulary_word_mastery
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_own_mastery_update" ON vocabulary_word_mastery
  FOR UPDATE USING (student_id = auth.uid());

-- Admin/trainer can read all
CREATE POLICY "staff_mastery_select" ON vocabulary_word_mastery
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
  );

-- Admin full access
CREATE POLICY "admin_mastery_all" ON vocabulary_word_mastery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
