-- ═══════════════════════════════════════════════════════════
-- Migration 037: Gamification & Engagement Tables (5 tables)
-- ═══════════════════════════════════════════════════════════

-- ─── 1. curriculum_vocabulary_srs (Spaced Repetition) ───
CREATE TABLE IF NOT EXISTS curriculum_vocabulary_srs (
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

-- ─── 2. daily_challenges ───
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL UNIQUE,
  day_of_week INTEGER NOT NULL,
  challenge_type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content JSONB NOT NULL,
  xp_reward INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. student_streaks ───
CREATE TABLE IF NOT EXISTS student_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. student_daily_completions ───
CREATE TABLE IF NOT EXISTS student_daily_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id),
  score NUMERIC,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);

-- ─── 5. student_error_bank ───
CREATE TABLE IF NOT EXISTS student_error_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id),
  error_type TEXT NOT NULL,
  error_category TEXT NOT NULL,
  original_text TEXT,
  correct_text TEXT,
  explanation_ar TEXT,
  explanation_en TEXT,
  source_section TEXT,
  occurrence_count INTEGER DEFAULT 1,
  is_resolved BOOLEAN DEFAULT false,
  last_occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_srs_student ON curriculum_vocabulary_srs(student_id);
CREATE INDEX IF NOT EXISTS idx_srs_next_review ON curriculum_vocabulary_srs(next_review_at);
CREATE INDEX IF NOT EXISTS idx_srs_vocab ON curriculum_vocabulary_srs(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_type ON daily_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_streaks_student ON student_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_completions_student ON student_daily_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_completions_challenge ON student_daily_completions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_errors_student ON student_error_bank(student_id);
CREATE INDEX IF NOT EXISTS idx_errors_type ON student_error_bank(student_id, error_type);
CREATE INDEX IF NOT EXISTS idx_errors_resolved ON student_error_bank(student_id, is_resolved);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════
ALTER TABLE curriculum_vocabulary_srs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_error_bank ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_challenges" ON daily_challenges;
  DROP POLICY IF EXISTS "auth_read_challenges" ON daily_challenges;
  DROP POLICY IF EXISTS "service_daily_challenges" ON daily_challenges;
  DROP POLICY IF EXISTS "own_srs" ON curriculum_vocabulary_srs;
  DROP POLICY IF EXISTS "staff_read_srs" ON curriculum_vocabulary_srs;
  DROP POLICY IF EXISTS "service_srs" ON curriculum_vocabulary_srs;
  DROP POLICY IF EXISTS "own_streaks" ON student_streaks;
  DROP POLICY IF EXISTS "staff_read_streaks" ON student_streaks;
  DROP POLICY IF EXISTS "service_streaks" ON student_streaks;
  DROP POLICY IF EXISTS "own_completions" ON student_daily_completions;
  DROP POLICY IF EXISTS "staff_read_completions" ON student_daily_completions;
  DROP POLICY IF EXISTS "service_completions" ON student_daily_completions;
  DROP POLICY IF EXISTS "own_errors" ON student_error_bank;
  DROP POLICY IF EXISTS "staff_read_errors" ON student_error_bank;
  DROP POLICY IF EXISTS "service_errors" ON student_error_bank;
END $$;

-- Daily challenges: admin writes, authenticated reads
CREATE POLICY "admin_all_challenges" ON daily_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "auth_read_challenges" ON daily_challenges FOR SELECT USING (auth.role() = 'authenticated');

-- Student personal data: own data only
CREATE POLICY "own_srs" ON curriculum_vocabulary_srs FOR ALL USING (student_id = auth.uid());
CREATE POLICY "own_streaks" ON student_streaks FOR ALL USING (student_id = auth.uid());
CREATE POLICY "own_completions" ON student_daily_completions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "own_errors" ON student_error_bank FOR ALL USING (student_id = auth.uid());

-- Staff can read all student data
CREATE POLICY "staff_read_srs" ON curriculum_vocabulary_srs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));
CREATE POLICY "staff_read_streaks" ON student_streaks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));
CREATE POLICY "staff_read_completions" ON student_daily_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));
CREATE POLICY "staff_read_errors" ON student_error_bank FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

-- Service role full access
CREATE POLICY "service_daily_challenges" ON daily_challenges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_srs" ON curriculum_vocabulary_srs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_streaks" ON student_streaks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_completions" ON student_daily_completions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_errors" ON student_error_bank FOR ALL USING (auth.role() = 'service_role');
