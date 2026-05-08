require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});

function pass(t) { console.log(`  ✅ PASS: ${t}`); }
function fail(t) { console.error(`  ❌ FAIL: ${t}`); }
let allPassed = true;

(async()=>{
  await pg.connect();

  // T1: 2 tables + 2 RLS policies
  console.log('\nT1: coach_conversations + coach_messages tables + RLS...');
  const {rows:tables} = await pg.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('coach_conversations','coach_messages') ORDER BY table_name`);
  const {rows:rls} = await pg.query(`SELECT COUNT(*) AS cnt FROM pg_policies WHERE tablename IN ('coach_conversations','coach_messages')`);
  if (tables.length === 2 && parseInt(rls[0].cnt) === 2) { pass('2 tables, 2 RLS SELECT policies'); }
  else { fail(`tables=${tables.length}, policies=${rls[0].cnt}`); allPassed=false; }

  // T2: AICoachPanel component exists
  console.log('\nT2: AICoachPanel component exists...');
  const panelExists = fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/coach/AICoachPanel.jsx');
  if (panelExists) { pass('AICoachPanel.jsx created'); }
  else { fail('AICoachPanel.jsx missing'); allPassed=false; }

  // T3: TaskBriefing + WritingAssistant deleted
  console.log('\nT3: Deprecated files deleted...');
  const briefingGone = !fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/coach/TaskBriefing.jsx');
  const assistantGone = !fs.existsSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/curriculum/WritingAssistant.jsx');
  if (briefingGone && assistantGone) { pass('TaskBriefing.jsx + WritingAssistant.jsx deleted'); }
  else { fail(`briefing deleted=${briefingGone}, assistant deleted=${assistantGone}`); allPassed=false; }

  // T4: WritingTab uses AICoachPanel, not TaskBriefing or WritingAssistant
  console.log('\nT4: WritingTab imports AICoachPanel, not old components...');
  const wtContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/pages/student/curriculum/tabs/WritingTab.jsx','utf8');
  const hasCoach = wtContent.includes('AICoachPanel');
  const noTaskBriefing = !wtContent.includes('TaskBriefing');
  const noWritingAssistant = !wtContent.includes('WritingAssistant');
  const has2Col = wtContent.includes('lg:grid-cols-[1fr_380px]');
  if (hasCoach && noTaskBriefing && noWritingAssistant && has2Col) {
    pass('AICoachPanel imported, 2-col grid, old components removed');
  } else { fail(`coach=${hasCoach}, noBriefing=${noTaskBriefing}, noAssist=${noWritingAssistant}, 2col=${has2Col}`); allPassed=false; }

  // T5: SpeakingTab uses AICoachPanel, not TaskBriefing
  console.log('\nT5: SpeakingTab imports AICoachPanel, not TaskBriefing...');
  const stContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/pages/student/curriculum/tabs/SpeakingTab.jsx','utf8');
  const stHasCoach = stContent.includes('AICoachPanel');
  const stNoBriefing = !stContent.includes('TaskBriefing');
  const stHas2Col = stContent.includes('lg:grid-cols-[1fr_380px]');
  if (stHasCoach && stNoBriefing && stHas2Col) { pass('SpeakingTab: AICoachPanel + 2-col grid + no TaskBriefing'); }
  else { fail(`coach=${stHasCoach}, noBriefing=${stNoBriefing}, 2col=${stHas2Col}`); allPassed=false; }

  // T6: coach-chat edge function has streaming + cap + system prompt guardrails
  console.log('\nT6: coach-chat has streaming + 20-msg cap + pedagogical guardrails...');
  const fnContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/coach-chat/index.ts','utf8');
  const hasStream = fnContent.includes('TransformStream') && fnContent.includes('text/event-stream');
  const hasCap = fnContent.includes('MESSAGE_CAP = 20') && fnContent.includes('message_cap_reached');
  const hasGuardrail = fnContent.includes('NEVER write the complete answer') && fnContent.includes('cache_control');
  if (hasStream && hasCap && hasGuardrail) { pass('Streaming, 20-msg cap, pedagogical guardrails, prompt caching'); }
  else { fail(`stream=${hasStream}, cap=${hasCap}, guardrail=${hasGuardrail}`); allPassed=false; }

  // T7: IELTS files NOT touched
  console.log('\nT7: IELTS isolation...');
  const ieltsDir = 'C:/Users/Dr. Ali/Desktop/fluentia-lms/src/pages/student/ielts';
  let ieltsClean = true;
  const checkFile = (fpath) => {
    if (!fs.existsSync(fpath) || fs.statSync(fpath).isDirectory()) return;
    const c = fs.readFileSync(fpath,'utf8');
    if (c.includes('AICoachPanel') || c.includes('coach-chat')) { fail(`Coach code in IELTS: ${fpath}`); ieltsClean=false; allPassed=false; }
  };
  // Check a few key IELTS files
  ['MockFlow.jsx','MockWritingTabs.jsx'].forEach(f => checkFile(`${ieltsDir}/mock/${f}`));
  if (ieltsClean) pass('No coach code in IELTS files');

  // T8: ai-writing-assistant tagged deprecated
  console.log('\nT8: ai-writing-assistant tagged deprecated...');
  const oldFnContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/ai-writing-assistant/index.ts','utf8');
  if (oldFnContent.includes('DEPRECATED 2026-05-07')) { pass('ai-writing-assistant tagged deprecated'); }
  else { fail('Deprecation tag missing'); allPassed=false; }

  // T9: 7 quick-prompt buttons in AICoachPanel
  console.log('\nT9: 7 quick-prompt actions in AICoachPanel...');
  const panelContent = fs.readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/coach/AICoachPanel.jsx','utf8');
  const writingPrompts = (panelContent.match(/key: '/g) || []).length;
  if (panelContent.includes('QUICK_PROMPTS') && writingPrompts >= 7) { pass(`${writingPrompts} quick-prompt keys defined`); }
  else { fail('Quick prompts missing or fewer than 7'); allPassed=false; }

  // T10: Migration unique constraint on conversations
  console.log('\nT10: coach_conversations UNIQUE (student_id, task_id, task_type)...');
  const {rows:constraint} = await pg.query(`SELECT conname FROM pg_constraint WHERE conrelid='coach_conversations'::regclass AND contype='u'`);
  if (constraint.some(r=>r.conname.includes('uq_conversation'))) { pass('uq_conversation unique constraint exists'); }
  else { fail('Unique constraint missing'); allPassed=false; }

  await pg.end();
  console.log(`\n═══ TESTS ${allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌'} ═══`);
  if (!allPassed) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
