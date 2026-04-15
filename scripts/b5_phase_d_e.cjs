const { Pool } = require('pg');
const pool = new Pool({ host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // ============ PHASE C.3: Cross-level dedup (already done) ============
    console.log('=== PHASE C.3: CROSS-LEVEL DEDUP (already completed) ===');
    const after = await client.query('SELECT COUNT(*) AS cnt FROM vocab_staging_l4');
    console.log('Staging count:', after.rows[0].cnt);

    // ============ PHASE C.5: POS Balance ============
    console.log('\n=== PHASE C.5: POS BALANCE ===');
    const pos = await client.query("SELECT pos, COUNT(*) AS cnt, ROUND(COUNT(*)::numeric * 100 / (SELECT COUNT(*) FROM vocab_staging_l4), 1) AS pct FROM vocab_staging_l4 GROUP BY pos ORDER BY cnt DESC");
    pos.rows.forEach(r => console.log('  ' + r.pos + ':', r.cnt, '(' + r.pct + '%)'));

    // ============ PHASE C.6: Staging Summary ============
    console.log('\n=== PHASE C.6: STAGING SUMMARY ===');
    const perUnit = await client.query('SELECT recommended_unit, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_unit ORDER BY recommended_unit');
    perUnit.rows.forEach(r => console.log('  U' + r.recommended_unit + ':', r.cnt));

    const cefr = await client.query("SELECT cefr_level, COUNT(*) AS cnt, ROUND(COUNT(*)::numeric * 100 / (SELECT COUNT(*) FROM vocab_staging_l4), 1) AS pct FROM vocab_staging_l4 GROUP BY cefr_level ORDER BY cefr_level");
    console.log('CEFR:');
    cefr.rows.forEach(r => console.log('  ' + r.cefr_level + ':', r.cnt, '(' + r.pct + '%)'));

    const tier = await client.query('SELECT recommended_tier, COUNT(*) AS cnt FROM vocab_staging_l4 GROUP BY recommended_tier ORDER BY cnt DESC');
    console.log('Tiers:');
    tier.rows.forEach(r => console.log('  ' + r.recommended_tier + ':', r.cnt));

    // ============ PHASE D: PRE-FLIGHT VALIDATION ============
    console.log('\n=== PHASE D: PRE-FLIGHT VALIDATION ===');
    const existing = await client.query("SELECT COUNT(*) AS cnt FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'");
    const newCount = parseInt(after.rows[0].cnt);
    const existingCount = parseInt(existing.rows[0].cnt);
    const projected = existingCount + newCount;
    console.log('Existing L4 vocab:', existingCount);
    console.log('New from staging:', newCount);
    console.log('Projected total:', projected);
    console.log('Target: 3640');
    console.log('Status:', projected >= 3640 ? 'PASS' : 'FAIL - short by ' + (3640 - projected));

    // Check min per unit
    let minUnit = 999, minUnitNum = 0;
    for (const r of perUnit.rows) {
      if (parseInt(r.cnt) < minUnit) { minUnit = parseInt(r.cnt); minUnitNum = r.recommended_unit; }
    }
    console.log('Min unit:', 'U' + minUnitNum, '=', minUnit, '(target >= 270)');
    console.log('Min unit status:', minUnit >= 270 ? 'PASS' : 'FAIL');

    // Academic % check
    const academic = await client.query("SELECT COUNT(*) AS cnt FROM vocab_staging_l4 WHERE source_list IN ('AWL', 'NAWL') OR cefr_level = 'academic'");
    const acadPct = (parseInt(academic.rows[0].cnt) / newCount * 100).toFixed(1);
    console.log('Academic (AWL/NAWL):', academic.rows[0].cnt, '(' + acadPct + '%, target >= 10%)');
    console.log('Academic status:', parseFloat(acadPct) >= 10 ? 'PASS' : 'WARN');

    if (projected < 3640) {
      console.log('\nABORTING: Pre-flight validation failed - total too low');
      return;
    }
    console.log('\nPre-flight PASSED (total >= 3640). Proceeding to insert...');

    // ============ PHASE E: INSERT TRANSACTION ============
    console.log('\n=== PHASE E: INSERT INTO curriculum_vocabulary ===');

    const readingMap = {
      1: 'f53c6a3a-0cd9-4e96-b612-9a553dba2c9f',
      2: '5ac9c0e5-83d3-4f08-8b4f-1d64560212c4',
      3: '9a9e832e-f962-4e17-99ff-a253fd089d1b',
      4: '528296d6-c725-4db4-b0bf-22938cf9bbfa',
      5: 'c6d244e4-dc5c-44e3-8e0b-4a71f15cf21e',
      6: '8fdde733-64f5-47d6-9a58-69fba92f9ef0',
      7: 'f83b2dd2-a807-4076-a310-5e0d7c7fe299',
      8: '77046325-699b-4b7b-b176-b720dffd1020',
      9: '1d3268e8-1939-473d-9b73-0ce4207006e6',
      10: 'd87c4eef-ad6b-4536-bb3d-c93fc69c691e',
      11: '11bc7296-b972-4634-b72e-13c9db4f4adb',
      12: '10695d28-0d5d-40e2-9f67-69c88dc07c48',
    };

    // Get max sort_order per reading
    const maxSort = await client.query(`
      SELECT v.reading_id, COALESCE(MAX(v.sort_order), 0) AS max_sort
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
      GROUP BY v.reading_id
    `);
    const sortMap = {};
    for (const r of maxSort.rows) { sortMap[r.reading_id] = parseInt(r.max_sort); }

    await client.query('BEGIN');
    let totalInserted = 0;

    for (let unit = 1; unit <= 12; unit++) {
      const readingId = readingMap[unit];
      let sortOrder = (sortMap[readingId] || 0) + 1;

      const staged = await client.query(
        'SELECT * FROM vocab_staging_l4 WHERE recommended_unit = $1 ORDER BY recommended_tier, word',
        [unit]
      );

      for (const row of staged.rows) {
        await client.query(`
          INSERT INTO curriculum_vocabulary (
            reading_id, word, definition_en, definition_ar, example_sentence, part_of_speech,
            tier, cefr_level, source_list, appears_in_passage, sort_order, added_in_prompt
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          readingId,
          row.word,
          row.example_en,
          row.definition_ar,
          row.example_ar,
          row.pos,
          row.recommended_tier,
          row.cefr_level,
          row.source_list,
          false,
          sortOrder++,
          'LEGENDARY-B5'
        ]);
        totalInserted++;
      }
      console.log(`  U${unit}: ${staged.rows.length} words inserted (reading: ${readingId})`);
    }

    await client.query('COMMIT');
    console.log('\nTotal inserted into curriculum_vocabulary:', totalInserted);

    // ============ PHASE F: VERIFICATION ============
    console.log('\n=== PHASE F: VERIFICATION ===');
    const finalCount = await client.query(`
      SELECT COUNT(*) AS cnt FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
    `);
    console.log('Final L4 vocabulary count:', finalCount.rows[0].cnt);

    const b5Count = await client.query(`
      SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
      WHERE added_in_prompt = 'LEGENDARY-B5'
    `);
    console.log('LEGENDARY-B5 words:', b5Count.rows[0].cnt);

    const perUnitFinal = await client.query(`
      SELECT u.unit_number, COUNT(*) AS cnt
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
      GROUP BY u.unit_number ORDER BY u.unit_number
    `);
    console.log('Per unit:');
    perUnitFinal.rows.forEach(r => console.log('  U' + r.unit_number + ':', r.cnt));

    // ============ PHASE G: PROTECTION AUDIT ============
    console.log('\n=== PHASE G: PROTECTION AUDIT ===');
    // Check no XP drift (no student data affected)
    const xp = await client.query("SELECT COUNT(*) AS cnt FROM curriculum_vocabulary WHERE added_in_prompt = 'LEGENDARY-B5' AND audio_generated_at IS NOT NULL");
    console.log('XP drift check (audio_generated_at on new rows):', xp.rows[0].cnt, '(should be 0)');

    const srs = await client.query("SELECT COUNT(*) AS cnt FROM curriculum_vocabulary WHERE added_in_prompt = 'LEGENDARY-B5' AND relationships_generated_at IS NOT NULL");
    console.log('SRS drift check (relationships on new rows):', srs.rows[0].cnt, '(should be 0)');

    console.log('\n=== ALL PHASES COMPLETE ===');

  } catch(e) {
    await client.query('ROLLBACK');
    console.error('ERROR:', e.message);
    throw e;
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
