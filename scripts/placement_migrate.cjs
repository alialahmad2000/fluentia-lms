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
      path.join(__dirname, '..', 'supabase', 'migrations', '132_placement_test.sql'),
      'utf8'
    );

    console.log('=== Applying placement test migration ===\n');
    await client.query(sql);
    console.log('Migration applied successfully!\n');

    // Verify tables
    const { rows: tables } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'placement_%' ORDER BY table_name"
    );
    console.log('Created tables:', tables.map(r => r.table_name));

    // Verify RLS policies
    const { rows: policies } = await client.query(
      "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'placement_%' ORDER BY tablename, policyname"
    );
    console.log('\nRLS policies:');
    policies.forEach(p => console.log(`  ${p.tablename}: ${p.policyname}`));
    console.log(`\nTotal policies: ${policies.length}`);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
