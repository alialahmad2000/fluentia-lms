-- ═══════════════════════════════════════════════════════════════════════════
-- LEARNING COACH — the `lc_` namespace
--
-- This is the "extend, don't duplicate" build (Ali's decision A, 2026-08-22).
-- The coordinator console shipped yesterday already carried the plumbing this
-- role needs; rather than stand up a parallel `lc_*` copy of it, that work is
-- RENAMED into the lc_ namespace and three genuinely new things are added:
--
--   · lc_get_radar()        every active student with a risk band, not only
--                           the ones the signals engine happened to flag
--   · lc_message_templates  a pre-approved Arabic library — zero runtime AI
--   · lc_touchpoints        one row per action, with a required blocker_type
--
-- Both renamed tables were empty (0 rows — nobody had used the console yet),
-- so the rename loses nothing.
--
-- Phase A corrections to the brief, applied here:
--   B2 DROPPED — students.gender already exists (text, CHECK male/female) and
--     is populated for all 14 active students (10 f / 4 m). Adding
--     profiles.gender would have created a second, empty source of truth.
--   A5 — direct_messages is the dead legacy table; delivery goes through
--     dm_get_or_create_thread() + group_messages, whose trigger fans out to
--     both the in-app notification and web push.
--   A4 — activity_feed (6,121 rows) is the freshest signal of all and is now
--     part of the last-seen chain.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Rename yesterday's tables into the lc_ namespace ──────────────────

ALTER TABLE IF EXISTS public.coordinator_daily_log   RENAME TO lc_daily_log;
ALTER TABLE IF EXISTS public.coordinator_escalations RENAME TO lc_escalations;

ALTER TABLE public.lc_daily_log   RENAME COLUMN coordinator_id TO coach_id;
ALTER TABLE public.lc_escalations RENAME COLUMN coordinator_id TO coach_id;

-- The daily log now counts students reviewed rather than raw queue rows: the
-- signals engine re-raises the same alert nightly, so a row count is ~11x the
-- number of people and can never reach zero.
ALTER TABLE public.lc_daily_log RENAME COLUMN queue_size_at_start TO students_reviewed;
ALTER TABLE public.lc_daily_log RENAME COLUMN interventions_actioned TO messages_sent;

-- ─── 2. Who the coaches are ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lc_coaches (
  id         uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active  boolean NOT NULL DEFAULT true,
  timezone   text NOT NULL DEFAULT 'Africa/Nairobi',
  started_at date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.lc_coaches IS
  'Learning coaches. timezone drives the second clock in the console — the coach works a Riyadh academy from elsewhere.';

-- ─── 3. The Arabic library ────────────────────────────────────────────────
-- Written once, by hand, reviewed by Ali, stored as rows. No model is called
-- at runtime to produce outreach text (R8): a message the academy sends under
-- its own name should be something a human approved before it existed, not
-- something generated in the second before it was sent.

CREATE TABLE IF NOT EXISTS public.lc_message_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text UNIQUE NOT NULL,
  situation_en     text NOT NULL,
  guidance_en      text NOT NULL,
  body_ar_m        text NOT NULL,
  body_ar_f        text NOT NULL,
  body_ar_neutral  text NOT NULL,
  tone             text NOT NULL CHECK (tone IN ('warm','curious','encouraging','check_in','celebratory')),
  min_silence_days integer DEFAULT 0,
  max_silence_days integer,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.lc_message_templates.body_ar_neutral IS
  'Genuinely gender-free Arabic, not a copy of the masculine form: no 2nd-person present-tense verbs (تكتب/تكتبين differ in letters), nominal and first-person-plural constructions instead.';
COMMENT ON COLUMN public.lc_message_templates.guidance_en IS
  'The coach cannot read the Arabic. This is what stops him sending blind.';

-- ─── 4. The work log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lc_touchpoints (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id             uuid NOT NULL REFERENCES public.profiles(id),
  student_id           uuid NOT NULL REFERENCES public.students(id),
  action               text NOT NULL CHECK (action IN ('message_sent','observation','escalated','no_action_needed')),
  template_code        text REFERENCES public.lc_message_templates(code),
  rendered_body_ar     text,
  blocker_type         text NOT NULL CHECK (blocker_type IN ('motivation','platform_issue','schedule','personal','unknown')),
  note_en              text,
  silence_days_at_time integer,
  created_at           timestamptz DEFAULT now()
);

COMMENT ON COLUMN public.lc_touchpoints.blocker_type IS
  'Required on every row. Over a few hundred touchpoints this is the only dataset that answers WHY students stall — motivation or software.';
COMMENT ON COLUMN public.lc_touchpoints.rendered_body_ar IS
  'The exact Arabic that went out, frozen. Editing a template later must not rewrite history.';

CREATE INDEX IF NOT EXISTS idx_lc_touchpoints_student ON public.lc_touchpoints(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_touchpoints_coach_day ON public.lc_touchpoints(coach_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Functions — renamed from coordinator_* into lc_*, guard tightened
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.coordinator_guard()                                  RENAME TO lc_guard;
ALTER FUNCTION public.coordinator_last_seen(uuid)                          RENAME TO lc_last_seen;
ALTER FUNCTION public.get_coordinator_queue()                              RENAME TO lc_get_queue;
ALTER FUNCTION public.get_coordinator_student(uuid)                        RENAME TO lc_get_student;
ALTER FUNCTION public.get_coordinator_today()                              RENAME TO lc_get_today;
ALTER FUNCTION public.coordinator_action_intervention(uuid, text, text, text) RENAME TO lc_action_intervention;
ALTER FUNCTION public.coordinator_action_student(uuid, text, text, text)   RENAME TO lc_action_student;
ALTER FUNCTION public.coordinator_snooze_intervention(uuid, integer)       RENAME TO lc_snooze_intervention;
ALTER FUNCTION public.coordinator_send_intervention_message(uuid)          RENAME TO lc_send_intervention_message;

-- The guard now names the coach, and DROPS coordinator. Yesterday's console
-- was gated on coordinator+admin because `coach` did not exist; it does now,
-- and هاجر — the class-scheduling coordinator — has no business reading
-- student activity. Narrowing, not widening.
CREATE OR REPLACE FUNCTION public.lc_guard()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('coach','admin')
  ) THEN RAISE EXCEPTION 'not authorised'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.lc_guard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_guard() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_coach_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('coach','admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_coach_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coach_staff() TO authenticated;

-- ── last seen: the honest one ────────────────────────────────────────────
-- A4 measured every candidate against students.last_active_at across the 14
-- active students. activity_feed and xp_transactions were fresher for 14 of
-- 14; unified_activity_log and curriculum progress for 13 of 14. So
-- students.last_active_at is a floor, never the answer — it read 2026-06-23
-- for عبدالله عارف while activity_feed had him two months later.
-- submissions / student_streaks / student_notes / churn_predictions are all
-- 0 rows and are not touched.

CREATE OR REPLACE FUNCTION public.lc_last_seen(p_student_id uuid)
RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM lc_guard();

  RETURN GREATEST(
    (SELECT s.last_active_at FROM students s WHERE s.id = p_student_id),
    (SELECT max(a.created_at)  FROM activity_feed a               WHERE a.student_id = p_student_id),
    (SELECT max(x.created_at)  FROM xp_transactions x             WHERE x.student_id = p_student_id),
    (SELECT max(u.occurred_at) FROM unified_activity_log u        WHERE u.student_id = p_student_id),
    (SELECT max(c.updated_at)  FROM student_curriculum_progress c WHERE c.student_id = p_student_id)
  );
END $$;

REVOKE ALL ON FUNCTION public.lc_last_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_last_seen(uuid) TO authenticated;

-- ── the radar ────────────────────────────────────────────────────────────
-- Every active student, not only the flagged ones. The signals engine's queue
-- is still available (lc_get_queue) but it is an opinion, and a stale one: it
-- had 7 of 9 flagged students already back at work. The radar is computed live.
--
-- NO financial columns. Ever.

DROP FUNCTION IF EXISTS public.lc_get_radar();
CREATE FUNCTION public.lc_get_radar()
RETURNS TABLE (
  student_id            uuid,
  full_name             text,
  display_name          text,
  avatar_url            text,
  gender                text,
  group_name            text,
  group_code            text,
  academic_level        integer,
  package               text,
  enrollment_date       date,
  last_seen_at          timestamptz,
  silence_days          integer,
  active_days_last_14   integer,
  xp_last_14            integer,
  open_issues           integer,
  last_touchpoint_at    timestamptz,
  days_since_touchpoint integer,
  risk_band             text,
  pending_signals       integer,
  activity_14           jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM lc_guard();

  RETURN QUERY
  WITH base AS (
    SELECT s.id AS sid, lc_last_seen(s.id) AS ls
    FROM students s WHERE s.deleted_at IS NULL AND s.status = 'active'
  )
  SELECT
    s.id,
    p.full_name,
    p.display_name,
    p.avatar_url,
    s.gender,
    g.name,
    g.code,
    s.academic_level,
    s.package::text,
    s.enrollment_date,
    b.ls,
    CASE WHEN b.ls IS NULL THEN NULL
         ELSE GREATEST(0, floor(extract(epoch FROM now() - b.ls) / 86400)::int) END,
    (SELECT count(*)::int FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13
        AND d.learning_seconds > 0),
    coalesce((SELECT sum(d.xp_earned)::int FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13), 0),
    (SELECT count(*)::int FROM help_requests h
      WHERE h.student_id = s.id AND coalesce(h.status,'open') <> 'resolved')
    + (SELECT count(*)::int FROM bug_reports br
      WHERE br.reporter_id = s.id AND br.status <> 'resolved'),
    (SELECT max(t.created_at) FROM lc_touchpoints t WHERE t.student_id = s.id),
    (SELECT CASE WHEN max(t.created_at) IS NULL THEN NULL
                 ELSE floor(extract(epoch FROM now() - max(t.created_at)) / 86400)::int END
       FROM lc_touchpoints t WHERE t.student_id = s.id),
    CASE
      WHEN b.ls IS NULL THEN 'critical'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 14 THEN 'critical'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 6  THEN 'at_risk'
      WHEN floor(extract(epoch FROM now() - b.ls) / 86400)::int >= 3  THEN 'watch'
      ELSE 'ok'
    END,
    -- The engine's opinion, carried as context on the row rather than as a
    -- second list to work.
    (SELECT count(*)::int FROM student_interventions i
      WHERE i.student_id = s.id AND i.status = 'pending'),
    -- 14 days of activity for the strip, built in the ACADEMY's zone.
    coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d.activity_date, 'seconds', d.learning_seconds)
             ORDER BY d.activity_date)
      FROM student_daily_activity d
      WHERE d.student_id = s.id
        AND d.activity_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 13
    ), '[]'::jsonb)
  FROM students s
  JOIN profiles p ON p.id = s.id
  JOIN base b ON b.sid = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  ORDER BY b.ls ASC NULLS FIRST;
END $$;

REVOKE ALL ON FUNCTION public.lc_get_radar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_radar() TO authenticated;

-- ── render ───────────────────────────────────────────────────────────────
-- Read-only. Gender comes from students.gender (A3); a null falls to the
-- genuinely gender-free variant, never to the masculine one.

DROP FUNCTION IF EXISTS public.lc_render_message(uuid, text);
CREATE FUNCTION public.lc_render_message(p_student_id uuid, p_template_code text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gender text; v_name text; v_body text;
BEGIN
  PERFORM lc_guard();

  SELECT s.gender, coalesce(nullif(btrim(p.display_name),''), p.full_name)
    INTO v_gender, v_name
  FROM students s JOIN profiles p ON p.id = s.id
  WHERE s.id = p_student_id AND s.deleted_at IS NULL;

  IF v_name IS NULL THEN RAISE EXCEPTION 'student not found'; END IF;

  SELECT CASE v_gender
           WHEN 'male'   THEN t.body_ar_m
           WHEN 'female' THEN t.body_ar_f
           ELSE t.body_ar_neutral
         END
    INTO v_body
  FROM lc_message_templates t
  WHERE t.code = p_template_code AND t.is_active;

  IF v_body IS NULL THEN RAISE EXCEPTION 'template not found or inactive: %', p_template_code; END IF;

  -- The only placeholder. First name only: the full legal name in a warm
  -- message reads like a bank letter.
  RETURN replace(v_body, '{{name}}', split_part(btrim(v_name), ' ', 1));
END $$;

REVOKE ALL ON FUNCTION public.lc_render_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_render_message(uuid, text) TO authenticated;

-- ── send ─────────────────────────────────────────────────────────────────
-- Renders server-side and delivers down the app's ONE messaging path (A5):
-- dm_get_or_create_thread() then an insert into group_messages, whose
-- trg_dm_notify trigger calls send-push-notification — which writes the in-app
-- notifications row AND sends the web push in a single call.
--
-- The body is never a parameter. The coach reads no Arabic, so he must not be
-- able to alter a character of what goes out under the academy's name — not in
-- the UI, and not by calling this RPC directly.

DROP FUNCTION IF EXISTS public.lc_send_message(uuid, text, text, text);
CREATE FUNCTION public.lc_send_message(
  p_student_id uuid, p_template_code text, p_blocker text, p_note text DEFAULT NULL
) RETURNS lc_touchpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_body text; v_thread uuid; v_silence int; r lc_touchpoints;
BEGIN
  PERFORM lc_guard();

  IF p_blocker IS NULL OR btrim(p_blocker) = '' THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  IF p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'invalid blocker_type: %', p_blocker;
  END IF;

  v_body := lc_render_message(p_student_id, p_template_code);

  SELECT CASE WHEN lc_last_seen(p_student_id) IS NULL THEN NULL
              ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(p_student_id)) / 86400)::int)
         END INTO v_silence;

  v_thread := dm_get_or_create_thread(p_student_id);

  INSERT INTO group_messages (dm_thread_id, sender_id, body)
  VALUES (v_thread, auth.uid(), v_body);

  INSERT INTO lc_touchpoints (
    coach_id, student_id, action, template_code, rendered_body_ar,
    blocker_type, note_en, silence_days_at_time
  )
  VALUES (
    auth.uid(), p_student_id, 'message_sent', p_template_code, v_body,
    p_blocker, p_note, v_silence
  )
  RETURNING * INTO r;

  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.lc_send_message(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_send_message(uuid, text, text, text) TO authenticated;

-- ── log a touchpoint without messaging ───────────────────────────────────

DROP FUNCTION IF EXISTS public.lc_log_touchpoint(uuid, text, text, text);
CREATE FUNCTION public.lc_log_touchpoint(
  p_student_id uuid, p_action text, p_blocker text, p_note text DEFAULT NULL
) RETURNS lc_touchpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_silence int; r lc_touchpoints;
BEGIN
  PERFORM lc_guard();

  IF p_action NOT IN ('observation','escalated','no_action_needed') THEN
    RAISE EXCEPTION 'invalid action for a non-message touchpoint: %', p_action;
  END IF;
  IF p_blocker IS NULL OR p_blocker NOT IN ('motivation','platform_issue','schedule','personal','unknown') THEN
    RAISE EXCEPTION 'blocker_type is required';
  END IF;
  -- "No action needed" is the one that quietly hides a skipped student, so it
  -- is the one that must carry a written reason.
  IF p_action = 'no_action_needed' AND coalesce(btrim(p_note),'') = '' THEN
    RAISE EXCEPTION 'a note is required when marking no action needed';
  END IF;

  SELECT CASE WHEN lc_last_seen(p_student_id) IS NULL THEN NULL
              ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(p_student_id)) / 86400)::int)
         END INTO v_silence;

  INSERT INTO lc_touchpoints (coach_id, student_id, action, blocker_type, note_en, silence_days_at_time)
  VALUES (auth.uid(), p_student_id, p_action, p_blocker, p_note, v_silence)
  RETURNING * INTO r;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.lc_log_touchpoint(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_log_touchpoint(uuid, text, text, text) TO authenticated;

-- ── the student dossier ──────────────────────────────────────────────────
-- Rebuilt (not just renamed) so it carries lc_touchpoints instead of the
-- intervention history alone. No payments, custom_price, payment_link, or
-- trainer rates.

DROP FUNCTION IF EXISTS public.lc_get_student(uuid);
CREATE FUNCTION public.lc_get_student(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  PERFORM lc_guard();

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
      'days_enrolled', CASE WHEN s.enrollment_date IS NULL THEN NULL
                            ELSE (CURRENT_DATE - s.enrollment_date) END,
      'goals', s.goals,
      'group_name', g.name,
      'group_code', g.code,
      'trainer_name', tp.full_name,
      'last_seen_at', lc_last_seen(s.id),
      'silence_days', CASE WHEN lc_last_seen(s.id) IS NULL THEN NULL
        ELSE GREATEST(0, floor(extract(epoch FROM now() - lc_last_seen(s.id)) / 86400)::int) END,
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
    'touchpoints', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', t.id, 'created_at', t.created_at, 'action', t.action,
               'template_code', t.template_code, 'rendered_body_ar', t.rendered_body_ar,
               'blocker_type', t.blocker_type, 'note_en', t.note_en,
               'silence_days_at_time', t.silence_days_at_time,
               'coach_name', cp.full_name,
               'situation_en', tpl.situation_en
             ) ORDER BY t.created_at DESC)
      FROM lc_touchpoints t
      LEFT JOIN profiles cp ON cp.id = t.coach_id
      LEFT JOIN lc_message_templates tpl ON tpl.code = t.template_code
      WHERE t.student_id = s.id
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
      FROM lc_escalations e WHERE e.student_id = s.id
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

