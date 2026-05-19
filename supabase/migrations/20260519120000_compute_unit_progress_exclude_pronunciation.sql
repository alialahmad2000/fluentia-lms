-- PRONUNCIATION-HIDDEN 2026-05-19 — companion migration to the UI hide.
--
-- The pronunciation activity was contributing 1 to the denominator of every
-- unit's progress percentage when a curriculum_pronunciation row existed. With
-- pronunciation hidden from student-facing UI (route + unit-v2 ACTIVITY_MAP +
-- UnitContent tab + StudentSpeaking sub-tab + _premiumPrimitives icon), the
-- student can no longer reach the activity — so they can never satisfy the
-- denominator, capping their unit percentage at < 100%.
--
-- This migration replaces compute_unit_progress() with a copy that skips the
-- pronunciation inventory + completion blocks. The pronunciation rows in
-- student_curriculum_progress and curriculum_pronunciation are PRESERVED;
-- they're just no longer consulted by the progress calc.
--
-- To re-enable when the feature is revived, run a follow-up migration that
-- restores the pronunciation blocks (see PRONUNCIATION-SHELVED.md).
--
-- IDEMPOTENT — CREATE OR REPLACE on the function only.

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
  -- Reading passages
  SELECT COUNT(*) INTO v_count FROM curriculum_readings WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('reading', v_count);
    v_den := v_den + v_count;
  END IF;

  -- Grammar
  SELECT COUNT(*) INTO v_count FROM curriculum_grammar WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('grammar', 1);
    v_den := v_den + 1;
  END IF;

  -- Listening
  SELECT COUNT(*) INTO v_count FROM curriculum_listening WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('listening', v_count);
    v_den := v_den + 1;
  END IF;

  -- Speaking
  SELECT COUNT(*) INTO v_count FROM curriculum_speaking WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('speaking', 1);
    v_den := v_den + 1;
  END IF;

  -- Writing
  SELECT COUNT(*) INTO v_count FROM curriculum_writing WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('writing', 1);
    v_den := v_den + 1;
  END IF;

  -- Vocabulary (via reading join — vocab table has no unit_id)
  SELECT COUNT(*) INTO v_count
  FROM curriculum_vocabulary cv
  JOIN curriculum_readings cr ON cr.id = cv.reading_id
  WHERE cr.unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('vocabulary_total', v_count);
    v_den := v_den + 1;
  END IF;

  -- PRONUNCIATION-HIDDEN 2026-05-19 — pronunciation inventory block removed.
  -- The curriculum_pronunciation rows still exist in the DB; they're just
  -- no longer counted toward the unit progress denominator. To re-enable:
  --
  --   SELECT COUNT(*) INTO v_count FROM curriculum_pronunciation WHERE unit_id = p_unit_id;
  --   IF v_count > 0 THEN
  --     v_inventory := v_inventory || jsonb_build_object('pronunciation', 1);
  --     v_den := v_den + 1;
  --   END IF;

  -- Assessment
  SELECT COUNT(*) INTO v_count FROM curriculum_assessments WHERE unit_id = p_unit_id;
  IF v_count > 0 THEN
    v_inventory := v_inventory || jsonb_build_object('assessment', 1);
    v_den := v_den + 1;
  END IF;

  -- ─── Tally completions ───────────────────────────────────────────────────

  -- Reading
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

  -- Speaking — student_curriculum_progress first, fall back to speaking_recordings
  IF v_inventory ? 'speaking' THEN
    SELECT COUNT(*) INTO v_count
    FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND unit_id    = p_unit_id
      AND section_type = 'speaking'
      AND status       = 'completed';
    IF v_count = 0 THEN
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

  -- Vocabulary — explicit section signal OR 80% word-mastery threshold (preserved from 2026-05-19 fix)
  IF v_inventory ? 'vocabulary_total' THEN
    SELECT EXISTS (
      SELECT 1 FROM student_curriculum_progress
      WHERE student_id = p_student_id
        AND unit_id    = p_unit_id
        AND section_type IN ('vocabulary', 'vocabulary_exercise')
        AND status     = 'completed'
        AND is_best    = true
    ) INTO v_vocab_section_done;

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

  -- PRONUNCIATION-HIDDEN 2026-05-19 — pronunciation completion block removed
  -- (was incrementing v_num + writing pronunciation_done into v_completion).

  -- Assessment
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

  RETURN QUERY SELECT
    v_num,
    v_den,
    CASE WHEN v_den = 0 THEN 0
         ELSE ROUND((v_num::numeric / v_den::numeric) * 100)::int
    END,
    jsonb_build_object('inventory', v_inventory, 'completion', v_completion);
END;
$function$;
