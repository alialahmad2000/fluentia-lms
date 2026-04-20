-- ============================================================================
-- 150: Trainer portal audit fixes (from audit 7ab86d3)
-- 1. Reassign active B1 group (المجموعة 4) trainer from Mohammed → Ali
-- 2. Ensure Ali has is_active=true in trainers table (already exists, idempotent)
-- 3. Fix get_trainer_grading_queue RPC: cu.title → COALESCE(cu.theme_ar, cu.theme_en)
-- ============================================================================

DO $$
DECLARE
  v_ali_id   UUID;
  v_b1_id    UUID;
  v_old      UUID;
  v_rowcount INT;
BEGIN
  SELECT id INTO v_ali_id FROM profiles WHERE role = 'admin' LIMIT 1;
  IF v_ali_id IS NULL THEN RAISE EXCEPTION 'No admin profile found'; END IF;

  SELECT id, trainer_id INTO v_b1_id, v_old
  FROM groups WHERE level = 3 AND is_active = true LIMIT 1;
  IF v_b1_id IS NULL THEN RAISE EXCEPTION 'No active level-3 group found'; END IF;

  RAISE NOTICE 'Reassigning group % from % to %', v_b1_id, v_old, v_ali_id;

  -- Step 1: Ensure Ali's trainers row is active (idempotent)
  INSERT INTO trainers (id, is_active, per_session_rate, onboarding_completed)
  VALUES (v_ali_id, true, 150, true)
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  -- Step 2: Reassign B1 group to Ali
  UPDATE groups SET trainer_id = v_ali_id WHERE id = v_b1_id;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount = 0 THEN RAISE EXCEPTION 'B1 reassign updated 0 rows'; END IF;

  RAISE NOTICE '✅ B1 group reassigned (was %, now %)', v_old, v_ali_id;
END $$;

-- ============================================================================
-- Step 3: Fix get_trainer_grading_queue — replace cu.title with theme columns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_trainer_grading_queue(
  p_trainer_id UUID,
  p_limit      INT DEFAULT 50
)
RETURNS TABLE (
  submission_type      TEXT,
  submission_id        UUID,
  student_id           UUID,
  student_name         TEXT,
  group_id             UUID,
  group_name           TEXT,
  unit_id              UUID,
  unit_title           TEXT,
  submitted_at         TIMESTAMPTZ,
  hours_pending        NUMERIC,
  ai_score             NUMERIC,
  ai_feedback_summary  TEXT,
  is_urgent            BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      'writing'::text,
      scp.id,
      scp.student_id,
      p.full_name,
      s.group_id,
      g.name,
      scp.unit_id,
      COALESCE(cu.theme_ar, cu.theme_en, 'وحدة غير محددة') AS unit_title,
      COALESCE(scp.completed_at, scp.updated_at),
      ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(scp.completed_at, scp.updated_at))) / 3600, 1),
      COALESCE((scp.ai_feedback->>'overall_score')::numeric, 0),
      COALESCE(
        scp.ai_feedback->>'overall_comment_ar',
        scp.ai_feedback->>'overall_feedback',
        ''
      ),
      (COALESCE(scp.completed_at, scp.updated_at) < NOW() - INTERVAL '48 hours')
    FROM student_curriculum_progress scp
    JOIN students s  ON s.id  = scp.student_id
    JOIN profiles p  ON p.id  = s.id
    JOIN groups g    ON g.id  = s.group_id
    LEFT JOIN curriculum_units cu ON cu.id = scp.unit_id
    WHERE g.trainer_id = p_trainer_id
      AND scp.section_type   = 'writing'
      AND scp.status         = 'completed'
      AND scp.trainer_graded_at IS NULL
      AND scp.ai_feedback IS NOT NULL
      AND COALESCE(s.status::text, 'active') = 'active'
      AND s.deleted_at IS NULL

    UNION ALL

    SELECT
      'speaking'::text,
      sr.id,
      sr.student_id,
      p.full_name,
      s.group_id,
      g.name,
      sr.unit_id,
      COALESCE(cu.theme_ar, cu.theme_en, 'وحدة غير محددة') AS unit_title,
      sr.created_at,
      ROUND(EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600, 1),
      COALESCE((sr.ai_evaluation->>'overall_score')::numeric, 0),
      COALESCE(sr.ai_evaluation->>'feedback_ar', ''),
      (sr.created_at < NOW() - INTERVAL '48 hours')
    FROM speaking_recordings sr
    JOIN students s  ON s.id  = sr.student_id
    JOIN profiles p  ON p.id  = s.id
    JOIN groups g    ON g.id  = s.group_id
    LEFT JOIN curriculum_units cu ON cu.id = sr.unit_id
    WHERE g.trainer_id = p_trainer_id
      AND (sr.trainer_reviewed IS NULL OR sr.trainer_reviewed = false)
      AND sr.ai_evaluation IS NOT NULL
      AND COALESCE(s.status::text, 'active') = 'active'
      AND s.deleted_at IS NULL
      AND sr.is_latest = true
  ) sub (submission_type, submission_id, student_id, student_name, group_id, group_name, unit_id, unit_title, submitted_at, hours_pending, ai_score, ai_feedback_summary, is_urgent)
  ORDER BY sub.is_urgent DESC, sub.submitted_at ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trainer_grading_queue(UUID, INT) TO authenticated;
