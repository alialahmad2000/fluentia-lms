BEGIN;

-- ============================================================
-- 134 — Competition Foundation (Tables + RPCs + Seed)
-- Phase-0 adaptations:
--   • units → curriculum_units, joined via curriculum_levels(level_number)
--   • student names in profiles table (JOIN profiles ON profiles.id = students.id)
--   • student_curriculum_progress has status='completed' (no overall_percent)
--   • xp_reason enum has 'peer_recognition'
--   • TEAM_A = bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb (المجموعة 2, level 1)
--   • TEAM_B = aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa (المجموعة 4, level 3)
-- ============================================================

-- ─── 1. TABLES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.competitions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar                  text NOT NULL,
  title_en                  text,
  description_ar            text,
  start_at                  timestamptz NOT NULL,
  end_at                    timestamptz NOT NULL,
  status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('draft','active','closed')),

  team_a_group_id           uuid NOT NULL REFERENCES groups(id),
  team_a_name               text NOT NULL,
  team_a_color              text NOT NULL DEFAULT '#38bdf8',
  team_a_emoji              text NOT NULL DEFAULT '🔵',
  team_a_battle_cry         text,

  team_b_group_id           uuid NOT NULL REFERENCES groups(id),
  team_b_name               text NOT NULL,
  team_b_color              text NOT NULL DEFAULT '#ef4444',
  team_b_emoji              text NOT NULL DEFAULT '🔴',
  team_b_battle_cry         text,

  xp_per_victory_point      integer NOT NULL DEFAULT 50,
  daily_streak_threshold_pct integer NOT NULL DEFAULT 80,
  weekly_goal_unit_pct      integer NOT NULL DEFAULT 70,

  winner_team               text CHECK (winner_team IN ('A','B','tie')),
  team_a_final_xp           bigint,
  team_b_final_xp           bigint,
  team_a_final_vp           integer,
  team_b_final_vp           integer,
  team_a_mvp_student_id     uuid REFERENCES students(id),
  team_b_mvp_student_id     uuid REFERENCES students(id),
  team_a_mvp_xp             integer,
  team_b_mvp_xp             integer,
  closed_at                 timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competition_team_bonuses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team           text NOT NULL CHECK (team IN ('A','B')),
  bonus_type     text NOT NULL CHECK (bonus_type IN ('daily_streak','weekly_goal','milestone','team_moment')),
  amount_xp      integer NOT NULL,
  reason_ar      text NOT NULL,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  awarded_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ctb_comp_team ON competition_team_bonuses(competition_id, team);

CREATE TABLE IF NOT EXISTS public.competition_team_streaks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team             text NOT NULL CHECK (team IN ('A','B')),
  current_streak   integer NOT NULL DEFAULT 0,
  longest_streak   integer NOT NULL DEFAULT 0,
  last_active_date date,
  last_check_date  date,
  UNIQUE(competition_id, team)
);

CREATE TABLE IF NOT EXISTS public.competition_weekly_goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id      uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team                text NOT NULL CHECK (team IN ('A','B')),
  week_num            integer NOT NULL CHECK (week_num > 0),
  week_start_date     date NOT NULL,
  week_end_date       date NOT NULL,
  target_unit_number  integer NOT NULL,
  required_pct        integer NOT NULL DEFAULT 70,
  bonus_tiers         jsonb NOT NULL DEFAULT '[{"pct":50,"xp":150},{"pct":70,"xp":400},{"pct":90,"xp":800},{"pct":100,"xp":1200}]'::jsonb,
  evaluated_at        timestamptz,
  final_pct           integer,
  bonus_awarded_xp    integer NOT NULL DEFAULT 0,
  UNIQUE(competition_id, team, week_num)
);

CREATE TABLE IF NOT EXISTS public.competition_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id),
  snapshot_type  text NOT NULL CHECK (snapshot_type IN ('kickoff','daily','midpoint','closing','manual')),
  snapshot_at    timestamptz NOT NULL DEFAULT now(),
  data           jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.competition_announcements_seen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id    uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  announcement_type text NOT NULL CHECK (announcement_type IN ('kickoff','victory')),
  seen_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, student_id, announcement_type)
);

-- Verify 6 tables created
DO $$
DECLARE v_cnt int;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('competitions','competition_team_bonuses','competition_team_streaks',
                       'competition_weekly_goals','competition_snapshots','competition_announcements_seen');
  IF v_cnt < 6 THEN RAISE EXCEPTION 'Expected 6 tables, found %', v_cnt; END IF;
