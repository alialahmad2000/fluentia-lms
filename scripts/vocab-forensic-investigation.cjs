/**
 * Vocab Forensic Investigation — READ-ONLY
 * Phases A through F: schema, timeline, duplicates, quality, spec, student-protection
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

const OUT = path.join(__dirname, '..', 'docs', 'audits', 'vocab');
fs.mkdirSync(OUT, { recursive: true });

function save(filename, content) {
  const p = path.join(OUT, filename);
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  Saved: ${filename} (${content.length} bytes)`);
}

function csv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map(r => keys.map(k => {
    const v = r[k] == null ? '' : String(r[k]);
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  return [header, ...lines].join('\n');
}

function mdTable(rows) {
  if (!rows.length) return '*(no data)*';
  const keys = Object.keys(rows[0]);
  const header = '| ' + keys.join(' | ') + ' |';
  const sep = '|' + keys.map(() => '---|').join('');
  const body = rows.map(r => '| ' + keys.map(k => r[k] == null ? '' : String(r[k])).join(' | ') + ' |').join('\n');
  return [header, sep, body].join('\n');
}

async function run() {
  await client.connect();
  console.log('Connected to Supabase DB\n');

  const results = {};

  // ──────────────────────────────────────────────
  // PHASE A — Schema Discovery
  // ──────────────────────────────────────────────
  console.log('=== PHASE A: Schema Discovery ===');

  const A1 = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'curriculum_vocabulary'
    ORDER BY ordinal_position;
  `);
  results.a1_columns = A1.rows;
  console.log(`A.1 columns: ${A1.rows.length} columns`);
  console.log(A1.rows.map(r => `  - ${r.column_name} (${r.data_type}${r.is_nullable === 'NO' ? ', NOT NULL' : ''}${r.column_default ? ', default=' + r.column_default : ''})`).join('\n'));

  const A2 = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND (
      table_name LIKE '%vocab%' OR
      table_name LIKE '%vocabulary%'
    ) ORDER BY table_name;
  `);
  results.a2_sibling_tables = A2.rows;
  console.log(`\nA.2 sibling tables: ${A2.rows.map(r => r.table_name).join(', ')}`);

  // Row counts for each vocab table
  const A2counts = [];
  for (const row of A2.rows) {
    const rc = await client.query(`SELECT count(*) FROM ${row.table_name}`);
    A2counts.push({ table: row.table_name, rows: rc.rows[0].count });
    console.log(`  ${row.table_name}: ${rc.rows[0].count} rows`);
  }
  results.a2_counts = A2counts;

  const A3 = await client.query(`
    SELECT
      tc.table_name AS dependent_table,
      kcu.column_name AS fk_column,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'curriculum_vocabulary'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `);
  results.a3_fk_dependents = A3.rows;
  console.log(`\nA.3 FK dependents: ${A3.rows.length > 0 ? A3.rows.map(r => r.dependent_table + '.' + r.fk_column).join(', ') : 'NONE'}`);

  // ──────────────────────────────────────────────
  // PHASE B — Growth Timeline
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE B: Growth Timeline ===');

  const B1 = await client.query(`
    SELECT
      date_trunc('day', created_at)::date AS day,
      count(*) AS rows_added,
      count(DISTINCT level_id) AS levels_touched
    FROM curriculum_vocabulary
    GROUP BY day
    ORDER BY day;
  `);
  results.b1_timeline = B1.rows;
  console.log(`B.1 growth days:`);
  B1.rows.forEach(r => console.log(`  ${r.day}: +${r.rows_added} rows (${r.levels_touched} levels)`));

  const B2 = await client.query(`
    SELECT added_in_prompt, count(*) AS total, count(DISTINCT level_id) AS levels
    FROM curriculum_vocabulary
    GROUP BY added_in_prompt
    ORDER BY count(*) DESC;
  `);
  results.b2_provenance = B2.rows;
  console.log(`\nB.2 per-prompt provenance:`);
  B2.rows.forEach(r => console.log(`  ${r.added_in_prompt || '(NULL)'}: ${r.total} rows, ${r.levels} levels`));

  // ──────────────────────────────────────────────
  // PHASE C — Duplicate Analysis
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE C: Duplicate Analysis ===');

  const C1 = await client.query(`
    SELECT level_id, lower(word) AS word_normalized, count(*) AS dupes,
           array_agg(id ORDER BY created_at) AS ids,
           array_agg(created_at::date ORDER BY created_at) AS dates
    FROM curriculum_vocabulary
    GROUP BY level_id, lower(word)
    HAVING count(*) > 1
    ORDER BY dupes DESC, level_id
    LIMIT 500;
  `);
  results.c1_exact_dupes = C1.rows;
  console.log(`C.1 exact duplicates: ${C1.rows.length} clusters`);
  if (C1.rows.length) {
    const totalDupeRows = C1.rows.reduce((s, r) => s + parseInt(r.dupes), 0);
    const extraRows = C1.rows.reduce((s, r) => s + parseInt(r.dupes) - 1, 0);
    console.log(`  Total rows in dupe clusters: ${totalDupeRows}, excess rows: ${extraRows}`);
    console.log('  Top 10:');
    C1.rows.slice(0, 10).forEach(r => console.log(`    L${r.level_id} "${r.word_normalized}": ${r.dupes}×`));
  }

  const C2 = await client.query(`
    WITH norm AS (
      SELECT id, level_id, lower(trim(word)) AS w FROM curriculum_vocabulary
    )
    SELECT w, array_agg(DISTINCT level_id ORDER BY level_id) AS levels, count(*) AS occurrences
    FROM norm
    GROUP BY w
    HAVING count(DISTINCT level_id) > 1
    ORDER BY count(*) DESC
    LIMIT 200;
  `);
  results.c2_cross_level = C2.rows;
  console.log(`C.2 cross-level words: ${C2.rows.length} words appear in multiple levels`);
  const c2_5plus = C2.rows.filter(r => r.levels.length >= 5);
  console.log(`  Words in 5+ levels (likely garbage): ${c2_5plus.length}`);

  const C4 = await client.query(`
    SELECT level_id, lower(word) AS word, array_agg(DISTINCT lower(trim(example_sentence))) AS examples
    FROM curriculum_vocabulary
    GROUP BY level_id, lower(word)
    HAVING count(*) > 1
    ORDER BY level_id, lower(word)
    LIMIT 200;
  `);
  results.c4_same_word_diff_examples = C4.rows;
  const c4_same_ex = C4.rows.filter(r => r.examples.length === 1).length;
  const c4_diff_ex = C4.rows.filter(r => r.examples.length > 1).length;
  console.log(`C.4 dupe pairs with SAME example (pure bloat): ${c4_same_ex}`);
  console.log(`C.4 dupe pairs with DIFFERENT examples (intentional recycle?): ${c4_diff_ex}`);

  // ──────────────────────────────────────────────
  // PHASE D — Quality Distribution
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE D: Quality Distribution ===');

  const D1 = await client.query(`
    SELECT
      level_id,
      count(*) AS total,
      count(*) FILTER (WHERE example_sentence ~ '[\\u0600-\\u06FF]') AS arabic_in_example,
      count(*) FILTER (WHERE example_sentence IS NOT NULL
                        AND lower(example_sentence) NOT LIKE '%' || lower(word) || '%'
                        AND lower(example_sentence) NOT LIKE '%' || lower(regexp_replace(word, 's$|ed$|ing$|ies$|er$|est$|ly$|d$', '', 'i')) || '%'
      ) AS word_not_in_example,
      count(*) FILTER (WHERE meaning_ar IS NULL OR trim(meaning_ar) = '') AS no_meaning_ar,
      count(*) FILTER (WHERE array_length(string_to_array(trim(example_sentence), ' '), 1) < 4) AS short_example,
      count(*) FILTER (WHERE example_sentence ILIKE '%TBD%' OR example_sentence ILIKE '%placeholder%' OR example_sentence ILIKE '%TODO%' OR example_sentence LIKE '%<%') AS placeholder,
      count(*) FILTER (WHERE
        (example_sentence IS NULL OR example_sentence NOT SIMILAR TO '%[\\u0600-\\u06FF]%')
        AND (lower(example_sentence) LIKE '%' || lower(word) || '%' OR lower(example_sentence) LIKE '%' || lower(regexp_replace(word, 's$|ed$|ing$|ies$|er$|est$|ly$|d$', '', 'i')) || '%')
        AND (meaning_ar IS NOT NULL AND trim(meaning_ar) != '')
        AND (array_length(string_to_array(trim(example_sentence), ' '), 1) >= 4)
        AND example_sentence NOT ILIKE '%TBD%'
        AND example_sentence NOT ILIKE '%placeholder%'
      ) AS clean
    FROM curriculum_vocabulary
    GROUP BY level_id
    ORDER BY level_id;
  `);
  results.d1_quality = D1.rows;
  console.log('D.1 quality per level:');
  console.log('  Level | Total | Arabic-in-EN | Word-not-in-Ex | No-meaning_ar | Short | Placeholder | Clean');
  D1.rows.forEach(r => console.log(`  L${r.level_id}    | ${r.total.toString().padStart(5)} | ${r.arabic_in_example.toString().padStart(12)} | ${r.word_not_in_example.toString().padStart(14)} | ${r.no_meaning_ar.toString().padStart(13)} | ${r.short_example.toString().padStart(5)} | ${r.placeholder.toString().padStart(11)} | ${r.clean}`));

  const D2 = await client.query(`
    SELECT
      COALESCE(added_in_prompt, '(NULL)') AS prompt,
      count(*) AS total,
      round(100.0 * count(*) FILTER (WHERE
        (example_sentence IS NULL OR example_sentence NOT SIMILAR TO '%[\\u0600-\\u06FF]%')
        AND (meaning_ar IS NOT NULL AND trim(meaning_ar) != '')
        AND example_sentence NOT ILIKE '%TBD%'
      ) / count(*), 1) AS clean_pct,
      round(100.0 * count(*) FILTER (WHERE example_sentence ~ '[\\u0600-\\u06FF]') / count(*), 1) AS arabic_pct,
      round(100.0 * count(*) FILTER (WHERE example_sentence IS NOT NULL
        AND lower(example_sentence) NOT LIKE '%' || lower(word) || '%') / count(*), 1) AS mismatch_pct
    FROM curriculum_vocabulary
    GROUP BY added_in_prompt
    ORDER BY count(*) DESC;
  `);
  results.d2_prompt_quality = D2.rows;
  console.log('\nD.2 quality per generation prompt:');
  D2.rows.forEach(r => console.log(`  ${r.prompt.padEnd(20)} | total=${r.total} | clean=${r.clean_pct}% | arabic=${r.arabic_pct}% | mismatch=${r.mismatch_pct}%`));

  // ──────────────────────────────────────────────
  // PHASE E — Spec Comparison
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE E: Spec Comparison ===');

  const V1 = { 0: 193, 1: 238, 2: 291, 3: 340, 4: 538, 5: 583 };
  const V2 = { 0: 250, 1: 500, 2: 1000, 3: 1500, 4: 2800, 5: 4500 };

  const E2 = await client.query(`
    SELECT level_id, count(*) AS actual FROM curriculum_vocabulary GROUP BY level_id ORDER BY level_id;
  `);
  results.e2_level_counts = E2.rows;
  console.log('E.2 actual vs targets:');
  let totalActual = 0;
  E2.rows.forEach(r => {
    const actual = parseInt(r.actual);
    totalActual += actual;
    const v1 = V1[r.level_id] || '?';
    const v2 = V2[r.level_id] || '?';
    const dv1 = actual - v1;
    const dv2 = actual - v2;
    const verdict = actual > v2 * 1.1 ? 'OVER-V2' : actual >= v2 * 0.9 ? 'MATCHES-V2' : actual >= v1 * 0.9 ? 'MATCHES-V1' : 'UNDER-V1';
    console.log(`  L${r.level_id}: actual=${actual}, V1=${v1}(Δ${dv1>0?'+':''}${dv1}), V2=${v2}(Δ${dv2>0?'+':''}${dv2}) → ${verdict}`);
  });
  console.log(`  TOTAL ACTUAL: ${totalActual}`);
  results.e2_total = totalActual;

  // ──────────────────────────────────────────────
  // PHASE F — Student-Work Impact
  // ──────────────────────────────────────────────
  console.log('\n=== PHASE F: Student-Work Impact ===');

  const F_disc = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND (
      table_name LIKE '%saved_word%' OR
      table_name LIKE '%vocab_mastery%' OR
      table_name LIKE '%vocab_progress%' OR
      table_name LIKE '%student_word%' OR
      table_name LIKE '%srs%' OR
      table_name LIKE '%mastery%' OR
      table_name LIKE '%dictionary%'
    ) ORDER BY table_name;
  `);
  results.f_student_tables = F_disc.rows;
  console.log(`F.0 student vocab tables: ${F_disc.rows.map(r => r.table_name).join(', ') || 'NONE FOUND'}`);

  // Check if FK referencing curriculum_vocabulary was found in A.3
  if (A3.rows.length > 0) {
    const protectedRows = [];
    for (const fk of A3.rows) {
      const q = await client.query(`
        SELECT v.id, v.level_id, lower(v.word) AS word, count(s.${fk.fk_column}) AS student_refs
        FROM curriculum_vocabulary v
        JOIN ${fk.dependent_table} s ON s.${fk.fk_column} = v.id
        GROUP BY v.id, v.level_id, v.word
        HAVING count(s.${fk.fk_column}) > 0
        LIMIT 2000;
      `);
      console.log(`F.1 ${fk.dependent_table}.${fk.fk_column}: ${q.rows.length} vocab entries have student refs`);
      protectedRows.push(...q.rows.map(r => ({ ...r, source_table: fk.dependent_table })));
    }
    results.f1_protected = protectedRows;
  } else {
    // Try known table names if A3 found nothing via FK introspection
    const knownTables = ['student_saved_words', 'vocab_mastery', 'srs_reviews', 'personal_dictionary'];
    for (const tbl of knownTables) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [tbl]
      );
      if (exists.rows.length > 0) {
        const cols = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [tbl]
        );
        const vocabCol = cols.rows.find(r => r.column_name.includes('vocab'));
        if (vocabCol) {
          const q = await client.query(`SELECT count(DISTINCT ${vocabCol.column_name}) AS count FROM ${tbl}`);
          console.log(`F.1 ${tbl}.${vocabCol.column_name}: ${q.rows[0].count} distinct vocab refs`);
        }
      }
    }
    results.f1_protected = [];
    console.log('F.1 No FK relationships found — checking known student progress tables');
    for (const row of F_disc.rows) {
      const cols2 = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [row.table_name]
      );
      const vocabCols = cols2.rows.filter(r => r.column_name.toLowerCase().includes('vocab') || r.column_name === 'word_id');
      console.log(`  ${row.table_name}: columns = ${cols2.rows.map(r=>r.column_name).join(', ')}`);
    }
  }

  // Safe-to-delete count: no student refs + quality issues
  const F2 = await client.query(`
    SELECT level_id, count(*) AS safe_to_delete_candidates
    FROM curriculum_vocabulary v
    WHERE
      NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_saved_words')
      OR NOT EXISTS (SELECT 1 FROM student_saved_words WHERE vocab_id = v.id LIMIT 1)
    GROUP BY level_id
    ORDER BY level_id;
  `).catch(() => ({ rows: [] }));

  // Count quality issues per level
  const F2q = await client.query(`
    SELECT level_id,
      count(*) FILTER (WHERE example_sentence ~ '[\\u0600-\\u06FF]') AS arabic_issue,
      count(*) FILTER (WHERE meaning_ar IS NULL OR trim(meaning_ar) = '') AS no_meaning,
      count(*) FILTER (WHERE example_sentence IS NOT NULL
        AND lower(example_sentence) NOT LIKE '%' || lower(word) || '%') AS mismatch
    FROM curriculum_vocabulary
    GROUP BY level_id ORDER BY level_id;
  `);
  results.f2_quality_by_level = F2q.rows;

  // ──────────────────────────────────────────────
  // PHASE D.3 — Sample problematic entries
  // ──────────────────────────────────────────────
  console.log('\n=== Phase D.3: Sample problematic entries ===');

  const SAMPLE_ARABIC = await client.query(`
    SELECT id, level_id, word, example_sentence, meaning_ar, added_in_prompt
    FROM curriculum_vocabulary
    WHERE example_sentence ~ '[\\u0600-\\u06FF]'
    ORDER BY level_id, created_at
    LIMIT 30;
  `);
  results.sample_arabic = SAMPLE_ARABIC.rows;
  console.log(`Arabic-in-example samples: ${SAMPLE_ARABIC.rows.length}`);

  const SAMPLE_MISMATCH = await client.query(`
    SELECT id, level_id, word, example_sentence, added_in_prompt
    FROM curriculum_vocabulary
    WHERE example_sentence IS NOT NULL
      AND lower(example_sentence) NOT LIKE '%' || lower(word) || '%'
      AND example_sentence !~ '[\\u0600-\\u06FF]'
    ORDER BY level_id, created_at
    LIMIT 30;
  `);
  results.sample_mismatch = SAMPLE_MISMATCH.rows;
  console.log(`Word-not-in-example samples: ${SAMPLE_MISMATCH.rows.length}`);

  const SAMPLE_CLEAN = await client.query(`
    SELECT id, level_id, word, example_sentence, meaning_ar, tier, added_in_prompt
    FROM curriculum_vocabulary
    WHERE example_sentence IS NOT NULL
      AND example_sentence !~ '[\\u0600-\\u06FF]'
      AND lower(example_sentence) LIKE '%' || lower(word) || '%'
      AND meaning_ar IS NOT NULL AND trim(meaning_ar) != ''
      AND array_length(string_to_array(trim(example_sentence), ' '), 1) >= 5
    ORDER BY level_id, created_at
    LIMIT 30;
  `);
  results.sample_clean = SAMPLE_CLEAN.rows;
  console.log(`Clean-entry samples: ${SAMPLE_CLEAN.rows.length}`);

  // ──────────────────────────────────────────────
  // Save artifacts
  // ──────────────────────────────────────────────
  console.log('\n=== Saving artifacts ===');

  // exact-duplicates.csv
  if (C1.rows.length) {
    save('exact-duplicates.csv', csv(C1.rows.map(r => ({
      level_id: r.level_id,
      word: r.word_normalized,
      dupes: r.dupes,
      ids: r.ids.join('|'),
      dates: r.dates.join('|')
    }))));
  }

  // quality-by-level.md
  const qTable = D1.rows.map(r => ({
    Level: 'L' + r.level_id,
    Total: r.total,
    'Arabic-in-EN': r.arabic_in_example,
    'Word-not-in-Ex': r.word_not_in_example,
    'No-meaning_ar': r.no_meaning_ar,
    Short: r.short_example,
    Placeholder: r.placeholder,
    Clean: r.clean,
    'Clean%': Math.round(100 * parseInt(r.clean) / parseInt(r.total)) + '%'
  }));
  save('quality-by-level.md', `# Quality by Level\n\n${mdTable(qTable)}\n\n## By Generation Prompt\n\n${mdTable(D2.rows)}\n`);

  await client.end();
  return results;
}

run().then(r => {
  console.log('\n=== INVESTIGATION COMPLETE ===');
  const totalActual = r.e2_total;
  const exactDupeExtra = r.c1_exact_dupes.reduce((s, row) => s + parseInt(row.dupes) - 1, 0);
  const arabicTotal = r.d1_quality.reduce((s, row) => s + parseInt(row.arabic_in_example), 0);
  const mismatchTotal = r.d1_quality.reduce((s, row) => s + parseInt(row.word_not_in_example), 0);
  const noMeaningTotal = r.d1_quality.reduce((s, row) => s + parseInt(row.no_meaning_ar), 0);
  const cleanTotal = r.d1_quality.reduce((s, row) => s + parseInt(row.clean), 0);
  console.log(`Total vocab:        ${totalActual}`);
  console.log(`V1 target:          2,183  (Δ +${totalActual - 2183}, ${(totalActual/2183).toFixed(1)}×)`);
  console.log(`V2 target:          ~10,550 (Δ +${totalActual - 10550}, ${(totalActual/10550).toFixed(2)}×)`);
  console.log(`\nExact dupes (extra rows): ${exactDupeExtra}`);
  console.log(`Arabic-in-example:  ${arabicTotal}`);
  console.log(`Word-not-in-ex:     ${mismatchTotal}`);
  console.log(`No meaning_ar:      ${noMeaningTotal}`);
  console.log(`Clean entries:      ${cleanTotal} (${Math.round(100*cleanTotal/totalActual)}%)`);
  console.log(`\nStudent tables found: ${r.f_student_tables.map(x=>x.table_name).join(', ') || 'NONE'}`);
  console.log(`Protected entries (FK): ${r.a3_fk_dependents.length > 0 ? r.f1_protected?.length || 'see log' : 'NO FK FOUND — need manual check'}`);
  process.stdout.write('\nRaw results saved to memory, ready for Phase G+H.\n');
  // persist to file for Phase G/H
  require('fs').writeFileSync(
    require('path').join(__dirname, '..', 'docs', 'audits', 'vocab', 'investigation-results.json'),
    JSON.stringify(r, null, 2)
  );
  console.log('Saved: investigation-results.json');
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
