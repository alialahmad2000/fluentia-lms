require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // Check if brief_questions / brief_generated_at have any data
  const {rows} = await pg.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE brief_questions IS NOT NULL) AS with_brief,
           COUNT(*) FILTER (WHERE brief_generated_at IS NOT NULL) AS with_brief_ts,
           COUNT(*) FILTER (WHERE activity_ribbons IS NOT NULL) AS with_ribbons,
           COUNT(*) FILTER (WHERE warmup_questions IS NOT NULL) AS with_warmup
    FROM curriculum_units`);
  console.log('=== curriculum_units brief/warmup data ==='); console.table(rows);

  // sample brief_questions
  const {rows: sampleBrief} = await pg.query(`
    SELECT unit_number, LEFT(brief_questions::text,200) AS brief_preview,
           brief_generated_at, LEFT(warmup_questions::text,200) AS warmup_preview
    FROM curriculum_units WHERE brief_questions IS NOT NULL LIMIT 2`);
  if (sampleBrief.length) { console.log('\nSAMPLE BRIEF QUESTIONS:'); console.table(sampleBrief); }

  // Check writing_history for context on how it's used
  const {rows: wh} = await pg.query(`SELECT * FROM writing_history LIMIT 2`);
  if (wh.length) { console.log('\nWRITING_HISTORY SAMPLE:'); console.table(wh.map(r=>({...r,original_text:r.original_text?.slice(0,80),feedback:JSON.stringify(r.feedback)?.slice(0,80)}))); }

  // ai_student_profiles — what edge fn generates them?
  const fs = require('fs');
  const genFn = fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/generate-ai-student-profile/index.ts');
  console.log('\ngenerate-ai-student-profile function exists:', genFn);
  if (genFn) {
    const content = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/generate-ai-student-profile/index.ts','utf8');
    console.log('First 200 chars:', content.slice(0,200));
  }

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
