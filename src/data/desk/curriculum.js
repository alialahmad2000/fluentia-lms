// Pro Desk — the professional English CURRICULUM ("المسار").
//
// This is NOT a course of scenarios. It's a structured competency track an IT
// professional would respect: five tracks, seventeen self-contained lessons,
// weighted toward the real blockers of working in English (on-call reflexes,
// meetings, writing-for-work, technical fluency, the human layer) — grammar is
// embedded in context, never drilled abstractly.
//
// It lives in the repo (not the DB) on purpose: this is authored editorial
// content, so it is 100% CREDITLESS (works with the AI budget at zero) and
// touches no student tables. Each lesson can deep-link to its matching roleplay
// scenario (resolved at runtime by module_number), so the curriculum and the
// Scenarios surface become one integrated system — learn here, apply live there.
//
// Section shapes a lesson may carry (all optional except idea + takeaway):
//   idea    : { body_ar, model_ar }                         the concept + the mental model
//   phrases : [ { en, ar, when_ar } ]                        model phrases, tap-to-hear
//   terms   : [ { term, ar, def_en, example } ]              vocabulary (term-heavy lessons)
//   example : { setting_ar, lines: [ { who, en, ar } ] }     a worked mini-dialogue
//   practice: { type, prompt_ar, ... }                       one real practice beat
//   takeaway_ar                                              the one line to remember
//
// Practice types (all self-checking, creditless):
//   choose  : { options: [ { en, ar, correct, why_ar } ] }   pick the most natural line
//   order   : { steps: [ { en, ar } ] }  (stored in CORRECT order; UI shuffles)
//   reflect : { hint_ar }                                    write/say your own — links to a scenario
//
// Copy is warm, feminine-default (both current Desk users are women); the UI
// chrome around it is gender-aware via useG.

