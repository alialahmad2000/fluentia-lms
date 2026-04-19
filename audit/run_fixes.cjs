const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

async function q(label, sql) {
  console.log(`\n=== ${label} ===`);
  try {
    const { rows } = await pool.query(sql);
    console.log(`Affected: ${rows.length || 'OK'}`);
    if (rows.length > 0) console.table(rows);
    return rows;
  } catch (e) { console.error(`ERROR: ${e.message}`); return []; }
}

async function main() {
  // FIX 1: catalytic protein broken Arabic
  await q('FIX: catalytic protein definition_ar', `
    UPDATE curriculum_vocabulary
    SET definition_ar = 'بروتين حفّاز'
    WHERE id = '55c76ec8-c28a-4313-b170-7330052aa3c2'
    RETURNING id, word, definition_ar
  `);

  // FIX 2: Drop staging tables
  await q('FIX: Drop vocab_staging_l4', `DROP TABLE IF EXISTS vocab_staging_l4`);
  await q('FIX: Drop vocab_staging_l5', `DROP TABLE IF EXISTS vocab_staging_l5`);

  // Verify staging gone
  await q('VERIFY: No staging tables remain', `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE '%staging%'
  `);

  await pool.end();
  console.log('\n=== FIXES COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