REVOKE ALL ON FUNCTION public.lc_get_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_student(uuid) TO authenticated;

-- ── today, for the daily log ─────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.lc_get_today();
CREATE FUNCTION public.lc_get_today()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_today date;
BEGIN
  PERFORM lc_guard();
  v_today := (now() AT TIME ZONE 'Asia/Riyadh')::date;

  SELECT jsonb_build_object(
    'log_date', v_today,
    'active_students', (SELECT count(*) FROM students WHERE deleted_at IS NULL AND status='active'),
    'students_touched_today', (SELECT count(DISTINCT student_id) FROM lc_touchpoints
                                WHERE coach_id = auth.uid()
                                  AND (created_at AT TIME ZONE 'Asia/Riyadh')::date = v_today),
    'messages_sent_today', (SELECT count(*) FROM lc_touchpoints
                             WHERE coach_id = auth.uid() AND action = 'message_sent'
                               AND (created_at AT TIME ZONE 'Asia/Riyadh')::date = v_today),
    'escalations_today', (SELECT count(*) FROM lc_escalations
                           WHERE coach_id = auth.uid()
                             AND (created_at AT TIME ZONE 'Asia/Riyadh')::date = v_today),
    'today_log', (SELECT to_jsonb(l) FROM lc_daily_log l
                   WHERE l.coach_id = auth.uid() AND l.log_date = v_today),
    'recent_logs', coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.log_date DESC)
                              FROM lc_daily_log l
                             WHERE l.coach_id = auth.uid() AND l.log_date >= v_today - 13), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.lc_get_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_today() TO authenticated;

