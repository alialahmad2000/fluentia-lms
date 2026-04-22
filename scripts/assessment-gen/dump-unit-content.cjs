/**
 * dump-unit-content.cjs
 * Dumps unit content (vocab, passages, grammar) from DB into a snapshot JSON.
 * Usage: node dump-unit-content.cjs <unit_id>
 *        node dump-unit-content.cjs --level 3 --unit 2
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier', password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
};

const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : null; };

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  let unitId = args[0] && !args[0].startsWith('--') ? args[0] : null;

  if (!unitId) {
    const level = parseInt(getArg('--level') || '3');
    const unitNum = parseInt(getArg('--unit') || '1');
    const row = (await client.query(
      `SELECT u.id FROM curriculum_units u JOIN curriculum_levels l ON l.id=u.level_id WHERE l.level_number=$1 AND u.unit_number=$2`,
      [level, unitNum]
    )).rows[0];
    if (!row) { console.error(`Unit not found: L${level} unit ${unitNum}`); process.exit(1); }
    unitId = row.id;
  }

  const unit = (await client.query(
    `SELECT u.id, u.unit_number, u.theme_en, u.theme_ar, l.level_number
     FROM curriculum_units u JOIN curriculum_levels l ON l.id=u.level_id WHERE u.id=$1`, [unitId]
  )).rows[0];
  if (!unit) { console.error('Unit not found:', unitId); process.exit(1); }

  const assessment = (await client.query(
    `SELECT id FROM unit_mastery_assessments WHERE unit_id=$1`, [unitId]
  )).rows[0];

  const variants = (await client.query(
    `SELECT id, variant_code FROM unit_mastery_variants WHERE assessment_id=$1 ORDER BY variant_code`,
    [assessment?.id]
  )).rows;

  const readings = (await client.query(
    `SELECT id, reading_label, title_en, passage_content, passage_word_count FROM curriculum_readings WHERE unit_id=$1 ORDER BY sort_order`,
    [unitId]
  )).rows;

  let vocab = [];
  if (readings.length > 0) {
    const ids = readings.map(r => r.id);
    vocab = (await client.query(
      `SELECT word, part_of_speech AS pos, definition_ar, example_sentence, tier
       FROM curriculum_vocabulary WHERE reading_id = ANY($1::uuid[]) ORDER BY sort_order, id`,
      [ids]
    )).rows;
  }

  const grammar = (await client.query(
    `SELECT topic_name_en, topic_name_ar, explanation_content FROM curriculum_grammar WHERE unit_id=$1 ORDER BY sort_order LIMIT 1`,
    [unitId]
  )).rows[0] || null;

  const snapshot = {
    unit: { id: unit.id, unit_number: unit.unit_number, title_en: unit.theme_en, title_ar: unit.theme_ar },
    assessment: { id: assessment?.id },
    variants: variants.map(v => ({ id: v.id, variant_code: v.variant_code })),
    vocabulary: vocab,
    passages: readings.map(r => ({
      id: r.id, label: r.reading_label, title: r.title_en,
      content: r.passage_content, word_count: r.passage_word_count
    })),
    grammar: grammar ? {
      topic_name_en: grammar.topic_name_en,
      topic_name_ar: grammar.topic_name_ar,
      explanation_content: grammar.explanation_content
    } : null
  };

  const outDir = path.join(__dirname, 'snapshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `L${unit.level_number}-unit${unit.unit_number}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

  console.log(`✅ Snapshot saved: ${outPath}`);
  console.log(`   vocab: ${vocab.length} | passages: ${readings.length} | grammar: ${grammar ? grammar.topic_name_en : 'NULL'}`);

  await client.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
