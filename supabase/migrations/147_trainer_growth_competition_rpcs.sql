-- ============================================================================
-- 147: My Growth + Competition Command RPCs
-- No new tables. Pure aggregation RPCs.
-- Adapted for actual schema:
--   - trainer_xp_events.event_type (not reason_code)
--   - trainer_xp_events.final_amount (not amount)
--   - trainer_streaks.last_active_day (not last_active_date)
--   - students.xp_total (not total_xp)
--   - students.id == profiles.id (shared UUID, no profile_id FK)
--   - competitions uses start_at/end_at (not start_date/end_date)
--   - peer_recognitions: no status field → no moderation RPC needed
--   - get_active_competition and get_competition_leaderboard already exist — not recreated
-- ============================================================================
BEGIN;

-- A. RPC: get_trainer_growth_dashboard
CREATE OR REPLACE FUNCTION get_trainer_growth_dashboard(
  p_trainer_id uuid,
  p_month_start date DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_xp_month    integer;
  v_xp_30d      integer;
  v_xp_total    integer;
  v_current_streak   integer;
  v_longest_streak   integer;
  v_multiplier       numeric;
  v_last_active_day  date;
  v_retention_pct    numeric;
  v_progress_avg     numeric;
  v_engagement_avg   numeric;
  v_kpi_score        numeric;
  v_xp_by_type       jsonb;
  v_streak_heatmap   jsonb;
  v_classes_this_month integer;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF auth.uid() <> p_trainer_id AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- XP this month
  SELECT COALESCE(SUM(final_amount), 0)::integer INTO v_xp_month
  FROM trainer_xp_events
  WHERE trainer_id = p_trainer_id
    AND created_at >= p_month_start;

  -- XP last 30 days
  SELECT COALESCE(SUM(final_amount), 0)::integer INTO v_xp_30d
  FROM trainer_xp_events
  WHERE trainer_id = p_trainer_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- XP total all-time
  SELECT COALESCE(SUM(final_amount), 0)::integer INTO v_xp_total
  FROM trainer_xp_events
  WHERE trainer_id = p_trainer_id;

  -- Streak data
  SELECT current_streak, longest_streak, multiplier, last_active_day
  INTO v_current_streak, v_longest_streak, v_multiplier, v_last_active_day
  FROM trainer_streaks WHERE trainer_id = p_trainer_id;

  -- KPI 1: Retention — active students / total students in trainer's groups
  SELECT
    CASE WHEN COUNT(*) = 0 THEN NULL
         ELSE COUNT(*) FILTER (WHERE s.status = 'active' AND s.deleted_at IS NULL) * 100.0 / COUNT(*)
    END
  INTO v_retention_pct
  FROM students s JOIN groups g ON g.id = s.group_id
  WHERE g.trainer_id = p_trainer_id;

  -- KPI 2: Progress — avg units completed per student in last 30 days
  SELECT AVG(units_done) INTO v_progress_avg
  FROM (
    SELECT s.id,
      COUNT(DISTINCT scp.unit_id) FILTER (WHERE scp.status = 'completed') as units_done
    FROM students s
    JOIN groups g ON g.id = s.group_id
    LEFT JOIN student_curriculum_progress scp ON scp.student_id = s.id
      AND scp.completed_at > NOW() - INTERVAL '30 days'
    WHERE g.trainer_id = p_trainer_id AND s.status = 'active' AND s.deleted_at IS NULL
    GROUP BY s.id
  ) sub;

  -- KPI 3: Engagement — avg activity events per student per week
  SELECT AVG(events_per_week) INTO v_engagement_avg
  FROM (
    SELECT s.id, COUNT(af.id) / 4.3 as events_per_week
    FROM students s
    JOIN groups g ON g.id = s.group_id
    LEFT JOIN activity_feed af ON af.student_id = s.id
      AND af.created_at > NOW() - INTERVAL '30 days'
    WHERE g.trainer_id = p_trainer_id AND s.status = 'active' AND s.deleted_at IS NULL
    GROUP BY s.id
  ) sub;

  -- KPI 4: Satisfaction — no rating data currently available, defaulting to NULL
  -- class_summaries.quality_ratings exists but is empty for this trainer's sessions

  -- Composite KPI score (0-100): 40% retention, 30% progress, 20% engagement, 10% satisfaction(N/A=80%)
  v_kpi_score :=
      COALESCE(v_retention_pct, 0) * 0.40
    + LEAST(COALESCE(v_progress_avg, 0) / 2.0 * 100.0, 100.0) * 0.30
    + LEAST(COALESCE(v_engagement_avg, 0) / 10.0 * 100.0, 100.0) * 0.20
    + 80.0 * 0.10;   -- satisfaction default 80% (no data)

  -- Classes this month (for compensation calculator)
  SELECT COUNT(*) INTO v_classes_this_month
  FROM class_summaries cs
  WHERE cs.created_by = p_trainer_id
    AND cs.class_date >= p_month_start;

  -- XP by event_type (last 30d)
  SELECT COALESCE(jsonb_object_agg(event_type, total), '{}'::jsonb) INTO v_xp_by_type
  FROM (
    SELECT event_type, SUM(final_amount) as total
    FROM trainer_xp_events
    WHERE trainer_id = p_trainer_id
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY event_type
  ) sub;

  -- Streak heatmap: 90 days
  SELECT jsonb_agg(jsonb_build_object(
    'date', day::date,
    'xp', COALESCE(xp_amount, 0),
    'active', xp_amount IS NOT NULL AND xp_amount > 0
  ) ORDER BY day) INTO v_streak_heatmap
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE, '1 day'::interval)::date as day
  ) days
  LEFT JOIN (
    SELECT day_of as event_day, SUM(final_amount) as xp_amount
    FROM trainer_xp_events
    WHERE trainer_id = p_trainer_id
      AND day_of > CURRENT_DATE - INTERVAL '90 days'
    GROUP BY day_of
  ) xp ON xp.event_day = day;

  RETURN jsonb_build_object(
    'xp', jsonb_build_object(
      'month',    v_xp_month,
      'last_30d', v_xp_30d,
      'all_time', v_xp_total
    ),
    'streak', jsonb_build_object(
      'current',     COALESCE(v_current_streak, 0),
      'longest',     COALESCE(v_longest_streak, 0),
      'multiplier',  COALESCE(v_multiplier, 1.0),
      'last_active', v_last_active_day
    ),
    'kpis', jsonb_build_object(
      'retention_pct',    ROUND(COALESCE(v_retention_pct, 0)::numeric, 1),
      'progress_avg',     ROUND(COALESCE(v_progress_avg, 0)::numeric, 2),
      'engagement_avg',   ROUND(COALESCE(v_engagement_avg, 0)::numeric, 1),
      'satisfaction_avg', NULL,
      'composite_score',  ROUND(v_kpi_score::numeric, 1)
    ),
    'xp_by_type',     COALESCE(v_xp_by_type, '{}'::jsonb),
    'streak_heatmap', COALESCE(v_streak_heatmap, '[]'::jsonb),
    'classes_this_month', COALESCE(v_classes_this_month, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_trainer_growth_dashboard(uuid, date) TO authenticated;

-- B. RPC: get_trainer_xp_timeline — daily XP by event_type for stacked chart
CREATE OR REPLACE FUNCTION get_trainer_xp_timeline(
  p_trainer_id uuid,
  p_days       integer DEFAULT 30
)
RETURNS TABLE (
  day        date,
  event_type text,
  total_xp   integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() <> p_trainer_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('day', te.created_at)::date,
    te.event_type::text,
    SUM(te.final_amount)::integer
  FROM trainer_xp_events te
  WHERE te.trainer_id = p_trainer_id
    AND te.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trainer_xp_timeline(uuid, integer) TO authenticated;

-- C. Add optional moderation columns to peer_recognitions for future use
--    (peer_recognitions currently has no status field; 0 rows)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'peer_recognitions') THEN
    BEGIN
      ALTER TABLE peer_recognitions
        ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES profiles(id),
        ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 147 applied — Growth + Competition RPCs ready';
END $$;

COMMIT;
