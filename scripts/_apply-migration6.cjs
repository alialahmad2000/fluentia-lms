require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');
const sql = fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260507180000_ai_coach_chat.sql'),'utf8');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  await pg.query(sql);
  console.log('Migration applied.');
  const {rows:tables} = await pg.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('coach_conversations','coach_messages') ORDER BY table_name`);
  console.log('Tables created:', tables.map(r=>r.table_name));
  const {rows:rls} = await pg.query(`SELECT tablename,policyname,cmd FROM pg_policies WHERE tablename IN ('coach_conversations','coach_messages') ORDER BY tablename`);
  console.log('RLS policies:'); console.table(rls);
  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
