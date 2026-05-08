require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  console.log('Waiting 150 seconds for in-flight evaluations to complete...');
  await new Promise(r => setTimeout(r, 150000));

  const { rows: dist } = await client.query(`
    SELECT evaluation_status, COUNT(*) AS cnt
    FROM speaking_recordings GROUP BY evaluation_status ORDER BY evaluation_status
  `);
  console.log('=== Status distribution ===');
  console.table(dist);

  const { rows: details } = await client.query(`
    SELECT id, evaluation_status, evaluation_attempts, last_error,
           LEFT(audio_path, 50) AS audio_path
    FROM speaking_recordings
    WHERE evaluation_status != 'completed'
    ORDER BY last_attempt_at DESC LIMIT 5
  `);
  if (details.length) {
    console.log('=== Non-completed rows ===');
    console.table(details);
  }

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
