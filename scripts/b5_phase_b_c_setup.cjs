const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

const L4_LEVEL_ID = '81ccd046-361a-42ff-a74c-0966c5293e57';

async function run() {
  const client = await pool.connect();
  try {
    // Phase B — Backfill NULLs
    const backfill = await client.query(`
      UPDATE public.curriculum_vocabulary v
      SET tier = COALESCE(tier, 'core'),
          cefr_level = COALESCE(cefr_level, 'B2'),
          appears_in_passage = COALESCE(appears_in_passage, true)
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE v.reading_id = r.id
        AND u.level_id = $1
        AND (v.tier IS NULL OR v.cefr_level IS NULL OR v.appears_in_passage IS NULL)
    `, [L4_LEVEL_ID]);
    console.log('Phase B — NULL backfill rows:', backfill.rowCount);

    // Phase C — Create staging table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vocab_staging_l4 (
        word              text PRIMARY KEY,
        cefr_level        text NOT NULL,
        source_list       text NOT NULL,
        pos               text,
        definition_ar     text NOT NULL,
        example_en        text NOT NULL,
        example_ar        text NOT NULL,
        recommended_tier  text NOT NULL CHECK (recommended_tier IN ('core','extended','mastery')),
        recommended_unit  integer,
        batch_id          integer
      )
    `);
    console.log('Phase C — Staging table created/verified');

    // Check current staging state
    const staging = await client.query(`SELECT batch_id, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY batch_id ORDER BY batch_id`);
    console.log('Current staging:', staging.rows);

    // Get first reading per unit for later insert
    const readings = await client.query(`
      SELECT r.id AS reading_id, u.unit_number,
             ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY r.sort_order, r.id) AS rn
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
    `, [L4_LEVEL_ID]);
    const firstReadings = readings.rows.filter(r => r.rn === '1');
    console.log('\nFirst reading per unit:');
    firstReadings.forEach(r => console.log(`U${r.unit_number}: ${r.reading_id}`));

    // Get all existing words across L0-L4 for dedup
    const existing = await client.query(`
      SELECT DISTINCT LOWER(v.word) AS word
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
    `);
    console.log('\nTotal existing words across all levels:', existing.rows.length);

  } finally {
    client.release();
    pool.end();
  }
}
run().catch(e => console.error(e));
