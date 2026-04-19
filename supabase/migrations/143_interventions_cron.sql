BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule old job if re-running
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'detect-student-signals') THEN
    PERFORM cron.unschedule('detect-student-signals');
  END IF;
END $$;

-- Every 4 hours, invoke the signals engine edge function
SELECT cron.schedule(
  'detect-student-signals',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/detect-student-signals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  $$
);

COMMIT;
