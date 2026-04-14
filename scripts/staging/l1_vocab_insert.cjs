const {Client} = require('pg');
const ALL_WORDS = require('./l1_vocab_gen.cjs');

const L1_ID = '2755b494-c7ff-4bdc-96ac-7ab735dc038c';
const L0_ID = 'cd96175e-76d4-48dc-b34f-83f3228a28b8';

async function main() {
  const c = new Client({
    host:'aws-1-eu-central-1.pooler.supabase.com',
    port:5432, database:'postgres',
    user:'postgres.nmjexpuycmqcxuxljier',
    password:'Ali-al-ahmad2000',
    ssl:{rejectUnauthorized:false}
  });
  await c.connect();

  // 1. Get existing L0+L1 words for dedup
  const existing = await c.query(`
    SELECT DISTINCT LOWER(v.word) AS w
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    WHERE u.level_id IN ($1, $2)
  `, [L0_ID, L1_ID]);
  const existingSet = new Set(existing.rows.map(r => r.w));
  console.log(`Existing L0+L1 words: ${existingSet.size}`);

  // 2. Dedup: remove words already in L0/L1, and remove internal duplicates
  const seen = new Set();
  const deduped = [];
  for (const w of ALL_WORDS) {
    const lower = w.w.toLowerCase();
    if (existingSet.has(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    deduped.push(w);
  }
  console.log(`Words after dedup: ${deduped.length} (removed ${ALL_WORDS.length - deduped.length} dupes/collisions)`);

  // 3. Insert into staging table
  await c.query(`DELETE FROM vocab_staging_l1`);
  let staged = 0;
  for (const w of deduped) {
    try {
      await c.query(`
        INSERT INTO vocab_staging_l1 (word, cefr_level, source_list, pos, meaning_ar, example_en, example_ar, recommended_tier, recommended_unit)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (word) DO NOTHING
      `, [w.w, w.c, w.s, w.p, w.ar, w.een, w.ear, w.t, w.u]);
      staged++;
    } catch(e) {
      console.error(`Failed to stage "${w.w}":`, e.message);
    }
  }
  console.log(`Staged: ${staged}`);

  // 4. Staging summary
  const summary = await c.query(`
    SELECT recommended_unit AS u, recommended_tier AS t, cefr_level AS c, pos, COUNT(*) AS cnt
    FROM vocab_staging_l1
    GROUP BY GROUPING SETS ((recommended_unit), (recommended_tier), (cefr_level), (pos), ())
    ORDER BY u NULLS LAST, t NULLS LAST, c NULLS LAST, pos NULLS LAST
  `);

  const byUnit = {}, byTier = {}, byCefr = {}, byPos = {};
  let total = 0;
  for (const r of summary.rows) {
    if (r.u !== null && r.t === null && r.c === null && r.pos === null) byUnit[r.u] = +r.cnt;
    else if (r.u === null && r.t !== null && r.c === null && r.pos === null) byTier[r.t] = +r.cnt;
    else if (r.u === null && r.t === null && r.c !== null && r.pos === null) byCefr[r.c] = +r.cnt;
    else if (r.u === null && r.t === null && r.c === null && r.pos !== null) byPos[r.pos] = +r.cnt;
    else if (r.u === null && r.t === null && r.c === null && r.pos === null) total = +r.cnt;
  }

  console.log(`\n=== L1 STAGING SUMMARY ===`);
  console.log(`Words staged: ${total}`);
  console.log(`By unit: ${JSON.stringify(byUnit)}`);
  console.log(`By tier: ${JSON.stringify(byTier)}`);
  console.log(`By CEFR: ${JSON.stringify(byCefr)}`);
  console.log(`By POS: ${JSON.stringify(byPos)}`);
  console.log(`Projected L1 final: ${177 + total} (target 650)`);
  console.log(`=== END ===`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
