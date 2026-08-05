#!/usr/bin/env node
/**
 * Grades أنوار's adjectives worksheet through the REAL client validator
 * (src/utils/answerValidator.js) before it ever reaches her account.
 *
 * Checks, per question:
 *   1. the answer-key answer is accepted;
 *   2. every WRONG MCQ option is rejected (so a wrong tap can never score);
 *   3. blanks reject the opposite –ing/–ed form (the whole point of the sheet);
 *   4. free-writing items accept a real sentence but reject a one-word non-answer;
 *   5. structural: unique ids, correct_answer ∈ options, explanation present.
 *
 * Usage: node scripts/_test-anwar-adjectives.mjs
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Grade against the validator that is ACTUALLY DEPLOYED (origin/main), not the local
// working tree — this branch is far diverged and its copy is missing the sample-answer
// and slash-alternative branches, so testing against it would give a false result.
const dir = mkdtempSync(join(tmpdir(), 'anwar-val-'));
const validatorPath = join(dir, 'answerValidator.mjs');
writeFileSync(validatorPath, execFileSync('git', ['show', 'origin/main:src/utils/answerValidator.js'], { encoding: 'utf8' }));
const { validateAnswer } = await import(validatorPath);

const require = createRequire(import.meta.url);
const { questions, learn } = require('./seed-anwar-adjectives-worksheet.cjs');

let pass = 0;
const fails = [];
const check = (label, cond) => { if (cond) pass++; else fails.push(label); };

const acceptedOf = (q) => (q.accepted_answers?.length ? q.accepted_answers : [q.correct_answer]);
const isOpen = (q) => acceptedOf(q).some((a) => /\bsample answer\b/i.test(String(a)));

// The opposite form of every participial answer — the mistake the sheet exists to kill.
const flip = (w) =>
  w.endsWith('ing') ? { boring: 'bored', interesting: 'interested', exciting: 'excited',
    tiring: 'tired', confusing: 'confused', surprising: 'surprised', amazing: 'amazed',
    fascinating: 'fascinated', relaxing: 'relaxed', disappointing: 'disappointed',
    shocking: 'shocked', embarrassing: 'embarrassed', annoying: 'annoyed',
    exhausting: 'exhausted', terrifying: 'terrified' }[w]
  : { bored: 'boring', interested: 'interesting', excited: 'exciting', tired: 'tiring',
    confused: 'confusing', surprised: 'surprising', amazed: 'amazing',
    fascinated: 'fascinating', relaxed: 'relaxing', disappointed: 'disappointing',
    shocked: 'shocking', embarrassed: 'embarrassing', annoyed: 'annoying',
    exhausted: 'exhausting', terrified: 'terrifying' }[w];

for (const q of questions) {
  const accepted = acceptedOf(q);

  // 5 — structure
  check(`${q.id}: has explanation`, !!q.explanation);
  check(`${q.id}: has correct_answer`, !!q.correct_answer);
  if (q.options) check(`${q.id}: correct_answer is one of the options`, q.options.includes(q.correct_answer));

  if (isOpen(q)) {
    // 4 — free writing: a real sentence scores, a one-word shrug does not
    check(`${q.id}: accepts a real sentence`, validateAnswer('The library was very quiet today.', accepted));
    check(`${q.id}: accepts her own wording`, validateAnswer('I am reading a good book now.', accepted));
    check(`${q.id}: rejects a one-word non-answer`, !validateAnswer('yes', accepted));
    continue;
  }

  // 1 — every accepted answer really is accepted
  for (const a of accepted) {
    check(`${q.id}: key "${a}" accepted`, validateAnswer(a, accepted));
    check(`${q.id}: key "${a}" accepted with stray caps/space`, validateAnswer(` ${a.toUpperCase()} `, accepted));
  }

  // 2 — no wrong option ever scores
  if (q.options) {
    for (const opt of q.options.filter((o) => o !== q.correct_answer)) {
      check(`${q.id}: wrong option "${opt}" rejected`, !validateAnswer(opt, accepted));
    }
  }

  // 3 — blanks must reject the opposite participial form
  for (const a of accepted) {
    const opp = flip(a);
    if (opp && !accepted.includes(opp)) {
      check(`${q.id}: opposite form "${opp}" rejected`, !validateAnswer(opp, accepted));
    }
  }

  // empty answers never score
  check(`${q.id}: blank answer rejected`, !validateAnswer('', accepted));
}

// ids unique
const ids = questions.map((q) => q.id);
check('all question ids unique', new Set(ids).size === ids.length);

// lesson blocks are all renderable types (LessonSection skips unknown ones silently —
// a typo would quietly drop a whole teaching block)
const KNOWN = new Set(['rule', 'contrast', 'chunks', 'mistakes']);
for (const [i, b] of (learn.blocks || []).entries()) {
  check(`block ${i + 1} (${b.type}): renderable type`, KNOWN.has(b.type));
  check(`block ${i + 1}: has title_ar`, !!b.title_ar);
}

// every –ing/–ed pair in the chunks table is a real pair (catches a copy-paste slip)
const chunks = (learn.blocks || []).find((b) => b.type === 'chunks');
for (const it of chunks?.items || []) {
  const m = String(it.en).match(/^(\w+) → (\w+ing) \/ (\w+ed)$/);
  check(`chunk "${it.en}": well-formed verb → –ing / –ed`, !!m);
}

console.log(`\n${fails.length ? '❌' : '✅'}  ${pass} checks passed, ${fails.length} failed`);
console.log(`   ${questions.length} questions · ${learn.blocks.length} lesson blocks`);
if (fails.length) { for (const f of fails) console.log('   ✗', f); process.exit(1); }
