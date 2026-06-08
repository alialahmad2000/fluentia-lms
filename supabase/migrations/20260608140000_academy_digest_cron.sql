-- Schedule the academy digest emails.
-- Daily:  00:30 Riyadh (21:30 UTC) — after the 00:15 rollup; reports the day just ended.
-- Weekly: Saturday 23:00 Riyadh (20:00 UTC Sat, dow=6) — reports the past 7 days (Sun→Sat).
DO $$ BEGIN PERFORM cron.unschedule('academy-digest-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('academy-digest-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('academy-digest-daily', '30 21 * * *', $cron$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/academy-digest',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||current_setting('supabase.service_role_key', true)),
    body := '{"period":"daily"}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);

SELECT cron.schedule('academy-digest-weekly', '0 20 * * 6', $cron$
  SELECT net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/academy-digest',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||current_setting('supabase.service_role_key', true)),
    body := '{"period":"weekly"}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
