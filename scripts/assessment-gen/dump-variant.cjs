const fs = require('fs');
const path = require('path');

const filepath = process.argv[2];
if (!filepath) { console.error('Usage: node dump-variant.cjs <path-to-variant.json>'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
const qs = data.questions;

console.log(`\n=== DUMP: ${path.basename(filepath)} ===`);
console.log(`variant_label: ${data.variant_label}`);
console.log(`variant_id:    ${data.variant_id}`);
console.log(`questions:     ${qs.length}\n`);

// Distribution audit
const bySkill = {};
const byType = {};
for (const q of qs) {
  bySkill[q.skill_tag] = (bySkill[q.skill_tag] || 0) + 1;
  byType[q.question_type] = (byType[q.question_type] || 0) + 1;
}
console.log(`Skills: ${JSON.stringify(bySkill)}`);
console.log(`Types:  ${JSON.stringify(byType)}`);

// Vocab words tested (for B's anti-dup reference)
const vocabAnswers = [];
const fbTargets = [];
const matchingWords = [];

for (const q of qs) {
  if (q.skill_tag === 'vocabulary') {
    if (q.question_type === 'mcq' && q.options && Array.isArray(q.options)) {
      const correct = q.options.find(o => o.is_correct);
      if (correct) vocabAnswers.push(correct.text);
    } else if (q.question_type === 'fill_blank') {
      vocabAnswers.push(q.correct_answer);
    } else if (q.question_type === 'matching' && q.options && q.options.left_items) {
      for (const w of q.options.left_items) vocabAnswers.push(w);
    }
  }
  if (q.question_type === 'fill_blank') fbTargets.push(q.correct_answer);
  if (q.question_type === 'matching') {
    // schema A: correct_answer is [{left,right}]; schema B: matching_pairs is [{left,right}]
    const pairs = Array.isArray(q.matching_pairs) ? q.matching_pairs
                : Array.isArray(q.correct_answer) ? q.correct_answer : [];
    for (const p of pairs) matchingWords.push(`${p.left}↔${p.right}`);
  }
}

console.log(`\n--- FOR VARIANT B ANTI-DUP REFERENCE ---`);
console.log(`Vocab answers used:  ${vocabAnswers.join(', ')}`);
console.log(`Fill-blank targets:  ${fbTargets.join(', ')}`);
console.log(`Matching pairs:      ${matchingWords.join(' | ')}`);

// Full dump
console.log(`\n--- FULL QUESTION DUMP ---\n`);
for (const q of qs) {
  const idx = q.order_index ?? q.order_number ?? '?';
  const skillShort = { vocabulary: 'V', grammar: 'G', reading: 'R' }[q.skill_tag] || '?';
  const typeShort = { mcq: 'MCQ', true_false: 'T/F', fill_blank: 'FB', matching: 'M' }[q.question_type] || '?';

  console.log(`[${String(idx).padStart(2)}] [${skillShort}/${typeShort}]`);
  console.log(`     Q: ${q.question_text}`);

  if (q.question_type === 'mcq' && Array.isArray(q.options)) {
    for (const o of q.options) {
      const mark = o.is_correct ? '✓' : ' ';
      console.log(`        ${mark} ${o.id}) ${o.text}`);
    }
  } else if (q.question_type === 'true_false') {
    console.log(`     A: ${q.correct_answer}`);
  } else if (q.question_type === 'fill_blank') {
    console.log(`     A: ${q.correct_answer}  (also: ${(q.accepted_answers || []).join(', ')})`);
  } else if (q.question_type === 'matching') {
    const pairs = Array.isArray(q.matching_pairs) ? q.matching_pairs
                : Array.isArray(q.correct_answer) ? q.correct_answer : [];
    for (const p of pairs) console.log(`        ${p.left} → ${p.right}`);
  }

  const expl = q.explanation || q.explanation_ar;
  if (expl) console.log(`     شرح: ${expl}`);
  console.log('');
}

console.log(`=== END DUMP ===\n`);
