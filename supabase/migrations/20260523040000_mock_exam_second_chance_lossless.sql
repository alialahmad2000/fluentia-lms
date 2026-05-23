-- 2026-05-23 MOCK-EXAM-SECOND-CHANCE — lossless auto-submit + archive
-- Idempotent. Safe to re-run.
--
-- Goal: every attempt that hits expires_at gets auto-submitted server-side,
-- regardless of whether the client tab is alive. Prior attempts archived in
-- mock_exam_attempts_archive with full row + answers + audit + ai-log
-- snapshots so nothing is irreversibly lost.

-- =============================================================
-- A.1 Archive table
-- =============================================================
CREATE TABLE IF NOT EXISTS public.mock_exam_attempts_archive (
  id               uuid PRIMARY KEY,
  archived_at      timestamptz NOT NULL DEFAULT now(),
  archive_reason   text NOT NULL,
  archived_by      uuid REFERENCES public.profiles(id),
  attempt_snapshot jsonb NOT NULL,
  answers_snapshot jsonb NOT NULL,
  audit_snapshot   jsonb,
  ai_log_snapshot  jsonb
);

ALTER TABLE public.mock_exam_attempts_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arch_staff_read ON public.mock_exam_attempts_archive;
CREATE POLICY arch_staff_read ON public.mock_exam_attempts_archive FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin','trainer')
    )
  );

-- =============================================================
-- A.2 Archive + reset RPC (admin/service_role only, idempotent)
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_archive_and_reset(
  p_attempt_id uuid,
  p_reason text DEFAULT 'second_chance_2026-05-23'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_attempt mock_exam_attempts%ROWTYPE;
  v_answers jsonb;
  v_audit jsonb;
  v_ai_log jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  SELECT * INTO v_attempt FROM mock_exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'skipped', 'not_found');
  END IF;

  -- Idempotent: skip if already archived under this reason
  IF EXISTS (
    SELECT 1 FROM mock_exam_attempts_archive
    WHERE id = p_attempt_id AND archive_reason = p_reason
  ) THEN
    RETURN jsonb_build_object('attempt_id', p_attempt_id, 'skipped', 'already_archived');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(ans.*)), '[]'::jsonb) INTO v_answers
  FROM mock_exam_answers ans
  WHERE ans.attempt_id = p_attempt_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_audit
  FROM mock_exam_audit_log l
  WHERE l.attempt_id = p_attempt_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(log.*)), '[]'::jsonb) INTO v_ai_log
  FROM mock_exam_ai_writing_log log
  WHERE log.attempt_id = p_attempt_id;

  INSERT INTO mock_exam_attempts_archive(
    id, archive_reason, archived_by, attempt_snapshot, answers_snapshot, audit_snapshot, ai_log_snapshot
  )
  VALUES (
    p_attempt_id,
    p_reason,
    NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    to_jsonb(v_attempt),
    v_answers,
    v_audit,
    v_ai_log
  );

  -- CASCADE handles mock_exam_answers + mock_exam_ai_writing_log.
  -- mock_exam_audit_log uses ON DELETE SET NULL (preserved with attempt_id=NULL).
  DELETE FROM mock_exam_attempts WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', p_attempt_id,
    'archived', true,
    'answers_archived', jsonb_array_length(v_answers),
    'audit_archived', jsonb_array_length(v_audit),
    'ai_log_archived', jsonb_array_length(v_ai_log),
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_archive_and_reset(uuid, text) TO authenticated, service_role;

-- =============================================================
-- A.3 Cron worker: auto-submit every expired attempt (idempotent)
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_cron_auto_submit_expired()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed int := 0;
  v_results jsonb := '[]'::jsonb;
  r record;
  v_submit_result jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;

  FOR r IN
    SELECT a.id, a.student_id
      FROM mock_exam_attempts a
     WHERE a.is_submitted = false
       AND a.expires_at IS NOT NULL
       AND a.expires_at < now()
  LOOP
    BEGIN
      v_submit_result := public.mock_exam_admin_force_submit(r.id, true);
      v_processed := v_processed + 1;
      v_results := v_results || jsonb_build_object(
        'attempt_id', r.id,
        'result', v_submit_result
      );

      INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
      VALUES (r.id, r.student_id, 'cron_auto_submit',
              jsonb_build_object('result', v_submit_result));
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO mock_exam_audit_log(attempt_id, student_id, event, details)
      VALUES (r.id, r.student_id, 'cron_auto_submit_failed',
              jsonb_build_object('error', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'results', v_results);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_cron_auto_submit_expired() TO authenticated, service_role;

-- =============================================================
-- A.5 AI grading cron worker via pg_net (best-effort, idempotent)
-- =============================================================
CREATE OR REPLACE FUNCTION public.mock_exam_cron_grade_pending_writing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_processed int := 0;
  v_request_id bigint;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN jsonb_build_object('skipped', 'pg_net_not_enabled');
  END IF;

  -- Project-scoped settings written by the migration runner via _apply script.
  -- If absent, return gracefully — admins can still retry manually from the dashboard.
  v_supabase_url      := current_setting('app.settings.supabase_url', true);
  v_service_role_key  := current_setting('app.settings.service_role_key', true);
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RETURN jsonb_build_object('skipped', 'app_settings_missing');
  END IF;

  FOR r IN
    SELECT id FROM mock_exam_attempts
     WHERE is_submitted = true
       AND ai_writing_status = 'pending'
       AND submitted_at < now() - interval '2 minutes'
  LOOP
    BEGIN
      SELECT INTO v_request_id net.http_post(
        url := v_supabase_url || '/functions/v1/mock-exam-grade-writing',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object('attempt_id', r.id)
      );
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- swallow; trainer can retry manually
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mock_exam_cron_grade_pending_writing() TO authenticated, service_role;

-- =============================================================
-- A.4 pg_cron schedules (idempotent — unschedule any prior with same name)
-- =============================================================
DO $cron_block$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- mock-exam-auto-submit-expired: every minute
    FOR v_job_id IN
      SELECT jobid FROM cron.job WHERE jobname = 'mock-exam-auto-submit-expired'
    LOOP
      PERFORM cron.unschedule(v_job_id);
    END LOOP;
    PERFORM cron.schedule(
      'mock-exam-auto-submit-expired',
      '* * * * *',
      'SELECT public.mock_exam_cron_auto_submit_expired();'
    );

    -- mock-exam-grade-pending-writing: every 2 minutes
    FOR v_job_id IN
      SELECT jobid FROM cron.job WHERE jobname = 'mock-exam-grade-pending-writing'
    LOOP
      PERFORM cron.unschedule(v_job_id);
    END LOOP;
    PERFORM cron.schedule(
      'mock-exam-grade-pending-writing',
      '*/2 * * * *',
      'SELECT public.mock_exam_cron_grade_pending_writing();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — cron skipped.';
  END IF;
END
$cron_block$;
