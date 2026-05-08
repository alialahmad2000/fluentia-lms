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

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'speaking_recordings'
    ORDER BY ordinal_position
  `);
  console.log('=== speaking_recordings columns ===');
  console.table(cols);

  const { rows: newCols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='speaking_recordings'
      AND column_name IN ('evaluation_status','evaluation_attempts','last_attempt_at','last_error')
  `);
  console.log('=== new status columns already present ===', newCols.map(r => r.column_name));

  const { rows: audit } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE ai_evaluation IS NULL AND ai_evaluated_at IS NULL) AS no_eval,
      COUNT(*) FILTER (WHERE ai_evaluation IS NULL AND created_at < NOW() - INTERVAL '1 hour') AS stuck_over_1h,
      COUNT(*) FILTER (WHERE (ai_evaluation->>'overall_score')::numeric = 7) AS got_score_7,
      COUNT(*) AS total
    FROM speaking_recordings
  `);
  console.log('=== audit counts ===');
  console.table(audit);

  const { rows: cron } = await client.query(`SELECT extname FROM pg_extension WHERE extname='pg_cron'`);
  console.log('pg_cron available:', cron.length > 0 ? 'YES' : 'NO');

  const { rows: notifTypes } = await client.query(`
    SELECT e.enumlabel
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%notification%type%'
    ORDER BY e.enumsortorder
  `);
  console.log('notification type enum:', notifTypes.map(r => r.enumlabel));

  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
