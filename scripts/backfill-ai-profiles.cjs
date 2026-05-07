// Backfill ai_student_profiles for all 18 active students
// Reads student data directly from DB, calls Claude, upserts profile
require('dotenv').config();
const { Client } = require('pg');

const CLAUDE_API_KEY = process.env.VITE_SUPABASE_URL ? null : null; // read from env below
const API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!API_KEY) { console.error('❌ CLAUDE_API_KEY not set in .env'); process.exit(1); }

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});

async function callClaude(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role:'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const start = text.indexOf('{'), end = text.lastIndexOf('}') + 1;
    const parsed = JSON.parse(text.slice(start, end));
    return { parsed, tokens: data.usage };
  } catch(e) { clearTimeout(timer); throw e; }
}

async function profileStudent(pg, student) {
  const sid = student.id;

  // Gather context
  const [writingRes, speakingRes] = await Promise.all([
    pg.query(`
      SELECT scp.evaluation_status, scp.score,
             LEFT(scp.ai_feedback::text, 500) AS feedback_preview,
             cu.theme_en, cl.level_number
      FROM student_curriculum_progress scp
      JOIN curriculum_units cu ON cu.id = scp.unit_id
      JOIN curriculum_levels cl ON cl.id = cu.level_id
      WHERE scp.student_id=$1 AND scp.section_type='writing' AND scp.evaluation_status='completed'
      ORDER BY scp.completed_at DESC LIMIT 5`, [sid]),
    pg.query(`
      SELECT sr.ai_evaluation->>'overall_score' AS score,
             sr.ai_evaluation->>'feedback_ar' AS feedback_ar,
             sr.ai_evaluation->>'strengths' AS strengths,
             sr.ai_evaluation->>'improvement_tip' AS improvement_tip,
             sr.audio_duration_seconds
      FROM speaking_recordings sr
      WHERE sr.student_id=$1 AND sr.evaluation_status='completed'
      ORDER BY sr.created_at DESC LIMIT 5`, [sid]),
  ]);

  const writing = writingRes.rows;
  const speaking = speakingRes.rows;

  if (writing.length === 0 && speaking.length === 0) {
    return { skipped: true, reason: 'no_submissions' };
  }

  const writingSummary = writing.map(r => `Level ${r.level_number}, score=${r.score || 'n/a'}`).join('; ') || 'لا توجد';
  const speakingSummary = speaking.map(r => `score=${r.score || 'n/a'}, duration=${r.audio_duration_seconds}s`).join('; ') || 'لا توجد';
  const speakingFeedback = speaking.map(r => r.improvement_tip || r.feedback_ar || '').filter(Boolean).slice(0, 3).join(' | ');
  const writingFeedback = writing.map(r => {
    try { const f = JSON.parse(r.feedback_preview || '{}'); return f.improvement_tip || f.overall_comment_ar || ''; } catch { return ''; }
  }).filter(Boolean).slice(0, 3).join(' | ');

  const prompt = `You are analyzing an Arabic-speaking English student's learning profile. Generate a structured JSON profile in Arabic.

Student: ${student.full_name} | Level: ${student.academic_level ?? 'unknown'}

WRITING HISTORY (last ${writing.length} tasks):
${writingSummary}
Feedback themes: ${writingFeedback || 'لا توجد ملاحظات'}

SPEAKING HISTORY (last ${speaking.length} recordings):
${speakingSummary}
Feedback themes: ${speakingFeedback || 'لا توجد ملاحظات'}

Output ONLY this JSON (no markdown):
{
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2", "نقطة ضعف 3"],
  "tips": ["نصيحة عملية 1", "نصيحة عملية 2"],
  "skills": {
    "grammar": <1-10>,
    "vocabulary": <1-10>,
    "fluency": <1-10>,
    "speaking": <1-10>,
    "writing": <1-10>
  },
  "summary_ar": "جملتان تلخصان مستوى الطالب ونقاط التركيز"
}
Be specific and honest. Base every point on the actual scores and feedback provided.`;

  const { parsed, tokens } = await callClaude(prompt);
  const costSAR = ((tokens.input_tokens * 3 + tokens.output_tokens * 15) / 1_000_000) * 3.75;

  // Upsert profile
  // strengths/weaknesses/tips are text[] in PG — pass raw JS arrays (pg driver handles conversion)
  // skills and raw_analysis are jsonb — pass JSON strings
  await pg.query(`
    INSERT INTO ai_student_profiles (student_id, skills, strengths, weaknesses, tips, summary_ar, summary_en, raw_analysis, generated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT (student_id) DO UPDATE
      SET skills=EXCLUDED.skills, strengths=EXCLUDED.strengths, weaknesses=EXCLUDED.weaknesses,
          tips=EXCLUDED.tips, summary_ar=EXCLUDED.summary_ar, summary_en=EXCLUDED.summary_en,
          raw_analysis=EXCLUDED.raw_analysis, generated_at=NOW(), updated_at=NOW()`,
    [sid,
     JSON.stringify(parsed.skills ?? {}),
     parsed.strengths ?? [],
     parsed.weaknesses ?? [],
     parsed.tips ?? [],
     parsed.summary_ar || '',
     '',
     JSON.stringify(parsed)]
  );

  return { success: true, costSAR, tokens };
}

(async()=>{
  await pg.connect();

  // Check if there's a UNIQUE constraint on student_id (need for ON CONFLICT)
  const {rows: constraints} = await pg.query(`
    SELECT conname, contype FROM pg_constraint
    WHERE conrelid='ai_student_profiles'::regclass AND contype='u'`);
  console.log('ai_student_profiles unique constraints:', constraints.map(r=>r.conname));

  // If no UNIQUE on student_id, use a different upsert strategy
  const hasStudentIdUnique = constraints.some(r => r.conname.includes('student'));

  const {rows: students} = await pg.query(`
    SELECT s.id, p.full_name, p.email, s.academic_level
    FROM students s JOIN profiles p ON p.id=s.id
    WHERE s.status='active' AND s.deleted_at IS NULL
    ORDER BY p.created_at`);

  console.log(`\nBackfilling profiles for ${students.length} active students...\n`);

  let succeeded = 0, failed = 0, skipped = 0;
  let totalCostSAR = 0;
  const errors = [];

  for (const student of students) {
    process.stdout.write(`  ${student.full_name} (${student.email})... `);
    try {
      const result = await profileStudent(pg, student);
      if (result.skipped) {
        skipped++;
        console.log(`⏭️  skipped (${result.reason})`);
      } else {
        succeeded++;
        totalCostSAR += result.costSAR;
        console.log(`✅ done (${result.costSAR.toFixed(3)} SAR)`);
      }
    } catch(e) {
      failed++;
      errors.push({ name: student.full_name, error: e.message });
      console.log(`❌ FAILED: ${e.message}`);
    }
    if (students.indexOf(student) < students.length - 1) {
      await new Promise(r => setTimeout(r, 1500)); // rate limit safety
    }
  }

  // Verify
  const {rows: count} = await pg.query(`SELECT COUNT(*) AS total FROM ai_student_profiles`);
  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`Succeeded: ${succeeded} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Total profiles in DB: ${count[0].total}`);
  console.log(`Estimated cost: ${totalCostSAR.toFixed(3)} SAR`);
  if (errors.length) { console.log('Errors:', errors); }

  await pg.end();
  if (failed > 0) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
