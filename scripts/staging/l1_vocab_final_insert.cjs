const {Client} = require('pg');

const L1_ID = '2755b494-c7ff-4bdc-96ac-7ab735dc038c';

async function main() {
  const c = new Client({
    host:'aws-1-eu-central-1.pooler.supabase.com',
    port:5432, database:'postgres',
    user:'postgres.nmjexpuycmqcxuxljier',
    password:'Ali-al-ahmad2000',
    ssl:{rejectUnauthorized:false}
  });
  await c.connect();

  // Pre-flight: readings baseline
  const rb = await c.query(`SELECT COUNT(*) AS cnt FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = $1`, [L1_ID]);
  console.log('L1 readings BEFORE:', rb.rows[0].cnt);

  // Get first reading per unit
  const readings = await c.query(`
    SELECT r.id AS reading_id, u.unit_number,
           ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY r.sort_order, r.id) AS rn
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1
  `, [L1_ID]);

  const firstReading = {};
  for (const r of readings.rows) {
    if (parseInt(r.rn) === 1) firstReading[r.unit_number] = r.reading_id;
  }
  console.log('First readings mapped:', Object.keys(firstReading).length, 'units');

  // Get staged words
  const staged = await c.query('SELECT * FROM vocab_staging_l1 ORDER BY recommended_unit, recommended_tier, word');
  console.log('Staged words to insert:', staged.rows.length);

  // Insert in a transaction
  await c.query('BEGIN');

  let inserted = 0, skipped = 0;
  for (const s of staged.rows) {
    const readingId = firstReading[s.recommended_unit];
    if (!readingId) {
      console.error('No reading for unit', s.recommended_unit);
      skipped++;
      continue;
    }

    // Compute tier_order: sequential within reading+tier
    const tierOrderRes = await c.query(`
      SELECT COALESCE(MAX(tier_order), 0) + 1 AS next_order
      FROM curriculum_vocabulary
      WHERE reading_id = $1 AND tier = $2
    `, [readingId, s.recommended_tier]);
    const tierOrder = tierOrderRes.rows[0].next_order;

    const res = await c.query(`
      INSERT INTO curriculum_vocabulary (
        reading_id, word, definition_en, definition_ar, example_sentence, part_of_speech,
        tier, cefr_level, source_list, appears_in_passage, tier_order, added_in_prompt
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (reading_id, lower(word)) DO NOTHING
      RETURNING id
    `, [
      readingId,
      s.word,
      s.definition_en,
      s.meaning_ar,
      s.example_en,
      s.pos,
      s.recommended_tier,
      s.cefr_level,
      s.source_list,
      false,
      tierOrder,
      'LEGENDARY-B2'
    ]);

    if (res.rowCount > 0) inserted++;
    else skipped++;
  }

  console.log(`\nInserted: ${inserted}, Skipped (conflict): ${skipped}`);

  if (inserted === 0) {
    console.log('ABORT: 0 inserts!');
    await c.query('ROLLBACK');
    await c.end();
    process.exit(1);
  }

  await c.query('COMMIT');
  console.log('COMMITTED');

  // Phase F verification
  const perUnit = await c.query(`
    SELECT u.unit_number, u.theme_en,
           COUNT(v.id) AS total,
           COUNT(DISTINCT LOWER(v.word)) AS unique_words,
           COUNT(*) FILTER (WHERE v.tier = 'core') AS core,
           COUNT(*) FILTER (WHERE v.tier = 'extended') AS ext,
           COUNT(*) FILTER (WHERE v.tier = 'mastery') AS mastery
    FROM curriculum_units u
    LEFT JOIN curriculum_readings r ON r.unit_id = u.id
    LEFT JOIN curriculum_vocabulary v ON v.reading_id = r.id
    WHERE u.level_id = $1
    GROUP BY u.id, u.unit_number, u.theme_en
    ORDER BY u.unit_number
  `, [L1_ID]);

  console.log('\n=== PHASE F: POST-INSERT VERIFICATION ===');
  for (const r of perUnit.rows) {
    console.log(`Unit ${r.unit_number} (${r.theme_en}): ${r.unique_words} unique [core=${r.core}, ext=${r.ext}, mastery=${r.mastery}]`);
  }

  const finalTotal = await c.query(`
    SELECT COUNT(DISTINCT LOWER(v.word)) AS l1_unique_final
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1
  `, [L1_ID]);
  console.log(`\nL1 UNIQUE FINAL: ${finalTotal.rows[0].l1_unique_final}`);

  // Readings unchanged
  const ra = await c.query(`SELECT COUNT(*) AS cnt FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = $1`, [L1_ID]);
  console.log(`L1 readings AFTER: ${ra.rows[0].cnt} (was ${rb.rows[0].cnt})`);

  // Verify all new rows have correct marker
  const marker = await c.query(`
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1 AND v.added_in_prompt = 'LEGENDARY-B2'
  `, [L1_ID]);
  console.log(`Rows marked LEGENDARY-B2: ${marker.rows[0].cnt}`);

  const passCheck = await c.query(`
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1 AND v.added_in_prompt = 'LEGENDARY-B2' AND v.appears_in_passage = true
  `, [L1_ID]);
  console.log(`LEGENDARY-B2 rows with appears_in_passage=true: ${passCheck.rows[0].cnt} (must be 0)`);

  // Student XP check (should be 0 students)
  const xp = await c.query(`
    SELECT student_id, SUM(xp_delta) AS xp
    FROM unified_activity_log
    WHERE ref_table = 'units' AND ref_id IN (SELECT id FROM curriculum_units WHERE level_id = $1)
    GROUP BY student_id
  `, [L1_ID]);
  console.log(`\nL1 active students XP rows: ${xp.rows.length} (expected 0)`);

  console.log('\n=== ASSERTIONS ===');
  const uniqueFinal = parseInt(finalTotal.rows[0].l1_unique_final);
  console.log(`l1_unique_final >= 650: ${uniqueFinal >= 650 ? 'PASS' : 'FAIL'} (${uniqueFinal})`);
  console.log(`readings unchanged: ${ra.rows[0].cnt === rb.rows[0].cnt ? 'PASS' : 'FAIL'}`);
  console.log(`appears_in_passage all false: ${passCheck.rows[0].cnt === '0' ? 'PASS' : 'FAIL'}`);
  console.log(`student XP unaffected: ${xp.rows.length === 0 ? 'PASS (no students)' : 'CHECK NEEDED'}`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