-- ── admin: coach accountability + the blocker distribution ───────────────
-- The insight surface. After a few hundred touchpoints this answers the
-- question the academy has never been able to answer: when a student stalls,
-- is it motivation or is it our software?

DROP FUNCTION IF EXISTS public.lc_get_coach_activity(integer);
CREATE FUNCTION public.lc_get_coach_activity(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT jsonb_build_object(
    'window_days', p_days,
    'per_day', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', d, 'touchpoints', n) ORDER BY d)
      FROM (
        SELECT (t.created_at AT TIME ZONE 'Asia/Riyadh')::date AS d, count(*) AS n
        FROM lc_touchpoints t
        WHERE t.created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) x
    ), '[]'::jsonb),
    'by_blocker', coalesce((
      SELECT jsonb_agg(jsonb_build_object('blocker_type', b, 'count', n) ORDER BY n DESC)
      FROM (
        SELECT t.blocker_type AS b, count(*) AS n FROM lc_touchpoints t
        WHERE t.created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) y
    ), '[]'::jsonb),
    'by_action', coalesce((
      SELECT jsonb_agg(jsonb_build_object('action', a, 'count', n) ORDER BY n DESC)
      FROM (
        SELECT t.action AS a, count(*) AS n FROM lc_touchpoints t
        WHERE t.created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) z
    ), '[]'::jsonb),
    'top_templates', coalesce((
      SELECT jsonb_agg(jsonb_build_object('code', c, 'situation_en', sit, 'count', n) ORDER BY n DESC)
      FROM (
        SELECT t.template_code AS c, max(tpl.situation_en) AS sit, count(*) AS n
        FROM lc_touchpoints t LEFT JOIN lc_message_templates tpl ON tpl.code = t.template_code
        WHERE t.template_code IS NOT NULL AND t.created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1
      ) w
    ), '[]'::jsonb),
    'coverage', (
      SELECT jsonb_build_object(
        'active_students', count(*),
        'touched_in_window', count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM lc_touchpoints t WHERE t.student_id = s.id
            AND t.created_at >= now() - (p_days || ' days')::interval)),
        'never_touched', count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM lc_touchpoints t WHERE t.student_id = s.id))
      )
      FROM students s WHERE s.deleted_at IS NULL AND s.status = 'active'
    ),
    'log_streak_days', (
      SELECT count(*) FROM (
        SELECT l.log_date, row_number() OVER (ORDER BY l.log_date DESC) AS rn
        FROM lc_daily_log l
        WHERE l.log_date <= (now() AT TIME ZONE 'Asia/Riyadh')::date
      ) q
      WHERE q.log_date = (now() AT TIME ZONE 'Asia/Riyadh')::date - (q.rn - 1)
    ),
    'coaches', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', p.full_name, 'timezone', c.timezone, 'is_active', c.is_active,
        'touchpoints', (SELECT count(*) FROM lc_touchpoints t WHERE t.coach_id = c.id)))
      FROM lc_coaches c JOIN profiles p ON p.id = c.id
    ), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.lc_get_coach_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lc_get_coach_activity(integer) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. can_dm() — the coach branch