END $$;

-- ─── 2. RLS ──────────────────────────────────────────────────

ALTER TABLE competitions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_team_bonuses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_team_streaks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_weekly_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_announcements_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_competitions"
  ON competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bonuses"
  ON competition_team_bonuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_streaks"
  ON competition_team_streaks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_goals"
  ON competition_weekly_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_snapshots"
  ON competition_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_own_seen"
  ON competition_announcements_seen FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "admin_all_competitions"
  ON competitions FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'));
CREATE POLICY "admin_all_bonuses"
  ON competition_team_bonuses FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'));
CREATE POLICY "admin_all_streaks"
  ON competition_team_streaks FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'));
CREATE POLICY "admin_all_goals"
  ON competition_weekly_goals FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'));
CREATE POLICY "admin_all_snapshots"
  ON competition_snapshots FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = 'admin'));

-- ─── 3. RPCS ─────────────────────────────────────────────────

-- Helper: live all-time team XP from xp_transactions
CREATE OR REPLACE FUNCTION public.competition_team_total_xp(p_group_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(xt.amount), 0)::bigint
  FROM xp_transactions xt
  JOIN students s ON s.id = xt.student_id
  WHERE s.group_id = p_group_id
    AND s.deleted_at IS NULL
    AND s.status::text = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.competition_team_total_xp TO authenticated;

