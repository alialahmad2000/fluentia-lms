// Pretty-print a variant JSON for human review.
// Usage: node scripts/assessment-gen/pretty-print-variant.cjs <path-to-variant.json>
// Example: node scripts/assessment-gen/pretty-print-variant.cjs scripts/assessment-gen/output/L3-unit1-variant-B.json

const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node pretty-print-variant.cjs <path-to-variant.json>');
  process.exit(1);
}

const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error(`ERROR: file not found: ${abs}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
const qs = data.questions || [];

const sep = '='.repeat(70);
const subsep = '-'.repeat(70);

console.log(sep);
console.log(`LEVEL ${data.level} · UNIT ${data.unit_number} · VARIANT ${data.variant_label} — FULL DUMP`);
console.log(sep);
console.log(`Source file:     ${file}`);
console.log(`unit_id:         ${data.unit_id || '—'}`);
console.log(`variant_id:      ${data.variant_id || '—'}`);
console.log(`generated_at:    ${data.generated_at || '—'}`);
console.log(`generated_by:    ${data.generated_by || '—'}`);
if (data.anti_dup_source) console.log(`anti_dup_source: ${data.anti_dup_source}`);
if (data.distribution) {
  const s = data.distribution.skills || {};
  const t = data.distribution.types || {};
  console.log(`distribution:    ${s.vocabulary || 0}V / ${s.grammar || 0}G / ${s.reading || 0}R  ·  ` +
              `${t.mcq || 0} MCQ / ${t.true_false || 0} T/F / ${t.fill_blank || 0} FB / ${t.matching || 0} Matching`);
}
console.log(`question_count:  ${qs.length}`);
console.log(sep);
console.log('');

for (const q of qs) {
  const tag = `[${q.skill_tag} · ${q.question_type}]`;
  const header = `Q${q.order_number}  ${tag}`;
  console.log(header);
  console.log(`    Q: ${q.question_text}`);

  if (q.question_type === 'mcq' && Array.isArray(q.options)) {
    for (const o of q.options) {
      const marker = o.is_correct ? '  ✓ ' : '    ';
      console.log(`${marker}${o.id}) ${o.text}`);
    }
    console.log(`    A: ${q.correct_answer}`);
  } else if (q.question_type === 'true_false') {
    console.log(`    A: ${q.correct_answer}`);
  } else if (q.question_type === 'fill_blank') {
    const accepted = Array.isArray(q.accepted_answers) && q.accepted_answers.length
      ? ` (also accepted: ${q.accepted_answers.join(', ')})`
      : '';
    console.log(`    A: ${q.correct_answer}${accepted}`);
  } else if (q.question_type === 'matching' && Array.isArray(q.matching_pairs)) {
    console.log(`    Pairs:`);
    for (const p of q.matching_pairs) {
      console.log(`      ${p.left}  →  ${p.right}`);
    }
  }

  if (q.explanation) {
    console.log(`    شرح: ${q.explanation}`);
  }
  console.log('');
}

console.log(subsep);
console.log(`END OF DUMP — ${qs.length} questions printed`);
console.log(sep);