-- ═══════════════════════════════════════════════════════════════════════════
-- Without this, dm_get_or_create_thread raises not_allowed and lc_send_message
-- can never deliver anything. Additive: the coach branch returns true only
-- where the function currently returns false, and no other role's answer
-- changes. can_dm() is not referenced by any RLS policy — the DM policies use
-- is_dm_member().

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
  -- Staff who reach students: the class coordinator (2026-08-21) and the
  -- learning coach (2026-08-22). Students and trainers only, never other staff.
  IF my_role IN ('coordinator','coach') THEN
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
-- payments, trainer_payroll and affiliate_payouts get nothing at all —
-- deliberately, and asserted by scripts/verify-lc-rls.mjs.

ALTER TABLE public.lc_coaches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_touchpoints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_daily_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lc_escalations       ENABLE ROW LEVEL SECURITY;

-- lc_coaches
DROP POLICY IF EXISTS lc_coaches_select ON public.lc_coaches;
CREATE POLICY lc_coaches_select ON public.lc_coaches
  FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS lc_coaches_admin_write ON public.lc_coaches;
CREATE POLICY lc_coaches_admin_write ON public.lc_coaches
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- lc_message_templates: readable by the people who send them, writable by Ali.
DROP POLICY IF EXISTS lc_templates_read ON public.lc_message_templates;
CREATE POLICY lc_templates_read ON public.lc_message_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                   AND role::text IN ('coach','admin','trainer')));
DROP POLICY IF EXISTS lc_templates_admin_write ON public.lc_message_templates;
CREATE POLICY lc_templates_admin_write ON public.lc_message_templates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- lc_touchpoints: his own; admin sees all; a trainer sees their own students'.
DROP POLICY IF EXISTS lc_touchpoints_own_insert ON public.lc_touchpoints;
CREATE POLICY lc_touchpoints_own_insert ON public.lc_touchpoints
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid() AND is_coach_staff());
DROP POLICY IF EXISTS lc_touchpoints_select ON public.lc_touchpoints;
CREATE POLICY lc_touchpoints_select ON public.lc_touchpoints
  FOR SELECT TO authenticated
  USING (
    coach_id = auth.uid()
    OR is_admin()
    OR (is_trainer() AND EXISTS (
          SELECT 1 FROM students s
          WHERE s.id = lc_touchpoints.student_id
            AND (s.assigned_trainer_id = auth.uid()
                 OR s.group_id = ANY (get_trainer_group_ids()))))
  );

