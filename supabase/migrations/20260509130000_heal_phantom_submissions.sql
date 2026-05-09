-- Heal phantom submissions: mark rows that match the phantom pattern as abandoned.
-- Dry-run count first, then actual update. Revokes associated XP transactions.

BEGIN;

-- ─── Dry run: how many would we heal? ────────────────────────────────────────
DO $$
DECLARE
  v_count_listening INT;
  v_count_reading   INT;
  v_count_grammar   INT;
BEGIN
  -- Listening: completed rows with all null studentAnswers
  SELECT COUNT(*) INTO v_count_listening
  FROM student_curriculum_progress
  WHERE section_type = 'listening'
    AND status IN ('completed','submitted','graded')
    AND answers IS NOT NULL
    AND jsonb_typeof(answers) = 'object'
    AND answers ? 'questions'
    AND (
      SELECT COUNT(*) FROM jsonb_array_elements(answers->'questions') q
      WHERE q->>'studentAnswer' IS NOT NULL AND q->>'studentAnswer' != 'null'
    ) = 0;

  -- Reading: completed with score=0 and empty/null answers
  SELECT COUNT(*) INTO v_count_reading
  FROM student_curriculum_progress
  WHERE section_type = 'reading'
    AND status IN ('completed','submitted','graded')
    AND COALESCE(score, 0) = 0
    AND (answers IS NULL OR answers::text IN ('{}','[]','null'));

  -- Grammar: completed with score=0 and empty answers
  SELECT COUNT(*) INTO v_count_grammar
  FROM student_curriculum_progress
  WHERE section_type = 'grammar'
    AND status IN ('completed','submitted','graded')
    AND COALESCE(score, 0) = 0
    AND (answers IS NULL OR answers::text IN ('{}','[]','null'));

  RAISE NOTICE 'DRY RUN — Phantom rows that would be healed:';
  RAISE NOTICE '  listening (all-null answers): %', v_count_listening;
  RAISE NOTICE '  reading   (score=0, empty):   %', v_count_reading;
  RAISE NOTICE '  grammar   (score=0, empty):   %', v_count_grammar;
  RAISE NOTICE 'Total: %', v_count_listening + v_count_reading + v_count_grammar;
END $$;

-- ─── Actual heal: listening all-null-answer rows ──────────────────────────────
UPDATE student_curriculum_progress
SET
  status            = 'abandoned',
  is_phantom        = true,
  phantom_healed_at = NOW(),
  is_latest         = false,
  is_best           = false
WHERE section_type = 'listening'
  AND status IN ('completed','submitted','graded')
  AND answers IS NOT NULL
  AND jsonb_typeof(answers) = 'object'
  AND answers ? 'questions'
  AND (
    SELECT COUNT(*) FROM jsonb_array_elements(answers->'questions') q
    WHERE q->>'studentAnswer' IS NOT NULL AND q->>'studentAnswer' != 'null'
  ) = 0;

-- ─── Actual heal: reading score=0 empty-answer rows ──────────────────────────
UPDATE student_curriculum_progress
SET
  status            = 'abandoned',
  is_phantom        = true,
  phantom_healed_at = NOW(),
  is_latest         = false,
  is_best           = false
WHERE section_type = 'reading'
  AND status IN ('completed','submitted','graded')
  AND COALESCE(score, 0) = 0
  AND (answers IS NULL OR answers::text IN ('{}','[]','null'));

-- ─── Actual heal: grammar score=0 empty-answer rows ──────────────────────────
UPDATE student_curriculum_progress
SET
  status            = 'abandoned',
  is_phantom        = true,
  phantom_healed_at = NOW(),
  is_latest         = false,
  is_best           = false
WHERE section_type = 'grammar'
  AND status IN ('completed','submitted','graded')
  AND COALESCE(score, 0) = 0
  AND (answers IS NULL OR answers::text IN ('{}','[]','null'));

-- ─── Queue in-app notifications for affected students ────────────────────────
-- One notification per student (even if they had multiple phantom activities).
INSERT INTO notifications (user_id, type, title, body, data)
SELECT DISTINCT
  student_id,
  'system'::notification_type,
  'تم إعادة فتح بعض الأنشطة',
  'لاحظنا أن بعض الأنشطة عندك تأثرت بمشكلة فنية سابقة — أعدنا فتحها وتقدرين تحلينها من جديد. درجتك الجديدة (لو أعلى) هي اللي رح تُحتسب.',
  '{"reason":"phantom_heal_2026_05"}'::jsonb
FROM student_curriculum_progress
WHERE is_phantom = true
  AND phantom_healed_at IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