export const CURRICULUM_TRACKS = [
  // ───────────────────────────────────────────────────────────── Track 1
  {
    id: 'reflexes',
    order: 1,
    icon: 'Zap',
    ar: 'ردود الفعل',
    en: 'Call Reflexes',
    tagline_ar: 'العبارات اللي تفكّ أي مكالمة، وتخليك ماسكة زمامها من أول دقيقة.',
    lessons: [
      {
        id: 'reflex-clarify',
        order: 1,
        ar: 'اطلبي التوضيح',
        en: 'Ask them to repeat',
        minutes: 7,
        outcome_ar: 'توقفين المتكلّم بأدب وتطلبين إعادة أو تهجئة، بدون إحراج ولا تخمين.',
        scenarioModuleNumber: 4,
        idea: {
          body_ar:
            'في أي مكالمة بتفوتك كلمات — خصوصاً على خط الهاتف، وخصوصاً الأسماء والأرقام والمصطلحات التقنية. الحركة الاحترافية مو إنك تخمّنين وتكمّلين، الحركة إنك تطلبين التوضيح بسرعة وبنظافة، بدون دوّامة اعتذارات.',
          model_ar: 'القاعدة: طلب التوضيح قوّة، مو ضعف. سؤال واضح يحافظ على دقّة المكالمة.',
        },
        phrases: [
          { en: 'Sorry, could you say that again?', ar: 'آسفة، ممكن تعيدها؟', when_ar: 'فاتتك جملة كاملة' },
          { en: 'Could you spell that for me?', ar: 'ممكن تتهجّاها لي؟', when_ar: 'اسم، أو hostname، أو رقم تذكرة' },
          { en: "You're breaking up — I only caught the first part.", ar: 'الصوت متقطّع، وصلني أوله بس.', when_ar: 'الخط سيّئ' },
          { en: 'Just to make sure — you said the payment service, right?', ar: 'بس عشان أتأكد، قصدك خدمة الدفع، صح؟', when_ar: 'تثبّتين كلمة مفتاحية' },
          { en: 'Could you slow down a little? I want to get this exactly right.', ar: 'ممكن تخفّف شوي؟ أبغى أضبطها بالظبط.', when_ar: 'المتكلّم سريع' },
        ],
        example: {
          setting_ar: 'أرجون، من فريق قواعد البيانات في بنغالور، يعطيكِ اسم الخادم بسرعة.',
          lines: [
            { who: 'Arjun', en: 'Okay, connect to db-prod-fra-07 and check the replica.', ar: 'تمام، اتّصلي بـ db-prod-fra-07 وتأكّدي من النسخة.' },
            { who: 'You', en: "Sorry, could you spell the hostname for me?", ar: 'آسفة، ممكن تتهجّى اسم الخادم لي؟' },
            { who: 'Arjun', en: 'Sure — d, b, dash, p, r, o, d, dash, f, r, a, dash, zero, seven.', ar: 'أكيد — d b - p r o d - f r a - 0 7.' },
            { who: 'You', en: 'Got it — db-prod-fra-07. Thanks.', ar: 'وصلت — db-prod-fra-07. شكراً.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'المتكلّم قال اسم خادم بسرعة وما لحقتيه. أنسب طريقة تطلبين فيها التهجئة؟',
          options: [
            { en: 'What? Repeat.', ar: 'وش؟ عيد.', correct: false, why_ar: 'مباشرة بزيادة، تنقصها اللباقة.' },
            { en: 'Could you spell that for me?', ar: 'ممكن تتهجّاها لي؟', correct: true, why_ar: 'واضحة، مهذّبة، وتضمن إنك تكتبينه صح.' },
            { en: "Sorry sorry, I'm so bad at this, can you maybe say it slowly again please?", ar: 'آسفة آسفة، أنا ضعيفة بهالشي، ممكن تعيدها على مهلك مرة ثانية لو سمحت؟', correct: false, why_ar: 'دوّامة اعتذار تضعّف موقفك؛ الطلب النظيف أقوى.' },
          ],
        },
        takeaway_ar: 'ما تخسرين شي لو طلبتِ الإعادة — تخسرين لو خمّنتِ غلط.',
      },
      {
        id: 'reflex-buy-time',
        order: 2,
        ar: 'اكسبي وقت للتفكير',
        en: 'Buy a moment',
        minutes: 6,
        outcome_ar: 'تملّين لحظة الصمت بجملة تبيّن ثقتك، بدل ما تجاوبين على عجل.',
        idea: {
          body_ar:
            'الصمت في المكالمة يحسّونه فشل، فنطلق أول جواب يجينا. البديل إنك تفكّرين بصوت: جملة قصيرة تشتري لك ثواني وتبيّن إنك تشتغلين، مو إنك علّقتِ.',
          model_ar: 'القاعدة: فكّري بصوت، لا تصمتي. الوقت اللي تشترينه بجملة يوفّر عليك جواب غلط.',
        },
        phrases: [
          { en: 'Let me check that.', ar: 'خلّيني أتأكد.', when_ar: 'قبل ما تعطين رقم أو تفصيل' },
          { en: 'Give me one second.', ar: 'ثانية وحدة.', when_ar: 'تحتاجين لحظة تركيز' },
          { en: 'Good question — let me think for a moment.', ar: 'سؤال زين، خلّيني أفكّر لحظة.', when_ar: 'سؤال يحتاج تفكير' },
          { en: 'Let me pull that up.', ar: 'خلّيني أفتحها.', when_ar: 'تفتحين لوحة أو تذكرة' },
          { en: "I want to get this right, so bear with me.", ar: 'أبغى أضبطها، تحمّلني شوي.', when_ar: 'تحتاجين وقت أطول شوي' },
        ],
        example: {
          setting_ar: 'المدير يسألك عن رقم ما تحفظينه، وأنت قدّام اللوحة.',
          lines: [
            { who: 'Manager', en: 'How many users were affected exactly?', ar: 'كم مستخدم تأثّر بالضبط؟' },
            { who: 'You', en: 'Let me pull that up — one second.', ar: 'خلّيني أفتحها — ثانية وحدة.' },
            { who: 'You', en: 'Okay, it was about eighteen percent of active users.', ar: 'تمام، تقريباً ثمانية عشر بالمية من المستخدمين النشطين.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'تحتاجين ١٠ ثواني تفتحين فيها رسمًا بيانيًا قبل ما تجاوبين. وش تقولين؟',
          options: [
            { en: 'Umm… uhh… I think… maybe…', ar: 'إمم… آه… أظن… يمكن…', correct: false, why_ar: 'التردّد المسموع يضعّف الثقة.' },
            { en: 'Let me pull that up — one second.', ar: 'خلّيني أفتحها — ثانية وحدة.', when_ar: '', correct: true, why_ar: 'تشتري وقت وتبيّن إنك تشتغلين على جواب دقيق.' },
            { en: "I don't know.", ar: 'ما أدري.', correct: false, why_ar: 'أحياناً صحيحة، لكن هنا عندك المعلومة، بس تحتاجين تفتحينها.' },
          ],
        },
        takeaway_ar: 'الوقت اللي تشترينه بجملة، يوفّر عليك جواب غلط.',
      },
      {
        id: 'reflex-readback',
        order: 3,
        ar: 'أكّدي الفهم — اقرئيها مرتجعة',
        en: 'Read it back',
        minutes: 7,
        outcome_ar: 'تكرّرين التفصيل المهم بكلماتك عشان تمسكين أي سوء فهم وهو رخيص.',
        idea: {
          body_ar:
            'أغلى الأخطاء تجي من «أنا فهمت إنك تقصد…». القراءة المرتجعة — إنك تعيدين المهم بكلماتك وتسألين «صح؟» — تمسك الخطأ وهو لسه رخيص، قبل ما يصير حادثة.',
          model_ar: 'القاعدة: كرّري المهم بكلماتك. ثوانٍ تكلّفك، وساعات توفّرها.',
        },
        phrases: [
          { en: 'So just to confirm — restart the node, not the whole cluster?', ar: 'بس للتأكيد — أعيد تشغيل العقدة، مو الكلستر كامل؟', when_ar: 'أمر فيه لبس' },
          { en: "What I'm hearing is… is that right?", ar: 'اللي فهمته هو… صح كذا؟', when_ar: 'تلخّصين طلب طويل' },
          { en: 'Let me read that back: ticket 4471, priority high.', ar: 'خلّيني أعيدها: تذكرة ٤٤٧١، أولوية عالية.', when_ar: 'أرقام وتفاصيل' },
          { en: 'So the plan is X, then Y. Did I get that right?', ar: 'يعني الخطة X ثم Y. فهمتها صح؟', when_ar: 'خطوات بترتيب' },
          { en: 'Just to be clear on the deadline — end of day today, your time?', ar: 'بس أوضّح الموعد — نهاية اليوم، بتوقيتك؟', when_ar: 'مواعيد وتوقيتات' },
        ],
        example: {
          setting_ar: 'نهاية مكالمة جسر، قبل ما تتفرّقون تقرئين المهمة المرتجعة.',
          lines: [
            { who: 'Lead', en: 'Okay Sara, you take the database failover after we roll back.', ar: 'تمام سارة، أنتِ تاخذين تحويل قاعدة البيانات بعد ما نتراجع.' },
            { who: 'You', en: 'Let me read that back: you roll back first, then I trigger the failover. Right?', ar: 'خلّيني أعيدها: أنتم تتراجعون أول، بعدها أنا أشغّل التحويل. صح؟' },
            { who: 'Lead', en: 'Exactly.', ar: 'بالضبط.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'رتّبي قراءة مرتجعة قوية:',
          steps: [
            { en: 'So just to confirm —', ar: 'بس للتأكيد —' },
            { en: 'I restart the node, not the whole cluster,', ar: 'أعيد تشغيل العقدة، مو الكلستر كامل،' },
            { en: 'after you finish the rollback.', ar: 'بعد ما تخلّصون التراجع.' },
            { en: 'Did I get that right?', ar: 'فهمتها صح؟' },
          ],
        },
        takeaway_ar: 'القراءة المرتجعة تكلّف ثواني وتوفّر ساعات.',
      },
      {
        id: 'reflex-pushback',
        order: 4,
        ar: 'اعترضي بأدب',
        en: 'Push back cleanly',
        minutes: 8,
        outcome_ar: 'تقولين «لا» أو «مو الحين» لزميل أو مدير، بطريقة تحمي النظام والعلاقة.',
        idea: {
          body_ar:
            'بتحتاجين تقولين «لا» أو «مو الحين» أو «هذا ما بيمشي» — لزميل، وأحياناً لمدير. لو صار بطريقة صح، يحمي النظام والعلاقة مع بعض. السرّ: اعترضي على الفكرة مو على الشخص، وقدّمي بديل.',
          model_ar: 'القاعدة: اعترضي على الفكرة لا على الشخص — و«لا» المهنية دايماً معها «بدال كذا…».',
        },
        phrases: [
          { en: "I see what you mean, but I'm worried about the rollback.", ar: 'أفهم قصدك، بس قلقانة من التراجع.', when_ar: 'تبدين تحفّظ باحترام' },
          { en: "That could work — though I'd suggest we test on staging first.", ar: 'ممكن يمشي — بس أقترح نجرّب على staging أول.', when_ar: 'توافقين مع تعديل' },
          { en: 'Can we hold that until after the incident is closed?', ar: 'نقدر نأجّلها لين نقفل الحادثة؟', when_ar: 'التوقيت غلط' },
          { en: "I'm not comfortable doing that on production without a rollback plan.", ar: 'مو مرتاحة أسوّيها على الإنتاج بدون خطة تراجع.', when_ar: 'ترفضين مخاطرة' },
          { en: "Let's park that for now and come back to it.", ar: 'نوقفها الحين ونرجع لها بعدين.', when_ar: 'تأجّلين نقاش جانبي' },
        ],
        example: {
          setting_ar: 'زميل يبغى يدفع تغيير محفوف بالمخاطر في نص الحادثة.',
          lines: [
            { who: 'Colleague', en: "Let's just push the config change now, it'll fix it.", ar: 'خلّنا ندفع تغيير الإعداد الحين، بيصلحها.' },
            { who: 'You', en: "I see what you mean, but I'm not comfortable changing production mid-incident. Can we test it on staging first?", ar: 'أفهم قصدك، بس مو مرتاحة نغيّر الإنتاج في نص الحادثة. نجرّبها على staging أول؟' },
            { who: 'Colleague', en: 'Fair. Let me spin up staging.', ar: 'منطقي. خلّيني أجهّز staging.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'مديرك يقترح خطوة متسرّعة. أنسب طريقة تقولين فيها «لا، مو الحين»؟',
          options: [
            { en: "No, that's a bad idea.", ar: 'لا، فكرة سيّئة.', correct: false, why_ar: 'تهاجم الفكرة بقسوة وبدون بديل.' },
            { en: "I'd hold off on that until we have a rollback plan — can I set one up first?", ar: 'أفضّل نأجّلها لين يكون عندنا خطة تراجع — أجهّزها أول؟', correct: true, why_ar: 'تعترض على التوقيت، تعطي سبب، وتقدّم بديل.' },
            { en: 'Okay, whatever you think is best.', ar: 'طيب، اللي تشوفه أنت.', correct: false, why_ar: 'توافقين على مخاطرة أنتِ غير مقتنعة فيها.' },
          ],
        },
        takeaway_ar: '«لا» المهنية دايماً معها «بدال كذا…».',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Track 2
  {
    id: 'meetings',
    order: 2,
    icon: 'Headset',
    ar: 'الاجتماعات والمكالمات',
    en: 'Meetings & Calls',
    tagline_ar: 'من الوقوف اليومي إلى مكالمة الأزمة — كيف تتكلّمين بثقة ووضوح.',
    lessons: [
      {
        id: 'meet-standup',
        order: 1,
        ar: 'الوقوف اليومي',
        en: 'The daily standup',
        minutes: 7,
        outcome_ar: 'تعطين تحديثك اليومي بثلاث جمل مرتّبة، بدون قصّة طويلة.',
        scenarioModuleNumber: 6,
        idea: {
          body_ar:
            'الوقوف اليومي ثلاث جمل، مو قصّة: أمس سوّيت إيش، اليوم بسوّي إيش، وش يعيقني. كل ما كان دورك مختصر، احترموه أكثر.',
          model_ar: 'القاعدة: أمس، اليوم، وش يعيقك — وبس.',
        },
        phrases: [
          { en: 'Yesterday I finished the backup migration.', ar: 'أمس خلّصت ترحيل النسخ الاحتياطي.', when_ar: 'أمس' },
          { en: "Today I'm working on the failover test.", ar: 'اليوم أشتغل على اختبار التحويل الاحتياطي.', when_ar: 'اليوم' },
          { en: "I'm blocked on access to the staging server.", ar: 'معيقني الوصول لخادم الـ staging.', when_ar: 'العائق' },
          { en: 'No blockers on my side.', ar: 'ما عندي عوائق من طرفي.', when_ar: 'ما فيه عائق' },
          { en: "I'll need ten minutes with networking after this.", ar: 'بحتاج عشر دقائق مع فريق الشبكات بعد كذا.', when_ar: 'طلب متابعة' },
        ],
        example: {
          setting_ar: 'دورك في الوقوف اليومي — عشرون ثانية بالضبط.',
          lines: [
            { who: 'You', en: 'Yesterday I finished the backup migration. Today I\'m running the failover test. I\'m blocked on staging access — I\'ll need ten minutes with networking after this.', ar: 'أمس خلّصت ترحيل النسخ الاحتياطي. اليوم أشغّل اختبار التحويل. معيقني الوصول لـ staging — بحتاج عشر دقائق مع الشبكات بعد كذا.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'رتّبي دور وقوف يومي نظيف:',
          steps: [
            { en: 'Yesterday I finished the backup migration.', ar: 'أمس خلّصت ترحيل النسخ الاحتياطي.' },
            { en: "Today I'm running the failover test.", ar: 'اليوم أشغّل اختبار التحويل.' },
            { en: "I'm blocked on staging access.", ar: 'معيقني الوصول لـ staging.' },
          ],
        },
        takeaway_ar: 'ثلاث جمل: أمس، اليوم، وش يعيقك.',
      },
      {
        id: 'meet-status',
        order: 2,
        ar: 'تحديث الحالة — النتيجة أولاً',
        en: 'Impact-first status',
        minutes: 8,
        outcome_ar: 'تبدين بالأثر ومين تأثّر، قبل التفاصيل التقنية.',
        scenarioModuleNumber: 1,
        idea: {
          body_ar:
            'الإدارة تبغى الأثر قبل الآلية. ابدئي بإيش اللي خرب ومين تأثّر ومن متى، وبعدها السبب التقني. أول جملة لازم يفهمها أي شخص، حتى لو مو تقني.',
          model_ar: 'القاعدة: وش خرب → مين تأثّر → من متى → التحديث الجاي.',
        },
        phrases: [
          { en: 'Quick status: the payment service is down for about 20% of users.', ar: 'تحديث سريع: خدمة الدفع واقفة لتقريباً ٢٠٪ من المستخدمين.', when_ar: 'الأثر أول' },
          { en: 'It started around 2 PM, right after the deploy.', ar: 'بدأت حوالي الساعة ٢، بعد النشر مباشرة.', when_ar: 'من متى' },
          { en: "We've isolated it to the database layer.", ar: 'حصرناها في طبقة قاعدة البيانات.', when_ar: 'السبب باختصار' },
          { en: 'No customer data is at risk.', ar: 'ما فيه بيانات عملاء في خطر.', when_ar: 'طمأنة' },
          { en: 'Next update in fifteen minutes.', ar: 'التحديث الجاي بعد ربع ساعة.', when_ar: 'الإيقاع' },
        ],
        terms: [
          { term: 'outage', ar: 'انقطاع الخدمة', def_en: 'a period when a service is unavailable', example: 'We had a 40-minute outage.' },
          { term: 'impact', ar: 'الأثر', def_en: 'who or what is affected, and how much', example: 'The impact was limited to checkout.' },
          { term: 'ETA', ar: 'الوقت المتوقّع', def_en: 'estimated time until something is done', example: 'ETA on the fix is 20 minutes.' },
        ],
        example: {
          setting_ar: 'تعطين مديرًا غير تقني تحديثًا في نص دقيقة.',
          lines: [
            { who: 'You', en: 'Quick status: checkout is failing for about 20% of users. It started at 2 PM after the deploy. No data is at risk. We\'ve isolated it to the database and next update is in fifteen minutes.', ar: 'تحديث سريع: الدفع يفشل لتقريباً ٢٠٪ من المستخدمين. بدأ الساعة ٢ بعد النشر. ما فيه بيانات في خطر. حصرناه في قاعدة البيانات، والتحديث الجاي بعد ربع ساعة.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'رتّبي تحديث حالة بأسلوب «النتيجة أولاً»:',
          steps: [
            { en: 'Checkout is down for about 20% of users.', ar: 'الدفع واقف لتقريباً ٢٠٪ من المستخدمين.' },
            { en: 'It started at 2 PM after the deploy.', ar: 'بدأ الساعة ٢ بعد النشر.' },
            { en: "We've isolated it to the database.", ar: 'حصرناه في قاعدة البيانات.' },
            { en: 'Next update in fifteen minutes.', ar: 'التحديث الجاي بعد ربع ساعة.' },
          ],
        },
        takeaway_ar: 'الإدارة تبي الأثر أول، والسبب بعدين.',
      },
      {
        id: 'meet-bridge',
        order: 3,
        ar: 'مكالمة الجسر / الأزمة',
        en: 'The bridge call',
        minutes: 9,
        outcome_ar: 'تعرّفين نفسك، تاخذين دورك، وتثبّتين إيقاع التحديثات في مكالمة فيها أصوات كثيرة.',
        scenarioModuleNumber: 10,
        idea: {
          body_ar:
            'في مكالمة الجسر أصوات كثيرة ومالك واحد. عرّفي نفسك ووش تملكين، وثبّتي إيقاع تحديثات منتظم. الوضوح هنا قيادة، مو مجرّد كلام.',
          model_ar: 'القاعدة: عرّفي نفسك، خذي دورك، ثبّتي الإيقاع.',
        },
        phrases: [
          { en: "This is Sara from infrastructure — I'm leading on the database side.", ar: 'معكم سارة من البنية التحتية — أنا مسؤولة عن جانب قاعدة البيانات.', when_ar: 'التعريف' },
          { en: 'Can everyone mute unless they’re speaking?', ar: 'ممكن الكل يكتم الصوت إلا وقت الكلام؟', when_ar: 'تنظيم الضجيج' },
          { en: "Let's go around: networking, then the app team, then me.", ar: 'نمشي بالترتيب: الشبكات، بعدها فريق التطبيق، بعدها أنا.', when_ar: 'ترتيب الأدوار' },
          { en: "Here's where we are, and here's what I need.", ar: 'هذا وضعنا الحالي، وهذا اللي أحتاجه.', when_ar: 'تحديث + طلب' },
          { en: "I'll post a written update in the channel every fifteen minutes.", ar: 'بنزّل تحديث مكتوب في القناة كل ربع ساعة.', when_ar: 'الإيقاع' },
        ],
        example: {
          setting_ar: 'أول أربعين ثانية من مكالمة جسر، وأنتِ تاخذين المسؤولية.',
          lines: [
            { who: 'You', en: "This is Sara from infrastructure, leading on the database side. Can everyone mute unless speaking? Let's go around — networking first, then the app team, then me.", ar: 'معكم سارة من البنية التحتية، مسؤولة عن قاعدة البيانات. ممكن الكل يكتم إلا وقت الكلام؟ نمشي بالترتيب — الشبكات أول، بعدها فريق التطبيق، بعدها أنا.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'الجسر فوضى وأصوات متداخلة. أنسب طريقة تمسكين فيها الزمام باحترام؟',
          options: [
            { en: 'Everyone be quiet!', ar: 'الكل يسكت!', correct: false, why_ar: 'تمسك الزمام لكن بطريقة حادّة.' },
            { en: 'Can everyone mute unless they’re speaking? Let’s go around one team at a time.', ar: 'ممكن الكل يكتم إلا وقت الكلام؟ نمشي فريق فريق.', correct: true, why_ar: 'تنظّم المكالمة بوضوح وأدب — قيادة هادئة.' },
            { en: 'Sorry, I can’t really hear anyone…', ar: 'آسفة، ما أسمع أحد بصراحة…', correct: false, why_ar: 'تصف المشكلة بدون ما تحلّها.' },
          ],
        },
        takeaway_ar: 'في الجسر، الوضوح قيادة.',
      },
      {
        id: 'meet-escalate',
        order: 4,
        ar: 'التصعيد الواضح',
        en: 'Escalate clearly',
        minutes: 7,
        outcome_ar: 'تسلّمين قرارًا لا قلقًا: إيش تحتاجين، من مين، متى، وليش.',
        scenarioModuleNumber: 5,
        idea: {
          body_ar:
            'التصعيد مو ذعر — هو تسليم نظيف لقرار. قولي إيش تحتاجين، من مين، بأي وقت، وليش. لما يكون التصعيد مرتّب، يبيّن إنك ماسكة الموقف، مو إنك خايفة.',
          model_ar: 'القاعدة: إيش أحتاج، من مين، متى، وليش.',
        },
        phrases: [
          { en: 'I need to escalate this.', ar: 'محتاجة أصعّد هالموضوع.', when_ar: 'الافتتاح' },
          { en: 'I need a decision from you in the next ten minutes.', ar: 'محتاجة قرار منك خلال عشر دقائق.', when_ar: 'الطلب + الموعد' },
          { en: "This is above my access level — I need someone who can approve a production change.", ar: 'هذا فوق صلاحيتي — أحتاج شخص يقدر يعتمد تغيير على الإنتاج.', when_ar: 'سبب التصعيد' },
          { en: "If we don't act by 3 PM, the backlog will double.", ar: 'إذا ما تحرّكنا قبل الساعة ٣، بيتضاعف المتراكم.', when_ar: 'العاقبة' },
          { en: "I've done X and Y; the next step needs your sign-off.", ar: 'سوّيت X و Y؛ الخطوة الجاية تحتاج اعتمادك.', when_ar: 'التسليم' },
        ],
        example: {
          setting_ar: 'تصعّدين لمديرك بطلب واضح وموعد.',
          lines: [
            { who: 'You', en: "I need to escalate this. It's above my access level — I need someone who can approve a production change in the next ten minutes. If we don't act by 3 PM, the backlog doubles.", ar: 'محتاجة أصعّد هذا. فوق صلاحيتي — أحتاج شخص يعتمد تغيير على الإنتاج خلال عشر دقائق. إذا ما تحرّكنا قبل الساعة ٣، يتضاعف المتراكم.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'ابني تصعيدًا نظيفًا:',
          steps: [
            { en: 'I need to escalate this.', ar: 'محتاجة أصعّد هذا.' },
            { en: "It's above my access level.", ar: 'فوق صلاحيتي.' },
            { en: 'I need a production-change approval in ten minutes.', ar: 'أحتاج اعتماد تغيير إنتاج خلال عشر دقائق.' },
            { en: "If we don't act by 3 PM, the backlog doubles.", ar: 'إذا ما تحرّكنا قبل ٣، يتضاعف المتراكم.' },
          ],
        },
        takeaway_ar: 'التصعيد الجيد يسلّم قرار، مو قلق.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Track 3
  {
    id: 'writing',
    order: 3,
    icon: 'PenLine',
    ar: 'الكتابة في العمل',
    en: 'Writing at Work',
    tagline_ar: 'التقرير، الإيميل، والرسائل السريعة — تكتبينها واضحة ومحترفة.',
    lessons: [
      {
        id: 'write-incident',
        order: 1,
        ar: 'تقرير الحادثة',
        en: 'The incident report',
        minutes: 9,
        outcome_ar: 'تكتبين تقريرًا أي شخص يفهمه في نص دقيقة: وش صار، الأثر، السبب، الحل، الوقاية.',
        scenarioModuleNumber: 7,
        idea: {
          body_ar:
            'تقرير الحادثة قصّة بشكل ثابت: وش صار، الأثر، السبب الجذري، الحل، والوقاية. لو مشيتِ على هالترتيب، أي شخص — تقني أو إداري — يمسك الصورة بسرعة.',
          model_ar: 'القاعدة: وش صار، الأثر، السبب، الحل، الوقاية.',
        },
        phrases: [
          { en: 'Summary: the payment service was unavailable for 42 minutes.', ar: 'الملخّص: خدمة الدفع كانت متوقّفة ٤٢ دقيقة.', when_ar: 'وش صار' },
          { en: 'Impact: about 20% of checkout attempts failed.', ar: 'الأثر: تقريباً ٢٠٪ من محاولات الدفع فشلت.', when_ar: 'الأثر' },
          { en: 'Root cause: a failed database failover after the 2 PM deploy.', ar: 'السبب الجذري: فشل تحويل احتياطي لقاعدة البيانات بعد نشر الساعة ٢.', when_ar: 'السبب' },
          { en: 'Resolution: we rolled back the deploy and restored the primary.', ar: 'الحل: تراجعنا عن النشر واسترجعنا الخادم الأساسي.', when_ar: 'الحل' },
          { en: "Prevention: we're adding an automated failover check.", ar: 'الوقاية: نضيف فحص تحويل احتياطي تلقائي.', when_ar: 'الوقاية' },
        ],
        terms: [
          { term: 'root cause', ar: 'السبب الجذري', def_en: 'the underlying reason, not just the symptom', example: 'The root cause was a config error.' },
          { term: 'resolution', ar: 'الحل / المعالجة', def_en: 'what actually fixed it', example: 'Resolution: rolled back the deploy.' },
          { term: 'timeline', ar: 'الخط الزمني', def_en: 'the sequence of events with times', example: 'See the timeline below.' },
        ],
        example: {
          setting_ar: 'نموذج تقرير حادثة قصير ومحترف.',
          lines: [
            { who: 'Report', en: 'Summary: payment was down for 42 minutes. Impact: ~20% of checkouts failed. Root cause: a failed database failover after the 2 PM deploy. Resolution: rolled back and restored the primary. Prevention: adding an automated failover check.', ar: 'الملخّص: الدفع متوقّف ٤٢ دقيقة. الأثر: ~٢٠٪ من عمليات الدفع فشلت. السبب: فشل تحويل احتياطي بعد نشر الساعة ٢. الحل: تراجعنا واسترجعنا الأساسي. الوقاية: إضافة فحص تحويل تلقائي.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'رتّبي أجزاء التقرير الخمسة:',
          steps: [
            { en: 'Summary: what happened', ar: 'الملخّص: وش صار' },
            { en: 'Impact: who was affected', ar: 'الأثر: مين تأثّر' },
            { en: 'Root cause: why it happened', ar: 'السبب الجذري: ليش صار' },
            { en: 'Resolution: what fixed it', ar: 'الحل: وش صلّحها' },
            { en: 'Prevention: how we stop it recurring', ar: 'الوقاية: كيف نمنع تكرارها' },
          ],
        },
        takeaway_ar: 'التقرير الجيد يُقرأ في نص دقيقة.',
      },
      {
        id: 'write-email',
        order: 2,
        ar: 'الإيميل الواضح — الخلاصة أولاً',
        en: 'The clear email (BLUF)',
        minutes: 7,
        outcome_ar: 'تحطّين المطلوب في أول سطر، وعنوان يجذب رد سريع.',
        idea: {
          body_ar:
            'الناس المشغولين يقرون العنوان وأول سطر بس. حطّي الخلاصة فوق (BLUF — bottom line up front): إيش تبغين منهم، بأول جملة، وبعدها الشرح. العنوان لازم يقول «إيش المطلوب ومتى».',
          model_ar: 'القاعدة: الخلاصة بأول سطر، والعنوان يقول المطلوب.',
        },
        phrases: [
          { en: 'Subject: Action needed — approve DB maintenance window (by Thu)', ar: 'العنوان: مطلوب إجراء — اعتماد نافذة صيانة قاعدة البيانات (قبل الخميس)', when_ar: 'العنوان' },
          { en: 'Bottom line: I need your approval to take the database offline for 30 minutes on Friday.', ar: 'الخلاصة: أحتاج موافقتك أوقف قاعدة البيانات ٣٠ دقيقة يوم الجمعة.', when_ar: 'أول سطر' },
          { en: "Here's why, and here's the plan.", ar: 'هذا السبب، وهذي الخطة.', when_ar: 'الشرح بعدها' },
          { en: 'No action needed — this is just an FYI.', ar: 'ما فيه إجراء مطلوب — للعلم بس.', when_ar: 'رسالة معلومة' },
          { en: 'Let me know by Thursday so I can schedule it.', ar: 'خبّرني قبل الخميس عشان أجدولها.', when_ar: 'الموعد النهائي' },
        ],
        terms: [
          { term: 'BLUF', ar: 'الخلاصة أولاً', def_en: 'bottom line up front — the point in line one', example: 'BLUF: I need approval by Friday.' },
          { term: 'FYI', ar: 'للعلم', def_en: 'for your information — no action needed', example: 'FYI, staging is back up.' },
          { term: 'follow up', ar: 'المتابعة', def_en: 'a reminder or continuation message', example: "I'll follow up tomorrow." },
        ],
        example: {
          setting_ar: 'نفس الطلب — مرّة واضح، ومرّة مبعثر.',
          lines: [
            { who: 'Clear', en: 'Bottom line: I need approval to take the DB offline for 30 minutes Friday. Here\'s the plan. Please reply by Thursday.', ar: 'الخلاصة: أحتاج موافقة أوقف قاعدة البيانات ٣٠ دقيقة الجمعة. هذي الخطة. ردّ قبل الخميس.' },
            { who: 'Rambling', en: 'Hi, hope you\'re well, so I was thinking about some maintenance stuff and maybe Friday could work if that\'s okay with everyone…', ar: 'مرحبا، أتمنى تكون بخير، كنت أفكر في شغل صيانة ويمكن الجمعة تنفع لو تناسب الجميع…' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'أي عنوان يجذب رد أسرع؟',
          options: [
            { en: 'Subject: Quick question', ar: 'العنوان: سؤال سريع', correct: false, why_ar: 'غامض، ما يقول المطلوب ولا الموعد.' },
            { en: 'Subject: Action needed — approve DB maintenance window (by Thu)', ar: 'العنوان: مطلوب إجراء — اعتماد نافذة صيانة (قبل الخميس)', correct: true, why_ar: 'يقول المطلوب والموعد بوضوح، فيجي أول.' },
            { en: 'Subject: Hey', ar: 'العنوان: هلا', correct: false, why_ar: 'ما يعطي أي سياق يخلّيه يفتحها.' },
          ],
        },
        takeaway_ar: 'إذا ما قروا إلا سطر، خلّيه المهم.',
      },
      {
        id: 'write-chat',
        order: 3,
        ar: 'الرسائل السريعة اللي تُقرأ بوضوح',
        en: 'Chat that reads well',
        minutes: 6,
        outcome_ar: 'تكتبين تحديثًا في Slack/Teams: فكرة وحدة، مع سياقها، برسالة وحدة.',
        idea: {
          body_ar:
            'الرسائل السريعة مو زي الرسائل النصية القصيرة. الرسالة الزينة فكرة وحدة، مع سياقها، مو خمس تنبيهات متتالية. واضحة، فيها الحالة، وتُقرأ مرة وحدة.',
          model_ar: 'القاعدة: فكرة وحدة، مع سياقها، برسالة وحدة.',
        },
        phrases: [
          { en: "Heads up: staging is down, I'm looking into it.", ar: 'تنبيه: staging واقف، أنا أفحصه.', when_ar: 'تنبيه استباقي' },
          { en: 'Quick question — who owns the DNS config?', ar: 'سؤال سريع — مين مسؤول عن إعداد الـ DNS؟', when_ar: 'سؤال موجّه' },
          { en: "Following up on my message about the backup job.", ar: 'متابعة لرسالتي عن مهمة النسخ الاحتياطي.', when_ar: 'متابعة' },
          { en: 'Done ✅ — the node is back in the pool.', ar: 'تمّت ✅ — العقدة رجعت للمجموعة.', when_ar: 'إغلاق واضح' },
          { en: "I'll thread the details below to keep the channel clean.", ar: 'بحط التفاصيل في رد أسفلها عشان تبقى القناة مرتّبة.', when_ar: 'تنظيم' },
        ],
        example: {
          setting_ar: 'تحديث نظيف مقابل تحديث مزعج.',
          lines: [
            { who: 'Clean', en: "Heads up: staging is down (500s on login). I'm on it, update in 10.", ar: 'تنبيه: staging واقف (أخطاء ٥٠٠ في الدخول). أنا عليه، تحديث بعد ١٠ دقائق.' },
            { who: 'Noisy', en: 'hey / u there / something\'s wrong / staging?? / anyone', ar: 'هلا / موجود؟ / فيه خطأ / staging؟؟ / أحد' },
          ],
        },
        practice: {
          type: 'reflect',
          prompt_ar: 'خذي هالسلسلة المزعجة وأعيدي كتابتها كرسالة وحدة نظيفة: «hey / u there / staging broken / help». اكتبيها بالإنجليزي بأسلوب فكرة-وحدة-مع-سياقها.',
          hint_ar: 'ابدئي بـ Heads up، حطّي الأعراض، وقولي إيش تسوّين والوقت الجاي.',
        },
        takeaway_ar: 'الرسالة الزينة تُقرأ مرة وحدة وتُفهَم.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Track 4
  {
    id: 'technical',
    order: 4,
    icon: 'Cpu',
    ar: 'الطلاقة التقنية',
    en: 'Technical Fluency',
    tagline_ar: 'مصطلحاتك، وطريقة ما تشرحينها — للتقنيّ وللي مو تقنيّ.',
    lessons: [
      {
        id: 'tech-terms',
        order: 1,
        ar: 'مصطلحات البنية التحتية',
        en: 'Infrastructure terms',
        minutes: 8,
        outcome_ar: 'تنطقين المصطلحات اللي تتكسّر على خط الهاتف، بوضوح وبطء.',
        idea: {
          body_ar:
            'هذي الكلمات اللي تنكسر على خط الهاتف للمتحدّث العربي — قوليها ببطء وشدّي على المقطع الصح. لو نطقتيها واضحة، توصل من أول مرة.',
          model_ar: 'القاعدة: المصطلح الصحيح، ببطء ووضوح، يوصل.',
        },
        terms: [
          { term: 'failover', ar: 'التحوّل الاحتياطي', def_en: 'switching to a backup system when the main one fails', example: 'We triggered a failover to the backup node.' },
          { term: 'provision', ar: 'تجهيز / توفير', def_en: 'to set up a server or resource', example: "I'll provision a new server for staging." },
          { term: 'throughput', ar: 'معدّل المعالجة', def_en: 'how much work a system handles per second', example: 'Throughput dropped after the deploy.' },
          { term: 'latency', ar: 'زمن الاستجابة', def_en: 'the delay before a response', example: 'Users are seeing high latency.' },
          { term: 'redundancy', ar: 'التكرار الاحتياطي', def_en: 'a backup copy so nothing single-fails', example: 'We lost redundancy when the second node failed.' },
          { term: 'rollback', ar: 'التراجع', def_en: 'reverting to the last stable version', example: "Let's do a rollback to the last stable release." },
        ],
        phrases: [
          { en: 'We triggered a failover to the backup node.', ar: 'شغّلنا تحوّلًا احتياطيًا للعقدة البديلة.', when_ar: 'failover' },
          { en: "I'll provision a new server for staging.", ar: 'بجهّز خادمًا جديدًا للـ staging.', when_ar: 'provision' },
          { en: 'Users are seeing high latency right now.', ar: 'المستخدمين يشوفون زمن استجابة عالي الحين.', when_ar: 'latency' },
          { en: "Let's do a rollback to the last stable release.", ar: 'نسوّي تراجعًا لآخر إصدار مستقر.', when_ar: 'rollback' },
        ],
        example: {
          setting_ar: 'تستخدمين ثلاثة مصطلحات صح في جملة وحدة لزميل.',
          lines: [
            { who: 'You', en: 'Latency spiked after the deploy, so we did a rollback and triggered a failover to the backup node.', ar: 'زمن الاستجابة ارتفع بعد النشر، فسوّينا تراجعًا وشغّلنا تحوّلًا احتياطيًا للعقدة البديلة.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'الخادم الأساسي طاح، وتبغين تشرحين إنكم تحوّلتم للبديل تلقائيًا. أي مصطلح؟',
          options: [
            { en: 'We did a rollback.', ar: 'سوّينا تراجعًا.', correct: false, why_ar: 'التراجع = الرجوع لإصدار سابق، مو التحوّل لخادم بديل.' },
            { en: 'We triggered a failover.', ar: 'شغّلنا تحوّلًا احتياطيًا.', correct: true, why_ar: 'failover = التحوّل للنظام البديل عند فشل الأساسي — بالضبط.' },
            { en: 'We provisioned it.', ar: 'جهّزناه.', correct: false, why_ar: 'provision = تجهيز مورد جديد، مو التحوّل عند الفشل.' },
          ],
        },
        takeaway_ar: 'المصطلح الصحيح، ببطء ووضوح، يوصل.',
      },
      {
        id: 'tech-explain-simply',
        order: 2,
        ar: 'اشرحيها ببساطة',
        en: 'Explain it simply',
        minutes: 8,
        outcome_ar: 'تشرحين مشكلة تقنية للي مو تقني، بتشبيه من يومهم وبالأثر اللي يحسّونه.',
        scenarioModuleNumber: 8,
        idea: {
          body_ar:
            'مع شخص غير تقني، اتركي المصطلحات واستخدمي تشبيه من حياته اليومية، وابدئي بالأثر اللي يحسّه هو. مو مهم عنده «إيش صار تقنيًا»، مهم عنده «كيف أثّر عليّ».',
          model_ar: 'القاعدة: الأثر اللي يحسّونه، بتشبيه من يومهم.',
        },
        phrases: [
          { en: "Think of it like a traffic jam — requests are piling up faster than we can clear them.", ar: 'تخيّلها زحمة سير — الطلبات تتكدّس أسرع مما نقدر نصرّفها.', when_ar: 'تشبيه' },
          { en: 'In simple terms, the system that saves your data was briefly unreachable.', ar: 'ببساطة، النظام اللي يحفظ بياناتك كان صعب الوصول له للحظات.', when_ar: 'تبسيط' },
          { en: 'For you, that meant checkout was slow for about twenty minutes.', ar: 'بالنسبة لك، هذا معناه إن الدفع كان بطيء تقريباً عشرين دقيقة.', when_ar: 'الأثر عليهم' },
          { en: "It's fixed now, and nothing was lost.", ar: 'انحلّت الحين، وما ضاع شي.', when_ar: 'طمأنة' },
          { en: "The technical cause was a failed failover, but what matters to you is: it's resolved.", ar: 'السبب التقني فشل تحوّل احتياطي، بس المهم لك: انحلّت.', when_ar: 'اختصار المصطلح' },
        ],
        example: {
          setting_ar: 'نفس الانقطاع — مرّة لمدير، ومرّة لمهندس.',
          lines: [
            { who: 'To a manager', en: 'Think of it like a traffic jam — for you, checkout was slow for twenty minutes. It\'s fixed now and nothing was lost.', ar: 'تخيّلها زحمة سير — بالنسبة لك الدفع كان بطيء عشرين دقيقة. انحلّت الحين وما ضاع شي.' },
            { who: 'To an engineer', en: 'The primary rejected new connections after the deploy and failover didn\'t kick in.', ar: 'الأساسي رفض الاتصالات الجديدة بعد النشر والتحوّل الاحتياطي ما اشتغل.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'مدير غير تقني سألك «وش صار؟». أنسب جواب؟',
          options: [
            { en: 'The primary DB rejected connections because the failover config was stale.', ar: 'قاعدة البيانات الأساسية رفضت الاتصالات لأن إعداد التحويل كان قديمًا.', correct: false, why_ar: 'مصطلحات كثيرة لشخص غير تقني.' },
            { en: 'For a few minutes the part that saves data was unreachable, so checkout was slow. It’s fixed and nothing was lost.', ar: 'لدقائق، الجزء اللي يحفظ البيانات كان صعب الوصول له، فصار الدفع بطيء. انحلّت وما ضاع شي.', correct: true, why_ar: 'أثر محسوس + طمأنة، بدون مصطلحات.' },
            { en: 'It was a database thing, complicated.', ar: 'كانت مشكلة قواعد بيانات، معقّدة.', correct: false, why_ar: 'تبسيط زايد يبيّنك غير مسيطرة على الموقف.' },
          ],
        },
        takeaway_ar: 'اشرحي الأثر، لا الآلية.',
      },
      {
        id: 'tech-rootcause',
        order: 3,
        ar: 'سرد السبب الجذري',
        en: 'The root-cause story',
        minutes: 8,
        outcome_ar: 'تروين السبب كسلسلة مرتّبة: شرارة → إيش انكسر → ليش تسلسل → كيف تأكّدتِ.',
        scenarioModuleNumber: 3,
        idea: {
          body_ar:
            'السبب الجذري سلسلة، تُروى بالترتيب: الشرارة اللي بدأت، إيش انكسر بسببها، ليش تسلسل الانهيار، وكيف تأكّدتِ. قصّة مرتّبة، مو قائمة نقاط.',
          model_ar: 'القاعدة: شرارة، ثم انهيار، ثم دليل.',
        },
        phrases: [
          { en: 'It started when the 2 PM deploy changed the connection settings.', ar: 'بدأت لما نشر الساعة ٢ غيّر إعدادات الاتصال.', when_ar: 'الشرارة' },
          { en: 'That caused the primary database to reject new connections.', ar: 'وهذا خلّى قاعدة البيانات الأساسية ترفض الاتصالات الجديدة.', when_ar: 'إيش انكسر' },
          { en: "Because failover wasn't configured for that case, traffic had nowhere to go.", ar: 'ولأن التحوّل الاحتياطي مو مهيّأ لهالحالة، ما لقى الترافيك مكان يروح له.', when_ar: 'ليش تسلسل' },
          { en: 'We confirmed it by checking the connection logs.', ar: 'تأكّدنا بمراجعة سجلّات الاتصال.', when_ar: 'الدليل' },
          { en: 'The fix was to correct the settings and add a failover rule.', ar: 'الحل كان تصحيح الإعدادات وإضافة قاعدة تحوّل احتياطي.', when_ar: 'الحل' },
        ],
        terms: [
          { term: 'trigger', ar: 'الشرارة / المُطلِق', def_en: 'the event that started the chain', example: 'The deploy was the trigger.' },
          { term: 'cascade', ar: 'التسلسل / الانهيار المتتابع', def_en: 'one failure causing the next', example: 'It cascaded across services.' },
          { term: 'contributing factor', ar: 'عامل مساهم', def_en: 'something that made it worse but wasn’t the root', example: 'Low disk space was a contributing factor.' },
        ],
        example: {
          setting_ar: 'سرد سبب جذري في أربعين ثانية.',
          lines: [
            { who: 'You', en: 'It started when the 2 PM deploy changed the connection settings. That made the primary reject new connections. Because failover wasn\'t set for that case, traffic had nowhere to go. We confirmed it in the connection logs.', ar: 'بدأت لما نشر الساعة ٢ غيّر إعدادات الاتصال. فصار الأساسي يرفض الاتصالات. ولأن التحوّل مو مهيّأ لهالحالة، ما لقى الترافيك مكان. تأكّدنا من سجلّات الاتصال.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'رتّبي سلسلة السبب الجذري:',
          steps: [
            { en: 'The 2 PM deploy changed the connection settings.', ar: 'نشر الساعة ٢ غيّر إعدادات الاتصال.' },
            { en: 'The primary started rejecting new connections.', ar: 'الأساسي بدأ يرفض الاتصالات الجديدة.' },
            { en: "Failover wasn't set for that case, so traffic had nowhere to go.", ar: 'التحوّل مو مهيّأ لهالحالة، فما لقى الترافيك مكان.' },
            { en: 'We confirmed it in the connection logs.', ar: 'تأكّدنا من سجلّات الاتصال.' },
          ],
        },
        takeaway_ar: 'السبب الجذري قصة مرتّبة، مو قائمة.',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────── Track 5
  {
    id: 'human',
    order: 5,
    icon: 'HeartHandshake',
    ar: 'الطبقة الإنسانية',
    en: 'The Human Layer',
    tagline_ar: 'العلاقة مع الفريق البعيد، بين الثقافات، ومع مديرك — نص الشغل.',
    lessons: [
      {
        id: 'human-rapport',
        order: 1,
        ar: 'كسر الجليد مع الفريق البعيد',
        en: 'Rapport with the team',
        minutes: 6,
        outcome_ar: 'تفتحين المكالمة بدقيقتين إنسانية تسهّل كل اللي بعدها.',
        idea: {
          body_ar:
            'دقيقتين كلام إنساني قبل الجزء التقني تخلّي المكالمة كلها أسلس. صغيرة، صادقة، مو مصطنعة — كفاية سؤال عن يومهم أو الطقس عندهم.',
          model_ar: 'القاعدة: دقيقتين إنسانية تفتح الباب.',
        },
        phrases: [
          { en: "How's your day going so far?", ar: 'كيف يومك لين الحين؟', when_ar: 'افتتاح عام' },
          { en: "How's the weather over there in Bangalore?", ar: 'كيف الطقس عندكم في بنغالور؟', when_ar: 'لمسة شخصية' },
          { en: 'Before we start — how was your weekend?', ar: 'قبل ما نبدأ — كيف كانت إجازتك؟', when_ar: 'بداية أسبوع' },
          { en: 'Thanks for jumping on so quickly.', ar: 'مشكور على سرعة التجاوب.', when_ar: 'تقدير' },
          { en: "It's always good working with you.", ar: 'دايماً حلو الشغل معك.', when_ar: 'ختام دافئ' },
        ],
        example: {
          setting_ar: 'افتتاحية دافئة عشرين ثانية قبل مكالمة جسر.',
          lines: [
            { who: 'You', en: 'Hey Arjun, thanks for jumping on so quickly. How\'s your day going over there?', ar: 'هلا أرجون، مشكور على سرعة التجاوب. كيف يومك عندكم؟' },
            { who: 'Arjun', en: 'Busy, but good! Let\'s dig in.', ar: 'مشغول، بس زين! خلّنا نبدأ.' },
          ],
        },
        practice: {
          type: 'reflect',
          prompt_ar: 'اكتبي بالإنجليزي افتتاحية سطرين لمكالمة بكرة مع الفريق البعيد — سؤال إنساني + كلمة تقدير.',
          hint_ar: 'مثال: «Hey [name], good to see you. How was your weekend?»',
        },
        takeaway_ar: 'الشغل يمشي أحسن بين ناس يعرفون بعض.',
      },
      {
        id: 'human-crosscultural',
        order: 2,
        ar: 'التواصل بين الثقافات',
        en: 'Cross-cultural clarity',
        minutes: 7,
        outcome_ar: 'تتجنّبين التعابير المحيّرة، تأكّدين أكثر، وتقرين «نعم» بحذر.',
        idea: {
          body_ar:
            'مع فريق مختلط، تجنّبي التعابير الاصطلاحية والسخرية، وأكّدي أكثر. وانتبهي لـ«نعم» — أحياناً معناها «سمعتك»، مو «أوافقك». التأكيد الزائد أرخص من سوء الفهم.',
          model_ar: 'القاعدة: بساطة، تأكيد أكثر، وانتبهي لـ«نعم».',
        },
        phrases: [
          { en: "Let me confirm we're on the same page.", ar: 'خلّيني أتأكد إننا متفقين.', when_ar: 'تثبيت الفهم' },
          { en: 'When you say yes, do you mean you agree, or that you’ll look into it?', ar: 'لما تقول نعم، تقصد توافق، ولا بتشوف الموضوع؟', when_ar: 'توضيح «نعم»' },
          { en: "I'll write it down so nothing gets lost in translation.", ar: 'بكتبها عشان ما يضيع شي في الترجمة.', when_ar: 'توثيق' },
          { en: "Please stop me if anything I say isn't clear.", ar: 'أوقفني لو أي شي أقوله مو واضح.', when_ar: 'دعوة للمقاطعة' },
          { en: "Different time zones — let's agree on one time in UTC.", ar: 'مناطق زمنية مختلفة — نتفق على وقت واحد بتوقيت UTC.', when_ar: 'تنسيق وقت' },
        ],
        example: {
          setting_ar: 'تمسكين «نعم» اللي معناها «يمكن».',
          lines: [
            { who: 'Teammate', en: 'Yes, yes, we can do that.', ar: 'نعم، نعم، نقدر نسوّيها.' },
            { who: 'You', en: 'Just to confirm — do you mean you can do it today, or you’ll check and get back to me?', ar: 'بس للتأكيد — تقصد تقدر اليوم، ولا بتشوف وترجع لي؟' },
          ],
        },
        practice: {
          type: 'choose',
          prompt_ar: 'أوضح طريقة تأكيد بين الثقافات؟',
          options: [
            { en: 'Cool, got it, moving on.', ar: 'تمام، فهمت، نكمّل.', correct: false, why_ar: 'تفترض التفاهم بدون ما تتأكدين.' },
            { en: 'Let me confirm we’re on the same page — you’ll send the config by Tuesday, correct?', ar: 'خلّيني أتأكد إننا متفقين — بترسل الإعداد قبل الثلاثاء، صح؟', correct: true, why_ar: 'تأكيد صريح بتفصيل وموعد.' },
            { en: 'You know what I mean.', ar: 'أنت فاهم قصدي.', correct: false, why_ar: 'تعبير غامض يفتح باب سوء الفهم.' },
          ],
        },
        takeaway_ar: 'التأكيد الزائد أرخص من سوء الفهم.',
      },
      {
        id: 'human-managing-up',
        order: 3,
        ar: 'إدارة العلاقة مع مديرك',
        en: 'Managing up',
        minutes: 7,
        outcome_ar: 'تنبّهين للمخاطر بدري، تجيبين خيارات مو مشاكل، وتلخّصين القرارات.',
        idea: {
          body_ar:
            'مديرك يبغى صفر مفاجآت. نبّهي للمخاطر بدري قبل ما تكبر، وجيبي خيارات مو بس مشاكل، ولخّصي القرار اللي اتفقتوا عليه. كذا يثق فيك ويرتاح.',
          model_ar: 'القاعدة: بدري، بخيارات، وبتلخيص.',
        },
        phrases: [
          { en: 'I want to flag a risk early, before it grows.', ar: 'أبغى أنبّه لمخاطرة بدري قبل ما تكبر.', when_ar: 'تنبيه استباقي' },
          { en: "Here are two options, and here's the one I'd pick.", ar: 'عندي خيارين، وهذا اللي بختاره.', when_ar: 'خيارات + توصية' },
          { en: "Just so there are no surprises — this might slip to Monday.", ar: 'بس عشان ما فيه مفاجآت — يمكن تتأخّر للإثنين.', when_ar: 'شفافية' },
          { en: 'To confirm what we decided: we go with option B.', ar: 'لتأكيد اللي قرّرناه: نمشي بالخيار B.', when_ar: 'تلخيص قرار' },
          { en: "I'll keep you posted — you won't have to chase me.", ar: 'بخلّيك على اطّلاع — ما بتحتاج تلحقني.', when_ar: 'طمأنة' },
        ],
        example: {
          setting_ar: 'تنبّهين مديرك لمخاطرة مع خيارين.',
          lines: [
            { who: 'You', en: 'I want to flag a risk early: the migration might slip to Monday. Two options — we delay the launch, or we ship read-only first. I\'d pick read-only. Your call.', ar: 'أبغى أنبّه لمخاطرة بدري: الترحيل يمكن يتأخّر للإثنين. خيارين — نأجّل الإطلاق، أو نطلق للقراءة فقط أول. أنا أختار القراءة فقط. القرار لك.' },
          ],
        },
        practice: {
          type: 'order',
          prompt_ar: 'ابني رسالة «تنبيه لمخاطرة»:',
          steps: [
            { en: 'I want to flag a risk early:', ar: 'أبغى أنبّه لمخاطرة بدري:' },
            { en: 'the migration might slip to Monday.', ar: 'الترحيل يمكن يتأخّر للإثنين.' },
            { en: 'Two options — delay the launch, or ship read-only first.', ar: 'خيارين — نأجّل الإطلاق، أو نطلق للقراءة فقط أول.' },
            { en: "I'd pick read-only. Your call.", ar: 'أنا أختار القراءة فقط. القرار لك.' },
          ],
        },
        takeaway_ar: 'المدير يبي صفر مفاجآت.',
      },
    ],
  },
]

// ── Derived helpers ────────────────────────────────────────────────────────
// A flat, ordered list of every lesson with its track attached (for prev/next,
// progress totals, and scenario resolution).
export const ALL_LESSONS = CURRICULUM_TRACKS.flatMap((track, ti) =>
  track.lessons.map((lesson, li) => ({
    ...lesson,
    trackId: track.id,
    trackAr: track.ar,
    trackEn: track.en,
    trackOrder: track.order,
    trackIcon: track.icon,
    // human-facing index like "2.3"
    label: `${ti + 1}.${li + 1}`,
  }))
)

export const TOTAL_LESSONS = ALL_LESSONS.length

export function getLesson(lessonId) {
  return ALL_LESSONS.find((l) => l.id === lessonId) || null
}

export function getNextLesson(lessonId) {
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId)
  if (idx < 0 || idx + 1 >= ALL_LESSONS.length) return null
  return ALL_LESSONS[idx + 1]
}

export function getPrevLesson(lessonId) {
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId)
  if (idx <= 0) return null
  return ALL_LESSONS[idx - 1]
}
