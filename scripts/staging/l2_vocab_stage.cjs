const {Client} = require('pg');
const u1_4 = require('./l2_vocab_u1_4.cjs');
const u5_8 = require('./l2_vocab_u5_8.cjs');
const u9_12 = require('./l2_vocab_u9_12.cjs');

const L0 = 'cd96175e-76d4-48dc-b34f-83f3228a28b8';
const L1 = '2755b494-c7ff-4bdc-96ac-7ab735dc038c';
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

  // Create staging table
  await c.query(`
    CREATE TABLE IF NOT EXISTS public.vocab_staging_l2 (
      word              text PRIMARY KEY,
      cefr_level        text NOT NULL,
      source_list       text NOT NULL,
      pos               text,
      meaning_ar        text NOT NULL,
      example_en        text NOT NULL,
      example_ar        text NOT NULL,
      definition_en     text NOT NULL,
      recommended_tier  text NOT NULL CHECK (recommended_tier IN ('core','extended','mastery')),
      recommended_unit  integer
    )
  `);
  await c.query('DELETE FROM vocab_staging_l2');
  console.log('Staging table ready');

  // Get existing L0+L1+L2 words
  const existing = await c.query(`
    SELECT DISTINCT LOWER(v.word) AS w
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id IN ($1, $2, $3)
  `, [L0, L1, L2]);
  const existingSet = new Set(existing.rows.map(r => r.w));
  console.log(`Existing L0+L1+L2 words: ${existingSet.size}`);

  // Combine all words
  const ALL = [...u1_4, ...u5_8, ...u9_12];
  console.log(`Total generated: ${ALL.length}`);

  // Dedup
  const seen = new Set();
  const deduped = [];
  let collisions = 0, internalDups = 0;
  for (const w of ALL) {
    const lower = w.w.toLowerCase();
    if (existingSet.has(lower)) { collisions++; continue; }
    if (seen.has(lower)) { internalDups++; continue; }
    seen.add(lower);
    deduped.push(w);
  }
  console.log(`After dedup: ${deduped.length} (collisions with DB: ${collisions}, internal dups: ${internalDups})`);

  // Insert into staging
  let staged = 0, errors = 0;
  for (const w of deduped) {
    try {
      await c.query(`
        INSERT INTO vocab_staging_l2 (word, cefr_level, source_list, pos, meaning_ar, example_en, example_ar, definition_en, recommended_tier, recommended_unit)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (word) DO NOTHING
      `, [w.w, w.c, w.s, w.p, w.ar, w.een, w.ear, w.def, w.t, w.u]);
      staged++;
    } catch(e) {
      console.error(`Failed "${w.w}":`, e.message);
      errors++;
    }
  }
  console.log(`Staged: ${staged}, Errors: ${errors}`);

  // Summary
  const summary = await c.query(`
    SELECT recommended_unit AS u, recommended_tier AS t, cefr_level AS cl, pos,
           COUNT(*) AS cnt
    FROM vocab_staging_l2
    GROUP BY GROUPING SETS ((recommended_unit), (recommended_tier), (cefr_level), (pos), ())
    ORDER BY u NULLS LAST, t NULLS LAST, cl NULLS LAST, pos NULLS LAST
  `);

  const byUnit = {}, byTier = {}, byCefr = {}, byPos = {};
  let total = 0;
  for (const r of summary.rows) {
    if (r.u !== null && r.t === null && r.cl === null && r.pos === null) byUnit[r.u] = +r.cnt;
    else if (r.u === null && r.t !== null && r.cl === null && r.pos === null) byTier[r.t] = +r.cnt;
    else if (r.u === null && r.t === null && r.cl !== null && r.pos === null) byCefr[r.cl] = +r.cnt;
    else if (r.u === null && r.t === null && r.cl === null && r.pos !== null) byPos[r.pos] = +r.cnt;
    else if (r.u === null && r.t === null && r.cl === null && r.pos === null) total = +r.cnt;
  }

  console.log(`\n=== L2 STAGING SUMMARY ===`);
  console.log(`Words staged: ${total}`);
  console.log(`By unit: ${JSON.stringify(byUnit)}`);
  console.log(`By tier: ${JSON.stringify(byTier)}`);
  console.log(`By CEFR: ${JSON.stringify(byCefr)}`);
  console.log(`By POS: ${JSON.stringify(byPos)}`);

  // Projected per-unit finals
  const existingPerUnit = [23,24,25,24,23,23,22,23,24,23,25,24];
  console.log(`\nProjected per-unit finals:`);
  let projTotal = 0;
  for (let i = 1; i <= 12; i++) {
    const staged_u = byUnit[i] || 0;
    const final_u = existingPerUnit[i-1] + staged_u;
    projTotal += final_u;
    console.log(`  Unit ${i}: ${existingPerUnit[i-1]} existing + ${staged_u} new = ${final_u}`);
  }
  console.log(`Projected L2 unique total: ${255 + total} (dedups may reduce cross-unit)`);
  console.log(`Target: 1,300`);
  console.log(`=== END ===`);

  // Check for NULL definition_en
  const nullDefs = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l2 WHERE definition_en IS NULL');
  console.log(`\nNULL definition_en: ${nullDefs.rows[0].c}`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
