-- ============================================================
-- VOCAB-PREMIUM Prompt 03 — SRS Upgrade to FSRS
-- Idempotent + additive. Preserves all 97 existing student rows.
-- Adapts to actual production schema discovered in Phase A:
--   - Table uses student_id (not user_id)
--   - Existing SM-2 columns: ease_factor, interval_days, repetitions,
--     next_review_at, last_quality
--   - profiles.id is the FK target (matches auth.uid())
-- ============================================================

-- 1) Add FSRS state columns to alive curriculum_vocabulary_srs.
--    Side-by-side with legacy SM-2 columns so DailyReview / WordExerciseModal
--    keep working until Phase D switches them over.

ALTER TABLE curriculum_vocabulary_srs
  ADD COLUMN IF NOT EXISTS stability DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'new'
    CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  ADD COLUMN IF NOT EXISTS due TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_review TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reps INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elapsed_days DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_days DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fsrs_seeded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_srs_student_due
  ON curriculum_vocabulary_srs(student_id, due);
CREATE INDEX IF NOT EXISTS idx_srs_state
  ON curriculum_vocabulary_srs(state);

-- 2) Seed the 97 existing rows.
--    - repetitions > 0 → state='review', preserve next_review_at as due
--    - repetitions = 0 → state='new', due = NOW()
--    - reps mirrors repetitions, last_review mirrors updated_at
--    - stability/difficulty: FSRS defaults (2.5 / 5.0)

UPDATE curriculum_vocabulary_srs
SET
  state = CASE
    WHEN repetitions > 0 THEN 'review'
    ELSE 'new'
  END,
  due = COALESCE(next_review_at, NOW()),
  reps = COALESCE(repetitions, 0),
  last_review = CASE WHEN repetitions > 0 THEN updated_at ELSE NULL END,
  stability = 2.5,
  difficulty = 5.0,
  fsrs_seeded_at = NOW()
WHERE fsrs_seeded_at IS NULL;

-- 3) srs_review_logs (FSRS rating history → foundation for Prompt 04 Hard Words).
--    Note: table uses student_id to match curriculum_vocabulary_srs, but RLS
--    keys auth.uid() against profiles.id (same value — students have a 1:1
--    relationship with profiles).

CREATE TABLE IF NOT EXISTS srs_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  stability_after DOUBLE PRECISION NOT NULL,
  difficulty_after DOUBLE PRECISION NOT NULL,
  elapsed_days DOUBLE PRECISION NOT NULL,
  scheduled_days DOUBLE PRECISION NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS srs_logs_student_vocab_idx
  ON srs_review_logs(student_id, vocabulary_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS srs_logs_reviewed_at_idx
  ON srs_review_logs(reviewed_at DESC);

ALTER TABLE srs_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students read own logs" ON srs_review_logs;
CREATE POLICY "students read own logs"
  ON srs_review_logs FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "students insert own logs" ON srs_review_logs;
CREATE POLICY "students insert own logs"
  ON srs_review_logs FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "admin full access" ON srs_review_logs;
CREATE POLICY "admin full access"
  ON srs_review_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4) SRS preference columns on profiles.
--    These replace the older students.anki_* columns (which are NOT being
--    dropped — kept for any legacy code, but the new SRS reads from profiles).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS srs_daily_new_cards INTEGER DEFAULT 20
    CHECK (srs_daily_new_cards BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS srs_daily_max_reviews INTEGER DEFAULT 200
    CHECK (srs_daily_max_reviews BETWEEN 50 AND 500),
  ADD COLUMN IF NOT EXISTS srs_review_order TEXT DEFAULT 'level'
    CHECK (srs_review_order IN ('level', 'random', 'unit')),
  ADD COLUMN IF NOT EXISTS srs_autoplay_audio BOOLEAN DEFAULT true;

-- 5) Drop dead anki tables (verified 0 rows in Phase A discovery).

DROP TABLE IF EXISTS anki_cards CASCADE;
DROP TABLE IF EXISTS anki_review_logs CASCADE;
