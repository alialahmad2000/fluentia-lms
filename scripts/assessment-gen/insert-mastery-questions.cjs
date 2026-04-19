/**
 * Thin insert script — no AI logic.
 * Reads pre-generated variant JSON files and inserts into unit_mastery_questions.
 * is_published is NOT set (stays false).
 *
 * Usage: node insert-mastery-questions.cjs <path-prefix>
 * Example: node insert-mastery-questions.cjs scripts/assessment-gen/output/L1-unit1
 */

const { Client } = require('pg');
const fs = require('fs');

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const prefix = process.argv[2];
if (!prefix) { console.error('Usage: node insert-mastery-questions.cjs <path-prefix>'); process.exit(1); }

(async () => {
  const client = new Client(DB_CONFIG);
  await client.connect();

  for (const label of ['A', 'B', 'C']) {
    const filepath = `${prefix}-variant-${label}.json`;
    if (!fs.existsSync(filepath)) { console.error(`Missing: ${filepath}`); process.exit(1); }

    const variant = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const expectedCount = variant.questions.length;
    if (![10, 15, 20].includes(expectedCount)) {
      throw new Error(`Variant ${label}: unexpected question count ${expectedCount}`);
    }

    // Pre-insert assertion: must be 0 existing questions for this variant
    const preCheck = await client.query(
      `SELECT COUNT(*)::int AS n FROM unit_mastery_questions WHERE variant_id = $1`,
      [variant.variant_id]
    );
    if (preCheck.rows[0].n > 0) {
      console.error(`❌ ABORT — Variant ${label} already has ${preCheck.rows[0].n} questions!`);
      await client.end(); process.exit(1);
    }

    // Build rows using ACTUAL DB column names
    const rows = variant.questions.map(q => ({
      variant_id: variant.variant_id,
      order_index: q.order_index,                          // actual column name
      question_type: q.question_type,
      skill_tag: q.skill_tag,
      question_text: q.question_text,
      question_context: q.question_context || null,
      options: q.options != null ? JSON.stringify(q.options) : null,
      correct_answer: JSON.stringify(q.correct_answer),    // jsonb
      accepted_answers: q.accepted_answers != null ? JSON.stringify(q.accepted_answers) : null,
      points: q.points || 1,
      explanation_ar: q.explanation_ar || null,            // actual column name
    }));

    const cols = Object.keys(rows[0]);
    const placeholders = rows.map((_, ri) =>
      `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`
    ).join(', ');
    const values = rows.flatMap(r => cols.map(c => r[c]));

    const res = await client.query(
      `INSERT INTO unit_mastery_questions (${cols.join(', ')}) VALUES ${placeholders} RETURNING id`,
      values
    );

    if (!res.rows || res.rows.length !== expectedCount) {
      console.error(`❌ ABORT — Variant ${label}: expected ${expectedCount} inserted, got ${res.rows?.length ?? 0}`);
      await client.end(); process.exit(1);
    }
    console.log(`✅ Variant ${label}: inserted ${res.rows.length} questions`);
  }

  await client.end();
  console.log('✅ All variants inserted. is_published remains false.');
})().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
