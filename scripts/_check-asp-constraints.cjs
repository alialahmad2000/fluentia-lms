require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  const {rows} = await pg.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint WHERE conrelid='ai_student_profiles'::regclass`);
  console.log('ai_student_profiles constraints:'); console.table(rows);
  const {rows: idx} = await pg.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='ai_student_profiles'`);
  console.log('Indexes:'); console.table(idx);
  await pg.end();
})().catch(e=>{console.error(e.message);process.exit(1);});
