-- PERSONALIZATION-KILL-SWITCH 2026-05-19
-- Adds a key/value app_config table for global feature flags and seeds
-- personalization_enabled = false. Every personalization-aware code path now
-- defers to this flag. RLS allows authenticated read; only service-role writes.
--
-- IDEMPOTENT — re-runnable. No data destruction.

CREATE TABLE IF NOT EXISTS public.app_config (
  key          text PRIMARY KEY,
  value        jsonb NOT NULL,
  description  text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_authenticated_read"    ON public.app_config;
DROP POLICY IF EXISTS "app_config_service_role_all"      ON public.app_config;

CREATE POLICY "app_config_authenticated_read"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_config_service_role_all"
  ON public.app_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed the kill-switch. Default = FALSE. Future opt-in feature flips to TRUE.
INSERT INTO public.app_config (key, value, description)
VALUES (
  'personalization_enabled',
  'false'::jsonb,
  'Global kill-switch for interest-based reading personalization. When false (default), every student sees the canonical curriculum. Variant data in personalized_readings and user_interests is preserved for future opt-in.'
)
ON CONFLICT (key) DO UPDATE
  SET value       = 'false'::jsonb,
      description = EXCLUDED.description,
      updated_at  = now();
