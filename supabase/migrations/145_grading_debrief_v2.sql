-- ============================================================================
-- 145: Grading Station + Class Debrief V2
-- Extends: class_summaries (quality ratings, per-student attended, AI summary)
-- Adds:    grading_events audit table, 4 RPCs
-- Corrects: writing grading via student_curriculum_progress (no writing_submissions table)
--           speaking grading via speaking_recordings (trainer_reviewed, not graded_at)
-- students JOIN: profiles p ON p.id = s.id (shared UUID — no profile_id FK)
-- award_trainer_xp(trainer_id, event_type, amount, context_jsonb)
-- Idempotent. Safe to re-run.
-- ============================================================================
BEGIN;

-- A. Extend class_summaries with debrief fields
ALTER TABLE class_summaries
  ADD COLUMN IF NOT EXISTS quality_ratings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS per_student_attended jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS per_student_moments jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary_text text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS debrief_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS debrief_completed_by uuid REFERENCES profiles(id);

COMMENT ON COLUMN class_summaries.quality_ratings IS
  '{ energy: 1-5, content_coverage: 1-5, time_management: 1-5 }';
COMMENT ON COLUMN class_summaries.per_student_attended IS
  '{ <student_id>: "present"|"absent"|"excused" }';
COMMENT ON COLUMN class_summaries.per_student_moments IS
  '{ <student_id>: "short positive note" } — internal, not shown to students';
COMMENT ON COLUMN class_summaries.ai_summary_text IS
  'Generated student-facing summary. Editable before shared_with_students=true.';

-- B. Add redo/final_score columns to student_curriculum_progress (writing grading)
ALTER TABLE student_curriculum_progress
  ADD COLUMN IF NOT EXISTS redo_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redo_note text,
  ADD COLUMN IF NOT EXISTS redo_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS redo_requested_by uuid REFERENCES profiles(id);

-- C. Add redo columns to speaking_recordings
ALTER TABLE speaking_recordings
  ADD COLUMN IF NOT EXISTS redo_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS redo_note text,
  ADD COLUMN IF NOT EXISTS redo_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS redo_requested_by uuid REFERENCES profiles(id);

-- D. Grading events audit table
CREATE TABLE IF NOT EXISTS grading_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid REFERENCES profiles(id) NOT NULL,
  student_id uuid NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('writing', 'speaking')),
  submission_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'edited', 'redo_requested')),
  ai_score numeric,
  final_score numeric,
  trainer_note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grading_events_trainer ON grading_events(trainer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grading_events_student ON grading_events(student_id, created_at DESC);

ALTER TABLE grading_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Trainer sees own grading events" ON grading_events
    FOR SELECT USING (trainer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Trainer inserts own grading events" ON grading_events
    FOR INSERT WITH CHECK (trainer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin full grading events" ON grading_events
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- E. RPC: get_trainer_grading_queue
-- Writing: student_curriculum_progress (section_type='writing', status='completed', trainer_graded_at IS NULL)
-- Speaking: speaking_recordings (trainer_reviewed IS NOT TRUE, ai_evaluation IS NOT NULL, is_latest=true)
-- Students JOIN: profiles p ON p.id = s.id (shared UUID)
CREATE OR REPLACE FUNCTION get_trainer_grading_queue(
  p_trainer_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  submission_type text,
  submission_id uuid,
  student_id uuid,
  student_name text,
  group_id uuid,
  group_name text,
  unit_id uuid,
  unit_title text,
  submitted_at timestamptz,
  hours_pending numeric,
  ai_score numeric,
  ai_feedback_summary text,
  is_urgent boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'writing'::text,
    scp.id,
    scp.student_id,
    p.full_name,
    s.group_id,
    g.name,
    scp.unit_id,
    cu.title,
    COALESCE(scp.completed_at, scp.updated_at) AS submitted_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(scp.completed_at, scp.updated_at))) / 3600, 1),
    COALESCE((scp.ai_feedback->>'overall_score')::numeric, 0),
    COALESCE(
      scp.ai_feedback->>'overall_comment_ar',
      scp.ai_feedback->>'overall_feedback',
      ''
    ),
    (COALESCE(scp.completed_at, scp.updated_at) < NOW() - INTERVAL '48 hours')
  FROM student_curriculum_progress scp
  JOIN students s ON s.id = scp.student_id
  JOIN profiles p ON p.id = s.id
  JOIN groups g ON g.id = s.group_id
  LEFT JOIN curriculum_units cu ON cu.id = scp.unit_id
  WHERE g.trainer_id = p_trainer_id
    AND scp.section_type = 'writing'
    AND scp.status = 'completed'
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
    cu.title,
    sr.created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - sr.created_at)) / 3600, 1),
    COALESCE((sr.ai_evaluation->>'overall_score')::numeric, 0),
    COALESCE(sr.ai_evaluation->>'feedback_ar', ''),
    (sr.created_at < NOW() - INTERVAL '48 hours')
  FROM speaking_recordings sr
  JOIN students s ON s.id = sr.student_id
  JOIN profiles p ON p.id = s.id
  JOIN groups g ON g.id = s.group_id
  LEFT JOIN curriculum_units cu ON cu.id = sr.unit_id
  WHERE g.trainer_id = p_trainer_id
    AND (sr.trainer_reviewed IS NULL OR sr.trainer_reviewed = false)
    AND sr.ai_evaluation IS NOT NULL
    AND COALESCE(s.status::text, 'active') = 'active'
    AND s.deleted_at IS NULL
    AND sr.is_latest = true

  ORDER BY is_urgent DESC, submitted_at ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trainer_grading_queue(uuid, integer) TO authenticated;

