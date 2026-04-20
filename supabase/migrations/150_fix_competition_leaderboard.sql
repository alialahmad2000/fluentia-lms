-- Fix get_competition_leaderboard:
-- 1. Filter xp_transactions by competition period (was summing all-time XP)
-- 2. Guard against division-by-zero if xp_per_victory_point is 0

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
           COALESCE(SUM(xt.amount) FILTER (WHERE xt.amount > 0), 0) AS xp
    FROM students s
    JOIN profiles p ON p.id = s.id
    LEFT JOIN xp_transactions xt ON xt.student_id = s.id
      AND xt.created_at >= v_comp.start_at
      AND xt.created_at <= COALESCE(v_comp.closed_at, now())
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
    (xp / NULLIF(v_comp.xp_per_victory_point, 0))::int,
    DENSE_RANK() OVER (ORDER BY xp DESC)::int
  FROM txp
  ORDER BY xp DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard TO authenticated;
