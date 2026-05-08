// Smoke test: run the extractTaskTypeContext logic on real profile data
require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});

function extractTaskTypeContext(profile, taskType) {
  if (!profile) return null;
  const skillScore = profile.skills?.[taskType] ?? null;
  const writingKeywords = ['كتاب','كتب','جملة','فقرة','نص','قواعد','نحو','ضمير','تهجئة','كلمة','درجة الكتاب','writing','grammar','spelling','انخفاض','تراجع'];
  const speakingKeywords = ['تحدث','تسجيل','ثانية','دقيقة','صوت','نطق','محادثة','speaking','fluency','pronunciation','مدة'];
  const genericKeywords  = ['مستوى','استمرار','تطور','تحسن','أداء','إكمال','انتظام','مهمة'];
  const typeKeywords = taskType === 'writing' ? writingKeywords : speakingKeywords;
  const filter = (items) => (items||[]).filter(s => {
    const lower = s.toLowerCase();
    const otherKeywords = taskType === 'writing' ? speakingKeywords : writingKeywords;
    if (otherKeywords.some(k => lower.includes(k.toLowerCase()))) return false;
    return typeKeywords.some(k => lower.includes(k.toLowerCase())) || genericKeywords.some(k => lower.includes(k));
  });
  return {
    skill_score: skillScore,
    strengths: filter(profile.strengths||[]).slice(0,3),
    weaknesses: filter(profile.weaknesses||[]).slice(0,2),
    has_data: filter(profile.strengths||[]).length > 0 || filter(profile.weaknesses||[]).length > 0,
  };
}

(async()=>{
  await pg.connect();
  const {rows} = await pg.query(`
    SELECT DISTINCT ON (student_id) student_id, skills, strengths, weaknesses
    FROM ai_student_profiles ORDER BY student_id, generated_at DESC LIMIT 3`);

  let allPassed = true;
  for (const p of rows) {
    const writingCtx  = extractTaskTypeContext(p, 'writing');
    const speakingCtx = extractTaskTypeContext(p, 'speaking');

    console.log('\n─── Student', p.student_id.slice(0,8), '───');
    console.log('All strengths:', (p.strengths||[]).slice(0,4));
    console.log('Writing strengths:', writingCtx.strengths);
    console.log('Speaking strengths:', speakingCtx.strengths);

    // CRITICAL: writing context must not contain speaking keywords
    const SPEAKING_KEYWORDS = ['تحدث','تسجيل','ثانية','دقيقة','مدة'];
    const wStrings = writingCtx.strengths.concat(writingCtx.weaknesses).join(' ');
    const hasSpeakingInWriting = SPEAKING_KEYWORDS.some(k => wStrings.includes(k));
    if (hasSpeakingInWriting) {
      console.error('  ❌ FAIL: Speaking content leaked into writing context!');
      console.error('  Leaked content:', wStrings);
      allPassed = false;
    } else {
      console.log('  ✅ Writing context: no speaking content');
    }

    // CRITICAL: speaking context must not contain writing keywords
    const WRITING_KEYWORDS = ['كتاب','كتب','نص','قواعد','ضمير','درجة الكتاب'];
    const sStrings = speakingCtx.strengths.concat(speakingCtx.weaknesses).join(' ');
    const hasWritingInSpeaking = WRITING_KEYWORDS.some(k => sStrings.includes(k));
    if (hasWritingInSpeaking) {
      console.error('  ❌ FAIL: Writing content in speaking context!');
      console.error('  Leaked content:', sStrings);
      allPassed = false;
    } else {
      console.log('  ✅ Speaking context: no writing content');
    }
  }

  // Verify cache is empty
  const {rows:cache} = await pg.query(`SELECT COUNT(*) AS cnt FROM task_briefings_cache`);
  console.log('\nCache entries:', cache[0].cnt, cache[0].cnt === '0' ? '✅ (wiped)' : '❌ (not wiped)');
  if (cache[0].cnt !== '0') allPassed = false;

  await pg.end();
  console.log(`\n═══ HOTFIX SMOKE TEST ${allPassed ? 'PASSED ✅' : 'FAILED ❌'} ═══`);
  if (!allPassed) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
