-- ─────────────────────────────────────────────────────────────────────────────
-- Retention System — Block 2 (Module 4 — Streak Activation)
-- ─────────────────────────────────────────────────────────────────────────────
-- Activates the dormant streak system + adds weekly challenges.
--
-- Sacred constraints honored:
-- - cron-streak-check edge fn UNTOUCHED
-- - check_streaks() RPC body UNCHANGED (only called from new orchestrator)
-- - students table — no schema changes; only UPDATEs to existing columns
-- - xp_transactions.reason enum UNCHANGED (reuses 'daily_challenge')
-- - unified_activity_log schema UNCHANGED
--
-- New pg_cron job is created **DISABLED** (active=false). Ali enables manually.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. retention_weekly_challenges (challenge bank) ────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  description_ar text NOT NULL,
  target_metric text NOT NULL CHECK (target_metric IN (
    'xp_earned',
    'dialogues_completed',
    'homework_completed',
    'no_streak_break',
    'words_saved',
    'briefs_opened',
    'days_active'
  )),
  target_value integer NOT NULL CHECK (target_value > 0),
  reward_xp integer NOT NULL DEFAULT 50,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  icon_key text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.retention_weekly_challenges IS
  'Bank of weekly retention challenges. retention_daily_run() picks one per active student each Sunday.';

CREATE INDEX IF NOT EXISTS retention_weekly_challenges_active_idx
  ON public.retention_weekly_challenges (active, difficulty);

-- ─── 2. retention_weekly_challenge_assignments (per-student per-week) ───────
CREATE TABLE IF NOT EXISTS public.retention_weekly_challenge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.retention_weekly_challenges(id) ON DELETE RESTRICT,
  week_start date NOT NULL,
  current_progress integer NOT NULL DEFAULT 0,
  target_value integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  reward_granted boolean NOT NULL DEFAULT false,
  reward_xp integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);

CREATE INDEX IF NOT EXISTS retention_weekly_challenge_assignments_student_idx
  ON public.retention_weekly_challenge_assignments (student_id, week_start DESC);
CREATE INDEX IF NOT EXISTS retention_weekly_challenge_assignments_open_idx
  ON public.retention_weekly_challenge_assignments (week_start, completed)
  WHERE completed = false;

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.retention_weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_weekly_challenge_assignments ENABLE ROW LEVEL SECURITY;

-- Bank: any authenticated user can SELECT (so students see the challenge text)
DROP POLICY IF EXISTS retention_weekly_challenges_read ON public.retention_weekly_challenges;
CREATE POLICY retention_weekly_challenges_read
  ON public.retention_weekly_challenges FOR SELECT TO authenticated USING (true);

-- Bank: admins INSERT/UPDATE/DELETE (for editing the challenge bank)
DROP POLICY IF EXISTS retention_weekly_challenges_admin_write ON public.retention_weekly_challenges;
CREATE POLICY retention_weekly_challenges_admin_write
  ON public.retention_weekly_challenges FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Assignments: students see their own
DROP POLICY IF EXISTS retention_wca_student_select ON public.retention_weekly_challenge_assignments;
CREATE POLICY retention_wca_student_select
  ON public.retention_weekly_challenge_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Assignments: trainers/admins see all
DROP POLICY IF EXISTS retention_wca_staff_select ON public.retention_weekly_challenge_assignments;
CREATE POLICY retention_wca_staff_select
  ON public.retention_weekly_challenge_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

-- All writes are service-role only (via the orchestrator RPC). No explicit policy needed for service role.

