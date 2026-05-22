-- =============================================================
-- MOCK EXAM LAUNCH — comms idempotency log (idempotent migration)
-- =============================================================
-- Phase A discovered that public.notifications + NotificationCenter.jsx
-- already provide the full in-app comms surface. We reuse that table for
-- the launch announcement (type='announcement'). The only thing we add is
-- a launch-specific log that enforces "at most one email + at most one
-- in-app per (student × exam_code)" so re-running the dispatch is safe.

CREATE TABLE IF NOT EXISTS public.mock_exam_launch_notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('email','in_app')),
  exam_code   text NOT NULL,
  status      text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  details     jsonb,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, channel, exam_code)
);

ALTER TABLE public.mock_exam_launch_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS launch_log_staff ON public.mock_exam_launch_notification_log;
CREATE POLICY launch_log_staff ON public.mock_exam_launch_notification_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

CREATE INDEX IF NOT EXISTS idx_mock_exam_launch_log_exam_status
  ON public.mock_exam_launch_notification_log(exam_code, status);
