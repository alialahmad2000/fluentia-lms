-- Fluentia LMS — the daily activity rollup learns to see the WHOLE platform
--
-- WHY (found 2026-08-11 while auditing the 10 Aug daily report):
--   compute_student_daily_activity() only ever read curriculum progress, vocabulary,
--   quizzes and speaking recordings. Every other learning surface the platform has
--   grown since — IELTS Atelier, the Library, STEP, the Spelling Lab, the games,
--   retention homework, unit mastery, Everyday English — was INVISIBLE to it.
--
--   The cost was not cosmetic. الهنوف البقمي completed 12 IELTS skill sessions
--   between 13 Jul and 6 Aug (8 of them reading papers, ~17 min each) and the daily
--   report filed her under «😴 لم ينشطوا» with 0 minutes and 0 activities, every
--   single day. Acting on that report means sending a "we miss you" nudge to one of
--   the most consistent students in the academy. Same class of blindness applied to
--   نادية's library work.
--
--   Because learning_seconds / sections_completed feed the teacher roster, the admin
--   reports hub, the student deep analysis, the parent share link AND the daily
--   digest, one wrong rollup under-reported that student everywhere at once.
--
-- WHAT THIS CHANGES
--   learning_seconds  — now engaged time across ALL surfaces (was: curriculum only)
--   sections_completed— now completed activities across ALL surfaces (was: curriculum)
--   curriculum_seconds / curriculum_sections (NEW) — preserve the old narrow meaning
--   source_breakdown  (NEW) — provenance per surface, so a number can always be traced
--   skill_breakdown   — gains non-curriculum keys (ielts_reading, library, step, …)
--
-- TIME MODEL — honest about what is measured vs estimated. Estimated sources are
-- listed in source_breakdown with "estimated": true so no one mistakes them for
-- instrumented time.
--   MEASURED : ielts_skill_sessions.duration_seconds (avg 1062s, 100% populated)
--              spelling_lab_attempts.ms_to_submit · game_sessions.time_seconds
--              retention_homework_attempts.time_seconds · retention_dialogue.total_speaking_seconds
--              everyday_english_sessions.total_speaking_seconds · ielts_micro_drill_attempts.ms
--   ESTIMATED: step_item_attempts.seconds is NULL for all 245 rows → 30s per item
--              unit_mastery_attempts.time_spent_seconds is NULL for all 22 rows
--                → completed_at - started_at, else 300s
--              library has no duration column at all
--                → 20s per shadow attempt (record one sentence), 30s per question
--              game_sessions.time_seconds NULL for 271/852 → 38s (observed average)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Additive columns. Nothing is dropped or renamed.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.student_daily_activity
  ADD COLUMN IF NOT EXISTS curriculum_seconds  int   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS curriculum_sections int   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_seconds       int   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_activities    int   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_breakdown    jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.student_daily_activity.learning_seconds IS
  'Engaged learning time across EVERY surface (curriculum + IELTS + library + STEP + labs + games). Was curriculum-only before 2026-08-11.';
COMMENT ON COLUMN public.student_daily_activity.curriculum_seconds IS
  'The curriculum-only slice of learning_seconds (the pre-2026-08-11 meaning).';
COMMENT ON COLUMN public.student_daily_activity.source_breakdown IS
  'Provenance per non-curriculum surface: {key: {seconds, activities, estimated}}. "estimated" flags time derived from a rate, not instrumented.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. compute_student_daily_activity — curriculum logic preserved verbatim,
