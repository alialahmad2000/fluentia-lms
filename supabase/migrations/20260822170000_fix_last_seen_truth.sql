-- ════════════════════════════════════════════════════════════════════════════
-- «آخر ظهور» truth pass — the admin roster was wrong on 13/13 rows.
--
-- Three stacked bugs produced the wrong "last login" («آخر دخول»):
--   1. get_student_streak() returned the START of the current streak run as
--      last_active_date (it walks dates DESC and keeps the OLDEST consecutive
--      one), not the student's most recent active day.
--   2. retention_daily_run() wrote that value into students.last_active_at as
--      `date::timestamptz` — UTC midnight, so time-of-day was lost and the
--      value could sit ~3h AHEAD of a Riyadh-evening session; it also ran only
--      for status='active' students, once a day, and could LOWER the value.
--   3. The only evidence surface consulted was unified_activity_log, which
--      records `unit_tab_completed` and nothing else. A student mid-unit
--      (reading a passage, looking up words, playing audio) left no trace —
--      ظافر was studying at 11:51–13:27 Riyadh on 2026-08-22 while the roster
--      flagged him red at «منذ ٢١ يومًا».
--
-- Measured error before this migration (roster vs. evidence, 2026-08-22):
--   عبدالله 60d shown / 2d real · الهنوف 48d/18d · سارة 32d/11d · ظافر 21d/0d
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1a. "actually did the work" — credited activity only ───────────────────
-- Admin-awarded XP is excluded: someone else granting points is not the
-- student showing up.
CREATE OR REPLACE FUNCTION public.student_last_studied_at(p_student_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    (SELECT max(ul.occurred_at) FROM unified_activity_log ul WHERE ul.student_id = p_student_id),
    (SELECT max(x.created_at)  FROM xp_transactions x
       WHERE x.student_id = p_student_id
         AND (x.awarded_by IS NULL OR x.awarded_by = p_student_id)),
    (SELECT max(cp.completed_at) FROM student_curriculum_progress cp WHERE cp.student_id = p_student_id),
    (SELECT max(af.created_at) FROM activity_feed af WHERE af.student_id = p_student_id)
  );
$$;

-- ─── 1b. "was in the app" — presence, spanning EVERY surface ────────────────
CREATE OR REPLACE FUNCTION public.student_last_seen_at(p_student_id uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    (SELECT p.last_active_at FROM profiles p WHERE p.id = p_student_id),
    (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p_student_id),
    (SELECT max(GREATEST(ss.last_seen_at, ss.ended_at, ss.started_at))
       FROM user_sessions ss WHERE ss.user_id = p_student_id),
    (SELECT max(ae.created_at) FROM analytics_events ae WHERE ae.user_id = p_student_id),
    public.student_last_studied_at(p_student_id)
  );
$$;

