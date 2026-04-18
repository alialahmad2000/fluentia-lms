BEGIN;

-- ====================================================================
-- award_trainer_xp — atomic XP insert with multiplier from current streak
-- ====================================================================
CREATE OR REPLACE FUNCTION award_trainer_xp(
  p_trainer_id uuid,
  p_event_type text,
  p_amount int,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplier numeric;
  v_row_id uuid;
  v_final int;
  v_total_today int;
BEGIN
  SELECT COALESCE(multiplier, 1.0) INTO v_multiplier
  FROM trainer_streaks WHERE trainer_id = p_trainer_id;

  IF v_multiplier IS NULL THEN v_multiplier := 1.0; END IF;

  INSERT INTO trainer_xp_events (trainer_id, event_type, amount, multiplier, context)
  VALUES (p_trainer_id, p_event_type, p_amount, v_multiplier, p_context)
  RETURNING id, final_amount INTO v_row_id, v_final;

  SELECT COALESCE(sum(final_amount), 0) INTO v_total_today
  FROM trainer_xp_events
  WHERE trainer_id = p_trainer_id
    AND day_of = (now() AT TIME ZONE 'Asia/Riyadh')::date;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_row_id,
    'final_amount', v_final,
    'multiplier', v_multiplier,
    'today_total', v_total_today
  );
END $$;

GRANT EXECUTE ON FUNCTION award_trainer_xp TO authenticated;

