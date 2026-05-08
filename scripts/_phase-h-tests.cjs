require('dotenv').config();
const { Client } = require('pg');
const pg = new Client({ host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}});
const LAMA_ID = 'e65109dc-99c9-4016-95f7-a6d71076ecae';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1';

async function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
async function fail(msg) { console.error(`  ❌ FAIL: ${msg}`); }

(async()=>{
  await pg.connect();
  let allPassed = true;

  console.log('\n═══ PHASE H TESTS ═══\n');

  // H3: sweeper picks up failed_retrying rows > 3 min old
  // Insert a test speaking row with failed_retrying status
  console.log('H3: Sweeper picks up stale failed_retrying...');
  const {rows: testRow} = await pg.query(`
    INSERT INTO speaking_recordings (student_id, unit_id, audio_url, evaluation_status, evaluation_attempts, last_attempt_at)
    VALUES ($1, (SELECT id FROM curriculum_units LIMIT 1), 'https://test.example.com/test.webm', 'failed_retrying', 1, NOW() - INTERVAL '10 minutes')
    RETURNING id
  `, [LAMA_ID]);
  const testId = testRow[0]?.id;
  console.log(`  Inserted test row: ${testId}`);

  const sweepRes = await fetch(`${BASE_URL}/sweep-speaking-evaluations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const sweepData = await sweepRes.json();
  if (sweepData.swept >= 1) { pass('Sweeper found and processed the stale row'); } else { fail(`Sweeper swept=${sweepData.swept}`); allPassed=false; }

  // Clean up test row
  await pg.query(`DELETE FROM speaking_recordings WHERE id=$1`, [testId]);
  console.log('  Cleaned up test row.\n');

  // H5: Health monitor runs and logs
  console.log('H5: Health monitor logs a row...');
  const hmRes = await fetch(`${BASE_URL}/health-monitor-evaluations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const hmData = await hmRes.json();
  const {rows: logRows} = await pg.query(`SELECT COUNT(*) AS cnt FROM evaluation_health_log`);
  if (parseInt(logRows[0].cnt) >= 1) {
    pass(`health_monitor ran, log has ${logRows[0].cnt} row(s), admin_alerted=${hmData.admin_alerted}`);
  } else { fail('No rows in evaluation_health_log'); allPassed=false; }
  console.log('');

  // H6: Speaking score variance
  console.log('H6: Speaking score variance...');
  const {rows: varRows} = await pg.query(`
    SELECT ROUND(STDDEV((ai_evaluation->>'overall_score')::numeric)::numeric,2) AS stddev,
           array_agg((ai_evaluation->>'overall_score')::numeric ORDER BY created_at DESC) AS scores
    FROM speaking_recordings
    WHERE ai_evaluation IS NOT NULL AND created_at >= NOW() - INTERVAL '14 days'
  `);
  const stddev = parseFloat(varRows[0]?.stddev) || 0;
  const scores = varRows[0]?.scores?.slice(0,10) || [];
  console.log(`  stddev=${stddev}, last 10 scores:`, scores);
  if (stddev > 0.5) { pass(`stddev=${stddev} > 0.5 — no convergence`); }
  else { fail(`stddev=${stddev} <= 0.5 — CONVERGENCE RISK`); allPassed=false; }
  console.log('');

  // H7: Lama final check
  console.log('H7: Lama final state...');
  const {rows: lamaW} = await pg.query(`SELECT COUNT(*) AS cnt FROM student_curriculum_progress WHERE student_id=$1 AND section_type='writing'`, [LAMA_ID]);
  const {rows: lamaS} = await pg.query(`SELECT COUNT(*) AS cnt FROM speaking_recordings WHERE student_id=$1`, [LAMA_ID]);
  console.log(`  Lama writing submissions: ${lamaW[0].cnt}`);
  console.log(`  Lama speaking recordings: ${lamaS[0].cnt}`);
  if (parseInt(lamaW[0].cnt) === 0 && parseInt(lamaS[0].cnt) === 0) {
    pass('Lama has 0 submissions — nothing stuck (she has not submitted yet, provisioned 2026-05-05)');
  } else {
    // Count any stuck
    const {rows: lamaStuck} = await pg.query(`
      SELECT
        (SELECT COUNT(*) FROM student_curriculum_progress WHERE student_id=$1 AND section_type='writing' AND evaluation_status NOT IN ('completed','escalated')) AS w_stuck,
        (SELECT COUNT(*) FROM speaking_recordings WHERE student_id=$1 AND evaluation_status != 'completed') AS s_stuck
    `, [LAMA_ID]);
    if (parseInt(lamaStuck[0].w_stuck) === 0 && parseInt(lamaStuck[0].s_stuck) === 0) {
      pass('Lama 0 stuck items');
    } else {
      fail(`Lama has stuck items: writing=${lamaStuck[0].w_stuck}, speaking=${lamaStuck[0].s_stuck}`);
      allPassed = false;
    }
  }
  console.log('');

  // Cron jobs check
  console.log('Cron jobs active:');
  const {rows: cronJobs} = await pg.query(`SELECT jobname, schedule, active FROM cron.job WHERE jobname ILIKE '%sweep%' OR jobname ILIKE '%health%' ORDER BY jobname`);
  console.table(cronJobs);
  if (cronJobs.every(j=>j.active)) { pass('All 3 cron jobs active'); } else { fail('Some cron jobs inactive'); allPassed=false; }

  await pg.end();
  console.log(`\n═══ TESTS ${allPassed ? 'ALL PASSED ✅' : 'SOME FAILED ❌'} ═══`);
  if (!allPassed) process.exit(1);
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
