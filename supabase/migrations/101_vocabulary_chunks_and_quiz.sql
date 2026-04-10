-- ============================================================================
-- Migration 101: Vocabulary Chunks + Quiz System
-- ============================================================================
-- Adds per-student chunk size preference and a table to log quiz attempts
-- for the new vocabulary chunks + quiz feature.
--
-- Context: responds to Group 4 feedback that students were always forced to
-- restart from word 1 with no way to target specific word ranges.
-- ============================================================================

-- 1. Add chunk size preference to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_chunk_size INTEGER DEFAULT 10
  CHECK (preferred_chunk_size IN (5, 10, 15, 20, 25));

-- 2. Create quiz attempts table
CREATE TABLE IF NOT EXISTS vocabulary_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  chunk_index INTEGER,           -- NULL = full-unit quiz; otherwise 0-based chunk index
  chunk_size INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_word_ids UUID[] DEFAULT '{}',
  duration_seconds INTEGER,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for fast history lookup
CREATE INDEX IF NOT EXISTS idx_vocab_quiz_student_unit
  ON vocabulary_quiz_attempts(student_id, unit_id, created_at DESC);

-- 4. RLS
ALTER TABLE vocabulary_quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own quiz attempts" ON vocabulary_quiz_attempts;
CREATE POLICY "Students read own quiz attempts"
  ON vocabulary_quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students insert own quiz attempts" ON vocabulary_quiz_attempts;
CREATE POLICY "Students insert own quiz attempts"
  ON vocabulary_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Trainers read their students quiz attempts" ON vocabulary_quiz_attempts;
CREATE POLICY "Trainers read their students quiz attempts"
  ON vocabulary_quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('trainer', 'admin')
    )
  );

-- NOTE: XP for vocabulary quizzes is logged via the existing `xp_transactions`
-- table using reason='challenge' with description prefixed 'تدريب المفردات —
-- اختبار' (matching the existing xpManager.js pattern). No enum change needed.
