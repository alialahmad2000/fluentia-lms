// scripts/insert-mosab-content.cjs
// Reads the agent-authored JSON in scripts/mosab-content/ (unit-06..12 + supp-01..05),
// VALIDATES each strictly, and inserts into مصعب's custom curriculum (owner-scoped, idempotent).
// - kind:"unit"        → new full unit (2 readings + Q + vocab + grammar + listening + writing + speaking)
// - kind:"supplement"  → adds Reading B + listening to an existing unit (by custom_sort)
// Listening rows are inserted WITHOUT audio_url; audio is added by generate-mosab-listening-audio.cjs.
// Run: node scripts/insert-mosab-content.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const MOSAB_ID = '4fb98807-526d-4675-adb5-eb938b31b948';
const L2_LEVEL = 'd3349438-8c8e-46b6-9ee6-e2e01c23229d';
const DIR = path.join(__dirname, 'mosab-content');
const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const wc = (paras) => paras.join(' ').replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
function assertOne(rows, ctx) { if (!rows || rows.length !== 1) throw new Error(`${ctx}: expected 1 row, got ${rows ? rows.length : 'null'}`); }

// ── validators (fail loudly per file) ──
function validReading(r, tag) {
  if (!r.label || !r.title_en || !Array.isArray(r.paragraphs) || !r.paragraphs.length) throw new Error(`${tag}: bad reading`);
  if (!Array.isArray(r.questions) || r.questions.length < 5) throw new Error(`${tag}: needs ≥5 questions (got ${r.questions?.length})`);
  for (const q of r.questions) {
    if (!q.question_en || !Array.isArray(q.choices) || q.choices.length !== 4) throw new Error(`${tag}: question needs 4 choices`);
    if (!q.choices.includes(q.correct_answer)) throw new Error(`${tag}: correct_answer "${q.correct_answer}" not in choices`);
  }
  if (!Array.isArray(r.vocab) || r.vocab.length < 6) throw new Error(`${tag}: needs ≥6 vocab (got ${r.vocab?.length})`);
  for (const v of r.vocab) if (!Array.isArray(v) || v.length < 5 || !v[0] || !v[1]) throw new Error(`${tag}: bad vocab row ${JSON.stringify(v)}`);
}
function validListening(l, tag) {
  if (!l || !l.title_en || !l.transcript) throw new Error(`${tag}: bad listening`);
  if (l.transcript.split(/\s+/).filter(Boolean).length > 90) throw new Error(`${tag}: listening transcript too long`);
  if (!Array.isArray(l.exercises) || l.exercises.length < 4) throw new Error(`${tag}: listening needs ≥4 exercises`);
  for (const e of l.exercises) {
    if (!e.question_en || !Array.isArray(e.options) || e.options.length !== 4) throw new Error(`${tag}: listening ex needs 4 options`);
    if (typeof e.correct_answer_index !== 'number' || e.correct_answer_index < 0 || e.correct_answer_index > 3) throw new Error(`${tag}: bad correct_answer_index`);
  }
}

// ── DB writers ──
async function insertReading(unitId, r, sortOrder) {
  const { data: rd, error } = await supabase.from('curriculum_readings').insert({
    unit_id: unitId, reading_label: r.label, title_en: r.title_en, title_ar: r.title_ar || null,
    passage_content: { paragraphs: r.paragraphs }, passage_word_count: wc(r.paragraphs),
    reading_skill_name_en: r.skill_en || null, reading_skill_name_ar: r.skill_ar || null,
    sort_order: sortOrder, is_published: true,
  }).select('id');
  if (error) throw new Error(`reading ${r.label}: ${error.message}`);
  assertOne(rd, `reading ${r.label}`);
  const readingId = rd[0].id;
  const qRows = r.questions.map((q, i) => ({
    reading_id: readingId, section: 'mcq', question_type: q.question_type || 'detail',
    question_en: q.question_en, question_ar: q.question_ar || null, choices: q.choices,
    correct_answer: q.correct_answer, explanation_ar: q.explanation_ar || null, sort_order: i,
  }));
  const { error: qErr } = await supabase.from('curriculum_comprehension_questions').insert(qRows);
  if (qErr) throw new Error(`questions ${r.label}: ${qErr.message}`);
  const vRows = r.vocab.map(([word, den, dar, ex, pos, appears], i) => ({
    reading_id: readingId, word, definition_en: den, definition_ar: dar || null, example_sentence: ex || null,
    part_of_speech: pos || null, appears_in_passage: appears !== false, cefr_level: 'A2', sort_order: i,
  }));
  const { error: vErr } = await supabase.from('curriculum_vocabulary').insert(vRows);
  if (vErr) throw new Error(`vocab ${r.label}: ${vErr.message}`);
  return { qN: qRows.length, vN: vRows.length };
}

