require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260507120000_ai_coach_hint_cap.sql'), 'utf8');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  await pg.query(sql);
  console.log('Migration applied.');

  const {rows} = await pg.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_curriculum_progress' AND column_name='hint_usage'`);
  console.log('hint_usage column:'); console.table(rows);

  // Verify existing rows have [] default
  const {rows: check} = await pg.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE hint_usage = '[]'::jsonb) AS with_empty_array
    FROM student_curriculum_progress WHERE section_type='writing'`);
  console.log('Writing rows hint_usage status:'); console.table(check);

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
