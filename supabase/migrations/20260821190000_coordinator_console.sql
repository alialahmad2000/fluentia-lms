-- ═══════════════════════════════════════════════════════════════════════════
-- COORDINATOR CONSOLE — V1
-- A workspace on top of the EXISTING student_interventions queue. No new
-- intervention engine, no parallel table, no duplicate messaging path.
--
-- Context (verified against production 2026-08-21):
--   expired (never actioned) 2,740 · pending 100 · acted 2
--   The signals engine (edge fn detect-student-signals, cron jobid 22, every
--   4h) has generated daily since 2026-04-19 and expires anything still
--   pending after 7 days (expire_stale_interventions(7)). Nobody ever had a
--   screen to work it.
--
-- Purely ADDITIVE: no existing policy, table, column or function is dropped or
-- narrowed. The one existing function touched is can_dm(), which gains a
-- coordinator branch it did not have — see § 6.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Attribution on the existing table ─────────────────────────────────
-- blocker_type is the coordinator's most valuable output: it is how the
-- academy finally learns WHY students stall. The RPC refuses to mark a row
-- acted without it.

ALTER TABLE public.student_interventions
  ADD COLUMN IF NOT EXISTS acted_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS action_channel text
    CHECK (action_channel IN ('in_app_message','escalated','no_action_needed')),
  ADD COLUMN IF NOT EXISTS blocker_type text
    CHECK (blocker_type IN ('motivation','platform_issue','schedule','personal','unknown'));

COMMENT ON COLUMN public.student_interventions.acted_by IS
  'Who worked this row (coordinator or admin). NULL for the 2,740 that expired unworked.';
COMMENT ON COLUMN public.student_interventions.blocker_type IS
  'Why the student stalled, as judged by the person who reached out. Required to mark acted.';

CREATE INDEX IF NOT EXISTS idx_interventions_pending
  ON public.student_interventions(status, severity, created_at DESC)
  WHERE status = 'pending';

-- ─── 2. Daily accountability log ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coordinator_daily_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id        uuid NOT NULL REFERENCES public.profiles(id),
  log_date              date NOT NULL,
  queue_size_at_start   integer,
  interventions_actioned integer DEFAULT 0,
  escalations           integer DEFAULT 0,
  summary               text NOT NULL,
  submitted_at          timestamptz DEFAULT now(),
  UNIQUE (coordinator_id, log_date)
);

-- ─── 3. Escalations (his only route when the canned message doesn't fit) ──

CREATE TABLE IF NOT EXISTS public.coordinator_escalations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id  uuid NOT NULL REFERENCES public.profiles(id),
  student_id      uuid NOT NULL REFERENCES public.students(id),
  intervention_id uuid REFERENCES public.student_interventions(id),
  reason          text NOT NULL,
  body_en         text NOT NULL,
  status          text DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  handled_by      uuid REFERENCES public.profiles(id),
  handled_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coord_escalations_open
  ON public.coordinator_escalations(status, created_at DESC) WHERE status = 'open';

-- ─── 4. Coordinator timezone ──────────────────────────────────────────────
-- C2 asked for "profiles or a config constant". profiles had no timezone
-- column (A1), so add one: the console shows Riyadh + his own zone side by
-- side, and the browser's resolved zone is only a fallback — a coordinator on
-- a VPN or travelling would otherwise read the wrong "your time".

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
COMMENT ON COLUMN public.profiles.timezone IS
  'IANA zone (e.g. Africa/Nairobi). Staff-facing consoles render timestamps in Riyadh + this zone.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RPCs — every one SECURITY DEFINER + SET search_path + explicit guard
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.coordinator_guard()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coordinator','admin')
  ) THEN RAISE EXCEPTION 'not authorised'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.coordinator_guard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_guard() TO authenticated;

-- ── last-seen: the honest one ────────────────────────────────────────────
-- A4 proved students.last_active_at is stale for 14 of 14 active students
-- (عبدالله عارف reads 2026-06-23 while xp_transactions has him at 2026-08-20 —
-- a 58-day error). Chasing a student who is actually studying is the fastest
-- way to lose one, so "last seen" is the newest of four LIVE signals and
-- students.last_active_at is kept only as a floor. submissions,
-- student_streaks, student_notes and churn_predictions are all 0 rows —
-- never built on.

