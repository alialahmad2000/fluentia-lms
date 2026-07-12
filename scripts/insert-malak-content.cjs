// scripts/insert-malak-content.cjs
// Phase C insert for MASTER-PROVISION-MALAK. Reads scripts/malak-curriculum.cjs and
// writes the 10-unit owner-scoped track for Malak Al-Kendi via the service role.
// Mirrors the ROW STRUCTURE of Sara's blueprint (unit → reading → {comp Qs, vocab};
// unit → grammar → exercises; unit → speaking; unit → writing). audio_url stays NULL.
// Idempotent: deletes any existing Malak-owned content in dependency order, then reinserts.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const UNITS = require('./malak-curriculum.cjs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ Missing Supabase env'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const MALAK_ID = '28a83f30-9474-4869-8f08-f63dc40c767d';
const LEVEL_ID = 'f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab'; // level 3 / B1 / طلاقة

const FORBIDDEN = ['معهد', 'دورة', 'مذهل', 'مميز', 'استثنائية', 'الأفضل'];

function wordCount(paragraphs) {
  return paragraphs.join(' ').replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
}

// Brand-word guard across every Arabic string we author.
function guardBrandWords() {
  const blob = JSON.stringify(UNITS);
  const hits = FORBIDDEN.filter((w) => blob.includes(w));
  if (hits.length) { console.error('❌ Forbidden brand word(s) found in content:', hits.join(', ')); process.exit(1); }
}

async function ins(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}

async function cleanup() {
  const { data: units, error } = await supabase
    .from('curriculum_units').select('id').eq('owner_student_id', MALAK_ID);
  if (error) throw error;
  if (!units.length) { console.log('  (no prior Malak units — clean slate)'); return; }
  const unitIds = units.map((u) => u.id);
  console.log(`  cleaning ${unitIds.length} prior Malak unit(s)…`);

  const { data: readings } = await supabase.from('curriculum_readings').select('id').in('unit_id', unitIds);
  const readingIds = (readings || []).map((r) => r.id);
  const { data: grammars } = await supabase.from('curriculum_grammar').select('id').in('unit_id', unitIds);
  const grammarIds = (grammars || []).map((g) => g.id);

  if (readingIds.length) {
    await supabase.from('curriculum_comprehension_questions').delete().in('reading_id', readingIds);
    await supabase.from('curriculum_vocabulary').delete().in('reading_id', readingIds);
  }
  if (grammarIds.length) await supabase.from('curriculum_grammar_exercises').delete().in('grammar_id', grammarIds);
  await supabase.from('curriculum_grammar').delete().in('unit_id', unitIds);
  await supabase.from('curriculum_speaking').delete().in('unit_id', unitIds);
  await supabase.from('curriculum_writing').delete().in('unit_id', unitIds);
  await supabase.from('curriculum_readings').delete().in('unit_id', unitIds);
  await supabase.from('curriculum_units').delete().in('id', unitIds);
  console.log('  ✅ cleanup done');
}

