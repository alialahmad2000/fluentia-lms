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
  // 1.5b — Passages use level column directly
  await q('1.5b Passages per level', `
    SELECT level, COUNT(*) AS passages
    FROM curriculum_reading_passages
    GROUP BY level ORDER BY level
  `);

  // 2.2e breakdown — Example missing word per level
  await q('2.2e per-level breakdown', `
    SELECT l.level_number AS level, COUNT(*) AS missing_word_in_example
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE LOWER(v.example_sentence) NOT LIKE '%' || LOWER(v.word) || '%'
      AND v.example_sentence IS NOT NULL AND v.example_sentence != ''
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  // 2.2a — Short Arabic definitions sample
  await q('2.2a Short Arabic definitions sample (<3 chars)', `
    SELECT v.word, v.definition_ar, LENGTH(v.definition_ar) AS len, l.level_number AS level
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE LENGTH(v.definition_ar) < 3
    ORDER BY random() LIMIT 15
  `);

  // Phase 3 — VocabularyTab pagination check: vocab per reading
  await q('3.1 Vocab per reading stats', `
    SELECT l.level_number AS level,
           MIN(cnt) AS min_vocab, MAX(cnt) AS max_vocab,
           ROUND(AVG(cnt)::numeric, 1) AS avg_vocab
    FROM (
      SELECT v.reading_id, COUNT(*) AS cnt
      FROM curriculum_vocabulary v
      GROUP BY v.reading_id
    ) sub
    JOIN curriculum_readings r ON r.id = sub.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `);

  // Cross-level duplicates by level pair
  await q('2.3b Cross-level pairs frequency', `
    SELECT pair, COUNT(*) AS words FROM (
      SELECT LOWER(v.word) AS w,
             ARRAY_AGG(DISTINCT l.level_number ORDER BY l.level_number) AS pair
      FROM curriculum_vocabulary v
      JOIN curriculum_readings r ON r.id = v.reading_id
      JOIN curriculum_units u ON u.id = r.unit_id
      JOIN curriculum_levels l ON l.id = u.level_id
      GROUP BY LOWER(v.word)
      HAVING COUNT(DISTINCT l.level_number) > 1
    ) sub
    GROUP BY pair ORDER BY words DESC
    LIMIT 15
  `);

  // catalytic protein fix check
  await q('2.2c-fix catalytic protein definition', `
    SELECT id, word, definition_ar FROM curriculum_vocabulary
    WHERE word = 'catalytic protein'
  `);

  await pool.end();
  console.log('\n=== AUDIT V3 COMPLETE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
