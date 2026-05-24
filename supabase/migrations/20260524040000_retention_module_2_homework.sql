-- ─────────────────────────────────────────────────────────────────────────────
-- Retention System — Block 3 (Module 2 — Smart Homework)
-- ─────────────────────────────────────────────────────────────────────────────
-- Pre-generated exercise bank + per-student personalized selection from rule-
-- based mistake tags. ZERO runtime Claude/OpenAI calls. All content generated
-- once at build time by the generator script.
--
-- Sacred constraints: existing writing_submissions / speaking_submissions /
-- submissions tables NOT touched (read-only source for mistake tagging).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. retention_exercises (exercise bank) ─────────────────────────────────
-- This table replaces the stub created in Block 2's migration if a stub
-- existed, OR creates from scratch. The Block 2 stub was actually a
-- retention_homework_attempts stub — retention_exercises is fresh.
CREATE TABLE IF NOT EXISTS public.retention_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_type text NOT NULL CHECK (exercise_type IN (
    'fill_blank',
    'reorder',
    'mcq',
    'sentence_correction',
    'vocab_match',
    'mini_write'
  )),
  level text NOT NULL CHECK (level IN ('L1','L2','L3','L4','L5')),
  skill text NOT NULL CHECK (skill IN ('grammar','vocab','reading','writing')),
  topic_tags text[] NOT NULL DEFAULT '{}',
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  prompt_en text NOT NULL,
  prompt_ar text,
  correct_answer jsonb NOT NULL,
  distractors jsonb,
  explanation_ar text NOT NULL,
  estimated_seconds smallint DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retention_exercises_lookup_idx
  ON public.retention_exercises (level, skill, difficulty);
CREATE INDEX IF NOT EXISTS retention_exercises_tags_idx
  ON public.retention_exercises USING gin (topic_tags);

-- ─── 2. retention_homework_sets ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_homework_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  triggered_by text NOT NULL CHECK (triggered_by IN ('after_class','daily','on_demand')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  exercise_ids uuid[] NOT NULL,
  completed_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL,
  completed_at timestamptz,
  xp_awarded integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS retention_homework_sets_student_idx
  ON public.retention_homework_sets (student_id, created_at DESC);

-- ─── 3. retention_homework_attempts (expand Block 2 stub) ───────────────────
-- Block 2 created a minimal stub; we add the full columns now.
ALTER TABLE public.retention_homework_attempts
  ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.retention_exercises(id) ON DELETE SET NULL;
ALTER TABLE public.retention_homework_attempts
  ADD COLUMN IF NOT EXISTS student_answer jsonb;
ALTER TABLE public.retention_homework_attempts
  ADD COLUMN IF NOT EXISTS is_correct boolean;
ALTER TABLE public.retention_homework_attempts
  ADD COLUMN IF NOT EXISTS time_seconds integer;
-- Make homework_set_id a proper FK now that the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'retention_homework_attempts'
      AND constraint_name = 'retention_homework_attempts_homework_set_id_fkey'
  ) THEN
    ALTER TABLE public.retention_homework_attempts
      ADD CONSTRAINT retention_homework_attempts_homework_set_id_fkey
      FOREIGN KEY (homework_set_id) REFERENCES public.retention_homework_sets(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS retention_homework_attempts_set_idx
  ON public.retention_homework_attempts (homework_set_id);

-- ─── 4. retention_student_mistake_tags ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_student_mistake_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  mistake_tag text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, source_table, source_id, mistake_tag)
);

CREATE INDEX IF NOT EXISTS retention_smt_student_recent_idx
  ON public.retention_student_mistake_tags (student_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS retention_smt_tag_idx
  ON public.retention_student_mistake_tags (mistake_tag, student_id);

-- ─── 5. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.retention_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_homework_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_student_mistake_tags ENABLE ROW LEVEL SECURITY;

-- Exercises: any authenticated user can SELECT (content is shared bank)
DROP POLICY IF EXISTS retention_exercises_read ON public.retention_exercises;
CREATE POLICY retention_exercises_read
  ON public.retention_exercises FOR SELECT TO authenticated USING (true);

-- Exercises: admin INSERT/UPDATE (for editing)
DROP POLICY IF EXISTS retention_exercises_admin_write ON public.retention_exercises;
CREATE POLICY retention_exercises_admin_write
  ON public.retention_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Homework sets: students see their own; trainers/admin see all
DROP POLICY IF EXISTS retention_hs_student_select ON public.retention_homework_sets;
CREATE POLICY retention_hs_student_select
  ON public.retention_homework_sets FOR SELECT TO authenticated
  USING (student_id = auth.uid());
DROP POLICY IF EXISTS retention_hs_staff_select ON public.retention_homework_sets;
CREATE POLICY retention_hs_staff_select
  ON public.retention_homework_sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));
