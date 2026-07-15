// Validate the grammar authoring fleet output before it touches Malak's account.
const fs = require('fs');
const DIR = __dirname;
const FILES = ['u1-2.json', 'u3-4.json', 'u5-6.json', 'u7-8.json', 'u9-10.json'];
const FORBIDDEN = ['معهد', 'دورة', 'مذهل', 'مميز', 'استثنائية', 'الأفضل'];
const TYPES = ['fill_blank', 'choose', 'transform', 'error_correction', 'reorder'];

const norm = (s) => (s || '').toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim();
let problems = [], allUnits = {};

for (const f of FILES) {
  const p = `${DIR}/${f}`;
  if (!fs.existsSync(p)) { problems.push(`MISSING ${f}`); continue; }
  let doc;
  try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { problems.push(`BAD JSON ${f}: ${e.message}`); continue; }
  for (const u of doc.units) {
    const cs = u.custom_sort;
    allUnits[cs] = u;
    const ex = u.exercises || [];
    if (ex.length !== 10) problems.push(`U${cs}: ${ex.length} exercises (want 10)`);
    const mix = {}; TYPES.forEach((t) => (mix[t] = 0));
    const choosePos = [];
    ex.forEach((e, i) => {
      const t = e.exercise_type; const it = e.item || {};
      if (!TYPES.includes(t)) problems.push(`U${cs}#${i}: bad type ${t}`);
      mix[t] = (mix[t] || 0) + 1;
      if (!it.question || !it.correct_answer) problems.push(`U${cs}#${i} (${t}): missing question/correct_answer`);
      if (!it.explanation_ar) problems.push(`U${cs}#${i} (${t}): missing explanation_ar`);
      if (t === 'choose') {
        if (!Array.isArray(it.options) || it.options.length < 3) problems.push(`U${cs}#${i} choose: <3 options`);
        else {
          const idx = it.options.findIndex((o) => norm(o) === norm(it.correct_answer));
          if (idx === -1) problems.push(`U${cs}#${i} choose: correct_answer NOT in options! ans="${it.correct_answer}" opts=${JSON.stringify(it.options)}`);
          else choosePos.push(idx);
        }
      }
      if (t === 'reorder') {
        // chips may be multi-word ("in order to"); split every chip into words, compare word multisets
        const toks = (it.options || []).flatMap((o) => norm(o).split(' ')).filter(Boolean).sort();
        const ansToks = norm(it.correct_answer).split(' ').filter(Boolean).sort();
        if (toks.join('|') !== ansToks.join('|')) problems.push(`U${cs}#${i} reorder: chips don't reconstruct the answer\n   opts=${JSON.stringify(it.options)}\n   ans="${it.correct_answer}"`);
      }
      const blob = JSON.stringify(e);
      FORBIDDEN.forEach((w) => { if (blob.includes(w)) problems.push(`U${cs}#${i}: forbidden word "${w}"`); });
    });
    // mix check
    const want = { fill_blank: 3, choose: 2, transform: 2, error_correction: 2, reorder: 1 };
    for (const t of TYPES) if (mix[t] !== want[t]) problems.push(`U${cs}: ${t}=${mix[t]} (want ${want[t]})`);
    // choose positions varied
    if (choosePos.length === 2 && choosePos[0] === choosePos[1]) problems.push(`U${cs}: both choose answers at same position ${choosePos[0]}`);
  }
}

const have = Object.keys(allUnits).map(Number).sort((a, b) => a - b);
console.log(`Units present: ${have.join(', ')} (${have.length}/10)`);
console.log(`Total exercises: ${have.reduce((n, k) => n + (allUnits[k].exercises || []).length, 0)}`);
if (problems.length) { console.log(`\n❌ ${problems.length} PROBLEM(S):`); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
else console.log('\n✅ All present files valid: 10 ex/unit, correct type mix, every choose-key is a real option, every reorder is a true permutation, positions varied, no forbidden words.');
