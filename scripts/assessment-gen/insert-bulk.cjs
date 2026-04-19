/**
 * Bulk insert script — no AI logic. Reads pre-generated variant JSONs and inserts.
 * Usage: node insert-bulk.cjs <levelPrefix> <unitStart> <unitEnd>
 * Example: node insert-bulk.cjs L1 2 12
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const levelPrefix = process.argv[2];
const unitStart   = parseInt(process.argv[3], 10);
const unitEnd     = parseInt(process.argv[4], 10);
if (!levelPrefix || isNaN(unitStart) || isNaN(unitEnd)) {
  console.error('Usage: node insert-bulk.cjs <levelPrefix> <unitStart> <unitEnd>');
  process.exit(1);
}

const EXPECTED_Q = { L0: 10, L1: 15, L2: 15, L3: 20, L4: 20, L5: 20 };
const expectedCount = EXPECTED_Q[levelPrefix];
if (!expectedCount) { console.error('Unknown level:', levelPrefix); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, 'output');

(async () => {
  const client = new Client(DB_CONFIG);
  await client.connect();

  let totalInserted = 0, failedUnits = [];

  for (let n = unitStart; n <= unitEnd; n++) {
    console.log(`\n--- ${levelPrefix} Unit ${n} ---`);
    try {
      for (const label of ['A', 'B', 'C']) {
        const file = path.join(OUTPUT_DIR, `${levelPrefix}-unit${n}-variant-${label}.json`);
        if (!fs.existsSync(file)) throw new Error(`Missing: ${file}`);
        const variant = JSON.parse(fs.readFileSync(file, 'utf8'));

        if (variant.questions.length !== expectedCount)
          throw new Error(`Expected ${expectedCount} questions, got ${variant.questions.length}`);

        // Pre-check: variant must be empty
        const preCheck = await client.query(
          `SELECT COUNT(*)::int AS n FROM unit_mastery_questions WHERE variant_id = $1`,
          [variant.variant_id]
        );
        if (preCheck.rows[0].n > 0) {
          console.log(`  ${label}: SKIPPED (already has ${preCheck.rows[0].n} questions)`);
          totalInserted += preCheck.rows[0].n;
          continue;
        }

        // Build rows using ACTUAL DB column names
        const rows = variant.questions.map(q => ({
          variant_id: variant.variant_id,
          order_index: q.order_index,
          question_type: q.question_type,
          skill_tag: q.skill_tag,
          question_text: q.question_text,
          question_context: q.question_context || null,
          options: q.options != null ? JSON.stringify(q.options) : null,
          correct_answer: JSON.stringify(q.correct_answer),
          accepted_answers: q.accepted_answers != null ? JSON.stringify(q.accepted_answers) : null,
          points: q.points || 1,
          explanation_ar: q.explanation_ar || null,
        }));

        const cols = Object.keys(rows[0]);
        const ph = rows.map((_, ri) =>
          `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`
        ).join(',');
        const values = rows.flatMap(r => cols.map(c => r[c]));

        const res = await client.query(
          `INSERT INTO unit_mastery_questions (${cols.join(',')}) VALUES ${ph} RETURNING id`,
          values
        );
        if (res.rows.length !== expectedCount)
          throw new Error(`Inserted ${res.rows.length}, expected ${expectedCount}`);

        console.log(`  ${label}: ${res.rows.length} inserted ✓`);
        totalInserted += res.rows.length;
      }
    } catch (e) {
      console.error(`  ❌ Unit ${n} FAILED: ${e.message}`);
      failedUnits.push(n);
    }
  }

  await client.end();

  console.log(`\n=== INSERT SUMMARY ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Failed units: ${failedUnits.length > 0 ? failedUnits.join(', ') : 'none'}`);
  if (failedUnits.length > 0) process.exit(1);
})().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
