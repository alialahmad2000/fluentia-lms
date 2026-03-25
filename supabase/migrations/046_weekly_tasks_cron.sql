-- ============================================================================
-- 046: Auto-generate weekly tasks every Saturday at midnight Riyadh time
-- Saturday 00:00 AST (UTC+3) = Friday 21:00 UTC
-- ============================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if any (idempotent)
SELECT cron.unschedule('generate-weekly-tasks')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-weekly-tasks');

-- Schedule: every Friday at 21:00 UTC = Saturday 00:00 Riyadh
SELECT cron.schedule(
  'generate-weekly-tasks',
  '0 21 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/generate-weekly-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'mode', 'auto',
      'generate_for', 'all_active'
    )
  );
  $$
);
