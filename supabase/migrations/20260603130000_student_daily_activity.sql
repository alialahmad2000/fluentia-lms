-- Fluentia LMS — Per-Student Daily Activity Rollup
-- Feature: detailed per-student day/week/month activity & progress monitoring for admins/teachers.
--
-- WHY: raw signals already exist (student_curriculum_progress.time_spent_seconds, xp_transactions,
-- vocabulary_word_mastery, srs_review_logs, page_visits, ...), but per-student aggregates were never
-- persisted and page-level detail is purged after 90 days. This snapshots one row per student per
-- Riyadh calendar day so monthly/historical reports stay accurate forever and load fast.
--
-- TIME MODEL (important): user_sessions.duration_seconds/minutes are NOT reliable (always 0 / NULL,
-- or inflated by browsers left open). The honest engaged-time signal is curriculum time_spent_seconds
-- (well populated) plus page_visits dwell time (real but historical) and speaking audio durations.
-- All day bucketing uses Asia/Riyadh local calendar days (matches build_progress_report_data()).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Clean slate (table is new; only throwaway test rows so far)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.refresh_daily_activity(date);
DROP FUNCTION IF EXISTS public.compute_student_daily_activity(uuid, date);
DROP TABLE IF EXISTS public.student_daily_activity CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rollup table — one row per (student, Riyadh day) that had ANY activity
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.student_daily_activity (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_date      date NOT NULL,                       -- Riyadh local calendar date

  -- time (engaged, honest)
  learning_seconds    int NOT NULL DEFAULT 0,             -- SUM(curriculum time_spent_seconds) worked that day
  speaking_seconds    int NOT NULL DEFAULT 0,             -- SUM(speaking_recordings.audio_duration_seconds)
  page_seconds        int NOT NULL DEFAULT 0,             -- SUM(page_visits.duration_seconds) (real dwell, historical)
  session_count       int NOT NULL DEFAULT 0,             -- number of logins/visits (reliable)
  page_views          int NOT NULL DEFAULT 0,

  -- vocabulary
  words_mastered      int NOT NULL DEFAULT 0,             -- words that reached 'mastered' this day
  words_practiced     int NOT NULL DEFAULT 0,             -- distinct words practiced (vocabulary_word_mastery)
  words_reviewed      int NOT NULL DEFAULT 0,             -- distinct words SRS-reviewed
  words_saved         int NOT NULL DEFAULT 0,             -- words added to personal bank

  -- curriculum
  sections_completed  int NOT NULL DEFAULT 0,             -- curriculum sections marked completed this day
  avg_score           numeric,                            -- avg score of sections completed this day (0-100), NULL if none

  -- quizzes
  quizzes_taken       int NOT NULL DEFAULT 0,
  quiz_questions      int NOT NULL DEFAULT 0,
  quiz_correct        int NOT NULL DEFAULT 0,

  -- production / output
  speaking_recordings int NOT NULL DEFAULT 0,
  submissions_count   int NOT NULL DEFAULT 0,

  -- gamification
  xp_earned           int NOT NULL DEFAULT 0,             -- SUM(xp_transactions.amount)

  -- per-skill breakdown for the day, from student_curriculum_progress section scores:
  -- { reading: {completed,avg_score,time_seconds}, grammar: {...}, ... }
  skill_breakdown     jsonb NOT NULL DEFAULT '{}'::jsonb,

  computed_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT student_daily_activity_unique UNIQUE (student_id, activity_date)
);

CREATE INDEX idx_sda_student_date ON public.student_daily_activity (student_id, activity_date DESC);
CREATE INDEX idx_sda_date         ON public.student_daily_activity (activity_date DESC);

COMMENT ON TABLE public.student_daily_activity IS
  'Per-student per-day activity rollup (Riyadh local days). Source of truth = compute_student_daily_activity(). Only days with activity are stored; absent day = zero activity. learning_seconds (engaged curriculum time) is the headline time metric — session duration columns upstream are unreliable.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS — staff read all, students read own, service role full.
--    Writes happen only via SECURITY DEFINER functions below.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.student_daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY sda_service_all ON public.student_daily_activity
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY sda_staff_read ON public.student_daily_activity
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = ANY (ARRAY['admin'::user_role, 'trainer'::user_role]))
  );

CREATE POLICY sda_student_read ON public.student_daily_activity
  FOR SELECT USING (student_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. compute_student_daily_activity(student, date)
--    Single source of truth. Computes one Riyadh-day's metrics from raw tables
--    and UPSERTs the rollup row. Deletes the row (idempotent) if the day is empty.
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
BEGIN
  -- engaged learning time: curriculum sections worked on that day (latest, non-phantom attempts)
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

  -- vocabulary: words that crossed into 'mastered' this day (max of the 3 exercise pass times)
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

  -- curriculum sections completed this day
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

  v_has := (v_learn > 0 OR v_pagesecs > 0 OR v_pv > 0 OR v_sessions > 0
            OR v_words_mastered > 0 OR v_words_practiced > 0 OR v_words_reviewed > 0 OR v_words_saved > 0
            OR v_sections > 0 OR v_quizzes > 0 OR v_speaking > 0 OR v_subs > 0 OR v_xp > 0);

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
    skill_breakdown, computed_at
  ) VALUES (
    p_student, p_date,
    v_learn, v_speak_secs, v_pagesecs, v_sessions, v_pv,
    v_words_mastered, v_words_practiced, v_words_reviewed, v_words_saved,
    v_sections, v_avg_score,
    v_quizzes, v_q_total, v_q_correct,
    v_speaking, v_subs, v_xp,
    COALESCE(v_skill, '{}'::jsonb), now()
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
    computed_at         = now();
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. refresh_daily_activity(date) — driver: recompute that day for every
--    non-deleted, non-test student. Returns number of students processed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_daily_activity(p_date date)
RETURNS int
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT s.id FROM students s
    JOIN profiles p ON p.id = s.id
    WHERE s.deleted_at IS NULL
      AND COALESCE(p.is_test_account, false) = false
  LOOP
    PERFORM compute_student_daily_activity(r.id, p_date);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Nightly cron — recompute "yesterday" (Riyadh) at 00:15 Riyadh = 21:15 UTC.
--    Today is refreshed live when a report is opened. cron.schedule upserts by name.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'rollup-daily-activity',
  '15 21 * * *',
  $cron$ SELECT public.refresh_daily_activity( ((now() AT TIME ZONE 'Asia/Riyadh')::date - 1) ); $cron$
);