-- 1) get_active_competition
CREATE OR REPLACE FUNCTION public.get_active_competition()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_comp   competitions;
  v_a_xp   bigint; v_b_xp   bigint;
  v_a_bonus bigint; v_b_bonus bigint;
  v_a_streak competition_team_streaks; v_b_streak competition_team_streaks;
  v_week_num integer;
  v_a_goal  competition_weekly_goals; v_b_goal competition_weekly_goals;
  v_vp_unit integer;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_vp_unit := v_comp.xp_per_victory_point;

  v_a_xp := competition_team_total_xp(v_comp.team_a_group_id);
  v_b_xp := competition_team_total_xp(v_comp.team_b_group_id);

  SELECT COALESCE(SUM(amount_xp), 0) INTO v_a_bonus
    FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'A';
  SELECT COALESCE(SUM(amount_xp), 0) INTO v_b_bonus
    FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'B';

  v_a_xp := v_a_xp + v_a_bonus;
  v_b_xp := v_b_xp + v_b_bonus;

  v_week_num := GREATEST(1, LEAST(2,
    CEIL(EXTRACT(EPOCH FROM (now() - v_comp.start_at)) / 604800.0)::int
  ));

  SELECT * INTO v_a_streak FROM competition_team_streaks WHERE competition_id = v_comp.id AND team = 'A';
  SELECT * INTO v_b_streak FROM competition_team_streaks WHERE competition_id = v_comp.id AND team = 'B';
  SELECT * INTO v_a_goal FROM competition_weekly_goals WHERE competition_id = v_comp.id AND team = 'A' AND week_num = v_week_num;
  SELECT * INTO v_b_goal FROM competition_weekly_goals WHERE competition_id = v_comp.id AND team = 'B' AND week_num = v_week_num;

  RETURN jsonb_build_object(
    'id',                v_comp.id,
    'title_ar',          v_comp.title_ar,
    'description_ar',    v_comp.description_ar,
    'start_at',          v_comp.start_at,
    'end_at',            v_comp.end_at,
    'status',            v_comp.status,
    'seconds_remaining', GREATEST(0, EXTRACT(EPOCH FROM (v_comp.end_at - now()))::bigint),
    'current_week',      v_week_num,
    'xp_per_victory_point', v_vp_unit,
    'team_a', jsonb_build_object(
      'group_id',       v_comp.team_a_group_id,
      'name',           v_comp.team_a_name,
      'color',          v_comp.team_a_color,
      'emoji',          v_comp.team_a_emoji,
      'battle_cry',     v_comp.team_a_battle_cry,
      'total_xp',       v_a_xp,
      'bonus_xp',       v_a_bonus,
      'victory_points', (v_a_xp / v_vp_unit)::int,
      'xp_to_next_vp',  CASE WHEN v_a_xp % v_vp_unit = 0 THEN v_vp_unit ELSE v_vp_unit - (v_a_xp % v_vp_unit) END,
      'streak',         COALESCE(to_jsonb(v_a_streak), '{}'::jsonb),
      'weekly_goal',    COALESCE(to_jsonb(v_a_goal),   '{}'::jsonb)
    ),
    'team_b', jsonb_build_object(
      'group_id',       v_comp.team_b_group_id,
      'name',           v_comp.team_b_name,
      'color',          v_comp.team_b_color,
      'emoji',          v_comp.team_b_emoji,
      'battle_cry',     v_comp.team_b_battle_cry,
      'total_xp',       v_b_xp,
      'bonus_xp',       v_b_bonus,
      'victory_points', (v_b_xp / v_vp_unit)::int,
      'xp_to_next_vp',  CASE WHEN v_b_xp % v_vp_unit = 0 THEN v_vp_unit ELSE v_vp_unit - (v_b_xp % v_vp_unit) END,
      'streak',         COALESCE(to_jsonb(v_b_streak), '{}'::jsonb),
      'weekly_goal',    COALESCE(to_jsonb(v_b_goal),   '{}'::jsonb)
    ),
    'leader',   CASE WHEN v_a_xp > v_b_xp THEN 'A' WHEN v_b_xp > v_a_xp THEN 'B' ELSE 'tie' END,
    'gap_xp',   ABS(v_a_xp - v_b_xp),
    'gap_vp',   ABS((v_a_xp / v_vp_unit)::int - (v_b_xp / v_vp_unit)::int)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_competition TO authenticated;

-- 2) get_competition_student_context
CREATE OR REPLACE FUNCTION public.get_competition_student_context(p_profile_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_comp     competitions;
  v_group    uuid;
  v_team     text;
  v_student_xp bigint;
  v_rank     int; v_team_size int;
  v_encouragements_sent_today int;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE status = 'active' ORDER BY start_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('in_competition', false); END IF;

  SELECT group_id INTO v_group FROM students WHERE id = p_profile_id AND deleted_at IS NULL;
  v_team := CASE
    WHEN v_group = v_comp.team_a_group_id THEN 'A'
    WHEN v_group = v_comp.team_b_group_id THEN 'B'
    ELSE NULL
  END;
  IF v_team IS NULL THEN RETURN jsonb_build_object('in_competition', false); END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_student_xp
    FROM xp_transactions WHERE student_id = p_profile_id;

  WITH team_xp AS (
    SELECT s.id, COALESCE(SUM(xt.amount), 0) AS xp
    FROM students s
    LEFT JOIN xp_transactions xt ON xt.student_id = s.id
    WHERE s.group_id = CASE WHEN v_team = 'A' THEN v_comp.team_a_group_id ELSE v_comp.team_b_group_id END
      AND s.deleted_at IS NULL AND s.status::text = 'active'
    GROUP BY s.id
  ),
  ranked AS (SELECT id, xp, DENSE_RANK() OVER (ORDER BY xp DESC) r FROM team_xp)
  SELECT r, (SELECT COUNT(*) FROM team_xp)
  INTO v_rank, v_team_size
  FROM ranked WHERE id = p_profile_id;

  SELECT COUNT(*) INTO v_encouragements_sent_today
  FROM peer_recognitions
  WHERE from_student = p_profile_id
    AND created_at >= (now() AT TIME ZONE 'Asia/Riyadh')::date AT TIME ZONE 'Asia/Riyadh';

  RETURN jsonb_build_object(
    'in_competition',          true,
    'competition_id',          v_comp.id,
    'team',                    v_team,
    'team_name',               CASE WHEN v_team = 'A' THEN v_comp.team_a_name ELSE v_comp.team_b_name END,
    'team_color',              CASE WHEN v_team = 'A' THEN v_comp.team_a_color ELSE v_comp.team_b_color END,
    'team_emoji',              CASE WHEN v_team = 'A' THEN v_comp.team_a_emoji ELSE v_comp.team_b_emoji END,
    'battle_cry',              CASE WHEN v_team = 'A' THEN v_comp.team_a_battle_cry ELSE v_comp.team_b_battle_cry END,
    'student_xp',              v_student_xp,
    'student_victory_points',  (v_student_xp / v_comp.xp_per_victory_point)::int,
    'rank_in_team',            v_rank,
    'team_size',               v_team_size,
    'encouragements_sent_today', v_encouragements_sent_today,
    'encouragements_daily_limit', 5
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_competition_student_context TO authenticated;

-- 3) get_competition_leaderboard
-- Phase-0 adaptation: names from profiles table (no first_name/last_name on students)
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(
  p_competition_id uuid,
  p_team           text,
  p_limit          int DEFAULT 10
)
RETURNS TABLE(student_id uuid, display_name text, avatar_url text, total_xp bigint, victory_points int, rank int)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_comp  competitions;
  v_group uuid;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_group := CASE WHEN p_team = 'A' THEN v_comp.team_a_group_id ELSE v_comp.team_b_group_id END;

  RETURN QUERY
  WITH txp AS (
    SELECT s.id AS sid,
           COALESCE(p.display_name, p.full_name, 'طالب') AS dname,
           p.avatar_url AS aurl,
           COALESCE(SUM(xt.amount), 0) AS xp
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN xp_transactions xt ON xt.student_id = s.id
    WHERE s.group_id = v_group
      AND s.deleted_at IS NULL
      AND s.status::text = 'active'
    GROUP BY s.id, p.display_name, p.full_name, p.avatar_url
  )
  SELECT
    sid,
    dname,
    aurl,
    xp::bigint,
    (xp / v_comp.xp_per_victory_point)::int,
    DENSE_RANK() OVER (ORDER BY xp DESC)::int
  FROM txp
  ORDER BY xp DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard TO authenticated;

-- 4) get_competition_feed
-- Phase-0 adaptation: names from profiles table
CREATE OR REPLACE FUNCTION public.get_competition_feed(
  p_competition_id uuid,
  p_limit          int DEFAULT 20
)
RETURNS TABLE(xp_id uuid, team text, student_id uuid, display_name text, amount int, reason text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_comp competitions;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    xt.id,
    CASE WHEN s.group_id = v_comp.team_a_group_id THEN 'A' ELSE 'B' END,
    s.id,
    COALESCE(p.display_name, p.full_name, 'طالب'),
    xt.amount,
    xt.reason::text,
    xt.created_at
  FROM xp_transactions xt
  JOIN students s  ON s.id = xt.student_id
  JOIN profiles p  ON p.id = s.id
  WHERE s.group_id IN (v_comp.team_a_group_id, v_comp.team_b_group_id)
    AND s.deleted_at IS NULL
    AND xt.amount > 0
  ORDER BY xt.created_at DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_competition_feed TO authenticated;

-- 5) check_team_streak_daily (cron: 00:05 Riyadh = 21:05 UTC)
CREATE OR REPLACE FUNCTION public.check_team_streak_daily()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp      competitions;
  v_yesterday date;
  v_result    jsonb := '{}'::jsonb;
  v_team      text; v_group uuid;
  v_size      int;  v_active int;
  v_thresh    int;  v_is_active bool;
  v_cur_streak int; v_bonus int; v_reason text;
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

    IF v_is_active THEN
      UPDATE competition_team_streaks
      SET current_streak  = current_streak + 1,
          longest_streak  = GREATEST(longest_streak, current_streak + 1),
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
    ELSE
      UPDATE competition_team_streaks
      SET current_streak = 0, last_check_date = v_yesterday
      WHERE competition_id = v_comp.id AND team = v_team;
      v_cur_streak := 0;
    END IF;

    v_result := v_result || jsonb_build_object(v_team, jsonb_build_object(
      'active',        v_active,
      'team_size',     v_size,
      'is_active_day', v_is_active,
      'current_streak', v_cur_streak,
      'bonus_xp',      COALESCE(v_bonus, 0)
    ));
  END LOOP;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_team_streak_daily TO authenticated;

