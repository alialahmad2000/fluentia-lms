require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const CANDIDATE_TABLES = [
  'ielts_diagnostic',
  'ielts_reading_passages',
  'ielts_reading_questions',
  'ielts_reading_skills',
  'ielts_writing_tasks',
  'ielts_listening_sections',
  'ielts_listening_questions',
  'ielts_speaking_questions',
  'ielts_speaking_topics',
  'ielts_mock_tests',
  'ielts_student_results',
  'ielts_student_progress',
  'ielts_error_bank',
  'ielts_adaptive_plans',
  'ielts_mock_attempts',
];

async function probeTable(name) {
  const { count, error: countErr } = await supabase
    .from(name)
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    if (countErr.code === '42P01') return { exists: false };
    return { exists: false, error: countErr.message };
  }

  const { data: sample } = await supabase.from(name).select('*').limit(1);
  const columns = (sample && sample.length > 0) ? Object.keys(sample[0]) : [];
  const sampleRow = (sample && sample.length > 0) ? sample[0] : null;

  const breakdowns = {};
  for (const col of ['test_variant', 'type', 'difficulty_band', 'part', 'section_number', 'task_type']) {
    if (columns.includes(col)) {
      const { data: grouped } = await supabase.from(name).select(col);
      if (grouped) {
        const counts = {};
        grouped.forEach(r => {
          const val = r[col] ?? 'null';
          counts[val] = (counts[val] || 0) + 1;
        });
        breakdowns[col] = counts;
      }
    }
  }

  return { exists: true, count, columns, sampleRow, breakdowns };
}

// ─── PHASE A: Deep Schema Probe via direct Postgres ─────────────────────────

async function probeSchemas() {
  const client = await pool.connect();
  const TABLES_TO_PROBE = [
    'ielts_student_results',
    'ielts_student_progress',
    'ielts_error_bank',
    'ielts_adaptive_plans',
    'ielts_mock_attempts',
    'ielts_reading_questions',
    'ielts_listening_questions',
    'ielts_speaking_topics',
  ];

  console.log('\n=== PHASE A PROBE REPORT ===\n');

  // A.2 — Package enum
  const enumRes = await client.query(`
    SELECT t.typname, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN (
      SELECT udt_name FROM information_schema.columns
      WHERE table_name='students' AND column_name='package'
    )
    ORDER BY e.enumsortorder;
  `);
  const enumName = enumRes.rows[0]?.typname || 'UNKNOWN';
  const enumValues = enumRes.rows.map(r => r.enumlabel);
  console.log(`Package enum type: ${enumName}`);
  console.log(`Current values: [${enumValues.join(', ')}]`);
  console.log(`'ielts' present: ${enumValues.includes('ielts') ? 'YES' : 'NO'}`);
  console.log();

  // A.1 — Deep probe each table
  for (const tableName of TABLES_TO_PROBE) {
    console.log(`--- Table: ${tableName} ---`);

    // Columns
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    if (colRes.rows.length === 0) {
      console.log('  NOT FOUND in information_schema');
    } else {
      console.log('Columns:');
      colRes.rows.forEach(r => {
        const nullable = r.is_nullable === 'NO' ? 'NOT NULL' : '';
        const def = r.column_default ? `DEFAULT ${r.column_default}` : '';
        console.log(`  ${r.column_name}  ${r.data_type}  ${nullable}  ${def}`.trim());
      });
    }

    // Row count
    try {
      const countRes = await client.query(`SELECT COUNT(*) FROM public.${tableName};`);
      console.log(`Row count: ${countRes.rows[0].count}`);
    } catch (e) {
      console.log(`Row count: ERROR — ${e.message}`);
    }

    // RLS
    const rlsRes = await client.query(`
      SELECT relrowsecurity FROM pg_class
      WHERE relname = $1 AND relnamespace = 'public'::regnamespace;
    `, [tableName]);
    const rlsEnabled = rlsRes.rows[0]?.relrowsecurity ?? false;
    console.log(`Has RLS enabled: ${rlsEnabled ? 'YES' : 'NO'}`);

    // Policies
    const polRes = await client.query(`
      SELECT polname, polcmd, polqual::text FROM pg_policy
      WHERE polrelid = (
        SELECT oid FROM pg_class WHERE relname = $1 AND relnamespace = 'public'::regnamespace
      );
    `, [tableName]);
    if (polRes.rows.length === 0) {
      console.log('Policies: none');
    } else {
      console.log('Policies:');
      polRes.rows.forEach(r => console.log(`  ${r.polname} (${r.polcmd})`));
    }

    // Indexes
    const idxRes = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename = $1;
    `, [tableName]);
    if (idxRes.rows.length === 0) {
      console.log('Indexes: none');
    } else {
      console.log('Indexes:');
      idxRes.rows.forEach(r => console.log(`  ${r.indexname}`));
    }

    console.log();
  }

  // A.3 — Storage buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Storage buckets existing:');
  (buckets || []).forEach(b => console.log(`  - ${b.name} (${b.public ? 'public' : 'private'})`));
  const ieltsNeeded = ['ielts-audio', 'ielts-speaking-submissions', 'ielts-writing-images'];
  const existing = (buckets || []).map(b => b.name);
  const missing = ieltsNeeded.filter(n => !existing.includes(n));
  console.log(`Missing IELTS buckets: ${missing.join(', ') || 'none'}`);
  console.log();

  // A.4 — difficulty_band values
  const dbRes = await client.query(`
    SELECT difficulty_band, COUNT(*) FROM ielts_reading_passages
    GROUP BY difficulty_band ORDER BY count DESC;
  `);
  console.log('difficulty_band values in ielts_reading_passages:');
  dbRes.rows.forEach(r => {
    const typo = r.difficulty_band === '5-6' ? '  ← TYPO' : '';
    console.log(`  ${r.difficulty_band}: ${r.count}${typo}`);
  });

  console.log('\n=== END PHASE A ===\n');

  client.release();
  return { enumName, enumValues };
}

async function main() {
  const args = process.argv.slice(2);
  const phaseA = args.includes('--phase-a') || args.length === 0;

  if (phaseA) {
    await probeSchemas();
    await pool.end();
    return;
  }

  console.log('=== PHASE 0A: Database Inventory ===\n');

  const tableResults = {};
  for (const name of CANDIDATE_TABLES) {
    process.stdout.write(`Probing ${name}... `);
    tableResults[name] = await probeTable(name);
    console.log(tableResults[name].exists ? `EXISTS (${tableResults[name].count} rows)` : 'NOT FOUND');
  }

  console.log('\n--- Table Details ---');
  for (const [name, result] of Object.entries(tableResults)) {
    if (!result.exists) continue;
    console.log(`\n## ${name}`);
    console.log(`  Rows: ${result.count}`);
    console.log(`  Columns: ${result.columns.join(', ')}`);
    if (Object.keys(result.breakdowns).length > 0) {
      console.log(`  Breakdowns:`);
      for (const [col, counts] of Object.entries(result.breakdowns)) {
        console.log(`    ${col}: ${JSON.stringify(counts)}`);
      }
    }
    if (result.sampleRow) {
      console.log(`  Sample: ${JSON.stringify(result.sampleRow).substring(0, 200)}`);
    }
  }

  await pool.end();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
