require('dotenv').config();
const { Client } = require('pg');

const SWEEP_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/sweep-speaking-evaluations';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSweep(label) {
  console.log(`\n=== ${label} ===`);
  const res = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify({ swept: data.swept, succeeded: data.succeeded, failed: data.failed }, null, 2));
  return data;
}

async function statusDist(client) {
  const { rows } = await client.query(`
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

  // Reset failed_retrying (attempt=1) back to pending so sweeper retries with fixed code
  const { rowCount } = await pg.query(`
    UPDATE speaking_recordings
    SET evaluation_status='pending', evaluation_attempts=0, last_attempt_at=NULL, last_error=NULL
    WHERE evaluation_status='failed_retrying'
  `);
  console.log(`Reset ${rowCount} failed_retrying rows to pending\n`);

  console.log('--- Before sweep ---');
  await statusDist(pg);

  // Sweep 1
  const r1 = await runSweep('Sweep 1');
  console.log('\nWaiting 90 seconds for evaluations to complete...');
  await new Promise(r => setTimeout(r, 90000));

  console.log('\n--- After sweep 1 ---');
  await statusDist(pg);

  if (r1.swept > 0) {
    const r2 = await runSweep('Sweep 2');
    console.log('\nWaiting 90 seconds...');
    await new Promise(r => setTimeout(r, 90000));
    console.log('\n--- After sweep 2 ---');
    await statusDist(pg);

    if (r2.swept > 0) {
      await runSweep('Sweep 3');
      await new Promise(r => setTimeout(r, 90000));
      console.log('\n--- After sweep 3 ---');
      await statusDist(pg);
    }
  }

  await pg.end();
  console.log('\nDone.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
