require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let classifyQuestion;

// Ground truth from docs/classification-hand-sample.md
// passageId → array of expected types (in question order)
const GROUND_TRUTH = {
  'b2f87de7-9393-4a6e-99c0-b9905f5e2f82': Array(11).fill('multiple_choice'),
  '2f60c074-44d3-4543-8c0a-d982961020cf': Array(12).fill('multiple_choice'),
  '35bd89e8-8c12-4d42-8e77-3e0da2dc0ed9': Array(11).fill('multiple_choice'),
  '0d9ecf39-bf12-4d50-b4b5-594facec1c2f': Array(12).fill('true_false_not_given'),
  'b2aa790e-2fcf-4388-abab-0505d76ae06e': Array(12).fill('true_false_not_given'),
};

(async () => {
  ({ classifyQuestion } = await import('../src/lib/ielts/classifyQuestion.js'));
  const { data, error } = await sb.from('ielts_reading_passages')
    .select('id, title, questions, answer_key')
    .in('id', Object.keys(GROUND_TRUTH));
  if (error) throw error;

  let total = 0, correct = 0, wrong = 0;
  const confusion = {};

  for (const p of data || []) {
    const expected = GROUND_TRUTH[p.id];
    if (!expected || !Array.isArray(p.questions)) continue;
    console.log(`\nPassage: ${p.title}`);

    p.questions.forEach((q, idx) => {
      const expectedType = expected[idx];
      if (!expectedType) return;
      // Skip already-typed questions (they won't be reclassified)
      if (q.type || q.question_type) {
        console.log(`  Q${idx + 1}: SKIPPED (already typed: ${q.type || q.question_type})`);
        return;
      }
      const result = classifyQuestion(q, null, {});
      total++;
      const match = result.type === expectedType;
      if (match) correct++;
      else {
        wrong++;
        const key = `${expectedType}→${result.type}`;
        confusion[key] = (confusion[key] || 0) + 1;
      }
      if (!match || result.confidence < 0.8) {
        console.log(`  Q${idx + 1}: expected=${expectedType} got=${result.type} conf=${result.confidence.toFixed(2)} reasons=${result.reasons.join('; ')}`);
      }
    });
  }

  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`VALIDATION RESULT`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total classified: ${total}`);
  console.log(`Correct:          ${correct} (${accuracy}%)`);
  console.log(`Wrong:            ${wrong}`);
  if (Object.keys(confusion).length > 0) {
    console.log(`Confusion matrix:`, confusion);
  }
  const pass = Number(accuracy) >= 85;
  console.log(`\n${pass ? '✅ PASS (≥85%)' : '❌ FAIL (<85%) — refine classifier before running on production'}`);
  process.exit(pass ? 0 : 1);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
