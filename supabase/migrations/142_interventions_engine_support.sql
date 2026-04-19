BEGIN;

-- ============================================
-- act_on_intervention — unified action handler
-- ============================================
CREATE OR REPLACE FUNCTION act_on_intervention(
  p_intervention_id uuid,
  p_action text,
  p_trainer_id uuid,
  p_notes text DEFAULT NULL,
  p_snooze_hours int DEFAULT 24
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row student_interventions%ROWTYPE;
  v_xp int;
  v_event_type text;
BEGIN
  SELECT * INTO v_row FROM student_interventions
  WHERE id = p_intervention_id AND trainer_id = p_trainer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found_or_unauthorized');
  END IF;

  IF v_row.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_processed', 'current_status', v_row.status);
  END IF;

  IF p_action = 'acted' THEN
    UPDATE student_interventions SET
      status = 'acted',
      acted_at = now(),
      acted_notes = p_notes
    WHERE id = p_intervention_id;

    v_xp := CASE v_row.severity
      WHEN 'urgent'    THEN 10
      WHEN 'attention' THEN 5
      WHEN 'celebrate' THEN 3
      ELSE 5
    END;
    v_event_type := CASE v_row.severity
      WHEN 'urgent' THEN 'intervention_silent'
      ELSE 'intervention_support'
    END;

    PERFORM award_trainer_xp(
      p_trainer_id,
      v_event_type,
      v_xp,
      jsonb_build_object(
        'student_id', v_row.student_id,
        'intervention_id', p_intervention_id,
        'reason_code', v_row.reason_code,
        'severity', v_row.severity
      )
    );
    PERFORM update_trainer_streak(p_trainer_id);

    RETURN jsonb_build_object('success', true, 'action', 'acted', 'xp_awarded', v_xp);

  ELSIF p_action = 'snoozed' THEN
    UPDATE student_interventions SET
      status = 'snoozed',
      snoozed_until = now() + (p_snooze_hours || ' hours')::interval
    WHERE id = p_intervention_id;
    RETURN jsonb_build_object('success', true, 'action', 'snoozed',
      'until', (now() + (p_snooze_hours || ' hours')::interval)::text);

  ELSIF p_action = 'dismissed' THEN
    UPDATE student_interventions SET
      status = 'dismissed',
      dismissed_at = now()
    WHERE id = p_intervention_id;
    RETURN jsonb_build_object('success', true, 'action', 'dismissed');

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION act_on_intervention TO authenticated;

-- ============================================
-- unsnooze_expired_interventions — cron helper
-- ============================================
CREATE OR REPLACE FUNCTION unsnooze_expired_interventions() RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE student_interventions
  SET status = 'pending', snoozed_until = NULL
  WHERE status = 'snoozed' AND snoozed_until <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION unsnooze_expired_interventions TO service_role;

-- ============================================
-- expire_stale_interventions — 7-day expiry
-- ============================================
CREATE OR REPLACE FUNCTION expire_stale_interventions(p_days int DEFAULT 7) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE student_interventions
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION expire_stale_interventions TO service_role;

-- ============================================
-- get_intervention_detail — full fetch for modal
-- ============================================
CREATE OR REPLACE FUNCTION get_intervention_detail(p_id uuid, p_trainer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'intervention', row_to_json(i),
    'student', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'last_active_at', COALESCE(s.last_active_at, p.last_active_at),
      'xp_total', s.xp_total,
      'current_streak', s.current_streak,
      'team_id', s.team_id,
      'group_id', s.group_id
    ),
    'group', jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'level', g.level
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(af) ORDER BY af.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT created_at, activity_type, xp_earned, description
        FROM activity_feed
        WHERE user_id = i.student_id
        ORDER BY created_at DESC LIMIT 5
      ) af
    )
  ) INTO v_result
  FROM student_interventions i
  JOIN profiles p ON p.id = i.student_id
  LEFT JOIN students s ON s.id = i.student_id
  LEFT JOIN groups g ON g.id = i.group_id
  WHERE i.id = p_id AND (i.trainer_id = p_trainer_id OR is_admin());

  RETURN COALESCE(v_result, '{"error": "not_found"}'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION get_intervention_detail TO authenticated;

COMMIT;
