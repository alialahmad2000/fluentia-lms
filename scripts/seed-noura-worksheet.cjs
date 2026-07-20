// scripts/seed-noura-worksheet.cjs
// Seeds ONE manually-authored, individually-assigned grammar task for نورة خالد الدوسري:
//   «الأزمنة الأربعة — تحويل الجُمل» (The Four Tenses — Sentence Transformation), A2,
//   FULLY themed on HER field (wildlife / environment / ecotourism / the National Center for Wildlife).
//   Learn section (4 tenses, formation tables, rules, worked examples) + 36 auto-graded
//   transformation questions with accepted_answers arrays (rule-based local grading — NO AI).
// Surface: targeted_exercises → /student/exercises → «تمارين مخصّصة» nav item.
// Feminine 2nd-person Arabic throughout (نورة = female). Idempotent on the dedupe title.
// Mirrors scripts/seed-dhafer-four-tenses.cjs.
// Run:  node scripts/seed-noura-worksheet.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ missing env'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const NOURA_ID = 'f0be39e0-062d-47ab-864e-1a59704d75d7'; // profiles.id == students.id
const TITLE = 'الأزمنة الأربعة — تحويل الجُمل';

// ─── LEARN (feminine address; worked examples themed to her field) ──────────
const LEARN = {
  title_en: 'The Four Tenses — Sentence Transformation',
  intro_ar: 'هذا التمرين مصمّم على مجالكِ: الحياة الفطرية والبيئة والسياحة البيئية. في كل صف جملة واحدة مُعطاة لكِ — اقرئيها جيدًا، ثم حوّليها إلى الصيغ الثلاث الأخرى. قبل أن تبدئي، اقرئي الشرح والأمثلة المحلولة بالأسفل.',
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
        'العادات والروتين: I check the reserve every morning.',
        'الحقائق العامة: The oryx lives in the desert. / The sun rises in the east.',
        'المواعيد الثابتة (جداول): The tour starts at 6.',
        'المشاعر والحالات (stative verbs): She loves nature.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + base verb (+ s/es مع he/she/it)', example: 'She protects / They watch' },
        { form: 'Negative', rule: 'Subject + do/does + not + base verb', example: "She doesn't protect / They don't watch" },
        { form: 'Yes/No', rule: 'Do/Does + subject + base verb ?', example: 'Does she protect? / Do they watch?' },
        { form: 'WH', rule: 'WH + do/does + subject + base verb ?', example: 'Where does she work?' },
      ],
      rules_ar: [
        'مع he/she/it نضيف s (watch→watches)، و es بعد الحروف s/sh/ch/x/o (go→goes)، وإذا انتهى الفعل بحرف ساكن + y نحوّلها إلى ies (study→studies).',
        'عند استخدام do/does + not أو السؤال بـ Do/Does، يعود الفعل الأساسي إلى صيغته المجردة (base) بدون s: ✔ She doesn\'t protect ✘ doesn\'t protects.',
      ],
      signal_words: 'every day, always, usually, often, sometimes, never, in the morning, on Mondays',
      worked: {
        seed: 'The oryx lives in the desert.',
        steps: [
          { label: 'Negative', answer: "The oryx doesn't live in the desert.", note_ar: '(does + not، والفعل يرجع base: live)' },
          { label: 'Yes/No', answer: 'Does the oryx live in the desert?', note_ar: '(Does في البداية، والفعل base)' },
          { label: 'WH (Where)', answer: 'Where does the oryx live?', note_ar: '(Where + does + the oryx + base verb)' },
        ],
      },
    },
    {
      title_en: 'Present Continuous', title_ar: 'المضارع المستمر',
      uses_ar: [
        'حدث يجري الآن لحظة الكلام: The team is counting the animals now.',
        "حدث مؤقت هذه الفترة: The birds are migrating these days.",
        'ترتيبات مستقبلية مخطط لها: We are meeting the visitors tomorrow.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + am/is/are + verb-ing', example: 'They are watching' },
        { form: 'Negative', rule: 'Subject + am/is/are + not + verb-ing', example: "They aren't watching" },
        { form: 'Yes/No', rule: 'Am/Is/Are + subject + verb-ing ?', example: 'Are they watching?' },
        { form: 'WH', rule: 'WH + am/is/are + subject + verb-ing ?', example: 'What are they watching?' },
      ],
      rules_ar: [
        'الفعل المساعد: I → am ، he/she/it → is ، you/we/they → are.',
        'تهجئة الـ ing: أغلب الأفعال + ing (watch→watching)؛ إذا انتهى بـ e صامتة نحذفها (make→making)؛ إذا كان (حرف ساكن + حرف علة + حرف ساكن) نضاعف الأخير (run→running, sit→sitting).',
      ],
      signal_words: 'now, right now, at the moment, currently, today, look!, listen!',
      worked: {
        seed: 'The ranger is watching the birds now.',
        steps: [
          { label: 'Negative', answer: "The ranger isn't watching the birds now.", note_ar: '(is + not)' },
          { label: 'Yes/No', answer: 'Is the ranger watching the birds now?', note_ar: '(Is في البداية)' },
          { label: 'WH (What)', answer: 'What is the ranger watching now?', note_ar: '(What + is + the ranger + watching)' },
        ],
      },
    },
    {
      title_en: 'Past Simple', title_ar: 'الماضي البسيط',
      uses_ar: [
        'حدث منتهٍ في وقت ماضٍ محدد: We released three oryx last week.',
        'سلسلة أحداث ماضية متتابعة: She woke up, checked the traps, and wrote the report.',
        'عادات/حالات في الماضي: I worked in the reserve for two years.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + past form (regular: +ed / irregular: صيغة خاصة)', example: 'We watched / She saw' },
        { form: 'Negative', rule: 'Subject + did + not + base verb', example: "We didn't watch / She didn't see" },
        { form: 'Yes/No', rule: 'Did + subject + base verb ?', example: 'Did we watch? / Did she see?' },
        { form: 'WH', rule: 'WH + did + subject + base verb ?', example: 'What did we see?' },
      ],
      rules_ar: [
        'الأفعال المنتظمة: + ed (watch→watched)؛ إذا انتهى بـ e نضيف d (release→released)؛ ساكن + y ← ied (study→studied)؛ (ساكن-علة-ساكن) نضاعف الأخير (stop→stopped).',
        'الأفعال الشاذة لها صيغة ماضٍ خاصة (see→saw, find→found, write→wrote, take→took).',
        'مع did + not أو السؤال بـ Did، يعود الفعل الأساسي إلى base (بدون ed وبدون الصيغة الشاذة): ✔ We didn\'t release ✘ didn\'t released ؛ ✔ Did she see? ✘ Did she saw?',
      ],
      signal_words: 'yesterday, last night/week, two days ago, in 2019, when I was young',
      worked: {
        seed: 'We saw a gazelle yesterday.',
        steps: [
          { label: 'Negative', answer: "We didn't see a gazelle yesterday.", note_ar: '(did + not، والفعل base: see)' },
          { label: 'Yes/No', answer: 'Did we see a gazelle yesterday?', note_ar: '(Did في البداية، والفعل base)' },
          { label: 'WH (What)', answer: 'What did we see yesterday?', note_ar: '(What + did + we + base verb)' },
        ],
      },
    },
    {
      title_en: 'Past Continuous', title_ar: 'الماضي المستمر',
      uses_ar: [
        "حدث كان مستمرًا في لحظة ماضية محددة: At noon she was recording the data.",
        'حدث في الخلفية قاطعه حدث آخر (مع when/while): He was checking the trap when it started to rain.',
        'حدثان متوازيان في الماضي (مع while): I was counting the birds while he was writing notes.',
      ],
      formation: [
        { form: 'Affirmative', rule: 'Subject + was/were + verb-ing', example: 'She was recording' },
        { form: 'Negative', rule: 'Subject + was/were + not + verb-ing', example: "She wasn't recording" },
        { form: 'Yes/No', rule: 'Was/Were + subject + verb-ing ?', example: 'Was she recording?' },
        { form: 'WH', rule: 'WH + was/were + subject + verb-ing ?', example: 'What was she recording?' },
      ],
      rules_ar: [
        'الفعل المساعد: I/he/she/it → was ، you/we/they → were.',
        'نفس قواعد تهجئة الـ ing في المضارع المستمر.',
      ],
      signal_words: "at noon, at that moment, while, when, all day yesterday",
      worked: {
        seed: 'She was recording the data at noon.',
        steps: [
          { label: 'Negative', answer: "She wasn't recording the data at noon.", note_ar: '(was + not)' },
          { label: 'Yes/No', answer: 'Was she recording the data at noon?', note_ar: '(Was في البداية)' },
          { label: 'WH (What)', answer: 'What was she recording at noon?', note_ar: '(What + was + she + recording)' },
        ],
      },
    },
  ],
};