async function insertListening(unitId, l) {
  const exercises = l.exercises.map((e, i) => ({
    type: 'mcq', question_en: e.question_en, question_type: e.question_type || 'detail',
    options: e.options, correct_answer_index: e.correct_answer_index,
    difficulty: e.difficulty || (i + 1), explanation_ar: e.explanation_ar || null, sort_order: i,
  }));
  const { error } = await supabase.from('curriculum_listening').insert({
    unit_id: unitId, listening_number: 1, title_en: l.title_en, title_ar: l.title_ar || null,
    transcript: l.transcript, audio_type: 'monologue', exercises, difficulty: 'standard',
    sort_order: 0, is_published: true,
  });
  if (error) throw new Error(`listening: ${error.message}`);
  return exercises.length;
}

async function insertGrammar(unitId, g) {
  const content = { sections: [
    { type: 'explanation', content_ar: g.explain_ar, content_en: g.explain_en_html },
    { type: 'formula', content: g.formula },
    { type: 'examples', items: g.examples || [] },
    { type: 'common_mistakes', items: g.mistakes || [] },
  ]};
  const { data: gram, error } = await supabase.from('curriculum_grammar').insert({
    unit_id: unitId, level_id: L2_LEVEL, category: 'grammar',
    topic_name_en: g.en, topic_name_ar: g.ar, explanation_content: content, sort_order: 0,
  }).select('id');
  if (error) throw new Error(`grammar: ${error.message}`);
  assertOne(gram, 'grammar');
  const exRows = (g.exercises || []).map((ex, i) => ({
    grammar_id: gram[0].id, exercise_type: 'choose', instructions_ar: ex.instruction_ar || 'اختر الإجابة الصحيحة',
    items: ex.items, is_auto_gradeable: true, sort_order: i,
  }));
  if (exRows.length) { const { error: exErr } = await supabase.from('curriculum_grammar_exercises').insert(exRows); if (exErr) throw new Error(`grammar ex: ${exErr.message}`); }
  return exRows.reduce((a, e) => a + (e.items?.length || 0), 0);
}

async function insertUnit(u, tag) {
  if (!Array.isArray(u.readings) || u.readings.length < 1) throw new Error(`${tag}: needs readings`);
  u.readings.forEach((r, i) => validReading(r, `${tag} reading[${i}]`));
  validListening(u.listening, tag);

  const { data: unit, error } = await supabase.from('curriculum_units').insert({
    level_id: L2_LEVEL, owner_student_id: MOSAB_ID, custom_sort: u.custom_sort, unit_number: u.custom_sort, sort_order: u.custom_sort,
    theme_en: u.theme_en, theme_ar: u.theme_ar, description_ar: u.desc_ar || null, why_matters: u.why_ar || null,
    outcomes: u.outcomes || null, warmup_questions: u.warmup || null, estimated_minutes: 55, is_published: true,
  }).select('id');
  if (error) throw new Error(`${tag} unit: ${error.message}`);
  assertOne(unit, `${tag} unit`);
  const unitId = unit[0].id;
  let totQ = 0, totV = 0;
  for (let i = 0; i < u.readings.length; i++) { const { qN, vN } = await insertReading(unitId, u.readings[i], i); totQ += qN; totV += vN; }
  const gEx = u.grammar ? await insertGrammar(unitId, u.grammar) : 0;
  const lEx = await insertListening(unitId, u.listening);
  if (u.writing) { const { error: wErr } = await supabase.from('curriculum_writing').insert({
    unit_id: unitId, task_number: 1, task_type: 'essay', title_en: u.writing.title_en, prompt_en: u.writing.prompt_en,
    prompt_ar: u.writing.prompt_ar || null, hints: u.writing.hints || [], word_count_min: u.writing.min || 40, word_count_max: u.writing.max || 90,
    rubric: { 'Content and Ideas': 30, 'Grammar and Accuracy': 25, 'Organization': 20, 'Vocabulary': 25 }, difficulty: 'standard', sort_order: 0, is_published: true }); if (wErr) throw new Error(`${tag} writing: ${wErr.message}`); }
  if (u.speaking) { const { error: sErr } = await supabase.from('curriculum_speaking').insert({
    unit_id: unitId, topic_number: 1, topic_type: 'descriptive', title_en: u.speaking.title_en, title_ar: u.speaking.prompt_ar || null,
    prompt_en: u.speaking.prompt_en, prompt_ar: u.speaking.prompt_ar || null, preparation_notes: u.speaking.prep || [], useful_phrases: u.speaking.phrases || [],
    min_duration_seconds: 30, max_duration_seconds: 180, evaluation_criteria: { fluency: 25, grammar: 25, coherence: 25, vocabulary: 25 }, difficulty: 'standard', sort_order: 0, is_published: true }); if (sErr) throw new Error(`${tag} speaking: ${sErr.message}`); }
  console.log(`  ✅ ${tag} U${u.custom_sort} «${u.theme_ar}» — ${u.readings.length} readings · ${totQ}Q · ${totV} vocab · grammar(${gEx} ex) · listening(${lEx}) · writing · speaking`);
}