-- F. RPC: approve_submission
CREATE OR REPLACE FUNCTION approve_submission(
  p_submission_type text,
  p_submission_id uuid,
  p_final_score numeric,
  p_trainer_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_student_id uuid;
  v_ai_score numeric;
  v_submitted_at timestamptz;
  v_hours_to_grade numeric;
  v_xp_awarded integer;
  v_rows_updated integer;
BEGIN
  v_trainer_id := auth.uid();

  IF p_submission_type = 'writing' THEN
    UPDATE student_curriculum_progress
    SET trainer_graded_at = NOW(),
        trainer_graded_by = v_trainer_id,
        trainer_grade = p_final_score::text,
        trainer_feedback = p_trainer_feedback
    WHERE id = p_submission_id
      AND section_type = 'writing'
    RETURNING
      student_id,
      COALESCE((ai_feedback->>'overall_score')::numeric, 0),
      COALESCE(completed_at, updated_at)
    INTO v_student_id, v_ai_score, v_submitted_at;

  ELSIF p_submission_type = 'speaking' THEN
    UPDATE speaking_recordings
    SET trainer_reviewed = true,
        trainer_reviewed_at = NOW(),
        trainer_grade = p_final_score::text,
        trainer_feedback = p_trainer_feedback
    WHERE id = p_submission_id
    RETURNING
      student_id,
      COALESCE((ai_evaluation->>'overall_score')::numeric, 0),
      created_at
    INTO v_student_id, v_ai_score, v_submitted_at;

  ELSE
    RAISE EXCEPTION 'Invalid submission_type: %', p_submission_type;
  END IF;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Submission not found or permission denied: %/%', p_submission_type, p_submission_id;
  END IF;

  -- Audit
  INSERT INTO grading_events (
    trainer_id, student_id, submission_type, submission_id,
    action, ai_score, final_score, trainer_note
  ) VALUES (
    v_trainer_id, v_student_id, p_submission_type, p_submission_id,
    CASE WHEN p_final_score = v_ai_score THEN 'approved' ELSE 'edited' END,
    v_ai_score, p_final_score, p_trainer_feedback
  );

  -- XP: +5 if graded within 24h, +2 otherwise
  v_hours_to_grade := EXTRACT(EPOCH FROM (NOW() - v_submitted_at)) / 3600;
  v_xp_awarded := CASE WHEN v_hours_to_grade < 24 THEN 5 ELSE 2 END;

  PERFORM award_trainer_xp(
    v_trainer_id,
    'grading_completed',
    v_xp_awarded,
    jsonb_build_object('submission_id', p_submission_id, 'type', p_submission_type)
  );

  RETURN jsonb_build_object(
    'status', 'approved',
    'xp_awarded', v_xp_awarded,
    'hours_to_grade', v_hours_to_grade
  );
END;
$$;

GRANT EXECUTE ON FUNCTION approve_submission(text, uuid, numeric, text) TO authenticated;

-- G. RPC: request_submission_redo
CREATE OR REPLACE FUNCTION request_submission_redo(
  p_submission_type text,
  p_submission_id uuid,
  p_redo_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_student_id uuid;
  v_rows_updated integer;
BEGIN
  v_trainer_id := auth.uid();

  IF p_submission_type = 'writing' THEN
    UPDATE student_curriculum_progress
    SET redo_requested = true,
        redo_note = p_redo_note,
        redo_requested_at = NOW(),
        redo_requested_by = v_trainer_id,
        trainer_graded_at = NOW(),
        trainer_graded_by = v_trainer_id,
        trainer_feedback = p_redo_note
    WHERE id = p_submission_id
      AND section_type = 'writing'
    RETURNING student_id INTO v_student_id;

  ELSIF p_submission_type = 'speaking' THEN
    UPDATE speaking_recordings
    SET redo_requested = true,
        redo_note = p_redo_note,
        redo_requested_at = NOW(),
        redo_requested_by = v_trainer_id,
        trainer_reviewed = true,
        trainer_reviewed_at = NOW(),
        trainer_feedback = p_redo_note
    WHERE id = p_submission_id
    RETURNING student_id INTO v_student_id;

  ELSE
    RAISE EXCEPTION 'Invalid submission_type: %', p_submission_type;
  END IF;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Submission not found: %/%', p_submission_type, p_submission_id;
  END IF;

  INSERT INTO grading_events (
    trainer_id, student_id, submission_type, submission_id, action, trainer_note
  ) VALUES (
    v_trainer_id, v_student_id, p_submission_type, p_submission_id, 'redo_requested', p_redo_note
  );

  RETURN jsonb_build_object('status', 'redo_requested');
END;
$$;

GRANT EXECUTE ON FUNCTION request_submission_redo(text, uuid, text) TO authenticated;

-- H. RPC: publish_class_summary
CREATE OR REPLACE FUNCTION publish_class_summary(
  p_summary_id uuid,
  p_ai_summary_text text,
  p_quality_ratings jsonb,
  p_per_student_attended jsonb,
  p_per_student_moments jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id uuid;
  v_already_published boolean;
  v_xp_awarded integer := 10;
  v_rows_updated integer;
BEGIN
  v_trainer_id := auth.uid();

  SELECT shared_with_students INTO v_already_published
  FROM class_summaries
  WHERE id = p_summary_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class summary not found: %', p_summary_id;
  END IF;

  UPDATE class_summaries
  SET ai_summary_text = p_ai_summary_text,
      quality_ratings = p_quality_ratings,
      per_student_attended = p_per_student_attended,
      per_student_moments = p_per_student_moments,
      debrief_completed_at = NOW(),
      debrief_completed_by = v_trainer_id,
      shared_with_students = true
  WHERE id = p_summary_id
    AND EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = class_summaries.group_id
        AND g.trainer_id = v_trainer_id
    );

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Permission denied or summary not found for trainer';
  END IF;

  -- XP only on first publish
  IF NOT COALESCE(v_already_published, false) THEN
    PERFORM award_trainer_xp(
      v_trainer_id,
      'class_debrief_full',
      v_xp_awarded,
      jsonb_build_object('summary_id', p_summary_id)
    );
  ELSE
    v_xp_awarded := 0;
  END IF;

  RETURN jsonb_build_object(
    'status', 'published',
    'xp_awarded', v_xp_awarded,
    're_publish', COALESCE(v_already_published, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION publish_class_summary(uuid, text, jsonb, jsonb, jsonb) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Migration 145 applied successfully';
  RAISE NOTICE 'Extended class_summaries with 7 debrief columns';
  RAISE NOTICE 'Added redo columns to student_curriculum_progress + speaking_recordings';
  RAISE NOTICE 'Created grading_events audit table';
  RAISE NOTICE 'RPCs: get_trainer_grading_queue, approve_submission, request_submission_redo, publish_class_summary';
END $$;

COMMIT;
