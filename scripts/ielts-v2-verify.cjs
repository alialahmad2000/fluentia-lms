require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

async function main() {
  const client = await pool.connect();
  console.log('=== IELTS V2 VERIFICATION GATE ===\n');

  // E.1 — 'ielts' is in package enum
  const enumRes = await client.query(`
    SELECT e.enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'student_package'
  `);
  const enumVals = enumRes.rows.map(r => r.enumlabel);
  assert(enumVals.includes('ielts'), `E.1 'ielts' in student_package enum (values: ${enumVals.join(', ')})`);

  // E.2 — test_variant column on ielts_reading_passages
  const colRes1 = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ielts_reading_passages' AND column_name='test_variant'
  `);
  assert(colRes1.rows.length > 0, 'E.2 test_variant column on ielts_reading_passages');

  // E.3 — All 43 reading passages tagged 'academic'
  const { count: academicCount } = await supabase
    .from('ielts_reading_passages').select('*', { count: 'exact', head: true }).eq('test_variant', 'academic');
  assert(academicCount === 43, `E.3 All 43 reading passages tagged 'academic' (got ${academicCount})`);

  // E.4 — All 12 Task 1 writing tasks tagged 'academic'
  const { count: t1Count } = await supabase
    .from('ielts_writing_tasks').select('*', { count: 'exact', head: true })
    .eq('task_type', 'task1').eq('test_variant', 'academic');
  assert(t1Count === 12, `E.4 All 12 Task 1 writing tasks tagged 'academic' (got ${t1Count})`);

  // E.5 — 0 rows with "5-6" difficulty_band
  const { count: typoCount } = await supabase
    .from('ielts_reading_passages').select('*', { count: 'exact', head: true }).eq('difficulty_band', '5-6');
  assert(typoCount === 0, `E.5 No '5-6' typo rows remain (got ${typoCount})`);

  // E.6 — All 3 new buckets exist
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketNames = (buckets || []).map(b => b.name);
  assert(bucketNames.includes('ielts-audio'), 'E.6a ielts-audio bucket exists');
  assert(bucketNames.includes('ielts-speaking-submissions'), 'E.6b ielts-speaking-submissions bucket exists');
  assert(bucketNames.includes('ielts-writing-images'), 'E.6c ielts-writing-images bucket exists');

  // E.7 — RLS enabled on all 7 student-data tables
  const rlsTables = [
    'ielts_student_results', 'ielts_student_progress', 'ielts_error_bank',
    'ielts_adaptive_plans', 'ielts_mock_attempts', 'ielts_skill_sessions', 'ielts_submissions'
  ];
  for (const t of rlsTables) {
    const r = await client.query(
      `SELECT relrowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace`, [t]
    );
    assert(r.rows[0]?.relrowsecurity === true, `E.7 RLS enabled on ${t}`);
  }

  // E.8 — All 7 tables have at least 2 policies
  for (const t of rlsTables) {
    const r = await client.query(
      `SELECT COUNT(*) FROM pg_policy WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace)`, [t]
    );
    const count = parseInt(r.rows[0].count);
    assert(count >= 2, `E.8 ${t} has >= 2 policies (has ${count})`);
  }

  // E.9 — No existing content lost
  const { count: passages } = await supabase.from('ielts_reading_passages').select('*', { count: 'exact', head: true });
  assert(passages === 43, `E.9a passage count = 43 (got ${passages})`);
  const { count: writings } = await supabase.from('ielts_writing_tasks').select('*', { count: 'exact', head: true });
  assert(writings === 25, `E.9b writing tasks = 25 (got ${writings})`);
  const { count: listenings } = await supabase.from('ielts_listening_sections').select('*', { count: 'exact', head: true });
  assert(listenings === 25, `E.9c listening sections = 25 (got ${listenings})`);
  const { count: speakings } = await supabase.from('ielts_speaking_questions').select('*', { count: 'exact', head: true });
  assert(speakings === 60, `E.9d speaking questions = 60 (got ${speakings})`);

  // E.10 — ielts_skill_sessions + ielts_submissions exist and are writable
  const { error: ssErr } = await supabase.from('ielts_skill_sessions').select('id').limit(0);
  assert(!ssErr, `E.10a ielts_skill_sessions accessible (${ssErr?.message || 'ok'})`);
  const { error: subErr } = await supabase.from('ielts_submissions').select('id').limit(0);
  assert(!subErr, `E.10b ielts_submissions accessible (${subErr?.message || 'ok'})`);

  console.log(`\n=== RESULTS: ${passed} passed / ${failed} failed ===`);
  if (failed > 0) {
    console.error('\n❌ VERIFICATION FAILED — do not commit');
    process.exit(1);
  } else {
    console.log('\n✅ ALL VERIFICATION CHECKS PASSED — safe to commit');
  }

  client.release();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
