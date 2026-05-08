require('dotenv').config();
const { Client } = require('pg');

const SWEEP_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/sweep-speaking-evaluations';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSweep(label) {
  console.log(`\n=== ${label} ===`);
  const res = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify({ swept: data.swept, succeeded: data.succeeded, failed: data.failed }));
  return data;
}

async function statusDist(pg) {
  const { rows } = await pg.query(`
    SELECT evaluation_status, COUNT(*) AS cnt
    FROM speaking_recordings GROUP BY evaluation_status ORDER BY evaluation_status
  `);
  console.table(rows);
}

(async () => {
  const pg = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com',
    port: 5432, database: 'postgres',
    user: 'postgres.nmjexpuycmqcxuxljier',
    password: 'Ali-al-ahmad2000',
    ssl: { rejectUnauthorized: false }
  });
  await pg.connect();

  // Reset stuck evaluating rows (attempts=2, no error) back to pending
  const { rowCount } = await pg.query(`
    UPDATE speaking_recordings
    SET evaluation_status='pending', evaluation_attempts=0, last_attempt_at=NULL, last_error=NULL
    WHERE evaluation_status='evaluating'
  `);
  console.log(`Reset ${rowCount} stuck 'evaluating' rows to pending`);

  await statusDist(pg);

  // Sweep 1 — stagger with small delay to avoid thundering herd
  const r1 = await runSweep('Sweep 1');

  console.log('\nWaiting 120s for Whisper + Claude to complete...');
  await new Promise(r => setTimeout(r, 120000));
  await statusDist(pg);

  if (r1.swept > 0) {
    // Catch any that are still evaluating (orphaned)
    const { rowCount: orphans } = await pg.query(`
      UPDATE speaking_recordings
      SET evaluation_status='pending', last_attempt_at=NULL
      WHERE evaluation_status='evaluating'
        AND last_attempt_at < NOW() - INTERVAL '3 minutes'
    `);
    if (orphans > 0) {
      console.log(`\nReset ${orphans} orphaned evaluating rows, running sweep 2...`);
      await runSweep('Sweep 2 (orphan rescue)');
      await new Promise(r => setTimeout(r, 120000));
      await statusDist(pg);
    }
  }

  // Final error check
  const { rows: errs } = await pg.query(`
    SELECT id, evaluation_status, evaluation_attempts, LEFT(last_error, 120) AS last_error
    FROM speaking_recordings WHERE evaluation_status != 'completed'
    ORDER BY evaluation_attempts DESC LIMIT 5
  `);
  if (errs.length) {
    console.log('\n=== Non-completed rows ===');
    console.table(errs);
  } else {
    console.log('\n✅ All recordings are completed!');
  }

  await pg.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
