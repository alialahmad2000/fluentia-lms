require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Schedule hourly health monitor
  await pg.query(`SELECT cron.unschedule('health-monitor-evaluations')`).catch(()=>{});
  await pg.query(`
    SELECT cron.schedule(
      'health-monitor-evaluations',
      '0 * * * *',
      $1
    )
  `, [`
    SELECT net.http_post(
      url := 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/health-monitor-evaluations',
      headers := jsonb_build_object('Authorization','Bearer ${serviceKey}','Content-Type','application/json'),
      body := '{}'::jsonb
    );
  `]);
  console.log('Health monitor cron scheduled (hourly).');

  // List all eval-related cron jobs
  const {rows} = await pg.query(`
    SELECT jobid, jobname, schedule, active FROM cron.job
    WHERE jobname ILIKE '%sweep%' OR jobname ILIKE '%eval%' OR jobname ILIKE '%health%'
    ORDER BY jobname
  `);
  console.log('\n=== All evaluation cron jobs ==='); console.table(rows);

  // Run health monitor once now to seed the first log row
  console.log('\nRunning health monitor once now...');
  const SWEEP_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/health-monitor-evaluations';
  const res = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  console.log('Health monitor result:', JSON.stringify(data, null, 2));

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
