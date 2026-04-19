const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    // Find L5 level_id
    const lvl = await pool.query(`SELECT id, level_number, name_en FROM curriculum_levels ORDER BY level_number`);
    console.log('=== ALL LEVELS ===');
    lvl.rows.forEach(r => console.log(`Level ${r.level_number}: id=${r.id} name=${r.name_en}`));

    const l5row = lvl.rows.find(r => r.level_number === 5);
    if (!l5row) {
      console.log('ERROR: No level 5 found!');
      await pool.end();
      return;
    }
    const l5id = l5row.id;
    console.log('\nUsing L5 level_id:', l5id);

    // A.2 L5 per-unit
    const perUnit = await pool.query(`
      SELECT u.unit_number, u.theme_ar, u.theme_en,
             COUNT(DISTINCT r.id) AS readings,
             COUNT(v.id) AS entries,
             COUNT(DISTINCT LOWER(v.word)) AS unique_words
      FROM curriculum_units u
      LEFT JOIN curriculum_readings r ON r.unit_id = u.id
      LEFT JOIN curriculum_vocabulary v ON v.reading_id = r.id
      WHERE u.level_id = $1
      GROUP BY u.id, u.unit_number, u.theme_ar, u.theme_en
      ORDER BY u.unit_number
    `, [l5id]);
    console.log('\n=== L5 PER UNIT ===');
    perUnit.rows.forEach(r => console.log(`Unit ${r.unit_number}: ${r.theme_en} | readings=${r.readings} entries=${r.entries} unique=${r.unique_words}`));

    const total = await pool.query(`
      SELECT COUNT(DISTINCT LOWER(v.word)) AS l5_unique_total
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
    `, [l5id]);
    console.log('\nL5 unique total:', total.rows[0].l5_unique_total);

    // A.3 Active students
    const active = await pool.query(`
      SELECT COUNT(DISTINCT student_id) AS l5_active
      FROM unified_activity_log
      WHERE ref_table = 'units'
        AND ref_id IN (SELECT id FROM curriculum_units WHERE level_id = $1)
    `, [l5id]);
    console.log('L5 active students:', active.rows[0].l5_active);

    // A.4 is_published
    const pub = await pool.query(`SELECT unit_number, is_published FROM curriculum_units WHERE level_id = $1 ORDER BY unit_number`, [l5id]);
    console.log('\n=== is_published ===');
    pub.rows.forEach(r => console.log(`Unit ${r.unit_number}: ${r.is_published}`));

    // Readings/passages baseline
    const readBase = await pool.query(`SELECT COUNT(*) AS cnt FROM curriculum_readings r JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = $1`, [l5id]);
    const passBase = await pool.query(`SELECT COUNT(*) AS cnt FROM curriculum_reading_passages p JOIN curriculum_readings r ON r.id = p.reading_id JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id = $1`, [l5id]);
    console.log('\nReadings baseline:', readBase.rows[0].cnt);
    console.log('Passages baseline:', passBase.rows[0].cnt);

    // Check NULLs
    const nulls = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE v.tier IS NULL) AS null_tier,
        COUNT(*) FILTER (WHERE v.cefr_level IS NULL) AS null_cefr,
        COUNT(*) FILTER (WHERE v.appears_in_passage IS NULL) AS null_appears
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
    `, [l5id]);
    console.log('\n=== NULLs ===');
    console.log(nulls.rows[0]);

    // Existing breakdown
    const breakdown = await pool.query(`
      SELECT tier, cefr_level, COUNT(*) AS cnt
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
      GROUP BY tier, cefr_level
      ORDER BY tier, cefr_level
    `, [l5id]);
    console.log('\n=== EXISTING BREAKDOWN ===');
    breakdown.rows.forEach(r => console.log(`tier=${r.tier} cefr=${r.cefr_level} count=${r.cnt}`));

    // Unit themes
    const themes = await pool.query(`SELECT unit_number, theme_en, theme_ar FROM curriculum_units WHERE level_id = $1 ORDER BY unit_number`, [l5id]);
    console.log('\n=== L5 UNIT THEMES ===');
    themes.rows.forEach(r => console.log(`Unit ${r.unit_number}: ${r.theme_en} (${r.theme_ar})`));

    // First reading per unit
    const readings = await pool.query(`
      SELECT u.unit_number, r.id AS reading_id, r.reading_label,
             ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY r.sort_order, r.id) AS rn
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
      ORDER BY u.unit_number, rn
    `, [l5id]);
    console.log('\n=== FIRST READING PER UNIT ===');
    const firstReadings = readings.rows.filter(r => r.rn === '1');
    firstReadings.forEach(r => console.log(`Unit ${r.unit_number}: reading_id=${r.reading_id} label=${r.reading_label}`));

    // Total words across all levels
    const allWords = await pool.query(`SELECT COUNT(DISTINCT LOWER(v.word)) AS total_all_levels FROM curriculum_vocabulary v`);
    console.log('\nTotal words across ALL levels:', allWords.rows[0].total_all_levels);

    // Gap
    const currentUnique = parseInt(total.rows[0].l5_unique_total);
    const gap = 5850 - currentUnique;
    console.log('\n=== L5 DISCOVERY SUMMARY ===');
    console.log(`L5 current unique: ${currentUnique}`);
    console.log(`Gap to 5,850: ${gap}`);
    console.log(`Active students: ${active.rows[0].l5_active}`);
    console.log(`Readings baseline: ${readBase.rows[0].cnt}`);
    console.log(`Passages baseline: ${passBase.rows[0].cnt}`);
    console.log('=== END ===');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
