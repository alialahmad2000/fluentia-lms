#!/usr/bin/env node
/**
 * Seeds أنوار صبيح's «العائلات الأربع للصفات» worksheet into targeted_exercises.
 *
 * Source: ~/Downloads/Fluentia-Adjectives-Worksheet.pdf (the printed Grammar Lab sheet,
 * "The Architecture of Adjectives"). Pages 2–6 become content.learn (rendered by
 * LessonSection above the questions); pages 7–9 become the 54 questions; page 10's
 * answer key is the source of truth for every correct_answer.
 *
 * She is FEMALE → every Arabic 2nd-person string here is feminine (اقرئي/صنّفي/حوّلي).
 * Grading is rule-based on the client (validateAnswer) — no AI, so it cannot fail or cost.
 * Every question is MCQ or a ONE-WORD blank on purpose: full-sentence rewrites get marked
 * wrong over harmless wording differences (the ظافر worksheet incident). The only
 * free-writing items are Ex 6, whose own answer key says "Answers vary" — those use the
 * validator's "(sample answer)" escape hatch, which accepts any substantive attempt.
 *
 * Idempotent: re-running replaces the row's content, keeping the same id.
 * Usage: node scripts/seed-anwar-adjectives-worksheet.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'nmjexpuycmqcxuxljier';
const STUDENT_ID = '9ce89b88-0f0b-4df3-a62a-5c8b966855a8'; // أنوار عوض صبيح
const REPO = '/Users/dr.ali/projects/fluentia-lms';
const VARIANT = 'adjective-families';

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

// ── THE LESSON (pages 2–6 of the sheet) ──────────────────────────────────────
const learn = {
  intro_ar:
    'نعم، يمكن تصنيف الصفات. أوضح خريطة للمتعلّمة هي التصنيف حسب شكل الكلمة — أي كيف بُنيت. '
    + 'كل صفة إنجليزية تنتمي إلى إحدى أربع عائلات، وحين تعرفين العائلة تصير القاعدة (بما فيها ing و ed) '
    + 'واضحة تمامًا بدلًا من الحفظ العشوائي.',
  intro_en: 'Base · Derived · Participial (–ing / –ed) · Compound',
  blocks: [
    {
      type: 'contrast',
      title_ar: 'الصورة الكبيرة — العائلات الأربع',
      title_en: 'One question, one map',
      body_ar: 'اقرئي هذه الخريطة مرّة واحدة بتمعّن، فكل ما يأتي بعدها تفصيل لها.',
      cols: [
        {
          k: 'Base', label_ar: 'العائلة الأولى — الصفات الأصلية',
          note_ar: 'كلمات أصلية بسيطة غير مشتقّة من شيء آخر، تُحفظ كما هي.',
          examples: [{ en: 'happy · tall · good', ar: 'سعيدة · طويلة · جيّدة' }],
        },
        {
          k: 'Derived', label_ar: 'العائلة الثانية — الصفات المشتقّة',
          note_ar: 'كلمة أساس + لاحقة تحوّلها إلى صفة.',
          examples: [
            { en: 'help → helpful', ar: 'مساعدة ← مفيد' },
            { en: 'enjoy → enjoyable', ar: 'يستمتع ← مُمتِع' },
          ],
        },
        {
          k: 'Participial', label_ar: 'العائلة الثالثة — صفات ing و ed',
          note_ar: 'تأتي من أفعال تصف شعورًا، وتنتهي بـ ing أو ed. هنا يقع أكثر الخطأ.',
          examples: [{ en: 'bore → boring / bored', ar: 'يُملّ ← مُمِلّ / يشعر بالملل' }],
        },
        {
          k: 'Compound', label_ar: 'العائلة الرابعة — الصفات المركّبة',
          note_ar: 'كلمتان أو أكثر تتّحدان، غالبًا بشرطة.',
          examples: [{ en: 'well-known · ten-year-old', ar: 'معروف · ابن عشر سنوات' }],
        },
      ],
    },
    {
      type: 'rule',
      title_ar: 'العائلة الأولى — الصفات الأصلية',
      title_en: 'Base (simple) adjectives',
      body_ar:
        'كلمات أصلية غير مشتقّة من غيرها؛ تُحفظ كما هي. ومعظم صفات الحياة اليومية القصيرة تنتمي لهذه العائلة، '
        + 'ولذلك لا تحتاجين إلى قاعدة معها — تحتاجين إلى ألفة بها فقط.',
      examples: [
        { en: 'happy · sad · big · small · tall · short', ar: 'سعيدة · حزينة · كبيرة · صغيرة · طويلة · قصيرة' },
        { en: 'good · bad · hot · cold · fast · slow', ar: 'جيّدة · سيّئة · حارّة · باردة · سريعة · بطيئة' },
        { en: 'rich · poor · young · old · clean · easy', ar: 'غنيّة · فقيرة · صغيرة السنّ · كبيرة السنّ · نظيفة · سهلة' },
        { en: 'hard · kind', ar: 'صعبة · لطيفة' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'العائلة الثانية — الصفات المشتقّة',
      title_en: 'Derived adjectives · base + suffix',
      body_ar:
        'تُبنى بإضافة لاحقة إلى اسم أو فعل، واللاحقة هي العلامة التي حوّلت الكلمة إلى صفة. '
        + 'اختبار سريع: إذا نزعتِ اللاحقة وبقيت كلمة حقيقية، فالصفة مشتقّة — مثل care-ful، وكلمة care موجودة.',
      examples: [
        { en: '-ful  (full of)   help → helpful, beauty → beautiful, use → useful', ar: 'اللاحقة ful تعني «مليء بـ».' },
        { en: '-less (without)   care → careless, hope → hopeless, home → homeless', ar: 'اللاحقة less تعني «بلا».' },
        { en: '-ous  (having the quality of)  danger → dangerous, fame → famous, nerve → nervous', ar: 'اللاحقة ous تعني «ذو صفة كذا».' },
        { en: '-y    (covered with / like)    sun → sunny, rain → rainy, noise → noisy', ar: 'اللاحقة y تعني «مغطّى بـ» أو «شبيه بـ».' },
        { en: '-al   (relating to)  nature → natural, person → personal, music → musical', ar: 'اللاحقة al تعني «متعلّق بـ».' },
        { en: '-ic   (relating to)  hero → heroic, art → artistic, base → basic', ar: 'اللاحقة ic تعني «متعلّق بـ» أيضًا.' },
        { en: '-ive  (tending to)   create → creative, act → active, attract → attractive', ar: 'اللاحقة ive تعني «ميّال إلى».' },
        { en: '-able (can be …)     enjoy → enjoyable, comfort → comfortable, read → readable', ar: 'اللاحقة able تعني «يمكن أن يُـ…».' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'العائلة الثالثة — القاعدة الواحدة: سبب أم شعور؟',
      title_en: 'The one rule — cause it, or feel it?',
      body_ar:
        'هذه الصفات تأتي من أفعال تصف شعورًا أو تأثيرًا: bore و interest و excite و tire و confuse و surprise '
        + 'و amaze و fascinate و relax و shock. كل فعل يمنحك صفتين — واحدة بـ ing وأخرى بـ ed — وهما تشيران '
        + 'إلى اتجاهين متعاكسين. صفة ing تصف المصدر أو السبب الذي يُحدث الشعور (غالبًا شيء أو موقف)، '
        + 'وصفة ed تصف الشخص الذي يشعر به.',
      examples: [
        { en: 'The lesson is boring.', ar: 'الدرس هو الذي يصنع الملل، فهو السبب — ولذلك ing.' },
        { en: 'I am bored.', ar: 'أنا من يستقبل الملل ويشعر به — ولذلك ed.' },
        { en: 'CAUSE —(-ing)→ feeling —(-ed)→ PERSON', ar: 'السبب يأخذ ing، والشخص الذي يشعر يأخذ ed.' },
      ],
    },
    {
      type: 'contrast',
      title_ar: 'الفخّ الشهير الذي يقع فيه الجميع',
      title_en: '"I am boring" is NOT "I am bored"',
      body_ar: 'اسألي نفسك في كل جملة: هل أنا سبب الشعور، أم أنا من يشعر به؟ السبب ← ing، ومن يشعر ← ed.',
      cols: [
        {
          k: 'I am bored', label_ar: 'هذا ما تقصدينه عادة',
          note_ar: 'أشعر بالملل الآن. هذه هي الجملة الصحيحة في معظم المواقف.',
          examples: [{ en: 'I am bored in this class.', ar: 'أشعر بالملل في هذا الصف.' }],
        },
        {
          k: 'I am boring', label_ar: 'انتبهي — المعنى مختلف تمامًا',
          note_ar: 'أنا أُشعِر الآخرين بالملل، أي أنني شخصية مُملّة! غالبًا ليس هذا مقصدك.',
          examples: [{ en: 'He is confusing. / He is confused.', ar: 'هو يُربك الآخرين. / هو نفسه لم يفهم.' }],
        },
      ],
    },
    {
      type: 'chunks',
      title_ar: 'أزواج شائعة — احتفظي بهذا الجدول قريبًا',
      title_en: 'Common pairs · verb → –ing / –ed',
      body_ar: 'كل سطر: الصفة الأولى تصف السبب، والثانية تصف من يشعر.',
      items: [
        { en: 'bore → boring / bored', ar: 'مُمِلّ / تشعر بالملل' },
        { en: 'interest → interesting / interested', ar: 'مثير للاهتمام / مهتمّة' },
        { en: 'excite → exciting / excited', ar: 'مثير للحماس / متحمّسة' },
        { en: 'tire → tiring / tired', ar: 'مُتعِب / متعَبة' },
        { en: 'confuse → confusing / confused', ar: 'مُربِك / حائرة' },
        { en: 'surprise → surprising / surprised', ar: 'مُفاجئ / مندهشة' },
        { en: 'amaze → amazing / amazed', ar: 'مُبهِر / منبهرة' },
        { en: 'fascinate → fascinating / fascinated', ar: 'آسِر / مفتونة' },
        { en: 'relax → relaxing / relaxed', ar: 'مُريح / مسترخية' },
        { en: 'disappoint → disappointing / disappointed', ar: 'مُخيِّب للأمل / خائبة الأمل' },
        { en: 'shock → shocking / shocked', ar: 'صادم / مصدومة' },
        { en: 'frighten → frightening / frightened', ar: 'مُخيف / خائفة' },
        { en: 'embarrass → embarrassing / embarrassed', ar: 'مُحرِج / محرَجة' },
        { en: 'satisfy → satisfying / satisfied', ar: 'مُرضٍ / راضية' },
        { en: 'annoy → annoying / annoyed', ar: 'مُزعِج / منزعجة' },
        { en: 'exhaust → exhausting / exhausted', ar: 'مُرهِق / مُرهَقة' },
      ],
    },
    {
      type: 'rule',
      title_ar: 'العائلة الرابعة — الصفات المركّبة',
      title_en: 'Compound adjectives · word + word',
      body_ar:
        'كلمتان أو أكثر تتّحدان لتعملا كصفة واحدة، غالبًا بشرطة (-)، وتوضع قبل الاسم. '
        + 'وانتبهي للأرقام: قبل الاسم تبقى بالمفرد وبشرطة — نقول a five-year-old child ولا نقول a five years old child.',
      examples: [
        { en: 'well-known author', ar: 'كاتب معروف' },
        { en: 'good-looking actor', ar: 'ممثل وسيم' },
        { en: 'hard-working student', ar: 'طالبة مجتهدة' },
        { en: 'ten-year-old boy', ar: 'صبيّ عمره عشر سنوات' },
        { en: 'blue-eyed cat', ar: 'قطّة زرقاء العينين' },
        { en: 'world-famous chef', ar: 'طاهٍ عالميّ الشهرة' },
        { en: 'brand-new car', ar: 'سيّارة جديدة تمامًا' },
        { en: 'time-consuming task', ar: 'مهمّة تستهلك وقتًا طويلًا' },
        { en: 'English-speaking country', ar: 'بلد ناطق بالإنجليزية' },
      ],
    },
    {
      type: 'mistakes',
      title_ar: 'أخطاء شائعة — اقرئي الصواب بصوتٍ مسموع مرّتين',
      title_en: 'The traps',
      body_ar: 'كل خطأ هنا سببه الخلط بين السبب ومن يشعر.',
      items: [
        { wrong: 'I am boring in this class.', right: 'I am bored in this class.', note_ar: 'الأولى تعني أنكِ شخصية مُملّة! أنتِ من يشعر بالملل، فالصواب ed.' },
        { wrong: 'The football match was so excited!', right: 'The football match was so exciting!', note_ar: 'المباراة هي التي تُثير الحماس، فهي السبب — ing.' },
        { wrong: 'I felt very boring during the long meeting.', right: 'I felt very bored during the long meeting.', note_ar: 'الفاعل هنا يشعر، فالصواب ed.' },
        { wrong: 'The exam results were really surprised.', right: 'The exam results were really surprising.', note_ar: 'النتائج هي التي فاجأت، فهي السبب — ing.' },
        { wrong: 'He looked confusing when I asked the question.', right: 'He looked confused when I asked the question.', note_ar: 'هو من لم يفهم، فالصواب ed. أمّا confusing فتعني أنه يُربك غيره.' },
        { wrong: 'This book about history is fascinated.', right: 'This book about history is fascinating.', note_ar: 'الكتاب هو مصدر الافتتان، فهو السبب — ing.' },
        { wrong: 'a five years old child', right: 'a five-year-old child', note_ar: 'الصفة المركّبة قبل الاسم تبقى بالمفرد وبشرطة.' },
      ],
    },
  ],
  closing_ar:
    'القاعدة كلها في سطر واحد: السبب يأخذ ing، والشخص الذي يشعر يأخذ ed. '
    + 'وقبل أن تبدئي بالأسئلة: انظري إلى شكل الكلمة أولًا — فالشكل يدلّك على العائلة، والعائلة تدلّك على القاعدة.',
};

// ── THE QUESTIONS (pages 7–9; answer key = page 10) ──────────────────────────
const FAM = ['Base', 'Derived', 'Participial', 'Compound'];

const mcq = (id, question, correct, explanation, options) => ({
  id, question, options, correct_answer: correct, accepted_answers: [correct], explanation,
});
const blank = (id, question, correct, explanation, accepted) => ({
  id, question, correct_answer: correct, accepted_answers: accepted || [correct], explanation,
});
// Free-writing: the sheet's own key says "Answers vary". The "(sample answer)" marker
// makes validateAnswer accept any substantive attempt (≥3 words) instead of exact-matching.
const open = (id, question, sample, explanation) => ({
  id, question, correct_answer: sample, accepted_answers: [`(sample answer) ${sample}`], explanation,
});

const sort = (id, word, fam, why) =>
  mcq(id, `صنّفي الصفة: ${word}`, fam, why, FAM);

const questions = [
  // ── 1 · Sort the Family (16) ────────────────────────────────────────────
  sort('s1',  'tall',         'Base',        'كلمة أصلية بسيطة غير مشتقّة من شيء آخر.'),
  sort('s2',  'helpful',      'Derived',     'أساسها help وأضيفت إليها اللاحقة ful.'),
  sort('s3',  'exciting',     'Participial', 'من الفعل excite وتنتهي بـ ing — تصف السبب.'),
  sort('s4',  'well-known',   'Compound',    'كلمتان اتّحدتا بشرطة: well + known.'),
  sort('s5',  'sad',          'Base',        'كلمة أصلية بسيطة.'),
  sort('s6',  'dangerous',    'Derived',     'أساسها danger وأضيفت إليها اللاحقة ous.'),
  sort('s7',  'bored',        'Participial', 'من الفعل bore وتنتهي بـ ed — تصف من يشعر.'),
  sort('s8',  'good-looking', 'Compound',    'كلمتان اتّحدتا بشرطة: good + looking.'),
  sort('s9',  'careless',     'Derived',     'أساسها care وأضيفت إليها اللاحقة less.'),
  sort('s10', 'hot',          'Base',        'كلمة أصلية بسيطة.'),
  sort('s11', 'fascinated',   'Participial', 'من الفعل fascinate وتنتهي بـ ed — تصف من يشعر.'),
  sort('s12', 'hard-working', 'Compound',    'كلمتان اتّحدتا بشرطة: hard + working.'),
  sort('s13', 'creative',     'Derived',     'أساسها create وأضيفت إليها اللاحقة ive.'),
  sort('s14', 'surprising',   'Participial', 'من الفعل surprise وتنتهي بـ ing — تصف السبب.'),
  sort('s15', 'old',          'Base',        'كلمة أصلية بسيطة.'),
  sort('s16', 'blue-eyed',    'Compound',    'كلمتان اتّحدتا بشرطة: blue + eyed.'),

  // ── 2 · Build the Adjective (8) — one-word blank ────────────────────────
  blank('b1', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — help', 'helpful', 'اللاحقة ful تعني «مليء بـ»: help ← helpful.'),
  blank('b2', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — danger', 'dangerous', 'اللاحقة ous: danger ← dangerous.'),
  blank('b3', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — enjoy', 'enjoyable', 'اللاحقة able تعني «يمكن أن يُـ…»: enjoy ← enjoyable.'),
  blank('b4', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — sun', 'sunny', 'اللاحقة y: sun ← sunny.'),
  blank('b5', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — care', 'careful / careless',
    'كلتاهما صحيحة: careful (مليء بالعناية) أو careless (بلا عناية).', ['careful', 'careless']),
  blank('b6', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — create', 'creative', 'اللاحقة ive: create ← creative.'),
  blank('b7', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — use', 'useful / useless',
    'كلتاهما صحيحة: useful (مفيد) أو useless (عديم الفائدة).', ['useful', 'useless']),
  blank('b8', 'حوّلي الكلمة إلى صفة بإضافة لاحقة — nature', 'natural', 'اللاحقة al: nature ← natural.'),

  // ── 3 · –ing or –ed? (10) — one-word blank ──────────────────────────────
  blank('i1', 'The film was so ___ that I watched it twice.  (interest)', 'interesting',
    'الفيلم هو الذي يُثير الاهتمام، فهو السبب — ing.'),
  blank('i2', 'After the long trip, the children were ___.  (tire)', 'tired',
    'الأطفال هم من يشعر بالتعب — ed.'),
  blank('i3', "I'm really ___ in learning Spanish next year.  (interest)", 'interested',
    'المتحدّثة هي من يشعر بالاهتمام — ed. ولاحظي أن الصيغة الثابتة هي interested in.'),
  blank('i4', 'The ending of the book was completely ___.  (surprise)', 'surprising',
    'النهاية هي التي تُفاجئ، فهي السبب — ing.'),
  blank('i5', 'She felt ___ when she forgot his name.  (embarrass)', 'embarrassed',
    'هي من يشعر بالإحراج — ed.'),
  blank('i6', 'This grammar rule is a little ___ at first.  (confuse)', 'confusing',
    'القاعدة هي التي تُربك، فهي السبب — ing.'),
  blank('i7', "We were all ___ by the magician's trick.  (amaze)", 'amazed',
    'نحن من يشعر بالانبهار — ed.'),
  blank('i8', 'A twelve-hour flight can be very ___.  (exhaust)', 'exhausting',
    'الرحلة هي التي تُرهِق، فهي السبب — ing.'),
  blank('i9', 'He was ___ with his exam results.  (disappoint)', 'disappointed',
    'هو من يشعر بخيبة الأمل — ed.'),
  blank('i10', 'The documentary about space was ___.  (fascinate)', 'fascinating',
    'الفيلم الوثائقي هو مصدر الافتتان، فهو السبب — ing.'),

  // ── 4 · Choose the Correct Form (6) — MCQ ───────────────────────────────
  mcq('c1', 'I am very ___ in this class.', 'bored',
    'أنتِ من يشعر بالملل — ed. أمّا I am boring فتعني أنكِ تُملّين الآخرين!', ['boring', 'bored']),
  mcq('c2', 'Honestly, the lesson itself is ___.', 'interesting',
    'الدرس هو مصدر الاهتمام، فهو السبب — ing.', ['interesting', 'interested']),
  mcq('c3', 'Are you ___ about the trip?', 'excited',
    'أنتِ من يشعر بالحماس — ed.', ['exciting', 'excited']),
  mcq('c4', 'The news this morning was ___.', 'shocking',
    'الخبر هو الذي يصدم، فهو السبب — ing.', ['shocking', 'shocked']),
  mcq('c5', 'My grandfather is never ___ of telling stories.', 'tired',
    'الجدّ هو من يشعر بالتعب — ed. والصيغة الثابتة هي tired of.', ['tiring', 'tired']),
  mcq('c6', 'She gave a very ___ answer.', 'confusing',
    'الإجابة هي التي تُربك السامع، فهي السبب — ing.', ['confusing', 'confused']),

  // ── 5 · Find & Fix the Mistake (5) — write the corrected word only ──────
  blank('f1', 'Write the CORRECT adjective only — The football match was so excited!', 'exciting',
    'المباراة هي التي تُثير الحماس، فهي السبب — exciting.'),
  blank('f2', 'Write the CORRECT adjective only — I felt very boring during the long meeting.', 'bored',
    'المتحدّثة هي من يشعر بالملل — bored.'),
  blank('f3', 'Write the CORRECT adjective only — The exam results were really surprised.', 'surprising',
    'النتائج هي التي فاجأت، فهي السبب — surprising.'),
  blank('f4', 'Write the CORRECT adjective only — He looked confusing when I asked the question.', 'confused',
    'هو من لم يفهم، فالصواب confused.'),
  blank('f5', 'Write the CORRECT adjective only — This book about history is fascinated.', 'fascinating',
    'الكتاب هو مصدر الافتتان، فهو السبب — fascinating.'),

  // ── 6 · Your Turn — Write (5) — the sheet's key says "Answers vary" ─────
  open('w1', 'Write your own sentence using: relaxing',
    'A quiet afternoon in the school library is very relaxing.',
    'صفة ing تصف السبب — الشيء أو الموقف الذي يبعث الاسترخاء. تحقّقي أن جملتك تصف شيئًا لا شعورًا.'),
  open('w2', 'Write your own sentence using: relaxed',
    'I feel relaxed when I read a story to the girls.',
    'صفة ed تصف شعور شخص. تحقّقي أن الفاعل في جملتك هو من يشعر.'),
  open('w3', 'Write your own sentence using: annoying',
    'The broken printer in the library is really annoying.',
    'صفة ing تصف السبب المزعج — شيء أو موقف.'),
  open('w4', 'Write your own sentence using: annoyed',
    'I was annoyed because the books were not returned on time.',
    'صفة ed تصف شعور شخص بالانزعاج.'),
  open('w5', 'Challenge — write TWO sentences about your last English class: one with an –ing adjective, one with an –ed adjective.',
    'The class was interesting, and I was excited to learn the new rule.',
    'الأولى تصف الحصّة (السبب) بـ ing، والثانية تصف شعورك أنتِ بـ ed.'),

  // ── 7 · Cause or Experiencer? (4) — MCQ ─────────────────────────────────
  mcq('e1', 'The roller coaster was TERRIFYING — is the adjective the cause, or the one who feels it?', 'CAUSE',
    'الأفعوانية هي التي تُرعب، فهي السبب — ولذلك ing.', ['CAUSE', 'EXPERIENCER']),
  mcq('e2', 'The tourists were TERRIFIED — is the adjective the cause, or the one who feels it?', 'EXPERIENCER',
    'السيّاح هم من يشعر بالرعب — ولذلك ed.', ['CAUSE', 'EXPERIENCER']),
  mcq('e3', 'Your progress this month is AMAZING — is the adjective the cause, or the one who feels it?', 'CAUSE',
    'تقدّمك هو الذي يُبهر، فهو السبب — ولذلك ing.', ['CAUSE', 'EXPERIENCER']),
  mcq('e4', 'I am honestly AMAZED by your progress — is the adjective the cause, or the one who feels it?', 'EXPERIENCER',
    'المتحدّث هو من يشعر بالانبهار — ولذلك ed.', ['CAUSE', 'EXPERIENCER']),
];

const TITLE = 'العائلات الأربع للصفات — ومتى نستعمل ing ومتى ed';
const INSTRUCTIONS =
  'اقرئي الدرس أولًا، ثم أجيبي عن الأسئلة. التصحيح فوري بعد التسليم، ومع كل سؤال سبب الإجابة.';

const content = {
  render: 'runner',
  type: 'adjective_families',
  variant: VARIANT,
  title_en: 'The Architecture of Adjectives — the four families & the –ing / –ed rule',
  source: 'Fluentia Grammar Lab — The Architecture of Adjectives (B1)',
  learn,
  questions,
};

// Exported so scripts/_test-anwar-adjectives.mjs can grade every key answer through
// the REAL client validator before this ever reaches her account.
module.exports = { content, questions, learn, STUDENT_ID, VARIANT, TITLE, INSTRUCTIONS };

if (require.main !== module) return;

(async () => {
  // sanity: every MCQ's correct answer must actually be one of its options,
  // otherwise she can never score it.
  for (const q of questions) {
    if (q.options && !q.options.includes(q.correct_answer)) throw new Error(`bad option set: ${q.id}`);
    if (!q.explanation) throw new Error(`missing explanation: ${q.id}`);
    if (!q.correct_answer) throw new Error(`missing correct_answer: ${q.id}`);
  }
  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) throw new Error('duplicate question id');
  console.log(`✅ ${questions.length} questions validated · ${learn.blocks.length} lesson blocks`);

  const existing = await sql(
    `select id from targeted_exercises where student_id='${STUDENT_ID}' and content->>'variant'=${lit(VARIANT)} limit 1;`);

  if (Array.isArray(existing) && existing.length) {
    await sql(`update targeted_exercises set
        title=${lit(TITLE)}, instructions=${lit(INSTRUCTIONS)},
        skill='grammar', difficulty='medium',
        content=${lit(JSON.stringify(content))}
      where id='${existing[0].id}';`);
    console.log('♻️  updated existing worksheet', existing[0].id);
  } else {
    const r = await sql(`insert into targeted_exercises
      (student_id, skill, title, instructions, difficulty, status, content)
      values ('${STUDENT_ID}','grammar', ${lit(TITLE)}, ${lit(INSTRUCTIONS)},
        'medium','pending', ${lit(JSON.stringify(content))})
      returning id;`);
    console.log('✅ inserted worksheet', r[0].id);
  }

  const check = await sql(`select id, title, status, difficulty,
      jsonb_array_length(content->'questions') qs,
      jsonb_array_length(content->'learn'->'blocks') blocks
    from targeted_exercises where student_id='${STUDENT_ID}';`);
  console.log(JSON.stringify(check, null, 2));
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
