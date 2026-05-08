// AI Coach Phase 1 Discovery — Part 2 (remaining sections)
require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await pg.connect();

  // Fix: speaking last 5 without transcript column
  const SAMPLE_STUDENT = 'de70db0c-1d87-4328-86d8-aa37344980a7';

  const { rows: last5s } = await pg.query(`
    SELECT id, unit_id, question_index, audio_format,
           audio_duration_seconds,
           (ai_evaluation->>'overall_score')::text AS overall_score,
           ai_evaluation IS NOT NULL AS has_eval,
           evaluation_status, created_at
    FROM speaking_recordings
    WHERE student_id=$1
    ORDER BY created_at DESC LIMIT 5`, [SAMPLE_STUDENT]);
  console.log(`\nSAMPLE STUDENT LAST 5 SPEAKING:`); console.table(last5s);

  // ai_student_profiles check
  const { rows: aspExists } = await pg.query(`
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_student_profiles'`);
  const aspCount = parseInt(aspExists[0].count);
  if (aspCount > 0) {
    const { rows: aspCols } = await pg.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ai_student_profiles'
      ORDER BY ordinal_position`);
    console.log('\nAI_STUDENT_PROFILES COLUMNS:'); console.table(aspCols);
    const { rows: aspStats } = await pg.query(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE is_latest=true) AS latest_count,
             COUNT(DISTINCT student_id) AS distinct_students,
             ROUND(MIN(EXTRACT(epoch FROM NOW()-generated_at)/86400)) FILTER (WHERE is_latest=true) AS newest_days_old,
             ROUND(MAX(EXTRACT(epoch FROM NOW()-generated_at)/86400)) FILTER (WHERE is_latest=true) AS oldest_days_old
      FROM ai_student_profiles`);
    console.log('\nAI_STUDENT_PROFILES STATS:'); console.table(aspStats);
    const { rows: aspSample } = await pg.query(`
      SELECT is_latest, generated_at, LEFT(profile_data::text, 400) AS profile_data_preview
      FROM ai_student_profiles WHERE is_latest=true LIMIT 1`);
    if (aspSample.length) console.log('\nSAMPLE ASP PROFILE PREVIEW:', aspSample[0]);
  } else {
    console.log('\nai_student_profiles: TABLE DOES NOT EXIST');
    const { rows: aiCache } = await pg.query(`
      SELECT COUNT(*) AS with_cache FROM students WHERE ai_insight_cache IS NOT NULL`);
    console.log('students.ai_insight_cache rows:', aiCache[0].with_cache);
    const { rows: aiCacheSample } = await pg.query(`
      SELECT id, ai_insight_generated_at, LEFT(ai_insight_cache::text, 300) AS cache_preview
      FROM students WHERE ai_insight_cache IS NOT NULL LIMIT 1`);
    if (aiCacheSample.length) console.log('Sample ai_insight_cache:', aiCacheSample[0]);
  }

  // SCP indexes and RLS
  const { rows: scpIdx } = await pg.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='student_curriculum_progress' ORDER BY indexname`);
  console.log('\nSCP INDEXES:'); console.table(scpIdx);
  const { rows: scpRls } = await pg.query(`SELECT policyname, cmd, roles::text FROM pg_policies WHERE tablename='student_curriculum_progress'`);
  console.log('\nSCP RLS POLICIES:'); console.table(scpRls);

  // speaking_recordings indexes + RLS
  const { rows: srIdx } = await pg.query(`SELECT indexname FROM pg_indexes WHERE tablename='speaking_recordings' ORDER BY indexname`);
  console.log('\nSPEAKING_RECORDINGS INDEXES:', srIdx.map(r=>r.indexname));
  const { rows: srRls } = await pg.query(`SELECT policyname, cmd, roles::text FROM pg_policies WHERE tablename='speaking_recordings'`);
  console.log('\nSPEAKING RLS:'); console.table(srRls);

  // Sample SCP writing row
  const { rows: scpSample } = await pg.query(`
    SELECT id, unit_id, status, score, evaluation_status, evaluation_attempts,
           LEFT(answers::text, 200) AS answers_preview,
           LEFT(ai_feedback::text, 300) AS ai_feedback_preview,
           completed_at
    FROM student_curriculum_progress
    WHERE section_type='writing' AND ai_feedback IS NOT NULL LIMIT 1`);
  console.log('\nSAMPLE SCP WRITING ROW:'); console.table(scpSample);

  // Sample speaking row
  const { rows: srSample } = await pg.query(`
    SELECT id, unit_id, question_index, audio_format, audio_duration_seconds,
           evaluation_status,
           LEFT(ai_evaluation::text, 400) AS ai_eval_preview,
           created_at
    FROM speaking_recordings WHERE ai_evaluation IS NOT NULL LIMIT 1`);
  console.log('\nSAMPLE SPEAKING ROW:'); console.table(srSample);

  // Quota columns
  const { rows: quotaCols } = await pg.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('profiles','students')
    AND (column_name ILIKE '%limit%' OR column_name ILIKE '%quota%' OR column_name ILIKE '%override%')`);
  console.log('\nQUOTA/LIMIT COLS:'); console.table(quotaCols);

  // ai_usage breakdown last 30d
  const { rows: aiCost } = await pg.query(`
    SELECT type, model,
           COUNT(*) AS calls,
           ROUND(SUM(estimated_cost_sar)::numeric, 2) AS total_sar,
           ROUND(AVG(estimated_cost_sar)::numeric, 4) AS avg_sar
    FROM ai_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY type, model ORDER BY total_sar DESC`);
  console.log('\nAI_USAGE LAST 30D:'); console.table(aiCost);

  const { rows: aiTotal } = await pg.query(`
    SELECT ROUND(SUM(estimated_cost_sar)::numeric, 2) AS total_sar_30d,
           ROUND(SUM(estimated_cost_sar)::numeric / NULLIF(SUM(CASE WHEN type='writing_feedback' THEN 1 ELSE 0 END),0),4) AS avg_writing,
           ROUND(SUM(estimated_cost_sar)::numeric / NULLIF(SUM(CASE WHEN type='speaking_analysis' THEN 1 ELSE 0 END),0),4) AS avg_speaking
    FROM ai_usage WHERE created_at >= NOW() - INTERVAL '30 days'`);
  console.log('\nAI TOTALS:'); console.table(aiTotal);

  // curriculum levels summary
  const { rows: levels } = await pg.query(`
    SELECT cl.level_number, cl.title_en,
           COUNT(DISTINCT cu.id) AS units,
           COUNT(DISTINCT cw.id) AS writing_tasks,
           COUNT(DISTINCT cs.id) AS speaking_tasks
    FROM curriculum_levels cl
    LEFT JOIN curriculum_units cu ON cu.level_id=cl.id
    LEFT JOIN curriculum_writing cw ON cw.unit_id=cu.id
    LEFT JOIN curriculum_speaking cs ON cs.unit_id=cu.id
    GROUP BY cl.level_number, cl.title_en ORDER BY cl.level_number`);
  console.log('\nCURRICULUM SUMMARY:'); console.table(levels);

  // curriculum_writing sample
  const { rows: cwSample } = await pg.query(`
    SELECT id, unit_id, task_type, title_en,
           LEFT(prompt_en,120) AS prompt_preview,
           word_count_min, word_count_max,
           hints IS NOT NULL AS has_hints,
           vocabulary_to_use IS NOT NULL AS has_vocab,
           grammar_to_use IS NOT NULL AS has_grammar,
           model_answer IS NOT NULL AS has_model_answer
    FROM curriculum_writing LIMIT 3`);
  console.log('\nCURRICULUM_WRITING SAMPLE:'); console.table(cwSample);

  // curriculum_speaking sample
  const { rows: csSample } = await pg.query(`
    SELECT id, unit_id, topic_type, title_en,
           LEFT(prompt_en,120) AS prompt_preview,
           min_duration_seconds, max_duration_seconds,
           preparation_notes IS NOT NULL AS has_prep_notes,
           useful_phrases IS NOT NULL AS has_phrases,
           evaluation_criteria IS NOT NULL AS has_rubric
    FROM curriculum_speaking LIMIT 3`);
  console.log('\nCURRICULUM_SPEAKING SAMPLE:'); console.table(csSample);

  // Check if evaluate-writing function exists as a function vs ai-writing-feedback
  const { rows: funcCheck } = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name ILIKE '%hint%' OR table_name ILIKE '%coach%'`).catch(()=>({rows:[]}));

  await pg.end();
  console.log('\n=== PART 2 COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
