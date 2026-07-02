// scripts/provision-sara-it-units.cjs
// Generate Sara Al-Asmari's full 8-unit "Career English for IT" custom track from
// scripts/data/sara-it-units.cjs. Service-role, idempotent (upsert by natural key — safe to re-run;
// upgrades the Unit-1 proof rows in place). .select()+rowcount after every write. NO deletes.
// Run:  node scripts/provision-sara-it-units.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const UNITS = require('./data/sara-it-units.cjs');

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ Missing SUPABASE_URL/SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SARA_EMAIL = 'sarahasmari6@gmail.com';
const LEVEL_NUMBER = 3;

function one(rows, ctx) { if (!rows || rows.length !== 1) throw new Error(`${ctx}: expected 1 row, got ${rows ? rows.length : 'null'}`); return rows[0]; }

// Upsert one row by a natural-key filter object. Returns the row.
async function upsert(table, filter, payload, ctx) {
  let q = supabase.from(table).select('id');
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
  const { data: existing, error: selErr } = await q.maybeSingle();
  if (selErr) throw new Error(`${ctx} select: ${selErr.message}`);
  if (existing) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', existing.id).select('id');
    if (error) throw new Error(`${ctx} update: ${error.message}`);
    return one(data, `${ctx} update`);
  }
  const { data, error } = await supabase.from(table).insert({ ...filter, ...payload }).select('id');
  if (error) throw new Error(`${ctx} insert: ${error.message}`);
  return one(data, `${ctx} insert`);
}

