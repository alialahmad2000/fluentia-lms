require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();
  const {rowCount} = await pg.query(`DELETE FROM task_briefings_cache`);
  console.log(`✅ Wiped ${rowCount} contaminated cache entries.`);
  const {rows} = await pg.query(`SELECT COUNT(*) AS remaining FROM task_briefings_cache`);
  console.log('Remaining entries:', rows[0].remaining);
  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
