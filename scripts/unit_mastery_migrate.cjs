const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '133_unit_mastery_assessments.sql'),
      'utf8'
    );
    console.log('=== Applying unit mastery assessment migration ===\n');
    await client.query(sql);
    console.log('Migration applied successfully!\n');

    // Verify tables
    const { rows: tables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'unit_mastery_%' ORDER BY 1"
    );
    console.log('Tables:', tables.map(r => r.table_name));

    // Verify functions
    const { rows: funcs } = await client.query(
      "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name LIKE 'fn_%unit%' ORDER BY 1"
    );
    console.log('Functions:', funcs.map(r => r.routine_name));

    // Verify RLS
    const { rows: policies } = await client.query(
      "SELECT tablename, COUNT(*) as c FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'unit_mastery_%' GROUP BY 1 ORDER BY 1"
    );
    let totalP = 0;
    console.log('\nRLS policies:');
    policies.forEach(p => { console.log('  ' + p.tablename + ': ' + p.c); totalP += parseInt(p.c); });
    console.log('Total:', totalP);

    // Test fn_unit_activity_completion
    const { rows: [testResult] } = await client.query(
      "SELECT fn_unit_activity_completion((SELECT id FROM profiles WHERE role='student' LIMIT 1), (SELECT id FROM curriculum_units LIMIT 1)) as pct"
    );
    console.log('\nfn_unit_activity_completion test:', testResult.pct);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
