require('dotenv').config();
const { Client } = require('pg');
const LAMA_ID = 'e65109dc-99c9-4016-95f7-a6d71076ecae';

const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
(async()=>{
  await pg.connect();

  // What columns does 'submissions' have?
  const {rows: subCols} = await pg.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='submissions'
    ORDER BY ordinal_position
  `);
  console.log('=== submissions columns ==='); console.table(subCols);

  // What columns does student_curriculum_progress have?
  const {rows: scpCols} = await pg.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_curriculum_progress'
    ORDER BY ordinal_position
  `);
  console.log('=== student_curriculum_progress columns ==='); console.table(scpCols);

  // Lama's writing via student_curriculum_progress
  const {rows: lamaWriting} = await pg.query(`
    SELECT id, unit_id, section_type, status, score, writing_id,
           evaluation_status, evaluation_attempts, evaluation_last_attempt_at,
           completed_at, created_at
    FROM student_curriculum_progress
    WHERE student_id = $1 AND section_type = 'writing'
    ORDER BY created_at DESC
  `, [LAMA_ID]);
  console.log(`\n=== Lama writing progress (${lamaWriting.length} rows) ===`); console.table(lamaWriting);

  // Lama's speaking
  const {rows: lamaSpeaking} = await pg.query(`
    SELECT id, unit_id, ai_evaluation IS NOT NULL AS has_eval,
           evaluation_status, evaluation_attempts, last_error,
           audio_path IS NOT NULL AS has_path, created_at
    FROM speaking_recordings WHERE student_id = $1
    ORDER BY created_at DESC
  `, [LAMA_ID]);
  console.log(`\n=== Lama speaking (${lamaSpeaking.length} rows) ===`); console.table(lamaSpeaking);

  // Any submissions rows for Lama?
  const {rows: lamaSubmissions} = await pg.query(`
    SELECT id, student_id, unit_id, content IS NOT NULL AS has_content,
           ai_feedback IS NOT NULL AS has_feedback, created_at
    FROM submissions WHERE student_id = $1
    ORDER BY created_at DESC LIMIT 10
  `, [LAMA_ID]).catch(() => ({ rows: [] }));
  console.log(`\n=== Lama in submissions (${lamaSubmissions.length} rows) ===`);
  if (lamaSubmissions.length) console.table(lamaSubmissions);

  // Global: submissions without ai_feedback (last 90d)
  const {rows: globalWriting} = await pg.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE ai_feedback IS NULL) AS without_feedback,
           COUNT(DISTINCT student_id) FILTER (WHERE ai_feedback IS NULL) AS affected_students
    FROM submissions WHERE created_at >= NOW() - INTERVAL '90 days'
  `).catch(() => ({ rows: [{total:'n/a',without_feedback:'n/a',affected_students:'n/a'}] }));
  console.log('\n=== Global writing stuck ==='); console.table(globalWriting);

  // Global student_curriculum_progress writing pending/failed
  const {rows: globalSCP} = await pg.query(`
    SELECT evaluation_status, COUNT(*) AS cnt
    FROM student_curriculum_progress
    WHERE section_type='writing'
    GROUP BY evaluation_status ORDER BY evaluation_status
  `).catch(() => ({ rows: [] }));
  console.log('\n=== SCP writing evaluation_status distribution ===');
  if (globalSCP.length) console.table(globalSCP);

  // Global speaking stuck
  const {rows: globalSpeaking} = await pg.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE ai_evaluation IS NULL) AS without_eval,
           COUNT(DISTINCT student_id) FILTER (WHERE ai_evaluation IS NULL) AS affected_students
    FROM speaking_recordings WHERE created_at >= NOW() - INTERVAL '90 days'
  `);
  console.log('\n=== Global speaking stuck ==='); console.table(globalSpeaking);

  // Cron jobs
  const {rows: cron} = await pg.query(`
    SELECT jobname, schedule, active FROM cron.job
    WHERE jobname ILIKE '%sweep%' OR jobname ILIKE '%eval%' OR jobname ILIKE '%health%'
    ORDER BY jobname
  `);
  console.log('\n=== Cron jobs ==='); console.table(cron);

  // Admin user (role=admin)
  const {rows: admins} = await pg.query(`
    SELECT id, full_name, email FROM profiles WHERE role='admin' LIMIT 5
  `);
  console.log('\n=== Admin users ==='); console.table(admins);

  await pg.end();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
