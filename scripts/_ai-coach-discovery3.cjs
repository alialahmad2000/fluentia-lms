require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await pg.connect();

  // ai_student_profiles — no is_latest column
  const { rows: aspStats } = await pg.query(`
    SELECT COUNT(*) AS total_profiles,
           COUNT(DISTINCT student_id) AS distinct_students,
           ROUND(MIN(EXTRACT(epoch FROM NOW()-generated_at)/86400)) AS newest_days_old,
           ROUND(MAX(EXTRACT(epoch FROM NOW()-generated_at)/86400)) AS oldest_days_old,
           ROUND(AVG(EXTRACT(epoch FROM NOW()-generated_at)/86400)) AS avg_days_old
    FROM ai_student_profiles`);
  console.log('\nAI_STUDENT_PROFILES STATS:'); console.table(aspStats);

  // Get latest profile per student (by generated_at)
  const { rows: aspLatest } = await pg.query(`
    SELECT COUNT(DISTINCT student_id) AS students_with_profile
    FROM (SELECT DISTINCT ON (student_id) student_id, generated_at
          FROM ai_student_profiles ORDER BY student_id, generated_at DESC) t`);
  console.log('Students with at least 1 profile:', aspLatest[0].students_with_profile);

  // Active student count
  const { rows: activeCount } = await pg.query(`
    SELECT COUNT(*) AS active_students FROM students WHERE status='active'`);
  console.log('Active students total:', activeCount[0].active_students);

  const { rows: aspSample } = await pg.query(`
    SELECT student_id, generated_at, skills, strengths, weaknesses, summary_ar
    FROM ai_student_profiles ORDER BY generated_at DESC LIMIT 1`);
  if (aspSample.length) {
    const r = aspSample[0];
    console.log('\nSAMPLE ASP (latest):');
    console.log('  generated_at:', r.generated_at);
    console.log('  skills preview:', JSON.stringify(r.skills)?.slice(0,200));
    console.log('  strengths:', r.strengths?.slice(0,3));
    console.log('  weaknesses:', r.weaknesses?.slice(0,3));
    console.log('  summary_ar:', r.summary_ar?.slice(0,200));
  }

  // SCP RLS
  const { rows: scpRls } = await pg.query(`
    SELECT policyname, cmd, roles::text FROM pg_policies WHERE tablename='student_curriculum_progress'`);
  console.log('\nSCP RLS:'); console.table(scpRls);

  // SCP indexes
  const { rows: scpIdx } = await pg.query(`
    SELECT indexname FROM pg_indexes WHERE tablename='student_curriculum_progress'`);
  console.log('SCP INDEXES:', scpIdx.map(r=>r.indexname));

  // Speaking RLS
  const { rows: srRls } = await pg.query(`
    SELECT policyname, cmd, roles::text FROM pg_policies WHERE tablename='speaking_recordings'`);
  console.log('\nSPEAKING RLS:'); console.table(srRls);

  // Sample SCP writing row with ai_feedback
  const { rows: scpSample } = await pg.query(`
    SELECT id, unit_id, status, score, evaluation_status,
           LEFT(answers::text, 150) AS answers_preview,
           LEFT(ai_feedback::text, 250) AS feedback_preview,
           completed_at
    FROM student_curriculum_progress
    WHERE section_type='writing' AND ai_feedback IS NOT NULL LIMIT 1`);
  console.log('\nSAMPLE SCP WRITING:'); console.table(scpSample);

  // Sample speaking row
  const { rows: srSample } = await pg.query(`
    SELECT id, unit_id, question_index, audio_format, audio_duration_seconds, evaluation_status,
           (ai_evaluation->>'overall_score')::text AS score,
           (ai_evaluation->>'feedback_ar')::text AS feedback_ar_preview,
           created_at
    FROM speaking_recordings WHERE ai_evaluation IS NOT NULL ORDER BY created_at DESC LIMIT 1`);
  console.log('\nSAMPLE SPEAKING:'); console.table(srSample.map(r=>({...r,feedback_ar_preview:r.feedback_ar_preview?.slice(0,120)})));

  // Quota columns
  const { rows: quotaCols } = await pg.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('profiles','students')
    AND (column_name ILIKE '%limit%' OR column_name ILIKE '%quota%' OR column_name ILIKE '%override%')`);
  console.log('\nQUOTA COLS:'); console.table(quotaCols);

  // ai_usage last 30d breakdown
  const { rows: aiCost } = await pg.query(`
    SELECT type, model,
           COUNT(*) AS calls,
           ROUND(SUM(estimated_cost_sar)::numeric,2) AS total_sar,
           ROUND(AVG(estimated_cost_sar)::numeric,4) AS avg_sar
    FROM ai_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY type, model ORDER BY total_sar DESC`);
  console.log('\nAI USAGE LAST 30D:'); console.table(aiCost);

  const { rows: aiTotals } = await pg.query(`
    SELECT
      ROUND(SUM(estimated_cost_sar)::numeric,2) AS total_sar,
      SUM(CASE WHEN type='writing_feedback' THEN 1 ELSE 0 END) AS writing_calls,
      SUM(CASE WHEN type='speaking_analysis' THEN 1 ELSE 0 END) AS speaking_calls,
      SUM(CASE WHEN type='whisper_transcription' THEN 1 ELSE 0 END) AS whisper_calls,
      ROUND(SUM(CASE WHEN type='writing_feedback' THEN estimated_cost_sar ELSE 0 END)::numeric /
            NULLIF(SUM(CASE WHEN type='writing_feedback' THEN 1 ELSE 0 END),0), 4) AS avg_writing_sar,
      ROUND(SUM(CASE WHEN type='speaking_analysis' THEN estimated_cost_sar ELSE 0 END)::numeric /
            NULLIF(SUM(CASE WHEN type='speaking_analysis' THEN 1 ELSE 0 END),0), 4) AS avg_speaking_sar
    FROM ai_usage WHERE created_at >= NOW() - INTERVAL '30 days'`);
  console.log('\nAI COST TOTALS:'); console.table(aiTotals);

  // Curriculum levels summary
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

  // Writing sample rows
  const { rows: cwSample } = await pg.query(`
    SELECT cw.id, cu.unit_number, cl.level_number, cw.task_type, cw.title_en,
           LEFT(cw.prompt_en,100) AS prompt_preview,
           cw.word_count_min, cw.word_count_max,
           cw.hints IS NOT NULL AS has_hints,
           cw.vocabulary_to_use IS NOT NULL AS has_vocab,
           cw.grammar_to_use IS NOT NULL AS has_grammar,
           cw.model_answer IS NOT NULL AS has_model_answer,
           cw.rubric IS NOT NULL AS has_rubric
    FROM curriculum_writing cw
    JOIN curriculum_units cu ON cu.id=cw.unit_id
    JOIN curriculum_levels cl ON cl.id=cu.level_id
    ORDER BY cl.level_number, cu.unit_number LIMIT 4`);
  console.log('\nCW SAMPLES:'); console.table(cwSample);

  // Speaking sample
  const { rows: csSample } = await pg.query(`
    SELECT cs.id, cu.unit_number, cl.level_number, cs.topic_type, cs.title_en,
           LEFT(cs.prompt_en,100) AS prompt_preview,
           cs.min_duration_seconds, cs.max_duration_seconds,
           cs.preparation_notes IS NOT NULL AS has_prep,
           cs.useful_phrases IS NOT NULL AS has_phrases,
           cs.evaluation_criteria IS NOT NULL AS has_rubric
    FROM curriculum_speaking cs
    JOIN curriculum_units cu ON cu.id=cs.unit_id
    JOIN curriculum_levels cl ON cl.id=cu.level_id
    ORDER BY cl.level_number, cu.unit_number LIMIT 4`);
  console.log('\nCS SAMPLES:'); console.table(csSample);

  await pg.end();
  console.log('\n=== PART 3 COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
