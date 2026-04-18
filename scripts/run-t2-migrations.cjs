const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const migrations = [
  '139_trainer_portal_v2_foundation.sql',
  '140_trainer_rpcs.sql',
  '141_trainer_rls.sql',
];

(async () => {
  await client.connect();
  console.log('Connected to Supabase DB');

  for (const file of migrations) {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', file);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\nRunning ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      console.error(`  ✗ ${file} FAILED:`, err.message);
      process.exit(1);
    }
  }

  // Verify all 7 tables exist
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'trainer_xp_events', 'trainer_streaks', 'student_interventions',
        'trainer_daily_rituals', 'nabih_conversations', 'nabih_messages', 'class_debriefs'
      )
    ORDER BY table_name;
  `);
  console.log(`\nTables created: ${rows.length}/7`);
  rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

  if (rows.length !== 7) {
    console.error('ERROR: Expected 7 tables, got', rows.length);
    process.exit(1);
  }

  // Verify RPCs
  const rpcs = ['award_trainer_xp', 'update_trainer_streak', 'get_trainer_totals', 'get_intervention_queue', 'start_morning_ritual'];
  const { rows: fns } = await client.query(`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = ANY($1::text[])
    ORDER BY routine_name;
  `, [rpcs]);
  console.log(`\nRPCs deployed: ${fns.length}/5`);
  fns.forEach(f => console.log(`  ✓ ${f.routine_name}`));

  await client.end();
  console.log('\n✅ All T2 migrations applied successfully');
})();
