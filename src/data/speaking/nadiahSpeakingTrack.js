// «مسار نادية للتحدث» — a speaking program built ENTIRELY from Nadiah's own
// recordings (5 graded speaking_recordings, Apr–May 2026). Every drill below is a
// mistake SHE actually made, so the hub feels unmistakably hers. Creditless: the
// fix-it drills self-check via checkAnswer() in ./sentenceBuilder.js — no runtime AI.
//
// Per-student: gated by students.uses_speaking_track. To build the same for another
// learner, author their own focus set from THEIR speaking_recordings evaluations.
// Female Arabic (Nadiah). Brand طلاقة.

// Her real graded recordings — she watches this climb.
export const SCORE_TREND = [
  { date: '2026-04-10', topic_ar: 'البحر والمحيط', overall: 5.6, grammar: 5.0, vocab: 5.5 },
  { date: '2026-04-15', topic_ar: 'السلامة من الزلازل', overall: 5.4, grammar: 5.0, vocab: 5.5 },
  { date: '2026-04-15', topic_ar: 'الذكاء الاصطناعي', overall: 6.6, grammar: 6.5, vocab: 7.5 },
  { date: '2026-05-01', topic_ar: 'ثقافة القهوة', overall: 6.2, grammar: 5.5, vocab: 7.0 },
  { date: '2026-05-04', topic_ar: 'ثقافة القهوة', overall: 5.8, grammar: 5.0, vocab: 5.5 },
]

export const DIAGNOSIS = {
  strength_ar: 'مفرداتكِ قويّة — توصلين أفكاراً كاملة ومترابطة عن مواضيع صعبة (القهوة، الذكاء الاصطناعي، الزلازل، البحر).',
  ceiling_ar: 'اللي يوقف درجتكِ هو دقّة القواعد وأنتِ تتكلمين — درجة القواعد هي الأقل في كل تسجيلاتكِ (٥ إلى ٦٫٥).',
  insight_ar: 'الحلو إن أخطاءكِ مو عشوائية — تتكرر في ٦ أنماط بالضبط. لو أتقنتِ هذي الستة، درجتكِ في التحدّث بترتفع بوضوح.',
  encourage_ar: 'أنتِ مو مبتدئة — أنتِ متحدّثة B1 تحتاج صقل. خلّينا نصقل هذي الستة واحدة واحدة.',
}

