-- ============================================================
-- V3.0 TRIAGE — 2026-05-10
-- Two production bugs identified in TRAINER-PORTAL-V3-AUDIT-2026-05-09.md
--
-- Fix 1: get_student_activity_timeline — COALESCE type mismatch
--   xp_transactions.reason is xp_reason enum; COALESCE cannot unify
--   enum and text without an explicit cast inside the expression.
--
-- Fix 2: Dr. Mohammed Sharbat — trainer account restoration
--   trainers.is_active was false; المجموعة 2 was under Rasheed.
--   Restoring to intended state: Dr. Mohammed owns المجموعة 2 (A1, level 1),
--   Rasheed retains المجموعة 4 (B1, level 3).
--   IMPACT: Rasheed loses visibility of the 10 students in المجموعة 2.
-- ============================================================

-- ── Fix 1: get_student_activity_timeline ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_student_activity_timeline(
  p_student_id uuid,
  p_days       integer DEFAULT 30,
  p_limit      integer DEFAULT 100
)
RETURNS TABLE(
  occurred_at timestamp with time zone,
  event_type  text,
  title       text,
  detail      text,
  payload     jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Permission check piggybacks on overview
  PERFORM get_student_360_overview(p_student_id);

  -- Wrap union in a subquery so ORDER BY can reference the named column.
  -- FIX 1: xt.reason cast to text inside COALESCE (enum/text mismatch).
  -- FIX 2: explicit column aliases on first SELECT so ORDER BY 'occurred_at' resolves.
  RETURN QUERY
  SELECT * FROM (

    -- XP events
    SELECT
      xt.created_at                                                          AS occurred_at,
      'xp'::text                                                             AS event_type,
      CONCAT(CASE WHEN xt.amount > 0 THEN '+' ELSE '' END, xt.amount, ' XP') AS title,
      COALESCE(xt.description, xt.reason::text, 'نشاط')                     AS detail,
      jsonb_build_object('amount', xt.amount, 'reason', xt.reason)           AS payload
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

  ) _timeline
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- ── Fix 2: Dr. Mohammed — restore account + group assignment ─────────────────
-- NOTE: This reassigns المجموعة 2 (level 1, 10 students) from Rasheed to
-- Dr. Mohammed. After this migration, Rasheed retains only المجموعة 4 (level 3).

-- 2a. Activate Dr. Mohammed's trainer record
UPDATE trainers
SET is_active = true
WHERE id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd';

-- 2b. Assign المجموعة 2 (level 1) to Dr. Mohammed
UPDATE groups
SET trainer_id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd'
WHERE id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';

-- 2c. Update student_interventions rows for المجموعة 2 students to point to Dr. Mohammed
--     (future auto-generated interventions will use correct trainer_id; this cleans up existing pending ones)
UPDATE student_interventions
SET trainer_id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd'
WHERE group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'
  AND status = 'pending';

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Run these after applying to confirm:
--
--   SELECT id, is_active FROM trainers WHERE id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd';
--   -- Expected: is_active = true
--
--   SELECT id, name, trainer_id FROM groups WHERE id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
--   -- Expected: trainer_id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd'
--
--   SELECT get_student_activity_timeline('<any_student_uuid>', 14, 5);
--   -- Expected: returns rows without COALESCE error
