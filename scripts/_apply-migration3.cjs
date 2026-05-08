require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260507090000_task_briefings_cache.sql'), 'utf8');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});

(async()=>{
  await pg.connect();
  await pg.query(sql);
  console.log('Migration applied.');

  const {rows: tbl} = await pg.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='task_briefings_cache'`);
  console.log('Table exists:', tbl.length > 0 ? '✅' : '❌');

  const {rows: rls} = await pg.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename='task_briefings_cache'`);
  console.log('RLS policies:'); console.table(rls);

  const {rows: idx} = await pg.query(`SELECT indexname FROM pg_indexes WHERE tablename='task_briefings_cache'`);
  console.log('Indexes:', idx.map(r=>r.indexname));

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
