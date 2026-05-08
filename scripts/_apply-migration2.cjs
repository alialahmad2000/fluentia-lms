require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260506090000_health_monitor_and_writing_notification.sql'),
  'utf8'
);

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  await pg.query(sql);
  console.log('Migration applied.\n');

  const {rows: enumCheck} = await pg.query(`
    SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname LIKE '%notification%type%' AND e.enumlabel LIKE '%writ%'
    ORDER BY e.enumsortorder
  `);
  console.log('writing* notification types:', enumCheck.map(r=>r.enumlabel).join(', '));

  const {rows: tableCheck} = await pg.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='evaluation_health_log' ORDER BY ordinal_position
  `);
  console.log('evaluation_health_log columns:', tableCheck.map(r=>r.column_name).join(', '));

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
