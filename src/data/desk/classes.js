// Pro Desk — «حصصي» (My Classes): each live 1-on-1 class, turned into a keepsake
// she can re-open, re-check, and drill. NOT a flat notes dump — a guided debrief:
//   الخلاصة (recap concept cards) → تأكّدي (understanding checks) →
//   مرّني (practice drills) → خلاصة ذهبية (golden takeaways).
//
// 100% CREDITLESS — authored from the teacher's real class notes, no runtime AI.
// Repeatable SYSTEM: every future class = one new entry with the same block types.
// Warm, feminine-default voice (chrome is gender-aware via useG).
//
// Block shapes:
//   recap : [ { id, ar, en, body_ar, model_ar?, examples:[{en, ar?, note_ar?}], rule_ar? } ]
//   check : [ { q_ar, en?, options:[{en?, ar, correct, why_ar}] } ]
//   practice types:
//     ladder    : { title_ar, intro_ar, base:{en,ar}, rungs:[{task_ar, en, why_ar}] }   (retrieve → reveal)
//     fix       : { title_ar, intro_ar, items:[{wrong, right, why_ar}] }                 (spot → reveal)
//     irregular : { title_ar, intro_ar, verbs:[{base, past, pp, ar}] }                   (flip-trainer)
//     translate : { title_ar, intro_ar, items:[{ar, en, alt_en?}] }                      (attempt → reveal)
//     choose    : { title_ar, prompt_ar, options:[{en, ar, correct, why_ar}] }           (auto-check)

