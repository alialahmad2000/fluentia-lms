// LEGENDARY-B6 Phase C — Master Staging Insertion (Direct PG)
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

const { UNIT_THEMES, parseCompact } = require('./staging/l5_wordlist_generator.cjs');

function loadCJS(filePath) {
  try {
    const data = require(filePath);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`  Error loading ${filePath}: ${e.message}`);
    return [];
  }
}

function loadTXT(filePath) {
  const entries = [];
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() && l.includes('|'));
  for (const line of lines) {
    const entry = parseCompact(line);
    if (entry) entries.push(entry);
  }
  return entries;
}

async function main() {
  const client = await pool.connect();
  console.log('=== LEGENDARY-B6 Phase C — Staging Insertion ===\n');

  try {
    // 1. Load existing words
    console.log('1. Loading existing vocabulary from all levels...');
    const { rows: existingWords } = await client.query(
      `SELECT DISTINCT lower(word) as word FROM curriculum_vocabulary`
    );
    const existingSet = new Set(existingWords.map(w => w.word));
    console.log(`   Found ${existingSet.size} existing words across all levels`);

    // 2. Load all staging data
    console.log('\n2. Loading staging data files...');
    const stagingDir = path.join(__dirname, 'staging');
    const allEntries = [];

    // CJS files
    const cjsFiles = ['l5_vocab_u1.cjs', 'l5_vocab_u2.cjs', 'l5_vocab_u3_6.cjs'];
    for (const f of cjsFiles) {
      const fp = path.join(stagingDir, f);
      if (fs.existsSync(fp)) {
        const data = loadCJS(fp);
        console.log(`   ${f}: ${data.length} entries`);
        allEntries.push(...data);
      }
    }

    // TXT files
    const txtFiles = fs.readdirSync(stagingDir)
      .filter(f => f.startsWith('l5_compact_') && f.endsWith('.txt'))
      .sort();
    for (const f of txtFiles) {
      const fp = path.join(stagingDir, f);
      const data = loadTXT(fp);
      console.log(`   ${f}: ${data.length} entries`);
      allEntries.push(...data);
    }

    console.log(`\n   Total raw entries: ${allEntries.length}`);

    // 3. Deduplicate
    console.log('\n3. Deduplicating...');
    const seen = new Set();
    const deduped = [];
    let dupCount = 0;
    let existingDupCount = 0;

    for (const entry of allEntries) {
      if (!entry || !entry.w) continue;
      const key = entry.w.toLowerCase().trim();
      if (seen.has(key)) { dupCount++; continue; }
      if (existingSet.has(key)) { existingDupCount++; seen.add(key); continue; }
      seen.add(key);
      deduped.push(entry);
    }

    console.log(`   Internal duplicates removed: ${dupCount}`);
    console.log(`   Existing vocab conflicts removed: ${existingDupCount}`);
    console.log(`   Unique new entries: ${deduped.length}`);

    // 4. Per-unit breakdown
    console.log('\n4. Per-unit breakdown:');
    const unitCounts = {};
    const tierCounts = {};
    for (const e of deduped) {
      const u = e.u || 0;
      unitCounts[u] = (unitCounts[u] || 0) + 1;
      const key = `${u}-${e.t}`;
      tierCounts[key] = (tierCounts[key] || 0) + 1;
    }
    for (let u = 1; u <= 12; u++) {
      const c = unitCounts[u] || 0;
      const core = tierCounts[`${u}-core`] || 0;
      const ext = tierCounts[`${u}-extended`] || 0;
      const mas = tierCounts[`${u}-mastery`] || 0;
      const theme = UNIT_THEMES[u]?.en || '?';
      console.log(`   U${u} (${theme}): ${c} total [core:${core}, ext:${ext}, mas:${mas}]`);
    }

    // 5. Clear and insert into staging
    console.log('\n5. Inserting into vocab_staging_l5...');
    await client.query(`DELETE FROM vocab_staging_l5`);
    console.log('   Cleared existing staging data');

    let inserted = 0;
    const batchSize = 50;

    for (let i = 0; i < deduped.length; i += batchSize) {
      const batch = deduped.slice(i, i + batchSize);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const e of batch) {
        values.push(`($${paramIdx},$${paramIdx+1},$${paramIdx+2},$${paramIdx+3},$${paramIdx+4},$${paramIdx+5},$${paramIdx+6},$${paramIdx+7},$${paramIdx+8},$${paramIdx+9},$${paramIdx+10},$${paramIdx+11})`);
        params.push(
          e.w, e.c || 'C1', e.s || 'CEFR-J', e.p || 'noun', e.r || 'neutral',
          e.def || '', e.ar || '', e.een || '', e.ear || '',
          e.t || 'core', e.u || 1, 6
        );
        paramIdx += 12;
      }

      await client.query(
        `INSERT INTO vocab_staging_l5 (word, cefr_level, source_list, pos, register, definition_en, definition_ar, example_en, example_ar, recommended_tier, recommended_unit, batch_id)
         VALUES ${values.join(',')}
         ON CONFLICT (word) DO NOTHING`,
        params
      );
      inserted += batch.length;
    }

    console.log(`   Inserted: ${inserted}`);

    // 6. Verify
    console.log('\n6. Verifying staging table...');
    const { rows: [{ count: stagingCount }] } = await client.query(
      `SELECT count(*) FROM vocab_staging_l5`
    );
    console.log(`   Staging table row count: ${stagingCount}`);

    // Per-unit in staging
    const { rows: unitRows } = await client.query(
      `SELECT recommended_unit as u, count(*) as c FROM vocab_staging_l5 GROUP BY recommended_unit ORDER BY recommended_unit`
    );
    console.log('\n   Staging per-unit:');
    for (const r of unitRows) {
      console.log(`   U${r.u}: ${r.c}`);
    }

    // 7. Distribution
    console.log('\n7. Distribution analysis:');
    const cefrDist = {};
    const regDist = {};
    for (const e of deduped) {
      cefrDist[e.c] = (cefrDist[e.c] || 0) + 1;
      regDist[e.r] = (regDist[e.r] || 0) + 1;
    }
    console.log('   CEFR:', JSON.stringify(cefrDist));
    console.log('   Register:', JSON.stringify(regDist));

    const academicCount = deduped.filter(e => e.s === 'AWL' || e.s === 'NAWL').length;
    console.log(`   Academic (AWL+NAWL): ${academicCount} (${(academicCount/deduped.length*100).toFixed(1)}%)`);

    const gap = 5850 - parseInt(stagingCount) - existingSet.size;
    console.log(`\n=== Phase C Staging Complete ===`);
    console.log(`Existing: ${existingSet.size}, Staged: ${stagingCount}, Gap to 5850: ${gap}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
