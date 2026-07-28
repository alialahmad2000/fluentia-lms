#!/usr/bin/env node
/**
 * Seeds مصعب العمري's «حرف الجر at» worksheet into targeted_exercises.
 *
 * Ali's note: "he has a problem with 'at'" — so this teaches first (content.learn,
 * rendered by LessonSection) and only then tests, instead of dropping him into a quiz.
 * Grading is rule-based on the client (validateAnswer) — no AI, so it can't fail or cost.
 * Every question is MCQ or a one-word blank on purpose: full-sentence rewrites get
 * marked wrong for harmless wording differences (see the ظافر worksheet incident).
 *
 * Idempotent: re-running replaces the row's content, keeping the same id.
 * Usage: node seed-mosab-at-worksheet.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'nmjexpuycmqcxuxljier';
const STUDENT_ID = '4fb98807-526d-4675-adb5-eb938b31b948'; // مصعب جمال العمري
const REPO = '/Users/dr.ali/projects/fluentia-lms';

function token() {
  const raw = fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8');
  return raw.match(/sbp_[A-Za-z0-9]+/)[0];
}
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) { console.error('HTTP', res.status, text); process.exit(1); }
  try { return JSON.parse(text); } catch { return text; }
}
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ── THE LESSON ───────────────────────────────────────────────────────────────
const learn = {
  highlight: 'at',
  intro_ar:
    'الفكرة الواحدة التي تفسّر كل استعمالات at تقريبًا: at تعني «نقطة» — نقطة في المكان، أو نقطة في الوقت، أو نقطة على مقياس. '
    + 'قارنها بـ in (داخل حيّز له حدود) و on (على سطح). إذا استحضرت صورة «النقطة» فلن تحتاج إلى حفظ عشرات القواعد.',
  intro_en: 'at = a point · in = inside a space · on = on a surface',
  blocks: [
    {
      type: 'contrast',
      title_ar: 'الأساس: at و in و on في المكان',
      title_en: 'The core contrast',
      body_ar: 'المكان نفسه قد يأخذ الثلاثة — والمعنى هو ما يتغيّر، لا القاعدة.',
      cols: [
        { k: 'at', label_ar: 'نقطة محدّدة', note_ar: 'تحدّد المكان كنقطة على الخريطة، دون اهتمام بداخله.',
          examples: [
            { en: 'I am waiting at the entrance.', ar: 'أنتظر عند المدخل.' },
            { en: 'He is at the warehouse now.', ar: 'هو في المستودع الآن (كنقطة/موقع).' },
          ] },
        { k: 'in', label_ar: 'داخل حيّز', note_ar: 'تهتم بالداخل — غرفة، مبنى، مدينة، بلد.',
          examples: [
            { en: 'The manager is in the meeting room.', ar: 'المدير داخل قاعة الاجتماع.' },
            { en: 'Our supplier is in Jeddah.', ar: 'مورّدنا في جدة.' },
          ] },
        { k: 'on', label_ar: 'على سطح', note_ar: 'ملامسة سطح، أو خط، أو طابق.',
          examples: [
            { en: 'The invoice is on my desk.', ar: 'الفاتورة على مكتبي.' },
            { en: 'Our office is on the third floor.', ar: 'مكتبنا في الطابق الثالث.' },
          ] },
      ],
    },
    {
      type: 'rule',
      title_ar: 'at + المكان بوصفه «وظيفة» لا مبنى',
      title_en: 'at work · at school · at home',
      body_ar:
        'حين يهمّك النشاط الذي يُمارَس في المكان — لا المبنى نفسه — استخدم at. هذه من أكثر المواضع التي يخطئ فيها '
        + 'المتحدث بالعربية، لأن العربية تقول «في العمل» فيترجمها إلى in work، وهي خاطئة.',
      examples: [
        { en: 'I am at work until five.', ar: 'أنا في العمل حتى الخامسة.' },
        { en: 'She is at university this year.', ar: 'هي في الجامعة هذه السنة (تدرس).' },
        { en: 'He is at a conference in Riyadh.', ar: 'هو في مؤتمر بالرياض.' },
        { en: 'They are at lunch right now.', ar: 'هم على الغداء الآن.' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'at + الوقت المحدّد كنقطة',
      title_en: 'at 8 o’clock · at noon · at midnight',
      body_ar:
        'الساعة نقطة على خط الزمن، فتأخذ at. أمّا المدّة الطويلة (شهر، فصل، سنة، جزء من اليوم) فتأخذ in، '
        + 'واليوم أو التاريخ يأخذ on.',
      examples: [
        { en: 'The shift starts at 7:30.', ar: 'تبدأ الوردية في الساعة ٧:٣٠.' },
        { en: 'We close at midnight.', ar: 'نغلق عند منتصف الليل.' },
        { en: 'in the morning · in July · in 2026', ar: 'المدد الطويلة تأخذ in.' },
        { en: 'on Monday · on 3 May', ar: 'الأيام والتواريخ تأخذ on.' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'at + السعر والسرعة والعمر',
      title_en: 'at a price · at a speed · at an age',
      body_ar: 'كل مقياس له «نقطة» على تدرّج يأخذ at.',
      examples: [
        { en: 'We sell it at 40 riyals per box.', ar: 'نبيعه بأربعين ريالًا للصندوق.' },
        { en: 'The trucks travel at 90 km/h.', ar: 'تسير الشاحنات بسرعة ٩٠ كم/س.' },
        { en: 'He started his company at the age of 24.', ar: 'أسّس شركته في سنّ الرابعة والعشرين.' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'أفعال وصفات تلزمها at',
      title_en: 'good at · look at · arrive at',
      body_ar:
        'بعض الأفعال والصفات ترتبط بـ at ارتباطًا ثابتًا؛ احفظها مع at كوحدة واحدة، لا كفعل + حرف منفصلين. '
        + 'وانتبه: arrive at لمكان صغير (مكتب، مطار، محطة)، و arrive in لمدينة أو بلد.',
      examples: [
        { en: 'He is very good at negotiation.', ar: 'هو بارع جدًّا في التفاوض.' },
        { en: 'Please look at the report before the meeting.', ar: 'انظر إلى التقرير قبل الاجتماع.' },
        { en: 'We arrived at the office early.', ar: 'وصلنا إلى المكتب مبكّرين.' },
        { en: 'We arrived in Dammam on Sunday.', ar: 'وصلنا إلى الدمّام يوم الأحد (المدينة تأخذ in).' },
      ],
    },
    {
      type: 'chunks',
      title_ar: 'عبارات ثابتة — احفظها كما هي',
      title_en: 'Fixed expressions with at',
      body_ar: 'هذه لا تُحلَّل بالقاعدة؛ تُحفظ كقطعة واحدة وتُستعمل مباشرة في كلامك.',
      items: [
        { en: 'at the moment', ar: 'في الوقت الحالي' },
        { en: 'at least', ar: 'على الأقل' },
        { en: 'at first', ar: 'في البداية' },
        { en: 'at last', ar: 'أخيرًا' },
        { en: 'at the same time', ar: 'في الوقت نفسه' },
        { en: 'at the end of the month', ar: 'في نهاية الشهر' },
        { en: 'at short notice', ar: 'بمهلة قصيرة' },
        { en: 'at your convenience', ar: 'في الوقت الذي يناسبك' },
      ],
    },
    {
      type: 'mistakes',
      title_ar: 'أخطاء يقع فيها المتحدث بالعربية',
      title_en: 'The traps',
      body_ar: 'كل خطأ هنا سببه الترجمة الحرفية من العربية. اقرأ الصواب بصوتٍ مسموع مرّتين.',
      items: [
        { wrong: 'I am in work now.', right: 'I am at work now.', note_ar: '«في العمل» تُترجَم at work — لأن المقصود النشاط لا المبنى.' },
        { wrong: 'We arrived to the office.', right: 'We arrived at the office.', note_ar: 'الفعل arrive لا يأخذ to أبدًا؛ بل at للمكان الصغير و in للمدينة.' },
        { wrong: 'I am good in English.', right: 'I am good at English.', note_ar: 'الصفة good تلزمها at حين نتحدث عن مهارة.' },
        { wrong: 'In the moment I am busy.', right: 'At the moment I am busy.', note_ar: 'العبارة الثابتة هي at the moment.' },
        { wrong: 'The meeting is in 9 o’clock.', right: 'The meeting is at 9 o’clock.', note_ar: 'الساعة نقطة زمنية، فنستعمل at.' },
        { wrong: 'He is looking the screen.', right: 'He is looking at the screen.', note_ar: 'look وحده لا يكفي؛ look at هي الوحدة الصحيحة.' },
      ],
    },
  ],
  closing_ar:
    'قبل أن تبدأ الأسئلة: اسأل نفسك في كل جملة «هل هذه نقطة؟». إن كانت نقطةً في مكان أو زمان أو على مقياس فالجواب at غالبًا.',
};

// ── THE QUESTIONS ────────────────────────────────────────────────────────────
const P = ['at', 'in', 'on'];
const mcq = (id, question, correct, explanation, options = P) => ({
  id, question, options, correct_answer: correct, accepted_answers: [correct], explanation,
});
const blank = (id, question, correct, explanation, accepted) => ({
  id, question, correct_answer: correct, accepted_answers: accepted || [correct], explanation,
});

const questions = [
  // A — place
  mcq('a1', 'Ali is waiting ___ the main entrance.', 'at', 'المدخل نقطة محدّدة نلتقي عندها، فنستعمل at.'),
  mcq('a2', 'The documents are ___ the top drawer.', 'in', 'داخل الدرج، أي داخل حيّز مغلق، فنستعمل in.'),
  mcq('a3', 'Please leave the box ___ the counter.', 'on', 'فوق سطح الطاولة، فنستعمل on.'),
  mcq('a4', 'Our main supplier is ___ Riyadh.', 'in', 'المدينة حيّز واسع، فنستعمل in.'),
  mcq('a5', 'I will meet the driver ___ the warehouse gate.', 'at', 'البوابة نقطة محدّدة، فنستعمل at.'),
  mcq('a6', 'The new logo is ___ the packaging.', 'on', 'مطبوع على سطح العبوة، فنستعمل on.'),
  mcq('a7', 'She is ___ the meeting room with the client.', 'in', 'داخل الغرفة، فنستعمل in.'),
  mcq('a8', 'Our office is ___ the fifth floor.', 'on', 'الطوابق تأخذ on دائمًا.'),

  // B — activity places
  mcq('b1', 'Sorry, I cannot answer now — I am ___ work.', 'at', 'at work تعني «في العمل» بمعنى النشاط، لا المبنى.'),
  mcq('b2', 'My brother is ___ university, studying accounting.', 'at', 'at university = ملتحق بالدراسة.'),
  mcq('b3', 'The whole team is ___ a conference this week.', 'at', 'at a conference — الحضور في فعالية يأخذ at.'),
  mcq('b4', 'He is not here; he is ___ home today.', 'at', 'at home عبارة ثابتة — ولا نقول in home.'),

  // C — time
  mcq('c1', 'The delivery arrives ___ 6 o’clock.', 'at', 'الساعة نقطة زمنية، فنستعمل at.'),
  mcq('c2', 'We do the stock count ___ the morning.', 'in', 'أجزاء اليوم الطويلة تأخذ in.'),
  mcq('c3', 'The audit is ___ Thursday.', 'on', 'أيام الأسبوع تأخذ on.'),
  mcq('c4', 'The warehouse closes ___ midnight.', 'at', 'منتصف الليل نقطة محدّدة، فنستعمل at.'),
  mcq('c5', 'We launched the product ___ 2025.', 'in', 'السنوات تأخذ in.'),
  mcq('c6', 'The shop is busy ___ the weekend.', 'at', 'في الإنجليزية البريطانية: at the weekend.'),

  // D — measure
  mcq('d1', 'We buy the boxes ___ 25 riyals each.', 'at', 'السعر نقطة على مقياس، فنستعمل at.'),
  mcq('d2', 'The machine works ___ high speed.', 'at', 'السرعة مقياس، فنستعمل at.'),
  mcq('d3', 'He became a manager ___ the age of thirty.', 'at', 'at the age of ... عبارة ثابتة.'),

  // E — verbs + adjectives
  mcq('e1', 'Please look ___ these numbers before you sign.', 'at', 'look at وحدة ثابتة؛ look وحده لا يكفي.'),
  mcq('e2', 'She is very good ___ solving problems.', 'at', 'good at + مهارة.'),
  mcq('e3', 'We arrived ___ the airport two hours early.', 'at', 'arrive at لمكان محدّد — ولا نقول arrive to أبدًا.'),
  mcq('e4', 'They arrived ___ Jeddah on Monday.', 'in', 'arrive in للمدن والبلدان.'),
  mcq('e5', 'He is bad ___ remembering names.', 'at', 'bad at مثل good at تمامًا.'),

  // F — fixed expressions (one-word blank: the answer is always "at")
  blank('f1', 'Complete with ONE word — ___ the moment, we have no stock. (في الوقت الحالي)', 'at', 'العبارة الثابتة: at the moment.'),
  blank('f2', 'Complete with ONE word — We need ___ least three suppliers. (على الأقل)', 'at', 'العبارة الثابتة: at least.'),
  blank('f3', 'Complete with ONE word — ___ first, the plan looked difficult. (في البداية)', 'at', 'العبارة الثابتة: at first.'),
  blank('f4', 'Complete with ONE word — The report is due ___ the end of the month. (في نهاية الشهر)', 'at', 'العبارة الثابتة: at the end of ...'),

  // G — spot the correct sentence
  {
    id: 'g1',
    question: 'Choose the correct sentence:',
    options: ['I am in work until 4 p.m.', 'I am at work until 4 p.m.'],
    correct_answer: 'I am at work until 4 p.m.',
    accepted_answers: ['I am at work until 4 p.m.'],
    explanation: '«في العمل» = at work، وليست in work.',
  },
  {
    id: 'g2',
    question: 'Choose the correct sentence:',
    options: ['We arrived to the office at 8.', 'We arrived at the office at 8.'],
    correct_answer: 'We arrived at the office at 8.',
    accepted_answers: ['We arrived at the office at 8.'],
    explanation: 'arrive لا تأخذ to مطلقًا.',
  },
  {
    id: 'g3',
    question: 'Choose the correct sentence:',
    options: ['He is good at planning.', 'He is good in planning.'],
    correct_answer: 'He is good at planning.',
    accepted_answers: ['He is good at planning.'],
    explanation: 'good at + مهارة.',
  },
  {
    id: 'g4',
    question: 'Choose the correct sentence:',
    options: ['The meeting starts in 10 o’clock.', 'The meeting starts at 10 o’clock.'],
    correct_answer: 'The meeting starts at 10 o’clock.',
    accepted_answers: ['The meeting starts at 10 o’clock.'],
    explanation: 'الساعة نقطة زمنية، فنستعمل at.',
  },
];

const content = {
  render: 'runner',
  type: 'preposition_focus',
  variant: 'at',
  title_en: 'The preposition “at” — place, time, measure & fixed phrases',
  focus: 'at',
  learn,
  questions,
};

(async () => {
  // sanity: every MCQ's correct answer must actually be one of its options,
  // otherwise the student can never score it.
  for (const q of questions) {
    if (q.options && !q.options.includes(q.correct_answer)) throw new Error(`bad option set: ${q.id}`);
    if (!q.explanation) throw new Error(`missing explanation: ${q.id}`);
  }
  const ids = new Set(questions.map(q => q.id));
  if (ids.size !== questions.length) throw new Error('duplicate question id');
  console.log(`✅ ${questions.length} questions validated · ${learn.blocks.length} lesson blocks`);

  const existing = await sql(
    `select id from targeted_exercises where student_id='${STUDENT_ID}' and content->>'variant'='at' limit 1;`);

  if (Array.isArray(existing) && existing.length) {
    await sql(`update targeted_exercises set
        title=${lit('حرف الجر at — المكان والزمان والعبارات الثابتة')},
        instructions=${lit('اقرأ الشرح أولًا، ثم أجب عن الأسئلة. التصحيح فوري بعد التسليم، ومع كل سؤال سبب الإجابة.')},
        skill='grammar', difficulty='medium',
        content=${lit(JSON.stringify(content))}
      where id='${existing[0].id}';`);
    console.log('♻️  updated existing worksheet', existing[0].id);
  } else {
    const r = await sql(`insert into targeted_exercises
      (student_id, skill, title, instructions, difficulty, status, content)
      values ('${STUDENT_ID}','grammar',
        ${lit('حرف الجر at — المكان والزمان والعبارات الثابتة')},
        ${lit('اقرأ الشرح أولًا، ثم أجب عن الأسئلة. التصحيح فوري بعد التسليم، ومع كل سؤال سبب الإجابة.')},
        'medium','pending', ${lit(JSON.stringify(content))})
      returning id;`);
    console.log('✅ inserted worksheet', r[0].id);
  }

  const check = await sql(`select id, title, status, jsonb_array_length(content->'questions') qs,
      jsonb_array_length(content->'learn'->'blocks') blocks
    from targeted_exercises where student_id='${STUDENT_ID}';`);
  console.log(JSON.stringify(check, null, 2));
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