-- internal helpers: staff surfaces + the cron sync only. Leaving them open to
-- `authenticated` would let any student probe a classmate's activity times.
REVOKE ALL ON FUNCTION public.student_last_seen_at(uuid)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_last_studied_at(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_last_seen_at(uuid)    TO service_role;
GRANT EXECUTE ON FUNCTION public.student_last_studied_at(uuid) TO service_role;

-- ─── 2. get_student_streak — last_active_date must be the LAST active day ───
-- Streak math is unchanged; only the returned date is corrected. Previously it
-- returned the oldest day of the consecutive run, which made an actively
-- studying student with a 4-day streak read as "4 days ago", and made
-- check_streaks() break the streaks of students who were still showing up.
CREATE OR REPLACE FUNCTION public.get_student_streak(p_student_id uuid)
RETURNS TABLE(current_streak integer, longest_streak integer, last_active_date date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_current int := 0;
  v_longest int := 0;
  v_prev    date;
  v_last    date;
  r         record;
BEGIN
  FOR r IN
    SELECT DISTINCT (occurred_at AT TIME ZONE 'Asia/Riyadh')::date AS d
    FROM public.unified_activity_log
    WHERE student_id = p_student_id
    ORDER BY d DESC
  LOOP
    IF v_prev IS NULL THEN
      v_last := r.d;              -- the newest day: the real "last active"
      v_current := 1;
      v_longest := 1;
      v_prev := r.d;
    ELSIF v_prev - r.d = 1 THEN
      v_current := v_current + 1;
      v_longest := GREATEST(v_longest, v_current);
      v_prev := r.d;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  IF v_last IS NULL OR v_last < (now() AT TIME ZONE 'Asia/Riyadh')::date - 1 THEN
    v_current := 0;
  END IF;

  -- Fall back to the wider evidence surface when the unit-completion log is
  -- silent (a student mid-unit still counts as active).
  v_last := GREATEST(
    v_last,
    (public.student_last_studied_at(p_student_id) AT TIME ZONE 'Asia/Riyadh')::date
  );

  RETURN QUERY SELECT v_current, v_longest, v_last;
END;
$function$;

-- ─── 3. students.last_active_at can never regress ───────────────────────────
CREATE OR REPLACE FUNCTION public.guard_student_last_active()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.last_active_at IS DISTINCT FROM OLD.last_active_at
     AND NEW.last_active_at IS NOT NULL THEN
    -- a deliberate reset to NULL is still allowed (reset-all-data)
    NEW.last_active_at := GREATEST(NEW.last_active_at, OLD.last_active_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_student_last_active ON public.students;
CREATE TRIGGER trg_guard_student_last_active
  BEFORE UPDATE OF last_active_at ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_last_active();

-- ─── 4. Keep students.last_active_at fresh for EVERY student ────────────────
-- Not just status='active' — a paused student's value used to freeze forever.
CREATE OR REPLACE FUNCTION public.sync_student_last_active()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_n int;
BEGIN
  WITH truth AS (
    SELECT s.id, public.student_last_seen_at(s.id) AS seen
    FROM public.students s WHERE s.deleted_at IS NULL
  )
  UPDATE public.students s
  SET last_active_at = t.seen
  FROM truth t
  WHERE s.id = t.id
    AND t.seen IS NOT NULL
    AND (s.last_active_at IS NULL OR t.seen > s.last_active_at);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_student_last_active() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_last_active() TO service_role;

-- ─── 5. The roster's own read — presence AND real work, side by side ────────
CREATE OR REPLACE FUNCTION public.admin_roster_activity()
RETURNS TABLE (
  student_id       uuid,
  last_seen_at     timestamptz,
  last_studied_at  timestamptz,
  active_days_30d  integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- positive gate: anon and a null uid both fail here
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','coach')
  ) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  RETURN QUERY
  SELECT s.id,
         public.student_last_seen_at(s.id),
         public.student_last_studied_at(s.id),
         (
           SELECT count(DISTINCT q.d)::int FROM (
             SELECT (ae.created_at AT TIME ZONE 'Asia/Riyadh')::date AS d
               FROM analytics_events ae
              WHERE ae.user_id = s.id AND ae.created_at > now() - interval '30 days'
             UNION
             SELECT (ul.occurred_at AT TIME ZONE 'Asia/Riyadh')::date
               FROM unified_activity_log ul
              WHERE ul.student_id = s.id AND ul.occurred_at > now() - interval '30 days'
             UNION
             SELECT (x.created_at AT TIME ZONE 'Asia/Riyadh')::date
               FROM xp_transactions x
              WHERE x.student_id = s.id AND x.created_at > now() - interval '30 days'
                AND (x.awarded_by IS NULL OR x.awarded_by = s.id)
           ) q
         )
  FROM students s
  WHERE s.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_roster_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_roster_activity() TO authenticated;

-- ─── 6. Supporting indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS analytics_events_user_created_idx ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_transactions_student_created_idx ON public.xp_transactions (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_student_created_idx ON public.activity_feed (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_sessions_user_started_idx ON public.user_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS scp_student_completed_idx ON public.student_curriculum_progress (student_id, completed_at DESC);

-- ─── 7. Backfill + a 10-minute refresh ──────────────────────────────────────
SELECT public.sync_student_last_active();

-- cron.schedule is idempotent by name (re-scheduling replaces the entry)
SELECT cron.schedule('sync-student-last-active', '*/10 * * * *',
                     'select public.sync_student_last_active();');
