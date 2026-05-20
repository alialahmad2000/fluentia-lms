-- ============================================================
-- VOCAB-PREMIUM Prompt 04 — Hard Words Training
-- Idempotent + additive. Foundation: SRS upgrade from Prompt 03.
-- ============================================================

-- 1) Additive columns on curriculum_vocabulary_srs for hard-words tracking
ALTER TABLE curriculum_vocabulary_srs
  ADD COLUMN IF NOT EXISTS hw_correct_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hw_drill_modes_seen TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hw_last_drill_at TIMESTAMPTZ;

-- 2) Immutable drill attempt log
CREATE TABLE IF NOT EXISTS hard_words_drill_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES curriculum_vocabulary(id) ON DELETE CASCADE,
  drill_mode TEXT NOT NULL CHECK (drill_mode IN ('matching','context_fill','listening','typing_recall')),
  is_correct BOOLEAN NOT NULL,
  response_ms INTEGER,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hw_log_student_vocab_idx
  ON hard_words_drill_log(student_id, vocabulary_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS hw_log_attempted_at_idx
  ON hard_words_drill_log(attempted_at DESC);

ALTER TABLE hard_words_drill_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students read own drill log" ON hard_words_drill_log;
CREATE POLICY "students read own drill log"
  ON hard_words_drill_log FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "students insert own drill log" ON hard_words_drill_log;
CREATE POLICY "students insert own drill log"
  ON hard_words_drill_log FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "admin full access" ON hard_words_drill_log;
CREATE POLICY "admin full access"
  ON hard_words_drill_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3) Classification RPC.
--    NOTE: production uses curriculum_vocabulary.definition_ar (NOT meaning_ar).
--    Returns words classified as "hard" only — promotion gate is included.
CREATE OR REPLACE FUNCTION get_hard_words_for_student(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  vocabulary_id UUID,
  word TEXT,
  meaning_ar TEXT,
  audio_url TEXT,
  example_sentence TEXT,
  difficulty DOUBLE PRECISION,
  lapses INTEGER,
  hw_correct_streak INTEGER,
  hw_drill_modes_seen TEXT[],
  recent_again_rate DOUBLE PRECISION,
  classification TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent_log_stats AS (
    SELECT
      vocabulary_id,
      COUNT(*) FILTER (WHERE rating = 1)::float / NULLIF(COUNT(*), 0) AS again_rate,
      COUNT(*) AS recent_count
    FROM srs_review_logs
    WHERE student_id = p_student_id
      AND reviewed_at > NOW() - INTERVAL '14 days'
    GROUP BY vocabulary_id
  )
  SELECT
    cv.id AS vocabulary_id,
    cv.word,
    cv.definition_ar AS meaning_ar,
    cv.audio_url,
    cv.example_sentence,
    cvs.difficulty,
    cvs.lapses,
    cvs.hw_correct_streak,
    cvs.hw_drill_modes_seen,
    COALESCE(rls.again_rate, 0) AS recent_again_rate,
    'hard'::TEXT AS classification
  FROM curriculum_vocabulary_srs cvs
  JOIN curriculum_vocabulary cv ON cv.id = cvs.vocabulary_id
  LEFT JOIN recent_log_stats rls ON rls.vocabulary_id = cvs.vocabulary_id
  WHERE cvs.student_id = p_student_id
    AND (
      cvs.lapses >= 3
      OR cvs.difficulty >= 7.0
      OR (rls.again_rate >= 0.6 AND rls.recent_count >= 3)
    )
    -- Exclude already-promoted in current cycle
    AND NOT (cvs.hw_correct_streak >= 3 AND array_length(cvs.hw_drill_modes_seen, 1) >= 2)
  ORDER BY cvs.difficulty DESC NULLS LAST, cvs.lapses DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_hard_words_for_student(UUID, INTEGER) TO authenticated;

-- 4) Helper RPC: cheap count for nav badge + dashboard hero
CREATE OR REPLACE FUNCTION get_hard_words_count(p_student_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH recent_log_stats AS (
    SELECT
      vocabulary_id,
      COUNT(*) FILTER (WHERE rating = 1)::float / NULLIF(COUNT(*), 0) AS again_rate,
      COUNT(*) AS recent_count
    FROM srs_review_logs
    WHERE student_id = p_student_id
      AND reviewed_at > NOW() - INTERVAL '14 days'
    GROUP BY vocabulary_id
  )
  SELECT COUNT(*)::INTEGER
  FROM curriculum_vocabulary_srs cvs
  LEFT JOIN recent_log_stats rls ON rls.vocabulary_id = cvs.vocabulary_id
  WHERE cvs.student_id = p_student_id
    AND (
      cvs.lapses >= 3
      OR cvs.difficulty >= 7.0
      OR (rls.again_rate >= 0.6 AND rls.recent_count >= 3)
    )
    AND NOT (cvs.hw_correct_streak >= 3 AND array_length(cvs.hw_drill_modes_seen, 1) >= 2);
$$;

GRANT EXECUTE ON FUNCTION get_hard_words_count(UUID) TO authenticated;

-- 5) Helper RPC: breakdown by cause (for dashboard chips)
CREATE OR REPLACE FUNCTION get_hard_words_breakdown(p_student_id UUID)
RETURNS TABLE (
  high_lapses INTEGER,
  high_difficulty INTEGER,
  recent_again_pattern INTEGER,
  total_hard INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH recent_log_stats AS (
    SELECT
      vocabulary_id,
      COUNT(*) FILTER (WHERE rating = 1)::float / NULLIF(COUNT(*), 0) AS again_rate,
      COUNT(*) AS recent_count
    FROM srs_review_logs
    WHERE student_id = p_student_id
      AND reviewed_at > NOW() - INTERVAL '14 days'
    GROUP BY vocabulary_id
  ),
  hard_rows AS (
    SELECT
      cvs.vocabulary_id,
      cvs.lapses,
      cvs.difficulty,
      COALESCE(rls.again_rate, 0) AS again_rate,
      COALESCE(rls.recent_count, 0) AS recent_count
    FROM curriculum_vocabulary_srs cvs
    LEFT JOIN recent_log_stats rls ON rls.vocabulary_id = cvs.vocabulary_id
    WHERE cvs.student_id = p_student_id
      AND (
        cvs.lapses >= 3
        OR cvs.difficulty >= 7.0
        OR (rls.again_rate >= 0.6 AND rls.recent_count >= 3)
      )
      AND NOT (cvs.hw_correct_streak >= 3 AND array_length(cvs.hw_drill_modes_seen, 1) >= 2)
  )
  SELECT
    COUNT(*) FILTER (WHERE lapses >= 3)::INTEGER AS high_lapses,
    COUNT(*) FILTER (WHERE difficulty >= 7.0)::INTEGER AS high_difficulty,
    COUNT(*) FILTER (WHERE again_rate >= 0.6 AND recent_count >= 3)::INTEGER AS recent_again_pattern,
    COUNT(*)::INTEGER AS total_hard
  FROM hard_rows;
$$;

GRANT EXECUTE ON FUNCTION get_hard_words_breakdown(UUID) TO authenticated;