// Each focus area = one recurring error family, with drills = HER real mistakes.
export const FOCUS_AREAS = [
  {
    id: 'verb-forms',
    title_ar: 'صياغة الأفعال',
    en: 'Verb forms',
    blurb_ar: 'أكثر خطأ يتكرر عندكِ: جمع فعلين، أو نسيان -ing، أو عدم مطابقة الفعل للفاعل.',
    why_ar: 'ما نقدر نحط فعلين رئيسيين ورا بعض؛ وبعد like/enjoy نستخدم الفعل بصيغة -ing؛ ومع he/she/it/الاسم المفرد نضيف s للفعل.',
    items: [
      { type: 'fix', broken: 'I became prefer V60 coffee.', model: 'I have come to prefer V60 coffee.', alt: ['I started preferring V60 coffee.'], rule_ar: 'للتعبير عن تغيّر تدريجي في التفضيل: have come to prefer (مو became prefer).' },
      { type: 'fix', broken: 'I like watch documentaries.', model: 'I like watching documentaries.', alt: ['I enjoy watching documentaries.'], rule_ar: 'بعد like/enjoy يجي الفعل بصيغة -ing: like watching.' },
      { type: 'fix', broken: 'a documentary that talk about the ocean', model: 'a documentary that talks about the ocean', rule_ar: 'الفاعل المفرد (documentary) يأخذ فعلاً بـ s: talks.' },
      { type: 'fix', broken: 'They became habit at preparing it at home.', model: 'They have become skilled at preparing it at home.', alt: ['They got good at preparing it at home.'], rule_ar: 'became habit تركيب غير صحيح؛ استخدمي have become skilled at أو got good at.' },
    ],
  },
  {
    id: 'articles',
    title_ar: 'أدوات التعريف والعدّ',
    en: 'Articles & countability',
    blurb_ar: 'كثير تنسين a / an / the، أو تنسين جمع الاسم بعد رقم.',
    why_ar: 'قبل كل اسم مفرد قابل للعدّ لازم a/an/the؛ وبعد الرقم يصير الاسم جمع (two hours مو two hour).',
    items: [
      { type: 'fix', broken: 'It became important part from our daily lives.', model: 'It has become an important part of our daily lives.', rule_ar: 'an قبل important part، و of مو from.' },
      { type: 'fix', broken: 'There is sea about two hour away from me.', model: 'There is a sea about two hours away from me.', alt: ['The sea is about two hours away from me.'], rule_ar: 'a قبل sea، و hours (جمع) بعد الرقم.' },
      { type: 'fix', broken: 'coral reef, color fish, and sea turtle', model: 'coral reefs, colorful fish, and sea turtles', rule_ar: 'colorful (صفة) مو color (اسم)، والأسماء تصير جمع.' },
      { type: 'fix', broken: 'pack an emergency kit contain water, flashlight and first aid', model: 'pack an emergency kit containing water, a flashlight, and a first aid kit', rule_ar: 'containing (وصف للحقيبة)، و a قبل flashlight و first aid kit.' },
    ],
  },
  {
    id: 'prepositions',
    title_ar: 'حروف الجر',
    en: 'Prepositions',
    blurb_ar: 'حرف الجر الخطأ يغيّر المعنى: of / about / to / by.',
    why_ar: 'كل فعل أو اسم يرتبط بحرف جر معيّن — لازم نحفظها كـ«رزمة»: part OF، worried ABOUT، think ABOUT، contribute TO، by + طريقة.',
    items: [
      { type: 'fix', broken: 'an important part from our daily lives', model: 'an important part of our daily lives', rule_ar: 'part OF (مو from).' },
      { type: 'fix', broken: 'I will be worried of aftershocks.', model: 'I will be worried about aftershocks.', alt: ['Stay alert for aftershocks.'], rule_ar: 'worried ABOUT (مو of).' },
      { type: 'fix', broken: 'I feel panicked when I think shark.', model: 'I feel panicked when I think about sharks.', rule_ar: 'think ABOUT + الاسم جمع/معرّف (sharks).' },
      { type: 'fix', broken: 'AI contributes largely in facilitating learning.', model: 'AI largely contributes to facilitating learning.', rule_ar: 'contribute TO (مو in)، و largely قبل الفعل.' },
      { type: 'fix', broken: 'protect yourself through taking shelter under the table', model: 'protect yourself by taking shelter under the table', rule_ar: 'الطريقة تجي بـ by + فعل-ing (مو through).' },
    ],
  },
  {
    id: 'present-perfect',
    title_ar: 'المضارع التام',
    en: 'Present perfect',
    blurb_ar: 'للتغيّر اللي بدأ بالماضي ومستمر للحين، استخدمي has/have + التصريف الثالث.',
    why_ar: 'لمّا الشيء تغيّر وما زال مستمراً حتى الآن: has become / has transformed — مو became / changed.',
    items: [
      { type: 'fix', broken: 'It became an important part of our daily lives.', model: 'It has become an important part of our daily lives.', rule_ar: 'has become (تغيّر مستمر للحين).' },
      { type: 'fix', broken: 'AI radically changed education.', model: 'AI has radically transformed education.', alt: ['AI has radically changed education.'], rule_ar: 'has transformed (أقوى من changed) للتغيّر المستمر.' },
      { type: 'fix', broken: 'Coffee shops became very widespread.', model: 'Coffee shops have become very widespread.', rule_ar: 'have become — الظاهرة ما زالت مستمرة.' },
    ],
  },
  {
    id: 'pronouns',
    title_ar: 'وضوح الضمائر',
    en: 'Clear pronouns',
    blurb_ar: 'أحياناً تستخدمين she / it / they بدون مرجع واضح، فتلخبط المستمع.',
    why_ar: 'كل ضمير لازم يرجع لشيء واضح ذكرتيه. لو تتكلمين عن ظاهرة، استخدمي This بدل She.',
    items: [
      { type: 'fix', broken: 'She added a change in the economy.', model: 'This has also brought about changes in the economy.', alt: ['This has contributed to changes in the economy.'], rule_ar: 'She ما لها مرجع؛ الظاهرة = This، والفعل brought about / contributed to.' },
      { type: 'fix', broken: 'It may weaken the mind skills for it because they depend on that.', model: 'It may weaken students critical thinking because they rely on it too heavily.', rule_ar: 'حدّدي المرجع: students / critical thinking / rely on it — بدل it/they/that المبهمة.' },
    ],
  },
  {
    id: 'tense-consistency',
    title_ar: 'ثبات الزمن',
    en: 'Tense consistency',
    blurb_ar: 'لا تخلطين الأزمنة في نفس الكلام — اختاري زمناً وثبتي عليه.',
    why_ar: 'لو تعطين تعليمات، استخدمي صيغة الأمر أو المضارع البسيط طول الكلام؛ ولو تحكين قصة ماضية، ثبتي على الماضي.',
    items: [
      { type: 'fix', broken: 'After the earthquake, I am making sure my family is safe.', model: 'After the earthquake, make sure your family is safe.', alt: ['After the earthquake, I make sure my family is safe.'], rule_ar: 'التعليمات بصيغة الأمر: make sure (ثبات على نمط واحد).' },
      { type: 'fix', broken: 'I present first aid for the injured.', model: 'Provide first aid to the injured.', alt: ['I provide first aid to the injured.'], rule_ar: 'provide/administer first aid TO (مو present … for).' },
    ],
  },
  {
    id: 'word-precision',
    title_ar: 'دقّة المفردة',
    en: 'Word precision',
    blurb_ar: 'أحياناً تترجمين حرفياً من العربي فتطلع كلمة غير دقيقة.',
    why_ar: 'انتبهي للكلمات المتشابهة (false friends) وللترجمة الحرفية — اختاري الكلمة الإنجليزية الطبيعية.',
    items: [
      { type: 'fix', broken: 'Artificial intelligence is a global revelation.', model: 'Artificial intelligence is a global revolution.', rule_ar: 'revolution (ثورة) مو revelation (وحي/كشف).' },
      { type: 'fix', broken: 'I am upset with its rich and bitter taste.', model: 'I love its rich and slightly bitter taste.', alt: ['I really enjoy its rich, slightly bitter taste.'], rule_ar: 'upset = منزعجة! للإعجاب بالطعم: love / enjoy.' },
      { type: 'fix', broken: 'From a functional perspective, AI helps companies.', model: 'From a professional perspective, AI helps companies.', rule_ar: 'professional / career-related (مو functional) للسياق المهني.' },
    ],
  },
]
