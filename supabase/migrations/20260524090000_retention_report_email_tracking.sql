-- ─────────────────────────────────────────────────────────────────────────────
-- FINISH-OVERNIGHT Block 1 — email send tracking for weekly reports.
-- ─────────────────────────────────────────────────────────────────────────────
-- The actual email dispatch happens client-side in useApproveReport via
-- supabase.functions.invoke('send-email', ...). This migration just adds the
-- tracking columns so we know what landed and when.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.retention_reports
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_resend_id text;

CREATE INDEX IF NOT EXISTS retention_reports_email_pending_idx
  ON public.retention_reports (status, email_sent)
  WHERE status = 'sent' AND email_sent = false;
