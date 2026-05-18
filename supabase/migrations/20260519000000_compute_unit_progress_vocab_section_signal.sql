-- ─────────────────────────────────────────────────────────────────────────────
-- 20260519000000_compute_unit_progress_vocab_section_signal.sql
--
-- BUG: compute_unit_progress evaluates vocabulary completion ONLY from the 80%
-- word-mastery threshold in vocabulary_word_mastery. It ignores the explicit
-- section-level completion signal written to student_curriculum_progress when
-- the student finishes a vocab activity:
--   section_type IN ('vocabulary','vocabulary_exercise')
--   AND status = 'completed' AND is_best = true
--
-- Audit (PHASE-A-REPORT.md) found 30 student/unit pairs with this mismatch
-- (22 'vocabulary_exercise' + 8 'vocabulary'). Every other section type is
-- already correct.
--
-- FIX: a vocab section now counts as complete when EITHER signal is present.
-- The vocabulary_engaged / vocabulary_needed metrics are preserved unchanged
-- so the per-section progress bar continues to work.
--
-- Idempotent — CREATE OR REPLACE on the function only. No data writes here
-- (backfill is a separate one-shot in Phase D).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_unit_progress(p_student_id uuid, p_unit_id uuid)
RETURNS TABLE(numerator integer, denominator integer, percentage integer, breakdown jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_inventory jsonb := '{}'::jsonb;
  v_completion jsonb := '{}'::jsonb;
  v_num int := 0;
  v_den int := 0;
  v_count int;
  v_vocab_section_done boolean;
  v_vocab_needed int;
BEGIN
  -- ─── Build the unit's activity inventory dynamically ─────────────────────

  -- Reading passages (A and B are distinct, each worth 1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_readings WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('reading', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Grammar lesson (0 or 1 per unit)
  SELECT COUNT(*) INTO v_count FROM curriculum_grammar WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('grammar', 1);
    v_den := v_den + 1;
  END IF;

  -- Listening (1 slot regardless of how many items)
  SELECT COUNT(*) INTO v_count FROM curriculum_listening WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('listening', v_count);
    v_den := v_den + 1;
  END IF;

  -- Speaking (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_speaking WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('speaking', 1);
    v_den := v_den + 1;
  END IF;

  -- Writing (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_writing WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('writing', 1);
    v_den := v_den + 1;
  END IF;

  -- Vocabulary (1 slot; curriculum_vocabulary has no unit_id, must join via readings)
  SELECT COUNT(*) INTO v_count
  FROM curriculum_vocabulary cv
  JOIN curriculum_readings cr ON cr.id = cv.reading_id
  WHERE cr.unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('vocabulary_total', v_count);
    v_den := v_den + 1;
  END IF;

  -- Pronunciation (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_pronunciation WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('pronunciation', 1);
    v_den := v_den + 1;
  END IF;

  -- Unit assessment (1 slot)
  SELECT COUNT(*) INTO v_count FROM curriculum_assessments WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('assessment', 1);
    v_den := v_den + 1;
  END IF;

  -- ─── Tally completions ───────────────────────────────────────────────────

  -- Reading: count distinct completed readings (is_best=true prevents counting retries twice)
  SELECT COUNT(DISTINCT reading_id) INTO v_count
  FROM student_curriculum_progress
  WHERE student_id = p_student_id
    AND unit_id    = p_unit_id
    AND section_type = 'reading'
    AND status       = 'completed'
    AND is_best      = true
    AND reading_id IS NOT NULL;
  v_num := v_num + LEAST(v_count, COALESCE((v_inventory->>'reading')::int, 0));
  v_completion := v_completion || jsonb_build_object('reading_done', v_count);

  -- Grammar
  IF v_inventory ? 'grammar' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'grammar'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('grammar_done', LEAST(v_count, 1));
  END IF;

  -- Listening
  IF v_inventory ? 'listening' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'listening'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('listening_done', LEAST(v_count, 1));
  END IF;

  -- Speaking: check student_curriculum_progress first, fall back to speaking_recordings
  IF v_inventory ? 'speaking' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'speaking'
      AND status       = 'completed';
    IF v_count = 0 THEN
      -- Fallback: actual recording exists → credit as complete
      SELECT COUNT(*) INTO v_count
      FROM speaking_recordings
      WHERE student_id = p_student_id AND unit_id = p_unit_id;
    END IF;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('speaking_done', LEAST(v_count, 1));
  END IF;

  -- Writing
  IF v_inventory ? 'writing' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'writing'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('writing_done', LEAST(v_count, 1));
  END IF;

  -- ─── Vocabulary — NEW: explicit section-level signal OR 80% word-mastery ─
  -- Section is complete when EITHER:
  --   (a) student_curriculum_progress has section_type IN ('vocabulary',
  --       'vocabulary_exercise') AND status='completed' AND is_best=true, OR
  --   (b) ≥80% of total words are engaged in vocabulary_word_mastery
  -- Always compute vocabulary_engaged / vocabulary_needed so the progress bar
  -- continues to reflect per-word progress.
  IF v_inventory ? 'vocabulary_total' THEN
    -- (a) explicit section-level completion
    SELECT EXISTS (
      SELECT 1 FROM student_curriculum_progress
      WHERE student_id = p_student_id
        AND unit_id    = p_unit_id
        AND section_type IN ('vocabulary', 'vocabulary_exercise')
        AND status     = 'completed'
        AND is_best    = true
    ) INTO v_vocab_section_done;

    -- (b) per-word engagement count (preserved metric)
    SELECT COUNT(*) INTO v_count
    FROM vocabulary_word_mastery vwm
    JOIN curriculum_vocabulary cv ON cv.id = vwm.vocabulary_id
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    WHERE vwm.student_id = p_student_id
      AND cr.unit_id     = p_unit_id
      AND (vwm.meaning_exercise_passed = true
           OR vwm.sentence_exercise_passed = true
           OR vwm.listening_exercise_passed = true
           OR vwm.mastery_level IN ('learning', 'mastered'));

    v_vocab_needed := CEIL((v_inventory->>'vocabulary_total')::numeric * 0.8);

    IF v_vocab_section_done OR v_count >= v_vocab_needed THEN
      v_num := v_num + 1;
    END IF;

    v_completion := v_completion || jsonb_build_object(
      'vocabulary_engaged',         v_count,
      'vocabulary_needed',          v_vocab_needed,
      'vocabulary_section_done',    v_vocab_section_done
    );
  END IF;

  -- Pronunciation
  IF v_inventory ? 'pronunciation' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'pronunciation'
      AND status       = 'completed'
      AND is_best      = true;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('pronunciation_done', LEAST(v_count, 1));
  END IF;

  -- Assessment: passed (score >= 70) via activity_attempts
  IF v_inventory ? 'assessment' THEN
    SELECT COUNT(*) INTO v_count
    FROM activity_attempts aa
    JOIN curriculum_assessments ca ON ca.id = aa.activity_id
    WHERE aa.student_id = p_student_id
      AND ca.unit_id    = p_unit_id
      AND aa.status     = 'submitted'
      AND aa.score      >= 70;
    IF v_count > 0 THEN v_num := v_num + 1; END IF;
    v_completion := v_completion || jsonb_build_object('assessment_passed', LEAST(v_count, 1));
  END IF;

  -- ─── Return ───────────────────────────────────────────────────────────────
  RETURN QUERY SELECT
    v_num,
    v_den,
    CASE WHEN v_den = 0 THEN 0
         ELSE ROUND((v_num::numeric / v_den::numeric) * 100)::int
    END,
    jsonb_build_object('inventory', v_inventory, 'completion', v_completion);
END;
$function$;
