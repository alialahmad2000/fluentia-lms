-- ============================================================================
-- 146: Student 360 RPCs — aggregations for the deep student profile page
-- Adapted for actual DB schema:
-- - students.id == profiles.id (shared UUID — no profile_id column)
-- - writing via student_curriculum_progress section_type='writing' (no writing_submissions table)
-- - speaking via speaking_recordings.ai_evaluation->>'overall_score' (no final_score column)
-- - vocab via student_curriculum_progress section_type IN ('vocabulary','vocabulary_exercise')
-- - xp_transactions.reason (no reason_code column)
-- - student_interventions: reason_ar (no short_message column)
-- - trainer_notes: content (not note_text), type: observation/encouragement/warning/reminder
-- ============================================================================
BEGIN;

-- A. Add cache columns to students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS ai_insight_cache jsonb,
  ADD COLUMN IF NOT EXISTS ai_insight_generated_at timestamptz;

-- B. RPC: get_student_360_overview — single round-trip for Hero + Skills Snapshot
CREATE OR REPLACE FUNCTION get_student_360_overview(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_name         text;
  v_avatar_url   text;
  v_email        text;
  v_phone        text;
  v_status       text;
  v_enrollment   date;
  v_last_active  timestamptz;
  v_xp_total     integer;
  v_xp_30d       integer;
  v_group_id     uuid;
  v_group_name   text;
  v_group_level  integer;
  v_caller_role  text;
  v_writing_avg  numeric;
  v_speaking_avg numeric;
  v_vocab_avg    numeric;
  v_grammar_avg  numeric;
  v_streak       integer;
BEGIN
  -- AuthZ: caller must be trainer of student's group or admin
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  SELECT s.group_id, s.xp_total, s.status, s.enrollment_date, s.last_active_at, s.current_streak,
         p.full_name, p.avatar_url, p.email, p.phone
  INTO v_group_id, v_xp_total, v_status, v_enrollment, v_last_active, v_streak,
       v_name, v_avatar_url, v_email, v_phone
  FROM students s
  JOIN profiles p ON p.id = s.id
  WHERE s.id = p_student_id
    AND s.deleted_at IS NULL;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF v_caller_role <> 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM groups WHERE id = v_group_id AND trainer_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  SELECT name, level INTO v_group_name, v_group_level FROM groups WHERE id = v_group_id;

  -- XP 30d
  SELECT COALESCE(SUM(amount), 0)::integer INTO v_xp_30d
  FROM xp_transactions
  WHERE student_id = p_student_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Writing avg (last 5 graded, score 0-100 → divide by 10)
  SELECT AVG(score::numeric / 10.0) INTO v_writing_avg
  FROM (
    SELECT score FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND section_type = 'writing'
      AND status = 'completed'
      AND score IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 5
  ) sub;

  -- Speaking avg from AI evaluation (already 0-10)
  SELECT AVG((ai_evaluation->>'overall_score')::numeric) INTO v_speaking_avg
  FROM (
    SELECT ai_evaluation FROM speaking_recordings
    WHERE student_id = p_student_id
      AND ai_evaluation IS NOT NULL
      AND (ai_evaluation->>'overall_score') IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
  ) sub;

  -- Vocab avg (0-100 → /10)
  SELECT AVG(score::numeric / 10.0) INTO v_vocab_avg
  FROM (
    SELECT score FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND section_type IN ('vocabulary', 'vocabulary_exercise')
      AND status = 'completed'
      AND score IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 10
  ) sub;

  -- Grammar avg (0-100 → /10)
  SELECT AVG(score::numeric / 10.0) INTO v_grammar_avg
  FROM (
    SELECT score FROM student_curriculum_progress
    WHERE student_id = p_student_id
      AND section_type = 'grammar'
      AND status = 'completed'
      AND score IS NOT NULL
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 5
  ) sub;

  RETURN jsonb_build_object(
    'student', jsonb_build_object(
      'id',           p_student_id,
      'name',         v_name,
      'avatar_url',   v_avatar_url,
      'email',        v_email,
      'phone',        v_phone,
      'status',       v_status,
      'enrollment_date', v_enrollment,
      'last_active_at',  v_last_active,
      'xp_total',     v_xp_total,
      'current_streak', v_streak
    ),
    'group', jsonb_build_object(
      'id',    v_group_id,
      'name',  v_group_name,
      'level', v_group_level
    ),
    'metrics', jsonb_build_object(
      'xp_total',          v_xp_total,
      'xp_30d',            v_xp_30d,
      'writing_avg',       ROUND(COALESCE(v_writing_avg, 0)::numeric, 1),
      'speaking_avg',      ROUND(COALESCE(v_speaking_avg, 0)::numeric, 1),
      'vocab_avg',         ROUND(COALESCE(v_vocab_avg, 0)::numeric, 1),
      'grammar_avg',       ROUND(COALESCE(v_grammar_avg, 0)::numeric, 1)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_360_overview(uuid) TO authenticated;

-- C. RPC: get_student_activity_timeline
CREATE OR REPLACE FUNCTION get_student_activity_timeline(
  p_student_id uuid,
  p_days integer DEFAULT 30,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  occurred_at  timestamptz,
  event_type   text,
  title        text,
  detail       text,
  payload      jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Permission check piggybacks on overview
  PERFORM get_student_360_overview(p_student_id);

  RETURN QUERY
  -- XP events
  SELECT
    xt.created_at,
    'xp'::text,
    CONCAT(CASE WHEN xt.amount > 0 THEN '+' ELSE '' END, xt.amount, ' XP'),
    COALESCE(xt.description, xt.reason, 'نشاط')::text,
    jsonb_build_object('amount', xt.amount, 'reason', xt.reason)
  FROM xp_transactions xt
  WHERE xt.student_id = p_student_id
    AND xt.created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Writing via curriculum progress
  SELECT
    COALESCE(scp.completed_at, scp.updated_at),
    'writing'::text,
    'تسليم كتابة',
    CASE
      WHEN scp.trainer_graded_at IS NOT NULL
        THEN CONCAT('درجة: ', ROUND(scp.score::numeric / 10.0, 1), '/10')
      ELSE 'بانتظار التصحيح'
    END,
    jsonb_build_object('id', scp.id, 'score', scp.score, 'graded_at', scp.trainer_graded_at)
  FROM student_curriculum_progress scp
  WHERE scp.student_id = p_student_id
    AND scp.section_type = 'writing'
    AND scp.status = 'completed'
    AND COALESCE(scp.completed_at, scp.updated_at) > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Speaking recordings
  SELECT
    sr.created_at,
    'speaking'::text,
    'تسجيل محادثة',
    CASE
      WHEN sr.trainer_reviewed = true AND sr.trainer_grade IS NOT NULL
        THEN CONCAT('درجة: ', sr.trainer_grade)
      WHEN sr.ai_evaluation IS NOT NULL
        THEN CONCAT('AI: ', ROUND((sr.ai_evaluation->>'overall_score')::numeric, 1), '/10')
      ELSE 'بانتظار التصحيح'
    END,
    jsonb_build_object('id', sr.id, 'ai_score', sr.ai_evaluation->>'overall_score', 'reviewed', sr.trainer_reviewed)
  FROM speaking_recordings sr
  WHERE sr.student_id = p_student_id
    AND sr.is_latest = true
    AND sr.created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Attendance
  SELECT
    a.created_at,
    'attendance'::text,
    CONCAT('حضور — ', CASE a.status::text
      WHEN 'present' THEN 'حاضر'
      WHEN 'absent' THEN 'غائب'
      WHEN 'late' THEN 'متأخر'
      ELSE a.status::text
    END),
    NULL::text,
    jsonb_build_object('class_id', a.class_id, 'status', a.status)
  FROM attendance a
  WHERE a.student_id = p_student_id
    AND a.created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Interventions
  SELECT
    si.created_at,
    'intervention'::text,
    CONCAT('إشارة: ', si.reason_ar),
    si.suggested_action_ar::text,
    jsonb_build_object('severity', si.severity, 'status', si.status, 'reason_code', si.reason_code)
  FROM student_interventions si
  WHERE si.student_id = p_student_id
    AND si.created_at > NOW() - (p_days || ' days')::INTERVAL

  ORDER BY occurred_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_activity_timeline(uuid, integer, integer) TO authenticated;

-- D. RPC: add_trainer_note
CREATE OR REPLACE FUNCTION add_trainer_note(
  p_student_id uuid,
  p_note_text  text,
  p_note_type  text DEFAULT 'observation'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_trainer_id uuid;
  v_note_id    uuid;
  v_type       text;
BEGIN
  v_trainer_id := auth.uid();

  -- AuthZ
  IF NOT EXISTS (
    SELECT 1 FROM students s JOIN groups g ON g.id = s.group_id
    WHERE s.id = p_student_id AND g.trainer_id = v_trainer_id
  ) AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_trainer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Map T7a note types to trainer_notes enum values
  v_type := CASE p_note_type
    WHEN 'general'      THEN 'observation'
    WHEN 'concern'      THEN 'warning'
    WHEN 'celebration'  THEN 'encouragement'
    ELSE COALESCE(p_note_type, 'observation')
  END;

  -- Clamp to valid enum values
  IF v_type NOT IN ('encouragement', 'observation', 'warning', 'reminder') THEN
    v_type := 'observation';
  END IF;

  INSERT INTO trainer_notes (trainer_id, student_id, content, note_type, created_at, updated_at)
  VALUES (v_trainer_id, p_student_id, p_note_text, v_type, NOW(), NOW())
  RETURNING id INTO v_note_id;

  RETURN jsonb_build_object('id', v_note_id, 'note_type', v_type);
END;
$$;

GRANT EXECUTE ON FUNCTION add_trainer_note(uuid, text, text) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Migration 146 applied — Student 360 RPCs + ai_insight columns ready';
END $$;

COMMIT;
