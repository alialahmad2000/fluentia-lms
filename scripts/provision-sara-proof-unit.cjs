// scripts/provision-sara-proof-unit.cjs
// PROOF unit for the Fardi custom-curriculum engine: flags Sara `uses_custom_curriculum`
// and creates ONE custom IT unit owned by her (mirrors the level-3 blueprint structure),
// with minimal-but-valid child content (1 reading + 2 comprehension Qs + 3 vocab + 1 speaking).
// Service-role, idempotent (check-existence-first), .select()+rowcount after every write, NO deletes.
// Run:  node scripts/provision-sara-proof-unit.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ Missing SUPABASE_URL/SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(SUPABASE_URL.trim(), SERVICE_KEY, { auth: { persistSession: false } });

const SARA_EMAIL = 'sarahasmari6@gmail.com';
const LEVEL_NUMBER = 3;                 // B1 / Fluency
const CUSTOM_SORT = 1;

function one(rows, ctx) { if (!rows || rows.length !== 1) throw new Error(`${ctx}: expected 1 row, got ${rows ? rows.length : 'null'}`); return rows[0]; }

async function main() {
  // Resolve Sara + level 3
  const { data: prof } = await supabase.from('profiles').select('id').eq('email', SARA_EMAIL).maybeSingle();
  if (!prof) throw new Error(`Sara not found (${SARA_EMAIL}) — run provision-sara-alasmari.cjs first.`);
  const saraId = prof.id;
  const { data: lvl } = await supabase.from('curriculum_levels').select('id').eq('level_number', LEVEL_NUMBER).single();
  const levelId = lvl.id;
  console.log(`Sara=${saraId}  level3=${levelId}`);

  // 1. Flag Sara custom (.select verify)
  const { data: su, error: sErr } = await supabase.from('students')
    .update({ uses_custom_curriculum: true }).eq('id', saraId).select('id, uses_custom_curriculum');
  if (sErr) throw new Error(`flag update: ${sErr.message}`);
  console.log(`✅ Sara uses_custom_curriculum=${one(su, 'flag').uses_custom_curriculum}`);

  // 2. Custom unit (idempotent on owner + custom_sort)
  const unitPayload = {
    owner_student_id: saraId,
    level_id: levelId,
    unit_number: 1,
    custom_sort: CUSTOM_SORT,
    is_published: false, // matches the level-3 template units (student page has no publish filter)
    theme_en: 'Explaining an Outage on a Call',
    theme_ar: 'شرح انقطاع الخدمة على مكالمة',
    description_en: 'Explain an IT service outage clearly to the support team on a live call.',
    description_ar: 'اشرحي انقطاع خدمة تقنية بوضوح لفريق الدعم في مكالمة مباشرة.',
    estimated_minutes: 60,
    why_matters: 'لمّا تنقطع خدمة والدنيا واقفة على مكالمة، مو المهم تعرفي المشكلة — المهم تشرحينها بوضوح وبثقة لأشخاص ينتظرون قرارك، وبعضهم ما يتكلم إنجليزي مثلك. هذي الوحدة تدرّبكِ تشرحين انقطاعاً حقيقياً بلغة مرتّبة وهادئة.',
    outcomes: [
      'وصف انقطاع خدمة تقنية بالترتيب الصحيح: وقت البدء، الأثر، الحل، وقت العودة',
      'استخدام مفردات الأعطال التقنية (server, outage, impact) في جمل صحيحة',
      'شرح الأثر بالأرقام بوضوح يكفي لمستمع غير ناطق بالإنجليزية',
      'إدارة مكالمة دعم قصيرة بثقة ومن غير تلعثم أو ترجمة في رأسكِ',
    ],
    brief_questions: [
      'وش أول شيء تقولينه لفريق الدعم لمّا تنقطع الخدمة فجأة؟',
      'كيف تشرحين "الأثر" لشخص مستعجل وما يعرف تفاصيل التقنية؟',
    ],
    activity_ribbons: {
      reading: 'اقرئي تقرير حادثة حقيقياً عن انقطاع خدمة دفع واستخلصي ما الذي حدث بالضبط',
      vocabulary: 'أتقني مفردات الأعطال التي تحتاجينها على كل مكالمة دعم',
      speaking: 'اشرحي انقطاع الخدمة لفريق الدعم في مكالمة قصيرة وواضحة',
    },
  };
  let unit;
  const { data: existingUnit } = await supabase.from('curriculum_units')
    .select('id').eq('owner_student_id', saraId).eq('custom_sort', CUSTOM_SORT).maybeSingle();
  if (existingUnit) {
    const { data, error } = await supabase.from('curriculum_units').update(unitPayload).eq('id', existingUnit.id).select('id, theme_en, owner_student_id');
    if (error) throw new Error(`unit update: ${error.message}`);
    unit = one(data, 'unit update'); console.log(`⏭️  Reused custom unit ${unit.id} (updated).`);
  } else {
    const { data, error } = await supabase.from('curriculum_units').insert(unitPayload).select('id, theme_en, owner_student_id');
    if (error) throw new Error(`unit insert: ${error.message}`);
    unit = one(data, 'unit insert'); console.log(`✅ Created custom unit ${unit.id}.`);
  }
  const unitId = unit.id;

  // 3. Reading (idempotent on unit_id + reading_label)
  const paragraphs = [
    'At 09:14 this morning, our main payment *server* stopped responding. Customers could not complete their orders, and the support team received more than forty calls in ten minutes. The on-call engineer quickly confirmed a full *outage* of the payment service.',
    'The team moved traffic to a backup *server*, and the service returned to normal at 09:41. The total *impact* was twenty-seven minutes of downtime and about ninety failed payments. We are now investigating the root cause so that this does not happen again.',
  ];
  const readingPayload = {
    unit_id: unitId, reading_label: 'A',
    title_en: 'Incident Report: The Payment Service Outage',
    title_ar: 'تقرير حادثة: انقطاع خدمة الدفع',
    passage_content: { paragraphs },
    passage_word_count: paragraphs.join(' ').split(/\s+/).filter(Boolean).length,
    reading_skill_name_en: 'Reading for sequence of events',
    reading_skill_name_ar: 'القراءة لتتبّع تسلسل الأحداث',
    sort_order: 0, is_published: false,
  };
  let reading;
  const { data: exR } = await supabase.from('curriculum_readings').select('id').eq('unit_id', unitId).eq('reading_label', 'A').maybeSingle();
  if (exR) {
    const { data, error } = await supabase.from('curriculum_readings').update(readingPayload).eq('id', exR.id).select('id');
    if (error) throw new Error(`reading update: ${error.message}`); reading = one(data, 'reading update');
  } else {
    const { data, error } = await supabase.from('curriculum_readings').insert(readingPayload).select('id');
    if (error) throw new Error(`reading insert: ${error.message}`); reading = one(data, 'reading insert');
  }
  const readingId = reading.id;
  console.log(`✅ Reading ${readingId} (label A)`);

  // 4. Comprehension questions (idempotent on reading_id + sort_order)
  const comps = [
    { reading_id: readingId, section: 'mcq', question_type: 'main_idea', sort_order: 0,
      question_en: 'What is this report mainly about?',
      question_ar: 'عن ماذا يتحدث هذا التقرير بشكل رئيسي؟',
      choices: ['A short outage of the payment service and how the team fixed it','A new payment feature the company launched','A training session for the support team','A customer complaint about slow delivery'],
      correct_answer: 'A short outage of the payment service and how the team fixed it',
      explanation_ar: 'التقرير يصف انقطاعاً قصيراً لخدمة الدفع وكيف عالجه الفريق.' },
    { reading_id: readingId, section: 'mcq', question_type: 'detail', sort_order: 1,
      question_en: 'How long did the outage last?',
      question_ar: 'كم استمر الانقطاع؟',
      choices: ['Twenty-seven minutes','Ten minutes','Two hours','Forty minutes'],
      correct_answer: 'Twenty-seven minutes',
      explanation_ar: 'بدأ الساعة 09:14 وعاد للعمل 09:41، أي 27 دقيقة.' },
  ];
  let compInserted = 0;
  for (const c of comps) {
    const { data: ex } = await supabase.from('curriculum_comprehension_questions').select('id').eq('reading_id', readingId).eq('sort_order', c.sort_order).maybeSingle();
    if (ex) continue;
    const { data, error } = await supabase.from('curriculum_comprehension_questions').insert(c).select('id');
    if (error) throw new Error(`comprehension insert: ${error.message}`); one(data, 'comprehension'); compInserted++;
  }
  const { count: compCount } = await supabase.from('curriculum_comprehension_questions').select('id', { count: 'exact', head: true }).eq('reading_id', readingId);
  console.log(`✅ Comprehension: inserted ${compInserted}, total ${compCount}`);

  // 5. Vocabulary (idempotent on reading_id + word)
  const vocab = [
    { word: 'server', definition_en: 'a computer that provides data or services to other computers', definition_ar: 'الخادم', example_sentence: 'The main server stopped responding at 09:14.', part_of_speech: 'noun', sort_order: 0 },
    { word: 'outage', definition_en: 'a period when a service or system is not working', definition_ar: 'انقطاع الخدمة', example_sentence: 'The engineer confirmed a full outage of the payment service.', part_of_speech: 'noun', sort_order: 1 },
    { word: 'impact', definition_en: 'the effect or influence something has', definition_ar: 'الأثر / التأثير', example_sentence: 'The impact was twenty-seven minutes of downtime.', part_of_speech: 'noun', sort_order: 2 },
  ].map((v) => ({ ...v, reading_id: readingId, difficulty_tier: 'high_frequency', appears_in_passage: true, tier: 'core', cefr_level: 'B1' }));
  let vocabInserted = 0;
  for (const v of vocab) {
    const { data: ex } = await supabase.from('curriculum_vocabulary').select('id').eq('reading_id', readingId).eq('word', v.word).maybeSingle();
    if (ex) continue;
    const { data, error } = await supabase.from('curriculum_vocabulary').insert(v).select('id');
    if (error) throw new Error(`vocab insert (${v.word}): ${error.message}`); one(data, 'vocab'); vocabInserted++;
  }
  const { count: vocabCount } = await supabase.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).eq('reading_id', readingId);
  console.log(`✅ Vocabulary: inserted ${vocabInserted}, total ${vocabCount}`);

  // 6. Speaking task (idempotent on unit_id + topic_number)
  const speakingPayload = {
    unit_id: unitId, topic_number: 1, topic_type: 'roleplay',
    title_en: 'Explain the outage to the support team on a call',
    title_ar: 'اشرحي الانقطاع لفريق الدعم في مكالمة',
    prompt_en: 'You are on a call with the support team. In 60–90 seconds, explain what happened during the payment service outage: when it started, what the impact was, what the team did, and when it was fixed. Speak clearly enough for a non-native listener to follow.',
    prompt_ar: 'أنتِ في مكالمة مع فريق الدعم. خلال ٦٠–٩٠ ثانية، اشرحي ما حدث أثناء انقطاع خدمة الدفع: متى بدأ، وما الأثر، وما الذي فعله الفريق، ومتى تم إصلاحه. تكلمي بوضوح يكفي ليتابعكِ مستمعٌ غير ناطق بالإنجليزية.',
    preparation_notes: ['ابدئي بوقت بدء الانقطاع والخدمة المتأثرة','اذكري الأثر بالأرقام: كم دقيقة، وكم عملية فشلت','اشرحي الحل خطوة بخطوة ثم وقت العودة للعمل الطبيعي'],
    useful_phrases: ['The service went down at…','The impact was…','We moved traffic to a backup server','The service was back to normal at…','We are investigating the root cause'],
    min_duration_seconds: 45, max_duration_seconds: 120, is_published: false, sort_order: 0,
  };
  let speaking;
  const { data: exSp } = await supabase.from('curriculum_speaking').select('id').eq('unit_id', unitId).eq('topic_number', 1).maybeSingle();
  if (exSp) {
    const { data, error } = await supabase.from('curriculum_speaking').update(speakingPayload).eq('id', exSp.id).select('id');
    if (error) throw new Error(`speaking update: ${error.message}`); speaking = one(data, 'speaking update');
  } else {
    const { data, error } = await supabase.from('curriculum_speaking').insert(speakingPayload).select('id');
    if (error) throw new Error(`speaking insert: ${error.message}`); speaking = one(data, 'speaking insert');
  }
  console.log(`✅ Speaking ${speaking.id}`);

  // 7. Assertions
  const { count: unitCount } = await supabase.from('curriculum_units').select('id', { count: 'exact', head: true }).eq('owner_student_id', saraId);
  console.log(`\n📊 Sara owns ${unitCount} custom unit(s) (expected 1).`);
  if (unitCount !== 1) throw new Error(`Expected Sara to own exactly 1 custom unit, found ${unitCount}`);
  console.log('✅ Proof unit complete.');
  console.log(JSON.stringify({ unitId, readingId, vocab: vocabCount, comprehension: compCount, speaking: speaking.id }));
}
main().catch((e) => { console.error('\n💥 FATAL:', e.message); process.exit(1); });
