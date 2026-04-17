-- Migration 136: Competition Smart Notifications
-- Fixes CHECK constraint, adds notification log, smart notification RPC,
-- v3 RPCs for streak/weekly-goal/encouragement, cron jobs.

-- ─── 1. Add competition_event to notification_type enum ──────────
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'competition_event';

-- ─── 2. Fix competition_announcements_seen CHECK constraint ───────
-- The original CHECK only allowed 'kickoff'|'victory'.
-- The victory edge function uses 'competition_victory' which would fail.
-- Drop the old constraint and recreate with all valid values.
DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'competition_announcements_seen'
      AND con.contype = 'c'
  ) LOOP
    EXECUTE 'ALTER TABLE public.competition_announcements_seen DROP CONSTRAINT IF EXISTS ' || quote_ident(v_con);
  END LOOP;
END;
$$;

ALTER TABLE public.competition_announcements_seen
  ADD CONSTRAINT competition_announcements_seen_announcement_type_check
  CHECK (announcement_type IN ('kickoff','mission_briefing','victory','competition_victory'));

-- ─── 3. Add notification_preferences jsonb to profiles ───────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  DEFAULT '{"competition_digest":true,"competition_events":true}'::jsonb;

-- ─── 4. competition_notifications_log table ───────────────────────
CREATE TABLE IF NOT EXISTS public.competition_notifications_log (
  id               uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   uuid      NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  student_id       uuid      NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  notification_type text     NOT NULL,
  priority         text      NOT NULL DEFAULT 'normal'
                             CHECK (priority IN ('normal','high','critical')),
  sent_via         text[]    NOT NULL DEFAULT '{}',
  dedupe_key       text,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, student_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_cnl_student_day
  ON public.competition_notifications_log (student_id, sent_at DESC);

ALTER TABLE public.competition_notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_cnl" ON public.competition_notifications_log;
CREATE POLICY "admin_read_cnl" ON public.competition_notifications_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin','trainer')
    )
  );

-- ─── 5. send_competition_notification RPC ─────────────────────────
DROP FUNCTION IF EXISTS public.send_competition_notification(uuid,text,text,text,text,jsonb,text);
CREATE OR REPLACE FUNCTION public.send_competition_notification(
  p_student_id      uuid,       -- profiles.id (user_id in notifications table)
  p_notification_type text,
  p_priority        text    DEFAULT 'normal',
  p_title           text    DEFAULT '',
  p_body            text    DEFAULT '',
  p_data            jsonb   DEFAULT '{}'::jsonb,
  p_dedupe_key      text    DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp   public.competitions%ROWTYPE;
  v_today  int;
  v_prefs  jsonb;
BEGIN
  -- Active competition required
  SELECT * INTO v_comp
  FROM public.competitions
  WHERE status = 'active'
  ORDER BY start_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('skipped','no_active_comp');
  END IF;

  -- Opt-out check
  SELECT COALESCE(notification_preferences,
    '{"competition_digest":true,"competition_events":true}'::jsonb)
  INTO v_prefs
  FROM public.profiles WHERE id = p_student_id;

  IF p_notification_type IN ('morning_digest','evening_digest')
     AND COALESCE((v_prefs->>'competition_digest')::boolean, true) = false THEN
    RETURN jsonb_build_object('skipped','opted_out_digest');
  END IF;

  IF p_notification_type NOT IN ('morning_digest','evening_digest')
     AND COALESCE((v_prefs->>'competition_events')::boolean, true) = false THEN
    RETURN jsonb_build_object('skipped','opted_out_events');
  END IF;

  -- Dedupe
  IF p_dedupe_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.competition_notifications_log
    WHERE competition_id = v_comp.id
      AND student_id     = p_student_id
      AND dedupe_key     = p_dedupe_key
  ) THEN
    RETURN jsonb_build_object('skipped','duplicate');
  END IF;

  -- Rate limit (count today's logs for this student)
  SELECT COUNT(*) INTO v_today
  FROM public.competition_notifications_log
  WHERE student_id = p_student_id
    AND sent_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';

  IF p_priority = 'normal'   AND v_today >= 2 THEN RETURN jsonb_build_object('skipped','rate_limit_normal'); END IF;
  IF p_priority = 'high'     AND v_today >= 5 THEN RETURN jsonb_build_object('skipped','rate_limit_high');   END IF;
  -- 'critical' is never rate-limited

  -- Insert in-app notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_student_id,
    'competition_event'::public.notification_type,
    p_title,
    p_body,
    p_data || jsonb_build_object(
      'competition_id',      v_comp.id,
      'notification_type',   p_notification_type,
      'url',                 '/student/competition'
    )
  );

  -- Log (ON CONFLICT DO NOTHING to handle race conditions)
  INSERT INTO public.competition_notifications_log (
    competition_id, student_id, notification_type, priority, sent_via, dedupe_key
  ) VALUES (
    v_comp.id, p_student_id, p_notification_type, p_priority,
    ARRAY['notification']::text[], p_dedupe_key
  ) ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'sent',           true,
    'should_push',    true,
    'competition_id', v_comp.id,
    'student_id',     p_student_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_competition_notification TO authenticated, service_role;

