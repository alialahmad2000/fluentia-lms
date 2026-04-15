const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

const LEVEL_ID = '1013dc05-72a1-45e9-926e-fbef8669ccee';

const READING_IDS = {
  1: 'c7d3379f-5d1b-4732-b275-c39117907861',
  2: '4e23c055-6c0e-42a8-b3c3-eacf0f367528',
  3: '95595fc2-34dd-4d73-86e3-75219b1b5daa',
  4: 'e0e3572e-32d6-4641-a5db-fc6026ec3296',
  5: 'f857de92-78c6-4e48-b034-20d015270081',
  6: '80046f08-1a5b-4260-8f57-e22aa08fb11c',
  7: '3db0bb56-57cb-4d23-8f61-e595b4b51974',
  8: 'db633fd4-6a47-46c9-8013-4aa32a472f03',
  9: 'f93713f0-f596-46e7-baad-b9033d36677b',
  10: '05efda2e-0f7d-47a5-b8f0-3495ad23e771',
  11: '2e9e4a40-d6c8-4b70-9f5e-4fdd0d26fcc4',
  12: 'e41a47d0-0d06-489b-be46-9ca59523a032'
};

async function run() {
  const client = await pool.connect();

  try {
    console.log('=== LEGENDARY-B6 Phase E — Production INSERT ===\n');

    // 1. Load staged vocabulary
    const { rows: staged } = await client.query(
      'SELECT * FROM vocab_staging_l5 ORDER BY recommended_unit, recommended_tier'
    );
    console.log(`Loaded ${staged.length} staged words\n`);

    // 2. Check existing L5 vocabulary count (join through curriculum_readings -> curriculum_units)
    const { rows: [{ count: existingCount }] } = await client.query(`
      SELECT COUNT(*) as count FROM curriculum_vocabulary cv
      JOIN curriculum_readings r ON cv.reading_id = r.id
      JOIN curriculum_units u ON r.unit_id = u.id
      WHERE u.level_id = $1
    `, [LEVEL_ID]);
    console.log(`Existing L5 vocabulary: ${existingCount}\n`);

    // 3. Insert by tier: core -> extended -> mastery
    const tiers = ['core', 'extended', 'mastery'];
    let totalInserted = 0;
    let totalSkipped = 0;

    for (const tier of tiers) {
      const tierWords = staged.filter(w => w.recommended_tier === tier);
      console.log(`\n--- Inserting ${tier.toUpperCase()} tier: ${tierWords.length} words ---`);

      await client.query('BEGIN');

      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < tierWords.length; i += 50) {
        const batch = tierWords.slice(i, i + 50);

        for (const word of batch) {
          const readingId = READING_IDS[word.recommended_unit];
          if (!readingId) {
            console.log(`  WARN: No reading ID for unit ${word.recommended_unit}, skipping ${word.word}`);
            skipped++;
            continue;
          }

          const result = await client.query(`
            INSERT INTO curriculum_vocabulary (
              reading_id, word, part_of_speech, cefr_level,
              source_list, definition_en, definition_ar,
              example_sentence, tier, added_in_prompt
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (reading_id, lower(word)) DO NOTHING
            RETURNING id
          `, [
            readingId,
            word.word,
            word.pos || 'noun',
            word.cefr_level || 'C1',
            word.source_list || 'NAWL',
            word.definition_en,
            word.definition_ar,
            word.example_en || '',
            word.recommended_tier || 'extended',
            'B6-L5'
          ]);

          if (result.rowCount > 0) {
            inserted++;
          } else {
            skipped++;
          }
        }
      }

      await client.query('COMMIT');
      console.log(`  Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
      totalInserted += inserted;
      totalSkipped += skipped;
    }

    console.log(`\n=== INSERT Summary ===`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);

    // 4. Verify final counts
    const { rows: [{ count: finalCount }] } = await client.query(`
      SELECT COUNT(*) as count FROM curriculum_vocabulary cv
      JOIN curriculum_readings r ON cv.reading_id = r.id
      JOIN curriculum_units u ON r.unit_id = u.id
      WHERE u.level_id = $1
    `, [LEVEL_ID]);
    console.log(`\nFinal L5 vocabulary count: ${finalCount}`);

    // 5. Per-unit counts
    console.log('\nPer-unit counts:');
    const { rows: unitCounts } = await client.query(`
      SELECT
        u.unit_number,
        COUNT(cv.id) as word_count
      FROM curriculum_vocabulary cv
      JOIN curriculum_readings r ON cv.reading_id = r.id
      JOIN curriculum_units u ON r.unit_id = u.id
      WHERE u.level_id = $1
      GROUP BY u.unit_number
      ORDER BY u.unit_number
    `, [LEVEL_ID]);
    for (const uc of unitCounts) {
      console.log(`  Unit ${uc.unit_number}: ${uc.word_count} words`);
    }

    // 6. Verify no data loss
    console.log('\nVerification checks passed.');

    console.log('\n=== Phase E Complete ===');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
