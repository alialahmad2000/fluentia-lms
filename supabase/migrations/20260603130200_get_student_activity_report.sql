-- Fluentia LMS — get_student_activity_report(student, start, end)
-- Read-only aggregator that powers the per-student day/week/month report. Returns one jsonb
-- with: student meta, totals, daily series, per-skill weak/strong breakdown, current skill
-- levels, and detail lists (words mastered, lessons completed, activity timeline).
-- Used by both the staff edge function and the public parent-share path (DRY).
-- Riyadh local-day bucketing throughout.

CREATE OR REPLACE FUNCTION public.get_student_activity_report(p_student uuid, p_start date, p_end date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_start timestamptz := timezone('Asia/Riyadh', p_start::timestamp);
  v_end   timestamptz := timezone('Asia/Riyadh', (p_end + 1)::timestamp);
  v_student jsonb; v_totals jsonb; v_daily jsonb;
  v_skills_period jsonb; v_skills_current jsonb;
  v_words jsonb; v_lessons jsonb; v_timeline jsonb;
  v_strong text; v_weak text; v_overall_avg numeric;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'name', COALESCE(p.display_name, p.full_name),
    'avatar', p.avatar_url,
    'level', s.academic_level,
    'package', s.package,
    'status', s.status,
    'group', g.name,
    'trainer', tp.full_name,
    'current_streak', COALESCE(s.current_streak, 0),
    'longest_streak', COALESCE(s.longest_streak, 0),
    'xp_total', COALESCE(s.xp_total, 0)
  ) INTO v_student
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN profiles tp ON tp.id = g.trainer_id
  WHERE s.id = p_student;

  IF v_student IS NULL THEN
    RETURN jsonb_build_object('error', 'student_not_found');
  END IF;

  -- Totals (from rollup)
  SELECT jsonb_build_object(
    'learning_minutes',    round(COALESCE(SUM(learning_seconds), 0) / 60.0),
    'speaking_minutes',    round(COALESCE(SUM(speaking_seconds), 0) / 60.0),
    'page_minutes',        round(COALESCE(SUM(page_seconds), 0) / 60.0),
    'active_days',         COUNT(*),
    'session_count',       COALESCE(SUM(session_count), 0),
    'page_views',          COALESCE(SUM(page_views), 0),
    'words_mastered',      COALESCE(SUM(words_mastered), 0),
    'words_practiced',     COALESCE(SUM(words_practiced), 0),
    'words_reviewed',      COALESCE(SUM(words_reviewed), 0),
    'words_saved',         COALESCE(SUM(words_saved), 0),
    'sections_completed',  COALESCE(SUM(sections_completed), 0),
    'quizzes_taken',       COALESCE(SUM(quizzes_taken), 0),
    'quiz_questions',      COALESCE(SUM(quiz_questions), 0),
    'quiz_correct',        COALESCE(SUM(quiz_correct), 0),
    'speaking_recordings', COALESCE(SUM(speaking_recordings), 0),
    'submissions',         COALESCE(SUM(submissions_count), 0),
    'xp_earned',           COALESCE(SUM(xp_earned), 0)
  ) INTO v_totals
  FROM student_daily_activity
  WHERE student_id = p_student AND activity_date BETWEEN p_start AND p_end;

  -- Daily series
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', activity_date,
    'learning_minutes', round(learning_seconds / 60.0),
    'words_mastered', words_mastered,
    'words_practiced', words_practiced,
    'words_reviewed', words_reviewed,
    'sections_completed', sections_completed,
    'xp', xp_earned,
    'session_count', session_count,
    'avg_score', avg_score
  ) ORDER BY activity_date), '[]'::jsonb) INTO v_daily
  FROM student_daily_activity
  WHERE student_id = p_student AND activity_date BETWEEN p_start AND p_end;

  -- Period per-skill breakdown (weak/strong) from curriculum section scores
  WITH sk AS (
    SELECT section_type,
           COUNT(*) c,
           ROUND(AVG(score), 1) avgs,
           COALESCE(SUM(time_spent_seconds), 0) ts
    FROM student_curriculum_progress
    WHERE student_id = p_student AND status = 'completed'
      AND completed_at >= v_start AND completed_at < v_end
      AND COALESCE(is_phantom, false) = false AND COALESCE(is_latest, true) = true
    GROUP BY section_type
  )
  SELECT
    COALESCE(jsonb_object_agg(section_type, jsonb_build_object('completed', c, 'avg_score', avgs, 'minutes', round(ts / 60.0))), '{}'::jsonb),
    (SELECT section_type FROM sk WHERE avgs IS NOT NULL ORDER BY avgs DESC, c DESC LIMIT 1),
    (SELECT section_type FROM sk WHERE avgs IS NOT NULL ORDER BY avgs ASC, c DESC LIMIT 1)
  INTO v_skills_period, v_strong, v_weak
  FROM sk;

  SELECT ROUND(AVG(score), 1) INTO v_overall_avg
  FROM student_curriculum_progress
  WHERE student_id = p_student AND status = 'completed'
    AND completed_at >= v_start AND completed_at < v_end
    AND COALESCE(is_phantom, false) = false AND COALESCE(is_latest, true) = true;

  v_totals := v_totals || jsonb_build_object('avg_score', v_overall_avg);

  -- Current skill levels (for radar)
  SELECT to_jsonb(x) - 'student_id' - 'updated_at' INTO v_skills_current
  FROM (SELECT * FROM student_skill_state WHERE student_id = p_student) x;

  -- Words mastered in the period
  SELECT COALESCE(jsonb_agg(jsonb_build_object('word', cv.word, 'definition_ar', cv.definition_ar, 'at', mm.m_at) ORDER BY mm.m_at DESC), '[]'::jsonb)
  INTO v_words
  FROM (
    SELECT vocabulary_id,
           COALESCE(GREATEST(meaning_exercise_passed_at, sentence_exercise_passed_at, listening_exercise_passed_at), updated_at) m_at
    FROM vocabulary_word_mastery
    WHERE student_id = p_student AND mastery_level = 'mastered'
      AND COALESCE(GREATEST(meaning_exercise_passed_at, sentence_exercise_passed_at, listening_exercise_passed_at), updated_at) >= v_start
      AND COALESCE(GREATEST(meaning_exercise_passed_at, sentence_exercise_passed_at, listening_exercise_passed_at), updated_at) <  v_end
    ORDER BY m_at DESC
    LIMIT 120
  ) mm
  JOIN curriculum_vocabulary cv ON cv.id = mm.vocabulary_id;

  -- Lessons / sections completed in the period
  SELECT COALESCE(jsonb_agg(jsonb_build_object('section_type', L.section_type, 'unit', L.unit_theme, 'score', L.score, 'at', L.completed_at) ORDER BY L.completed_at DESC), '[]'::jsonb)
  INTO v_lessons
  FROM (
    SELECT scp.section_type, scp.score, scp.completed_at, COALESCE(u.theme_ar, u.theme_en) unit_theme
    FROM student_curriculum_progress scp
    LEFT JOIN curriculum_units u ON u.id = scp.unit_id
    WHERE scp.student_id = p_student AND scp.status = 'completed'
      AND scp.completed_at >= v_start AND scp.completed_at < v_end
      AND COALESCE(scp.is_phantom, false) = false AND COALESCE(scp.is_latest, true) = true
    ORDER BY scp.completed_at DESC
    LIMIT 120
  ) L;

  -- Activity timeline (mixed sources, most recent first)
  SELECT COALESCE(jsonb_agg(z.t), '[]'::jsonb) INTO v_timeline
  FROM (
    SELECT t FROM (
      SELECT jsonb_build_object('kind', 'section', 'label', scp.section_type,
               'detail', COALESCE(u.theme_ar, u.theme_en), 'score', scp.score, 'at', scp.completed_at) t
      FROM student_curriculum_progress scp
      LEFT JOIN curriculum_units u ON u.id = scp.unit_id
      WHERE scp.student_id = p_student AND scp.status = 'completed'
        AND scp.completed_at >= v_start AND scp.completed_at < v_end
        AND COALESCE(scp.is_phantom, false) = false AND COALESCE(scp.is_latest, true) = true
      UNION ALL
      SELECT jsonb_build_object('kind', 'speaking', 'label', 'speaking', 'detail', NULL, 'score', NULL, 'at', created_at)
      FROM speaking_recordings
      WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end
      UNION ALL
      SELECT jsonb_build_object('kind', 'saved_word', 'label', 'saved_word', 'detail', word, 'score', NULL, 'at', created_at)
      FROM student_saved_words
      WHERE student_id = p_student AND created_at >= v_start AND created_at < v_end
    ) q
    ORDER BY (q.t->>'at') DESC
    LIMIT 80
  ) z;

  RETURN jsonb_build_object(
    'student', v_student,
    'range', jsonb_build_object('start', p_start, 'end', p_end, 'days', (p_end - p_start + 1)),
    'totals', v_totals,
    'daily', v_daily,
    'skills', jsonb_build_object('current', v_skills_current, 'period', v_skills_period, 'strongest', v_strong, 'weakest', v_weak),
    'words_mastered_list', v_words,
    'lessons', v_lessons,
    'timeline', v_timeline
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.get_student_activity_report(uuid, date, date) TO authenticated, service_role;