async function insertSupplement(s, tag) {
  validReading(s.reading, `${tag} reading`);
  validListening(s.listening, tag);
  const { data: unit } = await supabase.from('curriculum_units').select('id, theme_ar').eq('owner_student_id', MOSAB_ID).eq('custom_sort', s.custom_sort).maybeSingle();
  if (!unit) throw new Error(`${tag}: no unit with custom_sort=${s.custom_sort}`);
  // idempotency: skip reading B if it exists; skip listening if the unit already has one
  const { data: exReadings } = await supabase.from('curriculum_readings').select('reading_label').eq('unit_id', unit.id);
  const hasB = (exReadings || []).some((r) => r.reading_label === s.reading.label);
  const { count: lCount } = await supabase.from('curriculum_listening').select('id', { count: 'exact', head: true }).eq('unit_id', unit.id);
  let addedR = 'skip', addedL = 'skip';
  if (!hasB) { const { qN, vN } = await insertReading(unit.id, s.reading, 1); addedR = `${qN}Q/${vN}v`; }
  if (!lCount) { const lEx = await insertListening(unit.id, s.listening); addedL = `${lEx}ex`; }
  console.log(`  ✅ ${tag} U${s.custom_sort} «${unit.theme_ar}» — readingB:${addedR} · listening:${addedL}`);
}

(async () => {
  console.log('📥 Inserting مصعب content from', DIR);
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
  let ok = 0, fail = 0;
  // new units first, then supplements
  const units = files.filter((f) => f.startsWith('unit-'));
  const supps = files.filter((f) => f.startsWith('supp-'));
  for (const f of [...units, ...supps]) {
    const tag = f.replace('.json', '');
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { console.error(`  ❌ ${tag}: invalid JSON — ${e.message}`); fail++; continue; }
    try {
      if (data.kind === 'unit') {
        const { data: existing } = await supabase.from('curriculum_units').select('id').eq('owner_student_id', MOSAB_ID).eq('custom_sort', data.custom_sort).maybeSingle();
        if (existing) { console.log(`  ⏭️  ${tag} U${data.custom_sort} already exists — skipping`); ok++; continue; }
        await insertUnit(data, tag);
      } else if (data.kind === 'supplement') {
        await insertSupplement(data, tag);
      } else { throw new Error(`unknown kind "${data.kind}"`); }
      ok++;
    } catch (e) { console.error(`  ❌ ${tag}: ${e.message}`); fail++; }
  }
  const { count: unitN } = await supabase.from('curriculum_units').select('id', { count: 'exact', head: true }).eq('owner_student_id', MOSAB_ID);
  console.log(`\n=== DONE — ok:${ok} fail:${fail} · Mosab now has ${unitN} owner units ===`);
  if (fail) process.exit(1);
})().catch((e) => { console.error('💥 FATAL:', e.message); process.exit(1); });
