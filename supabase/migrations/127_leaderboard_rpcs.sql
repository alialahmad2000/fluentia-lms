-- Level leaderboard: students at the same academic_level, ranked by XP
CREATE OR REPLACE FUNCTION public.get_level_leaderboard(
  p_level integer,
  p_period text DEFAULT 'week'
)
RETURNS TABLE(
  student_id uuid,
  display_name text,
  avatar_url text,
  group_name text,
  xp_total bigint,
  rank int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_start timestamptz;
BEGIN
  v_start := CASE p_period
    WHEN 'day'   THEN date_trunc('day',   now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'week'  THEN date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'all'   THEN '-infinity'::timestamptz
    ELSE              date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
  END;

  RETURN QUERY
  SELECT
    s.id                                              AS student_id,
    COALESCE(p.display_name, p.full_name, 'طالب')::text AS display_name,
    p.avatar_url::text                                AS avatar_url,
    g.name::text                                      AS group_name,
    COALESCE(SUM(a.xp_delta), 0)::bigint             AS xp_total,
    RANK() OVER (ORDER BY COALESCE(SUM(a.xp_delta), 0) DESC)::int AS rank
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN unified_activity_log a
    ON a.student_id = s.id
    AND a.occurred_at >= v_start
  WHERE s.academic_level = p_level
    AND s.deleted_at IS NULL
  GROUP BY s.id, p.display_name, p.full_name, p.avatar_url, g.name
  ORDER BY xp_total DESC;
END;
$fn$;

-- Academy leaderboard: top 50 students across all levels
CREATE OR REPLACE FUNCTION public.get_academy_leaderboard(
  p_period text DEFAULT 'week'
)
RETURNS TABLE(
  student_id uuid,
  display_name text,
  avatar_url text,
  group_name text,
  academic_level int,
  xp_total bigint,
  rank int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_start timestamptz;
BEGIN
  v_start := CASE p_period
    WHEN 'day'   THEN date_trunc('day',   now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'week'  THEN date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'all'   THEN '-infinity'::timestamptz
    ELSE              date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
  END;

  RETURN QUERY
  SELECT
    s.id                                              AS student_id,
    COALESCE(p.display_name, p.full_name, 'طالب')::text AS display_name,
    p.avatar_url::text                                AS avatar_url,
    g.name::text                                      AS group_name,
    s.academic_level::int                             AS academic_level,
    COALESCE(SUM(a.xp_delta), 0)::bigint             AS xp_total,
    RANK() OVER (ORDER BY COALESCE(SUM(a.xp_delta), 0) DESC)::int AS rank
  FROM students s
  JOIN profiles p ON p.id = s.id
  LEFT JOIN groups g ON g.id = s.group_id
  LEFT JOIN unified_activity_log a
    ON a.student_id = s.id
    AND a.occurred_at >= v_start
  WHERE s.deleted_at IS NULL
  GROUP BY s.id, p.display_name, p.full_name, p.avatar_url, g.name, s.academic_level
  ORDER BY xp_total DESC
  LIMIT 50;
END;
$fn$;

-- Team rank: rank a group among all groups at the same level
CREATE OR REPLACE FUNCTION public.get_team_rank(
  p_group_id uuid,
  p_period text DEFAULT 'week'
)
RETURNS TABLE(
  group_id uuid,
  total_xp bigint,
  rank int,
  total_groups int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_start timestamptz;
  v_level integer;
BEGIN
  v_start := CASE p_period
    WHEN 'day'   THEN date_trunc('day',   now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'week'  THEN date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh')
    WHEN 'all'   THEN '-infinity'::timestamptz
    ELSE              date_trunc('week',  now() AT TIME ZONE 'Asia/Riyadh')
  END;

  SELECT g.level INTO v_level FROM groups g WHERE g.id = p_group_id;

  RETURN QUERY
  WITH group_xp AS (
    SELECT
      g.id AS gid,
      COALESCE(SUM(a.xp_delta), 0)::bigint AS total_xp
    FROM groups g
    LEFT JOIN students s ON s.group_id = g.id AND s.deleted_at IS NULL
    LEFT JOIN unified_activity_log a
      ON a.student_id = s.id
      AND a.occurred_at >= v_start
    WHERE g.level = v_level
    GROUP BY g.id
  ),
  ranked AS (
    SELECT
      gx.gid,
      gx.total_xp,
      RANK() OVER (ORDER BY gx.total_xp DESC)::int AS rank,
      COUNT(*) OVER ()::int AS total_groups
    FROM group_xp gx
  )
  SELECT r.gid, r.total_xp, r.rank, r.total_groups
  FROM ranked r
  WHERE r.gid = p_group_id;
END;
$fn$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_level_leaderboard(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_academy_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_rank(uuid, text) TO authenticated;