-- ─── 6. check_team_streak_daily v3 (adds milestone notifications) ─
DROP FUNCTION IF EXISTS public.check_team_streak_daily();
CREATE OR REPLACE FUNCTION public.check_team_streak_daily()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp       public.competitions%ROWTYPE;
  v_today      date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_yesterday  date := v_today - INTERVAL '1 day';
  v_group      RECORD;
  v_group_size int;
  v_active     int;
  v_threshold  numeric := 0.8;
  v_snap       RECORD;
  v_streak     int;
  v_xp_bonus   int;
  v_student    RECORD;
BEGIN
  SELECT * INTO v_comp FROM public.competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_group IN
    SELECT unnest(ARRAY[v_comp.team_a_group_id, v_comp.team_b_group_id]) AS group_id
  LOOP
    -- Count active students today
    SELECT COUNT(*) INTO v_group_size
    FROM public.students
    WHERE group_id = v_group.group_id AND status = 'active' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT xt.student_id) INTO v_active
    FROM public.xp_transactions xt
    JOIN public.students s ON s.id = xt.student_id
    WHERE s.group_id = v_group.group_id
      AND s.status = 'active'
      AND xt.created_at >= v_today AT TIME ZONE 'Asia/Riyadh'
      AND xt.created_at <  v_today AT TIME ZONE 'Asia/Riyadh' + INTERVAL '1 day';

    -- Get last snapshot
    SELECT * INTO v_snap
    FROM public.competition_snapshots
    WHERE competition_id = v_comp.id
      AND group_id       = v_group.group_id
      AND snapshot_type  = 'streak'
    ORDER BY snapshot_at DESC LIMIT 1;

    v_streak := COALESCE(v_snap.data->>'current_streak', '0')::int;

    IF v_group_size > 0 AND v_active::numeric / v_group_size >= v_threshold THEN
      -- Streak continues
      v_streak := v_streak + 1;

      -- Award bonus XP
      v_xp_bonus := CASE v_streak
        WHEN 3  THEN 75
        WHEN 5  THEN 200
        WHEN 7  THEN 500
        WHEN 14 THEN 1500
        ELSE 0
      END;

      IF v_xp_bonus > 0 THEN
        INSERT INTO public.competition_team_bonuses (
          competition_id, group_id, xp_amount, reason_ar, bonus_type, awarded_at
        ) VALUES (
          v_comp.id, v_group.group_id, v_xp_bonus,
          'ستريك الفريق ' || v_streak || ' أيام',
          'streak', now()
        );

        -- Award streak badges to all team members
        FOR v_student IN (
          SELECT s.id AS student_id, s.profile_id
          FROM public.students s
          WHERE s.group_id = v_group.group_id AND s.status = 'active' AND s.deleted_at IS NULL
        ) LOOP
          IF v_streak IN (7, 14) THEN
            INSERT INTO public.student_achievements (student_id, achievement_id, earned_at)
            SELECT v_student.student_id, a.id, now()
            FROM public.achievements a
            WHERE a.code = CASE v_streak
              WHEN 7  THEN 'competition_april_2026_streak_7'
              WHEN 14 THEN 'competition_april_2026_streak_14'
            END
            ON CONFLICT DO NOTHING;
          END IF;

          -- Send milestone notification
          PERFORM public.send_competition_notification(
            v_student.profile_id,
            'streak_milestone',
            'high',
            '🔥 ستريك الفريق ' || v_streak || ' أيام! +' || v_xp_bonus || ' XP',
            'فريقك حافظ على النشاط ' || v_streak || ' أيام متتالية',
            '{}'::jsonb,
            'streak_' || v_streak::text || '_' || v_comp.id::text
          );
        END LOOP;
      END IF;
    ELSE
      -- Streak broken
      v_streak := 0;
    END IF;

    -- Save snapshot
    INSERT INTO public.competition_snapshots (
      competition_id, group_id, snapshot_type, snapshot_at, data
    ) VALUES (
      v_comp.id, v_group.group_id, 'streak', now(),
      jsonb_build_object(
        'current_streak', v_streak,
        'active_today',   v_active,
        'group_size',     v_group_size,
        'threshold_met',  (v_group_size > 0 AND v_active::numeric / v_group_size >= v_threshold)
      )
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_team_streak_daily TO service_role;

-- ─── 7. check_weekly_goal v3 (adds weekly goal notifications) ─────
DROP FUNCTION IF EXISTS public.check_weekly_goal();
CREATE OR REPLACE FUNCTION public.check_weekly_goal()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp        public.competitions%ROWTYPE;
  v_now         timestamptz := now();
  v_week_num    int;
  v_target_unit int;
  v_group       RECORD;
  v_group_size  int;
  v_completed   int;
  v_pct         int;
  v_tier        text;
  v_bonus       int;
  v_student     RECORD;
BEGIN
  SELECT * INTO v_comp FROM public.competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  -- Determine which week we're in
  v_week_num := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_now - v_comp.start_at)) / 604800)::int);

  FOR v_group IN
    SELECT unnest(ARRAY[v_comp.team_a_group_id, v_comp.team_b_group_id]) AS group_id
  LOOP
    SELECT COUNT(*) INTO v_group_size
    FROM public.students
    WHERE group_id = v_group.group_id AND status = 'active' AND deleted_at IS NULL;

    IF v_group_size = 0 THEN CONTINUE; END IF;

    -- Count students who completed any unit this week
    SELECT COUNT(DISTINCT s.id) INTO v_completed
    FROM public.students s
    JOIN public.student_unit_progress sup ON sup.student_id = s.id
    WHERE s.group_id  = v_group.group_id
      AND s.status    = 'active'
      AND s.deleted_at IS NULL
      AND sup.completed_at >= v_comp.start_at + ((v_week_num - 1) * INTERVAL '7 days')
      AND sup.completed_at <  v_comp.start_at + (v_week_num       * INTERVAL '7 days');

    v_pct := ROUND((v_completed::numeric / v_group_size) * 100);

    v_tier := CASE
      WHEN v_pct >= 100 THEN 'diamond'
      WHEN v_pct >= 90  THEN 'gold'
      WHEN v_pct >= 70  THEN 'silver'
      WHEN v_pct >= 50  THEN 'bronze'
      ELSE NULL
    END;

    IF v_tier IS NULL THEN CONTINUE; END IF;

    -- Idempotency: skip if already awarded this tier this week
    IF EXISTS (
      SELECT 1 FROM public.competition_team_bonuses
      WHERE competition_id = v_comp.id
        AND group_id       = v_group.group_id
        AND bonus_type     = 'weekly_goal'
        AND reason_ar LIKE '%أسبوع ' || v_week_num || '%' || v_tier || '%'
    ) THEN CONTINUE; END IF;

    v_bonus := CASE v_tier
      WHEN 'bronze'  THEN 150
      WHEN 'silver'  THEN 400
      WHEN 'gold'    THEN 800
      WHEN 'diamond' THEN 1200
    END;

    INSERT INTO public.competition_team_bonuses (
      competition_id, group_id, xp_amount, reason_ar, bonus_type, awarded_at
    ) VALUES (
      v_comp.id, v_group.group_id, v_bonus,
      'إكمال الأسبوع ' || v_week_num || ' (' || v_pct || '%) — ' || v_tier,
      'weekly_goal', now()
    );

    FOR v_student IN (
      SELECT s.id AS student_id, s.profile_id
      FROM public.students s
      WHERE s.group_id = v_group.group_id AND s.status = 'active' AND s.deleted_at IS NULL
    ) LOOP
      -- Badge for gold / diamond
      IF v_tier IN ('gold','diamond') THEN
        INSERT INTO public.student_achievements (student_id, achievement_id, earned_at)
        SELECT v_student.student_id, a.id, now()
        FROM public.achievements a
        WHERE a.code = CASE v_tier
          WHEN 'gold'    THEN 'competition_april_2026_gold_week'
          WHEN 'diamond' THEN 'competition_april_2026_perfect_team'
        END
        ON CONFLICT DO NOTHING;
      END IF;

      -- Notify
      PERFORM public.send_competition_notification(
        v_student.profile_id,
        'weekly_goal_progress',
        'normal',
        '🎯 فريقك أكمل ' || v_pct || '% من هدف الأسبوع ' || v_week_num,
        '+' || v_bonus || ' XP لفريقك',
        '{}'::jsonb,
        'weekly_' || v_week_num::text || '_' || v_tier || '_' || v_comp.id::text
      );
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_weekly_goal TO service_role;

