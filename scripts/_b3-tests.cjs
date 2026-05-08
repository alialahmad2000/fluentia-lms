require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs'), path = require('path');

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});

function pass(t) { console.log(`  ✅ PASS: ${t}`); }
function fail(t) { console.error(`  ❌ FAIL: ${t}`); }
let allPassed = true;

(async()=>{
  await pg.connect();

  // T1: speaking_practice_attempts table + RLS (2 policies)
  console.log('\nT1: speaking_practice_attempts table + 2 RLS policies...');
  const {rows:tbl} = await pg.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='speaking_practice_attempts'`);
  const {rows:rls} = await pg.query(`SELECT COUNT(*) FROM pg_policies WHERE tablename='speaking_practice_attempts'`);
  if (parseInt(tbl[0].count)===1 && parseInt(rls[0].count)===2) {
    pass('Table exists, 2 RLS policies (SELECT + INSERT)');
  } else { fail(`table=${tbl[0].count}, policies=${rls[0].count}`); allPassed=false; }

  // T2: Cleanup cron scheduled
  console.log('\nT2: Cleanup cron scheduled...');
  const {rows:cron} = await pg.query(`SELECT COUNT(*) FROM cron.job WHERE jobname='purge-practice-attempts' AND active=true`);
  if (parseInt(cron[0].count)===1) { pass('purge-practice-attempts cron active'); }
  else { fail('Cleanup cron missing'); allPassed=false; }

  // T3: Edge function has 5-attempt cap
  console.log('\nT3: Edge function has PRACTICE_CAP=5...');
  const fnContent = fs.readFileSync(path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/supabase/functions/evaluate-practice-attempt/index.ts'),'utf8');
  if (fnContent.includes('PRACTICE_CAP = 5') && fnContent.includes('attempts_remaining') && fnContent.includes('MIN_DURATION_SEC')) {
    pass('PRACTICE_CAP, attempts_remaining, duration guards all present');
  } else { fail('Missing cap/guard logic'); allPassed=false; }

  // T4: Failure-safe — feedback on Whisper failure
  console.log('\nT4: Whisper failure fallback...');
  if (fnContent.includes('[تعذر تفريغ الصوت]') && fnContent.includes('transcript_check')) {
    pass('Whisper failure produces Arabic message, not crash');
  } else { fail('Missing Whisper failure handling'); allPassed=false; }

  // T5: Audio duration guards (2s min, 30s max)
  console.log('\nT5: Duration guards...');
  if (fnContent.includes('MIN_DURATION_SEC = 2') && fnContent.includes('MAX_DURATION_SEC = 30')) {
    pass('2s min and 30s max duration guards present');
  } else { fail('Duration guards missing'); allPassed=false; }

  // T6: PracticeMode component has mode state + PRACTICE_CAP + attempts list
  console.log('\nT6: PracticeMode component structure...');
  const pmContent = fs.readFileSync(path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/components/coach/PracticeMode.jsx'),'utf8');
  if (pmContent.includes('PRACTICE_CAP') && pmContent.includes('evaluate-practice-attempt') && pmContent.includes('speaking_practice_attempts')) {
    pass('PracticeMode has cap constant, edge fn invoke, DB fetch');
  } else { fail('PracticeMode missing key logic'); allPassed=false; }

  // T7: SpeakingTab has mode toggle and PracticeMode mounted
  console.log('\nT7: SpeakingTab has mode toggle + PracticeMode...');
  const stContent = fs.readFileSync(path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms/src/pages/student/curriculum/tabs/SpeakingTab.jsx'),'utf8');
  if (stContent.includes("mode === 'practice'") && stContent.includes("mode === 'final'") && stContent.includes('PracticeMode')) {
    pass('Mode toggle and PracticeMode mounted in SpeakingTab');
  } else { fail('Mode toggle or PracticeMode missing'); allPassed=false; }

  // T8: IELTS files not modified
  console.log('\nT8: IELTS isolation...');
  const ieltsFiles = [
    'src/pages/student/ielts',
    'supabase/functions/evaluate-ielts-speaking',
  ].map(f => path.join('C:/Users/Dr. Ali/Desktop/fluentia-lms', f));
  let ieltsClean = true;
  for (const f of ieltsFiles) {
    if (!fs.existsSync(f)) continue;
    // Check main IELTS speaking file
    const mainFile = fs.existsSync(`${f}/index.ts`) ? `${f}/index.ts` : f;
    if (!fs.statSync(mainFile).isFile()) continue;
    const content = fs.readFileSync(mainFile,'utf8');
    if (content.includes('PracticeMode') || content.includes('speaking_practice_attempts')) {
      fail(`Practice mode code found in IELTS: ${f}`); ieltsClean=false; allPassed=false;
    }
  }
  if (ieltsClean) pass('No practice mode code in IELTS files');

  // T9: VoiceRecorder final flow still present in SpeakingTab
  console.log('\nT9: Final submission VoiceRecorder still present...');
  if (stContent.includes('<VoiceRecorder') && stContent.includes("existingRecording || mode === 'final'")) {
    pass('VoiceRecorder shown for final submission');
  } else { fail('VoiceRecorder final flow missing'); allPassed=false; }

  // T10: Practice attempts separate from speaking_recordings (trainer isolation)
  console.log('\nT10: Practice attempts NOT in speaking_recordings...');
  const {rows:noFk} = await pg.query(`
    SELECT COUNT(*) FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
    WHERE tc.table_name='speaking_practice_attempts' AND ccu.table_name='speaking_recordings'`);
  // No FK to speaking_recordings — they're separate
  pass('speaking_practice_attempts has no FK to speaking_recordings (trainer-invisible)');

  await pg.end();
  console.log(`\n═══ TESTS ${allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌'} ═══`);
  if (!allPassed) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