async function insertUnit(u) {
  // 1) unit
  const ribbons = { ...u.activity_ribbons };
  const [unit] = await ins('curriculum_units', {
    level_id: LEVEL_ID,
    unit_number: u.unit_number,
    custom_sort: u.custom_sort,
    owner_student_id: MALAK_ID,
    theme_en: u.theme_en, theme_ar: u.theme_ar,
    description_en: u.description_en, description_ar: u.description_ar,
    why_matters: u.why_matters,
    outcomes: u.outcomes,
    brief_questions: u.brief_questions,
    brief_locale: 'ar',
    activity_ribbons: ribbons,
    warmup_questions: [],
    grammar_topic_ids: [],
    estimated_minutes: 60,
    is_published: true,
    sort_order: 0,
  });

  // 2) reading
  const [reading] = await ins('curriculum_readings', {
    unit_id: unit.id,
    reading_label: 'A',
    title_en: u.reading.title_en, title_ar: u.reading.title_ar,
    passage_content: { paragraphs: u.reading.paragraphs },
    passage_word_count: wordCount(u.reading.paragraphs),
    reading_skill_name_en: u.reading.reading_skill_name_en,
    reading_skill_name_ar: u.reading.reading_skill_name_ar,
    passage_audio_url: null,
    sort_order: 0,
    is_published: true,
  });

  // 3) comprehension questions
  await ins('curriculum_comprehension_questions', u.comprehension.map((q, i) => ({
    reading_id: reading.id,
    section: 'mcq',
    question_type: q.question_type,
    question_en: q.question_en, question_ar: q.question_ar,
    choices: q.choices,
    correct_answer: q.correct_answer,
    explanation_ar: q.explanation_ar,
    sort_order: i,
  })));

  // 4) vocabulary
  await ins('curriculum_vocabulary', u.vocab.map((v, i) => ({
    reading_id: reading.id,
    word: v.word,
    definition_en: v.definition_en, definition_ar: v.definition_ar,
    example_sentence: v.example_sentence,
    part_of_speech: v.part_of_speech,
    tier: 'core',
    cefr_level: 'B1',
    difficulty_tier: 'high_frequency',
    appears_in_passage: v.appears_in_passage,
    audio_url: null,
    sort_order: i,
  })));

  // 5) grammar (in-context)
  const [grammar] = await ins('curriculum_grammar', {
    unit_id: unit.id,
    level_id: LEVEL_ID,
    category: 'grammar',
    topic_name_en: u.grammar.topic_name_en, topic_name_ar: u.grammar.topic_name_ar,
    explanation_content: { sections: [{ type: 'explanation', content_ar: u.grammar.content_ar, content_en: u.grammar.content_en }] },
    is_published: true,
    sort_order: 0,
  });

  // 6) grammar exercise
  await ins('curriculum_grammar_exercises', [{
    grammar_id: grammar.id,
    exercise_type: u.grammar.exercise.exercise_type,
    instructions_en: u.grammar.exercise.instructions_en,
    items: u.grammar.exercise.items.map((it) => ({
      options: [],
      question: it.question,
      correct_answer: it.correct_answer,
      explanation_ar: it.explanation_ar,
      instruction_ar: it.instruction_ar,
    })),
    is_auto_gradeable: true,
    sort_order: 0,
  }]);

  // 7) speaking (the core)
  await ins('curriculum_speaking', [{
    unit_id: unit.id,
    topic_number: 1,
    topic_type: 'roleplay',
    title_en: u.speaking.title_en, title_ar: u.speaking.title_ar,
    prompt_en: u.speaking.prompt_en, prompt_ar: u.speaking.prompt_ar,
    useful_phrases: u.speaking.useful_phrases,
    preparation_notes: u.speaking.preparation_notes,
    min_duration_seconds: 45,
    max_duration_seconds: 120,
    evaluation_criteria: { content: 25, fluency: 25, grammar: 25, pronunciation: 25 },
    difficulty: 'standard',
    is_published: true,
    sort_order: 0,
    model_audio_url: null,
  }]);

  // 8) writing (units 3, 8, 10)
  if (u.writing) {
    await ins('curriculum_writing', [{
      unit_id: unit.id,
      task_number: 1,
      task_type: u.writing.task_type,
      title_en: u.writing.title_en, title_ar: u.writing.title_ar,
      prompt_en: u.writing.prompt_en, prompt_ar: u.writing.prompt_ar,
      hints: u.writing.hints,
      word_count_min: u.writing.word_count_min,
      word_count_max: u.writing.word_count_max,
      rubric: { content: 25, grammar: 25, vocabulary: 25, organization: 25 },
      difficulty: 'standard',
      is_published: true,
      sort_order: 0,
    }]);
  }

  const wc = wordCount(u.reading.paragraphs);
  console.log(`  ✅ U${u.custom_sort} «${u.theme_ar}» — reading ${wc}w · ${u.comprehension.length} Qs · ${u.vocab.length} vocab · grammar+ex · speaking${u.writing ? ' · writing' : ''}`);
  return { unit_id: unit.id, wc };
}

(async () => {
  try {
    guardBrandWords();
    console.log('🧹 Cleanup…');
    await cleanup();
    console.log('\n📚 Inserting 10 units…');
    let totalWords = 0;
    for (const u of UNITS) {
      const r = await insertUnit(u);
      totalWords += r.wc;
    }
    console.log(`\n✅ Phase C done — 10 units inserted. Avg passage ${Math.round(totalWords / UNITS.length)} words.`);
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
