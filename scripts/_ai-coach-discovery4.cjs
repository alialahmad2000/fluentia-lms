require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // curriculum_levels columns
  const {rows:clCols} = await pg.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_levels' ORDER BY ordinal_position`);
  console.log('CURRICULUM_LEVELS COLS:'); console.table(clCols);

  // curriculum_units columns
  const {rows:cuCols} = await pg.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='curriculum_units' ORDER BY ordinal_position`);
  console.log('\nCURRICULUM_UNITS COLS:'); console.table(cuCols);

  // Levels + units count
  const {rows:lvls} = await pg.query(`
    SELECT cl.level_number, COUNT(cu.id) AS units FROM curriculum_levels cl
    LEFT JOIN curriculum_units cu ON cu.level_id=cl.id
    GROUP BY cl.level_number ORDER BY cl.level_number`);
  console.log('\nLEVELS/UNITS:'); console.table(lvls);

  // writing_history columns
  const {rows:whCols} = await pg.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='writing_history' ORDER BY ordinal_position`);
  console.log('\nWRITING_HISTORY COLS:'); console.table(whCols);

  // writing_history row count
  const {rows:whCount} = await pg.query(`SELECT COUNT(*) AS total FROM writing_history`);
  console.log('writing_history rows:', whCount[0].total);

  // SCP for writing: how many have answers.draft populated
  const {rows:draftCheck} = await pg.query(`
    SELECT COUNT(*) AS with_draft FROM student_curriculum_progress
    WHERE section_type='writing' AND answers->>'draft' IS NOT NULL AND LENGTH(answers->>'draft') > 10`);
  console.log('\nSCP writing rows with answers.draft > 10 chars:', draftCheck[0].with_draft);

  // evaluate-writing function exists?
  const fs = require('fs');
  const hasEvalWrite = fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/evaluate-writing/index.ts');
  const hasAiWriteFeedback = fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/ai-writing-feedback/index.ts');
  console.log('\nevaluate-writing/index.ts exists:', hasEvalWrite);
  console.log('ai-writing-feedback/index.ts exists:', hasAiWriteFeedback);

  // evaluate-writing if exists
  if (hasEvalWrite) {
    const content = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/evaluate-writing/index.ts','utf8');
    console.log('\nevaluate-writing first 100 chars:', content.slice(0,100));
  }

  await pg.end();
  console.log('\n=== PART 4 COMPLETE ===');
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
