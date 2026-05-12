/**
 * Vocab Forensic Investigation — READ-ONLY
 * Full run: Phases A–F with corrected schema (no level_id, join via readings→units→levels)
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const OUT = path.join(__dirname, '..', 'docs', 'audits', 'vocab');
fs.mkdirSync(OUT, { recursive: true });

function save(filename, content) {
  const p = path.join(OUT, filename);
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  Saved: docs/audits/vocab/${filename} (${content.length} bytes)`);
}

function csv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const lines = rows.map(r => keys.map(k => {
    const v = r[k] == null ? '' : String(r[k]);
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  return [keys.join(','), ...lines].join('\n');
}

function mdTable(rows, cols) {
  if (!rows.length) return '*(no data)*';
  const keys = cols || Object.keys(rows[0]);
  const header = '| ' + keys.join(' | ') + ' |';
  const sep = '|' + keys.map(() => '---|').join('');
  const body = rows.map(r => '| ' + keys.map(k => r[k] == null ? '' : String(r[k])).join(' | ') + ' |').join('\n');
  return [header, sep, body].join('\n');
}

async function run() {
  const c = new Client(DB);
  await c.connect();
  console.log('Connected.\n');

  // ──── Level map ────
  const levelMap = await c.query(`
    SELECT id, level_number, name_en
    FROM curriculum_levels
    ORDER BY level_number
  `).catch(() => c.query(`
    SELECT id, sort_order AS level_number, name_en
    FROM curriculum_levels
    ORDER BY sort_order
  `)).catch(async () => {
    // Try to infer from units
    const u = await c.query(`
      SELECT DISTINCT level_id, count(*) AS units FROM curriculum_units GROUP BY level_id ORDER BY count(*) DESC
    `);
    return { rows: u.rows.map((r,i) => ({ id: r.level_id, level_number: i, name_en: 'L'+i })) };
  });

  console.log('Level map:');
  const lvl = {};
  levelMap.rows.forEach(r => {
    lvl[r.id] = r.level_number;
    console.log(`  ${r.id} → L${r.level_number} (${r.name_en || ''})`);
  });

  // Helper: level number expression for SQL
  const LEVEL_CASE = Object.entries(lvl)
    .map(([id, num]) => `WHEN cu.level_id = '${id}' THEN ${num}`)
    .join(' ');
  const LEVEL_EXPR = `CASE ${LEVEL_CASE} ELSE -1 END`;

  // ──────────────────────────────────────────────
  // PHASE A — Schema snapshot (already done in probe, document here)
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE A: Schema ===');

  const A1 = await c.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_vocabulary'
    ORDER BY ordinal_position
  `);

  const A2 = await c.query(`
    SELECT t.table_name,
      (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=t.table_name) AS col_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND (t.table_name LIKE '%vocab%' OR t.table_name LIKE '%vocabulary%')
    ORDER BY t.table_name
  `);

  const A2counts = [];
  for (const row of A2.rows) {
    const rc = await c.query(`SELECT count(*) FROM ${row.table_name}`);
    A2counts.push({ table: row.table_name, rows: parseInt(rc.rows[0].count) });
  }
  console.log('Sibling tables:', A2counts.map(r => `${r.table}=${r.rows}`).join(', '));

  // FK dependents using constraint_column_usage properly
  const A3 = await c.query(`
    SELECT
      tc.table_name AS dependent_table,
      kcu.column_name AS fk_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.table_constraints tc2
      ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc2.table_name = 'curriculum_vocabulary'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  console.log('FK dependents:', A3.rows.length > 0 ? A3.rows.map(r => `${r.dependent_table}.${r.fk_column}`).join(', ') : 'none via constraint_schema');

  // Known FKs from probe
  const knownFKs = [
    { dependent_table: 'student_saved_words', fk_column: 'curriculum_vocabulary_id' },
    { dependent_table: 'vocabulary_word_mastery', fk_column: 'vocabulary_id' },
    { dependent_table: 'curriculum_vocabulary_srs', fk_column: 'vocabulary_id' },
    { dependent_table: 'anki_cards', fk_column: 'vocabulary_id' },
  ];

  // ──────────────────────────────────────────────
  // PHASE B — Growth Timeline
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE B: Growth Timeline ===');

  const B1 = await c.query(`
    SELECT
      date_trunc('day', cv.created_at)::date AS day,
      count(*) AS rows_added,
      count(DISTINCT cu.level_id) AS levels_touched
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY day
    ORDER BY day
  `);
  console.log('B.1 Growth days:');
  B1.rows.forEach(r => console.log(`  ${r.day}: +${r.rows_added} rows (${r.levels_touched} levels)`));

  const B2 = await c.query(`
    SELECT
      COALESCE(added_in_prompt, '(NULL)') AS added_in_prompt,
      count(*) AS total,
      count(DISTINCT cu.level_id) AS levels
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY added_in_prompt
    ORDER BY count(*) DESC
  `);
  console.log('\nB.2 Per-prompt provenance:');
  B2.rows.forEach(r => console.log(`  ${r.added_in_prompt.padEnd(25)} total=${r.total} levels=${r.levels}`));

  // ──────────────────────────────────────────────
  // PHASE C — Duplicate Analysis
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE C: Duplicates ===');

  const C1 = await c.query(`
    SELECT ${LEVEL_EXPR} AS level, lower(cv.word) AS word_normalized,
           count(*) AS dupes,
           array_agg(cv.id ORDER BY cv.created_at) AS ids,
           array_agg(cv.created_at::date ORDER BY cv.created_at) AS dates
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id, lower(cv.word)
    HAVING count(*) > 1
    ORDER BY dupes DESC, level
    LIMIT 1000
  `);
  const exactDupeExtra = C1.rows.reduce((s, r) => s + parseInt(r.dupes) - 1, 0);
  console.log(`C.1 exact dupe clusters: ${C1.rows.length}, excess rows: ${exactDupeExtra}`);
  C1.rows.slice(0, 5).forEach(r => console.log(`  L${r.level} "${r.word_normalized}": ${r.dupes}×`));

  const C2 = await c.query(`
    WITH norm AS (
      SELECT cv.id, cu.level_id, lower(trim(cv.word)) AS w
      FROM curriculum_vocabulary cv
      JOIN curriculum_readings cr ON cr.id = cv.reading_id
      JOIN curriculum_units cu ON cu.id = cr.unit_id
    )
    SELECT w, array_agg(DISTINCT level_id ORDER BY level_id) AS levels, count(*) AS occurrences
    FROM norm
    GROUP BY w
    HAVING count(DISTINCT level_id) > 1
    ORDER BY count(*) DESC
    LIMIT 200
  `);
  const c2_5plus = C2.rows.filter(r => r.levels.length >= 5).length;
  console.log(`C.2 cross-level words: ${C2.rows.length} (${c2_5plus} in 5+ levels)`);

  // C.4 dupes with same vs different example
  const C4 = await c.query(`
    SELECT ${LEVEL_EXPR} AS level, lower(cv.word) AS word,
           count(*) AS dupes,
           count(DISTINCT lower(trim(cv.example_sentence))) AS distinct_examples
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id, lower(cv.word)
    HAVING count(*) > 1
    ORDER BY dupes DESC
    LIMIT 200
  `);
  const c4_same = C4.rows.filter(r => parseInt(r.distinct_examples) === 1).length;
  const c4_diff = C4.rows.filter(r => parseInt(r.distinct_examples) > 1).length;
  console.log(`C.4 dupe clusters with SAME example (pure bloat): ${c4_same}`);
  console.log(`C.4 dupe clusters with DIFFERENT examples: ${c4_diff}`);

  // ──────────────────────────────────────────────
  // PHASE D — Quality Distribution
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE D: Quality ===');

  const D1 = await c.query(`
    SELECT
      ${LEVEL_EXPR} AS level,
      count(*) AS total,
      count(*) FILTER (WHERE cv.example_sentence ~ '[\\u0600-\\u06FF]') AS arabic_in_example,
      count(*) FILTER (WHERE cv.example_sentence IS NOT NULL
        AND lower(cv.example_sentence) NOT LIKE '%' || lower(cv.word) || '%'
        AND lower(cv.example_sentence) NOT LIKE '%' || lower(regexp_replace(cv.word, '(s|ed|ing|ies|er|est|ly|d)$', '', 'i')) || '%'
      ) AS word_not_in_example,
      count(*) FILTER (WHERE cv.definition_ar IS NULL OR trim(cv.definition_ar) = '') AS no_definition_ar,
      count(*) FILTER (WHERE array_length(string_to_array(trim(COALESCE(cv.example_sentence,'')), ' '), 1) < 4) AS short_example,
      count(*) FILTER (WHERE cv.example_sentence ILIKE '%TBD%' OR cv.example_sentence ILIKE '%placeholder%' OR cv.example_sentence ILIKE '%TODO%' OR cv.example_sentence LIKE '%<%') AS placeholder,
      count(*) FILTER (WHERE
        (cv.example_sentence IS NOT NULL AND cv.example_sentence !~ '[\\u0600-\\u06FF]')
        AND (lower(cv.example_sentence) LIKE '%' || lower(cv.word) || '%'
          OR lower(cv.example_sentence) LIKE '%' || lower(regexp_replace(cv.word, '(s|ed|ing|ies|er|est|ly|d)$', '', 'i')) || '%')
        AND (cv.definition_ar IS NOT NULL AND trim(cv.definition_ar) != '')
        AND array_length(string_to_array(trim(cv.example_sentence), ' '), 1) >= 4
        AND cv.example_sentence NOT ILIKE '%TBD%'
      ) AS clean
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id
    ORDER BY level
  `);

  console.log('D.1 Quality per level:');
  let totalArabic = 0, totalMismatch = 0, totalNoDef = 0, totalClean = 0, grandTotal = 0;
  D1.rows.forEach(r => {
    totalArabic += parseInt(r.arabic_in_example);
    totalMismatch += parseInt(r.word_not_in_example);
    totalNoDef += parseInt(r.no_definition_ar);
    totalClean += parseInt(r.clean);
    grandTotal += parseInt(r.total);
    const pct = Math.round(100 * parseInt(r.clean) / parseInt(r.total));
    console.log(`  L${r.level}: total=${r.total} arabic=${r.arabic_in_example} mismatch=${r.word_not_in_example} no_def_ar=${r.no_definition_ar} short=${r.short_example} placeholder=${r.placeholder} clean=${r.clean}(${pct}%)`);
  });
  console.log(`  TOTALS: arabic=${totalArabic} mismatch=${totalMismatch} no_def_ar=${totalNoDef} clean=${totalClean}(${Math.round(100*totalClean/grandTotal)}%)`);

  const D2 = await c.query(`
    SELECT
      COALESCE(cv.added_in_prompt, '(NULL)') AS prompt,
      count(*) AS total,
      round(100.0 * count(*) FILTER (WHERE
        cv.example_sentence IS NOT NULL
        AND cv.example_sentence !~ '[\\u0600-\\u06FF]'
        AND (lower(cv.example_sentence) LIKE '%' || lower(cv.word) || '%')
        AND cv.definition_ar IS NOT NULL AND trim(cv.definition_ar) != ''
        AND array_length(string_to_array(trim(cv.example_sentence), ' '), 1) >= 4
      ) / count(*), 1) AS clean_pct,
      round(100.0 * count(*) FILTER (WHERE cv.example_sentence ~ '[\\u0600-\\u06FF]') / count(*), 1) AS arabic_pct,
      round(100.0 * count(*) FILTER (WHERE cv.example_sentence IS NOT NULL
        AND lower(cv.example_sentence) NOT LIKE '%' || lower(cv.word) || '%') / count(*), 1) AS mismatch_pct
    FROM curriculum_vocabulary cv
    GROUP BY cv.added_in_prompt
    ORDER BY count(*) DESC
  `);
  console.log('\nD.2 Quality per generation prompt:');
  D2.rows.forEach(r => console.log(`  ${r.prompt.padEnd(25)} total=${String(r.total).padStart(5)} clean=${r.clean_pct}% arabic=${r.arabic_pct}% mismatch=${r.mismatch_pct}%`));

  // ──────────────────────────────────────────────
  // PHASE E — Spec Comparison
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE E: Spec Comparison ===');

  const V1 = [193, 238, 291, 340, 538, 583];
  const V2 = [250, 500, 1000, 1500, 2800, 4500];

  const E2 = await c.query(`
    SELECT ${LEVEL_EXPR} AS level, count(*) AS actual
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id
    ORDER BY level
  `);
  let totalActual = 0;
  const specRows = [];
  E2.rows.forEach(r => {
    const actual = parseInt(r.actual);
    totalActual += actual;
    const v1 = V1[r.level] || '?';
    const v2 = V2[r.level] || '?';
    const dv1 = actual - v1;
    const dv2 = actual - v2;
    const verdict = actual > v2 * 1.1 ? 'OVER-V2' : actual >= v2 * 0.9 ? 'MATCHES-V2' : actual >= v1 * 0.9 ? 'MATCHES-V1' : 'UNDER-V1';
    specRows.push({ level: 'L' + r.level, actual, v1_target: v1, delta_v1: (dv1>0?'+':'')+dv1, v2_target: v2, delta_v2: (dv2>0?'+':'')+dv2, verdict });
    console.log(`  L${r.level}: actual=${actual} V1=${v1}(Δ${dv1>0?'+':''}${dv1}) V2=${v2}(Δ${dv2>0?'+':''}${dv2}) → ${verdict}`);
  });
  console.log(`  TOTAL: ${totalActual} | V1 total=2183 | V2 total=10550`);

  // ──────────────────────────────────────────────
  // PHASE F — Student-Work Impact
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE F: Student-Work Impact ===');

  const fkResults = {};
  for (const fk of knownFKs) {
    const q = await c.query(`SELECT count(DISTINCT ${fk.fk_column}) AS count FROM ${fk.dependent_table}`);
    const q2 = await c.query(`SELECT count(*) AS total FROM ${fk.dependent_table}`);
    fkResults[fk.dependent_table] = {
      distinct_vocab_refs: parseInt(q.rows[0].count),
      total_rows: parseInt(q2.rows[0].total)
    };
    console.log(`  ${fk.dependent_table}: ${q.rows[0].count} distinct vocab IDs referenced (${q2.rows[0].total} total rows)`);
  }

  // Which vocab entries have at least 1 student ref across ALL tables
  const protectedIds = await c.query(`
    SELECT DISTINCT id FROM curriculum_vocabulary
    WHERE id IN (
      SELECT curriculum_vocabulary_id FROM student_saved_words WHERE curriculum_vocabulary_id IS NOT NULL
      UNION
      SELECT vocabulary_id FROM vocabulary_word_mastery
      UNION
      SELECT vocabulary_id FROM curriculum_vocabulary_srs
      UNION
      SELECT vocabulary_id FROM anki_cards
    )
  `);
  console.log(`\nF.1 Total protected vocab entries (any student ref): ${protectedIds.rows.length}`);

  // Unprotected entries with quality issues
  const F2 = await c.query(`
    SELECT ${LEVEL_EXPR} AS level,
      count(*) AS total,
      count(*) FILTER (WHERE cv.id NOT IN (
        SELECT curriculum_vocabulary_id FROM student_saved_words WHERE curriculum_vocabulary_id IS NOT NULL
        UNION SELECT vocabulary_id FROM vocabulary_word_mastery
        UNION SELECT vocabulary_id FROM curriculum_vocabulary_srs
        UNION SELECT vocabulary_id FROM anki_cards
      )) AS unprotected,
      count(*) FILTER (WHERE
        cv.id NOT IN (
          SELECT curriculum_vocabulary_id FROM student_saved_words WHERE curriculum_vocabulary_id IS NOT NULL
          UNION SELECT vocabulary_id FROM vocabulary_word_mastery
          UNION SELECT vocabulary_id FROM curriculum_vocabulary_srs
          UNION SELECT vocabulary_id FROM anki_cards
        )
        AND (
          cv.example_sentence ~ '[\\u0600-\\u06FF]'
          OR (cv.example_sentence IS NOT NULL AND lower(cv.example_sentence) NOT LIKE '%' || lower(cv.word) || '%')
          OR cv.definition_ar IS NULL OR trim(cv.definition_ar) = ''
        )
      ) AS unprotected_with_issues
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    GROUP BY cu.level_id
    ORDER BY level
  `);
  console.log('\nF.2 Unprotected entries with quality issues (safe-to-delete candidates):');
  let totalUnprotected = 0, totalUnprotectedIssues = 0;
  F2.rows.forEach(r => {
    totalUnprotected += parseInt(r.unprotected);
    totalUnprotectedIssues += parseInt(r.unprotected_with_issues);
    console.log(`  L${r.level}: total=${r.total} unprotected=${r.unprotected} unprotected+issues=${r.unprotected_with_issues}`);
  });
  console.log(`  TOTALS: unprotected=${totalUnprotected} unprotected+issues=${totalUnprotectedIssues}`);

  // ──────────────────────────────────────────────
  // Sample problematic entries
  // ──────────────────────────────────────────────
  console.log('\n=== Sampling entries ===');

  const sampleArabic = await c.query(`
    SELECT cv.id, ${LEVEL_EXPR} AS level, cv.word, cv.example_sentence, cv.definition_ar, cv.added_in_prompt
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    WHERE cv.example_sentence ~ '[\\u0600-\\u06FF]'
    ORDER BY level, cv.created_at
    LIMIT 30
  `);

  const sampleMismatch = await c.query(`
    SELECT cv.id, ${LEVEL_EXPR} AS level, cv.word, cv.example_sentence, cv.added_in_prompt
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    WHERE cv.example_sentence IS NOT NULL
      AND cv.example_sentence !~ '[\\u0600-\\u06FF]'
      AND lower(cv.example_sentence) NOT LIKE '%' || lower(cv.word) || '%'
    ORDER BY level, cv.created_at
    LIMIT 30
  `);

  const sampleClean = await c.query(`
    SELECT cv.id, ${LEVEL_EXPR} AS level, cv.word, cv.example_sentence, cv.definition_ar, cv.tier, cv.added_in_prompt
    FROM curriculum_vocabulary cv
    JOIN curriculum_readings cr ON cr.id = cv.reading_id
    JOIN curriculum_units cu ON cu.id = cr.unit_id
    WHERE cv.example_sentence IS NOT NULL
      AND cv.example_sentence !~ '[\\u0600-\\u06FF]'
      AND lower(cv.example_sentence) LIKE '%' || lower(cv.word) || '%'
      AND cv.definition_ar IS NOT NULL AND trim(cv.definition_ar) != ''
      AND array_length(string_to_array(trim(cv.example_sentence), ' '), 1) >= 5
    ORDER BY level, cv.created_at
    LIMIT 30
  `);

  console.log(`Arabic-in-example sample: ${sampleArabic.rows.length} rows`);
  console.log(`Word-not-in-example sample: ${sampleMismatch.rows.length} rows`);
  console.log(`Clean entry sample: ${sampleClean.rows.length} rows`);

  await c.end();

  // ──────────────────────────────────────────────
  // Save artifacts
  // ──────────────────────────────────────────────
  console.log('\n=== Saving artifacts ===');

  if (C1.rows.length) {
    save('exact-duplicates.csv', csv(C1.rows.map(r => ({
      level: r.level, word: r.word_normalized, dupes: r.dupes,
      ids: r.ids.join('|'), dates: r.dates.join('|')
    }))));
  }

  const qTableRows = D1.rows.map(r => ({
    Level: 'L' + r.level,
    Total: r.total,
    'Arabic-in-EN': r.arabic_in_example,
    'Word-not-in-Ex': r.word_not_in_example,
    'No-def-ar': r.no_definition_ar,
    Short: r.short_example,
    Placeholder: r.placeholder,
    Clean: r.clean,
    'Clean%': Math.round(100 * parseInt(r.clean) / parseInt(r.total)) + '%'
  }));
  save('quality-by-level.md', `# Quality Distribution by Level\n\n${mdTable(qTableRows)}\n\n## Quality by Generation Prompt\n\n${mdTable(D2.rows)}\n`);

  if (protectedIds.rows.length > 0) {
    save('protected-by-student-progress.csv', csv(protectedIds.rows));
  }

  // ──────────────────────────────────────────────
  // Return all data for report generation
  // ──────────────────────────────────────────────
  const results = {
    totalActual, exactDupeExtra, totalArabic, totalMismatch, totalNoDef, totalClean, grandTotal,
    b1_timeline: B1.rows,
    b2_provenance: B2.rows,
    c1_exact_dupes: C1.rows,
    c2_cross_level: C2.rows.slice(0, 20),
    c4_stats: { same_example: c4_same, diff_example: c4_diff },
    d1_quality: D1.rows,
    d2_prompt_quality: D2.rows,
    specRows,
    fkResults,
    protectedCount: protectedIds.rows.length,
    f2_unprotected: F2.rows,
    totalUnprotected, totalUnprotectedIssues,
    sampleArabic: sampleArabic.rows,
    sampleMismatch: sampleMismatch.rows,
    sampleClean: sampleClean.rows,
    a1_columns: A1.rows,
    a2_sibling_tables: A2counts,
    a3_fk_dependents: A3.rows,
    levelMap: levelMap.rows,
    lvl,
  };

  fs.writeFileSync(path.join(OUT, 'investigation-results.json'), JSON.stringify(results, null, 2));
  console.log('Saved: investigation-results.json');
  return results;
}

module.exports = { run };

if (require.main === module) {
  run().then(r => {
    console.log('\n=== SUMMARY ===');
    console.log(`Total vocab entries: ${r.totalActual}`);
    console.log(`V1 target 2,183 → Δ+${r.totalActual - 2183} (${(r.totalActual/2183).toFixed(1)}×)`);
    console.log(`V2 target 10,550 → Δ+${r.totalActual - 10550} (${(r.totalActual/10550).toFixed(2)}×)`);
    console.log(`Exact dupe excess rows: ${r.exactDupeExtra}`);
    console.log(`Arabic-in-example: ${r.totalArabic}`);
    console.log(`Word-not-in-example: ${r.totalMismatch}`);
    console.log(`No definition_ar: ${r.totalNoDef}`);
    console.log(`Clean entries: ${r.totalClean} (${Math.round(100*r.totalClean/r.grandTotal)}%)`);
    console.log(`Student-protected: ${r.protectedCount}`);
    console.log(`Unprotected w/ issues: ${r.totalUnprotectedIssues}`);
  }).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
}
