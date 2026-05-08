require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // Sample profile shape (no is_latest column — use generated_at DESC)
  const {rows:profiles} = await pg.query(`
    SELECT DISTINCT ON (student_id) student_id, skills, strengths, weaknesses, summary_ar, generated_at
    FROM ai_student_profiles
    ORDER BY student_id, generated_at DESC
    LIMIT 2`);
  console.log('=== ai_student_profiles sample ===');
  for (const p of profiles) {
    console.log('\nstudent_id:', p.student_id);
    console.log('skills:', JSON.stringify(p.skills));
    console.log('strengths (first 3):', JSON.stringify((p.strengths||[]).slice(0,3)));
    console.log('weaknesses (first 2):', JSON.stringify((p.weaknesses||[]).slice(0,2)));
    console.log('summary_ar:', p.summary_ar?.slice(0,120));
  }

  // Cache entries
  const {rows:cache} = await pg.query(`
    SELECT task_type, COUNT(*) AS cnt, MIN(generated_at) AS oldest, MAX(generated_at) AS newest
    FROM task_briefings_cache
    WHERE expires_at > NOW()
    GROUP BY task_type ORDER BY task_type`);
  console.log('\n=== task_briefings_cache (active) ===');
  console.table(cache);

  const {rows:total} = await pg.query(`SELECT COUNT(*) AS total FROM task_briefings_cache`);
  console.log('Total cached briefings:', total[0].total);

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
