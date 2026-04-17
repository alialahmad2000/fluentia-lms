-- Migration 135: Competition Badges + RPC v2 + Crons
-- Adds badge awarding to streak/weekly RPCs; updates close_competition;
-- adds check_competition_milestones; schedules 3 new cron jobs.

-- ─── 0. Enum value ────────────────────────────────────────────────────────────
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'competition_victory';

-- ─── 1. Seed Badges ──────────────────────────────────────────────────────────
INSERT INTO achievements(code, name_ar, name_en, description_ar, icon, xp_reward, condition, is_active)
VALUES
  ('competition_april_2026_winner',
   'بطل تحدي أبريل 2026', 'April 2026 Champion',
   'كنت من الفريق الفائز في تحدي طلاقة أبريل 2026', '🏆', 50,
   '{"type":"competition_winner","competition_code":"april_2026"}'::jsonb, true),

  ('competition_april_2026_mvp',
   'MVP تحدي أبريل 2026', 'April 2026 MVP',
   'أعلى مساهم في فريقك خلال تحدي طلاقة أبريل 2026', '⭐', 100,
   '{"type":"competition_mvp","competition_code":"april_2026"}'::jsonb, true),

  ('competition_april_2026_gold_week',
   'أسبوع ذهبي', 'Gold Week',
   'فريقك حقق 90%+ من تحدي الوحدة الأسبوعية', '🏅', 25,
   '{"type":"weekly_goal","threshold":90}'::jsonb, true),

  ('competition_april_2026_perfect_team',
   'فريق مثالي', 'Perfect Team',
   'كل أعضاء فريقك أكملوا الوحدة المستهدفة', '💎', 50,
   '{"type":"weekly_goal","threshold":100}'::jsonb, true),

  ('competition_april_2026_streak_7',
   'ستريك الفريق 7', 'Team Streak 7',
   'فريقك حافظ على 7 أيام نشاط متتالية', '🔥', 25,
   '{"type":"team_streak","days":7}'::jsonb, true),

  ('competition_april_2026_streak_14',
   'ستريك الفريق 14', 'Team Streak 14',
   'فريقك حافظ على 14 يوم نشاط متتالية', '⚡', 75,
   '{"type":"team_streak","days":14}'::jsonb, true)
ON CONFLICT (code) DO UPDATE SET
  xp_reward   = EXCLUDED.xp_reward,
  condition   = EXCLUDED.condition,
  description_ar = EXCLUDED.description_ar;