-- Homework sets: students INSERT/UPDATE their own (for completion tracking)
DROP POLICY IF EXISTS retention_hs_student_insert ON public.retention_homework_sets;
CREATE POLICY retention_hs_student_insert
  ON public.retention_homework_sets FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS retention_hs_student_update ON public.retention_homework_sets;
CREATE POLICY retention_hs_student_update
  ON public.retention_homework_sets FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Homework attempts: students INSERT for self (Block 2 stub left this without
-- the insert policy)
DROP POLICY IF EXISTS retention_hwa_student_insert ON public.retention_homework_attempts;
CREATE POLICY retention_hwa_student_insert
  ON public.retention_homework_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Mistake tags: students see their own; trainers/admin see all
DROP POLICY IF EXISTS retention_smt_student_select ON public.retention_student_mistake_tags;
CREATE POLICY retention_smt_student_select
  ON public.retention_student_mistake_tags FOR SELECT TO authenticated
  USING (student_id = auth.uid());
DROP POLICY IF EXISTS retention_smt_staff_select ON public.retention_student_mistake_tags;
CREATE POLICY retention_smt_staff_select
  ON public.retention_student_mistake_tags FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));
-- No INSERT/UPDATE policies — only the SECURITY DEFINER tagger writes.

-- ─── 6. Mistake-tagging RPC ─────────────────────────────────────────────────
-- Called by retention_daily_run() at 02:00 Riyadh (Block 2 cron). Idempotent
-- via UNIQUE constraint on (student_id, source_table, source_id, mistake_tag).
--
-- This is a rule-based first pass: it scans writing_submissions and
-- speaking_submissions response_text fields for common Arabic-speaker error
-- patterns and tags them. The rule set is intentionally conservative —
-- false negatives (missing a real mistake) are OK; false positives (tagging
-- something that wasn't actually wrong) waste a homework slot.
CREATE OR REPLACE FUNCTION public.retention_tag_recent_mistakes(p_lookback_hours integer DEFAULT 24)
RETURNS TABLE (rows_scanned integer, tags_inserted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_lookback_hours || ' hours')::interval;
  v_scanned int := 0;
  v_inserted int := 0;
  v_sub RECORD;
  v_text text;
  v_source_table text;
BEGIN
  -- Scan a unified source view: submissions, writing_history, weekly_tasks
  -- (all the canonical places students write/transcribe English text).
  FOR v_sub IN
    -- submissions.content_text (writing assignments)
    SELECT id, student_id, content_text AS text, 'submissions'::text AS source_table
    FROM public.submissions
    WHERE created_at >= v_cutoff AND content_text IS NOT NULL AND length(content_text) > 10
    UNION ALL
    -- submissions.content_voice_transcript (speaking assignments)
    SELECT id, student_id, content_voice_transcript AS text, 'submissions_voice'::text AS source_table
    FROM public.submissions
    WHERE created_at >= v_cutoff AND content_voice_transcript IS NOT NULL AND length(content_voice_transcript) > 10
    UNION ALL
    -- writing_history.original_text (writing iterations)
    SELECT id, student_id, original_text AS text, 'writing_history'::text AS source_table
    FROM public.writing_history
    WHERE created_at >= v_cutoff AND original_text IS NOT NULL AND length(original_text) > 10
    UNION ALL
    -- weekly_tasks.response_text (weekly task responses)
    SELECT id, student_id, response_text AS text, 'weekly_tasks'::text AS source_table
    FROM public.weekly_tasks
    WHERE created_at >= v_cutoff AND response_text IS NOT NULL AND length(response_text) > 10
    UNION ALL
    -- weekly_tasks.response_voice_transcript (speaking weekly tasks)
    SELECT id, student_id, response_voice_transcript AS text, 'weekly_tasks_voice'::text AS source_table
    FROM public.weekly_tasks
    WHERE created_at >= v_cutoff AND response_voice_transcript IS NOT NULL AND length(response_voice_transcript) > 10
  LOOP
    v_scanned := v_scanned + 1;
    v_text := lower(v_sub.text);
    v_source_table := v_sub.source_table;

    -- Article errors (missing 'a/an' before consonants)
    IF v_text ~ '\m(want|need|have|see|like|got|buy|read)\s+(book|car|apple|cat|dog|man|woman|child|hour|university)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'missing_article')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;
    -- Wrong a/an choice
    IF v_text ~ '\ma\s+(hour|honest|honor|umbrella|apple|orange|elephant|island)\M' OR
       v_text ~ '\man\s+(book|car|house|computer|university|year)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'wrong_article_a_an')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;

    -- Subject-verb agreement (third person singular missing -s)
    IF v_text ~ '\m(he|she|it)\s+(go|do|have|like|want|need|play|work|live|study|eat|see|come|make|take|get|know|think|say|tell|give)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'subject_verb_agreement')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;

    -- Present perfect vs past simple confusion
    IF v_text ~ '\m(have|has)\s+(went|came|did|saw|ate|took|made|gave|wrote)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'present_perfect_confusion')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;

    -- Preposition for/since
    IF v_text ~ '\msince\s+\d+\s+(years?|months?|weeks?|days?|hours?)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'preposition_for_since')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;

    -- Common spelling: double-letter omissions / common misspellings
    IF v_text ~ '\m(begining|comming|getting|comitee|accomodate|adress|recieve|seperate|definately|untill)\M' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'spelling_double_letter')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;

    -- Capitalization (lowercase 'i' as a word — rough heuristic; conservative)
    IF v_text ~ '\si\s' AND v_sub.text ~ '\si\s' THEN
      INSERT INTO public.retention_student_mistake_tags (student_id, source_table, source_id, mistake_tag)
      VALUES (v_sub.student_id, v_source_table, v_sub.id, 'capitalization')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_scanned, v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_tag_recent_mistakes(integer) TO authenticated;

