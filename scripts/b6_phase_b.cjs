const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

const L5ID = '1013dc05-72a1-45e9-926e-fbef8669ccee';

(async () => {
  try {
    // Phase B: Fix L5 vocab cefr_level from A1 to C1
    const fix = await pool.query(`
      UPDATE curriculum_vocabulary v
      SET cefr_level = 'C1'
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE v.reading_id = r.id
        AND u.level_id = $1
        AND v.cefr_level = 'A1'
    `, [L5ID]);
    console.log('Phase B: Fixed cefr_level A1→C1 rows:', fix.rowCount);

    // Verify
    const check = await pool.query(`
      SELECT cefr_level, COUNT(*) AS cnt
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
      GROUP BY cefr_level
    `, [L5ID]);
    console.log('After fix:', check.rows);

    // Create staging table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.vocab_staging_l5 (
        word              text PRIMARY KEY,
        cefr_level        text NOT NULL,
        source_list       text NOT NULL,
        pos               text,
        register          text,
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
    console.log('Staging table created');

    // Get all existing words across all levels for dedup
    const existing = await pool.query(`
      SELECT DISTINCT LOWER(word) AS word FROM curriculum_vocabulary
    `);
    const existingWords = new Set(existing.rows.map(r => r.word));
    console.log('Existing words across all levels:', existingWords.size);

    // Get current staging count
    const stagingCount = await pool.query(`SELECT COUNT(*) AS cnt FROM vocab_staging_l5`);
    console.log('Current staging count:', stagingCount.rows[0].cnt);

    // Export existing words for dedup reference
    const fs = require('fs');
    fs.writeFileSync('scripts/existing_words.json', JSON.stringify([...existingWords]));
    console.log('Exported existing words to scripts/existing_words.json');

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
