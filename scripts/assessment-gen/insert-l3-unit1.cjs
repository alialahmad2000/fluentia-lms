/**
 * insert-l3-unit1.cjs
 * Inserts L3 Unit 1 Variants A, B, C into unit_mastery_questions.
 * Handles format differences between Variant A (old schema) and B/C (new schema).
 *
 * Usage: node scripts/assessment-gen/insert-l3-unit1.cjs
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const OUTPUT_DIR = path.join(__dirname, 'output');
const FILES = [
  { file: 'L3-unit1-variant-A.json', label: 'A', schema: 'old' },
  { file: 'L3-unit1-variant-B.json', label: 'B', schema: 'new' },
  { file: 'L3-unit1-variant-C.json', label: 'C', schema: 'new' },
];

/**
 * Normalise a question from either schema into DB-ready row.
 * old schema (A): order_index, explanation_ar, options={left_items,right_items}, correct_answer=array/bool/string
 * new schema (B/C): order_number, explanation, matching_pairs=[{left,right}], correct_answer="true"/"false"/string/null
 */
function buildRow(q, variantId, schema) {
  const isOld = schema === 'old';

  // order_index
  const order_index = isOld ? q.order_index : q.order_number;

  // explanation_ar
  const explanation_ar = isOld ? (q.explanation_ar || null) : (q.explanation || null);

  // question_context
  const question_context = q.question_context || null;

  // options + correct_answer: depends on question_type and schema
  let options = null;
  let correct_answer = null;

  if (q.question_type === 'matching') {
    if (isOld) {
      // A: already has options={left_items,right_items}, correct_answer=[{left,right}...]
      options = q.options;
      correct_answer = q.correct_answer;
    } else {
      // B/C: matching_pairs=[{left,right}...], options=null, correct_answer=null
      const pairs = q.matching_pairs || [];
      options = {
        left_items: pairs.map(p => p.left),
        right_items: pairs.map(p => p.right),
      };
      correct_answer = pairs.map(p => ({ left: p.left, right: p.right }));
    }
  } else if (q.question_type === 'true_false') {
    options = null;
    if (isOld) {
      // A: correct_answer is already boolean
      correct_answer = q.correct_answer;
    } else {
      // B/C: correct_answer is the string "true" or "false" — convert to boolean
      correct_answer = q.correct_answer === 'true' ? true : false;
    }
  } else {
    // mcq, fill_blank
    options = q.options || null;
    correct_answer = q.correct_answer;
  }

  return {
    variant_id: variantId,
    order_index,
    question_type: q.question_type,
    skill_tag: q.skill_tag,
    question_text: q.question_text,
    question_context,
    options: options !== null ? JSON.stringify(options) : null,
    correct_answer: correct_answer !== null ? JSON.stringify(correct_answer) : null,
    accepted_answers: q.accepted_answers !== null && q.accepted_answers !== undefined
      ? JSON.stringify(q.accepted_answers) : null,
    points: q.points ?? 1,
    explanation_ar,
  };
}

(async () => {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to DB.\n');

  const summary = [];

  for (const { file, label, schema } of FILES) {
    const abs = path.join(OUTPUT_DIR, file);
    if (!fs.existsSync(abs)) {
      console.error(`FAIL: ${file} not found`); process.exit(2);
    }

    const variant = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const variantId = variant.variant_id;
    const qs = variant.questions;

    if (!variantId) { console.error(`FAIL: ${file} missing variant_id`); process.exit(3); }
    if (!Array.isArray(qs) || qs.length !== 20) {
      console.error(`FAIL: expected 20 questions in ${file}, got ${qs?.length}`); process.exit(4);
    }

    // Pre-check baseline
    const pre = await client.query(
      'SELECT COUNT(*)::int AS n FROM unit_mastery_questions WHERE variant_id = $1',
      [variantId]
    );
    if (pre.rows[0].n > 0) {
      console.error(`FAIL: Variant ${label} (${variantId}) already has ${pre.rows[0].n} questions. Aborting.`);
      process.exit(5);
    }

    // Build rows
    const rows = qs.map(q => buildRow(q, variantId, schema));
    const cols = Object.keys(rows[0]);
    const ph = rows.map((_, ri) =>
      `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`
    ).join(',');
    const values = rows.flatMap(r => cols.map(c => r[c]));

    const res = await client.query(
      `INSERT INTO unit_mastery_questions (${cols.join(',')}) VALUES ${ph} RETURNING id`,
      values
    );

    if (res.rows.length !== 20) {
      console.error(`FAIL: Variant ${label} inserted ${res.rows.length}/20`); process.exit(6);
    }

    console.log(`✅ Variant ${label}: 20 questions inserted`);
    summary.push({ label, inserted: res.rows.length });
  }

  await client.end();

  console.log('\n=== INSERT SUMMARY ===');
  for (const s of summary) console.log(`  ${s.label}: ${s.inserted}`);
  const total = summary.reduce((a, s) => a + s.inserted, 0);
  console.log(`  TOTAL: ${total}`);
  console.log('======================');
})().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
