/**
 * Phase A — Schema Discovery
 * Discovers all curriculum_, speaking_, student_ tables and their columns.
 * Read-only. Saves report to scripts/snapshots/output/01-schema-report.txt
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
};

const OUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const c = new Client(DB);
  await c.connect();
  console.log('Connected.\n');

  const lines = [];
  const log = (...args) => { const s = args.join(' '); console.log(s); lines.push(s); };

  log('=== Phase A — Schema Discovery ===');
  log(`Generated: ${new Date().toISOString()}`);
  log('');

  // 1. Find all relevant tables
  const tables = await c.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name LIKE 'curriculum_%' OR table_name LIKE 'speaking_%' OR table_name LIKE 'student_%')
    ORDER BY table_name
  `);

  log(`Tables found (${tables.rows.length}):`);
  tables.rows.forEach(r => log('  -', r.table_name));
  log('');

  // 2. For each table, get columns
  for (const row of tables.rows) {
    const cols = await c.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [row.table_name]);

    // Also get row count
    const cnt = await c.query(`SELECT count(*) FROM "${row.table_name}"`).catch(() => ({ rows: [{ count: 'ERROR' }] }));

    log(`--- ${row.table_name} (${cnt.rows[0].count} rows) ---`);
    cols.rows.forEach(col => {
      log(`  ${col.column_name.padEnd(35)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'}`);
    });
    log('');
  }

  await c.end();

  const report = lines.join('\n');
  const outPath = path.join(OUT_DIR, '01-schema-report.txt');
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`\n✅ Phase A complete. Schema saved to scripts/snapshots/output/01-schema-report.txt`);
  return tables.rows.map(r => r.table_name);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
