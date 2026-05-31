-- ============================================================================
-- DASHBOARD V2 — Trainer Letter · daily cron (Phase B.3)
--
-- 0 2 * * *  = 02:00 UTC = 05:00 Riyadh — generates the day's letter for every
-- active student before they wake. The edge function is idempotent.
--
-- ⚠️ SHIPPED DISABLED. The job is registered (so Ali can see/enable it from the
-- dashboard) but active=false — it will NOT fire until Ali flips it on, matching
-- the retention-cron pattern. Enable with:
--    UPDATE cron.job SET active = true WHERE jobname = 'generate-daily-letters';
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Re-runnable. We register via cron.schedule() then disable via cron.alter_job()
-- (NOT a direct UPDATE on cron.job — that table is not writable by the migration
-- role; alter_job is the supported, owner-callable API).
DO $$
DECLARE jid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-letters') THEN
    PERFORM cron.unschedule('generate-daily-letters');
  END IF;

  jid := cron.schedule(
    'generate-daily-letters',
    '0 2 * * *',
    $cmd$
    SELECT net.http_post(
      url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/generate-daily-letters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )
    $cmd$
  );

  -- Ship disabled — Ali enables when ready.
  PERFORM cron.alter_job(job_id := jid, active := false);
END $$;

COMMIT;