-- ─── 2. check_team_streak_daily v2 (adds badge awarding at milestones) ───────
CREATE OR REPLACE FUNCTION public.check_team_streak_daily()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp       competitions;
  v_yesterday  date;
  v_result     jsonb := '{}'::jsonb;
  v_team       text; v_group uuid;
  v_size       int;  v_active int;
  v_thresh     int;  v_is_active bool;
  v_cur_streak int;  v_bonus int;
  v_reason     text;
  v_badge_code text; v_badge_id uuid;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN '{"error":"no_active"}'::jsonb; END IF;

  v_yesterday := ((now() AT TIME ZONE 'Asia/Riyadh')::date) - 1;
  v_thresh    := v_comp.daily_streak_threshold_pct;

  FOR v_team, v_group IN
    VALUES ('A'::text, v_comp.team_a_group_id), ('B'::text, v_comp.team_b_group_id)
  LOOP
    SELECT COUNT(*) INTO v_size FROM students
    WHERE group_id = v_group AND status::text = 'active' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT xt.student_id) INTO v_active
    FROM xp_transactions xt
    JOIN students s ON s.id = xt.student_id
    WHERE s.group_id = v_group AND s.status::text = 'active' AND s.deleted_at IS NULL
      AND (xt.created_at AT TIME ZONE 'Asia/Riyadh')::date = v_yesterday
      AND xt.amount > 0;

    v_is_active := (v_size > 0 AND (v_active * 100.0 / v_size) >= v_thresh);

    INSERT INTO competition_team_streaks(competition_id, team, current_streak, longest_streak, last_check_date)
    VALUES (v_comp.id, v_team, 0, 0, v_yesterday)
    ON CONFLICT (competition_id, team) DO NOTHING;

    v_cur_streak := 0;
    v_bonus      := 0;

    IF v_is_active THEN
      UPDATE competition_team_streaks
      SET current_streak   = current_streak + 1,
          longest_streak   = GREATEST(longest_streak, current_streak + 1),
          last_active_date = v_yesterday,
          last_check_date  = v_yesterday
      WHERE competition_id = v_comp.id AND team = v_team
      RETURNING current_streak INTO v_cur_streak;

      v_bonus := CASE v_cur_streak
        WHEN 3  THEN 75
        WHEN 5  THEN 200
        WHEN 7  THEN 500
        WHEN 14 THEN 1500
        ELSE 0
      END;

      IF v_bonus > 0 THEN
        v_reason := format('ستريك الفريق %s أيام 🔥', v_cur_streak);
        INSERT INTO competition_team_bonuses(competition_id, team, bonus_type, amount_xp, reason_ar, metadata)
        VALUES (v_comp.id, v_team, 'daily_streak', v_bonus, v_reason,
                jsonb_build_object('streak_days', v_cur_streak));
      END IF;

      -- Award streak badges at milestones
      v_badge_code := CASE v_cur_streak
        WHEN 7  THEN 'competition_april_2026_streak_7'
        WHEN 14 THEN 'competition_april_2026_streak_14'
        ELSE NULL
      END;
      IF v_badge_code IS NOT NULL THEN
        SELECT id INTO v_badge_id FROM achievements WHERE code = v_badge_code;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO student_achievements(student_id, achievement_id)
          SELECT s.id, v_badge_id FROM students s
          WHERE s.group_id = v_group AND s.deleted_at IS NULL AND s.status::text = 'active'
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    ELSE
      UPDATE competition_team_streaks
      SET current_streak = 0, last_check_date = v_yesterday
      WHERE competition_id = v_comp.id AND team = v_team;
    END IF;

    v_result := v_result || jsonb_build_object(v_team, jsonb_build_object(
      'active',         v_active,
      'team_size',      v_size,
      'is_active_day',  v_is_active,
      'current_streak', v_cur_streak,
      'bonus_xp',       v_bonus
    ));
  END LOOP;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_team_streak_daily TO authenticated;

-- ─── 3. check_weekly_goal v2 (adds gold_week + perfect_team badges) ──────────
CREATE OR REPLACE FUNCTION public.check_weekly_goal()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp        competitions;
  v_goal        competition_weekly_goals;
  v_today       date;
  v_result      jsonb := '[]'::jsonb;
  v_group       uuid;
  v_team_size   int; v_completed int; v_pct int;
  v_bonus       int; v_tier jsonb; v_applied_tier jsonb;
  v_badge_code  text; v_badge_id uuid;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN '{"error":"no_active"}'::jsonb; END IF;
  v_today := (now() AT TIME ZONE 'Asia/Riyadh')::date;

  FOR v_goal IN
    SELECT * FROM competition_weekly_goals
    WHERE competition_id = v_comp.id AND evaluated_at IS NULL AND week_end_date <= v_today
  LOOP
    v_group := CASE WHEN v_goal.team = 'A' THEN v_comp.team_a_group_id ELSE v_comp.team_b_group_id END;

    SELECT COUNT(*) INTO v_team_size
    FROM students WHERE group_id = v_group AND status::text = 'active' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT s.id) INTO v_completed
    FROM students s
    JOIN groups g   ON g.id = s.group_id
    JOIN curriculum_levels cl ON cl.level_number = g.level
    JOIN curriculum_units  cu ON cu.level_id = cl.id AND cu.unit_number = v_goal.target_unit_number
    JOIN student_curriculum_progress scp ON scp.student_id = s.id AND scp.unit_id = cu.id
    WHERE s.group_id = v_group AND s.deleted_at IS NULL AND s.status::text = 'active'
      AND scp.status = 'completed';

    v_pct         := CASE WHEN v_team_size > 0 THEN (v_completed * 100 / v_team_size) ELSE 0 END;
    v_bonus       := 0;
    v_applied_tier := NULL;

    FOR v_tier IN
      SELECT elem FROM jsonb_array_elements(v_goal.bonus_tiers) AS elem
      ORDER BY (elem->>'pct')::int
    LOOP
      IF v_pct >= (v_tier->>'pct')::int THEN
        v_bonus        := (v_tier->>'xp')::int;
        v_applied_tier := v_tier;
      END IF;
    END LOOP;

    UPDATE competition_weekly_goals
    SET evaluated_at = now(), final_pct = v_pct, bonus_awarded_xp = v_bonus
    WHERE id = v_goal.id;

    IF v_bonus > 0 THEN
      INSERT INTO competition_team_bonuses(competition_id, team, bonus_type, amount_xp, reason_ar, metadata)
      VALUES (v_comp.id, v_goal.team, 'weekly_goal', v_bonus,
              format('إكمال الأسبوع %s — %s%% من الفريق أكمل الوحدة %s',
                     v_goal.week_num, v_pct, v_goal.target_unit_number),
              jsonb_build_object('week_num', v_goal.week_num, 'pct', v_pct,
                                 'target_unit', v_goal.target_unit_number, 'tier', v_applied_tier));

      -- Award gold_week badge (pct >= 90)
      IF v_pct >= 90 THEN
        v_badge_code := CASE WHEN v_pct = 100 THEN 'competition_april_2026_perfect_team'
                             ELSE 'competition_april_2026_gold_week' END;
        SELECT id INTO v_badge_id FROM achievements WHERE code = v_badge_code;
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO student_achievements(student_id, achievement_id)
          SELECT s.id, v_badge_id FROM students s
          WHERE s.group_id = v_group AND s.deleted_at IS NULL AND s.status::text = 'active'
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;

    v_result := v_result || jsonb_build_object(
      'team', v_goal.team, 'week', v_goal.week_num, 'pct', v_pct, 'bonus', v_bonus
    );
  END LOOP;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_weekly_goal TO authenticated;

