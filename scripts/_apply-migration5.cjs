require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260507150000_ai_coach_practice_mode.sql'), 'utf8');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  await pg.query(sql);
  console.log('Migration applied.');

  // Verify table
  const {rows:tbl} = await pg.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='speaking_practice_attempts' ORDER BY ordinal_position`);
  console.log('Table columns:'); console.table(tbl);

  // Verify RLS
  const {rows:rls} = await pg.query(`SELECT policyname,cmd FROM pg_policies WHERE tablename='speaking_practice_attempts'`);
  console.log('RLS policies:'); console.table(rls);

  // Schedule cleanup cron
  await pg.query(`SELECT cron.unschedule('purge-practice-attempts')`).catch(()=>{});
  await pg.query(`SELECT cron.schedule('purge-practice-attempts','0 0 * * *','SELECT purge_expired_practice_attempts();')`);
  const {rows:cron} = await pg.query(`SELECT jobname,schedule,active FROM cron.job WHERE jobname='purge-practice-attempts'`);
  console.log('Cleanup cron:'); console.table(cron);

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
