-- Layer 6 (auto-recovery): lightweight client-side error logging.
-- Uncaught errors / promise rejections / React boundary catches get logged so
-- Ali sees issues in /admin/system without students needing to report.
-- DB-strategy: apply on a Supabase branch first, then promote to prod manually.

CREATE TABLE IF NOT EXISTS public.client_error_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  text,
  error_kind  text NOT NULL CHECK (error_kind IN ('error','unhandled_rejection','manual','console_error','react_boundary')),
  message     text,
  stack       text,
  url         text,
  user_agent  text,
  app_version text,
  context     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_log_created ON public.client_error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_log_user ON public.client_error_log(user_id, created_at DESC);

ALTER TABLE public.client_error_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT their own errors (no SELECT for them)
DROP POLICY IF EXISTS cel_user_insert ON public.client_error_log;
CREATE POLICY cel_user_insert ON public.client_error_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Admin/trainer can SELECT
DROP POLICY IF EXISTS cel_staff_select ON public.client_error_log;
CREATE POLICY cel_staff_select ON public.client_error_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','trainer')));

-- Rate-limited insert via a SECURITY DEFINER RPC (max 30/user/min, silently drops above)
CREATE OR REPLACE FUNCTION public.log_client_error(
  p_error_kind text,
  p_message text,
  p_stack text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_app_version text DEFAULT NULL,
  p_context jsonb DEFAULT NULL,
  p_session_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_recent_count int;
  v_id uuid;
BEGIN
  IF p_error_kind NOT IN ('error','unhandled_rejection','manual','console_error','react_boundary') THEN
    p_error_kind := 'manual';
  END IF;

  SELECT COUNT(*) INTO v_recent_count
    FROM public.client_error_log
   WHERE user_id IS NOT DISTINCT FROM v_user_id
     AND created_at > now() - interval '1 minute';
  IF v_recent_count > 30 THEN
    RETURN NULL;  -- silently drop
  END IF;

  INSERT INTO public.client_error_log(
    user_id, session_id, error_kind, message, stack, url,
    user_agent, app_version, context
  ) VALUES (
    v_user_id, p_session_id, p_error_kind, left(p_message, 2000), left(p_stack, 5000), p_url,
    left(p_user_agent, 500), p_app_version, p_context
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_client_error(text,text,text,text,text,text,jsonb,text) TO authenticated;
