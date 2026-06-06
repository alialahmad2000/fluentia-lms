-- Fluentia CS Ops — C3: pg_cron safety-net that syncs any straggler bookings
-- to Google Calendar every 5 min. The net.http_post only fires when a Google
-- integration is actually connected, so it is a no-op until Ali links his calendar.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('cs-gcal-sync-sweep')
where exists (select 1 from cron.job where jobname = 'cs-gcal-sync-sweep');

select cron.schedule(
  'cs-gcal-sync-sweep',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/gcal-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('mode', 'sweep')
  )
  where exists (select 1 from public.integration_tokens where provider = 'google');
  $cron$
);
