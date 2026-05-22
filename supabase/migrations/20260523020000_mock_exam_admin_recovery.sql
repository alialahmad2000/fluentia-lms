-- 2026-05-23 MOCK-EXAM-INCIDENT-FIX
-- New admin-only recovery RPC: force-submits + re-grades a stuck attempt.
-- Idempotent: if the attempt is already submitted with score_total > 0, returns existing.
-- Authorization: service_role OR admin only (not trainer). Trainer can still see results via the reveal RPC.
-- Sacred constraint: does NOT modify the existing 8 mock_exam RPCs.

CREATE OR REPLACE FUNCTION public.mock_exam_admin_force_submit(
  p_attempt_id uuid,
  p_auto boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_attempt mock_exam_attempts%ROWTYPE;
  v_exam mock_exams%ROWTYPE;
  v_grammar numeric := 0;
  v_reading numeric := 0;
  v_vocab numeric := 0;
  v_spelling numeric := 0;
  v_writing numeric := 0;
  v_total numeric := 0;
  v_passed boolean;
BEGIN
  -- Authorization: service_role OR admin only.
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  SELECT * INTO v_attempt FROM mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;

  -- Idempotency: already-submitted attempt with a non-zero score → return existing.
  IF v_attempt.is_submitted AND v_attempt.score_total IS NOT NULL AND v_attempt.score_total > 0 THEN
    RETURN jsonb_build_object(
      'attempt_id', p_attempt_id,
      'idempotent', true,
      'message', 'already_submitted_and_scored',
      'score_total', v_attempt.score_total,
      'passed', v_attempt.passed
    );
  END IF;

  SELECT * INTO v_exam FROM mock_exams WHERE id = v_attempt.exam_id;

  -- Re-grade every non-writing answer (same scoring contract as mock_exam_submit).
  UPDATE mock_exam_answers a
  SET
    is_correct = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN a.selected_index IS NOT NULL AND a.selected_index = q.correct_index
      WHEN q.question_type = 'fill_blank'
        THEN a.text_answer IS NOT NULL
             AND EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(a.text_answer))
             )
      ELSE NULL
    END,
    points_awarded = CASE
      WHEN q.question_type IN ('mcq','true_false','true_false_ng','error_detection')
        THEN CASE WHEN a.selected_index = q.correct_index THEN q.points ELSE 0 END
      WHEN q.question_type = 'fill_blank'
        THEN CASE WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(q.acceptable_answers) AS aa(val)
               WHERE lower(trim(aa.val)) = lower(trim(coalesce(a.text_answer,'')))
             ) THEN q.points ELSE 0 END
      ELSE 0
    END
  FROM mock_exam_questions q
  WHERE q.id = a.question_id
    AND a.attempt_id = p_attempt_id;

  SELECT
    COALESCE(SUM(CASE WHEN q.section='grammar'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='reading'    THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='vocabulary' THEN a.points_awarded END), 0),
    COALESCE(SUM(CASE WHEN q.section='spelling'   THEN a.points_awarded END), 0)
  INTO v_grammar, v_reading, v_vocab, v_spelling
  FROM mock_exam_answers a
  JOIN mock_exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = p_attempt_id;

  -- Writing: if a manual override exists, use it; else 0 (the AI grader edge function fills in async).
  IF v_attempt.manual_writing_score IS NOT NULL THEN
    v_writing := v_attempt.manual_writing_score;
  ELSE
    v_writing := 0;
  END IF;

  v_total  := ROUND(v_grammar + v_reading + v_vocab + v_spelling + v_writing, 2);
  v_passed := v_total >= v_exam.pass_threshold;

  UPDATE mock_exam_attempts
  SET is_submitted      = true,
      is_auto_submitted = COALESCE(is_auto_submitted, p_auto),
      submitted_at      = COALESCE(submitted_at, now()),
      score_grammar     = v_grammar,
      score_reading     = v_reading,
      score_vocabulary  = v_vocab,
      score_spelling    = v_spelling,
      score_writing     = v_writing,
      score_total       = v_total,
      passed            = v_passed,
      ai_writing_status = CASE
        WHEN ai_writing_status IS NULL OR ai_writing_status = '' THEN 'pending'
        ELSE ai_writing_status
      END,
      updated_at        = now()
  WHERE id = p_attempt_id;

  INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
  VALUES (
    p_attempt_id,
    v_attempt.student_id,
    'admin_force_submit',
    jsonb_build_object(
      'score_total', v_total,
      'passed', v_passed,
      'auto', p_auto,
      'caller_role', COALESCE(v_role, 'service_role')
    )
  );

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'score_total', v_total,
    'passed', v_passed,
    'recovered', true,
    'sections', jsonb_build_object(
      'grammar',    v_grammar,
      'reading',    v_reading,
      'vocabulary', v_vocab,
      'spelling',   v_spelling,
      'writing',    v_writing
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_admin_force_submit(uuid, boolean) TO authenticated, service_role;
