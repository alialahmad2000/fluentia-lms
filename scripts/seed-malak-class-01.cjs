#!/usr/bin/env node
/**
 * Seeds ملاك الكندي's FIRST class recap («ملخّص الحصة الأولى») into class_recaps.
 *
 * Everything here is what Ali actually taught her live: accurate/accuracy, vague,
 * ambiguous/ambiguity and how it differs from vague, well-defined as the opposite,
 * and cost-effective / time-efficient (her own question: "how do I say it takes
 * less money and less time?").
 *
 * Split into 5 sections so she works one teaching point at a time instead of
 * facing a 72-question wall. Each section = LessonSection blocks + its own graded
 * practice. Grading is rule-based on the client (validateAnswer) — no AI.
 * Feminine Arabic (she's a woman); examples are marketing, since she leads a
 * marketing team.
 *
 * Every question is MCQ or a ONE-WORD blank on purpose — full-sentence rewrites
 * get marked wrong over harmless wording (see the ظافر worksheet incident).
 *
 * Idempotent (upsert on student_id + class_no). Usage: node seed-malak-class-01.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'nmjexpuycmqcxuxljier';
const STUDENT_ID = '28a83f30-9474-4869-8f08-f63dc40c767d'; // ملاك باحشوان الكندي
const REPO = '/Users/dr.ali/projects/fluentia-lms';

const token = () => fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8').match(/sbp_[A-Za-z0-9]+/)[0];
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  });
  const t = await res.text();
  if (!res.ok) { console.error('HTTP', res.status, t.slice(0, 600)); process.exit(1); }
  try { return JSON.parse(t); } catch { return t; }
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

const mcq = (id, question, options, correct, explanation) =>
  ({ id, question, options, correct_answer: correct, accepted_answers: [correct], explanation });
const blank = (id, question, correct, explanation, accepted) =>
  ({ id, question, correct_answer: correct, accepted_answers: accepted || [correct], explanation });

const FORMS = ['accurate', 'accuracy', 'accurately'];

// ══ SECTION 1 — accurate / accuracy (30 questions, as Ali asked) ═════════════
const s1 = {
  key: 'accurate-accuracy',
  title_ar: 'accurate و accuracy — الفرق بينهما',
  title_en: 'accurate vs accuracy',
  blurb_ar: 'كلمتان من عائلة واحدة: إحداهما تصف، والأخرى تسمّي الصفة نفسها. الخلط بينهما أشهر خطأ في هذه العائلة.',
  learn: {
    highlight: 'accurate',
    intro_ar:
      'accurate و accuracy ليستا كلمتين مختلفتين في المعنى — بل صورتان لمعنى واحد هو «الدقّة». '
      + 'الفرق نحويّ لا معنويّ: accurate صفة تصف شيئًا، و accuracy اسم يسمّي الصفة نفسها. '
      + 'إذا عرفتِ أيّهما صفة وأيّهما اسم، لن تخطئي فيهما مرة أخرى.',
    intro_en: 'accurate = adjective · accuracy = noun · accurately = adverb',
    blocks: [
      {
        type: 'contrast',
        title_ar: 'العائلة كاملة في نظرة واحدة',
        title_en: 'The whole family',
        body_ar: 'الجذر واحد، والوظيفة النحوية هي ما يتغيّر.',
        cols: [
          { k: 'accurate', label_ar: 'صفة (adjective)', note_ar: 'تصف اسمًا: تقرير دقيق، أرقام دقيقة.',
            examples: [
              { en: 'This is an accurate report.', ar: 'هذا تقرير دقيق.' },
              { en: 'The numbers are accurate.', ar: 'الأرقام دقيقة.' },
            ] },
          { k: 'accuracy', label_ar: 'اسم (noun)', note_ar: 'يسمّي الصفة نفسها: «الدقّة» كشيء نتحدث عنه.',
            examples: [
              { en: 'The accuracy of the data is high.', ar: 'دقّة البيانات عالية.' },
              { en: 'We need to improve accuracy.', ar: 'نحتاج إلى تحسين الدقّة.' },
            ] },
          { k: 'accurately', label_ar: 'ظرف (adverb)', note_ar: 'يصف الفعل: كيف حدث الفعل.',
            examples: [
              { en: 'She reported the results accurately.', ar: 'عرضت النتائج بدقّة.' },
              { en: 'Please measure it accurately.', ar: 'من فضلكِ قيسيه بدقّة.' },
            ] },
        ],
      },
      {
        type: 'rule',
        title_ar: 'أين تقع كل واحدة في الجملة؟',
        title_en: 'Where each one sits',
        body_ar:
          'الصفة accurate تأتي قبل الاسم مباشرة (an accurate forecast) أو بعد أفعال الكينونة '
          + 'مثل is و are و was و seems. أمّا الاسم accuracy فيقع حيث يقع أي اسم: فاعلًا، أو مفعولًا، '
          + 'أو بعد of و the و our، أو بعد صفة تصفه مثل high.',
        examples: [
          { en: 'an accurate forecast', ar: 'توقّع دقيق (صفة + اسم).', hl: 'accurate' },
          { en: 'The forecast was accurate.', ar: 'كان التوقّع دقيقًا (بعد was).', hl: 'accurate' },
          { en: 'Accuracy matters more than speed.', ar: 'الدقّة أهم من السرعة (اسم كفاعل).', hl: 'Accuracy' },
          { en: 'the accuracy of our targeting', ar: 'دقّة استهدافنا (بعد of).', hl: 'accuracy' },
          { en: 'high accuracy', ar: 'دقّة عالية (صفة + اسم).', hl: 'accuracy' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'النفي: inaccurate و inaccuracy',
        title_en: 'The negatives',
        body_ar:
          'نضيف in- للنفي. inaccurate صفة (غير دقيق)، و inaccuracy اسم (عدم الدقّة). '
          + 'ولاحظي أن inaccuracies بالجمع تعني «الأخطاء» المحدّدة داخل عمل ما.',
        examples: [
          { en: 'The first draft was inaccurate.', ar: 'كانت المسودّة الأولى غير دقيقة.', hl: 'inaccurate' },
          { en: 'I found three inaccuracies in the report.', ar: 'وجدت ثلاثة أخطاء في التقرير.', hl: 'inaccuracies' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'تراكيب جاهزة تُقال هكذا',
        title_en: 'Natural collocations',
        body_ar: 'احفظيها كقطعة واحدة — هكذا يقولها أهل اللغة في العمل.',
        items: [
          { en: 'highly accurate', ar: 'دقيق جدًّا' },
          { en: '100% accurate', ar: 'دقيق مئة بالمئة' },
          { en: 'improve accuracy', ar: 'تحسين الدقّة' },
          { en: 'check for accuracy', ar: 'التحقّق من الدقّة' },
          { en: 'accuracy rate', ar: 'نسبة الدقّة' },
          { en: 'with great accuracy', ar: 'بدقّة عالية' },
          { en: 'report accurately', ar: 'يعرض/يبلّغ بدقّة' },
          { en: 'an accurate estimate', ar: 'تقدير دقيق' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'الأخطاء التي تحدث فعلًا',
        title_en: 'Real traps',
        body_ar: 'كل خطأ هنا سببه وضع الاسم مكان الصفة أو العكس. اقرئي الصواب بصوتٍ مسموع مرّتين.',
        items: [
          { wrong: 'This is a accuracy report.', right: 'This is an accurate report.', note_ar: 'قبل الاسم نحتاج صفة، لا اسمًا. ولاحظي an قبل الحرف المتحرك.' },
          { wrong: 'The data has high accurate.', right: 'The data has high accuracy.', note_ar: 'بعد high نحتاج اسمًا: accuracy.' },
          { wrong: 'We must report the numbers accurate.', right: 'We must report the numbers accurately.', note_ar: 'ما يصف الفعل report هو الظرف accurately.' },
          { wrong: 'I want to improve my accurate.', right: 'I want to improve my accuracy.', note_ar: 'بعد my نحتاج اسمًا.' },
          { wrong: 'Her forecast was accuracy.', right: 'Her forecast was accurate.', note_ar: 'بعد was نصف الشيء، فنستعمل الصفة.' },
          { wrong: 'The report has some inaccurate.', right: 'The report has some inaccuracies.', note_ar: 'بعد some نحتاج اسمًا بالجمع: inaccuracies.' },
        ],
      },
    ],
    closing_ar: 'قاعدة الأمان: إن جاءت قبل الاسم أو بعد فعل كينونة فهي accurate، وإن جاءت بعد the أو my أو high أو of فهي accuracy، وإن كنتِ تصفين فعلًا فهي accurately.',
  },
  questions: [
    // A · choose the form (12)
    mcq('a1', 'This is a very ___ report.', FORMS, 'accurate', 'قبل الاسم report نحتاج صفة.'),
    mcq('a2', 'The ___ of our data is very high.', FORMS, 'accuracy', 'بعد The وقبل of نحتاج اسمًا.'),
    mcq('a3', 'She described the campaign results ___.', FORMS, 'accurately', 'ما يصف الفعل described هو الظرف.'),
    mcq('a4', 'Our targeting is not ___ enough.', FORMS, 'accurate', 'بعد is نصف الشيء نفسه، فنستعمل الصفة.'),
    mcq('a5', 'We need to improve the ___ of our forecasts.', FORMS, 'accuracy', 'بعد the وقبل of نحتاج اسمًا.'),
    mcq('a6', 'Please record the figures ___.', FORMS, 'accurately', 'يصف كيف نسجّل، فهو ظرف.'),
    mcq('a7', 'That was an ___ estimate of the budget.', FORMS, 'accurate', 'بعد an وقبل estimate نحتاج صفة.'),
    mcq('a8', 'In reporting, ___ matters more than speed.', FORMS, 'accuracy', 'الكلمة هنا فاعل الجملة، فهي اسم.'),
    mcq('a9', 'The tool measures engagement with great ___.', FORMS, 'accuracy', 'بعد great نحتاج اسمًا.'),
    mcq('a10', 'Make sure the client data is ___.', FORMS, 'accurate', 'بعد is نستعمل الصفة.'),
    mcq('a11', 'He answered every question ___.', FORMS, 'accurately', 'يصف الفعل answered.'),
    mcq('a12', 'Our ___ rate went up to 95%.', FORMS, 'accuracy', 'accuracy rate تركيب ثابت: اسم + اسم.'),

    // B · one-word blanks (8)
    blank('b1', 'Write ONE word — The numbers in this slide are not ___. (دقيقة)', 'accurate', 'بعد are نستعمل الصفة accurate.'),
    blank('b2', 'Write ONE word — We check every report for ___. (الدقّة)', 'accuracy', 'بعد for نحتاج اسمًا.'),
    blank('b3', 'Write ONE word — She summarised the meeting ___. (بدقّة)', 'accurately', 'يصف الفعل summarised، فهو ظرف.'),
    blank('b4', 'Write ONE word — high ___ (دقّة عالية)', 'accuracy', 'بعد الصفة high يأتي الاسم.'),
    blank('b5', 'Write ONE word — an ___ translation (ترجمة دقيقة)', 'accurate', 'قبل الاسم translation نحتاج صفة.'),
    blank('b6', 'Write ONE word — The ___ of the survey surprised us. (دقّة)', 'accuracy', 'بعد The وقبل of نحتاج اسمًا.'),
    blank('b7', 'Write ONE word — Our reports must be 100% ___. (دقيقة)', 'accurate', 'بعد be نستعمل الصفة.'),
    blank('b8', 'Write ONE word — Please quote the client ___. (بدقّة)', 'accurately', 'يصف الفعل quote، فهو ظرف.'),

    // C · negatives (5)
    mcq('c1', 'The first version of the brief was ___.',
      ['inaccurate', 'inaccuracy', 'inaccurately'], 'inaccurate', 'بعد was نصف الشيء، فنستعمل الصفة المنفية.'),
    mcq('c2', 'I found several ___ in the spreadsheet.',
      ['inaccurate', 'inaccuracies', 'inaccurately'], 'inaccuracies', 'بعد several نحتاج اسمًا بالجمع.'),
    mcq('c3', 'The data was reported ___, so we lost the client’s trust.',
      ['inaccurate', 'inaccuracy', 'inaccurately'], 'inaccurately', 'يصف الفعل reported، فهو ظرف.'),
    mcq('c4', 'One ___ can damage a whole report.',
      ['inaccurate', 'inaccuracy', 'inaccurately'], 'inaccuracy', 'بعد One نحتاج اسمًا مفردًا.'),
    mcq('c5', 'These figures look ___ to me.',
      ['inaccurate', 'inaccuracy', 'inaccurately'], 'inaccurate', 'بعد look نصف الشيء، فنستعمل الصفة.'),

    // D · spot the correct sentence (5)
    mcq('d1', 'Choose the correct sentence:',
      ['This is a accuracy report.', 'This is an accurate report.'],
      'This is an accurate report.', 'قبل الاسم نحتاج صفة، و an قبل الحرف المتحرك.'),
    mcq('d2', 'Choose the correct sentence:',
      ['The data has high accuracy.', 'The data has high accurate.'],
      'The data has high accuracy.', 'بعد high نحتاج اسمًا.'),
    mcq('d3', 'Choose the correct sentence:',
      ['We reported the numbers accurately.', 'We reported the numbers accurate.'],
      'We reported the numbers accurately.', 'ما يصف الفعل هو الظرف.'),
    mcq('d4', 'Choose the correct sentence:',
      ['I want to improve my accurate.', 'I want to improve my accuracy.'],
      'I want to improve my accuracy.', 'بعد my نحتاج اسمًا.'),
    mcq('d5', 'Choose the correct sentence:',
      ['Her forecast was accurate.', 'Her forecast was accuracy.'],
      'Her forecast was accurate.', 'بعد was نصف الشيء، فنستعمل الصفة.'),
  ],
};

// ══ SECTION 2 — vague ════════════════════════════════════════════════════════
const s2 = {
  key: 'vague',
  title_ar: 'vague — الغموض بمعنى نقص التفاصيل',
  title_en: 'vague',
  blurb_ar: 'كلمة جديدة عليكِ. معناها: ناقص التفاصيل، غير محدَّد — لا «خطأ»، بل «غير كافٍ في التحديد».',
  learn: {
    highlight: 'vague',
    intro_ar:
      'vague صفة تصف الكلام أو الفكرة التي تنقصها التفاصيل، فلا تعرفين منها ماذا يُقصد بالضبط. '
      + 'انتبهي: vague لا تعني «خاطئ» — قد يكون الكلام صحيحًا تمامًا لكنه ناقص التحديد.',
    intro_en: 'vague = not detailed enough, not specific',
    blocks: [
      {
        type: 'rule',
        title_ar: 'المعنى ومواضعه',
        title_en: 'What it means',
        body_ar:
          'نستعملها لوصف إجابة أو تعليمات أو فكرة أو خطة تنقصها التفاصيل. '
          + 'وتأتي قبل الاسم مباشرة، أو بعد أفعال الكينونة مثل is و was و sound و seem.',
        examples: [
          { en: 'The client’s brief was very vague.', ar: 'كان موجز العميل شديد الغموض (ينقصه التفصيل).' },
          { en: 'She gave me a vague answer.', ar: 'أعطتني إجابة غير محدّدة.' },
          { en: 'I only have a vague idea of the budget.', ar: 'لديّ فكرة مبهمة فقط عن الميزانية.' },
          { en: 'His instructions sounded vague.', ar: 'بدت تعليماته غير واضحة.' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'العائلة: vaguely و vagueness',
        title_en: 'The family',
        body_ar: 'vaguely ظرف (بشكل مبهم)، و vagueness اسم (الغموض / نقص التحديد).',
        examples: [
          { en: 'He answered vaguely and changed the subject.', ar: 'أجاب بشكل مبهم ثم غيّر الموضوع.', hl: 'vaguely' },
          { en: 'The vagueness of the brief cost us two weeks.', ar: 'غموض الموجز كلّفنا أسبوعين.', hl: 'vagueness' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'تراكيب جاهزة',
        title_en: 'Collocations',
        items: [
          { en: 'a vague answer', ar: 'إجابة غير محدّدة' },
          { en: 'vague instructions', ar: 'تعليمات مبهمة' },
          { en: 'a vague idea', ar: 'فكرة مبهمة' },
          { en: 'be vague about (something)', ar: 'يتهرّب من التحديد بشأن شيء' },
          { en: 'sound vague', ar: 'يبدو غير محدّد' },
          { en: 'too vague to act on', ar: 'مبهم لدرجة يصعب معها التنفيذ' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'انتبهي',
        title_en: 'Watch out',
        items: [
          { wrong: 'The answer was vagued.', right: 'The answer was vague.', note_ar: 'vague صفة أصلًا — لا نضيف لها ed.' },
          { wrong: 'She answered vague.', right: 'She answered vaguely.', note_ar: 'ما يصف الفعل هو الظرف vaguely.' },
          { wrong: 'I have a vague about the plan.', right: 'I have a vague idea about the plan.', note_ar: 'vague صفة، فتحتاج اسمًا تصفه مثل idea.' },
          { wrong: 'He was vague on the budget.', right: 'He was vague about the budget.', note_ar: 'حرف الجر الثابت مع vague هو about.' },
        ],
      },
    ],
    closing_ar: 'اسألي نفسكِ: هل المشكلة أن التفاصيل ناقصة؟ إذًا الكلمة هي vague.',
  },
  questions: [
    mcq('v1', 'The brief had no numbers and no deadline — it was very ___.',
      ['vague', 'accurate', 'well-defined'], 'vague', 'ينقصه التفصيل، وهذا معنى vague تمامًا.'),
    mcq('v2', 'She answered ___ and moved on quickly.',
      ['vague', 'vaguely', 'vagueness'], 'vaguely', 'ما يصف الفعل answered هو الظرف.'),
    mcq('v3', 'The ___ of the instructions delayed the whole campaign.',
      ['vague', 'vaguely', 'vagueness'], 'vagueness', 'بعد The وقبل of نحتاج اسمًا.'),
    mcq('v4', 'I only have a ___ idea of what the client wants.',
      ['vague', 'vaguely', 'vagueness'], 'vague', 'قبل الاسم idea نحتاج صفة.'),
    mcq('v5', 'He was vague ___ the budget.', ['about', 'on', 'for'], 'about',
      'حرف الجر الثابت مع vague هو about.'),
    blank('v6', 'Write ONE word — Her plan is too ___ to follow. (مبهمة)', 'vague', 'بعد too نستعمل الصفة.'),
    blank('v7', 'Write ONE word — Please do not be ___ about the deadline. (مبهمة)', 'vague', 'بعد be نستعمل الصفة.'),
    mcq('v8', 'Choose the correct sentence:',
      ['The answer was vagued.', 'The answer was vague.'],
      'The answer was vague.', 'vague صفة أصلًا ولا تأخذ ed.'),
    mcq('v9', 'Choose the correct sentence:',
      ['She replied vague.', 'She replied vaguely.'],
      'She replied vaguely.', 'ما يصف الفعل هو الظرف.'),
    mcq('v10', '“We will launch it soon.” — This sentence is ___ because it gives no exact time.',
      ['vague', 'accurate', 'inaccurate'], 'vague', '«soon» تنقصها التفاصيل: متى بالضبط؟'),
  ],
};

// ══ SECTION 3 — ambiguous / ambiguity, and how it differs from vague ═════════
const s3 = {
  key: 'ambiguous',
  title_ar: 'ambiguous و ambiguity — وعلاقتها بـ vague',
  title_en: 'ambiguous vs vague',
  blurb_ar: 'الكلمتان تُترجَمان أحيانًا بـ«غامض»، لكن الفرق بينهما دقيق ومهم — وهذا هو قلب هذا القسم.',
  learn: {
    highlight: 'ambiguous',
    intro_ar:
      'ambiguous صفة معناها: يحتمل أكثر من معنى واحد. أي أن الكلام واضح ومكتمل، لكنه يمكن أن يُفهَم بطريقتين. '
      + 'وهنا الفرق الجوهري عن vague: vague = التفاصيل ناقصة، و ambiguous = التفاصيل موجودة لكنها تحتمل تفسيرين.',
    intro_en: 'ambiguous = has more than one possible meaning',
    blocks: [
      {
        type: 'contrast',
        title_ar: 'الفرق في سطرين',
        title_en: 'The difference',
        body_ar: 'اسألي: هل المشكلة نقص معلومات، أم أن المعلومات تحتمل تفسيرين؟',
        cols: [
          { k: 'vague', label_ar: 'ناقص التفاصيل', note_ar: 'لا أعرف ماذا يُقصد، لأن المعلومة نفسها ناقصة.',
            examples: [
              { en: 'Send it soon.', ar: '«قريبًا» متى؟ لا يوجد تحديد أصلًا.', hl: 'soon' },
              { en: 'We need better results.', ar: '«أفضل» بكم؟ لا مقياس.', hl: 'better' },
            ] },
          { k: 'ambiguous', label_ar: 'يحتمل تفسيرين', note_ar: 'المعلومة كاملة، لكن الجملة تُقرأ بطريقتين.',
            examples: [
              { en: 'Visiting clients can be tiring.', ar: 'هل زيارتنا للعملاء متعبة، أم أن العملاء الزائرين متعبون؟' },
              { en: 'She told her manager she was wrong.', ar: 'مَن كانت المخطئة: هي أم المديرة؟' },
            ] },
        ],
      },
      {
        type: 'rule',
        title_ar: 'العائلة: ambiguity و ambiguously',
        title_en: 'The family',
        body_ar: 'ambiguity اسم (الالتباس/احتمال أكثر من معنى)، و ambiguously ظرف. ولاحظي أن ambiguities بالجمع تعني مواضع الالتباس المحدّدة.',
        examples: [
          { en: 'There is an ambiguity in clause three.', ar: 'يوجد التباس في البند الثالث.', hl: 'ambiguity' },
          { en: 'The email was worded ambiguously.', ar: 'صيغت الرسالة بشكل ملتبس.', hl: 'ambiguously' },
          { en: 'We removed two ambiguities from the contract.', ar: 'أزلنا موضعَي التباس من العقد.', hl: 'ambiguities' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'تراكيب جاهزة',
        title_en: 'Collocations',
        items: [
          { en: 'an ambiguous message', ar: 'رسالة ملتبسة' },
          { en: 'open to interpretation', ar: 'قابل لأكثر من تفسير' },
          { en: 'remove any ambiguity', ar: 'إزالة أي التباس' },
          { en: 'avoid ambiguity', ar: 'تجنّب الالتباس' },
          { en: 'deliberately ambiguous', ar: 'ملتبس عن قصد' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'انتبهي',
        title_en: 'Watch out',
        items: [
          { wrong: 'There is an ambiguous in the contract.', right: 'There is an ambiguity in the contract.', note_ar: 'بعد an نحتاج اسمًا: ambiguity.' },
          { wrong: 'The clause is ambiguity.', right: 'The clause is ambiguous.', note_ar: 'بعد is نصف الشيء، فنستعمل الصفة.' },
          { wrong: 'He wrote the email ambiguous.', right: 'He wrote the email ambiguously.', note_ar: 'ما يصف الفعل wrote هو الظرف.' },
        ],
      },
    ],
    closing_ar: 'تلخيص: ناقص معلومات ← vague. معلومات كاملة لكن تُفهَم بطريقتين ← ambiguous.',
  },
  questions: [
    mcq('m1', 'The sentence “Visiting clients can be tiring” is ___ because it has two possible meanings.',
      ['ambiguous', 'vague', 'accurate'], 'ambiguous', 'المعلومة كاملة لكنها تحتمل تفسيرين.'),
    mcq('m2', '“We will improve it later.” — This is ___ because it gives no detail at all.',
      ['ambiguous', 'vague', 'accurate'], 'vague', 'المشكلة نقص التفاصيل، لا تعدّد المعاني.'),
    mcq('m3', 'There is an ___ in the second clause of the contract.',
      ['ambiguous', 'ambiguity', 'ambiguously'], 'ambiguity', 'بعد an نحتاج اسمًا.'),
    mcq('m4', 'The message was worded ___, so two teams understood it differently.',
      ['ambiguous', 'ambiguity', 'ambiguously'], 'ambiguously', 'ما يصف الفعل worded هو الظرف.'),
    mcq('m5', 'The wording of the offer is ___ — it could mean two different discounts.',
      ['ambiguous', 'ambiguity', 'ambiguously'], 'ambiguous', 'بعد is نستعمل الصفة.'),
    mcq('m6', 'A good brief should avoid both ___ and vagueness.',
      ['ambiguous', 'ambiguity', 'ambiguously'], 'ambiguity', 'بعد avoid نحتاج اسمًا، ومعطوف على vagueness (اسم).'),
    blank('m7', 'Write ONE word — “She told her manager she was wrong.” This sentence is ___. (ملتبسة)', 'ambiguous', 'لا نعرف مَن المخطئة، فهي تحتمل تفسيرين.'),
    blank('m8', 'Write ONE word — “Make it better.” This instruction is ___. (مبهمة، ينقصها التفصيل)', 'vague', 'لا يوجد مقياس ولا تفصيل.'),
    mcq('m9', 'Choose the correct sentence:',
      ['The clause is ambiguity.', 'The clause is ambiguous.'],
      'The clause is ambiguous.', 'بعد is نستعمل الصفة.'),
    mcq('m10', 'Choose the correct sentence:',
      ['We removed the ambiguous from the contract.', 'We removed the ambiguity from the contract.'],
      'We removed the ambiguity from the contract.', 'بعد the نحتاج اسمًا.'),
    mcq('m11', 'Your client sent full details, but the sentence can be read in two ways. The problem is ___.',
      ['ambiguity', 'vagueness', 'accuracy'], 'ambiguity', 'المعلومات كاملة والمشكلة تعدّد التفسير.'),
    mcq('m12', 'Your client sent no numbers and no dates. The problem is ___.',
      ['ambiguity', 'vagueness', 'accuracy'], 'vagueness', 'المشكلة نقص التفاصيل.'),
  ],
};

// ══ SECTION 4 — well-defined (the opposite) ══════════════════════════════════
const s4 = {
  key: 'well-defined',
  title_ar: 'well-defined — الضدّ من vague و ambiguous',
  title_en: 'well-defined',
  blurb_ar: 'الصفة التي تصفين بها الهدف أو الدور أو الخطة حين تكون واضحة المعالم ومحدّدة تمامًا.',
  learn: {
    highlight: 'well-defined',
    intro_ar:
      'well-defined صفة مركّبة معناها: محدَّد بوضوح، واضح المعالم، لا لبس فيه ولا نقص. '
      + 'وهي الضدّ المباشر لـ vague و ambiguous معًا.',
    intro_en: 'well-defined = clearly and precisely stated',
    blocks: [
      {
        type: 'rule',
        title_ar: 'المعنى والاستعمال',
        title_en: 'Meaning and use',
        body_ar:
          'نصف بها الأهداف والأدوار والعمليات والحدود. وهي صفة، فتقع قبل الاسم أو بعد أفعال الكينونة.',
        examples: [
          { en: 'We need a well-defined goal for this quarter.', ar: 'نحتاج هدفًا واضح المعالم لهذا الربع.' },
          { en: 'Her role in the team is well defined.', ar: 'دورها في الفريق محدّد بوضوح.' },
          { en: 'a well-defined target audience', ar: 'جمهور مستهدَف محدّد بدقّة.' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'قاعدة الشَّرطة (-)',
        title_en: 'The hyphen rule',
        body_ar:
          'حين تقع الصفة المركّبة قبل الاسم مباشرة نكتبها بشَرطة: a well-defined process. '
          + 'وحين تقع بعد فعل الكينونة تُكتب عادةً بلا شرطة: The process is well defined. '
          + 'هذه القاعدة نفسها تنطبق على كل الصفات المركّبة بـ well- مثل well-known و well-written.',
        examples: [
          { en: 'a well-defined strategy', ar: 'قبل الاسم ← بشَرطة.' },
          { en: 'The strategy is well defined.', ar: 'بعد is ← بلا شرطة.' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'كلمات قريبة المعنى',
        title_en: 'Near synonyms',
        body_ar: 'تصلح جميعها في سياق العمل، وتختلف في الدرجة.',
        items: [
          { en: 'clear', ar: 'واضح' },
          { en: 'specific', ar: 'محدَّد' },
          { en: 'precise', ar: 'دقيق التحديد' },
          { en: 'well-defined', ar: 'واضح المعالم' },
          { en: 'unambiguous', ar: 'لا يحتمل إلا معنى واحدًا' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'انتبهي',
        title_en: 'Watch out',
        items: [
          { wrong: 'We need a well defined goal.', right: 'We need a well-defined goal.', note_ar: 'قبل الاسم goal نضع الشَّرطة.' },
          { wrong: 'The role is well-define.', right: 'The role is well defined.', note_ar: 'الصيغة هي defined لا define.' },
        ],
      },
    ],
    closing_ar: 'إذا أردتِ مدح موجزٍ أو هدفٍ فقولي: It’s well-defined. وإذا أردتِ نقده فقولي: It’s vague أو It’s ambiguous.',
  },
  questions: [
    mcq('w1', 'The opposite of a vague goal is a ___ goal.',
      ['well-defined', 'ambiguous', 'inaccurate'], 'well-defined', 'well-defined هي الضدّ المباشر لـ vague.'),
    mcq('w2', 'A brief that leaves no room for two interpretations is ___.',
      ['ambiguous', 'well-defined', 'vague'], 'well-defined',
      'لا لبس ولا نقص، وهذا هو معنى well-defined.'),
    mcq('w3', 'Choose the correct sentence:',
      ['Her role is well defined.', 'Her role is well-define.'],
      'Her role is well defined.', 'بعد is نستعمل defined، وبلا شرطة عادةً.'),
    mcq('w4', 'Our target audience is very ___ — age, city and interests are all specified.',
      ['vague', 'well-defined', 'ambiguous'], 'well-defined', 'كل التفاصيل محدّدة، وهذا معنى well-defined.'),
    blank('w5', 'Write ONE word — A good brief is specific, clear and ___-defined. (واضح)', 'well', 'الصفة المركّبة هي well-defined.'),
    mcq('w6', 'Which word does NOT mean the same as well-defined?',
      ['clear', 'specific', 'vague'], 'vague', 'vague هي الضدّ لا المرادف.'),
    mcq('w7', 'The scope of the project is ___, so nobody is confused about their tasks.',
      ['ambiguous', 'well defined', 'vague'], 'well defined', 'بعد is تُكتب عادةً بلا شرطة.'),
    mcq('w8', 'We rewrote the brief to make every deliverable ___.',
      ['well-defined', 'vaguely', 'ambiguity'], 'well-defined', 'نحتاج صفة تصف deliverable.'),
  ],
};

// ══ SECTION 5 — cost-effective & time-efficient (her own question) ═══════════
const s5 = {
  key: 'cost-effective',
  title_ar: 'cost-effective و time-efficient — أقل تكلفة وأقل وقتًا',
  title_en: 'cost-effective & time-efficient',
  blurb_ar: 'سؤالكِ في الحصة: كيف أقول إن الطريقة تأخذ مالًا أقل ووقتًا أقل؟ هاتان هما الكلمتان.',
  learn: {
    highlight: 'cost-effective',
    intro_ar:
      'حين تريدين وصف طريقةٍ تعطي نتيجة جيدة بمالٍ أقل تقولين cost-effective، وحين تعطي النتيجة نفسها بوقتٍ أقل '
      + 'تقولين time-efficient. والجملة الجاهزة التي سألتِ عنها هي: This method is cost-effective and time-efficient.',
    intro_en: 'cost-effective = good value for the money · time-efficient = uses time well',
    blocks: [
      {
        type: 'contrast',
        title_ar: 'الكلمتان جنبًا إلى جنب',
        title_en: 'Side by side',
        cols: [
          { k: 'cost-effective', label_ar: 'مجدٍ من حيث التكلفة', note_ar: 'نتيجة جيدة مقابل المال المدفوع.',
            examples: [
              { en: 'Email marketing is very cost-effective.', ar: 'التسويق بالبريد مجدٍ جدًّا من حيث التكلفة.' },
              { en: 'a cost-effective solution', ar: 'حلّ مجدٍ من حيث التكلفة.' },
            ] },
          { k: 'time-efficient', label_ar: 'موفِّر للوقت', note_ar: 'ينجز الشيء نفسه في وقت أقل.',
            examples: [
              { en: 'Batching the posts is more time-efficient.', ar: 'تجميع المنشورات دفعةً واحدة أوفر للوقت.' },
              { en: 'a time-efficient process', ar: 'عملية موفّرة للوقت.' },
            ] },
        ],
      },
      {
        type: 'rule',
        title_ar: 'الفرق المهم: cost-effective ليست cheap',
        title_en: 'cost-effective ≠ cheap',
        body_ar:
          'cheap تعني «رخيص» وقد تحمل معنى سلبيًا (رخيص ورديء). أمّا cost-effective فتعني أن ما دفعتِه أعطاكِ '
          + 'نتيجة تستحقّه — وقد يكون السعر مرتفعًا وتظلّ الطريقة مجدية. استعمليها في العمل بدل cheap.',
        examples: [
          { en: 'It is expensive, but very cost-effective.', ar: 'مكلف، لكنه مجدٍ جدًّا — والجملة سليمة تمامًا.' },
          { en: 'a cheap agency', ar: 'وكالة رخيصة (قد تُفهَم سلبًا).' },
        ],
      },
      {
        type: 'rule',
        title_ar: 'الشَّرطة وصيغة الاسم',
        title_en: 'Hyphen & noun forms',
        body_ar:
          'الصفة تُكتب بشَرطة: a cost-effective plan. والاسم منها cost-effectiveness (الجدوى من حيث التكلفة)، '
          + 'واسم الثانية efficiency (الكفاءة). ولا تستعملي الاسم مكان الصفة.',
        examples: [
          { en: 'a cost-effective plan', ar: 'صفة قبل الاسم.', hl: 'cost-effective' },
          { en: 'We measured the cost-effectiveness of each channel.', ar: 'قِسنا الجدوى التكلفية لكل قناة.' },
          { en: 'This tool improves our efficiency.', ar: 'ترفع هذه الأداة كفاءتنا.' },
        ],
      },
      {
        type: 'chunks',
        title_ar: 'عبارات جاهزة تقولينها في الاجتماع',
        title_en: 'Say it like this',
        items: [
          { en: 'This method is cost-effective and time-efficient.', ar: 'هذه الطريقة مجدية من حيث التكلفة وموفّرة للوقت.' },
          { en: 'It saves both time and money.', ar: 'توفّر الوقت والمال معًا.' },
          { en: 'a more cost-effective option', ar: 'خيار أجدى من حيث التكلفة' },
          { en: 'without increasing the budget', ar: 'دون زيادة الميزانية' },
          { en: 'in half the time', ar: 'في نصف الوقت' },
          { en: 'the best value for money', ar: 'أفضل قيمة مقابل المال' },
        ],
      },
      {
        type: 'mistakes',
        title_ar: 'انتبهي',
        title_en: 'Watch out',
        items: [
          { wrong: 'a cost effective solution', right: 'a cost-effective solution', note_ar: 'قبل الاسم نضع الشَّرطة.' },
          { wrong: 'This plan is time-efficiency.', right: 'This plan is time-efficient.', note_ar: 'بعد is نحتاج صفة لا اسمًا.' },
          { wrong: 'We chose the cheap option to look professional.', right: 'We chose the most cost-effective option.', note_ar: 'في سياق العمل، cost-effective أدق وأكثر مهنية من cheap.' },
          { wrong: 'It is cost-effective in time.', right: 'It is time-efficient.', note_ar: 'لكل واحدة مجالها: المال ← cost-effective، الوقت ← time-efficient.' },
        ],
      },
    ],
    closing_ar: 'الجملة التي سألتِ عنها، احفظيها كما هي: This method is cost-effective and time-efficient.',
  },
  questions: [
    mcq('e1', 'It gives great results for a small budget, so it is very ___.',
      ['cost-effective', 'time-efficient', 'ambiguous'], 'cost-effective', 'الحديث عن المال مقابل النتيجة.'),
    mcq('e2', 'It does the same job in half the time, so it is very ___.',
      ['cost-effective', 'time-efficient', 'well-defined'], 'time-efficient', 'الحديث عن الوقت.'),
    mcq('e3', 'We printed 10,000 flyers, paid a lot, and got no leads. That was NOT ___.',
      ['cost-effective', 'accurate', 'ambiguous'], 'cost-effective',
      'دفعنا كثيرًا دون نتيجة، أي أن الجدوى مقابل التكلفة كانت ضعيفة.'),
    mcq('e4', 'Choose the correct sentence:',
      ['This process is time-efficiency.', 'This process is time-efficient.'],
      'This process is time-efficient.', 'بعد is نحتاج صفة.'),
    mcq('e5', '“It is expensive, but very cost-effective.” Is this sentence possible?',
      ['Yes — cost-effective means good value, not cheap.', 'No — cost-effective means cheap.'],
      'Yes — cost-effective means good value, not cheap.', 'cost-effective تعني الجدوى مقابل المال، لا انخفاض السعر.'),
    mcq('e6', 'We measured the ___ of every marketing channel.',
      ['cost-effective', 'cost-effectiveness', 'cost-efficiently'], 'cost-effectiveness',
      'بعد the نحتاج اسمًا: cost-effectiveness.'),
    blank('e7', 'Write ONE word — This method is cost-effective and time-___. (كفء/موفّر للوقت)', 'efficient',
      'الصفة هي time-efficient.'),
    blank('e8', 'Write ONE word — It saves both time and ___. (المال)', 'money', 'العبارة الجاهزة: saves both time and money.'),
    mcq('e9', 'Which sentence sounds most professional in a client meeting?',
      ['We picked the cheap option.', 'We picked the most cost-effective option.'],
      'We picked the most cost-effective option.', 'cheap قد تُفهَم سلبًا؛ cost-effective أدقّ وأكثر مهنية.'),
    mcq('e10', 'Automating the reports made the team more ___.',
      ['efficient', 'efficiency', 'efficiently'], 'efficient', 'بعد more نصف الفريق، فنستعمل الصفة.'),
    mcq('e11', 'This tool improves our ___ without increasing the budget.',
      ['efficient', 'efficiency', 'efficiently'], 'efficiency', 'بعد our نحتاج اسمًا.'),
    mcq('e12', 'The client asked for less money and less time. You answer: “This method is ___.”',
      ['cost-effective and time-efficient', 'vague and ambiguous', 'accurate and well-defined'],
      'cost-effective and time-efficient', 'هذه هي الجملة التي تجمع المعنيين معًا.'),
  ],
};

const SECTIONS = [s1, s2, s3, s4, s5];

const content = {
  render: 'sections',
  sections: SECTIONS,
};

(async () => {
  // sanity — the exact class of bug that silently breaks a worksheet
  let total = 0;
  const keys = new Set();
  for (const sec of SECTIONS) {
    if (keys.has(sec.key)) throw new Error(`duplicate section key: ${sec.key}`);
    keys.add(sec.key);
    const ids = new Set();
    for (const qq of sec.questions) {
      if (ids.has(qq.id)) throw new Error(`duplicate question id in ${sec.key}: ${qq.id}`);
      ids.add(qq.id);
      if (!qq.explanation) throw new Error(`missing explanation: ${sec.key}/${qq.id}`);
      if (qq.options && !qq.options.includes(qq.correct_answer)) throw new Error(`correct answer not in options: ${sec.key}/${qq.id}`);
      if (qq.options && new Set(qq.options).size !== qq.options.length) throw new Error(`duplicate option: ${sec.key}/${qq.id}`);
    }
    total += sec.questions.length;
    console.log(`  · ${sec.key}: ${sec.questions.length} questions, ${sec.learn.blocks.length} lesson blocks`);
  }
  console.log(`✅ ${SECTIONS.length} sections · ${total} questions validated`);

  const existing = await sql(`select id from class_recaps where student_id=${q(STUDENT_ID)} and class_no=1;`);
  if (Array.isArray(existing) && existing.length) {
    await sql(`update class_recaps set
        title=${q('الحصة الأولى — الدقّة والوضوح')},
        subtitle=${q('accurate · vague · ambiguous · well-defined · cost-effective')},
        class_date=${q('2026-07-27')},
        content=${q(JSON.stringify(content))}
      where id='${existing[0].id}';`);
    console.log('♻️  updated recap', existing[0].id);
  } else {
    const r = await sql(`insert into class_recaps (student_id, class_no, class_date, title, subtitle, content)
      values (${q(STUDENT_ID)}, 1, ${q('2026-07-27')},
        ${q('الحصة الأولى — الدقّة والوضوح')},
        ${q('accurate · vague · ambiguous · well-defined · cost-effective')},
        ${q(JSON.stringify(content))}) returning id;`);
    console.log('✅ inserted recap', r[0].id);
  }

  await sql(`update students set uses_class_notes = true where id = ${q(STUDENT_ID)};`);

  const check = await sql(`select class_no, title,
      jsonb_array_length(content->'sections') sections,
      (select sum(jsonb_array_length(s->'questions')) from jsonb_array_elements(content->'sections') s) questions
    from class_recaps where student_id=${q(STUDENT_ID)};`);
  console.log(JSON.stringify(check, null, 2));
  console.log('gate:', JSON.stringify(await sql(`select uses_class_notes from students where id=${q(STUDENT_ID)};`)));
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
