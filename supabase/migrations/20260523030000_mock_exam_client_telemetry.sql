-- 2026-05-23 MOCK-EXAM-INCIDENT-FIX (2nd round) — client telemetry RPC
-- Students can log entry/exit/failure events for their own attempt to
-- mock_exam_audit_log. Lets us forensically reconstruct stuck-submit incidents
-- (e.g. "submit_kickoff at 02:14 + no submit row = client hung between kickoff
-- and the RPC reply landing").
--
-- Sacred-RPC constraint: existing 8 mock_exam_* RPCs unchanged. This is purely
-- additive — a new SECURITY DEFINER function for low-volume client-side logging.

CREATE OR REPLACE FUNCTION public.mock_exam_log_client_event(
  p_attempt_id uuid,
  p_event text,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_event text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Caller must own the attempt (admins/trainers can also log on any attempt for diagnostics).
  SELECT a.student_id INTO v_student_id FROM mock_exam_attempts a WHERE a.id = p_attempt_id;
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'attempt_not_found'; END IF;
  IF v_student_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','trainer')
    ) THEN
      RAISE EXCEPTION 'attempt_not_yours';
    END IF;
  END IF;

  -- Whitelist event names so the audit log stays interpretable.
  v_event := LOWER(TRIM(COALESCE(p_event, '')));
  IF v_event NOT IN (
    'submit_kickoff',  -- client about to call mock_exam_submit
    'submit_complete', -- client received mock_exam_submit response
    'submit_failed',   -- client error/timeout on mock_exam_submit
    'save_failed',     -- save_answer or save_writing failed/timed out
    'flush_started',   -- flushAllSaves loop began
    'flush_complete',  -- flushAllSaves loop ended
    'page_unload',     -- beforeunload fired with pending saves
    'retry_attempt'    -- user clicked manual retry
  ) THEN
    RAISE EXCEPTION 'invalid_event: %', v_event;
  END IF;

  INSERT INTO public.mock_exam_audit_log(attempt_id, student_id, event, details)
  VALUES (p_attempt_id, COALESCE(v_student_id, auth.uid()), v_event, COALESCE(p_details, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_log_client_event(uuid, text, jsonb) TO authenticated, service_role;
