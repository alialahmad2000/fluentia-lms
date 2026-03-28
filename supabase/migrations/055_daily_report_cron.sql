-- Schedule nightly daily report generation via pg_cron + pg_net
-- Runs at 00:05 AM UTC every day (5 min after midnight to ensure full day data)

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cron job
SELECT cron.schedule(
  'generate-daily-report',
  '5 0 * * *',  -- 00:05 UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
