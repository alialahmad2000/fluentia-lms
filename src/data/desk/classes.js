// Pro Desk — «حصصي» (My Classes): each live 1-on-1 class becomes a guided JOURNEY,
// not one long page. A class is a syllabus of small focused STATIONS (محطات); each
// station is one topic taught in three beats:
//   افهمي (understand)  →  تأكّدي (check)  →  طبّقي (do).
// She learns a piece, checks it, then PRACTICES it — before moving on.
//
// 100% CREDITLESS — authored from the teacher's real class notes, no runtime AI.
// Repeatable SYSTEM: every future class = one new entry with the same chapter shape.
// Warm, feminine-default voice (chrome is gender-aware via useG).
//
// A chapter:
//   { id, ar, en, icon, minutes, goal_ar,
//     concept : [ { ar?, body_ar, model_ar?, examples:[{en,ar?,note_ar?}], rule_ar? } ],
//     check   : [ { q_ar, options:[{en?,ar?,correct,why_ar}] } ],
//     practice: [ <activity> ] }
//
// Practice activity types (all self-checking, creditless):
//   choose    : { title_ar, prompt_ar, options:[{en?,ar?,correct,why_ar}] }
//   fill      : { title_ar, prompt_ar, before, after, options:[{en,correct,why_ar}] }   // "before ___ after"
//   build     : { title_ar, prompt_ar, ar?, words:[...correct order] }                   // arrange word chips
//   classify  : { title_ar, prompt_ar, buckets:[{id,label_ar}], items:[{en,ar?,bucket}] }
//   ladder    : { title_ar, intro_ar, base:{en,ar}, rungs:[{task_ar,en,why_ar}] }
//   fix       : { title_ar, intro_ar, items:[{wrong,right,why_ar}] }
//   irregular : { title_ar, intro_ar, verbs:[{base,past,pp,ar}] }
//   translate : { title_ar, intro_ar, items:[{ar,en,alt_en?}] }