-- ─── 8. send_peer_encouragement v3 (adds notification to recipient) ─
DROP FUNCTION IF EXISTS public.send_peer_encouragement(uuid,text);
CREATE OR REPLACE FUNCTION public.send_peer_encouragement(
  p_to_student_id uuid,
  p_message       text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from_student public.students%ROWTYPE;
  v_to_student   public.students%ROWTYPE;
  v_comp         public.competitions%ROWTYPE;
  v_today_count  int;
  v_daily_limit  int := 5;
  v_remaining    int;
  v_xp_sender    int := 2;
  v_xp_receiver  int := 3;
BEGIN
  -- Get sender's student record
  SELECT * INTO v_from_student
  FROM public.students
  WHERE profile_id = auth.uid() AND status = 'active' AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender_not_found';
  END IF;

  -- Self-encouragement check
  IF v_from_student.id = p_to_student_id THEN
    RAISE EXCEPTION 'self_encouragement_not_allowed';
  END IF;

  -- Get recipient's student record
  SELECT * INTO v_to_student
  FROM public.students
  WHERE id = p_to_student_id AND status = 'active' AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient_not_found';
  END IF;

  -- Active competition
  SELECT * INTO v_comp FROM public.competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_active_competition';
  END IF;

  -- Same competition check (both must be in a competing group)
  IF v_from_student.group_id NOT IN (v_comp.team_a_group_id, v_comp.team_b_group_id)
     OR v_to_student.group_id NOT IN (v_comp.team_a_group_id, v_comp.team_b_group_id) THEN
    RAISE EXCEPTION 'not_in_competition';
  END IF;

  -- Daily limit check
  SELECT COUNT(*) INTO v_today_count
  FROM public.peer_encouragements
  WHERE from_student_id = v_from_student.id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';

  IF v_today_count >= v_daily_limit THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  v_remaining := v_daily_limit - v_today_count - 1;

  -- Insert encouragement record
  INSERT INTO public.peer_encouragements (
    from_student_id, to_student_id, competition_id, message, created_at
  ) VALUES (
    v_from_student.id, p_to_student_id, v_comp.id, p_message, now()
  );

  -- Award XP to sender
  INSERT INTO public.xp_transactions (
    student_id, amount, reason, reference_id, created_at
  ) VALUES (
    v_from_student.id, v_xp_sender, 'peer_encouragement_sent', v_comp.id, now()
  );

  -- Award XP to receiver
  INSERT INTO public.xp_transactions (
    student_id, amount, reason, reference_id, created_at
  ) VALUES (
    p_to_student_id, v_xp_receiver, 'peer_encouragement_received', v_comp.id, now()
  );

  -- Notify recipient (high priority, max 1/hour from same sender)
  PERFORM public.send_competition_notification(
    v_to_student.profile_id,
    'encouragement_received',
    'high',
    '💪 زميلك شجعك!',
    COALESCE(p_message, 'واصل التقدم! أنت تصنع فرقاً لفريقك.') || ' (+' || v_xp_receiver || ' XP)',
    jsonb_build_object('url', '/student/competition'),
    'encourage_' || p_to_student_id::text || '_' || to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD-HH24')
  );

  RETURN jsonb_build_object(
    'success',          true,
    'xp_sender',        v_xp_sender,
    'xp_receiver',      v_xp_receiver,
    'remaining_today',  v_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_peer_encouragement TO authenticated, service_role;

-- ─── 9. Cron jobs for smart notifications ─────────────────────────
-- Morning digest: 08:00 Riyadh = 05:00 UTC
SELECT cron.schedule(
  'comp-morning-digest',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-smart-notifications',
    body := '{"action":"morning_digest"}'::jsonb
  )$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'comp-morning-digest');

-- Evening digest: 20:00 Riyadh = 17:00 UTC
SELECT cron.schedule(
  'comp-evening-digest',
  '0 17 * * *',
  $$SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-smart-notifications',
    body := '{"action":"evening_digest"}'::jsonb
  )$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'comp-evening-digest');

-- Leader check every 30 min
SELECT cron.schedule(
  'comp-leader-check',
  '*/30 * * * *',
  $$SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-smart-notifications',
    body := '{"action":"leader_check"}'::jsonb
  )$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'comp-leader-check');

-- Midpoint: April 24 08:00 Riyadh = 05:00 UTC
SELECT cron.schedule(
  'comp-midpoint-april-2026',
  '0 5 24 4 *',
  $$SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-smart-notifications',
    body := '{"action":"midpoint"}'::jsonb
  )$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'comp-midpoint-april-2026');

-- 24h remaining: April 30 00:00 Riyadh = April 29 21:00 UTC
SELECT cron.schedule(
  'comp-24h-april-2026',
  '0 21 29 4 *',
  $$SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-smart-notifications',
    body := '{"action":"24h_remaining"}'::jsonb
  )$$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'comp-24h-april-2026');