export const DESK_CLASSES = [
  {
    id: 'class-01',
    number: 1,
    date: '2026-07-04',
    title_ar: 'أساسيات القواعد: الجملة والأزمنة',
    title_en: 'Grammar Foundations: Sentences & Tenses',
    tagline_ar: 'أول حصة — بنينا الأساس: نوع الجملة، الأزمنة الأربعة، قاعدة الـ S، والأفعال المساعدة. هنا تراجعينها وتثبّتينها.',
    minutes: 16,

    // ── الخلاصة ──────────────────────────────────────────────────────────
    recap: [
      {
        id: 'sentence-types',
        ar: 'نوع الجملة: اسمية أو فعلية',
        en: 'Nominal vs Verbal sentences',
        body_ar: 'كل جملة إمّا اسمية أو فعلية. الاسمية ما فيها فعل حركة — تصف حالة وتستخدم فعل الكينونة (to be). الفعلية فيها فعل حقيقي فيه حركة أو حدث.',
        examples: [
          { en: 'This building is amazing.', ar: 'هذا المبنى رائع.', note_ar: 'اسمية — فعل الكينونة is' },
          { en: 'Ali plays football.', ar: 'علي يلعب كرة القدم.', note_ar: 'فعلية — فعل حركة play' },
        ],
        rule_ar: 'إذا ما فيه فعل حركة → اسمية (مع to be). إذا فيه فعل حدث → فعلية.',
      },
      {
        id: 'four-tenses',
        ar: 'الأزمنة الأربعة',
        en: 'The four tenses',
        body_ar: 'ركّزنا على أربعة أزمنة أساسية — اثنين مضارع واثنين ماضي. هذي خريطتك:',
        examples: [
          { en: 'Present simple — Sarah plays football.', ar: 'مضارع بسيط', note_ar: 'عادة / حقيقة' },
          { en: 'Present progressive — Sarah is playing football.', ar: 'مضارع مستمر', note_ar: 'يحصل الحين' },
          { en: 'Past simple — Sarah played football.', ar: 'ماضي بسيط', note_ar: 'انتهى في الماضي' },
          { en: 'Past progressive — Sarah was playing football.', ar: 'ماضي مستمر', note_ar: 'كان مستمر في الماضي' },
        ],
      },
      {
        id: 'present-simple-person',
        ar: 'المضارع البسيط: مين الفاعل؟',
        en: 'Present simple — who is the subject?',
        body_ar: 'قبل ما نصرّف الفعل، نعرف الفاعل مين. عندنا ثلاث حالات: المتكلّم، المخاطَب، والغائب.',
        model_ar: 'أنا/نحن = متكلّم (أول) · أنتِ/أنتنّ = مخاطَب (ثاني) · أي شي ثاني = غائب (ثالث).',
        examples: [
          { en: 'I / We', ar: 'المتكلّم — first person', note_ar: '' },
          { en: 'You', ar: 'المخاطَب — second person', note_ar: '' },
          { en: 'He / She / It / Sarah / the teacher / Aramco / Riyadh …', ar: 'الغائب — third person', note_ar: 'أي شخص أو شي مو موجود في النقاش مباشرة' },
        ],
      },
      {
        id: 's-rule',
        ar: 'قاعدة الـ S — ليش نضيفها؟',
        en: 'The S rule',
        body_ar: 'إذا كان الفاعل غائبًا ومفردًا (third person singular)، نضيف S على الفعل في المضارع البسيط. شرطين لازم يجتمعان: غائب + مفرد.',
        model_ar: 'القاعدة: غائب مفرد + مضارع بسيط ← نضيف S. وبس مع المضارع البسيط!',
        examples: [
          { en: 'I play football.', ar: 'أنا ألعب — بدون S', note_ar: 'متكلّم' },
          { en: 'Sarah plays football.', ar: 'سارة تلعب — مع S', note_ar: 'غائب مفرد' },
          { en: 'Sarah does her homework.', ar: 'سارة تسوّي واجبها', note_ar: 'do ← does' },
        ],
        rule_ar: 'انتبهي: الـ S تنطبق فقط على المضارع البسيط، مو على بقية الأزمنة.',
      },
      {
        id: 'present-progressive',
        ar: 'المضارع المستمر: الـ ING والفعل الثقيل',
        en: 'Present progressive',
        body_ar: 'المستمر معناه الفعل يحصل الحين، فنضيف ING. وكل فعل معه ING يصير «ثقيل» ويحتاج مساعدة — فعل to be (am / is / are).',
        model_ar: 'الفكرة: الفعل + ING يصير ثقيل ← يحتاج فعل to be يساعده. «play» ٤ حروف، «playing» ٧ حروف — يبي مساعدة!',
        examples: [
          { en: 'Sarah is playing football.', ar: 'سارة تلعب الحين', note_ar: 'is + playing' },
          { en: 'I am doing my homework.', ar: 'أنا أسوّي واجبي الحين', note_ar: 'am + doing' },
        ],
      },
      {
        id: 'past',
        ar: 'الماضي: بسيط ومستمر',
        en: 'Past simple & progressive',
        body_ar: 'الماضي البسيط نستخدم فيه التصريف الثاني للفعل. الماضي المستمر بس نعدّل فعل to be من الحاضر للماضي (is←was، are←were).',
        examples: [
          { en: 'I played football.', ar: 'أنا لعبت', note_ar: 'ماضي بسيط — play ← played' },
          { en: 'Sarah was playing football.', ar: 'سارة كانت تلعب', note_ar: 'was + playing' },
          { en: 'We were playing football.', ar: 'كنّا نلعب', note_ar: 'were + playing' },
        ],
      },
      {
        id: 'questions-negatives',
        ar: 'السؤال والنفي: السلّم',
        en: 'Questions & negatives',
        body_ar: 'كل زمن له طريقة نسوّي فيها السؤال والنفي. المضارع البسيط يستخدم do/does، الماضي البسيط يستخدم did، والمستمر يستخدم فعل to be نفسه.',
        examples: [
          { en: 'Do I play football?  ·  When do I play?', ar: 'مضارع بسيط', note_ar: 'do/does + فاعل + فعل' },
          { en: 'Are you playing?  ·  When are you playing?', ar: 'مضارع مستمر', note_ar: 'be + فاعل + ING' },
          { en: 'Did I play?  ·  When did I play?', ar: 'ماضي بسيط', note_ar: 'did + فاعل + فعل' },
          { en: 'Were we playing?  ·  When were we playing?', ar: 'ماضي مستمر', note_ar: 'were + فاعل + ING' },
        ],
        rule_ar: 'أدوات السؤال: When / Where / Who / Whom / Whose / How.',
      },
      {
        id: 'auxiliaries',
        ar: 'الأفعال المساعدة',
        en: 'Auxiliary (helping) verbs',
        body_ar: 'الأفعال المساعدة تساعد الفعل الأساسي في السؤال والنفي والأزمنة. هذي أهمها بتصريفاتها:',
        examples: [
          { en: 'be → am / is / are · was / were · been', ar: 'الكينونة', note_ar: '' },
          { en: 'do → do / does / did', ar: 'يفعل', note_ar: '' },
          { en: 'have → have / has / had', ar: 'يملك', note_ar: '' },
          { en: 'can → can / could', ar: 'يقدر', note_ar: '' },
          { en: 'will → will / would', ar: 'سوف', note_ar: '' },
        ],
      },
      {
        id: 'be-uses',
        ar: 'استخدامات فعل be',
        en: 'Where "be" shows up',
        body_ar: 'فعل be يظهر في ثلاث حالات مهمة — احفظيها لأنها تتكرر كثيرًا:',
        examples: [
          { en: 'This car is fast.', ar: 'جملة اسمية', note_ar: '1' },
          { en: 'I am playing football.', ar: 'مضارع مستمر', note_ar: '2' },
          { en: 'The palace was built in 1999.', ar: 'مبني للمجهول (passive)', note_ar: '3' },
        ],
      },
      {
        id: 'preference-vocab',
        ar: 'لمسة مفردات: التفضيل',
        en: 'Bonus: talking about preference',
        body_ar: 'مرّينا كمان على التعبير عن التفضيل — مفيد في الشغل والحياة:',
        examples: [
          { en: 'I prefer tea. · I prefer to read. · I prefer reading.', ar: 'أفضّل…', note_ar: 'prefer + اسم / to / -ing' },
          { en: 'I favor this option.', ar: 'أميل لـ / أفضّل', note_ar: 'favor (فعل) · favorite (المفضّل)' },
          { en: 'Do me a favor.', ar: 'اعملي لي معروف', note_ar: 'تعبير جاهز' },
        ],
        rule_ar: 'بعض الأفعال يتبعها -ing أو to (مثل prefer / like / love).',
      },
    ],

    // ── تأكّدي إنك فهمتِ ─────────────────────────────────────────────────
    check: [
      {
        q_ar: 'أكملي: "Sarah ___ football." (مضارع بسيط)',
        options: [
          { en: 'play', ar: '', correct: false, why_ar: 'Sarah غائب مفرد، فلازم نضيف S في المضارع البسيط.' },
          { en: 'plays', ar: '', correct: true, why_ar: 'صح! غائب مفرد + مضارع بسيط ← نضيف S.' },
          { en: 'is play', ar: '', correct: false, why_ar: 'ما نجمع is مع الفعل البسيط. is تجي مع ING (is playing).' },
        ],
      },
      {
        q_ar: 'متى نضيف حرف الـ S على الفعل؟',
        options: [
          { en: '', ar: 'مع أي فاعل في المضارع', correct: false, why_ar: 'مو مع أي فاعل — بس مع الغائب المفرد.' },
          { en: '', ar: 'لما يكون الفاعل غائبًا ومفردًا، في المضارع البسيط فقط', correct: true, why_ar: 'بالضبط — غائب + مفرد + مضارع بسيط.' },
          { en: '', ar: 'في كل الأزمنة', correct: false, why_ar: 'لا، الـ S خاصة بالمضارع البسيط فقط.' },
        ],
      },
      {
        q_ar: 'ليش الفعل "playing" يحتاج فعل to be قبله؟',
        options: [
          { en: '', ar: 'لأن الـ ING خلّت الفعل «ثقيل» فيحتاج مساعدة', correct: true, why_ar: 'نعم — أي فعل + ING يحتاج am/is/are يساعده.' },
          { en: '', ar: 'لأنه فعل ماضٍ', correct: false, why_ar: 'مو ماضٍ — الـ ING تدل على الاستمرار في الحاضر.' },
          { en: '', ar: 'ما يحتاج شي، نقدر نقول "Sarah playing"', correct: false, why_ar: '«Sarah playing» ناقصة — لازم «Sarah is playing».' },
        ],
      },
      {
        q_ar: '"This car is fast" — نوع الجملة؟',
        options: [
          { en: '', ar: 'اسمية', correct: true, why_ar: 'صح — ما فيها فعل حركة، تستخدم فعل الكينونة is.' },
          { en: '', ar: 'فعلية', correct: false, why_ar: 'الفعلية فيها فعل حركة (مثل play)؛ هنا بس is.' },
        ],
      },
      {
        q_ar: 'أكملي: "The palace ___ built in 1999."',
        options: [
          { en: 'was', ar: '', correct: true, why_ar: 'صح — مبني للمجهول في الماضي: was + التصريف الثالث built.' },
          { en: 'is', ar: '', correct: false, why_ar: 'الحدث في 1999 (ماضٍ)، فنستخدم was مو is.' },
          { en: 'did', ar: '', correct: false, why_ar: 'المبني للمجهول يستخدم فعل be (was)، مو did.' },
        ],
      },
      {
        q_ar: 'كيف نسوّي سؤال من "You are playing football"؟',
        options: [
          { en: 'Do you playing football?', ar: '', correct: false, why_ar: 'مع المستمر نستخدم فعل be نفسه، مو do.' },
          { en: 'Are you playing football?', ar: '', correct: true, why_ar: 'صح — نقدّم فعل be: Are + you + playing.' },
          { en: 'Are you play football?', ar: '', correct: false, why_ar: 'ناقص الـ ING: Are you playing.' },
        ],
      },
    ],

    // ── مرّني ────────────────────────────────────────────────────────────
    practice: [
      {
        type: 'ladder',
        title_ar: 'سلّم الأزمنة',
        intro_ar: 'نفس الجملة، نطلّعها درجة درجة — بالضبط زي ما مشينا في الحصة. فكّري في كل درجة، بعدها اضغطي «أظهري الإجابة» وتأكّدي.',
        base: { en: 'Sarah plays football.', ar: 'سارة تلعب كرة القدم.' },
        rungs: [
          { task_ar: 'خلّيها سؤال (نعم/لا)', en: 'Does Sarah play football?', why_ar: 'مضارع بسيط + غائب مفرد ← does + الفاعل + الفعل بدون S.' },
          { task_ar: 'خلّيها نفي', en: "Sarah doesn't play football.", why_ar: 'does + not = doesn’t، والفعل يرجع بدون S.' },
          { task_ar: 'اسألي بـ When', en: 'When does Sarah play football?', why_ar: 'أداة السؤال When + does + الفاعل + الفعل.' },
          { task_ar: 'حوّليها للماضي البسيط', en: 'Sarah played football.', why_ar: 'التصريف الثاني play ← played (ما نحتاج S في الماضي).' },
          { task_ar: 'حوّليها للماضي المستمر', en: 'Sarah was playing football.', why_ar: 'was + playing — عدّلنا فعل be للماضي وأضفنا ING.' },
        ],
      },
      {
        type: 'fix',
        title_ar: 'صحّحيها',
        intro_ar: 'هذي جُمل من حصتك فيها أخطاء بسيطة. فكّري في التصحيح، بعدها اكشفي الإجابة.',
        items: [
          { wrong: 'This issues become showing in the tools.', right: 'The technical issues started showing up on the monitoring tools.', why_ar: '«this» للمفرد و«issues» جمع، و«become showing» تركيب غير صحيح. الأصح: started showing up on… + وصف واضح (monitoring tools).' },
          { wrong: 'How many users got impact?', right: 'How many users were impacted?', why_ar: '«got impact» غير سليمة. نقول were impacted أو were affected — أوضح وأصح.' },
          { wrong: 'Sarah play football every day.', right: 'Sarah plays football every day.', why_ar: 'Sarah غائب مفرد في المضارع البسيط ← نضيف S: plays.' },
        ],
      },
      {
        type: 'irregular',
        title_ar: 'الأفعال الشاذة',
        intro_ar: 'الأفعال اللي أخذناها ما تتبع قاعدة الـ ed. شوفي التصريف، حاولي تتذكّرينه، بعدها اقلبي البطاقة.',
        verbs: [
          { base: 'go', past: 'went', pp: 'gone', ar: 'يذهب' },
          { base: 'cost', past: 'cost', pp: 'cost', ar: 'يكلّف' },
          { base: 'cut', past: 'cut', pp: 'cut', ar: 'يقطع' },
          { base: 'build', past: 'built', pp: 'built', ar: 'يبني' },
          { base: 'sleep', past: 'slept', pp: 'slept', ar: 'ينام' },
          { base: 'be', past: 'was / were', pp: 'been', ar: 'يكون' },
          { base: 'think', past: 'thought', pp: 'thought', ar: 'يفكّر' },
          { base: 'buy', past: 'bought', pp: 'bought', ar: 'يشتري' },
        ],
      },
      {
        type: 'translate',
        title_ar: 'قوليها بالإنجليزي',
        intro_ar: 'حاولي تقولينها بنفسك بالإنجليزي، بعدها اكشفي النموذج. أكثر من صياغة تكون صحيحة.',
        items: [
          { ar: 'أفضّل أن أفطر مبكرًا في الصباح.', en: 'I prefer to have breakfast early in the morning.', alt_en: 'I like eating breakfast early in the morning.' },
          { ar: 'اعملي لي معروف.', en: 'Do me a favor.', alt_en: '' },
          { ar: 'سارة تسوّي واجبها الحين.', en: 'Sarah is doing her homework.', alt_en: '' },
          { ar: 'القصر بُني في ١٩٩٩.', en: 'The palace was built in 1999.', alt_en: '' },
        ],
      },
      {
        type: 'choose',
        title_ar: 'اختاري الزمن الصح',
        prompt_ar: 'أكملي: "I ___ football every day." (عادة يومية)',
        options: [
          { en: 'play', ar: 'ألعب', correct: true, why_ar: 'العادة اليومية = مضارع بسيط، والفاعل I ما ياخذ S.' },
          { en: 'am playing', ar: 'ألعب الحين', correct: false, why_ar: 'المستمر يوصف شي يحصل الحين، مو عادة يومية.' },
          { en: 'was playing', ar: 'كنت ألعب', correct: false, why_ar: 'هذا ماضٍ مستمر — «every day» تدل على عادة حاضرة.' },
        ],
      },
    ],

    // ── خلاصة ذهبية ──────────────────────────────────────────────────────
    takeaways_ar: [
      'الـ S نضيفها فقط مع الغائب المفرد، وفقط في المضارع البسيط.',
      'أي فعل + ING يصير ثقيل ← يحتاج فعل to be يساعده.',
      'الماضي المستمر = نعدّل فعل be للماضي (was/were) + ING.',
      'فعل be يظهر في ثلاث حالات: الجملة الاسمية، المضارع المستمر، والمبني للمجهول.',
    ],
  },
]

// ── derived helpers ─────────────────────────────────────────────────────────
export const ALL_CLASSES = [...DESK_CLASSES].sort((a, b) => b.number - a.number) // newest first
export const TOTAL_CLASSES = DESK_CLASSES.length

export function getClass(classId) {
  return DESK_CLASSES.find((c) => c.id === classId) || null
}