-- lc_daily_log
DROP POLICY IF EXISTS coord_log_own_select ON public.lc_daily_log;
DROP POLICY IF EXISTS coord_log_own_insert ON public.lc_daily_log;
DROP POLICY IF EXISTS coord_log_own_update ON public.lc_daily_log;
DROP POLICY IF EXISTS lc_log_own_select ON public.lc_daily_log;
CREATE POLICY lc_log_own_select ON public.lc_daily_log
  FOR SELECT TO authenticated USING (coach_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS lc_log_own_insert ON public.lc_daily_log;
CREATE POLICY lc_log_own_insert ON public.lc_daily_log
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid() AND is_coach_staff());
DROP POLICY IF EXISTS lc_log_own_update ON public.lc_daily_log;
CREATE POLICY lc_log_own_update ON public.lc_daily_log
  FOR UPDATE TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- lc_escalations
DROP POLICY IF EXISTS coord_esc_own_insert ON public.lc_escalations;
DROP POLICY IF EXISTS coord_esc_select ON public.lc_escalations;
DROP POLICY IF EXISTS coord_esc_admin_update ON public.lc_escalations;
DROP POLICY IF EXISTS lc_esc_own_insert ON public.lc_escalations;
CREATE POLICY lc_esc_own_insert ON public.lc_escalations
  FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid() AND is_coach_staff());
