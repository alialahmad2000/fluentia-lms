// AI Coach Phase 1 Discovery — production DB read-only
require('dotenv').config();
const { Client } = require('pg');

const pg = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await pg.connect();

  // ── 1. Writing-related tables ──
  const { rows: writingTables } = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
    AND (table_name ILIKE '%writing%' OR table_name ILIKE '%write%')
    ORDER BY table_name`);
  console.log('WRITING TABLES:', writingTables.map(r=>r.table_name));

  // ── 2. curriculum_writing columns ──
  const { rows: cwCols } = await pg.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='curriculum_writing'
    ORDER BY ordinal_position`);
  console.log('\nCURRICULUM_WRITING COLUMNS:'); console.table(cwCols);

  // curriculum_writing_prompts columns
  const { rows: cwpCols } = await pg.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='curriculum_writing_prompts'
    ORDER BY ordinal_position`);
  console.log('\nCURRICULUM_WRITING_PROMPTS COLUMNS:'); console.table(cwpCols);

  // ── 3. Writing task counts per level ──
  const { rows: writingPerLevel } = await pg.query(`
    SELECT cl.level_number, COUNT(cw.id) AS writing_tasks
    FROM curriculum_writing cw
    JOIN curriculum_units cu ON cu.id = cw.unit_id
    JOIN curriculum_levels cl ON cl.id = cu.level_id
    GROUP BY cl.level_number ORDER BY cl.level_number`);
  console.log('\nWRITING TASKS PER LEVEL:'); console.table(writingPerLevel);

  // ── 4. Writing submissions last 30d ──
  const { rows: writingSubs } = await pg.query(`
    SELECT COUNT(*) AS total_submissions_30d
    FROM student_curriculum_progress
    WHERE section_type='writing'
      AND completed_at >= NOW() - INTERVAL '30 days'`);
  console.log('\nWRITING SUBMISSIONS LAST 30D:'); console.table(writingSubs);

  // ── 5. Active student + their last 5 writing subs ──
  const { rows: activeStu } = await pg.query(`
    SELECT scp.student_id, COUNT(*) AS submissions
    FROM student_curriculum_progress scp
    JOIN students s ON s.id = scp.student_id
    WHERE scp.section_type='writing' AND s.status='active'
    GROUP BY scp.student_id ORDER BY submissions DESC LIMIT 1`);
  if (activeStu.length) {
    const sid = activeStu[0].student_id;
    const { rows: last5w } = await pg.query(`
      SELECT id, unit_id, status, score,
             ai_feedback IS NOT NULL AS has_feedback,
             evaluation_status, evaluation_attempts,
             completed_at
      FROM student_curriculum_progress
      WHERE student_id=$1 AND section_type='writing'
      ORDER BY completed_at DESC NULLS LAST LIMIT 5`, [sid]);
    console.log(`\nACTIVE STUDENT ${sid} LAST 5 WRITING:`); console.table(last5w);
  }

  // ── 6. Speaking-related tables ──
  const { rows: speakingTables } = await pg.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
    AND (table_name ILIKE '%speak%' OR table_name ILIKE '%speech%' OR table_name ILIKE '%record%')
    ORDER BY table_name`);
  console.log('\nSPEAKING TABLES:', speakingTables.map(r=>r.table_name));

  // curriculum_speaking columns
  const { rows: csCols } = await pg.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='curriculum_speaking'
    ORDER BY ordinal_position`);
  console.log('\nCURRICULUM_SPEAKING COLUMNS:'); console.table(csCols);

  // speaking_recordings columns
  const { rows: srCols } = await pg.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='speaking_recordings'
    ORDER BY ordinal_position`);
  console.log('\nSPEAKING_RECORDINGS COLUMNS:'); console.table(srCols);

  // ── 7. Speaking tasks per level ──
  const { rows: speakingPerLevel } = await pg.query(`
    SELECT cl.level_number, COUNT(cs.id) AS speaking_tasks
    FROM curriculum_speaking cs
    JOIN curriculum_units cu ON cu.id = cs.unit_id
    JOIN curriculum_levels cl ON cl.id = cu.level_id
    GROUP BY cl.level_number ORDER BY cl.level_number`);
  console.log('\nSPEAKING TASKS PER LEVEL:'); console.table(speakingPerLevel);

  // ── 8. Speaking recordings last 30d ──
  const { rows: speakRecs } = await pg.query(`
    SELECT COUNT(*) AS total_recordings_30d,
           COUNT(*) FILTER (WHERE ai_evaluation IS NOT NULL) AS with_eval
    FROM speaking_recordings
    WHERE created_at >= NOW() - INTERVAL '30 days'`);
  console.log('\nSPEAKING RECORDINGS LAST 30D:'); console.table(speakRecs);

  // Active student last 5 speaking
  if (activeStu.length) {
    const sid = activeStu[0].student_id;
    const { rows: last5s } = await pg.query(`
      SELECT id, unit_id, question_index,
             transcript IS NOT NULL AS has_transcript,
             ai_evaluation IS NOT NULL AS has_eval,
             (ai_evaluation->>'overall_score')::text AS overall_score,
             evaluation_status, created_at
      FROM speaking_recordings
      WHERE student_id=$1
      ORDER BY created_at DESC LIMIT 5`, [sid]);
    console.log(`\nACTIVE STUDENT ${sid} LAST 5 SPEAKING:`); console.table(last5s);
  }

  // ── 9. ai_student_profiles ──
  const { rows: aspExists } = await pg.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_student_profiles'
    ORDER BY ordinal_position`);
  if (aspExists.length) {
    console.log('\nAI_STUDENT_PROFILES COLUMNS:'); console.table(aspExists);
    const { rows: aspStats } = await pg.query(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE is_latest=true) AS latest_count,
             COUNT(DISTINCT student_id) AS distinct_students,
             MIN(EXTRACT(day FROM NOW()-generated_at)) FILTER (WHERE is_latest=true) AS newest_days_old,
             MAX(EXTRACT(day FROM NOW()-generated_at)) FILTER (WHERE is_latest=true) AS oldest_days_old
      FROM ai_student_profiles`);
    console.log('\nAI_STUDENT_PROFILES STATS:'); console.table(aspStats);
    const { rows: aspSample } = await pg.query(`
      SELECT id, student_id, is_latest, generated_at,
             LEFT(profile_data::text, 300) AS profile_data_preview
      FROM ai_student_profiles WHERE is_latest=true LIMIT 1`);
    if (aspSample.length) { console.log('\nSAMPLE ASP ROW (student_id redacted):'); console.table(aspSample.map(r=>({...r,student_id:'[REDACTED]'}))); }
  } else {
    console.log('\nAI_STUDENT_PROFILES: TABLE DOES NOT EXIST');
    // Check ai_insight_cache on students
    const { rows: aiCacheCheck } = await pg.query(`
      SELECT COUNT(*) AS with_cache FROM students WHERE ai_insight_cache IS NOT NULL`);
    console.log('students.ai_insight_cache populated:', aiCacheCheck[0].with_cache);
  }

  // ── 10. SCP deep-dive (indexes + RLS) ──
  const { rows: scpIdx } = await pg.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename='student_curriculum_progress'`);
  console.log('\nSCP INDEXES:'); console.table(scpIdx);

  const { rows: scpRls } = await pg.query(`
    SELECT policyname, cmd, roles, qual
    FROM pg_policies WHERE tablename='student_curriculum_progress'`);
  console.log('\nSCP RLS POLICIES:'); console.table(scpRls);

  // speaking_recordings indexes + RLS
  const { rows: srIdx } = await pg.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE tablename='speaking_recordings'`);
  console.log('\nSPEAKING_RECORDINGS INDEXES:'); console.table(srIdx);

  const { rows: srRls } = await pg.query(`
    SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename='speaking_recordings'`);
  console.log('\nSPEAKING_RECORDINGS RLS:'); console.table(srRls);

  // ── 11. Sample SCP writing row ──
  const { rows: scpSample } = await pg.query(`
    SELECT id, unit_id, section_type, status, score,
           evaluation_status, evaluation_attempts,
           LEFT(answers::text, 200) AS answers_preview,
           LEFT(ai_feedback::text, 200) AS ai_feedback_preview,
           completed_at
    FROM student_curriculum_progress
    WHERE section_type='writing' AND ai_feedback IS NOT NULL
    LIMIT 1`);
  console.log('\nSAMPLE SCP WRITING ROW:'); console.table(scpSample);

  // Sample speaking row
  const { rows: srSample } = await pg.query(`
    SELECT id, unit_id, question_index, audio_format,
           audio_duration_seconds, evaluation_status,
           LEFT((ai_evaluation->>'feedback_ar')::text, 100) AS feedback_ar_preview,
           (ai_evaluation->>'overall_score')::text AS overall_score,
           created_at
    FROM speaking_recordings WHERE ai_evaluation IS NOT NULL LIMIT 1`);
  console.log('\nSAMPLE SPEAKING ROW:'); console.table(srSample);

  // ── 12. Quota columns ──
  const { rows: quotaCols } = await pg.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('profiles','students')
    AND (column_name ILIKE '%limit%' OR column_name ILIKE '%quota%' OR column_name ILIKE '%override%')`);
  console.log('\nQUOTA/LIMIT COLUMNS:'); console.table(quotaCols);

  // ── 13. ai_usage breakdown last 30d ──
  const { rows: aiCost } = await pg.query(`
    SELECT type, model,
           COUNT(*) AS calls,
           ROUND(SUM(estimated_cost_sar)::numeric, 2) AS total_cost_sar,
           ROUND(AVG(estimated_cost_sar)::numeric, 4) AS avg_cost_sar
    FROM ai_usage
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY type, model ORDER BY total_cost_sar DESC`);
  console.log('\nAI_USAGE LAST 30D (by type+model):'); console.table(aiCost);

  const { rows: aiTotal } = await pg.query(`
    SELECT ROUND(SUM(estimated_cost_sar)::numeric, 2) AS total_sar_30d
    FROM ai_usage WHERE created_at >= NOW() - INTERVAL '30 days'`);
  console.log('AI TOTAL COST LAST 30D:', aiTotal[0].total_sar_30d, 'SAR');

  // ── 14. curriculum_units / curriculum_levels structure ──
  const { rows: levelRows } = await pg.query(`
    SELECT cl.id, cl.level_number, cl.title_en,
           COUNT(cu.id) AS unit_count
    FROM curriculum_levels cl
    LEFT JOIN curriculum_units cu ON cu.level_id=cl.id
    GROUP BY cl.id, cl.level_number, cl.title_en
    ORDER BY cl.level_number`);
  console.log('\nCURRICULUM LEVELS + UNIT COUNTS:'); console.table(levelRows);

  await pg.end();
  console.log('\n=== DB DISCOVERY COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