-- 6) check_weekly_goal (cron: Sun 00:10 Riyadh = Sat 21:10 UTC)
-- Phase-0 adaptation:
--   • curriculum_units (not units), joined via curriculum_levels on level_number
--   • no overall_percent → use status='completed' (student engaged ≥1 section)
CREATE OR REPLACE FUNCTION public.check_weekly_goal()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp       competitions;
  v_goal       competition_weekly_goals;
  v_today      date;
  v_result     jsonb := '[]'::jsonb;
  v_group      uuid;
  v_team_size  int;
  v_completed  int;
  v_pct        int;
  v_bonus      int;
  v_tier       jsonb;
  v_applied_tier jsonb;
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

    -- Count students who have at least one completed section for the target unit
    -- (unit identified via curriculum_levels.level_number → curriculum_units.level_id)
    SELECT COUNT(DISTINCT s.id) INTO v_completed
    FROM students s
    JOIN groups g  ON g.id = s.group_id
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
              jsonb_build_object(
                'week_num',    v_goal.week_num,
                'pct',         v_pct,
                'target_unit', v_goal.target_unit_number,
                'tier',        v_applied_tier
              ));
    END IF;

    v_result := v_result || jsonb_build_object(
      'team',  v_goal.team,
      'week',  v_goal.week_num,
      'pct',   v_pct,
      'bonus', v_bonus
    );
  END LOOP;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_weekly_goal TO authenticated;

