const { Pool } = require('pg');
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
    // 0.1
    const { rows: r1 } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%placement%' OR table_name ILIKE '%quiz%' OR table_name ILIKE '%assessment%')"
    );
    console.log('=== 0.1 Existing placement/quiz/assessment tables ===');
    console.log(r1.length ? r1.map(r => r.table_name) : 'NONE');

    // 0.2
    const { rows: r2 } = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position"
    );
    console.log('\n=== 0.2 profiles table ===');
    r2.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type + ' | nullable:' + r.is_nullable));

    // 0.3
    const { rows: r3 } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='groups'"
    );
    console.log('\n=== 0.3 groups table ===');
    r3.forEach(r => console.log('  ' + r.column_name + ' | ' + r.data_type));

    // 0.4
    const { rows: r4 } = await client.query(
      "SELECT g.id, g.name, g.level, g.trainer_id, g.max_students, COUNT(p.id) AS current_count FROM groups g LEFT JOIN profiles p ON p.group_id = g.id AND p.role='student' GROUP BY g.id, g.name, g.level, g.trainer_id, g.max_students"
    );
    console.log('\n=== 0.4 Group capacity ===');
    r4.forEach(r => console.log('  ' + r.name + ' | level:' + r.level + ' | ' + r.current_count + '/' + r.max_students));

    // 0.5
    const { rows: r5 } = await client.query(
      "SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles'"
    );
    console.log('\n=== 0.5 RLS on profiles ===');
    r5.forEach(r => console.log('  ' + r.policyname + ' | ' + r.cmd));

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
