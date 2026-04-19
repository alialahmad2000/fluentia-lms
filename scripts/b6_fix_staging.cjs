const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Drop and recreate staging with correct columns (matching prior patterns + register)
    await pool.query(`DROP TABLE IF EXISTS vocab_staging_l5`);
    await pool.query(`
      CREATE TABLE public.vocab_staging_l5 (
        word              text PRIMARY KEY,
        cefr_level        text NOT NULL,
        source_list       text NOT NULL,
        pos               text,
        register          text,
        definition_en     text NOT NULL,
        definition_ar     text NOT NULL,
        example_en        text NOT NULL,
        example_ar        text NOT NULL,
        recommended_tier  text NOT NULL CHECK (recommended_tier IN ('core','extended','mastery')),
        recommended_unit  integer,
        batch_id          integer,
        generated_at      timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vocab_staging_l5_batch ON vocab_staging_l5(batch_id)`);
    console.log('Staging table recreated with correct schema');

    // Check unique constraint/index on curriculum_vocabulary
    const idx = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'curriculum_vocabulary'
      AND indexdef LIKE '%lower%word%'
    `);
    console.log('\nUnique indexes with lower(word):');
    idx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

    // Check all indexes
    const allIdx = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'curriculum_vocabulary'
    `);
    console.log('\nAll indexes on curriculum_vocabulary:');
    allIdx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
