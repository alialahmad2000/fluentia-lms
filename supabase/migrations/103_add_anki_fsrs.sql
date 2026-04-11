-- Prompt 32: Anki Core with FSRS v4 scheduler
-- Note: student-specific settings live on `students`, not `profiles`
-- Note: vocabulary table is `curriculum_vocabulary`

-- ── Per-student Anki settings (on students) ────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS anki_daily_new_cards INT DEFAULT 20
    CHECK (anki_daily_new_cards IN (10, 20, 30, 50)),
  ADD COLUMN IF NOT EXISTS anki_daily_max_reviews INT DEFAULT 200,
  ADD COLUMN IF NOT EXISTS anki_review_order TEXT DEFAULT 'by_level'
    CHECK (anki_review_order IN ('by_level', 'random', 'by_unit')),
  ADD COLUMN IF NOT EXISTS anki_autoplay_audio BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS anki_last_session_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anki_streak_current INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anki_streak_best INT DEFAULT 0;

-- ── Anki cards (one row per student × vocabulary word) ─
CREATE TABLE IF NOT EXISTS anki_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,

  -- FSRS state machine
  state TEXT NOT NULL DEFAULT 'new'
    CHECK (state IN ('new', 'learning', 'review', 'relearning')),

  -- FSRS variables
  stability NUMERIC NOT NULL DEFAULT 0,    -- memory stability (days)
  difficulty NUMERIC NOT NULL DEFAULT 0,   -- word difficulty (1-10)
  elapsed_days INT NOT NULL DEFAULT 0,
  scheduled_days INT NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,             -- total repetitions
  lapses INT NOT NULL DEFAULT 0,           -- times forgotten

  -- Scheduling
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_review_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(student_id, vocabulary_id)
);

CREATE INDEX IF NOT EXISTS idx_anki_due
  ON anki_cards(student_id, due_at)
  WHERE state <> 'new';

CREATE INDEX IF NOT EXISTS idx_anki_new
  ON anki_cards(student_id, created_at)
  WHERE state = 'new';

CREATE INDEX IF NOT EXISTS idx_anki_student
  ON anki_cards(student_id);

-- ── Review log (per rating, for analytics + future FSRS tuning) ─
CREATE TABLE IF NOT EXISTS anki_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES anki_cards(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INT NOT NULL CHECK (rating IN (1, 2, 3, 4)), -- 1=Again 2=Hard 3=Good 4=Easy
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  elapsed_days INT,
  scheduled_days INT,
  stability_after NUMERIC,
  difficulty_after NUMERIC,
  duration_ms INT,

  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anki_review_logs_student
  ON anki_review_logs(student_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_anki_review_logs_card
  ON anki_review_logs(card_id, reviewed_at DESC);

-- ── updated_at trigger for anki_cards ──────────────────
CREATE OR REPLACE FUNCTION set_anki_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_anki_cards_updated_at ON anki_cards;
CREATE TRIGGER trg_anki_cards_updated_at
  BEFORE UPDATE ON anki_cards
  FOR EACH ROW EXECUTE FUNCTION set_anki_cards_updated_at();

-- ── RLS ────────────────────────────────────────────────
ALTER TABLE anki_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE anki_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anki_cards_student_select" ON anki_cards;
CREATE POLICY "anki_cards_student_select" ON anki_cards
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_cards_student_insert" ON anki_cards;
CREATE POLICY "anki_cards_student_insert" ON anki_cards
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_cards_student_update" ON anki_cards;
CREATE POLICY "anki_cards_student_update" ON anki_cards
  FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_cards_student_delete" ON anki_cards;
CREATE POLICY "anki_cards_student_delete" ON anki_cards
  FOR DELETE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_cards_staff_select" ON anki_cards;
CREATE POLICY "anki_cards_staff_select" ON anki_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "anki_logs_student_select" ON anki_review_logs;
CREATE POLICY "anki_logs_student_select" ON anki_review_logs
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_logs_student_insert" ON anki_review_logs;
CREATE POLICY "anki_logs_student_insert" ON anki_review_logs
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "anki_logs_staff_select" ON anki_review_logs;
CREATE POLICY "anki_logs_staff_select" ON anki_review_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('trainer', 'admin')
    )
  );