// ─── QUESTIONS (36 — all themed to wildlife/environment/ecotourism) ─────────
const F = { neg: 'حوّلي إلى النفي (Negative)', yn: 'حوّلي إلى سؤال نعم/لا (Yes/No Question)', aff: 'حوّلي إلى الإثبات (Affirmative)' };
const wh = (w) => `حوّلي إلى سؤال بأداة الاستفهام (WH — ${w})`;
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
  // ── Present Simple ──
  ...item(1, 'Present Simple', 'المضارع البسيط', 'She works at a wildlife reserve.', 'aff', [
    [F.neg, ["She doesn't work at a wildlife reserve.", 'She does not work at a wildlife reserve.']],
    [F.yn, ['Does she work at a wildlife reserve?']],
    [wh('Where'), ['Where does she work?']],
  ]),
  ...item(2, 'Present Simple', 'المضارع البسيط', 'Do the rangers check the reserve every morning?', 'yn', [
    [F.aff, ['The rangers check the reserve every morning.']],
    [F.neg, ["The rangers don't check the reserve every morning.", 'The rangers do not check the reserve every morning.']],
    [wh('When'), ['When do the rangers check the reserve?']],
  ]),
  ...item(3, 'Present Simple', 'المضارع البسيط', "The visitors don't feed the animals.", 'neg', [
    [F.aff, ['The visitors feed the animals.']],
    [F.yn, ['Do the visitors feed the animals?']],
    [wh('Why'), ['Why do the visitors feed the animals?']],
  ]),
  // ── Present Continuous ──
  ...item(4, 'Present Continuous', 'المضارع المستمر', 'The team is counting the oryx now.', 'aff', [
    [F.neg, ["The team isn't counting the oryx now.", 'The team is not counting the oryx now.']],
    [F.yn, ['Is the team counting the oryx now?']],
    [wh('What'), ['What is the team counting now?', 'What is the team counting?']],
  ]),
  ...item(5, 'Present Continuous', 'المضارع المستمر', 'Is the guide leading a tour right now?', 'yn', [
    [F.aff, ['The guide is leading a tour right now.', "The guide's leading a tour right now."]],
    [F.neg, ["The guide isn't leading a tour right now.", 'The guide is not leading a tour right now.', "The guide's not leading a tour right now."]],
    [wh('Who'), ['Who is leading a tour right now?', 'Who is leading a tour?']],
  ]),
  ...item(6, 'Present Continuous', 'المضارع المستمر', "The birds aren't migrating this week.", 'neg', [
    [F.aff, ['The birds are migrating this week.']],
    [F.yn, ['Are the birds migrating this week?']],
    [wh('When'), ['When are the birds migrating?']],
  ]),
  // ── Past Simple ──
  ...item(7, 'Past Simple', 'الماضي البسيط', 'We released three oryx into the desert last week.', 'aff', [
    [F.neg, ["We didn't release three oryx into the desert last week.", 'We did not release three oryx into the desert last week.']],
    [F.yn, ['Did we release three oryx into the desert last week?']],
    [wh('What'), ['What did we release into the desert last week?', 'What did we release?']],
  ]),
  ...item(8, 'Past Simple', 'الماضي البسيط', 'Did the visitors see the falcon yesterday?', 'yn', [
    [F.aff, ['The visitors saw the falcon yesterday.']],
    [F.neg, ["The visitors didn't see the falcon yesterday.", 'The visitors did not see the falcon yesterday.']],
    [wh('When'), ['When did the visitors see the falcon?']],
  ]),
  ...item(9, 'Past Simple', 'الماضي البسيط', "The rangers didn't find any tracks in the morning.", 'neg', [
    [F.aff, ['The rangers found some tracks in the morning.', 'The rangers found tracks in the morning.']],
    [F.yn, ['Did the rangers find any tracks in the morning?', 'Did the rangers find tracks in the morning?']],
    [wh('What'), ['What did the rangers find in the morning?', 'What did the rangers find?']],
  ]),
  // ── Past Continuous ──
  ...item(10, 'Past Continuous', 'الماضي المستمر', 'She was recording the animal\'s behaviour at noon.', 'aff', [
    [F.neg, ["She wasn't recording the animal's behaviour at noon.", "She was not recording the animal's behaviour at noon."]],
    [F.yn, ["Was she recording the animal's behaviour at noon?"]],
    [wh('What'), ['What was she recording at noon?', 'What was she recording?']],
  ]),
  ...item(11, 'Past Continuous', 'الماضي المستمر', 'Were the tourists watching the gazelles at sunset?', 'yn', [
    [F.aff, ['The tourists were watching the gazelles at sunset.']],
    [F.neg, ["The tourists weren't watching the gazelles at sunset.", 'The tourists were not watching the gazelles at sunset.']],
    [wh('What'), ['What were the tourists watching at sunset?', 'What were the tourists watching?']],
  ]),
  ...item(12, 'Past Continuous', 'الماضي المستمر', "He wasn't checking the camera trap at nine.", 'neg', [
    [F.aff, ['He was checking the camera trap at nine.']],
    [F.yn, ['Was he checking the camera trap at nine?']],
    [wh('What'), ['What was he checking at nine?', 'What was he checking?']],
  ]),
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  if (QUESTIONS.length !== 36) throw new Error(`expected 36 questions, built ${QUESTIONS.length}`);
  for (const q of QUESTIONS) {
    if (!q.accepted_answers.includes(q.correct_answer)) throw new Error(`${q.id}: correct not in accepted`);
  }

  // safety: assert the target student exists + is female + active
  const { data: stu, error: sErr } = await sb.from('students').select('id, gender, status, deleted_at').eq('id', NOURA_ID).maybeSingle();
  if (sErr || !stu || stu.gender !== 'female' || stu.status !== 'active' || stu.deleted_at) {
    throw new Error(`target student assertion failed: ${sErr?.message || JSON.stringify(stu)}`);
  }

  // idempotency: skip if already seeded
  const { data: existing, error: exErr } = await sb.from('targeted_exercises')
    .select('id, status').eq('student_id', NOURA_ID).eq('title', TITLE);
  if (exErr) throw exErr;
  if (existing && existing.length > 0) {
    console.log(`⏭️  already seeded (${existing.length} row(s), id=${existing[0].id}, status=${existing[0].status}) — nothing to do.`);
    return;
  }

  const { data: ins, error: iErr } = await sb.from('targeted_exercises').insert({
    student_id: NOURA_ID,
    pattern_id: null,
    skill: 'grammar',
    title: TITLE,
    instructions: LEARN.intro_ar,
    difficulty: 'medium',
    status: 'pending',
    content: {
      type: 'rewrite',
      source: 'manual',
      check_mode: 'per_question',
      title_en: LEARN.title_en,
      learn: LEARN,
      questions: QUESTIONS,
    },
  }).select('id, student_id, skill, title, status');
  if (iErr) throw iErr;
  if (!ins || ins.length !== 1) throw new Error(`insert returned ${ins?.length ?? 0} rows`);
  console.log(`✅ task inserted: ${ins[0].id} → ${ins[0].title} (student ${ins[0].student_id}, ${QUESTIONS.length} questions)`);

  const { count } = await sb.from('targeted_exercises').select('id', { count: 'exact', head: true }).eq('student_id', NOURA_ID);
  console.log(`📊 targeted_exercises rows for نورة: ${count}`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
