// scripts/insert-malak-grammar.cjs
// Grammar overhaul for Malak: replace each unit's single thin fill_blank exercise with ~10
// mixed-type exercises AS SEPARATE ROWS (ExerciseCard renders only items[0], so one row = one
// question), and replace each grammar's explanation_content with a deep, structured multi-section
// lesson (rule + highlighted examples from her own passage + a common-mistakes card).
// Idempotent: deletes Malak's existing grammar exercises, reinserts the rich set.
//
// Reads authored content from the scratchpad (validated) — pass --dir to override.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ Missing Supabase env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const MALAK_ID = '28a83f30-9474-4869-8f08-f63dc40c767d';
const DIR = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : path.join(__dirname, 'malak-grammar');

// load exercises (5 files) keyed by custom_sort, and explanations
const exercisesByUnit = {};
for (const f of ['u1-2.json', 'u3-4.json', 'u5-6.json', 'u7-8.json', 'u9-10.json']) {
  const doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const u of doc.units) exercisesByUnit[u.custom_sort] = u.exercises;
}
const explanations = require(path.join(DIR, 'explanations.cjs'));

async function main() {
  // fetch Malak's grammar rows (one per unit) + the unit custom_sort
  const { data: units, error: uErr } = await supabase
    .from('curriculum_units').select('id, custom_sort').eq('owner_student_id', MALAK_ID).order('custom_sort');
  if (uErr) throw uErr;

  let totalEx = 0;
  for (const unit of units) {
    const cs = unit.custom_sort;
    const { data: gRows, error: gErr } = await supabase
      .from('curriculum_grammar').select('id').eq('unit_id', unit.id);
    if (gErr) throw gErr;
    if (!gRows.length) { console.log(`  ⚠️  U${cs}: no grammar row, skipping`); continue; }
    const grammarId = gRows[0].id;

    // 1) deep explanation
    const secs = explanations[cs]?.sections;
    if (secs) {
      const { error } = await supabase.from('curriculum_grammar')
        .update({ explanation_content: { sections: secs }, updated_at: new Date().toISOString() })
        .eq('id', grammarId).select().single();
      if (error) throw new Error(`U${cs} explanation update: ${error.message}`);
    }

    // 2) exercises: wipe + reinsert as one row per question
    const { error: delErr } = await supabase.from('curriculum_grammar_exercises').delete().eq('grammar_id', grammarId);
    if (delErr) throw new Error(`U${cs} delete exercises: ${delErr.message}`);

    const rows = exercisesByUnit[cs].map((e, i) => ({
      grammar_id: grammarId,
      exercise_type: e.exercise_type,
      instructions_en: e.instructions_en || null,
      instructions_ar: e.instructions_ar || null,
      items: [e.item],
      is_auto_gradeable: true,
      sort_order: i,
    }));
    const { error: insErr } = await supabase.from('curriculum_grammar_exercises').insert(rows).select('id');
    if (insErr) throw new Error(`U${cs} insert exercises: ${insErr.message}`);
    totalEx += rows.length;

    const mix = rows.reduce((m, r) => ((m[r.exercise_type] = (m[r.exercise_type] || 0) + 1), m), {});
    console.log(`  ✅ U${cs} — ${secs?.length || 0} explanation sections · ${rows.length} exercises [${Object.entries(mix).map(([k, v]) => `${k}:${v}`).join(' ')}]`);
  }
  console.log(`\n✅ Grammar overhaul done — ${units.length} units, ${totalEx} exercises inserted.`);
}

main().catch((e) => { console.error('\n💥 FATAL:', e.message); process.exit(1); });