DROP POLICY IF EXISTS lc_esc_select ON public.lc_escalations;
CREATE POLICY lc_esc_select ON public.lc_escalations
  FOR SELECT TO authenticated USING (coach_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS lc_esc_admin_update ON public.lc_escalations;
CREATE POLICY lc_esc_admin_update ON public.lc_escalations
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Context reads. Yesterday's policies were written for `coordinator`; they are
-- replaced by coach ones rather than added to, which narrows access — the
-- class-scheduling coordinator never needed student activity data.
DROP POLICY IF EXISTS interv_coordinator_read ON public.student_interventions;
CREATE POLICY interv_coach_read ON public.student_interventions
  FOR SELECT TO authenticated USING (is_coach_staff());

DROP POLICY IF EXISTS students_coordinator_read ON public.students;
CREATE POLICY students_coach_read ON public.students
  FOR SELECT TO authenticated USING (is_coach_staff() AND deleted_at IS NULL);

DROP POLICY IF EXISTS groups_coordinator_read ON public.groups;
CREATE POLICY groups_coach_read ON public.groups
  FOR SELECT TO authenticated USING (is_coach_staff());

DROP POLICY IF EXISTS sda_coordinator_read ON public.student_daily_activity;
CREATE POLICY sda_coach_read ON public.student_daily_activity
  FOR SELECT TO authenticated USING (is_coach_staff());

DROP POLICY IF EXISTS help_requests_coordinator_read ON public.help_requests;
CREATE POLICY help_requests_coach_read ON public.help_requests
  FOR SELECT TO authenticated USING (is_coach_staff());

DROP POLICY IF EXISTS bug_reports_coordinator_read ON public.bug_reports;
CREATE POLICY bug_reports_coach_read ON public.bug_reports
  FOR SELECT TO authenticated USING (is_coach_staff());

DROP POLICY IF EXISTS ual_coach_read ON public.unified_activity_log;
CREATE POLICY ual_coach_read ON public.unified_activity_log
  FOR SELECT TO authenticated USING (is_coach_staff());

-- profiles: no new policy. profiles_select_all is already USING (true) for
-- everyone, so a "coach may read student profiles" policy would be a strict
-- subset of what already applies — dead SQL that only makes the policy list
-- harder to audit. Recorded so the omission reads as a decision.
