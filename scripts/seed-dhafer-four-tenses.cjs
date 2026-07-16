// scripts/seed-dhafer-four-tenses.cjs
// Seeds ONE manually-authored, individually-assigned grammar task for ظافر آل قهيدان:
//   «الأزمنة الأربعة — تحويل الجُمل» (The Four Tenses — Sentence Transformation)
//   Learn section (4 tenses, formation tables, rules, worked examples) + 36 auto-graded
//   transformation questions with accepted_answers arrays (rule-based local grading —
//   validateAnswer — NO AI at runtime).
// Surface: targeted_exercises → /student/exercises (per-student, RLS student-own).
// Idempotent: skips if a pending/completed row with this dedupe title already exists.
// Run:  node scripts/seed-dhafer-four-tenses.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ missing env'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DHAFER_ID = 'f1ebe336-fe3f-428f-957e-051458c516f5'; // profiles.id == students.id
const TITLE = 'الأزمنة الأربعة — تحويل الجُمل';

// ─── LEARN (from the task appendix, verbatim content, masculine address) ─────
const LEARN = {
  title_en: 'The Four Tenses — Sentence Transformation',
  intro_ar: 'في كل صف من التمرين هناك جملة واحدة مُعطاة لك. اقرأها جيدًا، ثم حوّلها إلى الصيغ الثلاث الأخرى لنفس الجملة. قبل أن تبدأ، اقرأ الشرح والأمثلة المحلولة بالأسفل.',
  forms: [
    { en: 'Affirmative', ar: 'مُثبت', desc_ar: 'جملة إثبات عادية.' },
    { en: 'Negative', ar: 'منفي', desc_ar: 'نضيف النفي (not) بالأداة المناسبة (don\'t / doesn\'t / didn\'t / isn\'t / aren\'t / wasn\'t / weren\'t).' },
    { en: 'Yes/No Question', ar: 'سؤال نعم/لا', desc_ar: 'نبدأ الجملة بالفعل المساعد (do / does / did / is / are / was / were).' },
    { en: 'WH-Question', ar: 'سؤال بأداة', desc_ar: 'نضع أداة استفهام (What / Where / When / Why / How / Who) في بداية سؤال الـ Yes/No.' },
  ],
  tenses: [
    {
      title_en: 'Present Simple', title_ar: 'المضارع البسيط',
      uses_ar: [
        'العادات والروتين: I drink coffee every morning.',
        'الحقائق العامة: Water boils at 100°C. / The sun rises in the east.',
        'المواعيد الثابتة (جداول): The train leaves at 6.',
        'المشاعر والحالات (stative verbs): She loves music.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + base verb (+ s/es مع he/she/it)', example: 'She teaches / They play' },
        { form: 'Negative', rule: 'Subject + do/does + not + base verb', example: "She doesn't teach / They don't play" },
        { form: 'Yes/No', rule: 'Do/Does + subject + base verb ?', example: 'Does she teach? / Do they play?' },
        { form: 'WH', rule: 'WH + do/does + subject + base verb ?', example: 'Where does she teach?' },
      ],
      rules_ar: [
        'مع he/she/it نضيف s (play→plays)، و es بعد الحروف s/sh/ch/x/o (teach→teaches, go→goes)، وإذا انتهى الفعل بحرف ساكن + y نحوّلها إلى ies (study→studies).',
        'عند استخدام do/does + not أو السؤال بـ Do/Does، يعود الفعل الأساسي إلى صيغته المجردة (base) بدون s: ✔ She doesn\'t teach ✘ doesn\'t teaches.',
      ],
      signal_words: 'every day, always, usually, often, sometimes, never, in the evening, on Mondays',
      worked: {
        seed: 'He eats breakfast every morning.',
        steps: [
          { label: 'Negative', answer: "He doesn't eat breakfast every morning.", note_ar: '(does + not، والفعل يرجع base: eat)' },
          { label: 'Yes/No', answer: 'Does he eat breakfast every morning?', note_ar: '(Does في البداية، والفعل base)' },
          { label: 'WH (When)', answer: 'When does he eat breakfast?', note_ar: '(When + does + he + base verb)' },
        ],
      },
    },
    {
      title_en: 'Present Continuous', title_ar: 'المضارع المستمر',
      uses_ar: [
        'حدث يجري الآن لحظة الكلام: She is cooking now.',
        "حدث مؤقت هذه الفترة: I'm reading a great book these days.",
        'ترتيبات مستقبلية مخطط لها: We are meeting them tomorrow.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + am/is/are + verb-ing', example: 'They are studying' },
        { form: 'Negative', rule: 'Subject + am/is/are + not + verb-ing', example: "They aren't studying" },
        { form: 'Yes/No', rule: 'Am/Is/Are + subject + verb-ing ?', example: 'Are they studying?' },
        { form: 'WH', rule: 'WH + am/is/are + subject + verb-ing ?', example: 'Why are they studying?' },
      ],
      rules_ar: [
        'الفعل المساعد: I → am ، he/she/it → is ، you/we/they → are.',
        'تهجئة الـ ing: أغلب الأفعال + ing (read→reading)؛ إذا انتهى بـ e صامتة نحذفها (make→making)؛ إذا كان (حرف ساكن + حرف علة + حرف ساكن) نضاعف الأخير (run→running, sit→sitting).',
      ],
      signal_words: 'now, right now, at the moment, currently, today, look!, listen!',
      worked: {
        seed: 'She is cooking dinner right now.',
        steps: [
          { label: 'Negative', answer: "She isn't cooking dinner right now.", note_ar: '(is + not)' },
          { label: 'Yes/No', answer: 'Is she cooking dinner right now?', note_ar: '(Is في البداية)' },
          { label: 'WH (What)', answer: 'What is she cooking right now?', note_ar: '(What + is + she + cooking)' },
        ],
      },
    },
    {
      title_en: 'Past Simple', title_ar: 'الماضي البسيط',
      uses_ar: [
        'حدث منتهٍ في وقت ماضٍ محدد: We watched a movie last night.',
        'سلسلة أحداث ماضية متتابعة: She woke up, made coffee, and left.',
        'عادات/حالات في الماضي: I lived in Riyadh for two years.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + past form (regular: +ed / irregular: صيغة خاصة)', example: 'We watched / She went' },
        { form: 'Negative', rule: 'Subject + did + not + base verb', example: "We didn't watch / She didn't go" },
        { form: 'Yes/No', rule: 'Did + subject + base verb ?', example: 'Did we watch? / Did she go?' },
        { form: 'WH', rule: 'WH + did + subject + base verb ?', example: 'What did we watch?' },
      ],
      rules_ar: [
        'الأفعال المنتظمة: + ed (watch→watched)؛ إذا انتهى بـ e نضيف d (like→liked)؛ ساكن + y ← ied (study→studied)؛ (ساكن-علة-ساكن) نضاعف الأخير (stop→stopped).',
        'الأفعال الشاذة لها صيغة ماضٍ خاصة (go→went, see→saw, buy→bought, write→wrote).',
        'مع did + not أو السؤال بـ Did، يعود الفعل الأساسي إلى base (بدون ed وبدون الصيغة الشاذة): ✔ We didn\'t watch ✘ didn\'t watched ؛ ✔ Did she go? ✘ Did she went?',
      ],
      signal_words: 'yesterday, last night/week, two days ago, in 2019, when I was young',
      worked: {
        seed: 'We watched a movie last night.',
        steps: [
          { label: 'Negative', answer: "We didn't watch a movie last night.", note_ar: '(did + not، والفعل base: watch)' },
          { label: 'Yes/No', answer: 'Did we watch a movie last night?', note_ar: '(Did في البداية، والفعل base)' },
          { label: 'WH (What)', answer: 'What did we watch last night?', note_ar: '(What + did + we + base verb)' },
        ],
      },
    },
    {
      title_en: 'Past Continuous', title_ar: 'الماضي المستمر',
      uses_ar: [
        "حدث كان مستمرًا في لحظة ماضية محددة: At 9 o'clock she was reading.",
        'حدث في الخلفية قاطعه حدث آخر (مع when/while): He was sleeping when the phone rang.',
        'حدثان متوازيان في الماضي (مع while): I was cooking while he was studying.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + was/were + verb-ing', example: 'She was reading' },
        { form: 'Negative', rule: 'Subject + was/were + not + verb-ing', example: "She wasn't reading" },
        { form: 'Yes/No', rule: 'Was/Were + subject + verb-ing ?', example: 'Was she reading?' },
        { form: 'WH', rule: 'WH + was/were + subject + verb-ing ?', example: 'What was she reading?' },
      ],
      rules_ar: [
        'الفعل المساعد: I/he/she/it → was ، you/we/they → were.',
        'نفس قواعد تهجئة الـ ing في المضارع المستمر.',
      ],
      signal_words: "at 8 o'clock, at that moment, while, when, all day yesterday",
      worked: {
        seed: "She was reading a book at 9 o'clock.",
        steps: [
          { label: 'Negative', answer: "She wasn't reading a book at 9 o'clock.", note_ar: '(was + not)' },
          { label: 'Yes/No', answer: "Was she reading a book at 9 o'clock?", note_ar: '(Was في البداية)' },
          { label: 'WH (What)', answer: "What was she reading at 9 o'clock?", note_ar: '(What + was + she + reading)' },
        ],
      },
    },
  ],
};