--    non-curriculum surfaces added.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_student_daily_activity(p_student uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_start timestamptz := timezone('Asia/Riyadh', p_date::timestamp);
  v_end   timestamptz := timezone('Asia/Riyadh', (p_date + 1)::timestamp);

  v_learn int; v_pagesecs int; v_pv int; v_sessions int;
  v_words_mastered int; v_words_practiced int; v_words_reviewed int; v_words_saved int;
  v_sections int; v_avg_score numeric; v_skill jsonb;
  v_quizzes int; v_q_total int; v_q_correct int;
  v_speaking int; v_speak_secs int; v_subs int; v_xp int;
  v_has boolean;

  -- non-curriculum surfaces
  v_other_secs int; v_other_acts int; v_other_src jsonb; v_other_skill jsonb;
  v_other_score_sum numeric; v_other_score_n int;
  v_final_avg numeric;
BEGIN
  -- ══ CURRICULUM (unchanged) ═════════════════════════════════════════════════
  SELECT COALESCE(SUM(time_spent_seconds), 0) INTO v_learn
  FROM student_curriculum_progress
  WHERE student_id = p_student
    AND COALESCE(completed_at, updated_at) >= v_start
    AND COALESCE(completed_at, updated_at) <  v_end
    AND COALESCE(is_phantom, false) = false
    AND COALESCE(is_latest, true) = true;

  SELECT COALESCE(SUM(duration_seconds), 0) INTO v_pagesecs
  FROM page_visits
  WHERE user_id = p_student AND entered_at >= v_start AND entered_at < v_end;

  SELECT COUNT(*) INTO v_pv
  FROM page_visits
  WHERE user_id = p_student AND entered_at >= v_start AND entered_at < v_end;

  SELECT COUNT(*) INTO v_sessions
  FROM user_sessions
  WHERE user_id = p_student AND started_at >= v_start AND started_at < v_end;

  SELECT COUNT(*) INTO v_words_mastered
  FROM vocabulary_word_mastery
  WHERE student_id = p_student
    AND mastery_level = 'mastered'
    AND COALESCE(GREATEST(meaning_exercise_passed_at, sentence_exercise_passed_at, listening_exercise_passed_at), updated_at) >= v_start
    AND COALESCE(GREATEST(meaning_exercise_passed_at, sentence_exercise_passed_at, listening_exercise_passed_at), updated_at) <  v_end;

  SELECT COUNT(*) INTO v_words_practiced
  FROM vocabulary_word_mastery
  WHERE student_id = p_student AND last_practiced_at >= v_start AND last_practiced_at < v_end;

  SELECT COUNT(DISTINCT vocabulary_id) INTO v_words_reviewed
  FROM srs_review_logs
  WHERE student_id = p_student AND reviewed_at >= v_start AND reviewed_at < v_end;

  SELECT COUNT(*) INTO v_words_saved
  FROM student_saved_words
  WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end;

  SELECT COUNT(*), ROUND(AVG(score), 1) INTO v_sections, v_avg_score
  FROM student_curriculum_progress
  WHERE student_id = p_student
    AND status = 'completed'
    AND completed_at >= v_start AND completed_at < v_end
    AND COALESCE(is_phantom, false) = false
    AND COALESCE(is_latest, true) = true;

  SELECT COALESCE(
           jsonb_object_agg(section_type, jsonb_build_object('completed', c, 'avg_score', avgs, 'time_seconds', ts)),
           '{}'::jsonb)
    INTO v_skill
  FROM (
    SELECT section_type, COUNT(*) AS c, ROUND(AVG(score), 1) AS avgs, COALESCE(SUM(time_spent_seconds), 0) AS ts
    FROM student_curriculum_progress
    WHERE student_id = p_student
      AND status = 'completed'
      AND completed_at >= v_start AND completed_at < v_end
      AND COALESCE(is_phantom, false) = false
      AND COALESCE(is_latest, true) = true
    GROUP BY section_type
  ) q;

  SELECT COUNT(*), COALESCE(SUM(total_questions), 0), COALESCE(SUM(correct_count), 0)
    INTO v_quizzes, v_q_total, v_q_correct
  FROM vocabulary_quiz_attempts
  WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end;

  SELECT COUNT(*), COALESCE(SUM(audio_duration_seconds), 0) INTO v_speaking, v_speak_secs
  FROM speaking_recordings
  WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end;

  SELECT COUNT(*) INTO v_subs
  FROM submissions
  WHERE student_id = p_student AND submitted_at >= v_start AND submitted_at < v_end
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_xp
  FROM xp_transactions
  WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end;

  -- ══ EVERY OTHER LEARNING SURFACE (new) ═════════════════════════════════════
  -- One UNION ALL of (key, seconds, activities, accuracy, estimated) rows, then
  -- aggregated. Accuracy is a real percentage where the surface reports one —
  -- IELTS band scores are deliberately NOT folded into avg_score, because a band
  -- of 5.5 is not 5.5% and mixing the scales would corrupt «متوسط الدرجات».
  WITH src AS (
    -- IELTS Atelier: skill sessions carry a real duration (100% populated).
    SELECT 'ielts_' || COALESCE(NULLIF(skill_type, ''), 'other') AS k,
           COALESCE(duration_seconds, 0)                          AS secs,
           1                                                      AS acts,
           CASE WHEN COALESCE(correct_count, 0) + COALESCE(incorrect_count, 0) > 0
                THEN ROUND(100.0 * correct_count / (correct_count + incorrect_count), 1)
           END                                                    AS acc,
           false                                                  AS est
    FROM ielts_skill_sessions
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    UNION ALL
    SELECT 'ielts_mock',
           GREATEST(0, LEAST(10800, COALESCE(EXTRACT(EPOCH FROM (completed_at - started_at))::int, 0))),
           1, NULL, false
    FROM ielts_mock_attempts
    WHERE student_id = p_student AND completed_at >= v_start AND completed_at < v_end

    UNION ALL
    SELECT 'ielts_drill', COALESCE(ROUND(ms / 1000.0)::int, 0), 0,
           CASE WHEN is_correct THEN 100 ELSE 0 END, false
    FROM ielts_micro_drill_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    -- Library: no duration column exists. 20s to shadow one sentence, 30s per question.
    UNION ALL
    SELECT 'library', 20, 0, NULL, true
    FROM library_shadow_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    UNION ALL
    SELECT 'library', 30, 0, CASE WHEN is_correct THEN 100 ELSE 0 END, true
    FROM library_question_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    -- One library "activity" = one chapter touched that day.
    UNION ALL
    SELECT 'library', 0, 1, NULL, true
    FROM (
      SELECT DISTINCT chapter_id FROM library_shadow_attempts
       WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end
      UNION
      SELECT DISTINCT chapter_id FROM library_question_attempts
       WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end
    ) lib_ch

    -- STEP: .seconds is NULL on every row, so 30s per item. Activities counted at
    -- the paper level, not the item level, so a 100-question paper is 1 activity.
    UNION ALL
    SELECT 'step', 30, 0, CASE WHEN is_correct THEN 100 ELSE 0 END, true
    FROM step_item_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    UNION ALL
    SELECT 'step', 0, 1, NULL, true
    FROM step_attempts
    WHERE student_id = p_student AND completed_at >= v_start AND completed_at < v_end

    -- Spelling Lab: measured. A lab session is 10 words, so 10 attempts = 1 activity.
    UNION ALL
    SELECT 'spelling_lab', COALESCE(ROUND(ms_to_submit / 1000.0)::int, 0), 0,
           CASE WHEN is_correct THEN 100 ELSE 0 END, false
    FROM spelling_lab_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    UNION ALL
    SELECT 'spelling_lab', 0, CEIL(COUNT(*) / 10.0)::int, NULL, false
    FROM spelling_lab_attempts
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end
    HAVING COUNT(*) > 0

    UNION ALL
    SELECT 'games', COALESCE(time_seconds, 38), 1, accuracy_percent, (time_seconds IS NULL)
    FROM game_sessions
    WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end

    UNION ALL
    SELECT 'retention', COALESCE(time_seconds, 0), 0,
           CASE WHEN is_correct THEN 100 ELSE 0 END, false
    FROM retention_homework_attempts
    WHERE student_id = p_student AND attempted_at >= v_start AND attempted_at < v_end

    UNION ALL
    SELECT 'retention', 0, COUNT(DISTINCT homework_set_id)::int, NULL, false
    FROM retention_homework_attempts
    WHERE student_id = p_student AND attempted_at >= v_start AND attempted_at < v_end
    HAVING COUNT(*) > 0

    UNION ALL
    SELECT 'retention', COALESCE(total_speaking_seconds, 0), 1, vocab_hit_pct, false
    FROM retention_dialogue_attempts
    WHERE student_id = p_student AND completed_at >= v_start AND completed_at < v_end

    -- Unit mastery: time_spent_seconds is NULL on every row → wall clock, else 5 min.
    UNION ALL
    SELECT 'unit_mastery',
           COALESCE(NULLIF(time_spent_seconds, 0),
                    GREATEST(0, LEAST(7200, EXTRACT(EPOCH FROM (completed_at - started_at))::int)),
                    300),
           1, percentage, (time_spent_seconds IS NULL)
    FROM unit_mastery_attempts
    WHERE student_id = p_student AND completed_at >= v_start AND completed_at < v_end

    UNION ALL
    SELECT 'everyday_english', COALESCE(total_speaking_seconds, 0), 1, NULL, false
    FROM everyday_english_sessions
    WHERE student_id = p_student AND completed_at >= v_start AND completed_at < v_end
      AND deleted_at IS NULL

    UNION ALL
    SELECT 'assessment',
           GREATEST(0, LEAST(7200, COALESCE(EXTRACT(EPOCH FROM (submitted_at - started_at))::int, 0))),
           1,
           CASE WHEN total_questions > 0 THEN ROUND(100.0 * correct_count / total_questions, 1) END,
           false
    FROM activity_attempts
    WHERE student_id = p_student AND submitted_at >= v_start AND submitted_at < v_end
      AND deleted_at IS NULL
  ),
  agg AS (
    SELECT k,
           SUM(secs)::int  AS secs,
           SUM(acts)::int  AS acts,
           ROUND(AVG(acc), 1) AS acc,
           bool_or(est)    AS est
    FROM src GROUP BY k
  )
  SELECT COALESCE(SUM(secs), 0),
         COALESCE(SUM(acts), 0),
         COALESCE(jsonb_object_agg(k, jsonb_build_object(
           'seconds', secs, 'activities', acts, 'estimated', est)), '{}'::jsonb),
         COALESCE(jsonb_object_agg(k, jsonb_build_object(
           'completed', acts, 'avg_score', acc, 'time_seconds', secs)), '{}'::jsonb),
         COALESCE(SUM(acc * NULLIF(acts, 0)), 0),
         COALESCE(SUM(CASE WHEN acc IS NOT NULL THEN NULLIF(acts, 0) END), 0)
    INTO v_other_secs, v_other_acts, v_other_src, v_other_skill, v_other_score_sum, v_other_score_n
  FROM agg;

  -- Blend the day's average score. Curriculum sections and non-curriculum
  -- activities are weighted by how many of each actually happened.
  v_final_avg := CASE
    WHEN v_sections > 0 AND v_other_score_n > 0
      THEN ROUND(((v_avg_score * v_sections) + v_other_score_sum) / (v_sections + v_other_score_n), 1)
    WHEN v_sections > 0      THEN v_avg_score
    WHEN v_other_score_n > 0 THEN ROUND(v_other_score_sum / v_other_score_n, 1)
    ELSE NULL
  END;

  -- A day counts as real if ANY surface saw work — this is what stopped
  -- الهنوف's IELTS days from being deleted as empty.
  v_has := (v_learn > 0 OR v_pagesecs > 0 OR v_pv > 0 OR v_sessions > 0
            OR v_words_mastered > 0 OR v_words_practiced > 0 OR v_words_reviewed > 0 OR v_words_saved > 0
            OR v_sections > 0 OR v_quizzes > 0 OR v_speaking > 0 OR v_subs > 0 OR v_xp > 0
            OR v_other_secs > 0 OR v_other_acts > 0);

  IF NOT v_has THEN
    DELETE FROM student_daily_activity WHERE student_id = p_student AND activity_date = p_date;
    RETURN;
  END IF;

  INSERT INTO student_daily_activity (
    student_id, activity_date,
    learning_seconds, speaking_seconds, page_seconds, session_count, page_views,
    words_mastered, words_practiced, words_reviewed, words_saved,
    sections_completed, avg_score,
    quizzes_taken, quiz_questions, quiz_correct,
    speaking_recordings, submissions_count, xp_earned,
    skill_breakdown,
    curriculum_seconds, curriculum_sections, other_seconds, other_activities, source_breakdown,
    computed_at
  ) VALUES (
    p_student, p_date,
    v_learn + v_other_secs, v_speak_secs, v_pagesecs, v_sessions, v_pv,
    v_words_mastered, v_words_practiced, v_words_reviewed, v_words_saved,
    v_sections + v_other_acts, v_final_avg,
    v_quizzes, v_q_total, v_q_correct,
    v_speaking, v_subs, v_xp,
    COALESCE(v_skill, '{}'::jsonb) || COALESCE(v_other_skill, '{}'::jsonb),
    v_learn, v_sections, v_other_secs, v_other_acts, COALESCE(v_other_src, '{}'::jsonb),
    now()
  )
  ON CONFLICT (student_id, activity_date) DO UPDATE SET
    learning_seconds    = EXCLUDED.learning_seconds,
    speaking_seconds    = EXCLUDED.speaking_seconds,
    page_seconds        = EXCLUDED.page_seconds,
    session_count       = EXCLUDED.session_count,
    page_views          = EXCLUDED.page_views,
    words_mastered      = EXCLUDED.words_mastered,
    words_practiced     = EXCLUDED.words_practiced,
    words_reviewed      = EXCLUDED.words_reviewed,
    words_saved         = EXCLUDED.words_saved,
    sections_completed  = EXCLUDED.sections_completed,
    avg_score           = EXCLUDED.avg_score,
    quizzes_taken       = EXCLUDED.quizzes_taken,
    quiz_questions      = EXCLUDED.quiz_questions,
    quiz_correct        = EXCLUDED.quiz_correct,
    speaking_recordings = EXCLUDED.speaking_recordings,
    submissions_count   = EXCLUDED.submissions_count,
    xp_earned           = EXCLUDED.xp_earned,
    skill_breakdown     = EXCLUDED.skill_breakdown,
    curriculum_seconds  = EXCLUDED.curriculum_seconds,
    curriculum_sections = EXCLUDED.curriculum_sections,
    other_seconds       = EXCLUDED.other_seconds,
    other_activities    = EXCLUDED.other_activities,
    source_breakdown    = EXCLUDED.source_breakdown,
    computed_at         = now();
END;
$fn$;