-- Wire the tagger into the orchestrator (additive — extends retention_daily_run)
CREATE OR REPLACE FUNCTION public.retention_daily_run()
RETURNS TABLE (
  students_synced integer,
  challenges_assigned integer,
  challenges_progressed integer,
  challenges_completed integer,
  rewards_granted integer,
  ran_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sync_count int := 0;
  v_assign_count int := 0;
  v_progress_count int := 0;
  v_complete_count int := 0;
  v_reward_count int := 0;
  v_today date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_week_start date := v_today - ((EXTRACT(DOW FROM v_today)::int + 1) % 7);
  v_is_sunday boolean := EXTRACT(DOW FROM v_today)::int = 0;
  v_student RECORD;
  v_streak RECORD;
  v_assignment RECORD;
  v_challenge RECORD;
  v_metric_value int;
BEGIN
  -- (0) Tag recent mistakes (Module 2 source) — fail soft if function missing
  BEGIN
    PERFORM public.retention_tag_recent_mistakes(24);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_errors (error_type, service, error_message)
    VALUES ('retention_daily_run.tag_mistakes', 'retention_daily_run', SQLERRM);
  END;

  -- (1) Sync stored streak from computed for every active student
  FOR v_student IN
    SELECT id FROM public.students
    WHERE status = 'active' AND deleted_at IS NULL
  LOOP
    BEGIN
      SELECT * INTO v_streak FROM public.get_student_streak(v_student.id);
      IF v_streak IS NOT NULL THEN
        UPDATE public.students
        SET current_streak = COALESCE(v_streak.current_streak, 0),
            longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(v_streak.longest_streak, 0)),
            last_active_at = COALESCE(v_streak.last_active_date::timestamptz, last_active_at)
        WHERE id = v_student.id;
        v_sync_count := v_sync_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.system_errors (error_type, service, error_message, error_context)
      VALUES ('retention_daily_run.sync', 'retention_daily_run', SQLERRM, jsonb_build_object('student_id', v_student.id));
    END;
  END LOOP;

  -- (2) Break/freeze pass
  BEGIN
    PERFORM public.check_streaks();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_errors (error_type, service, error_message)
    VALUES ('retention_daily_run.check_streaks', 'retention_daily_run', SQLERRM);
  END;

  -- (3) On Sundays, assign this-week's challenge
  IF v_is_sunday THEN
    FOR v_student IN
      SELECT s.id
      FROM public.students s
      WHERE s.status = 'active' AND s.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.retention_weekly_challenge_assignments wca
          WHERE wca.student_id = s.id AND wca.week_start = v_week_start
        )
    LOOP
      SELECT * INTO v_challenge
      FROM public.retention_weekly_challenges
      WHERE active = true
      ORDER BY random()
      LIMIT 1;
      IF v_challenge IS NOT NULL THEN
        INSERT INTO public.retention_weekly_challenge_assignments (
          student_id, challenge_id, week_start, target_value, reward_xp
        )
        VALUES (v_student.id, v_challenge.id, v_week_start, v_challenge.target_value, v_challenge.reward_xp)
        ON CONFLICT (student_id, week_start) DO NOTHING;
        v_assign_count := v_assign_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- (4) Update progress on in-progress assignments
  FOR v_assignment IN
    SELECT wca.id, wca.student_id, wca.target_value, wca.reward_xp,
           c.target_metric, c.title_ar, c.id AS challenge_id
    FROM public.retention_weekly_challenge_assignments wca
    JOIN public.retention_weekly_challenges c ON c.id = wca.challenge_id
    WHERE wca.week_start = v_week_start
      AND wca.completed = false
  LOOP
    BEGIN
      v_metric_value := 0;
      CASE v_assignment.target_metric
        WHEN 'xp_earned' THEN
          SELECT COALESCE(sum(amount), 0)::int INTO v_metric_value
          FROM public.xp_transactions
          WHERE student_id = v_assignment.student_id
            AND created_at >= v_week_start::timestamptz AND amount > 0;
        WHEN 'dialogues_completed' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.retention_dialogue_attempts
          WHERE student_id = v_assignment.student_id
            AND completed_at IS NOT NULL AND completed_at >= v_week_start::timestamptz;
        WHEN 'homework_completed' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.retention_homework_sets
          WHERE student_id = v_assignment.student_id
            AND completed_at IS NOT NULL AND completed_at >= v_week_start::timestamptz;
        WHEN 'words_saved' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.student_saved_words
          WHERE student_id = v_assignment.student_id
            AND created_at >= v_week_start::timestamptz;
        WHEN 'briefs_opened' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.retention_lesson_brief_deliveries
          WHERE student_id = v_assignment.student_id
            AND opened_at IS NOT NULL AND opened_at >= v_week_start::timestamptz;
        WHEN 'no_streak_break' THEN
          SELECT CASE WHEN s.current_streak >= GREATEST(1, (v_today - v_week_start)::int + 1) THEN 1 ELSE 0 END
          INTO v_metric_value
          FROM public.students s WHERE s.id = v_assignment.student_id;
        WHEN 'days_active' THEN
          SELECT count(DISTINCT (occurred_at AT TIME ZONE 'Asia/Riyadh')::date)::int
          INTO v_metric_value
          FROM public.unified_activity_log
          WHERE student_id = v_assignment.student_id
            AND occurred_at >= v_week_start::timestamptz;
        ELSE
          v_metric_value := 0;
      END CASE;

      IF v_metric_value >= v_assignment.target_value AND NOT EXISTS (
        SELECT 1 FROM public.retention_weekly_challenge_assignments
        WHERE id = v_assignment.id AND completed = true
      ) THEN
        UPDATE public.retention_weekly_challenge_assignments
        SET current_progress = v_metric_value,
            completed = true,
            completed_at = now(),
            reward_granted = true
        WHERE id = v_assignment.id;
        v_complete_count := v_complete_count + 1;

        INSERT INTO public.xp_transactions (student_id, amount, reason, description, related_id)
        VALUES (
          v_assignment.student_id,
          v_assignment.reward_xp,
          'daily_challenge'::xp_reason,
          'تحدي أسبوعي مكتمل — ' || v_assignment.title_ar,
          v_assignment.challenge_id
        );
        v_reward_count := v_reward_count + 1;

        INSERT INTO public.notifications (user_id, type, title, body, data, priority)
        VALUES (
          v_assignment.student_id,
          'achievement'::notification_type,
          'تحدي الأسبوع: مكتمل! 🎯',
          'حصلتِ على ' || v_assignment.reward_xp || ' XP — يا بطلة!',
          jsonb_build_object('kind', 'retention_weekly_challenge_complete', 'assignment_id', v_assignment.id),
          'high'
        );
      ELSE
        UPDATE public.retention_weekly_challenge_assignments
        SET current_progress = v_metric_value
        WHERE id = v_assignment.id
          AND current_progress IS DISTINCT FROM v_metric_value;
        v_progress_count := v_progress_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.system_errors (error_type, service, error_message, error_context)
      VALUES (
        'retention_daily_run.progress',
        'retention_daily_run',
        SQLERRM,
        jsonb_build_object('assignment_id', v_assignment.id, 'student_id', v_assignment.student_id)
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_sync_count, v_assign_count, v_progress_count, v_complete_count, v_reward_count, now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.retention_daily_run() TO authenticated;
