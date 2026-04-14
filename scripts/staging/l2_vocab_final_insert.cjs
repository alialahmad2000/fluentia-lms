const {Client} = require('pg');

const L2 = 'd3349438-8c8e-46b6-9ee6-e2e01c23229d';

async function main() {
  const c = new Client({
    host:'aws-1-eu-central-1.pooler.supabase.com',
    port:5432, database:'postgres',
    user:'postgres.nmjexpuycmqcxuxljier',
    password:'Ali-al-ahmad2000',
    ssl:{rejectUnauthorized:false}
  });
  await c.connect();

  // Pre-flight baselines
  const rb = await c.query(`SELECT COUNT(*) AS n FROM curriculum_readings r JOIN curriculum_units u ON u.id=r.unit_id WHERE u.level_id=$1`, [L2]);
  console.log('L2 readings BEFORE:', rb.rows[0].n);

  // First reading per unit
  const readings = await c.query(`
    SELECT r.id AS reading_id, u.unit_number,
           ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY r.sort_order, r.id) AS rn
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1
  `, [L2]);
  const firstReading = {};
  for (const r of readings.rows) {
    if (parseInt(r.rn) === 1) firstReading[r.unit_number] = r.reading_id;
  }
  console.log('First readings mapped:', Object.keys(firstReading).length, 'units');

  // Get staged words
  const staged = await c.query('SELECT * FROM vocab_staging_l2 ORDER BY recommended_unit, recommended_tier, word');
  console.log('Staged words:', staged.rows.length);

  // Insert in transaction
  await c.query('BEGIN');
  let inserted = 0, skipped = 0;

  for (const s of staged.rows) {
    const readingId = firstReading[s.recommended_unit];
    if (!readingId) { console.error('No reading for unit', s.recommended_unit); skipped++; continue; }

    const tierOrderRes = await c.query(`
      SELECT COALESCE(MAX(tier_order), 0) + 1 AS next_order
      FROM curriculum_vocabulary WHERE reading_id = $1 AND tier = $2
    `, [readingId, s.recommended_tier]);

    const res = await c.query(`
      INSERT INTO curriculum_vocabulary (
        reading_id, word, definition_en, definition_ar, example_sentence, part_of_speech,
        tier, cefr_level, source_list, appears_in_passage, tier_order, added_in_prompt
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (reading_id, lower(word)) DO NOTHING
      RETURNING id
    `, [
      readingId, s.word, s.definition_en, s.meaning_ar, s.example_en, s.pos,
      s.recommended_tier, s.cefr_level, s.source_list, false,
      tierOrderRes.rows[0].next_order, 'LEGENDARY-B3'
    ]);

    if (res.rowCount > 0) inserted++;
    else skipped++;
  }

  console.log(`\nInserted: ${inserted}, Skipped: ${skipped}`);

  if (inserted === 0) {
    console.log('ABORT: 0 inserts!');
    await c.query('ROLLBACK');
    await c.end();
    process.exit(1);
  }

  await c.query('COMMIT');
  console.log('COMMITTED');

  // PHASE F — VERIFICATION
  const perUnit = await c.query(`
    SELECT u.unit_number, u.theme_en,
           COUNT(v.id) AS total,
           COUNT(DISTINCT LOWER(v.word)) AS unique_words,
           COUNT(*) FILTER (WHERE v.tier='core') AS core,
           COUNT(*) FILTER (WHERE v.tier='extended') AS ext,
           COUNT(*) FILTER (WHERE v.tier='mastery') AS mastery
    FROM curriculum_units u
    LEFT JOIN curriculum_readings r ON r.unit_id = u.id
    LEFT JOIN curriculum_vocabulary v ON v.reading_id = r.id
    WHERE u.level_id = $1
    GROUP BY u.id, u.unit_number, u.theme_en
    ORDER BY u.unit_number
  `, [L2]);

  console.log('\n=== PHASE F: VERIFICATION ===');
  let minUnit = 999;
  for (const r of perUnit.rows) {
    const u = parseInt(r.unique_words);
    if (u < minUnit) minUnit = u;
    console.log(`Unit ${r.unit_number} (${r.theme_en}): ${r.unique_words} unique [core=${r.core}, ext=${r.ext}, mastery=${r.mastery}]`);
  }

  const finalTotal = await c.query(`
    SELECT COUNT(DISTINCT LOWER(v.word)) AS n
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id = $1
  `, [L2]);
  console.log(`\nL2 UNIQUE FINAL: ${finalTotal.rows[0].n}`);

  const ra = await c.query(`SELECT COUNT(*) AS n FROM curriculum_readings r JOIN curriculum_units u ON u.id=r.unit_id WHERE u.level_id=$1`, [L2]);
  console.log(`L2 readings AFTER: ${ra.rows[0].n} (was ${rb.rows[0].n})`);

  const marker = await c.query(`
    SELECT COUNT(*) AS n FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id=v.reading_id
    JOIN curriculum_units u ON u.id=r.unit_id
    WHERE u.level_id=$1 AND v.added_in_prompt='LEGENDARY-B3'
  `, [L2]);
  console.log(`Rows marked LEGENDARY-B3: ${marker.rows[0].n}`);

  const passCheck = await c.query(`
    SELECT COUNT(*) AS n FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id=v.reading_id
    JOIN curriculum_units u ON u.id=r.unit_id
    WHERE u.level_id=$1 AND v.added_in_prompt='LEGENDARY-B3' AND v.appears_in_passage=true
  `, [L2]);
  console.log(`B3 rows with appears_in_passage=true: ${passCheck.rows[0].n} (must be 0)`);

  // Student XP
  const xp = await c.query(`
    SELECT student_id, SUM(xp_delta) AS xp FROM unified_activity_log
    WHERE ref_table='units' AND ref_id IN (SELECT id FROM curriculum_units WHERE level_id=$1)
    GROUP BY student_id
  `, [L2]);
  console.log(`L2 active student XP rows: ${xp.rows.length} (expected 0)`);

  console.log('\n=== ASSERTIONS ===');
  const uf = parseInt(finalTotal.rows[0].n);
  console.log(`l2_unique_final >= 1300: ${uf >= 1300 ? 'PASS' : 'FAIL'} (${uf})`);
  console.log(`every unit >= 90: ${minUnit >= 90 ? 'PASS' : 'FAIL'} (min=${minUnit})`);
  console.log(`readings unchanged: ${ra.rows[0].n === rb.rows[0].n ? 'PASS' : 'FAIL'}`);
  console.log(`appears_in_passage all false: ${passCheck.rows[0].n === '0' ? 'PASS' : 'FAIL'}`);
  console.log(`student XP unaffected: ${xp.rows.length === 0 ? 'PASS' : 'CHECK'}`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