async function main() {
  const { data: prof } = await supabase.from('profiles').select('id').eq('email', SARA_EMAIL).maybeSingle();
  if (!prof) throw new Error(`Sara not found (${SARA_EMAIL})`);
  const saraId = prof.id;
  const { data: lvl } = await supabase.from('curriculum_levels').select('id').eq('level_number', LEVEL_NUMBER).single();
  const levelId = lvl.id;

  // Ensure custom flag
  const { data: flag } = await supabase.from('students').update({ uses_custom_curriculum: true }).eq('id', saraId).select('uses_custom_curriculum');
  console.log(`Sara=${saraId}  L3=${levelId}  uses_custom_curriculum=${one(flag, 'flag').uses_custom_curriculum}\n`);

  for (const u of UNITS) {
    console.log(`── Unit ${u.custom_sort}: ${u.theme_en}`);
    // 1. unit
    const unitRow = await upsert('curriculum_units',
      { owner_student_id: saraId, custom_sort: u.custom_sort },
      {
        level_id: levelId, unit_number: u.custom_sort, is_published: false, estimated_minutes: 60,
        theme_en: u.theme_en, theme_ar: u.theme_ar, description_en: u.description_en, description_ar: u.description_ar,
        why_matters: u.why_matters, outcomes: u.outcomes, brief_questions: u.brief_questions, activity_ribbons: u.ribbons,
      }, `unit ${u.custom_sort}`);
    const unitId = unitRow.id;

    // 2. reading
    const paragraphs = u.reading.paragraphs;
    const readingRow = await upsert('curriculum_readings',
      { unit_id: unitId, reading_label: 'A' },
      {
        title_en: u.reading.title_en, title_ar: u.reading.title_ar,
        passage_content: { paragraphs }, passage_word_count: paragraphs.join(' ').split(/\s+/).filter(Boolean).length,
        reading_skill_name_en: u.reading.skill_en, reading_skill_name_ar: u.reading.skill_ar,
        sort_order: 0, is_published: false,
      }, `reading ${u.custom_sort}`);
    const readingId = readingRow.id;

    // 3. comprehension
    for (let i = 0; i < u.comprehension.length; i++) {
      const c = u.comprehension[i];
      await upsert('curriculum_comprehension_questions',
        { reading_id: readingId, sort_order: i },
        { section: 'mcq', question_type: c.question_type, question_en: c.question_en, question_ar: c.question_ar,
          choices: c.choices, correct_answer: c.correct_answer, explanation_ar: c.explanation_ar },
        `comp ${u.custom_sort}.${i}`);
    }
    const { count: compCount } = await supabase.from('curriculum_comprehension_questions').select('id', { count: 'exact', head: true }).eq('reading_id', readingId);

    // 4. vocabulary
    for (let i = 0; i < u.vocab.length; i++) {
      const v = u.vocab[i];
      await upsert('curriculum_vocabulary',
        { reading_id: readingId, word: v.word },
        { definition_en: v.definition_en || v.ar_en || `(${v.pos})`, definition_ar: v.ar, example_sentence: v.ex,
          part_of_speech: v.pos, difficulty_tier: 'high_frequency', appears_in_passage: true, tier: 'core', cefr_level: 'B1', sort_order: i },
        `vocab ${u.custom_sort}.${v.word}`);
    }
    const { count: vocabCount } = await supabase.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).eq('reading_id', readingId);

    // 5. grammar (+ exercises)
    const g = u.grammar;
    const grammarRow = await upsert('curriculum_grammar',
      { unit_id: unitId, sort_order: 0 },
      { level_id: levelId, topic_name_en: g.topic_en, topic_name_ar: g.topic_ar, category: 'grammar',
        explanation_content: { sections: [{ type: 'explanation', content_ar: g.content_ar, content_en: g.content_en }] },
        is_published: false }, `grammar ${u.custom_sort}`);
    const grammarId = grammarRow.id;
    for (let i = 0; i < (g.exercises || []).length; i++) {
      const ex = g.exercises[i];
      await upsert('curriculum_grammar_exercises',
        { grammar_id: grammarId, sort_order: i },
        { exercise_type: ex.exercise_type || 'fill_blank', instructions_en: ex.instruction_en || null,
          items: (ex.items || []).map((it) => ({ options: [], ...it })), is_auto_gradeable: true },
        `grammar_ex ${u.custom_sort}.${i}`);
    }

    // 6. task (speaking or writing)
    if (u.writing) {
      const w = u.writing;
      await upsert('curriculum_writing',
        { unit_id: unitId, task_number: 1 },
        { task_type: w.task_type, title_en: w.title_en, title_ar: w.title_ar, prompt_en: w.prompt_en, prompt_ar: w.prompt_ar,
          hints: w.hints, word_count_min: w.word_count_min, word_count_max: w.word_count_max, is_published: false, sort_order: 0 },
        `writing ${u.custom_sort}`);
      console.log(`   ✅ reading + ${compCount} comp + ${vocabCount} vocab + grammar + WRITING task`);
    } else {
      const s = u.speaking;
      await upsert('curriculum_speaking',
        { unit_id: unitId, topic_number: 1 },
        { topic_type: s.topic_type || 'roleplay', title_en: s.title_en, title_ar: s.title_ar, prompt_en: s.prompt_en, prompt_ar: s.prompt_ar,
          preparation_notes: s.prep, useful_phrases: s.phrases, min_duration_seconds: 45, max_duration_seconds: 120, is_published: false, sort_order: 0 },
        `speaking ${u.custom_sort}`);
      console.log(`   ✅ reading + ${compCount} comp + ${vocabCount} vocab + grammar + SPEAKING task`);
    }
  }

  // ── Assertions (Phase D, service-role side) ──
  console.log('\n=== ASSERTIONS ===');
  const { data: saraUnits } = await supabase.from('curriculum_units').select('id, custom_sort, theme_en').eq('owner_student_id', saraId).order('custom_sort');
  const sorts = (saraUnits || []).map((u) => u.custom_sort);
  const okCount = saraUnits.length === 8 && JSON.stringify(sorts) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]);
  console.log(`${okCount ? '✅' : '❌'} Sara owns 8 units, custom_sort 1–8 in order (${sorts.join(',')})`);
  let allChildrenOk = true;
  for (const su of saraUnits) {
    const { data: rd } = await supabase.from('curriculum_readings').select('id').eq('unit_id', su.id);
    const rids = (rd || []).map((r) => r.id);
    const { count: cc } = await supabase.from('curriculum_comprehension_questions').select('id', { count: 'exact', head: true }).in('reading_id', rids.length ? rids : ['00000000-0000-0000-0000-000000000000']);
    const { count: vc } = await supabase.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).in('reading_id', rids.length ? rids : ['00000000-0000-0000-0000-000000000000']);
    const { count: gc } = await supabase.from('curriculum_grammar').select('id', { count: 'exact', head: true }).eq('unit_id', su.id);
    const { count: spc } = await supabase.from('curriculum_speaking').select('id', { count: 'exact', head: true }).eq('unit_id', su.id);
    const { count: wc } = await supabase.from('curriculum_writing').select('id', { count: 'exact', head: true }).eq('unit_id', su.id);
    const taskOk = (spc + wc) >= 1;
    const ok = rd.length === 1 && cc >= 4 && vc === 7 && gc === 1 && taskOk;
    if (!ok) allChildrenOk = false;
    console.log(`   ${ok ? '✅' : '❌'} sort ${su.custom_sort}: reading=${rd.length} comp=${cc} vocab=${vc} grammar=${gc} task=${spc + wc}`);
  }
  const { count: genericL3 } = await supabase.from('curriculum_units').select('id', { count: 'exact', head: true }).eq('level_id', levelId).is('owner_student_id', null);
  const okGeneric = genericL3 === 12;
  console.log(`${okGeneric ? '✅' : '❌'} Generic L3 units untouched (owner NULL count = ${genericL3}, expected 12)`);

  if (!okCount || !allChildrenOk || !okGeneric) { console.error('\n💥 ASSERTIONS FAILED'); process.exit(1); }
  console.log('\n✅ All 8 units generated + verified.');
}
main().catch((e) => { console.error('\n💥 FATAL:', e.message); process.exit(1); });
