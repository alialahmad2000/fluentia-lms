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
    // Passages baseline (standalone table with level column)
    const passBase = await pool.query(`SELECT level, COUNT(*) AS cnt FROM curriculum_reading_passages GROUP BY level ORDER BY level`);
    console.log('Passages by level:');
    passBase.rows.forEach(r => console.log(`  level=${r.level} count=${r.cnt}`));

    // NULLs
    const nulls = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE v.tier IS NULL) AS null_tier,
        COUNT(*) FILTER (WHERE v.cefr_level IS NULL) AS null_cefr,
        COUNT(*) FILTER (WHERE v.appears_in_passage IS NULL) AS null_appears
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
    `, [L5ID]);
    console.log('\nNULLs:', nulls.rows[0]);

    // Existing breakdown
    const breakdown = await pool.query(`
      SELECT tier, cefr_level, COUNT(*) AS cnt
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
      GROUP BY tier, cefr_level
      ORDER BY tier, cefr_level
    `, [L5ID]);
    console.log('\nExisting breakdown:');
    breakdown.rows.forEach(r => console.log(`  tier=${r.tier} cefr=${r.cefr_level} count=${r.cnt}`));

    // Unit themes
    const themes = await pool.query(`SELECT unit_number, theme_en, theme_ar FROM curriculum_units WHERE level_id = $1 ORDER BY unit_number`, [L5ID]);
    console.log('\nL5 Unit Themes:');
    themes.rows.forEach(r => console.log(`  ${r.unit_number}: ${r.theme_en} (${r.theme_ar})`));

    // First reading per unit
    const readings = await pool.query(`
      SELECT u.unit_number, r.id AS reading_id, r.reading_label,
             ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY r.sort_order, r.id) AS rn
      FROM curriculum_readings r
      JOIN curriculum_units u ON u.id = r.unit_id
      WHERE u.level_id = $1
      ORDER BY u.unit_number
    `, [L5ID]);
    console.log('\nFirst reading per unit:');
    readings.rows.filter(r => r.rn === '1').forEach(r =>
      console.log(`  Unit ${r.unit_number}: reading_id=${r.reading_id}`)
    );

    // Total vocab across ALL levels for dedup awareness
    const allWords = await pool.query(`SELECT COUNT(DISTINCT LOWER(v.word)) AS total FROM curriculum_vocabulary v`);
    console.log('\nTotal unique words ALL levels:', allWords.rows[0].total);

    // Check if staging table exists already
    const staging = await pool.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vocab_staging_l5') AS exists`);
    console.log('Staging table exists:', staging.rows[0].exists);

    // Check unique constraint on curriculum_vocabulary
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.curriculum_vocabulary'::regclass
        AND contype = 'u'
    `);
    console.log('\nUnique constraints on curriculum_vocabulary:');
    constraints.rows.forEach(r => console.log(`  ${r.conname}: ${r.def}`));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