// ─── QUESTIONS (36 — from the appendix verbatim; seed shown as read-only context) ─
// Q shape consumed by StudentExercises.jsx: { id, question, correct_answer, accepted_answers,
// explanation } + our glue fields: context, context_form_ar, divider (item header).
const F = { neg: 'حوّل إلى النفي (Negative)', yn: 'حوّل إلى سؤال نعم/لا (Yes/No Question)', aff: 'حوّل إلى الإثبات (Affirmative)' };
const wh = (w) => `حوّل إلى سؤال بأداة الاستفهام (WH — ${w})`;
const GIVEN = { aff: 'الجملة المُعطاة (مُثبت)', yn: 'الجملة المُعطاة (سؤال نعم/لا)', neg: 'الجملة المُعطاة (منفي)' };

function item(no, tense_en, tense_ar, seed, seedForm, qs) {
  return qs.map(([label, accepted], i) => ({
    id: `q${(no - 1) * 3 + i + 1}`,
    divider: i === 0 ? `${no} · ${tense_ar} — ${tense_en}` : undefined,
    context: seed,
    context_form_ar: GIVEN[seedForm],
    question: label,
    correct_answer: accepted[0],
    accepted_answers: accepted,
  }));
}

const QUESTIONS = [
  // Present Simple
  ...item(1, 'Present Simple', 'المضارع البسيط', 'She teaches English at a university.', 'aff', [
    [F.neg, ["She doesn't teach English at a university.", 'She does not teach English at a university.']],
    [F.yn, ['Does she teach English at a university?']],
    [wh('Where'), ['Where does she teach English?', 'Where does she teach?']],
  ]),
  ...item(2, 'Present Simple', 'المضارع البسيط', 'Do they travel to Jeddah every summer?', 'yn', [
    [F.aff, ['They travel to Jeddah every summer.']],
    [F.neg, ["They don't travel to Jeddah every summer.", 'They do not travel to Jeddah every summer.']],
    [wh('When'), ['When do they travel to Jeddah?', 'When do they travel?']],
  ]),
  ...item(3, 'Present Simple', 'المضارع البسيط', "He doesn't drink coffee in the evening.", 'neg', [
    [F.aff, ['He drinks coffee in the evening.']],
    [F.yn, ['Does he drink coffee in the evening?']],
    [wh('Why'), ['Why does he drink coffee in the evening?', 'Why does he drink coffee?']],
  ]),
  // Present Continuous
  ...item(4, 'Present Continuous', 'المضارع المستمر', 'They are studying for the IELTS exam.', 'aff', [
    [F.neg, ["They aren't studying for the IELTS exam.", 'They are not studying for the IELTS exam.']],
    [F.yn, ['Are they studying for the IELTS exam?']],
    [wh('Why'), ['Why are they studying for the IELTS exam?', 'Why are they studying?']],
  ]),
  ...item(5, 'Present Continuous', 'المضارع المستمر', 'Is she cooking dinner right now?', 'yn', [
    [F.aff, ['She is cooking dinner right now.', "She's cooking dinner right now."]],
    [F.neg, ["She isn't cooking dinner right now.", 'She is not cooking dinner right now.', "She's not cooking dinner right now."]],
    [wh('What'), ['What is she cooking right now?', "What's she cooking right now?", 'What is she cooking?']],
  ]),
  ...item(6, 'Present Continuous', 'المضارع المستمر', "He isn't listening to the teacher.", 'neg', [
    [F.aff, ['He is listening to the teacher.', "He's listening to the teacher."]],
    [F.yn, ['Is he listening to the teacher?']],
    [wh('Why'), ["Why isn't he listening to the teacher?", 'Why is he not listening to the teacher?', "Why isn't he listening?"]],
  ]),
  // Past Simple
  ...item(7, 'Past Simple', 'الماضي البسيط', 'We watched a movie last night.', 'aff', [
    [F.neg, ["We didn't watch a movie last night.", 'We did not watch a movie last night.']],
    [F.yn, ['Did we watch a movie last night?']],
    [wh('What'), ['What did we watch last night?', 'What did we watch?']],
  ]),
  ...item(8, 'Past Simple', 'الماضي البسيط', 'Did she visit her family in Makkah?', 'yn', [
    [F.aff, ['She visited her family in Makkah.']],
    [F.neg, ["She didn't visit her family in Makkah.", 'She did not visit her family in Makkah.']],
    [wh('When'), ['When did she visit her family?', 'When did she visit her family in Makkah?']],
  ]),
  ...item(9, 'Past Simple', 'الماضي البسيط', "They didn't finish the project on time.", 'neg', [
    [F.aff, ['They finished the project on time.']],
    [F.yn, ['Did they finish the project on time?']],
    [wh('Why'), ["Why didn't they finish the project on time?", 'Why did they not finish the project on time?', "Why didn't they finish the project?"]],
  ]),
  // Past Continuous
  ...item(10, 'Past Continuous', 'الماضي المستمر', "She was reading a book at 9 o'clock.", 'aff', [
    [F.neg, ["She wasn't reading a book at 9 o'clock.", "She was not reading a book at 9 o'clock."]],
    [F.yn, ["Was she reading a book at 9 o'clock?"]],
    [wh('What'), ["What was she reading at 9 o'clock?", 'What was she reading?']],
  ]),
  ...item(11, 'Past Continuous', 'الماضي المستمر', 'Were they playing football in the rain?', 'yn', [
    [F.aff, ['They were playing football in the rain.']],
    [F.neg, ["They weren't playing football in the rain.", 'They were not playing football in the rain.']],
    [wh('Where'), ['Where were they playing football?', 'Where were they playing?']],
  ]),
  ...item(12, 'Past Continuous', 'الماضي المستمر', "He wasn't sleeping when the phone rang.", 'neg', [
    [F.aff, ['He was sleeping when the phone rang.']],
    [F.yn, ['Was he sleeping when the phone rang?']],
    [wh('What'), ['What was he doing when the phone rang?']],
  ]),
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  if (QUESTIONS.length !== 36) throw new Error(`expected 36 questions, built ${QUESTIONS.length}`);
  for (const q of QUESTIONS) {
    if (!q.accepted_answers.includes(q.correct_answer)) throw new Error(`${q.id}: correct not in accepted`);
  }

  // safety: assert the target student exists + is male + active
  const { data: stu, error: sErr } = await sb.from('students').select('id, gender, status, deleted_at').eq('id', DHAFER_ID).maybeSingle();
  if (sErr || !stu || stu.gender !== 'male' || stu.status !== 'active' || stu.deleted_at) {
    throw new Error(`target student assertion failed: ${sErr?.message || JSON.stringify(stu)}`);
  }

  // idempotency: skip if already seeded
  const { data: existing, error: exErr } = await sb.from('targeted_exercises')
    .select('id, status').eq('student_id', DHAFER_ID).eq('title', TITLE);
  if (exErr) throw exErr;
  if (existing && existing.length > 0) {
    console.log(`⏭️  already seeded (${existing.length} row(s), id=${existing[0].id}, status=${existing[0].status}) — nothing to do.`);
    return;
  }

  const { data: ins, error: iErr } = await sb.from('targeted_exercises').insert({
    student_id: DHAFER_ID,
    pattern_id: null,
    skill: 'grammar',
    title: TITLE,
    instructions: LEARN.intro_ar,
    difficulty: 'medium',
    status: 'pending',
    content: {
      type: 'rewrite',
      source: 'manual',              // manually-authored, individually-assigned
      check_mode: 'per_question',    // glue flag: per-question check UI in StudentExercises
      title_en: LEARN.title_en,
      learn: LEARN,
      questions: QUESTIONS,
    },
  }).select('id, student_id, skill, title, status');
  if (iErr) throw iErr;
  if (!ins || ins.length !== 1) throw new Error(`insert returned ${ins?.length ?? 0} rows`);
  console.log(`✅ task inserted: ${ins[0].id} → ${ins[0].title} (student ${ins[0].student_id}, ${QUESTIONS.length} questions)`);

  // verify count under the exact student filter the UI uses
  const { count } = await sb.from('targeted_exercises').select('id', { count: 'exact', head: true }).eq('student_id', DHAFER_ID);
  console.log(`📊 targeted_exercises rows for ظافر: ${count}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