-- 7) send_peer_encouragement
CREATE OR REPLACE FUNCTION public.send_peer_encouragement(p_to_student_id uuid, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from        uuid := auth.uid();
  v_today_count int;
  v_limit       int := 5;
BEGIN
  IF v_from IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_to_student_id = v_from THEN RAISE EXCEPTION 'self_encouragement_not_allowed'; END IF;

  SELECT COUNT(*) INTO v_today_count
  FROM peer_recognitions
  WHERE from_student = v_from
    AND created_at >= (now() AT TIME ZONE 'Asia/Riyadh')::date AT TIME ZONE 'Asia/Riyadh';

  IF v_today_count >= v_limit THEN RAISE EXCEPTION 'daily_limit_reached'; END IF;

  INSERT INTO peer_recognitions(from_student, to_student, message, xp_awarded)
  VALUES (v_from, p_to_student_id, LEFT(p_message, 200), 3);

  INSERT INTO xp_transactions(student_id, amount, reason, description)
  VALUES
    (v_from,           2, 'peer_recognition'::xp_reason, 'تشجيع زميل'),
    (p_to_student_id,  3, 'peer_recognition'::xp_reason, 'استقبلت تشجيع');

  RETURN jsonb_build_object(
    'success',         true,
    'remaining_today', v_limit - v_today_count - 1
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_peer_encouragement TO authenticated;

-- 8) close_competition (admin-only)
CREATE OR REPLACE FUNCTION public.close_competition(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp       competitions;
  v_a_xp       bigint; v_b_xp bigint;
  v_winner     text;
  v_a_mvp_id   uuid; v_b_mvp_id uuid;
  v_a_mvp_xp   int;  v_b_mvp_xp int;
  v_snapshot   jsonb;
  v_ach_winner_id uuid; v_ach_mvp_a_id uuid; v_ach_mvp_b_id uuid;
  v_winning_group uuid;
BEGIN
  -- Admin check (allow service_role with no auth.uid)
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text = 'admin') THEN
      RAISE EXCEPTION 'admin_only';
    END IF;
  END IF;

  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'competition_not_found'; END IF;
  IF v_comp.status = 'closed' THEN
    RETURN jsonb_build_object('already_closed', true, 'winner', v_comp.winner_team);
  END IF;

  v_a_xp := competition_team_total_xp(v_comp.team_a_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'A'), 0);
  v_b_xp := competition_team_total_xp(v_comp.team_b_group_id) +
             COALESCE((SELECT SUM(amount_xp) FROM competition_team_bonuses WHERE competition_id = v_comp.id AND team = 'B'), 0);

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
    status              = 'closed',
    winner_team         = v_winner,
    team_a_final_xp     = v_a_xp,
    team_b_final_xp     = v_b_xp,
    team_a_final_vp     = (v_a_xp / xp_per_victory_point)::int,
    team_b_final_vp     = (v_b_xp / xp_per_victory_point)::int,
    team_a_mvp_student_id = v_a_mvp_id,
    team_a_mvp_xp       = v_a_mvp_xp,
    team_b_mvp_student_id = v_b_mvp_id,
    team_b_mvp_xp       = v_b_mvp_xp,
    closed_at           = now(),
    updated_at          = now()
  WHERE id = p_competition_id;

  v_snapshot := jsonb_build_object(
    'team_a_xp', v_a_xp, 'team_b_xp', v_b_xp, 'winner', v_winner,
    'team_a_mvp', v_a_mvp_id, 'team_b_mvp', v_b_mvp_id
  );
  INSERT INTO competition_snapshots(competition_id, snapshot_type, data)
  VALUES (p_competition_id, 'closing', v_snapshot);

  -- Badges via achievements + student_achievements
  INSERT INTO achievements(code, name_ar, name_en, description_ar, icon, xp_reward, is_active)
  VALUES
    ('competition_april_2026_winner', 'بطل تحدي أبريل', 'April Challenge Winner', 'فريقك فاز في تحدي طلاقة أبريل 2026', '🏆', 0, true),
    ('competition_april_2026_mvp_a',  'أفضل لاعب A1',   'Team A1 MVP',           'الأفضل في فريق A1 في تحدي أبريل 2026',  '⭐', 0, true),
    ('competition_april_2026_mvp_b',  'أفضل لاعب B1',   'Team B1 MVP',           'الأفضل في فريق B1 في تحدي أبريل 2026',  '⭐', 0, true)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_ach_winner_id FROM achievements WHERE code = 'competition_april_2026_winner';
  SELECT id INTO v_ach_mvp_a_id  FROM achievements WHERE code = 'competition_april_2026_mvp_a';
  SELECT id INTO v_ach_mvp_b_id  FROM achievements WHERE code = 'competition_april_2026_mvp_b';

  -- Winner badges for all students in winning group
  IF v_winner IN ('A','B') THEN
    v_winning_group := CASE WHEN v_winner = 'A' THEN v_comp.team_a_group_id ELSE v_comp.team_b_group_id END;
    INSERT INTO student_achievements(student_id, achievement_id)
    SELECT s.id, v_ach_winner_id FROM students s
    WHERE s.group_id = v_winning_group AND s.deleted_at IS NULL AND s.status::text = 'active'
    ON CONFLICT DO NOTHING;
  END IF;

  -- MVP badges
  IF v_a_mvp_id IS NOT NULL THEN
    INSERT INTO student_achievements(student_id, achievement_id)
    VALUES (v_a_mvp_id, v_ach_mvp_a_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_b_mvp_id IS NOT NULL THEN
    INSERT INTO student_achievements(student_id, achievement_id)
    VALUES (v_b_mvp_id, v_ach_mvp_b_id) ON CONFLICT DO NOTHING;
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

-- ─── 4. SEED ─────────────────────────────────────────────────

INSERT INTO competitions(
  title_ar, title_en, description_ar,
  start_at, end_at,
  team_a_group_id, team_a_name, team_a_color, team_a_emoji, team_a_battle_cry,
  team_b_group_id, team_b_name, team_b_color, team_b_emoji, team_b_battle_cry
) VALUES (
  'تحدي طلاقة أبريل ⚔️',
  'Fluentia April Challenge',
  'مسابقة جماعية بين فريق A1 وفريق B1 — كل نقطة تُحسب، كل طالب يصنع الفرق',
  '2026-04-17 00:00:00+03'::timestamptz,
  '2026-04-30 23:59:59+03'::timestamptz,
  'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'فريق A1', '#38bdf8', '🔵', 'قوتنا في اتحادنا 🔵',
  'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', 'فريق B1', '#ef4444', '🔴', 'قلّة العدد، عظمة الجودة 🔴'
);

-- Weekly goals (all 4 rows)
INSERT INTO competition_weekly_goals(competition_id, team, week_num, week_start_date, week_end_date, target_unit_number)
SELECT id, t, w, s::date, e::date, u
FROM competitions,
  (VALUES
    ('A'::text, 1, '2026-04-17', '2026-04-23', 4),
    ('B'::text, 1, '2026-04-17', '2026-04-23', 4),
    ('A'::text, 2, '2026-04-24', '2026-04-30', 5),
    ('B'::text, 2, '2026-04-24', '2026-04-30', 5)
  ) AS v(t, w, s, e, u)
WHERE status = 'active';

-- Streak rows
INSERT INTO competition_team_streaks(competition_id, team)
SELECT id, t FROM competitions, (VALUES ('A'::text), ('B'::text)) AS v(t)
WHERE status = 'active'
ON CONFLICT DO NOTHING;

-- Kickoff snapshot
INSERT INTO competition_snapshots(competition_id, snapshot_type, data)
SELECT id,
  'kickoff',
  jsonb_build_object(
    'team_a_group_id', team_a_group_id,
    'team_b_group_id', team_b_group_id,
    'team_a_xp_at_kickoff', 9741,
    'team_b_xp_at_kickoff', 2157,
    'note', 'Pre-competition XP captured at migration time 2026-04-17'
  )
FROM competitions WHERE status = 'active';

-- Rowcount assertions
DO $$
DECLARE
  v_comp  int; v_goals int; v_streaks int;
BEGIN
  SELECT COUNT(*) INTO v_comp   FROM competitions   WHERE status = 'active';
  SELECT COUNT(*) INTO v_goals  FROM competition_weekly_goals;
  SELECT COUNT(*) INTO v_streaks FROM competition_team_streaks;
  IF v_comp   <  1 THEN RAISE EXCEPTION 'Seed: no active competition'; END IF;
  IF v_goals  <  4 THEN RAISE EXCEPTION 'Seed: expected 4 weekly goal rows, got %', v_goals; END IF;
  IF v_streaks < 2 THEN RAISE EXCEPTION 'Seed: expected 2 streak rows, got %', v_streaks; END IF;
END $$;

COMMIT;
