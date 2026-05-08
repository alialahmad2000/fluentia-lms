require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  const {rows} = await pg.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%writ%' OR table_name ILIKE '%submiss%') ORDER BY table_name`);
  console.log('Writing-related tables:'); console.table(rows);
  await pg.end();
})().catch(e=>{console.error(e.message);process.exit(1);});
