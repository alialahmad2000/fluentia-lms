-- ============================================================================
-- 144: Class Prep + Live Class Mode support
-- Adds: prep_cache to trainer_daily_rituals, 3 RPCs.
-- attendance table already exists (different schema — using as-is).
-- Idempotent. Safe to re-run.
-- ============================================================================
BEGIN;

-- A. Add prep_cache columns to trainer_daily_rituals
ALTER TABLE trainer_daily_rituals
  ADD COLUMN IF NOT EXISTS prep_cache jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prep_cache_generated_at timestamptz;

COMMENT ON COLUMN trainer_daily_rituals.prep_cache IS
  'AI class-prep analysis cache: { group_id, unit_id, talking_points[], focus_areas[], students_to_call_on[], success_story, generated_at }';

-- B. RPC: get_group_weaknesses
CREATE OR REPLACE FUNCTION get_group_weaknesses(
  p_group_id uuid,
  p_days integer DEFAULT 14
)
RETURNS TABLE (
  signal_type text,
  student_count integer,
  total_students integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM students s
  WHERE s.group_id = p_group_id
    AND COALESCE(s.status::text, 'active') = 'active'
    AND s.deleted_at IS NULL;

  RETURN QUERY
  SELECT
    si.reason_code::text AS signal_type,
    COUNT(DISTINCT si.student_id)::integer AS student_count,
    v_total AS total_students
  FROM student_interventions si
  JOIN students s ON s.id = si.student_id
  WHERE s.group_id = p_group_id
    AND si.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND si.reason_code IN ('stuck_on_unit', 'silent_48h', 'silent_7d', 'never_logged_in')
  GROUP BY si.reason_code
  ORDER BY student_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_group_weaknesses(uuid, integer) TO authenticated;

-- C. RPC: get_class_prep_context
-- Uses classes.date + classes.start_time (NOT scheduled_at)
CREATE OR REPLACE FUNCTION get_class_prep_context(
  p_trainer_id uuid,
  p_group_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group record;
  v_unit  record;
  v_next_class record;
  v_result jsonb;
  v_today date := CURRENT_DATE;
  v_now  timestamptz := NOW();
BEGIN
  IF p_group_id IS NULL THEN
    -- Pick group whose next class is soonest (date + start_time)
    SELECT g.* INTO v_group
    FROM groups g
    LEFT JOIN classes c ON c.group_id = g.id
      AND c.date >= v_today
      AND c.status = 'scheduled'
    WHERE g.trainer_id = p_trainer_id
    ORDER BY c.date ASC NULLS LAST, c.start_time ASC NULLS LAST
    LIMIT 1;
  ELSE
    SELECT * INTO v_group FROM groups WHERE id = p_group_id AND trainer_id = p_trainer_id;
  END IF;

  IF v_group.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_group_found');
  END IF;

  -- Current unit (may be NULL)
  IF v_group.current_unit_id IS NOT NULL THEN
    SELECT id, title, order_index, level_id, description
    INTO v_unit
    FROM curriculum_units
    WHERE id = v_group.current_unit_id;
  END IF;

  -- Next class (date + start_time → compute minutes until)
  SELECT
    c.id,
    c.date,
    c.start_time,
    c.end_time,
    c.title,
    c.topic,
    -- minutes from now until class start
    EXTRACT(EPOCH FROM (
      (c.date + c.start_time)::timestamptz - v_now
    )) / 60 AS minutes_until
  INTO v_next_class
  FROM classes c
  WHERE c.group_id = v_group.id
    AND c.date >= v_today
    AND c.status = 'scheduled'
  ORDER BY c.date ASC, c.start_time ASC
  LIMIT 1;

  -- Weaknesses (inline for performance)
  WITH weakness_data AS (
    SELECT
      si.reason_code::text AS signal_type,
      COUNT(DISTINCT si.student_id)::integer AS cnt
    FROM student_interventions si
    JOIN students s ON s.id = si.student_id
    WHERE s.group_id = v_group.id
      AND si.created_at > v_now - INTERVAL '14 days'
      AND si.reason_code IN ('stuck_on_unit', 'silent_48h', 'silent_7d', 'never_logged_in')
    GROUP BY si.reason_code
  )
  SELECT jsonb_build_object(
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'level', v_group.level,
      'current_unit_id', v_group.current_unit_id
    ),
    'unit', CASE WHEN v_unit.id IS NOT NULL THEN jsonb_build_object(
      'id', v_unit.id,
      'title', v_unit.title,
      'order_index', v_unit.order_index,
      'description', v_unit.description
    ) ELSE NULL END,
    'next_class', CASE WHEN v_next_class.id IS NOT NULL THEN jsonb_build_object(
      'id', v_next_class.id,
      'date', v_next_class.date,
      'start_time', v_next_class.start_time,
      'end_time', v_next_class.end_time,
      'title', v_next_class.title,
      'topic', v_next_class.topic,
      'minutes_until', v_next_class.minutes_until
    ) ELSE NULL END,
    'weaknesses', (SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb) FROM weakness_data w),
    'celebrate_students', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'student_id', si.student_id,
        'student_name', p.full_name,
        'reason', si.reason_code
      )), '[]'::jsonb)
      FROM student_interventions si
      JOIN students s ON s.id = si.student_id
      JOIN profiles p ON p.id = si.student_id
      WHERE s.group_id = v_group.id
        AND si.severity = 'celebrate'
        AND si.status = 'pending'
      LIMIT 3
    ),
    'urgent_students', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'student_id', si.student_id,
        'student_name', p.full_name,
        'reason', si.reason_code
      )), '[]'::jsonb)
      FROM student_interventions si
      JOIN students s ON s.id = si.student_id
      JOIN profiles p ON p.id = si.student_id
      WHERE s.group_id = v_group.id
        AND si.severity IN ('urgent', 'attention')
        AND si.status = 'pending'
      LIMIT 3
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_class_prep_context(uuid, uuid) TO authenticated;

-- D. RPC: close_class_session
-- Writes to class_summaries (real schema: group_id, unit_id, class_date, duration_minutes,
-- attendance_count, total_students, points_summary, trainer_notes, created_by)
CREATE OR REPLACE FUNCTION close_class_session(
  p_group_id uuid,
  p_unit_id uuid,
  p_duration_minutes integer,
  p_attended_count integer,
  p_total_count integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid := auth.uid();
  v_summary_id uuid;
  v_xp_awarded integer := 5;
BEGIN
  INSERT INTO class_summaries (
    group_id,
    unit_id,
    class_date,
    duration_minutes,
    attendance_count,
    total_students,
    trainer_notes,
    created_by
  ) VALUES (
    p_group_id,
    p_unit_id,
    CURRENT_DATE,
    p_duration_minutes,
    p_attended_count,
    p_total_count,
    p_notes,
    v_trainer_id
  )
  RETURNING id INTO v_summary_id;

  -- Award trainer XP
  PERFORM award_trainer_xp(
    v_trainer_id,
    'class_debrief',
    v_xp_awarded,
    jsonb_build_object('summary_id', v_summary_id, 'group_id', p_group_id)
  );
  PERFORM update_trainer_streak(v_trainer_id);

  RETURN jsonb_build_object(
    'summary_id', v_summary_id,
    'xp_awarded', v_xp_awarded,
    'status', 'closed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION close_class_session(uuid, uuid, integer, integer, integer, text) TO authenticated;

COMMIT;