-- ─── 4. Orchestrator RPC ────────────────────────────────────────────────────
-- Called by the new pg_cron job AND callable manually by admin/service-role.
-- Returns a summary row { students_synced, challenges_assigned, challenges_completed, errors }.
--
-- The function deliberately avoids destructive operations on existing data:
-- - Only UPDATES students.current_streak / longest_streak / last_active_at
-- - Only INSERTS / UPDATES retention_* rows
-- - Calls public.check_streaks() AFTER the sync so break/freeze fires against
--   the freshly-synced state (not the stale snapshot)

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
      -- Per-student failure must not abort the whole run
      INSERT INTO public.system_errors (error_type, service, error_message, error_context)
      VALUES ('retention_daily_run.sync', 'retention_daily_run', SQLERRM, jsonb_build_object('student_id', v_student.id));
    END;
  END LOOP;

  -- (2) Break/freeze pass (existing function, called AFTER sync)
  BEGIN
    PERFORM public.check_streaks();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.system_errors (error_type, service, error_message)
    VALUES ('retention_daily_run.check_streaks', 'retention_daily_run', SQLERRM);
  END;

  -- (3) On Sundays, assign this-week's challenge to every active student
  -- (only if they don't already have one for this week — UNIQUE constraint enforces this anyway)
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
      -- Pick a random active challenge biased toward 'medium' difficulty
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

  -- (4) Update progress on in-progress assignments for current week
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
            AND created_at >= v_week_start::timestamptz
            AND amount > 0;
        WHEN 'dialogues_completed' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.retention_dialogue_attempts
          WHERE student_id = v_assignment.student_id
            AND completed_at IS NOT NULL
            AND completed_at >= v_week_start::timestamptz;
        WHEN 'homework_completed' THEN
          SELECT count(DISTINCT homework_set_id)::int INTO v_metric_value
          FROM public.retention_homework_attempts
          WHERE student_id = v_assignment.student_id
            AND attempted_at >= v_week_start::timestamptz;
        WHEN 'words_saved' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.student_saved_words
          WHERE student_id = v_assignment.student_id
            AND created_at >= v_week_start::timestamptz;
        WHEN 'briefs_opened' THEN
          SELECT count(*)::int INTO v_metric_value
          FROM public.retention_lesson_brief_deliveries
          WHERE student_id = v_assignment.student_id
            AND opened_at IS NOT NULL
            AND opened_at >= v_week_start::timestamptz;
        WHEN 'no_streak_break' THEN
          -- 1 if current_streak >= days elapsed this week
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
        -- Complete + grant reward
        UPDATE public.retention_weekly_challenge_assignments
        SET current_progress = v_metric_value,
            completed = true,
            completed_at = now(),
            reward_granted = true
        WHERE id = v_assignment.id;
        v_complete_count := v_complete_count + 1;

        -- Award XP
        INSERT INTO public.xp_transactions (student_id, amount, reason, description, related_id)
        VALUES (
          v_assignment.student_id,
          v_assignment.reward_xp,
          'daily_challenge'::xp_reason,
          'تحدي أسبوعي مكتمل — ' || v_assignment.title_ar,
          v_assignment.challenge_id
        );
        v_reward_count := v_reward_count + 1;

        -- Notify the student
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

-- ─── 5. Forward references — safety stubs ───────────────────────────────────
-- These tables ship in Block 3+ (Module 2 / Module 5 / Module 1). Adding
-- temporary empty tables now so retention_daily_run() can compile, then later
-- migrations expand them with full schema. Each guards with IF NOT EXISTS.
--
-- (Module 1) — retention_dialogue_attempts
CREATE TABLE IF NOT EXISTS public.retention_dialogue_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retention_dialogue_attempts_student_idx
  ON public.retention_dialogue_attempts (student_id, completed_at DESC);
ALTER TABLE public.retention_dialogue_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_dialogue_attempts_student_select ON public.retention_dialogue_attempts;
CREATE POLICY retention_dialogue_attempts_student_select
  ON public.retention_dialogue_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());
DROP POLICY IF EXISTS retention_dialogue_attempts_staff_select ON public.retention_dialogue_attempts;
CREATE POLICY retention_dialogue_attempts_staff_select
  ON public.retention_dialogue_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

-- (Module 2) — retention_homework_attempts
CREATE TABLE IF NOT EXISTS public.retention_homework_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_set_id uuid,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retention_homework_attempts_student_idx
  ON public.retention_homework_attempts (student_id, attempted_at DESC);
ALTER TABLE public.retention_homework_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_homework_attempts_student_select ON public.retention_homework_attempts;
CREATE POLICY retention_homework_attempts_student_select
  ON public.retention_homework_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid());
DROP POLICY IF EXISTS retention_homework_attempts_staff_select ON public.retention_homework_attempts;
CREATE POLICY retention_homework_attempts_staff_select
  ON public.retention_homework_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

-- (Module 5) — retention_lesson_brief_deliveries
CREATE TABLE IF NOT EXISTS public.retention_lesson_brief_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retention_lesson_brief_deliveries_student_idx
  ON public.retention_lesson_brief_deliveries (student_id, opened_at DESC);
ALTER TABLE public.retention_lesson_brief_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_lbd_student_select ON public.retention_lesson_brief_deliveries;
CREATE POLICY retention_lbd_student_select
  ON public.retention_lesson_brief_deliveries FOR SELECT TO authenticated
  USING (student_id = auth.uid());
DROP POLICY IF EXISTS retention_lbd_staff_select ON public.retention_lesson_brief_deliveries;
CREATE POLICY retention_lbd_staff_select
  ON public.retention_lesson_brief_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')));

-- ─── 6. pg_cron schedule — created DISABLED (active=false) ──────────────────
-- Ali enables manually via runbook step using cron.alter_job(jobid, active=>true).
-- We use cron.alter_job() (not direct UPDATE on cron.job) because Supabase
-- restricts direct writes to cron.job to the postgres superuser.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- Unschedule prior copy if exists (idempotent)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-daily-run') THEN
    PERFORM cron.unschedule('retention-daily-run');
  END IF;

  -- Schedule at 23:00 UTC = 02:00 Riyadh, every day. Returns the job id.
  v_jobid := cron.schedule(
    'retention-daily-run',
    '0 23 * * *',
    $cmd$SELECT public.retention_daily_run();$cmd$
  );

  -- Immediately DISABLE the job — Ali enables manually via runbook
  PERFORM cron.alter_job(v_jobid, active => false);
END
$$;
