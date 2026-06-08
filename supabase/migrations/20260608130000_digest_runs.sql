-- Log of academy-digest email runs (idempotency / history / debugging).
CREATE TABLE IF NOT EXISTS public.digest_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period       text NOT NULL,            -- 'daily' | 'weekly'
  period_start date,
  period_end   date,
  recipients   jsonb,
  sent         boolean DEFAULT false,
  resend_id    text,
  ai_used      boolean DEFAULT false,
  error        text,
  stats        jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.digest_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS digest_runs_admin_read ON public.digest_runs;
CREATE POLICY digest_runs_admin_read ON public.digest_runs FOR SELECT USING (is_admin());
-- inserts happen via the service role (edge fn), which bypasses RLS.