CREATE OR REPLACE FUNCTION public.coordinator_last_seen(p_student_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    (SELECT s.last_active_at FROM students s WHERE s.id = p_student_id),
    (SELECT max(x.created_at)  FROM xp_transactions x            WHERE x.student_id = p_student_id),
    (SELECT max(u.occurred_at) FROM unified_activity_log u       WHERE u.student_id = p_student_id),
    (SELECT max(c.updated_at)  FROM student_curriculum_progress c WHERE c.student_id = p_student_id)
  );
$$;

REVOKE ALL ON FUNCTION public.coordinator_last_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_last_seen(uuid) TO authenticated;

-- ── the queue ────────────────────────────────────────────────────────────
-- NO financial columns. Ever. (No custom_price, payment_day, payment_link.)

DROP FUNCTION IF EXISTS public.get_coordinator_queue();
CREATE FUNCTION public.get_coordinator_queue()
RETURNS TABLE (
  intervention_id      uuid,
  student_id           uuid,
  full_name            text,
  display_name         text,
  avatar_url           text,
  gender               text,
  group_name           text,
  group_code           text,
  academic_level       integer,
  package              text,
  severity             text,
  reason_code          text,
  reason_ar            text,
  short_message        text,
  suggested_message_ar text,
  suggested_action_ar  text,
  signal_data          jsonb,
  created_at           timestamptz,
  days_pending         integer,
  days_to_expiry       integer,
  silence_days         integer,
  last_seen_at         timestamptz,
  open_help_requests   integer,
  open_bug_reports     integer,
  stacked_pending      integer,
  signal_stale         boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM coordinator_guard();

  RETURN QUERY
  WITH seen AS (
    SELECT DISTINCT i.student_id AS sid, coordinator_last_seen(i.student_id) AS ls
    FROM student_interventions i WHERE i.status = 'pending'
  )
  SELECT
    i.id,
    i.student_id,
    p.full_name,
    p.display_name,
    p.avatar_url,
    s.gender,
    g.name,
    g.code,
    s.academic_level,
    s.package::text,
    i.severity,
    i.reason_code,
    i.reason_ar,
    i.short_message,
    i.suggested_message_ar,
    i.suggested_action_ar,
    i.signal_data,
    i.created_at,
    GREATEST(0, floor(extract(epoch FROM now() - i.created_at) / 86400)::int),
    GREATEST(0, 7 - floor(extract(epoch FROM now() - i.created_at) / 86400)::int),
    CASE WHEN seen.ls IS NULL THEN NULL
         ELSE GREATEST(0, floor(extract(epoch FROM now() - seen.ls) / 86400)::int) END,
    seen.ls,
    (SELECT count(*)::int FROM help_requests h
      WHERE h.student_id = i.student_id AND coalesce(h.status,'open') <> 'resolved'),
    (SELECT count(*)::int FROM bug_reports b
      WHERE b.reporter_id = i.student_id AND b.status <> 'resolved'),
    (SELECT count(*)::int FROM student_interventions o
      WHERE o.student_id = i.student_id AND o.status = 'pending' AND o.id <> i.id),
    -- the student came back AFTER this alert was raised: the signal is history,
    -- not news. Without this the console would send "we miss you" to someone
    -- who studied this morning.
    (seen.ls IS NOT NULL AND seen.ls > i.created_at)
  FROM student_interventions i
  JOIN profiles p ON p.id = i.student_id
  JOIN students s ON s.id = i.student_id
  LEFT JOIN groups g ON g.id = i.group_id
  LEFT JOIN seen ON seen.sid = i.student_id
  WHERE i.status = 'pending'
    AND s.deleted_at IS NULL
  ORDER BY (i.severity = 'urgent') DESC, i.created_at ASC;
END $$;

REVOKE ALL ON FUNCTION public.get_coordinator_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_queue() TO authenticated;

-- ── one student, everything he needs and nothing he doesn't ──────────────

DROP FUNCTION IF EXISTS public.get_coordinator_student(uuid);
CREATE FUNCTION public.get_coordinator_student(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  PERFORM coordinator_guard();

  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id,
      'full_name', p.full_name,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'gender', s.gender,
      'academic_level', s.academic_level,
      'package', s.package::text,
      'track', s.track::text,
      'status', s.status::text,
      'enrollment_date', s.enrollment_date,
      'goals', s.goals,
      'group_name', g.name,
      'group_code', g.code,
      'trainer_name', tp.full_name,
      'last_seen_at', coordinator_last_seen(s.id),
      'silence_days', CASE WHEN coordinator_last_seen(s.id) IS NULL THEN NULL
        ELSE GREATEST(0, floor(extract(epoch FROM now() - coordinator_last_seen(s.id)) / 86400)::int) END,
      'xp_total', s.xp_total,
      'current_streak', s.current_streak
    ),
    'activity_30d', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'date', d.activity_date,
               'learning_seconds', d.learning_seconds,
               'xp_earned', d.xp_earned,
               'sections_completed', d.sections_completed
             ) ORDER BY d.activity_date)
      FROM student_daily_activity d
      WHERE d.student_id = s.id AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 29
    ), '[]'::jsonb),
    'interventions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', i.id, 'created_at', i.created_at, 'severity', i.severity,
               'reason_code', i.reason_code, 'reason_ar', i.reason_ar,
               'status', i.status, 'acted_at', i.acted_at, 'acted_notes', i.acted_notes,
               'action_channel', i.action_channel, 'blocker_type', i.blocker_type,
               'acted_by_name', ap.full_name,
               'suggested_message_ar', i.suggested_message_ar,
               'suggested_action_ar', i.suggested_action_ar,
               'signal_data', i.signal_data
             ) ORDER BY i.created_at DESC)
      FROM student_interventions i
      LEFT JOIN profiles ap ON ap.id = i.acted_by
      WHERE i.student_id = s.id
    ), '[]'::jsonb),
    'help_requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', h.id, 'created_at', h.created_at, 'status', h.status,
               'section_type', h.section_type,
               'unit_title', coalesce(u.theme_en, u.theme_ar), 'unit_number', u.unit_number
             ) ORDER BY h.created_at DESC)
      FROM help_requests h LEFT JOIN curriculum_units u ON u.id = h.unit_id
      WHERE h.student_id = s.id AND coalesce(h.status,'open') <> 'resolved'
    ), '[]'::jsonb),
    'bug_reports', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', b.id, 'created_at', b.created_at, 'status', b.status,
               'description', b.description, 'page_url', b.page_url,
               'reporter_status', b.reporter_status
             ) ORDER BY b.created_at DESC)
      FROM bug_reports b
      WHERE b.reporter_id = s.id AND b.status <> 'resolved'
    ), '[]'::jsonb),
    'escalations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'created_at', e.created_at, 'reason', e.reason,
               'body_en', e.body_en, 'status', e.status
             ) ORDER BY e.created_at DESC)
      FROM coordinator_escalations e WHERE e.student_id = s.id
    ), '[]'::jsonb)
  )
  INTO v
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN profiles tp ON tp.id = coalesce(s.assigned_trainer_id, g.trainer_id)
  WHERE s.id = p_student_id AND s.deleted_at IS NULL;

  IF v IS NULL THEN RAISE EXCEPTION 'student not found'; END IF;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.get_coordinator_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_student(uuid) TO authenticated;

