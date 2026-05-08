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

  const { rows } = await client.query(`
    SELECT id, evaluation_status, evaluation_attempts, last_error,
           LEFT(audio_path, 60) AS audio_path_preview,
           audio_url IS NOT NULL AS has_url
    FROM speaking_recordings
    WHERE evaluation_status IN ('failed_retrying','failed_manual','evaluating','pending')
    ORDER BY last_attempt_at DESC
    LIMIT 10
  `);
  console.log('=== Failed/pending rows ===');
  console.table(rows);

  const { rows: dist } = await client.query(`
    SELECT evaluation_status, COUNT(*) AS cnt
    FROM speaking_recordings
    GROUP BY evaluation_status ORDER BY evaluation_status
  `);
  console.log('=== Status distribution ===');
  console.table(dist);

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