-- ====================================================================
-- update_trainer_streak — idempotent daily streak update
-- ====================================================================
CREATE OR REPLACE FUNCTION update_trainer_streak(
  p_trainer_id uuid,
  p_day date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := COALESCE(p_day, (now() AT TIME ZONE 'Asia/Riyadh')::date);
  v_last date;
  v_current int;
  v_longest int;
  v_new_streak int;
  v_new_mult numeric;
BEGIN
  SELECT last_active_day, current_streak, longest_streak
  INTO v_last, v_current, v_longest
  FROM trainer_streaks WHERE trainer_id = p_trainer_id;

  IF v_last IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last = v_day THEN
    RETURN jsonb_build_object('unchanged', true, 'current_streak', v_current);
  ELSIF v_last = v_day - 1 THEN
    v_new_streak := v_current + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_new_mult := CASE
    WHEN v_new_streak >= 30 THEN 2.0
    WHEN v_new_streak >= 7  THEN 1.5
    ELSE 1.0
  END;

  INSERT INTO trainer_streaks (trainer_id, current_streak, longest_streak, last_active_day, multiplier)
  VALUES (p_trainer_id, v_new_streak, GREATEST(COALESCE(v_longest, 0), v_new_streak), v_day, v_new_mult)
  ON CONFLICT (trainer_id) DO UPDATE
    SET current_streak     = EXCLUDED.current_streak,
        longest_streak     = GREATEST(trainer_streaks.longest_streak, EXCLUDED.current_streak),
        last_active_day    = EXCLUDED.last_active_day,
        multiplier         = EXCLUDED.multiplier,
        milestone_7_hit_at = CASE
          WHEN EXCLUDED.current_streak >= 7 AND trainer_streaks.milestone_7_hit_at IS NULL
          THEN now() ELSE trainer_streaks.milestone_7_hit_at END,
        milestone_30_hit_at = CASE
          WHEN EXCLUDED.current_streak >= 30 AND trainer_streaks.milestone_30_hit_at IS NULL
          THEN now() ELSE trainer_streaks.milestone_30_hit_at END,
        updated_at = now();

  RETURN jsonb_build_object(
    'current_streak', v_new_streak,
    'multiplier', v_new_mult,
    'hit_7_day_milestone',  v_new_streak = 7,
    'hit_30_day_milestone', v_new_streak = 30
  );
END $$;

GRANT EXECUTE ON FUNCTION update_trainer_streak TO authenticated;

-- ====================================================================
-- get_trainer_totals — XP totals + breakdown for My Growth page
-- ====================================================================
CREATE OR REPLACE FUNCTION get_trainer_totals(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_xp',       COALESCE(sum(final_amount), 0),
    'today_xp',       COALESCE(sum(final_amount) FILTER (WHERE day_of = (now() AT TIME ZONE 'Asia/Riyadh')::date), 0),
    'this_week_xp',   COALESCE(sum(final_amount) FILTER (WHERE day_of >= (now() AT TIME ZONE 'Asia/Riyadh')::date - 6), 0),
    'this_month_xp',  COALESCE(sum(final_amount) FILTER (WHERE day_of >= date_trunc('month', (now() AT TIME ZONE 'Asia/Riyadh')::date)), 0),
    'by_type', (
      SELECT jsonb_object_agg(event_type, total)
      FROM (
        SELECT event_type, sum(final_amount) AS total
        FROM trainer_xp_events
        WHERE trainer_id = p_trainer_id
          AND day_of >= date_trunc('month', (now() AT TIME ZONE 'Asia/Riyadh')::date)
        GROUP BY event_type
      ) x
    ),
    'streak', (
      SELECT jsonb_build_object(
        'current',     COALESCE(current_streak, 0),
        'longest',     COALESCE(longest_streak, 0),
        'multiplier',  COALESCE(multiplier, 1.0),
        'last_active', last_active_day
      )
      FROM trainer_streaks WHERE trainer_id = p_trainer_id
    )
  ) INTO v_result
  FROM trainer_xp_events WHERE trainer_id = p_trainer_id;

  RETURN COALESCE(v_result, '{"total_xp": 0, "today_xp": 0}'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION get_trainer_totals TO authenticated;

-- ====================================================================
-- get_intervention_queue — sorted queue for Cockpit / Interventions page
-- ====================================================================
CREATE OR REPLACE FUNCTION get_intervention_queue(
  p_trainer_id uuid,
  p_limit int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(q) ORDER BY q.severity_order, q.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT
        i.id, i.student_id, i.group_id, i.severity, i.reason_code, i.reason_ar,
        i.signal_data, i.suggested_action_ar, i.suggested_message_ar,
        i.status, i.snoozed_until, i.created_at,
        p.full_name AS student_name, p.avatar_url AS student_avatar,
        CASE i.severity
          WHEN 'urgent'    THEN 1
          WHEN 'attention' THEN 2
          ELSE 3
        END AS severity_order
      FROM student_interventions i
      JOIN profiles p ON p.id = i.student_id
      WHERE i.trainer_id = p_trainer_id
        AND i.status = 'pending'
        AND (i.snoozed_until IS NULL OR i.snoozed_until <= now())
      ORDER BY severity_order ASC, i.created_at DESC
      LIMIT p_limit
    ) q
  );
END $$;

GRANT EXECUTE ON FUNCTION get_intervention_queue TO authenticated;

-- ====================================================================
-- start_morning_ritual — called when trainer opens Cockpit in AM
-- ====================================================================
CREATE OR REPLACE FUNCTION start_morning_ritual(p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'Asia/Riyadh')::date;
  v_already boolean;
BEGIN
  SELECT (morning_completed_at IS NOT NULL) INTO v_already
  FROM trainer_daily_rituals WHERE trainer_id = p_trainer_id AND day_of = v_day;

  IF v_already THEN
    RETURN jsonb_build_object('already_done', true);
  END IF;

  INSERT INTO trainer_daily_rituals (trainer_id, day_of, morning_completed_at)
  VALUES (p_trainer_id, v_day, now())
  ON CONFLICT (trainer_id, day_of) DO UPDATE
    SET morning_completed_at = COALESCE(trainer_daily_rituals.morning_completed_at, now());

  PERFORM award_trainer_xp(p_trainer_id, 'morning_ritual', 3, '{}'::jsonb);
  PERFORM update_trainer_streak(p_trainer_id, v_day);

  RETURN jsonb_build_object('success', true, 'xp_awarded', 3);
END $$;

GRANT EXECUTE ON FUNCTION start_morning_ritual TO authenticated;

COMMIT;