export const DESK_CLASSES = [
  {
    id: 'class-01',
    number: 1,
    date: '2026-07-04',
    title_ar: 'أساسيات القواعد: الجملة والأزمنة',
    title_en: 'Grammar Foundations: Sentences & Tenses',
    tagline_ar: 'أول حصة — بنينا الأساس. راجعيه محطة محطة: افهمي، تأكّدي، وطبّقي على كل جزء.',
    takeaways_ar: [
      'الـ S نضيفها فقط مع الغائب المفرد، وفقط في المضارع البسيط.',
      'أي فعل + ING يصير ثقيل ← يحتاج فعل to be يساعده.',
      'الماضي المستمر = نعدّل فعل be للماضي (was/were) + ING.',
      'فعل be يظهر في ثلاث حالات: الجملة الاسمية، المضارع المستمر، والمبني للمجهول.',
    ],

    chapters: [
      // ── 1 ──────────────────────────────────────────────────────────────
      {
        id: 'sentence-types',
        ar: 'نوع الجملة',
        en: 'Nominal vs Verbal',
        icon: 'AlignRight',
        minutes: 4,
        goal_ar: 'تفرّقين بين الجملة الاسمية والفعلية بثقة.',
        concept: [
          {
            body_ar: 'كل جملة إمّا اسمية أو فعلية. الاسمية ما فيها فعل حركة — تصف حالة وتستخدم فعل الكينونة (to be). الفعلية فيها فعل حقيقي فيه حدث أو حركة.',
            model_ar: 'القاعدة: ما فيه فعل حركة ← اسمية (مع to be). فيه فعل حدث ← فعلية.',
            examples: [
              { en: 'This building is amazing.', ar: 'هذا المبنى رائع.', note_ar: 'اسمية — فعل الكينونة is' },
              { en: 'Ali plays football.', ar: 'علي يلعب كرة القدم.', note_ar: 'فعلية — فعل حركة play' },
            ],
          },
        ],
        check: [
          {
            q_ar: '"This car is fast" — نوع الجملة؟',
            options: [
              { ar: 'اسمية', correct: true, why_ar: 'صح — ما فيها فعل حركة، تستخدم فعل الكينونة is.' },
              { ar: 'فعلية', correct: false, why_ar: 'الفعلية فيها فعل حركة (مثل play)؛ هنا بس is.' },
            ],
          },
        ],
        practice: [
          {
            type: 'classify',
            title_ar: 'صنّفي الجُمل',
            prompt_ar: 'حطّي كل جملة في مكانها الصح:',
            buckets: [{ id: 'nom', label_ar: 'اسمية' }, { id: 'verb', label_ar: 'فعلية' }],
            items: [
              { en: 'The coffee is hot.', bucket: 'nom' },
              { en: 'Sarah writes reports.', bucket: 'verb' },
              { en: 'My laptop is new.', bucket: 'nom' },
              { en: 'The team fixes the server.', bucket: 'verb' },
            ],
          },
        ],
      },

      // ── 2 ──────────────────────────────────────────────────────────────
      {
        id: 'present-simple',
        ar: 'المضارع البسيط وقاعدة الـ S',
        en: 'Present simple & the S rule',
        icon: 'UserRound',
        minutes: 6,
        goal_ar: 'تعرفين متى تضيفين S على الفعل، وليش.',
        concept: [
          {
            ar: 'مين الفاعل؟',
            body_ar: 'قبل ما نصرّف الفعل، نعرف الفاعل مين. ثلاث حالات: المتكلّم، المخاطَب، والغائب.',
            model_ar: 'أنا/نحن = متكلّم (أول) · أنتِ/أنتنّ = مخاطَب (ثاني) · أي شي ثاني = غائب (ثالث).',
            examples: [
              { en: 'He / She / It / Sarah / the teacher / Aramco / Riyadh …', ar: 'كلّها غائب (third person)', note_ar: 'أي شخص أو شي مو موجود في النقاش مباشرة' },
            ],
          },
          {
            ar: 'قاعدة الـ S',
            body_ar: 'إذا كان الفاعل غائبًا ومفردًا في المضارع البسيط، نضيف S على الفعل. شرطان لازم يجتمعان: غائب + مفرد.',
            model_ar: 'القاعدة: غائب مفرد + مضارع بسيط ← نضيف S. وبس مع المضارع البسيط!',
            examples: [
              { en: 'I play football.', ar: 'أنا ألعب — بدون S', note_ar: 'متكلّم' },
              { en: 'Sarah plays football.', ar: 'سارة تلعب — مع S', note_ar: 'غائب مفرد' },
              { en: 'Sarah does her homework.', ar: 'do ← does', note_ar: '' },
            ],
            rule_ar: 'انتبهي: الـ S تنطبق فقط على المضارع البسيط، مو على بقية الأزمنة.',
          },
        ],
        check: [
          {
            q_ar: 'متى نضيف حرف الـ S على الفعل؟',
            options: [
              { ar: 'مع أي فاعل في المضارع', correct: false, why_ar: 'مو مع أي فاعل — بس مع الغائب المفرد.' },
              { ar: 'لما يكون الفاعل غائبًا ومفردًا، في المضارع البسيط فقط', correct: true, why_ar: 'بالضبط — غائب + مفرد + مضارع بسيط.' },
              { ar: 'في كل الأزمنة', correct: false, why_ar: 'لا، الـ S خاصة بالمضارع البسيط فقط.' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_ar: 'املئي الفراغ',
            prompt_ar: 'اختاري الشكل الصح للفعل:',
            before: 'Sarah', after: 'football every day.',
            options: [
              { en: 'play', correct: false, why_ar: 'Sarah غائب مفرد ← لازم plays.' },
              { en: 'plays', correct: true, why_ar: 'صح! غائب مفرد + مضارع بسيط ← plays.' },
              { en: 'is play', correct: false, why_ar: 'ما نجمع is مع الفعل البسيط.' },
            ],
          },
          {
            type: 'build',
            title_ar: 'رتّبي الجملة',
            prompt_ar: 'رتّبي الكلمات لجملة مضارع بسيط صحيحة:',
            ar: 'المهندس يراقب الخوادم.',
            words: ['The', 'engineer', 'monitors', 'the', 'servers'],
          },
        ],
      },

      // ── 3 ──────────────────────────────────────────────────────────────
      {
        id: 'present-progressive',
        ar: 'المضارع المستمر',
        en: 'Present progressive',
        icon: 'Activity',
        minutes: 5,
        goal_ar: 'تكوّنين جملة مستمرة صح مع فعل to be.',
        concept: [
          {
            body_ar: 'المستمر معناه الفعل يحصل الحين، فنضيف ING. وكل فعل معه ING يصير «ثقيل» ويحتاج مساعدة — فعل to be (am / is / are).',
            model_ar: 'الفكرة: الفعل + ING يصير ثقيل ← يحتاج فعل to be يساعده. «play» ٤ حروف، «playing» ٧ حروف — يبي مساعدة!',
            examples: [
              { en: 'Sarah is playing football.', ar: 'سارة تلعب الحين', note_ar: 'is + playing' },
              { en: 'I am doing my homework.', ar: 'أنا أسوّي واجبي الحين', note_ar: 'am + doing' },
            ],
          },
        ],
        check: [
          {
            q_ar: 'ليش الفعل "playing" يحتاج فعل to be قبله؟',
            options: [
              { ar: 'لأن الـ ING خلّت الفعل «ثقيل» فيحتاج مساعدة', correct: true, why_ar: 'نعم — أي فعل + ING يحتاج am/is/are يساعده.' },
              { ar: 'لأنه فعل ماضٍ', correct: false, why_ar: 'مو ماضٍ — الـ ING تدل على الاستمرار في الحاضر.' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_ar: 'املئي الفراغ',
            prompt_ar: 'اختاري فعل to be المناسب:',
            before: 'The servers', after: 'restarting now.',
            options: [
              { en: 'is', correct: false, why_ar: 'servers جمع ← نستخدم are.' },
              { en: 'are', correct: true, why_ar: 'صح — servers جمع ← are restarting.' },
              { en: 'am', correct: false, why_ar: 'am تجي مع I فقط.' },
            ],
          },
          {
            type: 'build',
            title_ar: 'رتّبي الجملة',
            prompt_ar: 'رتّبي كلمات جملة مستمرة صحيحة:',
            ar: 'سارة تلعب كرة القدم الحين.',
            words: ['Sarah', 'is', 'playing', 'football'],
          },
        ],
      },

      // ── 4 ──────────────────────────────────────────────────────────────
      {
        id: 'past',
        ar: 'الماضي: بسيط ومستمر',
        en: 'Past simple & progressive',
        icon: 'History',
        minutes: 6,
        goal_ar: 'تحوّلين الجملة للماضي بنوعيه، وتعرفين الأفعال الشاذة.',
        concept: [
          {
            body_ar: 'الماضي البسيط نستخدم فيه التصريف الثاني للفعل. الماضي المستمر بس نعدّل فعل to be من الحاضر للماضي (is←was، are←were) مع ING.',
            examples: [
              { en: 'I played football.', ar: 'أنا لعبت', note_ar: 'ماضي بسيط — play ← played' },
              { en: 'Sarah was playing football.', ar: 'سارة كانت تلعب', note_ar: 'was + playing' },
              { en: 'We were playing football.', ar: 'كنّا نلعب', note_ar: 'were + playing' },
            ],
            rule_ar: 'بعض الأفعال «شاذة» ما تتبع قاعدة الـ ed — لازم نحفظها.',
          },
        ],
        check: [
          {
            q_ar: 'أكملي: "We ___ playing when the power went off."',
            options: [
              { en: 'was', correct: false, why_ar: 'we جمع ← were.' },
              { en: 'were', correct: true, why_ar: 'صح — we + were + playing (ماضي مستمر).' },
              { en: 'are', correct: false, why_ar: 'are حاضر؛ الجملة في الماضي.' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_ar: 'حوّليها للماضي',
            prompt_ar: 'اختاري الماضي البسيط الصح:',
            before: 'Yesterday she', after: 'the report.',
            options: [
              { en: 'writes', correct: false, why_ar: 'writes مضارع؛ نبغى ماضٍ.' },
              { en: 'wrote', correct: true, why_ar: 'صح — write فعل شاذ: wrote في الماضي.' },
              { en: 'writed', correct: false, why_ar: 'ما نضيف ed للأفعال الشاذة — الصح wrote.' },
            ],
          },
          {
            type: 'irregular',
            title_ar: 'الأفعال الشاذة',
            intro_ar: 'الأفعال اللي أخذناها. حاولي تتذكّرين التصريف، بعدها اقلبي البطاقة.',
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
        ],
      },

      // ── 5 ──────────────────────────────────────────────────────────────
      {
        id: 'questions-negatives',
        ar: 'السؤال والنفي',
        en: 'Questions & negatives',
        icon: 'HelpCircle',
        minutes: 7,
        goal_ar: 'تسوّين سؤال ونفي في كل زمن — درجة درجة.',
        concept: [
          {
            body_ar: 'كل زمن له طريقة نسوّي فيها السؤال والنفي. المضارع البسيط يستخدم do/does، الماضي البسيط يستخدم did، والمستمر يستخدم فعل to be نفسه.',
            examples: [
              { en: 'Do I play?  ·  When do I play?', ar: 'مضارع بسيط', note_ar: 'do/does + فاعل + فعل' },
              { en: 'Are you playing?  ·  When are you playing?', ar: 'مضارع مستمر', note_ar: 'be + فاعل + ING' },
              { en: 'Did I play?  ·  When did I play?', ar: 'ماضي بسيط', note_ar: 'did + فاعل + فعل' },
            ],
            rule_ar: 'أدوات السؤال: When / Where / Who / Whom / Whose / How.',
          },
        ],
        check: [
          {
            q_ar: 'كيف نسوّي سؤال من "You are playing football"؟',
            options: [
              { en: 'Do you playing football?', correct: false, why_ar: 'مع المستمر نستخدم فعل be نفسه، مو do.' },
              { en: 'Are you playing football?', correct: true, why_ar: 'صح — نقدّم فعل be: Are + you + playing.' },
              { en: 'Are you play football?', correct: false, why_ar: 'ناقص الـ ING: Are you playing.' },
            ],
          },
        ],
        practice: [
          {
            type: 'ladder',
            title_ar: 'سلّم الأزمنة',
            intro_ar: 'نفس الجملة، نطلّعها درجة درجة — زي ما مشينا في الحصة. فكّري، بعدها اضغطي «أظهري».',
            base: { en: 'Sarah plays football.', ar: 'سارة تلعب كرة القدم.' },
            rungs: [
              { task_ar: 'خلّيها سؤال (نعم/لا)', en: 'Does Sarah play football?', why_ar: 'مضارع بسيط + غائب مفرد ← does + الفاعل + الفعل بدون S.' },
              { task_ar: 'خلّيها نفي', en: "Sarah doesn't play football.", why_ar: 'does + not = doesn’t، والفعل يرجع بدون S.' },
              { task_ar: 'اسألي بـ When', en: 'When does Sarah play football?', why_ar: 'أداة السؤال When + does + الفاعل + الفعل.' },
              { task_ar: 'حوّليها للماضي البسيط', en: 'Sarah played football.', why_ar: 'التصريف الثاني play ← played.' },
              { task_ar: 'حوّليها للماضي المستمر', en: 'Sarah was playing football.', why_ar: 'was + playing — عدّلنا فعل be للماضي وأضفنا ING.' },
            ],
          },
          {
            type: 'build',
            title_ar: 'ابني السؤال',
            prompt_ar: 'رتّبي كلمات السؤال في المضارع المستمر:',
            ar: 'وين تلعبين كرة القدم؟',
            words: ['Where', 'are', 'you', 'playing', 'football'],
          },
        ],
      },

      // ── 6 ──────────────────────────────────────────────────────────────
      {
        id: 'auxiliaries',
        ar: 'الأفعال المساعدة و be',
        en: 'Auxiliaries & the uses of be',
        icon: 'Wrench',
        minutes: 6,
        goal_ar: 'تعرفين الأفعال المساعدة، ومواضع فعل be الثلاثة.',
        concept: [
          {
            ar: 'الأفعال المساعدة',
            body_ar: 'الأفعال المساعدة تساعد الفعل الأساسي في السؤال والنفي والأزمنة. هذي أهمها بتصريفاتها:',
            examples: [
              { en: 'be → am / is / are · was / were · been', ar: 'الكينونة', note_ar: '' },
              { en: 'do → do / does / did', ar: 'يفعل', note_ar: '' },
              { en: 'have → have / has / had', ar: 'للأزمنة التامة', note_ar: '' },
              { en: 'can → can / could · will → will / would', ar: 'القدرة / المستقبل', note_ar: '' },
            ],
          },
          {
            ar: 'مواضع فعل be',
            body_ar: 'فعل be يظهر في ثلاث حالات مهمة — احفظيها لأنها تتكرر كثيرًا:',
            examples: [
              { en: 'This car is fast.', ar: 'جملة اسمية', note_ar: '1' },
              { en: 'I am playing football.', ar: 'مضارع مستمر', note_ar: '2' },
              { en: 'The palace was built in 1999.', ar: 'مبني للمجهول', note_ar: '3' },
            ],
          },
        ],
        check: [
          {
            q_ar: 'أكملي: "The palace ___ built in 1999."',
            options: [
              { en: 'was', correct: true, why_ar: 'صح — مبني للمجهول في الماضي: was + التصريف الثالث built.' },
              { en: 'is', correct: false, why_ar: 'الحدث في 1999 (ماضٍ) ← was.' },
              { en: 'did', correct: false, why_ar: 'المبني للمجهول يستخدم فعل be (was)، مو did.' },
            ],
          },
        ],
        practice: [
          {
            type: 'classify',
            title_ar: 'صنّفي استخدام be',
            prompt_ar: 'كل جملة فيها فعل be — في أي حالة؟',
            buckets: [{ id: 'nom', label_ar: 'اسمية' }, { id: 'prog', label_ar: 'مستمر' }, { id: 'pass', label_ar: 'مبني للمجهول' }],
            items: [
              { en: 'The room is quiet.', bucket: 'nom' },
              { en: 'She is writing an email.', bucket: 'prog' },
              { en: 'The system was updated last night.', bucket: 'pass' },
            ],
          },
          {
            type: 'fill',
            title_ar: 'اختاري المساعد الصح',
            prompt_ar: 'اختاري الفعل المساعد المناسب للسؤال:',
            before: '', after: 'Sarah finish the report yesterday?',
            options: [
              { en: 'Does', correct: false, why_ar: 'الجملة في الماضي (yesterday) ← Did.' },
              { en: 'Did', correct: true, why_ar: 'صح — ماضٍ بسيط ← Did + الفاعل + الفعل.' },
              { en: 'Is', correct: false, why_ar: 'is للمستمر أو الاسمية، مو لسؤال ماضٍ بسيط.' },
            ],
          },
        ],
      },

      // ── 7 ──────────────────────────────────────────────────────────────
      {
        id: 'preference',
        ar: 'لمسة: التفضيل',
        en: 'Talking about preference',
        icon: 'Sparkles',
        minutes: 4,
        goal_ar: 'تعبّرين عن التفضيل بطلاقة في الشغل والحياة.',
        concept: [
          {
            body_ar: 'مرّينا على التعبير عن التفضيل — مفيد في الشغل والحياة:',
            examples: [
              { en: 'I prefer tea. · I prefer to read. · I prefer reading.', ar: 'أفضّل…', note_ar: 'prefer + اسم / to / -ing' },
              { en: 'I favor this option.', ar: 'أميل لـ / أفضّل', note_ar: 'favor (فعل) · favorite (المفضّل)' },
              { en: 'Do me a favor.', ar: 'اعملي لي معروف', note_ar: 'تعبير جاهز' },
            ],
            rule_ar: 'بعض الأفعال يتبعها -ing أو to (مثل prefer / like / love).',
          },
        ],
        check: [],
        practice: [
          {
            type: 'translate',
            title_ar: 'قوليها بالإنجليزي',
            intro_ar: 'حاولي تقولينها بنفسك، بعدها اكشفي النموذج. أكثر من صياغة تكون صحيحة.',
            items: [
              { ar: 'أفضّل أن أفطر مبكرًا في الصباح.', en: 'I prefer to have breakfast early in the morning.', alt_en: 'I like eating breakfast early in the morning.' },
              { ar: 'اعملي لي معروف.', en: 'Do me a favor.', alt_en: '' },
            ],
          },
          {
            type: 'fix',
            title_ar: 'صحّحيها',
            intro_ar: 'جُمل من حصتك فيها أخطاء. فكّري في التصحيح، بعدها اكشفيه.',
            items: [
              { wrong: 'How many users got impact?', right: 'How many users were impacted?', why_ar: '«got impact» غير سليمة. نقول were impacted أو were affected.' },
              { wrong: 'This issues become showing in the tools.', right: 'The technical issues started showing up on the monitoring tools.', why_ar: '«this» للمفرد و«issues» جمع، و«become showing» غير صحيح. الأصح: started showing up on…' },
            ],
          },
        ],
      },
    ],
  },
]

// ── derived helpers ─────────────────────────────────────────────────────────
export const ALL_CLASSES = [...DESK_CLASSES].sort((a, b) => b.number - a.number) // newest first
export const TOTAL_CLASSES = DESK_CLASSES.length

export function getClass(classId) {
  return DESK_CLASSES.find((c) => c.id === classId) || null
}
export function getChapter(classId, chapterId) {
  const cls = getClass(classId)
  if (!cls) return { cls: null, chapter: null, index: -1, next: null, prev: null }
  const index = cls.chapters.findIndex((ch) => ch.id === chapterId)
  return {
    cls,
    chapter: index >= 0 ? cls.chapters[index] : null,
    index,
    next: index >= 0 && index + 1 < cls.chapters.length ? cls.chapters[index + 1] : null,
    prev: index > 0 ? cls.chapters[index - 1] : null,
  }
}
// count of interactive beats a chapter has (for the 3-dot sub-progress: understand always on)
export function chapterParts(ch) {
  return { understand: true, check: (ch.check?.length || 0) > 0, practice: (ch.practice?.length || 0) > 0 }
}
