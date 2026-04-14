-- DASH-V2-06: Update RPCs to return full display names (first + last)

-- 1. Fix get_level_top_movers: rename first_name → display_name, prefer full_name
DROP FUNCTION IF EXISTS public.get_level_top_movers(uuid);

CREATE OR REPLACE FUNCTION public.get_level_top_movers(p_student_id uuid)
RETURNS TABLE(period text, rank integer, student_id uuid, display_name text, avatar_url text, xp_in_period integer, is_caller boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_caller_level INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT academic_level INTO v_caller_level
  FROM public.students WHERE id = p_student_id;

  IF v_caller_level IS NULL THEN
    RETURN;
  END IF;

  -- Today's top 3
  RETURN QUERY
  SELECT
    'today'::TEXT AS period,
    ROW_NUMBER() OVER (ORDER BY SUM(xt.amount) DESC)::INT AS rank,
    xt.student_id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), p.display_name, 'طالب') AS display_name,
    p.avatar_url,
    SUM(xt.amount)::INT AS xp_in_period,
    (xt.student_id = p_student_id) AS is_caller
  FROM public.xp_transactions xt
  JOIN public.students s ON s.id = xt.student_id AND s.academic_level = v_caller_level AND s.show_in_leaderboard = TRUE
  JOIN public.profiles p ON p.id = xt.student_id
  WHERE xt.created_at::date = CURRENT_DATE
  GROUP BY xt.student_id, p.full_name, p.display_name, p.avatar_url
  ORDER BY xp_in_period DESC
  LIMIT 3;

  -- This week's top 3
  RETURN QUERY
  SELECT
    'week'::TEXT AS period,
    ROW_NUMBER() OVER (ORDER BY SUM(xt.amount) DESC)::INT AS rank,
    xt.student_id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), p.display_name, 'طالب') AS display_name,
    p.avatar_url,
    SUM(xt.amount)::INT AS xp_in_period,
    (xt.student_id = p_student_id) AS is_caller
  FROM public.xp_transactions xt
  JOIN public.students s ON s.id = xt.student_id AND s.academic_level = v_caller_level AND s.show_in_leaderboard = TRUE
  JOIN public.profiles p ON p.id = xt.student_id
  WHERE xt.created_at >= date_trunc('week', NOW())
  GROUP BY xt.student_id, p.full_name, p.display_name, p.avatar_url
  ORDER BY xp_in_period DESC
  LIMIT 3;
END $$;

GRANT EXECUTE ON FUNCTION public.get_level_top_movers(uuid) TO authenticated;


-- 2. Fix get_level_activity_feed: prefer full_name over display_name
CREATE OR REPLACE FUNCTION public.get_level_activity_feed(p_student_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(feed_id uuid, actor_id uuid, actor_name text, actor_avatar_url text, event_type text, event_text_ar text, event_title text, xp_amount integer, created_at timestamp with time zone, relative_time_ar text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_caller_level INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_caller AND role = 'admin'
  ) INTO v_is_admin;

  IF v_caller IS DISTINCT FROM p_student_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT academic_level INTO v_caller_level
  FROM public.students WHERE id = p_student_id;

  IF v_caller_level IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    af.id AS feed_id,
    af.student_id AS actor_id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), p.display_name, 'طالب') AS actor_name,
    p.avatar_url AS actor_avatar_url,
    af.type::TEXT AS event_type,
    af.event_text_ar,
    af.title AS event_title,
    af.xp_amount,
    af.created_at,
    CASE
      WHEN NOW() - af.created_at < INTERVAL '1 minute' THEN 'الآن'
      WHEN NOW() - af.created_at < INTERVAL '1 hour' THEN
        'منذ ' || EXTRACT(MINUTE FROM (NOW() - af.created_at))::INT::TEXT || ' دقيقة'
      WHEN NOW() - af.created_at < INTERVAL '24 hours' THEN
        'منذ ' || EXTRACT(HOUR FROM (NOW() - af.created_at))::INT::TEXT || ' ساعة'
      ELSE 'منذ ' || EXTRACT(DAY FROM (NOW() - af.created_at))::INT::TEXT || ' يوم'
    END AS relative_time_ar
  FROM public.activity_feed af
  JOIN public.students s ON s.id = af.student_id
  JOIN public.profiles p ON p.id = af.student_id
  WHERE s.academic_level = v_caller_level
    AND s.show_in_leaderboard = TRUE
    AND af.student_id <> p_student_id
    AND af.created_at > NOW() - INTERVAL '48 hours'
  ORDER BY af.created_at DESC
  LIMIT p_limit;
END $$;

GRANT EXECUTE ON FUNCTION public.get_level_activity_feed(uuid, integer) TO authenticated;