-- ── action ───────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.coordinator_action_intervention(uuid, text, text, text);
CREATE FUNCTION public.coordinator_action_intervention(
  p_intervention_id uuid, p_channel text, p_blocker text, p_notes text DEFAULT NULL
) RETURNS student_interventions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r student_interventions;
BEGIN
  PERFORM coordinator_guard();

  IF p_blocker IS NULL OR btrim(p_blocker) = '' THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  IF p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'invalid blocker_type: %', p_blocker;
  END IF;
  IF p_channel NOT IN ('in_app_message','escalated','no_action_needed') THEN
    RAISE EXCEPTION 'invalid action_channel: %', p_channel;
  END IF;
  -- "no action needed" is the one that quietly hides a skipped student, so it
  -- is the one that must carry a written reason.
  IF p_channel = 'no_action_needed' AND coalesce(btrim(p_notes),'') = '' THEN
    RAISE EXCEPTION 'a note is required when marking no action needed';
  END IF;

  UPDATE student_interventions
     SET status = 'acted',
         acted_at = now(),
         acted_by = auth.uid(),
         action_channel = p_channel,
         blocker_type = p_blocker,
         acted_notes = p_notes
   WHERE id = p_intervention_id
     AND status IN ('pending','snoozed')
  RETURNING * INTO r;

  IF r.id IS NULL THEN RAISE EXCEPTION 'intervention not found or already closed'; END IF;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.coordinator_action_intervention(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_action_intervention(uuid, text, text, text) TO authenticated;

-- ── action every stacked row for one student ─────────────────────────────
-- Forced by A2: the 100 pending rows belong to only 9 students — the engine
-- re-raises the same signal every night, so الهنوف alone carries 14 identical
-- pending rows. Closing them one at a time means the queue can never be
-- emptied, which is the entire point of the screen. Same guard, same rules,
-- same columns as the single-row RPC.

DROP FUNCTION IF EXISTS public.coordinator_action_student(uuid, text, text, text);
CREATE FUNCTION public.coordinator_action_student(
  p_student_id uuid, p_channel text, p_blocker text, p_notes text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  PERFORM coordinator_guard();

  IF p_blocker IS NULL OR btrim(p_blocker) = '' THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  IF p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'invalid blocker_type: %', p_blocker;
  END IF;
  IF p_channel NOT IN ('in_app_message','escalated','no_action_needed') THEN
    RAISE EXCEPTION 'invalid action_channel: %', p_channel;
  END IF;
  IF p_channel = 'no_action_needed' AND coalesce(btrim(p_notes),'') = '' THEN
    RAISE EXCEPTION 'a note is required when marking no action needed';
  END IF;

  UPDATE student_interventions
     SET status = 'acted',
         acted_at = now(),
         acted_by = auth.uid(),
         action_channel = p_channel,
         blocker_type = p_blocker,
         acted_notes = p_notes
   WHERE student_id = p_student_id
     AND status IN ('pending','snoozed');

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.coordinator_action_student(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_action_student(uuid, text, text, text) TO authenticated;

-- ── snooze ───────────────────────────────────────────────────────────────
-- Sets status='snoozed' as well as snoozed_until: the existing
-- unsnooze_expired_interventions() job only revives rows whose status is
-- 'snoozed', and expire_stale_interventions() only expires 'pending' ones. A
-- row snoozed by timestamp alone would stay in the queue AND still expire.

DROP FUNCTION IF EXISTS public.coordinator_snooze_intervention(uuid, integer);
CREATE FUNCTION public.coordinator_snooze_intervention(p_intervention_id uuid, p_days integer)
RETURNS student_interventions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r student_interventions;
BEGIN
  PERFORM coordinator_guard();

  IF p_days IS NULL OR p_days < 1 OR p_days > 3 THEN
    RAISE EXCEPTION 'snooze must be between 1 and 3 days';
  END IF;

  UPDATE student_interventions
     SET status = 'snoozed', snoozed_until = now() + (p_days || ' days')::interval
   WHERE id = p_intervention_id AND status = 'pending'
  RETURNING * INTO r;

  IF r.id IS NULL THEN RAISE EXCEPTION 'intervention not found or not pending'; END IF;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.coordinator_snooze_intervention(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_snooze_intervention(uuid, integer) TO authenticated;

-- ── send the pre-written Arabic message ──────────────────────────────────
-- Reuses the app's ONE messaging path (A5): dm_get_or_create_thread() then an
-- insert into group_messages, which fires trg_dm_notify → send-push-notification
-- → the in-app notifications row AND the web push. direct_messages is the dead
-- legacy table and is not touched.
--
-- The body is read server-side from suggested_message_ar and is never accepted
-- as a parameter: the coordinator cannot read Arabic, so he must not be able to
-- alter a single character of what goes out under the academy's name — in the
-- UI or by calling the RPC directly.

DROP FUNCTION IF EXISTS public.coordinator_send_intervention_message(uuid);
CREATE FUNCTION public.coordinator_send_intervention_message(p_intervention_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student uuid; v_msg text; v_thread uuid; v_msg_id uuid;
BEGIN
  PERFORM coordinator_guard();

  SELECT i.student_id, i.suggested_message_ar INTO v_student, v_msg
  FROM student_interventions i
  WHERE i.id = p_intervention_id AND i.status IN ('pending','snoozed');

  IF v_student IS NULL THEN RAISE EXCEPTION 'intervention not found or already closed'; END IF;
  IF coalesce(btrim(v_msg),'') = '' THEN RAISE EXCEPTION 'no_message_drafted'; END IF;

  v_thread := dm_get_or_create_thread(v_student);

  INSERT INTO group_messages (dm_thread_id, sender_id, body)
  VALUES (v_thread, auth.uid(), v_msg)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('thread_id', v_thread, 'message_id', v_msg_id, 'student_id', v_student);
END $$;

REVOKE ALL ON FUNCTION public.coordinator_send_intervention_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coordinator_send_intervention_message(uuid) TO authenticated;

-- ── today's numbers for the daily log ────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_coordinator_today();
CREATE FUNCTION public.get_coordinator_today()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_today date;
BEGIN
  PERFORM coordinator_guard();
  v_today := (now() AT TIME ZONE 'Asia/Riyadh')::date;

  SELECT jsonb_build_object(
    'log_date', v_today,
    'queue_size', (SELECT count(*) FROM student_interventions i JOIN students s ON s.id=i.student_id
                    WHERE i.status='pending' AND s.deleted_at IS NULL),
    'students_in_queue', (SELECT count(DISTINCT i.student_id) FROM student_interventions i
                            JOIN students s ON s.id=i.student_id
                           WHERE i.status='pending' AND s.deleted_at IS NULL),
    'actioned_today', (SELECT count(*) FROM student_interventions
                        WHERE acted_by = auth.uid()
                          AND (acted_at AT TIME ZONE 'Asia/Riyadh')::date = v_today),
    'escalations_today', (SELECT count(*) FROM coordinator_escalations
                           WHERE coordinator_id = auth.uid()
                             AND (created_at AT TIME ZONE 'Asia/Riyadh')::date = v_today),
    'expiring_within_2_days', (SELECT count(*) FROM student_interventions i JOIN students s ON s.id=i.student_id
                                WHERE i.status='pending' AND s.deleted_at IS NULL
                                  AND i.created_at < now() - interval '5 days'),
    'today_log', (SELECT to_jsonb(l) FROM coordinator_daily_log l
                   WHERE l.coordinator_id = auth.uid() AND l.log_date = v_today),
    'recent_logs', coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.log_date DESC)
                              FROM coordinator_daily_log l
                             WHERE l.coordinator_id = auth.uid()
                               AND l.log_date >= v_today - 13), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.get_coordinator_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_today() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. can_dm() — the coordinator branch it never had
-- ═══════════════════════════════════════════════════════════════════════════
-- A5 found the blocker: can_dm() knows student / trainer / admin and nothing
-- else, so a coordinator fell through to the "same academic level as me" test,
-- got NULL, and dm_get_or_create_thread raised not_allowed. The console could
-- never have sent a single message.
--
-- This is ADDITIVE in effect — the coordinator branch returns true only where
-- the function currently returns false, and no other role's answer changes.
-- can_dm() is not referenced by any RLS policy (the DM policies use
-- is_dm_member()), so no policy behaviour changes either.

CREATE OR REPLACE FUNCTION public.can_dm(p_other uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE my_role text; other_role text; my_level int; other_level int;
BEGIN
  IF p_other = auth.uid() OR p_other IS NULL THEN RETURN false; END IF;
  SELECT pr.role::text INTO my_role FROM profiles pr WHERE pr.id = auth.uid();
  SELECT pr.role::text INTO other_role FROM profiles pr WHERE pr.id = p_other;
  IF my_role IS NULL OR other_role IS NULL THEN RETURN false; END IF;
  IF my_role = 'admin' THEN RETURN true; END IF;                       -- owner/admin can reach anyone
  IF COALESCE((SELECT is_test_account FROM profiles WHERE id = p_other), false) THEN RETURN false; END IF;
  IF other_role = 'admin' THEN                                          -- only the contactable admin(s)
    RETURN COALESCE((SELECT dm_contactable FROM profiles WHERE id = p_other), false);
  END IF;
  -- Coordinator: reaches students (the intervention queue) and trainers (hand-offs),
  -- never other staff roles. Added 2026-08-21 for the coordinator console.
  IF my_role = 'coordinator' THEN
    RETURN other_role IN ('student','trainer');
  END IF;
  IF my_role = 'trainer' THEN
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = p_other AND (s.assigned_trainer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = auth.uid())));
  END IF;
  IF other_role = 'trainer' THEN                                        -- student → only their OWN teacher
    RETURN EXISTS (SELECT 1 FROM students s WHERE s.id = auth.uid()
      AND (s.assigned_trainer_id = p_other OR EXISTS (SELECT 1 FROM groups g WHERE g.id = s.group_id AND g.trainer_id = p_other)));
  END IF;
  SELECT academic_level INTO my_level FROM students WHERE id = auth.uid();   -- student → same level peer
  SELECT academic_level INTO other_level FROM students WHERE id = p_other;
  RETURN other_level IS NOT NULL AND other_level = my_level;
END $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS
-- ═══════════════════════════════════════════════════════════════════════════
-- payments, trainer_payroll and affiliate_payouts get NOTHING — deliberately.

ALTER TABLE public.coordinator_daily_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_escalations ENABLE ROW LEVEL SECURITY;

-- coordinator_daily_log: his own rows only; the owner reads everything.
DROP POLICY IF EXISTS coord_log_own_select ON public.coordinator_daily_log;
CREATE POLICY coord_log_own_select ON public.coordinator_daily_log
  FOR SELECT TO authenticated USING (coordinator_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS coord_log_own_insert ON public.coordinator_daily_log;
CREATE POLICY coord_log_own_insert ON public.coordinator_daily_log
  FOR INSERT TO authenticated WITH CHECK (coordinator_id = auth.uid() AND is_coordinator_staff());

DROP POLICY IF EXISTS coord_log_own_update ON public.coordinator_daily_log;
CREATE POLICY coord_log_own_update ON public.coordinator_daily_log
  FOR UPDATE TO authenticated
  USING (coordinator_id = auth.uid()) WITH CHECK (coordinator_id = auth.uid());

-- coordinator_escalations: he files and reads his own; the owner reads + closes all.
DROP POLICY IF EXISTS coord_esc_own_insert ON public.coordinator_escalations;
CREATE POLICY coord_esc_own_insert ON public.coordinator_escalations
  FOR INSERT TO authenticated WITH CHECK (coordinator_id = auth.uid() AND is_coordinator_staff());

DROP POLICY IF EXISTS coord_esc_select ON public.coordinator_escalations;
CREATE POLICY coord_esc_select ON public.coordinator_escalations
  FOR SELECT TO authenticated USING (coordinator_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS coord_esc_admin_update ON public.coordinator_escalations;
CREATE POLICY coord_esc_admin_update ON public.coordinator_escalations
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Read access for the console's context. SELECT only — every write path in the
-- console goes through the SECURITY DEFINER RPCs above, so a direct
-- UPDATE student_interventions from his session still fails.
DROP POLICY IF EXISTS interv_coordinator_read ON public.student_interventions;
CREATE POLICY interv_coordinator_read ON public.student_interventions
  FOR SELECT TO authenticated USING (is_coordinator_staff());

DROP POLICY IF EXISTS students_coordinator_read ON public.students;
CREATE POLICY students_coordinator_read ON public.students
  FOR SELECT TO authenticated USING (is_coordinator_staff() AND deleted_at IS NULL);

DROP POLICY IF EXISTS groups_coordinator_read ON public.groups;
CREATE POLICY groups_coordinator_read ON public.groups
  FOR SELECT TO authenticated USING (is_coordinator_staff());

DROP POLICY IF EXISTS sda_coordinator_read ON public.student_daily_activity;
CREATE POLICY sda_coordinator_read ON public.student_daily_activity
  FOR SELECT TO authenticated USING (is_coordinator_staff());

DROP POLICY IF EXISTS help_requests_coordinator_read ON public.help_requests;
CREATE POLICY help_requests_coordinator_read ON public.help_requests
  FOR SELECT TO authenticated USING (is_coordinator_staff());

DROP POLICY IF EXISTS bug_reports_coordinator_read ON public.bug_reports;
CREATE POLICY bug_reports_coordinator_read ON public.bug_reports
  FOR SELECT TO authenticated USING (is_coordinator_staff());

-- profiles: NO new policy. The existing profiles_select_all is USING (true) for
-- everyone, so a "coordinator may read student profiles" policy would be a
-- strict subset of what already applies — dead SQL that only makes the policy
-- list harder to audit. Recorded here so the omission reads as a decision.