-- ─── 4. close_competition v2 (uses canonical badge codes) ────────────────────
CREATE OR REPLACE FUNCTION public.close_competition(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp           competitions;
  v_a_xp           bigint; v_b_xp bigint;
  v_winner         text;
  v_a_mvp_id       uuid;   v_b_mvp_id uuid;
  v_a_mvp_xp       int;    v_b_mvp_xp int;
  v_snapshot       jsonb;
  v_winning_group  uuid;
  v_ach_winner_id  uuid;   v_ach_mvp_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','trainer')) THEN
      RAISE EXCEPTION 'admin_only';
    END IF;
  END IF;

  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition_not_found'; END IF;
  IF v_comp.status = 'closed' THEN
    RETURN jsonb_build_object('already_closed', true, 'winner', v_comp.winner_team);
  END IF;

  v_a_xp := competition_team_total_xp(v_comp.team_a_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses
                       WHERE competition_id = v_comp.id AND team = 'A'), 0);
  v_b_xp := competition_team_total_xp(v_comp.team_b_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses
                       WHERE competition_id = v_comp.id AND team = 'B'), 0);

  v_winner := CASE WHEN v_a_xp > v_b_xp THEN 'A' WHEN v_b_xp > v_a_xp THEN 'B' ELSE 'tie' END;

  WITH team_xp AS (
    SELECT s.id, COALESCE(SUM(xt.amount), 0)::int AS xp
    FROM students s LEFT JOIN xp_transactions xt ON xt.student_id = s.id
    WHERE s.deleted_at IS NULL AND s.status::text = 'active' AND s.group_id = v_comp.team_a_group_id
    GROUP BY s.id
  )
  SELECT id, xp INTO v_a_mvp_id, v_a_mvp_xp FROM team_xp ORDER BY xp DESC LIMIT 1;

  WITH team_xp AS (
    SELECT s.id, COALESCE(SUM(xt.amount), 0)::int AS xp
    FROM students s LEFT JOIN xp_transactions xt ON xt.student_id = s.id
    WHERE s.deleted_at IS NULL AND s.status::text = 'active' AND s.group_id = v_comp.team_b_group_id
    GROUP BY s.id
  )
  SELECT id, xp INTO v_b_mvp_id, v_b_mvp_xp FROM team_xp ORDER BY xp DESC LIMIT 1;

  UPDATE competitions SET
    status                = 'closed',
    winner_team           = v_winner,
    team_a_final_xp       = v_a_xp,
    team_b_final_xp       = v_b_xp,
    team_a_final_vp       = (v_a_xp / xp_per_victory_point)::int,
    team_b_final_vp       = (v_b_xp / xp_per_victory_point)::int,
    team_a_mvp_student_id = v_a_mvp_id,
    team_a_mvp_xp         = v_a_mvp_xp,
    team_b_mvp_student_id = v_b_mvp_id,
    team_b_mvp_xp         = v_b_mvp_xp,
    closed_at             = now(),
    updated_at            = now()
  WHERE id = p_competition_id;

  v_snapshot := jsonb_build_object(
    'team_a_xp', v_a_xp, 'team_b_xp', v_b_xp, 'winner', v_winner,
    'team_a_mvp', v_a_mvp_id, 'team_b_mvp', v_b_mvp_id
  );
  INSERT INTO competition_snapshots(competition_id, snapshot_type, data)
  VALUES (p_competition_id, 'closing', v_snapshot);

  -- Badges
  SELECT id INTO v_ach_winner_id FROM achievements WHERE code = 'competition_april_2026_winner';
  SELECT id INTO v_ach_mvp_id    FROM achievements WHERE code = 'competition_april_2026_mvp';

  IF v_winner IN ('A', 'B') AND v_ach_winner_id IS NOT NULL THEN
    v_winning_group := CASE WHEN v_winner = 'A' THEN v_comp.team_a_group_id ELSE v_comp.team_b_group_id END;
    INSERT INTO student_achievements(student_id, achievement_id)
    SELECT s.id, v_ach_winner_id FROM students s
    WHERE s.group_id = v_winning_group AND s.deleted_at IS NULL AND s.status::text = 'active'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_a_mvp_id IS NOT NULL AND v_ach_mvp_id IS NOT NULL THEN
    INSERT INTO student_achievements(student_id, achievement_id)
    VALUES (v_a_mvp_id, v_ach_mvp_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_b_mvp_id IS NOT NULL AND v_ach_mvp_id IS NOT NULL THEN
    INSERT INTO student_achievements(student_id, achievement_id)
    VALUES (v_b_mvp_id, v_ach_mvp_id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'winner',     v_winner,
    'team_a_xp',  v_a_xp,
    'team_b_xp',  v_b_xp,
    'team_a_mvp', v_a_mvp_id,
    'team_b_mvp', v_b_mvp_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_competition TO authenticated, service_role;

-- ─── 5. get_latest_competition (active OR recently closed) ───────────────────
CREATE OR REPLACE FUNCTION public.get_latest_competition()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp competitions;
  v_xp_per int;
  v_a_xp   bigint; v_b_xp bigint;
  v_a_bonus bigint; v_b_bonus bigint;
  v_a_vp   int;   v_b_vp int;
BEGIN
  SELECT * INTO v_comp FROM competitions
  WHERE status IN ('active', 'closed')
  ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, start_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_xp_per := COALESCE(v_comp.xp_per_victory_point, 25);

  IF v_comp.status = 'closed' THEN
    v_a_vp := COALESCE(v_comp.team_a_final_vp, 0);
    v_b_vp := COALESCE(v_comp.team_b_final_vp, 0);
    v_a_xp := COALESCE(v_comp.team_a_final_xp, 0);
    v_b_xp := COALESCE(v_comp.team_b_final_xp, 0);
  ELSE
    v_a_xp    := competition_team_total_xp(v_comp.team_a_group_id);
    v_b_xp    := competition_team_total_xp(v_comp.team_b_group_id);
    v_a_bonus := COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'A'), 0);
    v_b_bonus := COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'B'), 0);
    v_a_xp    := v_a_xp + v_a_bonus;
    v_b_xp    := v_b_xp + v_b_bonus;
    v_a_vp    := (v_a_xp / v_xp_per)::int;
    v_b_vp    := (v_b_xp / v_xp_per)::int;
  END IF;

  RETURN jsonb_build_object(
    'id',               v_comp.id,
    'name',             v_comp.title_ar,
    'status',           v_comp.status,
    'winner_team',      v_comp.winner_team,
    'seconds_remaining', GREATEST(0, EXTRACT(EPOCH FROM (v_comp.end_at - now()))::int),
    'closed_at',        v_comp.closed_at,
    'team_a_mvp_id',    v_comp.team_a_mvp_student_id,
    'team_b_mvp_id',    v_comp.team_b_mvp_student_id,
    'team_a', jsonb_build_object(
      'name',           v_comp.team_a_name,
      'emoji',          v_comp.team_a_emoji,
      'color',          v_comp.team_a_color,
      'victory_points', v_a_vp,
      'total_xp',       v_a_xp,
      'group_id',       v_comp.team_a_group_id
    ),
    'team_b', jsonb_build_object(
      'name',           v_comp.team_b_name,
      'emoji',          v_comp.team_b_emoji,
      'color',          v_comp.team_b_color,
      'victory_points', v_b_vp,
      'total_xp',       v_b_xp,
      'group_id',       v_comp.team_b_group_id
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_latest_competition TO authenticated;

-- ─── 6. get_competition_admin_data ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_competition_admin_data(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp        competitions;
  v_today_start timestamptz;
  v_week_start  timestamptz;
  v_students    jsonb;
  v_bonuses     jsonb;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';
  v_week_start  := date_trunc('week', now() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';

  SELECT jsonb_agg(row ORDER BY row.total_xp DESC) INTO v_students FROM (
    SELECT
      s.id                                            AS student_id,
      COALESCE(p.display_name, p.full_name, 'طالب')  AS student_name,
      p.avatar_url,
      CASE WHEN s.group_id = v_comp.team_a_group_id THEN 'A' ELSE 'B' END AS team,
      COALESCE(SUM(xt.amount) FILTER (WHERE xt.amount > 0), 0)::int        AS total_xp,
      COALESCE(SUM(xt.amount) FILTER (WHERE xt.amount > 0 AND xt.created_at >= v_today_start), 0)::int AS today_xp,
      COALESCE(SUM(xt.amount) FILTER (WHERE xt.amount > 0 AND xt.created_at >= v_week_start), 0)::int  AS week_xp,
      (SELECT COUNT(*) FROM peer_recognitions pr WHERE pr.from_student_id = s.id AND pr.competition_id = p_competition_id)::int AS enc_sent,
      (SELECT COUNT(*) FROM peer_recognitions pr WHERE pr.to_student_id   = s.id AND pr.competition_id = p_competition_id)::int AS enc_received
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN xp_transactions xt ON xt.student_id = s.id
      AND xt.created_at >= v_comp.start_at
      AND xt.created_at <= COALESCE(v_comp.closed_at, now())
    WHERE s.group_id IN (v_comp.team_a_group_id, v_comp.team_b_group_id)
      AND s.deleted_at IS NULL AND s.status::text = 'active'
    GROUP BY s.id, p.display_name, p.full_name, p.avatar_url, s.group_id
  ) row;

  SELECT jsonb_agg(b ORDER BY b.awarded_at ASC) INTO v_bonuses
  FROM (
    SELECT team, bonus_type, amount_xp, reason_ar, metadata, awarded_at
    FROM competition_team_bonuses
    WHERE competition_id = p_competition_id
  ) b;

  RETURN jsonb_build_object(
    'students', COALESCE(v_students, '[]'::jsonb),
    'bonuses',  COALESCE(v_bonuses, '[]'::jsonb)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_competition_admin_data TO authenticated;

-- ─── 7. check_competition_milestones ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_competition_milestones()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp       competitions;
  v_days_left  int;
  v_a_xp       bigint; v_b_xp bigint;
  v_leader     text;   v_prev_leader text;
  v_notif_type notification_type := 'team_update';
  v_title      text;   v_body text;
  v_milestone  text;
  v_already    bool;
  v_student    RECORD;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN '{"error":"no_active"}'::jsonb; END IF;

  v_days_left := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_comp.end_at - now())) / 86400)::int);

  -- Current XP
  v_a_xp := competition_team_total_xp(v_comp.team_a_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'A'), 0);
  v_b_xp := competition_team_total_xp(v_comp.team_b_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'B'), 0);
  v_leader := CASE WHEN v_a_xp >= v_b_xp THEN 'A' ELSE 'B' END;

  -- Previous leader from last snapshot
  SELECT (data->>'leader')::text INTO v_prev_leader
  FROM competition_snapshots
  WHERE competition_id = v_comp.id AND snapshot_type = 'milestone_check'
  ORDER BY snapshot_at DESC LIMIT 1;

  -- Record snapshot
  INSERT INTO competition_snapshots(competition_id, snapshot_type, data)
  VALUES (v_comp.id, 'milestone_check', jsonb_build_object(
    'leader', v_leader, 'a_xp', v_a_xp, 'b_xp', v_b_xp, 'days_left', v_days_left
  ));

  -- Determine milestone to fire
  v_milestone := NULL;
  v_title     := NULL;

  IF v_prev_leader IS NOT NULL AND v_leader <> v_prev_leader THEN
    v_milestone := 'leader_change_' || v_leader;
    v_title     := format('⚡ فريق %s %s تقدّم على المنافس!',
                          CASE v_leader WHEN 'A' THEN v_comp.team_a_name ELSE v_comp.team_b_name END,
                          CASE v_leader WHEN 'A' THEN v_comp.team_a_emoji ELSE v_comp.team_b_emoji END);
    v_body      := 'انظر لوحة المسابقة — الوضع تغيّر!';
  ELSIF v_days_left = 10 THEN
    v_milestone := '10_days_left';
    v_title     := '⏰ 10 أيام فقط متبقية في المسابقة';
    v_body      := 'كل نقطة الآن تُحدث فرقاً — نشّط فريقك!';
  ELSIF v_days_left = 1 THEN
    v_milestone := '24h_left';
    v_title     := '🚨 آخر 24 ساعة في تحدي طلاقة';
    v_body      := 'الليلة تُحسم المعركة — لا تفوّت الفرصة!';
  END IF;

  IF v_milestone IS NULL THEN
    RETURN jsonb_build_object('fired', false, 'reason', 'no_milestone', 'leader', v_leader);
  END IF;

  -- Idempotency: skip if already sent today
  SELECT EXISTS (
    SELECT 1 FROM competition_snapshots
    WHERE competition_id = v_comp.id
      AND snapshot_type = 'milestone_sent'
      AND data->>'milestone' = v_milestone
      AND snapshot_at::date = CURRENT_DATE
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('fired', false, 'reason', 'already_sent', 'milestone', v_milestone);
  END IF;

  INSERT INTO competition_snapshots(competition_id, snapshot_type, data)
  VALUES (v_comp.id, 'milestone_sent', jsonb_build_object('milestone', v_milestone));

  -- Notify all students in both teams
  FOR v_student IN
    SELECT s.id, p.id AS profile_id
    FROM students s
    JOIN profiles p ON p.id = s.id
    WHERE s.group_id IN (v_comp.team_a_group_id, v_comp.team_b_group_id)
      AND s.deleted_at IS NULL AND s.status::text = 'active'
  LOOP
    INSERT INTO notifications(user_id, type, title, body, data)
    VALUES (v_student.profile_id, v_notif_type, v_title, v_body,
            jsonb_build_object('competition_id', v_comp.id, 'milestone', v_milestone))
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('fired', true, 'milestone', v_milestone, 'leader', v_leader);
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_competition_milestones TO authenticated, service_role;

-- ─── 8. Cron jobs ─────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'comp-auto-close-april-2026',
  '59 20 30 4 *',
  $$SELECT close_competition((SELECT id FROM competitions WHERE status='active' AND title_ar LIKE 'تحدي طلاقة أبريل%' LIMIT 1))$$
);

SELECT cron.schedule(
  'comp-victory-announce-april-2026',
  '4 21 30 4 *',
  $$SELECT net.http_post(
    url     := 'https://nmjexpuycmqcxuxljier.functions.supabase.co/competition-victory-announcement',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  )$$
);

SELECT cron.schedule(
  'comp-milestone-check',
  '0 15 * * *',
  $$SELECT check_competition_milestones()$$
);
