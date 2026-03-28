-- RPC function: count distinct active users in a time range
-- Used by admin analytics dashboard

CREATE OR REPLACE FUNCTION count_distinct_users_in_range(start_ts timestamptz, end_ts timestamptz)
RETURNS TABLE(count bigint) AS $$
  SELECT COUNT(DISTINCT user_id) AS count
  FROM user_sessions
  WHERE started_at >= start_ts AND started_at <= end_ts;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant access
GRANT EXECUTE ON FUNCTION count_distinct_users_in_range TO authenticated;
