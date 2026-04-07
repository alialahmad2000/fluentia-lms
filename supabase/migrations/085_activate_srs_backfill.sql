-- Migration 085: Backfill curriculum_vocabulary_srs from vocabulary_word_mastery
-- Closes audit finding: SRS table has 0 rows despite schema existing

-- Step 1: Backfill from existing vocabulary_word_mastery
-- Every mastery record becomes an SRS card
INSERT INTO curriculum_vocabulary_srs
  (student_id, vocabulary_id, ease_factor, interval_days, repetitions,
   next_review_at, last_quality, created_at, updated_at)
SELECT
  vwm.student_id,
  vwm.vocabulary_id,
  2.5 AS ease_factor,
  CASE
    WHEN vwm.mastery_level = 'mastered' THEN 7
    WHEN vwm.mastery_level = 'learning' THEN 1
    ELSE 0
  END AS interval_days,
  CASE
    WHEN vwm.mastery_level = 'mastered' THEN 2
    WHEN vwm.mastery_level = 'learning' THEN 1
    ELSE 0
  END AS repetitions,
  CASE
    WHEN vwm.mastery_level = 'mastered' THEN NOW() + INTERVAL '7 days'
    WHEN vwm.mastery_level = 'learning' THEN NOW() + INTERVAL '1 day'
    ELSE NOW()
  END AS next_review_at,
  CASE
    WHEN vwm.mastery_level = 'mastered' THEN 5
    WHEN vwm.mastery_level = 'learning' THEN 3
    ELSE NULL
  END AS last_quality,
  NOW() AS created_at,
  NOW() AS updated_at
FROM vocabulary_word_mastery vwm
WHERE NOT EXISTS (
  SELECT 1 FROM curriculum_vocabulary_srs srs
  WHERE srs.student_id = vwm.student_id
    AND srs.vocabulary_id = vwm.vocabulary_id
);

-- Step 2: Add composite index for fast daily review queries
CREATE INDEX IF NOT EXISTS idx_srs_student_due
  ON curriculum_vocabulary_srs (student_id, next_review_at);
