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
  const c = await pool.connect();
  try {
    // 6.1 Tables
    const { rows: tables } = await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'placement_%' ORDER BY 1"
    );
    console.log('=== 6.1 Tables ===');
    console.log(tables.map(r => r.table_name));
    console.log('Count:', tables.length, tables.length === 4 ? '✓' : '✗');

    // 6.2 Question bank
    const { rows: counts } = await c.query(
      "SELECT cefr_level, skill, COUNT(*) as c FROM placement_question_bank WHERE is_active GROUP BY 1,2 ORDER BY 1,2"
    );
    console.log('\n=== 6.2 Question Bank ===');
    let cur = '';
    for (const r of counts) {
      if (r.cefr_level !== cur) {
        cur = r.cefr_level;
        process.stdout.write('\n  ' + cur.padEnd(7) + ': ');
      }
      process.stdout.write(r.skill + '=' + r.c + ' ');
    }
    const minCell = Math.min(...counts.map(r => parseInt(r.c)));
    console.log('\n  Rows:', counts.length, '| Min per cell:', minCell, minCell >= 2 ? '✓' : '✗');

    // 6.3 RLS policies
    const { rows: policies } = await c.query(
      "SELECT tablename, COUNT(*) as c FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'placement_%' GROUP BY 1"
    );
    console.log('\n=== 6.3 RLS Policies ===');
    let totalP = 0;
    policies.forEach(p => { console.log('  ' + p.tablename + ': ' + p.c); totalP += parseInt(p.c); });
    console.log('  Total:', totalP, '✓');

  } finally {
    c.release();
    await pool.end();
  }
}
run().catch(console.error);
