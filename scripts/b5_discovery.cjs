const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Check levels table
    const levels = await client.query(`SELECT * FROM curriculum_levels ORDER BY id`);
    console.log('=== LEVELS ===');
    console.log(JSON.stringify(levels.rows, null, 2));

    // Check unit columns
    const unitCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_units' ORDER BY ordinal_position
    `);
    console.log('=== UNIT COLUMNS ===');
    console.log(unitCols.rows.map(r => r.column_name).join(', '));

    // Check reading columns
    const readCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_readings' ORDER BY ordinal_position
    `);
    console.log('\n=== READING COLUMNS ===');
    console.log(readCols.rows.map(r => r.column_name).join(', '));

    // LEGENDARY sample
    const sampleB3 = await client.query(`
      SELECT word, definition_ar, example_sentence, part_of_speech,
             tier, cefr_level, source_list, appears_in_passage, tier_order, added_in_prompt
      FROM curriculum_vocabulary
      WHERE added_in_prompt LIKE 'LEGENDARY%' LIMIT 3
    `);
    console.log('\n=== LEGENDARY SAMPLE ===');
    console.log(JSON.stringify(sampleB3.rows, null, 2));

    // A.2 L4 current state
    const l4state = await client.query(`
      SELECT u.unit_number, u.theme_en,
             COUNT(DISTINCT r.id) AS readings,
             COUNT(v.id) AS entries,
             COUNT(DISTINCT LOWER(v.word)) AS unique_words
      FROM curriculum_units u
      LEFT JOIN curriculum_readings r ON r.unit_id = u.id
      LEFT JOIN curriculum_vocabulary v ON v.reading_id = r.id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
      GROUP BY u.id, u.unit_number, u.theme_en
      ORDER BY u.unit_number
    `);
    console.log('\n=== L4 PER-UNIT STATE ===');
    l4state.rows.forEach(r => console.log(`U${r.unit_number}: ${r.unique_words} unique, ${r.entries} entries, ${r.readings} readings | ${r.theme_en}`));

    // L4 total unique
    const l4total = await client.query(`
      SELECT COUNT(DISTINCT LOWER(v.word)) AS l4_unique_total
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
    `);
    console.log('\nL4 unique total:', l4total.rows[0].l4_unique_total);

    // A.3 Active students
    const active = await client.query(`
      SELECT COUNT(DISTINCT student_id) AS l4_active
      FROM unified_activity_log
      WHERE ref_table = 'units'
        AND ref_id IN (SELECT id FROM curriculum_units WHERE level_id = '81ccd046-361a-42ff-a74c-0966c5293e57')
    `);
    console.log('L4 active students:', active.rows[0].l4_active);

    // XP baseline
    const xpBase = await client.query(`
      SELECT student_id, SUM(xp_delta) AS l4_xp_baseline
      FROM unified_activity_log
      WHERE ref_table = 'units'
        AND ref_id IN (SELECT id FROM curriculum_units WHERE level_id = '81ccd046-361a-42ff-a74c-0966c5293e57')
      GROUP BY student_id
    `);
    console.log('XP baselines:', xpBase.rows.length, 'students');

    // SRS baseline
    const srsBase = await client.query(`
      SELECT student_id, COUNT(*) AS word_count,
             SUM(review_count) AS total_reviews,
             SUM(success_count) AS total_successes
      FROM student_saved_words
      WHERE curriculum_vocabulary_id IN (
        SELECT v.id FROM curriculum_vocabulary v
        JOIN curriculum_readings r ON r.id = v.reading_id
        JOIN curriculum_units u ON u.id = r.unit_id
        WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
      )
      GROUP BY student_id
    `);
    console.log('SRS baselines:', srsBase.rows.length, 'students');

    // A.4 is_published
    const pub = await client.query(`SELECT unit_number, is_published FROM curriculum_units WHERE level_id = '81ccd046-361a-42ff-a74c-0966c5293e57' ORDER BY unit_number`);
    console.log('\n=== is_published ===');
    pub.rows.forEach(r => console.log(`U${r.unit_number}: ${r.is_published}`));

    // Readings/Passages baseline
    const rBase = await client.query(`SELECT COUNT(*) AS cnt FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'`);
    // Check passage table columns first
    const passCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_reading_passages' ORDER BY ordinal_position
    `);
    console.log('Passage columns:', passCols.rows.map(r => r.column_name).join(', '));
    const passFk = passCols.rows.find(r => r.column_name.includes('reading'));
    const pBase = passFk ? await client.query(`SELECT COUNT(*) AS cnt FROM curriculum_reading_passages p JOIN curriculum_readings r ON r.id = p.${passFk.column_name} JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'`) : { rows: [{ cnt: 'N/A - no reading FK found' }] };
    console.log('\nReadings baseline:', rBase.rows[0].cnt);
    console.log('Passages baseline:', pBase.rows[0].cnt);

    // Unique constraints
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.curriculum_vocabulary'::regclass
      AND contype IN ('u', 'p')
    `);
    console.log('\n=== Unique constraints ===');
    constraints.rows.forEach(r => console.log(`${r.conname}: ${r.def}`));

    // L4 unit themes
    const themes = await client.query(`
      SELECT unit_number, theme_en, theme_ar FROM curriculum_units WHERE level_id = '81ccd046-361a-42ff-a74c-0966c5293e57' ORDER BY unit_number
    `);
    console.log('\n=== L4 UNIT THEMES ===');
    themes.rows.forEach(r => console.log(`Unit ${r.unit_number}: ${r.theme_en} (${r.theme_ar})`));

    // Reading themes
    const rThemes = await client.query(`
      SELECT u.unit_number, r.title_ar, r.title_en
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = '81ccd046-361a-42ff-a74c-0966c5293e57'
      ORDER BY u.unit_number, r.id
    `);
    console.log('\n=== L4 READING THEMES ===');
    rThemes.rows.forEach(r => console.log(`U${r.unit_number}: ${r.title_en} (${r.title_ar})`));

    // Relevant vocab columns
    const posCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_vocabulary'
      AND column_name IN ('pos', 'part_of_speech', 'meaning_ar', 'definition_ar', 'example_sentence_ar', 'example_sentence_en', 'example_sentence')
    `);
    console.log('\n=== Relevant vocab columns ===');
    console.log(posCol.rows.map(r => r.column_name).join(', '));

    // Reading order columns
    const orderCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='curriculum_readings'
      AND column_name IN ('sort_order', 'order', 'position', 'reading_order', 'order_index')
    `);
    console.log('\n=== Reading order columns ===');
    console.log(orderCol.rows.map(r => r.column_name).join(', '));

  } finally {
    client.release();
    pool.end();
  }
}
run().catch(e => console.error(e));
