const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

async function q(label, sql) {
  console.log(`\n=== ${label} ===`);
  try {
    const { rows } = await pool.query(sql);
    if (rows.length === 0) { console.log('(no rows)'); return rows; }
    console.table(rows);
    return rows;
  } catch (e) { console.error(`ERROR: ${e.message}`); return []; }
}

async function main() {
  // First: discover actual columns for curriculum_reading_passages
  await q('SCHEMA: curriculum_reading_passages columns', `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='curriculum_reading_passages'
    ORDER BY ordinal_position
  `);

  // PHASE 1.5b — Passages per level (try reading_id first, fallback info above)
  await q('1.5b Passages per level', `
    SELECT l.level_number AS level, COUNT(*) AS passages
    FROM curriculum_reading_passages p
    JOIN curriculum_readings r ON r.id = p.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  // PHASE 1.3 — L5 C1 sample (30 words) — FIXED column names
  await q('1.3 L5 C1 sample (30 random)', `
    SELECT v.word, v.cefr_level, v.tier, v.part_of_speech, v.definition_ar, v.source_list
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number = 5 AND v.cefr_level = 'C1'
    ORDER BY random() LIMIT 30
  `);

  // PHASE 2.2 — Red flag scans — ALL FIXED column names
  await q('2.2a Short Arabic definitions (<3 chars)', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LENGTH(definition_ar) < 3
  `);

  await q('2.2b Identical EN=AR', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LOWER(word) = LOWER(definition_ar)
  `);

  await q('2.2c Arabic def with English letters (4+)', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE definition_ar ~ '[a-zA-Z]{4,}'
  `);

  await q('2.2c-sample Arabic def with English letters (sample 10)', `
    SELECT v.word, v.definition_ar, l.level_number AS level
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.definition_ar ~ '[a-zA-Z]{4,}'
    ORDER BY random() LIMIT 10
  `);

  await q('2.2d Example sentence = word', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE LOWER(example_sentence) = LOWER(word)
  `);

  await q('2.2e Example missing the word (sample 20)', `
    SELECT v.id, v.word, LEFT(v.example_sentence, 80) AS example_start,
           l.level_number AS level
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE LOWER(v.example_sentence) NOT LIKE '%' || LOWER(v.word) || '%'
      AND v.example_sentence IS NOT NULL AND v.example_sentence != ''
    LIMIT 20
  `);

  await q('2.2e-count Example missing the word (total)', `
    SELECT COUNT(*) AS cnt
    FROM curriculum_vocabulary v
    WHERE LOWER(v.example_sentence) NOT LIKE '%' || LOWER(v.word) || '%'
      AND v.example_sentence IS NOT NULL AND v.example_sentence != ''
  `);

  await q('2.2f Empty example_sentence', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE example_sentence IS NULL OR TRIM(example_sentence) = ''
  `);

  await q('2.2g Empty definition_ar', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE definition_ar IS NULL OR TRIM(definition_ar) = ''
  `);

  // PHASE 2.2h — Empty definition_en
  await q('2.2h Empty definition_en', `
    SELECT COUNT(*) AS cnt FROM curriculum_vocabulary
    WHERE definition_en IS NULL OR TRIM(definition_en) = ''
  `);

  // PHASE 2.2i — Null source_list per level
  await q('2.2i Null source_list per level', `
    SELECT l.level_number AS level, COUNT(*) AS null_source
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.source_list IS NULL
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  // PHASE 2.3 — Cross-level word overlap
  await q('2.3 Words appearing in multiple levels', `
    SELECT LOWER(v.word) AS word, COUNT(DISTINCT l.level_number) AS levels,
           ARRAY_AGG(DISTINCT l.level_number ORDER BY l.level_number) AS level_list
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY LOWER(v.word)
    HAVING COUNT(DISTINCT l.level_number) > 1
    LIMIT 30
  `);

  await q('2.3-count Total cross-level duplicates', `
    SELECT COUNT(*) AS cross_level_words FROM (
      SELECT LOWER(v.word) AS word
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      JOIN curriculum_levels l ON l.id = u.level_id
      GROUP BY LOWER(v.word)
      HAVING COUNT(DISTINCT l.level_number) > 1
    ) sub
  `);

  await pool.end();
  console.log('\n=== AUDIT V2 COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
