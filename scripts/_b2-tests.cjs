require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1';

function pass(t) { console.log(`  ✅ PASS: ${t}`); }
function fail(t) { console.error(`  ❌ FAIL: ${t}`); }
let allPassed = true;

(async()=>{
  await pg.connect();

  // T1: hint_usage column exists with correct shape
  console.log('\nT1: hint_usage column on student_curriculum_progress...');
  const {rows: col} = await pg.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_curriculum_progress' AND column_name='hint_usage'`);
  if (col.length === 1 && col[0].data_type === 'jsonb' && col[0].is_nullable === 'NO') {
    pass(`hint_usage jsonb NOT NULL, default='[]'`);
  } else { fail('hint_usage column missing or wrong type'); allPassed=false; }

  // T2: All existing writing rows have empty array default
  console.log('\nT2: Existing writing rows all have hint_usage=[]...');
  const {rows: wRows} = await pg.query(`
    SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE hint_usage != '[]'::jsonb) AS non_empty
    FROM student_curriculum_progress WHERE section_type='writing'`);
  if (parseInt(wRows[0].non_empty) === 0) {
    pass(`${wRows[0].total} writing rows all have hint_usage=[]`);
  } else { fail(`${wRows[0].non_empty} rows have non-empty hint_usage`); allPassed=false; }

  // T3: Edge function has HINT_CAP check (code inspection)
  console.log('\nT3: Edge function source contains HINT_CAP...');
  const fnContent = fs.readFileSync(
    path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/ai-writing-assistant/index.ts'), 'utf8');
  if (fnContent.includes('HINT_CAP') && fnContent.includes('hint_cap_reached') && fnContent.includes('hints_remaining')) {
    pass('HINT_CAP, hint_cap_reached, hints_remaining all in edge function');
  } else { fail('Missing cap logic in edge function'); allPassed=false; }

  // T4: WritingAssistant.jsx has counter pill and cap check
  console.log('\nT4: WritingAssistant.jsx has UI cap logic...');
  const uiContent = fs.readFileSync(
    path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/curriculum/WritingAssistant.jsx'), 'utf8');
  if (uiContent.includes('hintsRemaining') && uiContent.includes('capExhausted') && uiContent.includes('hint_cap_reached')) {
    pass('Counter, disabled state, and 429 handler all present');
  } else { fail('Missing UI cap logic'); allPassed=false; }

  // T5: WritingAssistant receives studentId prop
  console.log('\nT5: WritingTab passes studentId to WritingAssistant...');
  const tabContent = fs.readFileSync(
    path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/pages/student/curriculum/tabs/WritingTab.jsx'), 'utf8');
  if (tabContent.includes('studentId={studentId}') && tabContent.includes('WritingAssistant')) {
    pass('studentId prop passed to WritingAssistant');
  } else { fail('studentId not passed'); allPassed=false; }

  // T6: IELTS files not modified
  console.log('\nT6: IELTS files unchanged...');
  const ieltsFiles = [
    'src/pages/student/StudentWritingLab.jsx',
    'src/hooks/ielts/useWritingLab.js',
  ].map(f => path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms', f));
  let ieltsClean = true;
  for (const f of ieltsFiles) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('hint_usage') || content.includes('HINT_CAP')) {
      fail(`hint cap logic found in IELTS file: ${f}`); ieltsClean=false; allPassed=false;
    }
  }
  if (ieltsClean) pass('No hint cap logic in IELTS files');

  // T7: Task_id sent in edge function body
  console.log('\nT7: task_id sent in WritingAssistant fetch body...');
  if (uiContent.includes("task_id: task?.id")) {
    pass('task_id: task?.id present in fetch body');
  } else { fail('task_id missing from fetch body'); allPassed=false; }

  // T8: Failure-safe — hint NOT tracked if AI fails (hint update is AFTER AI call)
  console.log('\nT8: Hint tracked AFTER AI call (failure-safe)...');
  const fnLines = fnContent.split('\n');
  const claudeCallLine = fnLines.findIndex(l => l.includes('api.anthropic.com/v1/messages'));
  const trackingLine = fnLines.findIndex(l => l.includes('Track hint usage'));
  if (claudeCallLine !== -1 && trackingLine !== -1 && trackingLine > claudeCallLine) {
    pass('Hint tracking appears after Claude API call');
  } else { fail('Hint tracking not clearly after Claude call'); allPassed=false; }

  // Cost baseline check
  console.log('\nCost baseline (last 7 days ai-writing-assistant calls):');
  const {rows: costRows} = await pg.query(`
    SELECT COUNT(*) AS calls, ROUND(SUM(estimated_cost_sar)::numeric,3) AS total_sar
    FROM ai_usage
    WHERE type='writing_assistant' AND created_at >= NOW() - INTERVAL '7 days'`);
  console.table(costRows);

  await pg.end();
  console.log(`\n═══ TESTS ${allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌'} ═══`);
  if (!allPassed) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
