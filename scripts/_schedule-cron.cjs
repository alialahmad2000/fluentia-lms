require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();

  // Remove existing job if present (idempotent)
  await client.query(`SELECT cron.unschedule('sweep-speaking-eval-5min')`).catch(() => {});

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/sweep-speaking-evaluations';

  const { rows } = await client.query(`
    SELECT cron.schedule(
      'sweep-speaking-eval-5min',
      '*/5 * * * *',
      $1
    )
  `, [`
    SELECT net.http_post(
      url := '${url}',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ${serviceKey}',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  `]);

  console.log('Cron job scheduled. Job ID:', rows[0]?.schedule);

  const { rows: jobs } = await client.query(`
    SELECT jobid, jobname, schedule, active
    FROM cron.job
    WHERE jobname = 'sweep-speaking-eval-5min'
  `);
  console.table(jobs);

  await client.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
