// Pro Desk — the professional English CURRICULUM ("The Track").
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
// LANGUAGE: this surface is ENGLISH-PRIMARY. English is the large, dominant text
// (titles, teaching body, phrases, practice). Arabic is reduced to a small, muted
// GLOSS kept only where it aids comprehension. The `*_ar` fields hold that gloss.
//
// Section shapes a lesson may carry (all optional except idea + takeaway):
//   idea    : { body, model, body_ar, model_ar }                 concept + mental model (EN primary, AR gloss)
//   phrases : [ { en, ar, when, when_ar } ]                      model phrases, tap-to-hear (en primary, ar gloss)
//   terms   : [ { term, ar, def_en, example } ]                  vocabulary (term/def English, ar gloss)
//   example : { setting, setting_ar, lines: [ { who, en, ar } ] } a worked mini-dialogue
//   practice: { type, prompt, prompt_ar, ... }                   one real practice beat
//   takeaway, takeaway_ar                                        the one line to remember
//
// Practice types (all self-checking, creditless):
//   choose  : { options: [ { en, ar, correct, why, why_ar } ] }  pick the most natural line
//   order   : { steps: [ { en, ar } ] }  (stored in CORRECT order; UI shuffles)
//   reflect : { hint, hint_ar }                                  write/say your own — links to a scenario

export const CURRICULUM_TRACKS = [
  // ───────────────────────────────────────────────────────────── Track 1
  {
    id: 'reflexes',
    order: 1,
    icon: 'Zap',
    ar: 'ردود الفعل',
    en: 'Call Reflexes',
    tagline: 'The phrases that unlock any call and keep you in control from the very first minute.',
    tagline_ar: 'العبارات اللي تفكّ أي مكالمة، وتخليك ماسكة زمامها من أول دقيقة.',
    lessons: [
      {
        id: 'reflex-clarify',
        order: 1,
        ar: 'اطلبي التوضيح',
        en: 'Ask them to repeat',
        minutes: 7,
        outcome: 'Politely stop the speaker and ask for a repeat or a spelling — no awkwardness, no guessing.',
        outcome_ar: 'توقفين المتكلّم بأدب وتطلبين إعادة أو تهجئة، بدون إحراج ولا تخمين.',
        scenarioModuleNumber: 4,
        idea: {
          body: "On any call you'll miss words — especially over the phone, and especially names, numbers, and technical terms. The professional move isn't to guess and carry on. It's to ask for clarification quickly and cleanly, without spiralling into apologies.",
          model: 'The rule: asking for clarification is a strength, not a weakness. One clear question keeps the whole call accurate.',
          body_ar:
            'في أي مكالمة بتفوتك كلمات — خصوصاً على خط الهاتف، وخصوصاً الأسماء والأرقام والمصطلحات التقنية. الحركة الاحترافية مو إنك تخمّنين وتكمّلين، الحركة إنك تطلبين التوضيح بسرعة وبنظافة، بدون دوّامة اعتذارات.',
          model_ar: 'القاعدة: طلب التوضيح قوّة، مو ضعف. سؤال واضح يحافظ على دقّة المكالمة.',
        },
        phrases: [
          { en: 'Sorry, could you say that again?', ar: 'آسفة، ممكن تعيدها؟', when: 'You missed a whole sentence', when_ar: 'فاتتك جملة كاملة' },
          { en: 'Could you spell that for me?', ar: 'ممكن تتهجّاها لي؟', when: 'A name, a hostname, or a ticket number', when_ar: 'اسم، أو hostname، أو رقم تذكرة' },
          { en: "You're breaking up — I only caught the first part.", ar: 'الصوت متقطّع، وصلني أوله بس.', when: 'The line is bad', when_ar: 'الخط سيّئ' },
          { en: 'Just to make sure — you said the payment service, right?', ar: 'بس عشان أتأكد، قصدك خدمة الدفع، صح؟', when: 'Locking in a key word', when_ar: 'تثبّتين كلمة مفتاحية' },
          { en: 'Could you slow down a little? I want to get this exactly right.', ar: 'ممكن تخفّف شوي؟ أبغى أضبطها بالظبط.', when: 'The speaker is fast', when_ar: 'المتكلّم سريع' },
        ],
        example: {
          setting: 'Arjun, from the database team in Bangalore, rattles off a server name.',
          setting_ar: 'أرجون، من فريق قواعد البيانات في بنغالور، يعطيكِ اسم الخادم بسرعة.',
          lines: [
            { who: 'Arjun', en: 'Okay, connect to db-prod-fra-07 and check the replica.', ar: 'تمام، اتّصلي بـ db-prod-fra-07 وتأكّدي من النسخة.' },
            { who: 'You', en: 'Sorry, could you spell the hostname for me?', ar: 'آسفة، ممكن تتهجّى اسم الخادم لي؟' },
            { who: 'Arjun', en: 'Sure — d, b, dash, p, r, o, d, dash, f, r, a, dash, zero, seven.', ar: 'أكيد — d b - p r o d - f r a - 0 7.' },
            { who: 'You', en: 'Got it — db-prod-fra-07. Thanks.', ar: 'وصلت — db-prod-fra-07. شكراً.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: "The speaker said a server name too fast and you didn't catch it. What's the best way to ask them to spell it?",
          prompt_ar: 'المتكلّم قال اسم خادم بسرعة وما لحقتيه. أنسب طريقة تطلبين فيها التهجئة؟',
          options: [
            { en: 'What? Repeat.', ar: 'وش؟ عيد.', correct: false, why: 'Too blunt — it lacks any tact.', why_ar: 'مباشرة بزيادة، تنقصها اللباقة.' },
            { en: 'Could you spell that for me?', ar: 'ممكن تتهجّاها لي؟', correct: true, why: 'Clear, polite, and it makes sure you write it down correctly.', why_ar: 'واضحة، مهذّبة، وتضمن إنك تكتبينه صح.' },
            { en: "Sorry sorry, I'm so bad at this, can you maybe say it slowly again please?", ar: 'آسفة آسفة، أنا ضعيفة بهالشي، ممكن تعيدها على مهلك مرة ثانية لو سمحت؟', correct: false, why: 'An apology spiral weakens your position — a clean request is stronger.', why_ar: 'دوّامة اعتذار تضعّف موقفك؛ الطلب النظيف أقوى.' },
          ],
        },
        takeaway: 'You lose nothing by asking for a repeat — you lose a lot by guessing wrong.',
        takeaway_ar: 'ما تخسرين شي لو طلبتِ الإعادة — تخسرين لو خمّنتِ غلط.',
      },
      {
        id: 'reflex-buy-time',
        order: 2,
        ar: 'اكسبي وقت للتفكير',
        en: 'Buy a moment',
        minutes: 6,
        outcome: 'Fill the silent moment with a line that shows confidence, instead of answering in a rush.',
        outcome_ar: 'تملّين لحظة الصمت بجملة تبيّن ثقتك، بدل ما تجاوبين على عجل.',
        idea: {
          body: "Silence on a call feels like failure, so we blurt out the first answer that comes to mind. The alternative is to think out loud: a short line that buys you a few seconds and shows you're working — not that you're stuck.",
          model: 'The rule: think out loud, don\'t go silent. The seconds you buy save you from a wrong answer.',
          body_ar:
            'الصمت في المكالمة يحسّونه فشل، فنطلق أول جواب يجينا. البديل إنك تفكّرين بصوت: جملة قصيرة تشتري لك ثواني وتبيّن إنك تشتغلين، مو إنك علّقتِ.',
          model_ar: 'القاعدة: فكّري بصوت، لا تصمتي. الوقت اللي تشترينه بجملة يوفّر عليك جواب غلط.',
        },
        phrases: [
          { en: 'Let me check that.', ar: 'خلّيني أتأكد.', when: 'Before you give a number or detail', when_ar: 'قبل ما تعطين رقم أو تفصيل' },
          { en: 'Give me one second.', ar: 'ثانية وحدة.', when: 'You need a moment to focus', when_ar: 'تحتاجين لحظة تركيز' },
          { en: 'Good question — let me think for a moment.', ar: 'سؤال زين، خلّيني أفكّر لحظة.', when: 'A question that needs thought', when_ar: 'سؤال يحتاج تفكير' },
          { en: 'Let me pull that up.', ar: 'خلّيني أفتحها.', when: "You're opening a dashboard or ticket", when_ar: 'تفتحين لوحة أو تذكرة' },
          { en: 'I want to get this right, so bear with me.', ar: 'أبغى أضبطها، تحمّلني شوي.', when: 'You need a little longer', when_ar: 'تحتاجين وقت أطول شوي' },
        ],
        example: {
          setting: "Your manager asks for a number you don't have memorised, and you're right in front of the dashboard.",
          setting_ar: 'المدير يسألك عن رقم ما تحفظينه، وأنت قدّام اللوحة.',
          lines: [
            { who: 'Manager', en: 'How many users were affected exactly?', ar: 'كم مستخدم تأثّر بالضبط؟' },
            { who: 'You', en: 'Let me pull that up — one second.', ar: 'خلّيني أفتحها — ثانية وحدة.' },
            { who: 'You', en: 'Okay, it was about eighteen percent of active users.', ar: 'تمام، تقريباً ثمانية عشر بالمية من المستخدمين النشطين.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: 'You need ten seconds to open a chart before you answer. What do you say?',
          prompt_ar: 'تحتاجين ١٠ ثواني تفتحين فيها رسمًا بيانيًا قبل ما تجاوبين. وش تقولين؟',
          options: [
            { en: 'Umm… uhh… I think… maybe…', ar: 'إمم… آه… أظن… يمكن…', correct: false, why: 'Audible hesitation weakens your confidence.', why_ar: 'التردّد المسموع يضعّف الثقة.' },
            { en: 'Let me pull that up — one second.', ar: 'خلّيني أفتحها — ثانية وحدة.', correct: true, why: "It buys time and shows you're working on an accurate answer.", why_ar: 'تشتري وقت وتبيّن إنك تشتغلين على جواب دقيق.' },
            { en: "I don't know.", ar: 'ما أدري.', correct: false, why: 'Sometimes the right call — but here you have the info, you just need to open it.', why_ar: 'أحياناً صحيحة، لكن هنا عندك المعلومة، بس تحتاجين تفتحينها.' },
          ],
        },
        takeaway: 'The time you buy with one line saves you from a wrong answer.',
        takeaway_ar: 'الوقت اللي تشترينه بجملة، يوفّر عليك جواب غلط.',
      },
      {
        id: 'reflex-readback',
        order: 3,
        ar: 'أكّدي الفهم — اقرئيها مرتجعة',
        en: 'Read it back',
        minutes: 7,
        outcome: "Repeat the important detail in your own words so you catch any misunderstanding while it's still cheap.",
        outcome_ar: 'تكرّرين التفصيل المهم بكلماتك عشان تمسكين أي سوء فهم وهو رخيص.',
        idea: {
          body: "The most expensive mistakes start with 'I thought you meant…'. Reading it back — repeating the key part in your own words and asking 'right?' — catches the error while it's still cheap, before it becomes an incident.",
          model: 'The rule: repeat the important part in your own words. It costs you seconds and saves you hours.',
          body_ar:
            'أغلى الأخطاء تجي من «أنا فهمت إنك تقصد…». القراءة المرتجعة — إنك تعيدين المهم بكلماتك وتسألين «صح؟» — تمسك الخطأ وهو لسه رخيص، قبل ما يصير حادثة.',
          model_ar: 'القاعدة: كرّري المهم بكلماتك. ثوانٍ تكلّفك، وساعات توفّرها.',
        },
        phrases: [
          { en: 'So just to confirm — restart the node, not the whole cluster?', ar: 'بس للتأكيد — أعيد تشغيل العقدة، مو الكلستر كامل؟', when: 'An ambiguous instruction', when_ar: 'أمر فيه لبس' },
          { en: "What I'm hearing is… is that right?", ar: 'اللي فهمته هو… صح كذا؟', when: 'Summarising a long request', when_ar: 'تلخّصين طلب طويل' },
          { en: 'Let me read that back: ticket 4471, priority high.', ar: 'خلّيني أعيدها: تذكرة ٤٤٧١، أولوية عالية.', when: 'Numbers and details', when_ar: 'أرقام وتفاصيل' },
          { en: 'So the plan is X, then Y. Did I get that right?', ar: 'يعني الخطة X ثم Y. فهمتها صح؟', when: 'Ordered steps', when_ar: 'خطوات بترتيب' },
          { en: 'Just to be clear on the deadline — end of day today, your time?', ar: 'بس أوضّح الموعد — نهاية اليوم، بتوقيتك؟', when: 'Dates and time zones', when_ar: 'مواعيد وتوقيتات' },
        ],
        example: {
          setting: 'At the end of a bridge call, before you split up, you read the task back.',
          setting_ar: 'نهاية مكالمة جسر، قبل ما تتفرّقون تقرئين المهمة المرتجعة.',
          lines: [
            { who: 'Lead', en: 'Okay Sara, you take the database failover after we roll back.', ar: 'تمام سارة، أنتِ تاخذين تحويل قاعدة البيانات بعد ما نتراجع.' },
            { who: 'You', en: 'Let me read that back: you roll back first, then I trigger the failover. Right?', ar: 'خلّيني أعيدها: أنتم تتراجعون أول، بعدها أنا أشغّل التحويل. صح؟' },
            { who: 'Lead', en: 'Exactly.', ar: 'بالضبط.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Put together a strong read-back:',
          prompt_ar: 'رتّبي قراءة مرتجعة قوية:',
          steps: [
            { en: 'So just to confirm —', ar: 'بس للتأكيد —' },
            { en: 'I restart the node, not the whole cluster,', ar: 'أعيد تشغيل العقدة، مو الكلستر كامل،' },
            { en: 'after you finish the rollback.', ar: 'بعد ما تخلّصون التراجع.' },
            { en: 'Did I get that right?', ar: 'فهمتها صح؟' },
          ],
        },
        takeaway: 'A read-back costs seconds and saves hours.',
        takeaway_ar: 'القراءة المرتجعة تكلّف ثواني وتوفّر ساعات.',
      },
      {
        id: 'reflex-pushback',
        order: 4,
        ar: 'اعترضي بأدب',
        en: 'Push back cleanly',
        minutes: 8,
        outcome: "Say 'no' or 'not now' to a colleague or a manager in a way that protects both the system and the relationship.",
        outcome_ar: 'تقولين «لا» أو «مو الحين» لزميل أو مدير، بطريقة تحمي النظام والعلاقة.',
        idea: {
          body: "You'll need to say 'no', or 'not now', or 'that won't work' — to a colleague, and sometimes to a manager. Done right, it protects both the system and the relationship. The trick: push back on the idea, not the person, and always offer an alternative.",
          model: "The rule: push back on the idea, not the person — and a professional 'no' always comes with 'instead, let's…'.",
          body_ar:
            'بتحتاجين تقولين «لا» أو «مو الحين» أو «هذا ما بيمشي» — لزميل، وأحياناً لمدير. لو صار بطريقة صح، يحمي النظام والعلاقة مع بعض. السرّ: اعترضي على الفكرة مو على الشخص، وقدّمي بديل.',
          model_ar: 'القاعدة: اعترضي على الفكرة لا على الشخص — و«لا» المهنية دايماً معها «بدال كذا…».',
        },
        phrases: [
          { en: "I see what you mean, but I'm worried about the rollback.", ar: 'أفهم قصدك، بس قلقانة من التراجع.', when: 'Raising a concern respectfully', when_ar: 'تبدين تحفّظ باحترام' },
          { en: "That could work — though I'd suggest we test on staging first.", ar: 'ممكن يمشي — بس أقترح نجرّب على staging أول.', when: 'Agreeing with a tweak', when_ar: 'توافقين مع تعديل' },
          { en: 'Can we hold that until after the incident is closed?', ar: 'نقدر نأجّلها لين نقفل الحادثة؟', when: 'The timing is wrong', when_ar: 'التوقيت غلط' },
          { en: "I'm not comfortable doing that on production without a rollback plan.", ar: 'مو مرتاحة أسوّيها على الإنتاج بدون خطة تراجع.', when: 'Refusing a risky move', when_ar: 'ترفضين مخاطرة' },
          { en: "Let's park that for now and come back to it.", ar: 'نوقفها الحين ونرجع لها بعدين.', when: 'Parking a side discussion', when_ar: 'تأجّلين نقاش جانبي' },
        ],
        example: {
          setting: 'A colleague wants to push a risky change in the middle of the incident.',
          setting_ar: 'زميل يبغى يدفع تغيير محفوف بالمخاطر في نص الحادثة.',
          lines: [
            { who: 'Colleague', en: "Let's just push the config change now, it'll fix it.", ar: 'خلّنا ندفع تغيير الإعداد الحين، بيصلحها.' },
            { who: 'You', en: "I see what you mean, but I'm not comfortable changing production mid-incident. Can we test it on staging first?", ar: 'أفهم قصدك، بس مو مرتاحة نغيّر الإنتاج في نص الحادثة. نجرّبها على staging أول؟' },
            { who: 'Colleague', en: 'Fair. Let me spin up staging.', ar: 'منطقي. خلّيني أجهّز staging.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: "Your manager suggests a rushed step. What's the best way to say 'no, not now'?",
          prompt_ar: 'مديرك يقترح خطوة متسرّعة. أنسب طريقة تقولين فيها «لا، مو الحين»؟',
          options: [
            { en: "No, that's a bad idea.", ar: 'لا، فكرة سيّئة.', correct: false, why: 'It attacks the idea harshly and offers no alternative.', why_ar: 'تهاجم الفكرة بقسوة وبدون بديل.' },
            { en: "I'd hold off on that until we have a rollback plan — can I set one up first?", ar: 'أفضّل نأجّلها لين يكون عندنا خطة تراجع — أجهّزها أول؟', correct: true, why: 'It objects to the timing, gives a reason, and offers an alternative.', why_ar: 'تعترض على التوقيت، تعطي سبب، وتقدّم بديل.' },
            { en: 'Okay, whatever you think is best.', ar: 'طيب، اللي تشوفه أنت.', correct: false, why: "You're agreeing to a risk you're not convinced by.", why_ar: 'توافقين على مخاطرة أنتِ غير مقتنعة فيها.' },
          ],
        },
        takeaway: "A professional 'no' always comes with 'instead, let's…'.",
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
    tagline: 'From the daily standup to the crisis call — how to speak with confidence and clarity.',
    tagline_ar: 'من الوقوف اليومي إلى مكالمة الأزمة — كيف تتكلّمين بثقة ووضوح.',
    lessons: [
      {
        id: 'meet-standup',
        order: 1,
        ar: 'الوقوف اليومي',
        en: 'The daily standup',
        minutes: 7,
        outcome: 'Give your daily update in three tidy sentences, with no long story.',
        outcome_ar: 'تعطين تحديثك اليومي بثلاث جمل مرتّبة، بدون قصّة طويلة.',
        scenarioModuleNumber: 6,
        idea: {
          body: "The standup is three sentences, not a story: what you did yesterday, what you're doing today, what's blocking you. The shorter you keep your turn, the more people respect it.",
          model: "The rule: yesterday, today, what's blocking you — and that's it.",
          body_ar:
            'الوقوف اليومي ثلاث جمل، مو قصّة: أمس سوّيت إيش، اليوم بسوّي إيش، وش يعيقني. كل ما كان دورك مختصر، احترموه أكثر.',
          model_ar: 'القاعدة: أمس، اليوم، وش يعيقك — وبس.',
        },
        phrases: [
          { en: 'Yesterday I finished the backup migration.', ar: 'أمس خلّصت ترحيل النسخ الاحتياطي.', when: 'Yesterday', when_ar: 'أمس' },
          { en: "Today I'm working on the failover test.", ar: 'اليوم أشتغل على اختبار التحويل الاحتياطي.', when: 'Today', when_ar: 'اليوم' },
          { en: "I'm blocked on access to the staging server.", ar: 'معيقني الوصول لخادم الـ staging.', when: 'The blocker', when_ar: 'العائق' },
          { en: 'No blockers on my side.', ar: 'ما عندي عوائق من طرفي.', when: 'No blocker', when_ar: 'ما فيه عائق' },
          { en: "I'll need ten minutes with networking after this.", ar: 'بحتاج عشر دقائق مع فريق الشبكات بعد كذا.', when: 'A follow-up request', when_ar: 'طلب متابعة' },
        ],
        example: {
          setting: 'Your turn in the standup — exactly twenty seconds.',
          setting_ar: 'دورك في الوقوف اليومي — عشرون ثانية بالضبط.',
          lines: [
            { who: 'You', en: "Yesterday I finished the backup migration. Today I'm running the failover test. I'm blocked on staging access — I'll need ten minutes with networking after this.", ar: 'أمس خلّصت ترحيل النسخ الاحتياطي. اليوم أشغّل اختبار التحويل. معيقني الوصول لـ staging — بحتاج عشر دقائق مع الشبكات بعد كذا.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Put together a clean standup turn:',
          prompt_ar: 'رتّبي دور وقوف يومي نظيف:',
          steps: [
            { en: 'Yesterday I finished the backup migration.', ar: 'أمس خلّصت ترحيل النسخ الاحتياطي.' },
            { en: "Today I'm running the failover test.", ar: 'اليوم أشغّل اختبار التحويل.' },
            { en: "I'm blocked on staging access.", ar: 'معيقني الوصول لـ staging.' },
          ],
        },
        takeaway: "Three sentences: yesterday, today, what's blocking you.",
        takeaway_ar: 'ثلاث جمل: أمس، اليوم، وش يعيقك.',
      },
      {
        id: 'meet-status',
        order: 2,
        ar: 'تحديث الحالة — النتيجة أولاً',
        en: 'Impact-first status',
        minutes: 8,
        outcome: 'Lead with the impact and who is affected, before the technical details.',
        outcome_ar: 'تبدين بالأثر ومين تأثّر، قبل التفاصيل التقنية.',
        scenarioModuleNumber: 1,
        idea: {
          body: 'Management wants the impact before the mechanism. Start with what broke, who is affected, and since when — then the technical cause. The first sentence has to make sense to anyone, even someone non-technical.',
          model: 'The rule: what broke → who is affected → since when → the next update.',
          body_ar:
            'الإدارة تبغى الأثر قبل الآلية. ابدئي بإيش اللي خرب ومين تأثّر ومن متى، وبعدها السبب التقني. أول جملة لازم يفهمها أي شخص، حتى لو مو تقني.',
          model_ar: 'القاعدة: وش خرب → مين تأثّر → من متى → التحديث الجاي.',
        },
        phrases: [
          { en: 'Quick status: the payment service is down for about 20% of users.', ar: 'تحديث سريع: خدمة الدفع واقفة لتقريباً ٢٠٪ من المستخدمين.', when: 'Impact first', when_ar: 'الأثر أول' },
          { en: 'It started around 2 PM, right after the deploy.', ar: 'بدأت حوالي الساعة ٢، بعد النشر مباشرة.', when: 'Since when', when_ar: 'من متى' },
          { en: "We've isolated it to the database layer.", ar: 'حصرناها في طبقة قاعدة البيانات.', when: 'The cause, briefly', when_ar: 'السبب باختصار' },
          { en: 'No customer data is at risk.', ar: 'ما فيه بيانات عملاء في خطر.', when: 'Reassurance', when_ar: 'طمأنة' },
          { en: 'Next update in fifteen minutes.', ar: 'التحديث الجاي بعد ربع ساعة.', when: 'The cadence', when_ar: 'الإيقاع' },
        ],
        terms: [
          { term: 'outage', ar: 'انقطاع الخدمة', def_en: 'a period when a service is unavailable', example: 'We had a 40-minute outage.' },
          { term: 'impact', ar: 'الأثر', def_en: 'who or what is affected, and how much', example: 'The impact was limited to checkout.' },
          { term: 'ETA', ar: 'الوقت المتوقّع', def_en: 'estimated time until something is done', example: 'ETA on the fix is 20 minutes.' },
        ],
        example: {
          setting: 'You give a non-technical manager a status update in half a minute.',
          setting_ar: 'تعطين مديرًا غير تقني تحديثًا في نص دقيقة.',
          lines: [
            { who: 'You', en: "Quick status: checkout is failing for about 20% of users. It started at 2 PM after the deploy. No data is at risk. We've isolated it to the database and the next update is in fifteen minutes.", ar: 'تحديث سريع: الدفع يفشل لتقريباً ٢٠٪ من المستخدمين. بدأ الساعة ٢ بعد النشر. ما فيه بيانات في خطر. حصرناه في قاعدة البيانات، والتحديث الجاي بعد ربع ساعة.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Put together an impact-first status update:',
          prompt_ar: 'رتّبي تحديث حالة بأسلوب «النتيجة أولاً»:',
          steps: [
            { en: 'Checkout is down for about 20% of users.', ar: 'الدفع واقف لتقريباً ٢٠٪ من المستخدمين.' },
            { en: 'It started at 2 PM after the deploy.', ar: 'بدأ الساعة ٢ بعد النشر.' },
            { en: "We've isolated it to the database.", ar: 'حصرناه في قاعدة البيانات.' },
            { en: 'Next update in fifteen minutes.', ar: 'التحديث الجاي بعد ربع ساعة.' },
          ],
        },
        takeaway: 'Management wants the impact first and the cause second.',
        takeaway_ar: 'الإدارة تبي الأثر أول، والسبب بعدين.',
      },
      {
        id: 'meet-bridge',
        order: 3,
        ar: 'مكالمة الجسر / الأزمة',
        en: 'The bridge call',
        minutes: 9,
        outcome: 'Introduce yourself, take your turn, and set the update cadence on a call full of voices.',
        outcome_ar: 'تعرّفين نفسك، تاخذين دورك، وتثبّتين إيقاع التحديثات في مكالمة فيها أصوات كثيرة.',
        scenarioModuleNumber: 10,
        idea: {
          body: 'A bridge call has many voices and no single owner. Introduce yourself and what you own, and set a steady update cadence. Clarity here is leadership, not just talk.',
          model: 'The rule: introduce yourself, take your turn, set the cadence.',
          body_ar:
            'في مكالمة الجسر أصوات كثيرة ومالك واحد. عرّفي نفسك ووش تملكين، وثبّتي إيقاع تحديثات منتظم. الوضوح هنا قيادة، مو مجرّد كلام.',
          model_ar: 'القاعدة: عرّفي نفسك، خذي دورك، ثبّتي الإيقاع.',
        },
        phrases: [
          { en: "This is Sara from infrastructure — I'm leading on the database side.", ar: 'معكم سارة من البنية التحتية — أنا مسؤولة عن جانب قاعدة البيانات.', when: 'The introduction', when_ar: 'التعريف' },
          { en: "Can everyone mute unless they're speaking?", ar: 'ممكن الكل يكتم الصوت إلا وقت الكلام؟', when: 'Managing the noise', when_ar: 'تنظيم الضجيج' },
          { en: "Let's go around: networking, then the app team, then me.", ar: 'نمشي بالترتيب: الشبكات، بعدها فريق التطبيق، بعدها أنا.', when: 'Ordering the turns', when_ar: 'ترتيب الأدوار' },
          { en: "Here's where we are, and here's what I need.", ar: 'هذا وضعنا الحالي، وهذا اللي أحتاجه.', when: 'Update + request', when_ar: 'تحديث + طلب' },
          { en: "I'll post a written update in the channel every fifteen minutes.", ar: 'بنزّل تحديث مكتوب في القناة كل ربع ساعة.', when: 'The cadence', when_ar: 'الإيقاع' },
        ],
        example: {
          setting: "The first forty seconds of a bridge call, and you're taking charge.",
          setting_ar: 'أول أربعين ثانية من مكالمة جسر، وأنتِ تاخذين المسؤولية.',
          lines: [
            { who: 'You', en: "This is Sara from infrastructure, leading on the database side. Can everyone mute unless speaking? Let's go around — networking first, then the app team, then me.", ar: 'معكم سارة من البنية التحتية، مسؤولة عن قاعدة البيانات. ممكن الكل يكتم إلا وقت الكلام؟ نمشي بالترتيب — الشبكات أول، بعدها فريق التطبيق، بعدها أنا.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: 'The bridge is chaotic and voices are overlapping. What is the best way to take control respectfully?',
          prompt_ar: 'الجسر فوضى وأصوات متداخلة. أنسب طريقة تمسكين فيها الزمام باحترام؟',
          options: [
            { en: 'Everyone be quiet!', ar: 'الكل يسكت!', correct: false, why: 'It takes control, but harshly.', why_ar: 'تمسك الزمام لكن بطريقة حادّة.' },
            { en: "Can everyone mute unless they're speaking? Let's go around one team at a time.", ar: 'ممكن الكل يكتم إلا وقت الكلام؟ نمشي فريق فريق.', correct: true, why: 'It organises the call clearly and politely — calm leadership.', why_ar: 'تنظّم المكالمة بوضوح وأدب — قيادة هادئة.' },
            { en: "Sorry, I can't really hear anyone…", ar: 'آسفة، ما أسمع أحد بصراحة…', correct: false, why: 'It describes the problem without solving it.', why_ar: 'تصف المشكلة بدون ما تحلّها.' },
          ],
        },
        takeaway: 'On the bridge, clarity is leadership.',
        takeaway_ar: 'في الجسر، الوضوح قيادة.',
      },
      {
        id: 'meet-escalate',
        order: 4,
        ar: 'التصعيد الواضح',
        en: 'Escalate clearly',
        minutes: 7,
        outcome: 'Hand over a decision, not a worry: what you need, from whom, by when, and why.',
        outcome_ar: 'تسلّمين قرارًا لا قلقًا: إيش تحتاجين، من مين، متى، وليش.',
        scenarioModuleNumber: 5,
        idea: {
          body: "Escalation isn't panic — it's a clean hand-off of a decision. Say what you need, from whom, by when, and why. When the escalation is tidy, it shows you're on top of the situation, not afraid of it.",
          model: 'The rule: what I need, from whom, by when, and why.',
          body_ar:
            'التصعيد مو ذعر — هو تسليم نظيف لقرار. قولي إيش تحتاجين، من مين، بأي وقت، وليش. لما يكون التصعيد مرتّب، يبيّن إنك ماسكة الموقف، مو إنك خايفة.',
          model_ar: 'القاعدة: إيش أحتاج، من مين، متى، وليش.',
        },
        phrases: [
          { en: 'I need to escalate this.', ar: 'محتاجة أصعّد هالموضوع.', when: 'The opener', when_ar: 'الافتتاح' },
          { en: 'I need a decision from you in the next ten minutes.', ar: 'محتاجة قرار منك خلال عشر دقائق.', when: 'The request + the deadline', when_ar: 'الطلب + الموعد' },
          { en: 'This is above my access level — I need someone who can approve a production change.', ar: 'هذا فوق صلاحيتي — أحتاج شخص يقدر يعتمد تغيير على الإنتاج.', when: 'The reason to escalate', when_ar: 'سبب التصعيد' },
          { en: "If we don't act by 3 PM, the backlog will double.", ar: 'إذا ما تحرّكنا قبل الساعة ٣، بيتضاعف المتراكم.', when: 'The consequence', when_ar: 'العاقبة' },
          { en: "I've done X and Y; the next step needs your sign-off.", ar: 'سوّيت X و Y؛ الخطوة الجاية تحتاج اعتمادك.', when: 'The hand-off', when_ar: 'التسليم' },
        ],
        example: {
          setting: 'You escalate to your manager with a clear request and a deadline.',
          setting_ar: 'تصعّدين لمديرك بطلب واضح وموعد.',
          lines: [
            { who: 'You', en: "I need to escalate this. It's above my access level — I need someone who can approve a production change in the next ten minutes. If we don't act by 3 PM, the backlog doubles.", ar: 'محتاجة أصعّد هذا. فوق صلاحيتي — أحتاج شخص يعتمد تغيير على الإنتاج خلال عشر دقائق. إذا ما تحرّكنا قبل الساعة ٣، يتضاعف المتراكم.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Build a clean escalation:',
          prompt_ar: 'ابني تصعيدًا نظيفًا:',
          steps: [
            { en: 'I need to escalate this.', ar: 'محتاجة أصعّد هذا.' },
            { en: "It's above my access level.", ar: 'فوق صلاحيتي.' },
            { en: 'I need a production-change approval in ten minutes.', ar: 'أحتاج اعتماد تغيير إنتاج خلال عشر دقائق.' },
            { en: "If we don't act by 3 PM, the backlog doubles.", ar: 'إذا ما تحرّكنا قبل ٣، يتضاعف المتراكم.' },
          ],
        },
        takeaway: 'A good escalation hands over a decision, not a worry.',
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
    tagline: 'The report, the email, and quick messages — written clearly and professionally.',
    tagline_ar: 'التقرير، الإيميل، والرسائل السريعة — تكتبينها واضحة ومحترفة.',
    lessons: [
      {
        id: 'write-incident',
        order: 1,
        ar: 'تقرير الحادثة',
        en: 'The incident report',
        minutes: 9,
        outcome: 'Write a report anyone can read in half a minute: what happened, the impact, the cause, the fix, the prevention.',
        outcome_ar: 'تكتبين تقريرًا أي شخص يفهمه في نص دقيقة: وش صار، الأثر، السبب، الحل، الوقاية.',
        scenarioModuleNumber: 7,
        idea: {
          body: 'An incident report is a story in a fixed shape: what happened, the impact, the root cause, the resolution, and the prevention. Follow that order and anyone — technical or not — gets the full picture fast.',
          model: 'The rule: what happened, the impact, the cause, the fix, the prevention.',
          body_ar:
            'تقرير الحادثة قصّة بشكل ثابت: وش صار، الأثر، السبب الجذري، الحل، والوقاية. لو مشيتِ على هالترتيب، أي شخص — تقني أو إداري — يمسك الصورة بسرعة.',
          model_ar: 'القاعدة: وش صار، الأثر، السبب، الحل، الوقاية.',
        },
        phrases: [
          { en: 'Summary: the payment service was unavailable for 42 minutes.', ar: 'الملخّص: خدمة الدفع كانت متوقّفة ٤٢ دقيقة.', when: 'What happened', when_ar: 'وش صار' },
          { en: 'Impact: about 20% of checkout attempts failed.', ar: 'الأثر: تقريباً ٢٠٪ من محاولات الدفع فشلت.', when: 'The impact', when_ar: 'الأثر' },
          { en: 'Root cause: a failed database failover after the 2 PM deploy.', ar: 'السبب الجذري: فشل تحويل احتياطي لقاعدة البيانات بعد نشر الساعة ٢.', when: 'The cause', when_ar: 'السبب' },
          { en: 'Resolution: we rolled back the deploy and restored the primary.', ar: 'الحل: تراجعنا عن النشر واسترجعنا الخادم الأساسي.', when: 'The fix', when_ar: 'الحل' },
          { en: "Prevention: we're adding an automated failover check.", ar: 'الوقاية: نضيف فحص تحويل احتياطي تلقائي.', when: 'The prevention', when_ar: 'الوقاية' },
        ],
        terms: [
          { term: 'root cause', ar: 'السبب الجذري', def_en: 'the underlying reason, not just the symptom', example: 'The root cause was a config error.' },
          { term: 'resolution', ar: 'الحل / المعالجة', def_en: 'what actually fixed it', example: 'Resolution: rolled back the deploy.' },
          { term: 'timeline', ar: 'الخط الزمني', def_en: 'the sequence of events with times', example: 'See the timeline below.' },
        ],
        example: {
          setting: 'A short, professional incident report.',
          setting_ar: 'نموذج تقرير حادثة قصير ومحترف.',
          lines: [
            { who: 'Report', en: 'Summary: payment was down for 42 minutes. Impact: ~20% of checkouts failed. Root cause: a failed database failover after the 2 PM deploy. Resolution: rolled back and restored the primary. Prevention: adding an automated failover check.', ar: 'الملخّص: الدفع متوقّف ٤٢ دقيقة. الأثر: ~٢٠٪ من عمليات الدفع فشلت. السبب: فشل تحويل احتياطي بعد نشر الساعة ٢. الحل: تراجعنا واسترجعنا الأساسي. الوقاية: إضافة فحص تحويل تلقائي.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Put the five parts of the report in order:',
          prompt_ar: 'رتّبي أجزاء التقرير الخمسة:',
          steps: [
            { en: 'Summary: what happened', ar: 'الملخّص: وش صار' },
            { en: 'Impact: who was affected', ar: 'الأثر: مين تأثّر' },
            { en: 'Root cause: why it happened', ar: 'السبب الجذري: ليش صار' },
            { en: 'Resolution: what fixed it', ar: 'الحل: وش صلّحها' },
            { en: 'Prevention: how we stop it recurring', ar: 'الوقاية: كيف نمنع تكرارها' },
          ],
        },
        takeaway: 'A good report reads in half a minute.',
        takeaway_ar: 'التقرير الجيد يُقرأ في نص دقيقة.',
      },
      {
        id: 'write-email',
        order: 2,
        ar: 'الإيميل الواضح — الخلاصة أولاً',
        en: 'The clear email (BLUF)',
        minutes: 7,
        outcome: 'Put the ask in the first line, with a subject that earns a fast reply.',
        outcome_ar: 'تحطّين المطلوب في أول سطر، وعنوان يجذب رد سريع.',
        idea: {
          body: "Busy people read the subject and the first line only. Put the bottom line up front (BLUF): what you need from them, in the first sentence, then the explanation. The subject line has to say 'what's needed and by when'.",
          model: 'The rule: the bottom line in the first line, and a subject that states the ask.',
          body_ar:
            'الناس المشغولين يقرون العنوان وأول سطر بس. حطّي الخلاصة فوق (BLUF — bottom line up front): إيش تبغين منهم، بأول جملة، وبعدها الشرح. العنوان لازم يقول «إيش المطلوب ومتى».',
          model_ar: 'القاعدة: الخلاصة بأول سطر، والعنوان يقول المطلوب.',
        },
        phrases: [
          { en: 'Subject: Action needed — approve DB maintenance window (by Thu)', ar: 'العنوان: مطلوب إجراء — اعتماد نافذة صيانة قاعدة البيانات (قبل الخميس)', when: 'The subject', when_ar: 'العنوان' },
          { en: 'Bottom line: I need your approval to take the database offline for 30 minutes on Friday.', ar: 'الخلاصة: أحتاج موافقتك أوقف قاعدة البيانات ٣٠ دقيقة يوم الجمعة.', when: 'The first line', when_ar: 'أول سطر' },
          { en: "Here's why, and here's the plan.", ar: 'هذا السبب، وهذي الخطة.', when: 'The explanation after', when_ar: 'الشرح بعدها' },
          { en: 'No action needed — this is just an FYI.', ar: 'ما فيه إجراء مطلوب — للعلم بس.', when: 'An FYI message', when_ar: 'رسالة معلومة' },
          { en: 'Let me know by Thursday so I can schedule it.', ar: 'خبّرني قبل الخميس عشان أجدولها.', when: 'The deadline', when_ar: 'الموعد النهائي' },
        ],
        terms: [
          { term: 'BLUF', ar: 'الخلاصة أولاً', def_en: 'bottom line up front — the point in line one', example: 'BLUF: I need approval by Friday.' },
          { term: 'FYI', ar: 'للعلم', def_en: 'for your information — no action needed', example: 'FYI, staging is back up.' },
          { term: 'follow up', ar: 'المتابعة', def_en: 'a reminder or continuation message', example: "I'll follow up tomorrow." },
        ],
        example: {
          setting: 'The same request — once clear, once rambling.',
          setting_ar: 'نفس الطلب — مرّة واضح، ومرّة مبعثر.',
          lines: [
            { who: 'Clear', en: "Bottom line: I need approval to take the DB offline for 30 minutes Friday. Here's the plan. Please reply by Thursday.", ar: 'الخلاصة: أحتاج موافقة أوقف قاعدة البيانات ٣٠ دقيقة الجمعة. هذي الخطة. ردّ قبل الخميس.' },
            { who: 'Rambling', en: "Hi, hope you're well, so I was thinking about some maintenance stuff and maybe Friday could work if that's okay with everyone…", ar: 'مرحبا، أتمنى تكون بخير، كنت أفكر في شغل صيانة ويمكن الجمعة تنفع لو تناسب الجميع…' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: 'Which subject line earns a faster reply?',
          prompt_ar: 'أي عنوان يجذب رد أسرع؟',
          options: [
            { en: 'Subject: Quick question', ar: 'العنوان: سؤال سريع', correct: false, why: 'Vague — it says neither the ask nor the deadline.', why_ar: 'غامض، ما يقول المطلوب ولا الموعد.' },
            { en: 'Subject: Action needed — approve DB maintenance window (by Thu)', ar: 'العنوان: مطلوب إجراء — اعتماد نافذة صيانة (قبل الخميس)', correct: true, why: 'It states the ask and the deadline clearly, so it gets read first.', why_ar: 'يقول المطلوب والموعد بوضوح، فيجي أول.' },
            { en: 'Subject: Hey', ar: 'العنوان: هلا', correct: false, why: 'It gives no context to make them open it.', why_ar: 'ما يعطي أي سياق يخلّيه يفتحها.' },
          ],
        },
        takeaway: 'If they only read one line, make it the one that matters.',
        takeaway_ar: 'إذا ما قروا إلا سطر، خلّيه المهم.',
      },
      {
        id: 'write-chat',
        order: 3,
        ar: 'الرسائل السريعة اللي تُقرأ بوضوح',
        en: 'Chat that reads well',
        minutes: 6,
        outcome: 'Write a Slack or Teams update: one idea, with its context, in a single message.',
        outcome_ar: 'تكتبين تحديثًا في Slack/Teams: فكرة وحدة، مع سياقها، برسالة وحدة.',
        idea: {
          body: "Chat messages aren't text messages. A good message is one idea, with its context — not five pings in a row. Clear, with the status, and readable in one go.",
          model: 'The rule: one idea, with its context, in one message.',
          body_ar:
            'الرسائل السريعة مو زي الرسائل النصية القصيرة. الرسالة الزينة فكرة وحدة، مع سياقها، مو خمس تنبيهات متتالية. واضحة، فيها الحالة، وتُقرأ مرة وحدة.',
          model_ar: 'القاعدة: فكرة وحدة، مع سياقها، برسالة وحدة.',
        },
        phrases: [
          { en: "Heads up: staging is down, I'm looking into it.", ar: 'تنبيه: staging واقف، أنا أفحصه.', when: 'A proactive heads-up', when_ar: 'تنبيه استباقي' },
          { en: 'Quick question — who owns the DNS config?', ar: 'سؤال سريع — مين مسؤول عن إعداد الـ DNS؟', when: 'A directed question', when_ar: 'سؤال موجّه' },
          { en: 'Following up on my message about the backup job.', ar: 'متابعة لرسالتي عن مهمة النسخ الاحتياطي.', when: 'A follow-up', when_ar: 'متابعة' },
          { en: 'Done ✅ — the node is back in the pool.', ar: 'تمّت ✅ — العقدة رجعت للمجموعة.', when: 'A clear close', when_ar: 'إغلاق واضح' },
          { en: "I'll thread the details below to keep the channel clean.", ar: 'بحط التفاصيل في رد أسفلها عشان تبقى القناة مرتّبة.', when: 'Keeping it tidy', when_ar: 'تنظيم' },
        ],
        example: {
          setting: 'A clean update versus a noisy one.',
          setting_ar: 'تحديث نظيف مقابل تحديث مزعج.',
          lines: [
            { who: 'Clean', en: "Heads up: staging is down (500s on login). I'm on it, update in 10.", ar: 'تنبيه: staging واقف (أخطاء ٥٠٠ في الدخول). أنا عليه، تحديث بعد ١٠ دقائق.' },
            { who: 'Noisy', en: "hey / u there / something's wrong / staging?? / anyone", ar: 'هلا / موجود؟ / فيه خطأ / staging؟؟ / أحد' },
          ],
        },
        practice: {
          type: 'reflect',
          prompt: "Take this noisy thread and rewrite it as one clean message: 'hey / u there / staging broken / help'. Write it in English, one-idea-with-its-context style.",
          prompt_ar: 'خذي هالسلسلة المزعجة وأعيدي كتابتها كرسالة وحدة نظيفة: «hey / u there / staging broken / help». اكتبيها بالإنجليزي بأسلوب فكرة-وحدة-مع-سياقها.',
          hint: "Start with 'Heads up', give the symptoms, and say what you're doing and the next update time.",
          hint_ar: 'ابدئي بـ Heads up، حطّي الأعراض، وقولي إيش تسوّين والوقت الجاي.',
        },
        takeaway: 'A good message reads once and lands.',
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
    tagline: 'Your terminology, and how you explain it — to the technical and the non-technical alike.',
    tagline_ar: 'مصطلحاتك، وطريقة ما تشرحينها — للتقنيّ وللي مو تقنيّ.',
    lessons: [
      {
        id: 'tech-terms',
        order: 1,
        ar: 'مصطلحات البنية التحتية',
        en: 'Infrastructure terms',
        minutes: 8,
        outcome: 'Pronounce the terms that break up over the phone — slowly and clearly.',
        outcome_ar: 'تنطقين المصطلحات اللي تتكسّر على خط الهاتف، بوضوح وبطء.',
        idea: {
          body: 'These are the words that break up over the phone for an Arabic speaker — say them slowly and stress the right syllable. Pronounce them clearly and they land the first time.',
          model: 'The rule: the right term, said slowly and clearly, gets through.',
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
          { en: 'We triggered a failover to the backup node.', ar: 'شغّلنا تحوّلًا احتياطيًا للعقدة البديلة.', when: 'failover', when_ar: 'failover' },
          { en: "I'll provision a new server for staging.", ar: 'بجهّز خادمًا جديدًا للـ staging.', when: 'provision', when_ar: 'provision' },
          { en: 'Users are seeing high latency right now.', ar: 'المستخدمين يشوفون زمن استجابة عالي الحين.', when: 'latency', when_ar: 'latency' },
          { en: "Let's do a rollback to the last stable release.", ar: 'نسوّي تراجعًا لآخر إصدار مستقر.', when: 'rollback', when_ar: 'rollback' },
        ],
        example: {
          setting: 'You use three terms correctly in one sentence to a colleague.',
          setting_ar: 'تستخدمين ثلاثة مصطلحات صح في جملة وحدة لزميل.',
          lines: [
            { who: 'You', en: 'Latency spiked after the deploy, so we did a rollback and triggered a failover to the backup node.', ar: 'زمن الاستجابة ارتفع بعد النشر، فسوّينا تراجعًا وشغّلنا تحوّلًا احتياطيًا للعقدة البديلة.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: 'The primary server went down and you want to explain that you switched to the backup automatically. Which term?',
          prompt_ar: 'الخادم الأساسي طاح، وتبغين تشرحين إنكم تحوّلتم للبديل تلقائيًا. أي مصطلح؟',
          options: [
            { en: 'We did a rollback.', ar: 'سوّينا تراجعًا.', correct: false, why: 'A rollback means reverting to an earlier version, not switching to a backup server.', why_ar: 'التراجع = الرجوع لإصدار سابق، مو التحوّل لخادم بديل.' },
            { en: 'We triggered a failover.', ar: 'شغّلنا تحوّلًا احتياطيًا.', correct: true, why: 'Failover means switching to the backup system when the primary fails — exactly right.', why_ar: 'failover = التحوّل للنظام البديل عند فشل الأساسي — بالضبط.' },
            { en: 'We provisioned it.', ar: 'جهّزناه.', correct: false, why: 'Provision means setting up a new resource, not switching over on failure.', why_ar: 'provision = تجهيز مورد جديد، مو التحوّل عند الفشل.' },
          ],
        },
        takeaway: 'The right term, said slowly and clearly, gets through.',
        takeaway_ar: 'المصطلح الصحيح، ببطء ووضوح، يوصل.',
      },
      {
        id: 'tech-explain-simply',
        order: 2,
        ar: 'اشرحيها ببساطة',
        en: 'Explain it simply',
        minutes: 8,
        outcome: 'Explain a technical problem to a non-technical person with an everyday comparison and the impact they feel.',
        outcome_ar: 'تشرحين مشكلة تقنية للي مو تقني، بتشبيه من يومهم وبالأثر اللي يحسّونه.',
        scenarioModuleNumber: 8,
        idea: {
          body: "With a non-technical person, drop the jargon and use a comparison from their daily life, and start with the impact they feel. They don't care 'what happened technically' — they care 'how it affected me'.",
          model: 'The rule: the impact they feel, with a comparison from their day.',
          body_ar:
            'مع شخص غير تقني، اتركي المصطلحات واستخدمي تشبيه من حياته اليومية، وابدئي بالأثر اللي يحسّه هو. مو مهم عنده «إيش صار تقنيًا»، مهم عنده «كيف أثّر عليّ».',
          model_ar: 'القاعدة: الأثر اللي يحسّونه، بتشبيه من يومهم.',
        },
        phrases: [
          { en: 'Think of it like a traffic jam — requests are piling up faster than we can clear them.', ar: 'تخيّلها زحمة سير — الطلبات تتكدّس أسرع مما نقدر نصرّفها.', when: 'A comparison', when_ar: 'تشبيه' },
          { en: 'In simple terms, the system that saves your data was briefly unreachable.', ar: 'ببساطة، النظام اللي يحفظ بياناتك كان صعب الوصول له للحظات.', when: 'Simplifying', when_ar: 'تبسيط' },
          { en: 'For you, that meant checkout was slow for about twenty minutes.', ar: 'بالنسبة لك، هذا معناه إن الدفع كان بطيء تقريباً عشرين دقيقة.', when: 'The impact on them', when_ar: 'الأثر عليهم' },
          { en: "It's fixed now, and nothing was lost.", ar: 'انحلّت الحين، وما ضاع شي.', when: 'Reassurance', when_ar: 'طمأنة' },
          { en: "The technical cause was a failed failover, but what matters to you is: it's resolved.", ar: 'السبب التقني فشل تحوّل احتياطي، بس المهم لك: انحلّت.', when: 'Shrinking the jargon', when_ar: 'اختصار المصطلح' },
        ],
        example: {
          setting: 'The same outage — once for a manager, once for an engineer.',
          setting_ar: 'نفس الانقطاع — مرّة لمدير، ومرّة لمهندس.',
          lines: [
            { who: 'To a manager', en: "Think of it like a traffic jam — for you, checkout was slow for twenty minutes. It's fixed now and nothing was lost.", ar: 'تخيّلها زحمة سير — بالنسبة لك الدفع كان بطيء عشرين دقيقة. انحلّت الحين وما ضاع شي.' },
            { who: 'To an engineer', en: "The primary rejected new connections after the deploy and failover didn't kick in.", ar: 'الأساسي رفض الاتصالات الجديدة بعد النشر والتحوّل الاحتياطي ما اشتغل.' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: "A non-technical manager asked 'what happened?'. Best answer?",
          prompt_ar: 'مدير غير تقني سألك «وش صار؟». أنسب جواب؟',
          options: [
            { en: 'The primary DB rejected connections because the failover config was stale.', ar: 'قاعدة البيانات الأساسية رفضت الاتصالات لأن إعداد التحويل كان قديمًا.', correct: false, why: 'Too much jargon for a non-technical person.', why_ar: 'مصطلحات كثيرة لشخص غير تقني.' },
            { en: "For a few minutes the part that saves data was unreachable, so checkout was slow. It's fixed and nothing was lost.", ar: 'لدقائق، الجزء اللي يحفظ البيانات كان صعب الوصول له، فصار الدفع بطيء. انحلّت وما ضاع شي.', correct: true, why: 'A felt impact plus reassurance, with no jargon.', why_ar: 'أثر محسوس + طمأنة، بدون مصطلحات.' },
            { en: 'It was a database thing, complicated.', ar: 'كانت مشكلة قواعد بيانات، معقّدة.', correct: false, why: "Over-simplifying makes you look like you're not in control of the situation.", why_ar: 'تبسيط زايد يبيّنك غير مسيطرة على الموقف.' },
          ],
        },
        takeaway: 'Explain the impact, not the mechanism.',
        takeaway_ar: 'اشرحي الأثر، لا الآلية.',
      },
      {
        id: 'tech-rootcause',
        order: 3,
        ar: 'سرد السبب الجذري',
        en: 'The root-cause story',
        minutes: 8,
        outcome: 'Tell the cause as an ordered chain: the trigger → what broke → why it cascaded → how you confirmed it.',
        outcome_ar: 'تروين السبب كسلسلة مرتّبة: شرارة → إيش انكسر → ليش تسلسل → كيف تأكّدتِ.',
        scenarioModuleNumber: 3,
        idea: {
          body: 'A root cause is a chain, told in order: the trigger that started it, what broke because of it, why the failure cascaded, and how you confirmed it. A tidy story, not a bullet list.',
          model: 'The rule: a trigger, then a cascade, then the evidence.',
          body_ar:
            'السبب الجذري سلسلة، تُروى بالترتيب: الشرارة اللي بدأت، إيش انكسر بسببها، ليش تسلسل الانهيار، وكيف تأكّدتِ. قصّة مرتّبة، مو قائمة نقاط.',
          model_ar: 'القاعدة: شرارة، ثم انهيار، ثم دليل.',
        },
        phrases: [
          { en: 'It started when the 2 PM deploy changed the connection settings.', ar: 'بدأت لما نشر الساعة ٢ غيّر إعدادات الاتصال.', when: 'The trigger', when_ar: 'الشرارة' },
          { en: 'That caused the primary database to reject new connections.', ar: 'وهذا خلّى قاعدة البيانات الأساسية ترفض الاتصالات الجديدة.', when: 'What broke', when_ar: 'إيش انكسر' },
          { en: "Because failover wasn't configured for that case, traffic had nowhere to go.", ar: 'ولأن التحوّل الاحتياطي مو مهيّأ لهالحالة، ما لقى الترافيك مكان يروح له.', when: 'Why it cascaded', when_ar: 'ليش تسلسل' },
          { en: 'We confirmed it by checking the connection logs.', ar: 'تأكّدنا بمراجعة سجلّات الاتصال.', when: 'The evidence', when_ar: 'الدليل' },
          { en: 'The fix was to correct the settings and add a failover rule.', ar: 'الحل كان تصحيح الإعدادات وإضافة قاعدة تحوّل احتياطي.', when: 'The fix', when_ar: 'الحل' },
        ],
        terms: [
          { term: 'trigger', ar: 'الشرارة / المُطلِق', def_en: 'the event that started the chain', example: 'The deploy was the trigger.' },
          { term: 'cascade', ar: 'التسلسل / الانهيار المتتابع', def_en: 'one failure causing the next', example: 'It cascaded across services.' },
          { term: 'contributing factor', ar: 'عامل مساهم', def_en: "something that made it worse but wasn't the root", example: 'Low disk space was a contributing factor.' },
        ],
        example: {
          setting: 'A root-cause story in forty seconds.',
          setting_ar: 'سرد سبب جذري في أربعين ثانية.',
          lines: [
            { who: 'You', en: "It started when the 2 PM deploy changed the connection settings. That made the primary reject new connections. Because failover wasn't set for that case, traffic had nowhere to go. We confirmed it in the connection logs.", ar: 'بدأت لما نشر الساعة ٢ غيّر إعدادات الاتصال. فصار الأساسي يرفض الاتصالات. ولأن التحوّل مو مهيّأ لهالحالة، ما لقى الترافيك مكان. تأكّدنا من سجلّات الاتصال.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: 'Put the root-cause chain in order:',
          prompt_ar: 'رتّبي سلسلة السبب الجذري:',
          steps: [
            { en: 'The 2 PM deploy changed the connection settings.', ar: 'نشر الساعة ٢ غيّر إعدادات الاتصال.' },
            { en: 'The primary started rejecting new connections.', ar: 'الأساسي بدأ يرفض الاتصالات الجديدة.' },
            { en: "Failover wasn't set for that case, so traffic had nowhere to go.", ar: 'التحوّل مو مهيّأ لهالحالة، فما لقى الترافيك مكان.' },
            { en: 'We confirmed it in the connection logs.', ar: 'تأكّدنا من سجلّات الاتصال.' },
          ],
        },
        takeaway: 'A root cause is an ordered story, not a list.',
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
    tagline: 'The relationship with your remote team, across cultures, and with your manager — half the job.',
    tagline_ar: 'العلاقة مع الفريق البعيد، بين الثقافات، ومع مديرك — نص الشغل.',
    lessons: [
      {
        id: 'human-rapport',
        order: 1,
        ar: 'كسر الجليد مع الفريق البعيد',
        en: 'Rapport with the team',
        minutes: 6,
        outcome: 'Open the call with two human minutes that make everything after it easier.',
        outcome_ar: 'تفتحين المكالمة بدقيقتين إنسانية تسهّل كل اللي بعدها.',
        idea: {
          body: 'Two minutes of human talk before the technical part makes the whole call smoother. Small, genuine, not forced — a question about their day or the weather where they are is enough.',
          model: 'The rule: two human minutes open the door.',
          body_ar:
            'دقيقتين كلام إنساني قبل الجزء التقني تخلّي المكالمة كلها أسلس. صغيرة، صادقة، مو مصطنعة — كفاية سؤال عن يومهم أو الطقس عندهم.',
          model_ar: 'القاعدة: دقيقتين إنسانية تفتح الباب.',
        },
        phrases: [
          { en: "How's your day going so far?", ar: 'كيف يومك لين الحين؟', when: 'A general opener', when_ar: 'افتتاح عام' },
          { en: "How's the weather over there in Bangalore?", ar: 'كيف الطقس عندكم في بنغالور؟', when: 'A personal touch', when_ar: 'لمسة شخصية' },
          { en: 'Before we start — how was your weekend?', ar: 'قبل ما نبدأ — كيف كانت إجازتك؟', when: 'Start of the week', when_ar: 'بداية أسبوع' },
          { en: 'Thanks for jumping on so quickly.', ar: 'مشكور على سرعة التجاوب.', when: 'Appreciation', when_ar: 'تقدير' },
          { en: "It's always good working with you.", ar: 'دايماً حلو الشغل معك.', when: 'A warm close', when_ar: 'ختام دافئ' },
        ],
        example: {
          setting: 'A warm twenty-second opener before a bridge call.',
          setting_ar: 'افتتاحية دافئة عشرين ثانية قبل مكالمة جسر.',
          lines: [
            { who: 'You', en: "Hey Arjun, thanks for jumping on so quickly. How's your day going over there?", ar: 'هلا أرجون، مشكور على سرعة التجاوب. كيف يومك عندكم؟' },
            { who: 'Arjun', en: "Busy, but good! Let's dig in.", ar: 'مشغول، بس زين! خلّنا نبدأ.' },
          ],
        },
        practice: {
          type: 'reflect',
          prompt: 'Write a two-line opener in English for tomorrow\'s call with the remote team — a human question plus a word of appreciation.',
          prompt_ar: 'اكتبي بالإنجليزي افتتاحية سطرين لمكالمة بكرة مع الفريق البعيد — سؤال إنساني + كلمة تقدير.',
          hint: "Example: 'Hey [name], good to see you. How was your weekend?'",
          hint_ar: 'مثال: «Hey [name], good to see you. How was your weekend?»',
        },
        takeaway: 'Work goes better between people who know each other.',
        takeaway_ar: 'الشغل يمشي أحسن بين ناس يعرفون بعض.',
      },
      {
        id: 'human-crosscultural',
        order: 2,
        ar: 'التواصل بين الثقافات',
        en: 'Cross-cultural clarity',
        minutes: 7,
        outcome: "Avoid confusing expressions, confirm more, and read 'yes' with care.",
        outcome_ar: 'تتجنّبين التعابير المحيّرة، تأكّدين أكثر، وتقرين «نعم» بحذر.',
        idea: {
          body: "With a mixed team, avoid idioms and sarcasm, and confirm more. And watch out for 'yes' — sometimes it means 'I heard you', not 'I agree'. Over-confirming is cheaper than a misunderstanding.",
          model: "The rule: keep it simple, confirm more, and watch out for 'yes'.",
          body_ar:
            'مع فريق مختلط، تجنّبي التعابير الاصطلاحية والسخرية، وأكّدي أكثر. وانتبهي لـ«نعم» — أحياناً معناها «سمعتك»، مو «أوافقك». التأكيد الزائد أرخص من سوء الفهم.',
          model_ar: 'القاعدة: بساطة، تأكيد أكثر، وانتبهي لـ«نعم».',
        },
        phrases: [
          { en: "Let me confirm we're on the same page.", ar: 'خلّيني أتأكد إننا متفقين.', when: 'Locking in understanding', when_ar: 'تثبيت الفهم' },
          { en: "When you say yes, do you mean you agree, or that you'll look into it?", ar: 'لما تقول نعم، تقصد توافق، ولا بتشوف الموضوع؟', when: "Clarifying a 'yes'", when_ar: 'توضيح «نعم»' },
          { en: "I'll write it down so nothing gets lost in translation.", ar: 'بكتبها عشان ما يضيع شي في الترجمة.', when: 'Documenting', when_ar: 'توثيق' },
          { en: "Please stop me if anything I say isn't clear.", ar: 'أوقفني لو أي شي أقوله مو واضح.', when: 'Inviting interruptions', when_ar: 'دعوة للمقاطعة' },
          { en: "Different time zones — let's agree on one time in UTC.", ar: 'مناطق زمنية مختلفة — نتفق على وقت واحد بتوقيت UTC.', when: 'Coordinating time', when_ar: 'تنسيق وقت' },
        ],
        example: {
          setting: "You catch a 'yes' that really means 'maybe'.",
          setting_ar: 'تمسكين «نعم» اللي معناها «يمكن».',
          lines: [
            { who: 'Teammate', en: 'Yes, yes, we can do that.', ar: 'نعم، نعم، نقدر نسوّيها.' },
            { who: 'You', en: "Just to confirm — do you mean you can do it today, or you'll check and get back to me?", ar: 'بس للتأكيد — تقصد تقدر اليوم، ولا بتشوف وترجع لي؟' },
          ],
        },
        practice: {
          type: 'choose',
          prompt: 'The clearest way to confirm across cultures?',
          prompt_ar: 'أوضح طريقة تأكيد بين الثقافات؟',
          options: [
            { en: 'Cool, got it, moving on.', ar: 'تمام، فهمت، نكمّل.', correct: false, why: 'It assumes understanding without checking.', why_ar: 'تفترض التفاهم بدون ما تتأكدين.' },
            { en: "Let me confirm we're on the same page — you'll send the config by Tuesday, correct?", ar: 'خلّيني أتأكد إننا متفقين — بترسل الإعداد قبل الثلاثاء، صح؟', correct: true, why: 'An explicit confirmation with a detail and a deadline.', why_ar: 'تأكيد صريح بتفصيل وموعد.' },
            { en: 'You know what I mean.', ar: 'أنت فاهم قصدي.', correct: false, why: 'A vague phrase that opens the door to misunderstanding.', why_ar: 'تعبير غامض يفتح باب سوء الفهم.' },
          ],
        },
        takeaway: 'Over-confirming is cheaper than a misunderstanding.',
        takeaway_ar: 'التأكيد الزائد أرخص من سوء الفهم.',
      },
      {
        id: 'human-managing-up',
        order: 3,
        ar: 'إدارة العلاقة مع مديرك',
        en: 'Managing up',
        minutes: 7,
        outcome: 'Flag risks early, bring options instead of problems, and summarise the decisions.',
        outcome_ar: 'تنبّهين للمخاطر بدري، تجيبين خيارات مو مشاكل، وتلخّصين القرارات.',
        idea: {
          body: 'Your manager wants zero surprises. Flag risks early, before they grow; bring options, not just problems; and summarise the decision you agreed on. That is how they come to trust you and relax.',
          model: 'The rule: early, with options, and with a summary.',
          body_ar:
            'مديرك يبغى صفر مفاجآت. نبّهي للمخاطر بدري قبل ما تكبر، وجيبي خيارات مو بس مشاكل، ولخّصي القرار اللي اتفقتوا عليه. كذا يثق فيك ويرتاح.',
          model_ar: 'القاعدة: بدري، بخيارات، وبتلخيص.',
        },
        phrases: [
          { en: 'I want to flag a risk early, before it grows.', ar: 'أبغى أنبّه لمخاطرة بدري قبل ما تكبر.', when: 'A proactive flag', when_ar: 'تنبيه استباقي' },
          { en: "Here are two options, and here's the one I'd pick.", ar: 'عندي خيارين، وهذا اللي بختاره.', when: 'Options + a recommendation', when_ar: 'خيارات + توصية' },
          { en: "Just so there are no surprises — this might slip to Monday.", ar: 'بس عشان ما فيه مفاجآت — يمكن تتأخّر للإثنين.', when: 'Transparency', when_ar: 'شفافية' },
          { en: 'To confirm what we decided: we go with option B.', ar: 'لتأكيد اللي قرّرناه: نمشي بالخيار B.', when: 'Summarising a decision', when_ar: 'تلخيص قرار' },
          { en: "I'll keep you posted — you won't have to chase me.", ar: 'بخلّيك على اطّلاع — ما بتحتاج تلحقني.', when: 'Reassurance', when_ar: 'طمأنة' },
        ],
        example: {
          setting: 'You flag a risk to your manager with two options.',
          setting_ar: 'تنبّهين مديرك لمخاطرة مع خيارين.',
          lines: [
            { who: 'You', en: "I want to flag a risk early: the migration might slip to Monday. Two options — we delay the launch, or we ship read-only first. I'd pick read-only. Your call.", ar: 'أبغى أنبّه لمخاطرة بدري: الترحيل يمكن يتأخّر للإثنين. خيارين — نأجّل الإطلاق، أو نطلق للقراءة فقط أول. أنا أختار القراءة فقط. القرار لك.' },
          ],
        },
        practice: {
          type: 'order',
          prompt: "Build a 'flag a risk' message:",
          prompt_ar: 'ابني رسالة «تنبيه لمخاطرة»:',
          steps: [
            { en: 'I want to flag a risk early:', ar: 'أبغى أنبّه لمخاطرة بدري:' },
            { en: 'the migration might slip to Monday.', ar: 'الترحيل يمكن يتأخّر للإثنين.' },
            { en: 'Two options — delay the launch, or ship read-only first.', ar: 'خيارين — نأجّل الإطلاق، أو نطلق للقراءة فقط أول.' },
            { en: "I'd pick read-only. Your call.", ar: 'أنا أختار القراءة فقط. القرار لك.' },
          ],
        },
        takeaway: 'Your manager wants zero surprises.',
        takeaway_ar: 'المدير يبي صفر مفاجآت.',
      },
    ],
  },
{
  "id": "foundations",
  "order": 6,
  "icon": "Blocks",
  "ar": "الأساسيات المتينة",
  "en": "Foundations",
  "tagline": "The grammar that actually holds up when you're speaking under pressure at work.",
  "tagline_ar": "القواعد اللي فعلاً تثبت وأنتِ تتكلّمين تحت الضغط في الشغل.",
  "lessons": [
    {
      "id": "foundations-now-vs-usually",
      "order": 1,
      "ar": "الحين مقابل عادةً",
      "en": "Now vs usually",
      "minutes": 7,
      "outcome": "Say what's happening right now versus what's always true — and stop mixing the two.",
      "outcome_ar": "تفرّقين بين اللي يصير الحين واللي دايم صحيح، وتبطّلين الخلط بينهم.",
      "idea": {
        "body": "Two present tenses, two jobs. Present simple is for routines, facts, and things that are always true — \"I look after the payment systems.\" Present continuous is for what's happening around now — \"I'm rolling out the update.\" Arabic doesn't split them this way, so the fix worth drilling first is simply: is this a habit, or is it happening this minute?",
        "model": "The rule: present simple = always true; present continuous (am/is/are + -ing) = happening now.",
        "body_ar": "زمنين للمضارع، كل واحد له شغلة. البسيط للروتين والحقائق واللي دايم صحيح — «I look after the payment systems». والمستمر لللي يصير حوالين الحين — «I am rolling out the update». العربي ما يفصلهم كذا، فأول شي تضبطينه: هذي عادة، ولا تصير هاللحظة؟",
        "model_ar": "القاعدة: البسيط = دايم صحيح، والمستمر (am/is/are + ing) = يصير الحين."
      },
      "phrases": [
        {
          "en": "I look after the payment systems.",
          "ar": "أنا مسؤولة عن أنظمة الدفع.",
          "when": "Your role — always true",
          "when_ar": "دورك — دايم صحيح"
        },
        {
          "en": "Right now I'm rolling out the update.",
          "ar": "الحين أنزّل التحديث.",
          "when": "Happening this moment",
          "when_ar": "يصير هاللحظة"
        },
        {
          "en": "We deploy every Tuesday.",
          "ar": "ننشر كل ثلاثاء.",
          "when": "A regular routine",
          "when_ar": "روتين منتظم"
        },
        {
          "en": "I usually work from the Riyadh office.",
          "ar": "عادةً أشتغل من مكتب الرياض.",
          "when": "A habit, with 'usually'",
          "when_ar": "عادة، مع usually"
        },
        {
          "en": "I'm working from home this week.",
          "ar": "هالأسبوع أشتغل من البيت.",
          "when": "A temporary situation",
          "when_ar": "وضع مؤقت"
        },
        {
          "en": "This dashboard shows live traffic.",
          "ar": "هذي اللوحة تعرض الترافيك المباشر.",
          "when": "A fact about how something works",
          "when_ar": "حقيقة عن كيف يشتغل شي"
        }
      ],
      "example": {
        "setting": "A new colleague asks Sara what she does on the team.",
        "setting_ar": "زميل جديد يسأل سارة وش تسوّي في الفريق.",
        "lines": [
          {
            "who": "Colleague",
            "en": "So what do you do on the team?",
            "ar": "طيب وش تسوّين في الفريق؟"
          },
          {
            "who": "You",
            "en": "I look after the payment systems — but this week I'm covering the on-call rota too.",
            "ar": "أنا مسؤولة عن أنظمة الدفع — بس هالأسبوع أغطّي مناوبة الطوارئ بعد."
          },
          {
            "who": "Colleague",
            "en": "Busy week, then.",
            "ar": "أسبوع مزحوم إذاً."
          },
          {
            "who": "You",
            "en": "A bit. Normally it's calmer.",
            "ar": "شوي. عادةً يكون أهدأ."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Your manager asks what you're doing at this exact moment. Which fits?",
        "prompt_ar": "مديرك يسألك وش تسوّين هاللحظة بالضبط. أي وحدة تناسب؟",
        "options": [
          {
            "en": "I test the failover every Friday.",
            "ar": "أختبر التحويل الاحتياطي كل جمعة.",
            "correct": false,
            "why": "That's your routine, not this moment.",
            "why_ar": "هذا روتينك، مو هاللحظة."
          },
          {
            "en": "I'm testing the failover right now.",
            "ar": "الحين أختبر التحويل الاحتياطي.",
            "correct": true,
            "why": "Present continuous is exactly for what's happening now.",
            "why_ar": "المستمر بالضبط لللي يصير الحين."
          },
          {
            "en": "I am testing the failover since Friday.",
            "ar": "أختبر التحويل من الجمعة.",
            "correct": false,
            "why": "'Since Friday' needs the present perfect, not the continuous.",
            "why_ar": "«since Friday» تبي المضارع التام، مو المستمر."
          }
        ]
      },
      "takeaway": "Now takes 'am/is/are + -ing'; usually takes the plain verb.",
      "takeaway_ar": "الحين ياخذ am/is/are + ing، وعادةً تاخذ الفعل عادي."
    },
    {
      "id": "foundations-done-vs-still-counts",
      "order": 2,
      "ar": "انتهى مقابل لسه له أثر",
      "en": "Done vs still counts",
      "minutes": 8,
      "outcome": "Choose the past simple for finished moments and the present perfect for things that still matter now.",
      "outcome_ar": "تختارين الماضي البسيط للحظات المنتهية، والمضارع التام لللي لسه له أثر الحين.",
      "idea": {
        "body": "Past simple closes the door: it happened at a finished time — \"I fixed it at 9.\" Present perfect keeps the door open: it happened and it still matters now, with no exact time — \"I've fixed it\" (so it's working now). Quick test: if you can name the finished time (yesterday, at 2, last week), use past simple. If the point is the result now, use \"have/has + done.\"",
        "model": "The rule: nameable finished time → past simple; still matters now → 'have/has done'.",
        "body_ar": "الماضي البسيط يقفل الباب: صار بوقت منتهي — «I fixed it at 9». والمضارع التام يخلّي الباب مفتوح: صار ولسه له أثر الحين، بدون وقت محدّد — «I have fixed it» (يعني شغّالة الحين). اختبار سريع: لو تقدرين تسمّين الوقت المنتهي (yesterday، at 2، last week) استخدمي الماضي البسيط. لو المهم النتيجة الحين، استخدمي have/has + التصريف الثالث.",
        "model_ar": "القاعدة: وقت منتهي تقدرين تسمّينه → ماضي بسيط، ولسه له أثر الحين → have/has done."
      },
      "phrases": [
        {
          "en": "I fixed it this morning.",
          "ar": "صلّحتها الصبح.",
          "when": "A finished time",
          "when_ar": "وقت منتهي"
        },
        {
          "en": "I've fixed it — it's live now.",
          "ar": "صلّحتها — شغّالة الحين.",
          "when": "The result matters now",
          "when_ar": "النتيجة تهم الحين"
        },
        {
          "en": "We deployed the patch last night.",
          "ar": "نشرنا الرقعة أمس بالليل.",
          "when": "A specific past point",
          "when_ar": "نقطة ماضي محددة"
        },
        {
          "en": "We've already deployed the patch.",
          "ar": "نشرنا الرقعة خلاص.",
          "when": "Done, and still relevant",
          "when_ar": "انتهى ولسه له علاقة"
        },
        {
          "en": "Have you tested it yet?",
          "ar": "اختبرتيها لين الحين؟",
          "when": "Asking about up-to-now",
          "when_ar": "تسألين عن اللي صار لين الحين"
        },
        {
          "en": "I've worked here for three years.",
          "ar": "لي ثلاث سنوات أشتغل هنا.",
          "when": "Started in the past, still true",
          "when_ar": "بدأ بالماضي ولسه مستمر"
        }
      ],
      "terms": [
        {
          "term": "already",
          "ar": "خلاص / من قبل",
          "def_en": "sooner than expected — pairs with the present perfect",
          "example": "I've already sent it."
        },
        {
          "term": "yet",
          "ar": "لين الحين / بعد",
          "def_en": "up to now — used in questions and negatives",
          "example": "It hasn't finished yet."
        },
        {
          "term": "since",
          "ar": "منذ / من",
          "def_en": "from a starting point in the past until now",
          "example": "I've been here since 2021."
        }
      ],
      "example": {
        "setting": "A manager checks on a fix mid-morning.",
        "setting_ar": "المدير يطمئن على إصلاح في نص الصباح.",
        "lines": [
          {
            "who": "Manager",
            "en": "Is the login bug sorted?",
            "ar": "مشكلة تسجيل الدخول انحلّت؟"
          },
          {
            "who": "You",
            "en": "Yes — I've fixed it and it's live. I pushed the change around nine.",
            "ar": "إي — صلّحتها وهي شغّالة. نزّلت التغيير حوالي التسعة."
          },
          {
            "who": "Manager",
            "en": "Have you told support yet?",
            "ar": "خبّرتي الدعم لين الحين؟"
          },
          {
            "who": "You",
            "en": "Not yet — I'll message them now.",
            "ar": "لسه لا — بأرسل لهم الحين."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "It's done, and your point is that it's working right now. Which is correct?",
        "prompt_ar": "انتهت، والمهم إنها شغّالة الحين. أي وحدة صحيحة؟",
        "options": [
          {
            "en": "I restarted the service at some point.",
            "ar": "أعدت تشغيل الخدمة بوقت ما.",
            "correct": false,
            "why": "Past simple points at a past moment, not the result now.",
            "why_ar": "الماضي البسيط يشاور على لحظة ماضية، مو النتيجة الحين."
          },
          {
            "en": "I've restarted the service — it's back up.",
            "ar": "أعدت تشغيل الخدمة — رجعت شغّالة.",
            "correct": true,
            "why": "The present perfect ties the finished action to the result now.",
            "why_ar": "المضارع التام يربط الفعل المنتهي بالنتيجة الحين."
          },
          {
            "en": "I'm restarting the service.",
            "ar": "أعيد تشغيل الخدمة الحين.",
            "correct": false,
            "why": "That says it's still in progress, not finished.",
            "why_ar": "هذي تقول إنها لسه شغّالة، مو خلصت."
          }
        ]
      },
      "takeaway": "If you can name the finished time, it's past simple.",
      "takeaway_ar": "لو تقدرين تسمّين الوقت المنتهي، فهو ماضي بسيط."
    },
    {
      "id": "foundations-three-futures",
      "order": 3,
      "ar": "ثلاث طرق للمستقبل",
      "en": "Three ways to say the future",
      "minutes": 7,
      "outcome": "Pick will, going to, or present continuous depending on whether it's a decision now, a plan, or a fixed arrangement.",
      "outcome_ar": "تختارين will أو going to أو المستمر حسب لو قرار الحين، أو خطة، أو موعد مثبّت.",
      "idea": {
        "body": "English has three everyday futures. \"Will\" is a decision you make as you speak — \"I'll take that ticket.\" \"Going to\" is a plan or intention you already have — \"We're going to upgrade the servers.\" Present continuous is a fixed arrangement, usually with a time and other people — \"I'm meeting the vendor at 3.\" Getting these right makes your plans sound settled, not vague.",
        "model": "The rule: 'will' = decide now; 'going to' = already planned; '-ing' = a fixed arrangement.",
        "body_ar": "الإنجليزي عنده ثلاث طرق للمستقبل بالكلام اليومي. «will» قرار تاخذينه وأنتِ تتكلّمين — «I will take that ticket». «going to» خطة أو نيّة عندك من قبل — «we are going to upgrade the servers». والمستمر موعد مثبّت، غالباً بوقت ومع ناس — «I am meeting the vendor at 3». لما تضبطينهم، خططك تصير مؤكّدة مو مبهمة.",
        "model_ar": "القاعدة: will = تقرّرين الحين، going to = مخطّطة من قبل، ing = موعد مثبّت."
      },
      "phrases": [
        {
          "en": "I'll take that ticket.",
          "ar": "أنا آخذ هالتذكرة.",
          "when": "A decision as you speak",
          "when_ar": "قرار وأنتِ تتكلّمين"
        },
        {
          "en": "We're going to upgrade the servers next sprint.",
          "ar": "بنرقّي الخوادم في السبرنت الجاي.",
          "when": "An existing plan",
          "when_ar": "خطة موجودة"
        },
        {
          "en": "I'm presenting the results on Thursday.",
          "ar": "بأقدّم النتائج يوم الخميس.",
          "when": "A fixed arrangement with a time",
          "when_ar": "موعد مثبّت بوقت"
        },
        {
          "en": "That won't work on production.",
          "ar": "هذا ما بيمشي على الإنتاج.",
          "when": "A prediction or a refusal",
          "when_ar": "توقّع أو رفض"
        },
        {
          "en": "I'll send it over as soon as I'm back.",
          "ar": "بأرسلها أول ما أرجع.",
          "when": "A promise",
          "when_ar": "وعد"
        },
        {
          "en": "Are you joining the sync tomorrow?",
          "ar": "بتحضرين اجتماع التنسيق بكرة؟",
          "when": "Checking a fixed plan",
          "when_ar": "تتأكدين من خطة مثبّتة"
        }
      ],
      "example": {
        "setting": "Sara reacts to a new request in a planning chat.",
        "setting_ar": "سارة ترد على طلب جديد في نقاش تخطيط.",
        "lines": [
          {
            "who": "Lead",
            "en": "Someone needs to own the DNS cutover.",
            "ar": "نحتاج شخص يتولّى تحويل الـ DNS."
          },
          {
            "who": "You",
            "en": "I'll take it.",
            "ar": "أنا آخذها."
          },
          {
            "who": "Lead",
            "en": "When can you do it?",
            "ar": "متى تقدرين تسوّينها؟"
          },
          {
            "who": "You",
            "en": "I'm meeting networking on Wednesday, so I'm going to run it right after.",
            "ar": "عندي اجتماع مع الشبكات الأربعاء، فبأسوّيها بعده مباشرة."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You decide, in the moment, to take on a task nobody planned. Which is natural?",
        "prompt_ar": "تقرّرين بهاللحظة تاخذين مهمة ما كانت مخطّطة. أي وحدة طبيعية؟",
        "options": [
          {
            "en": "I take it.",
            "ar": "آخذها.",
            "correct": false,
            "why": "Present simple sounds like a routine, not a decision now.",
            "why_ar": "المضارع البسيط يطلع روتين، مو قرار الحين."
          },
          {
            "en": "I'll take it.",
            "ar": "أنا آخذها.",
            "correct": true,
            "why": "'Will' is exactly for a decision made in the moment.",
            "why_ar": "«will» بالضبط للقرار اللي يتاخذ بهاللحظة."
          },
          {
            "en": "I'm taking it since now.",
            "ar": "آخذها من الحين.",
            "correct": false,
            "why": "Present continuous is for arrangements, and this isn't one.",
            "why_ar": "المستمر للمواعيد المثبّتة، وهذي مو منها."
          }
        ]
      },
      "takeaway": "Deciding now? Use 'I'll'. Already planned? Use 'going to'.",
      "takeaway_ar": "تقرّرين الحين؟ قولي I will. مخطّطة من قبل؟ قولي going to."
    },
    {
      "id": "foundations-clean-questions",
      "order": 4,
      "ar": "الأسئلة والنفي النظيفة",
      "en": "Clean questions & negatives",
      "minutes": 7,
      "outcome": "Form clear yes/no and wh- questions with do/does/did, and clean negatives, without scrambling the word order.",
      "outcome_ar": "تكوّنين أسئلة نعم/لا و wh بوضوح مع do/does/did، والنفي، بدون ما يختلط ترتيب الكلمات.",
      "idea": {
        "body": "Most English questions need a helper verb: do, does, or did. The pattern barely changes — (question word) + do/does/did + subject + base verb: \"Does the backup run at night?\" \"When did it fail?\" The classic slip is keeping statement order — \"Why the server crashed?\" instead of \"Why did the server crash?\". Nail the helper and the whole question lands clean.",
        "model": "The rule: (wh-) + do/does/did + subject + base verb — and the main verb stays plain.",
        "body_ar": "أغلب الأسئلة بالإنجليزي تحتاج فعل مساعد: do أو does أو did. النمط ما يتغيّر تقريباً — (كلمة السؤال) + do/does/did + الفاعل + الفعل الأساسي: «Does the backup run at night؟» «When did it fail؟». الغلطة الشائعة إنك تخلّين ترتيب الجملة الخبرية — «Why the server crashed؟» بدل «Why did the server crash؟». اضبطي المساعد ويطلع السؤال نظيف.",
        "model_ar": "القاعدة: (wh) + do/does/did + الفاعل + الفعل الأساسي — والفعل الأساسي يبقى مجرّد."
      },
      "phrases": [
        {
          "en": "Do you have access to the logs?",
          "ar": "عندك صلاحية للسجلّات؟",
          "when": "A yes/no question",
          "when_ar": "سؤال نعم/لا"
        },
        {
          "en": "When did the alert first fire?",
          "ar": "متى أول ما طلع التنبيه؟",
          "when": "A wh- question about the past",
          "when_ar": "سؤال wh عن الماضي"
        },
        {
          "en": "Does this affect all regions?",
          "ar": "هذا يأثّر على كل المناطق؟",
          "when": "A question about a fact",
          "when_ar": "سؤال عن حقيقة"
        },
        {
          "en": "I don't have the latest numbers yet.",
          "ar": "ما عندي آخر الأرقام لين الحين.",
          "when": "A clean negative",
          "when_ar": "نفي نظيف"
        },
        {
          "en": "It didn't restart on its own.",
          "ar": "ما أعاد التشغيل من نفسه.",
          "when": "A past negative",
          "when_ar": "نفي في الماضي"
        },
        {
          "en": "Who owns this service?",
          "ar": "مين مسؤول عن هالخدمة؟",
          "when": "A 'who' question — no helper needed",
          "when_ar": "سؤال who — بدون فعل مساعد"
        }
      ],
      "example": {
        "setting": "Sara joins a call and needs three facts fast.",
        "setting_ar": "سارة تدخل مكالمة وتحتاج ثلاث معلومات بسرعة.",
        "lines": [
          {
            "who": "You",
            "en": "Quick questions — when did the errors start?",
            "ar": "أسئلة سريعة — متى بدأت الأخطاء؟"
          },
          {
            "who": "Colleague",
            "en": "Around midnight.",
            "ar": "حوالي منتصف الليل."
          },
          {
            "who": "You",
            "en": "And do the retries make it worse?",
            "ar": "وهل إعادة المحاولات تزيدها سوء؟"
          },
          {
            "who": "Colleague",
            "en": "They do, actually.",
            "ar": "إي فعلاً."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put the words in order to ask a clean question:",
        "prompt_ar": "رتّبي الكلمات عشان تسألين سؤال نظيف:",
        "steps": [
          {
            "en": "Why",
            "ar": "Why — ليش"
          },
          {
            "en": "did the server",
            "ar": "did the server — الخادم"
          },
          {
            "en": "crash",
            "ar": "crash — انهار"
          },
          {
            "en": "last night?",
            "ar": "last night؟ — أمس بالليل؟"
          }
        ]
      },
      "takeaway": "The helper (do/does/did) carries the question — the main verb stays plain.",
      "takeaway_ar": "الفعل المساعد (do/does/did) يشيل السؤال، والفعل الأساسي يبقى مجرّد."
    },
    {
      "id": "foundations-articles-and-amounts",
      "order": 5,
      "ar": "أدوات التعريف والكميّات",
      "en": "A, an, the — and how much",
      "minutes": 8,
      "outcome": "Use a/an for one new thing, 'the' for a known one, and some/any/much/many correctly with countable and uncountable nouns.",
      "outcome_ar": "تستخدمين a/an لشي واحد جديد، و the للمعروف، و some/any/much/many صح مع المعدود وغير المعدود.",
      "idea": {
        "body": "Arabic has no \"a/an,\" so it's easy to drop it — but English needs it for one new thing: \"I found a bug.\" Switch to \"the\" once you both know which one: \"the bug is fixed.\" Then amounts: use many / a few for things you can count (servers, tickets), and much / a little for things you can't (data, downtime, time). \"Some\" goes in positives, \"any\" in questions and negatives.",
        "model": "The rule: 'a/an' = one new thing; 'the' = the known one; many for countable, much for uncountable.",
        "body_ar": "العربي ما عنده «a/an»، فسهل تنسينها — بس الإنجليزي يحتاجها لشي واحد جديد: «I found a bug». وتحوّلين لـ «the» لما تعرفينها أنتِ وهو: «the bug is fixed». بعدها الكميّات: استخدمي many / a few للأشياء اللي تنعدّ (servers، tickets)، و much / a little لللي ما تنعدّ (data، downtime، time). «some» للإثبات، و «any» للأسئلة والنفي.",
        "model_ar": "القاعدة: a/an = شي واحد جديد، the = المعروف، many للمعدود و much لغير المعدود."
      },
      "phrases": [
        {
          "en": "I found a bug in the login flow.",
          "ar": "لقيت خطأ في مسار تسجيل الدخول.",
          "when": "'a' for one new thing",
          "when_ar": "a لشي واحد جديد"
        },
        {
          "en": "The bug only affects new users.",
          "ar": "الخطأ يأثّر بس على المستخدمين الجدد.",
          "when": "'the' — now we both know it",
          "when_ar": "the — صار معروف بيننا"
        },
        {
          "en": "We don't have much time before the release.",
          "ar": "ما عندنا وقت كثير قبل الإصدار.",
          "when": "'much' for uncountable time",
          "when_ar": "much للوقت غير المعدود"
        },
        {
          "en": "There are too many open tickets.",
          "ar": "فيه تذاكر مفتوحة كثيرة زيادة.",
          "when": "'many' for countable tickets",
          "when_ar": "many للتذاكر المعدودة"
        },
        {
          "en": "Do we have any logs from that hour?",
          "ar": "عندنا أي سجلّات من تلك الساعة؟",
          "when": "'any' in a question",
          "when_ar": "any في السؤال"
        },
        {
          "en": "I've made some progress on it.",
          "ar": "سوّيت شوي تقدّم فيها.",
          "when": "'some' in a positive",
          "when_ar": "some في الإثبات"
        }
      ],
      "terms": [
        {
          "term": "countable",
          "ar": "معدود",
          "def_en": "a thing you can count one by one",
          "example": "Tickets are countable: one, two, three."
        },
        {
          "term": "uncountable",
          "ar": "غير معدود",
          "def_en": "a thing you measure, not count — no plural",
          "example": "Data is uncountable — never 'datas'."
        }
      ],
      "example": {
        "setting": "Sara explains a problem to her lead in two lines.",
        "setting_ar": "سارة تشرح مشكلة لقائدة الفريق بسطرين.",
        "lines": [
          {
            "who": "You",
            "en": "I found a bug in checkout. The bug drops the session right after payment.",
            "ar": "لقيت خطأ في الدفع. الخطأ يسقّط الجلسة بعد الدفع مباشرة."
          },
          {
            "who": "Lead",
            "en": "How many users are hit?",
            "ar": "كم مستخدم متأثّر؟"
          },
          {
            "who": "You",
            "en": "Not many — but we don't have much time before the release.",
            "ar": "مو كثير — بس ما عندنا وقت كثير قبل الإصدار."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You're talking about time before a deadline. Which word fits?",
        "prompt_ar": "تتكلّمين عن الوقت قبل الموعد النهائي. أي كلمة تناسب؟",
        "options": [
          {
            "en": "We don't have many time.",
            "ar": "ما عندنا many وقت.",
            "correct": false,
            "why": "Time is uncountable, so 'many' is wrong.",
            "why_ar": "الوقت غير معدود، ف«many» غلط."
          },
          {
            "en": "We don't have much time.",
            "ar": "ما عندنا much وقت.",
            "correct": true,
            "why": "'Much' is the uncountable partner for time.",
            "why_ar": "«much» هي شريكة غير المعدود مع الوقت."
          },
          {
            "en": "We don't have a time.",
            "ar": "ما عندنا a وقت.",
            "correct": false,
            "why": "You can't put 'a' on an uncountable noun like time.",
            "why_ar": "ما تقدرين تحطّين «a» على اسم غير معدود مثل الوقت."
          }
        ]
      },
      "takeaway": "Count it? many. Measure it? much. One new thing? a/an.",
      "takeaway_ar": "تنعدّ؟ many. تنقاس؟ much. شي واحد جديد؟ a/an."
    },
    {
      "id": "foundations-joining-ideas",
      "order": 6,
      "ar": "ربط الأفكار",
      "en": "Joining ideas smoothly",
      "minutes": 6,
      "outcome": "Link two ideas with the right connector so you sound fluent, not choppy.",
      "outcome_ar": "تربطين فكرتين بالرابط الصح عشان تطلعين طليقة، مو متقطّعة.",
      "idea": {
        "body": "Short, disconnected sentences make even good English sound choppy. Connectors are the glue. \"Because\" gives a reason, \"so\" gives a result, \"although\" admits a contrast inside one sentence, \"however\" turns the idea in a new sentence, and \"which\" adds detail about a thing. One good connector turns two stiff sentences into one smooth one.",
        "model": "The rule: because = reason, so = result, although/however = contrast, which = extra detail.",
        "body_ar": "الجمل القصيرة المقطّعة تخلّي حتى الإنجليزي الزين يطلع متكسّر. الروابط هي الغراء. «because» تعطي سبب، «so» تعطي نتيجة، «although» تعترف بتناقض داخل نفس الجملة، «however» تلفّ الفكرة بجملة جديدة، و «which» تضيف تفصيل عن شي. رابط واحد زين يحوّل جملتين ناشفتين لوحدة سلسة.",
        "model_ar": "القاعدة: because = سبب، so = نتيجة، although/however = تناقض، which = تفصيل زيادة."
      },
      "phrases": [
        {
          "en": "We rolled back because the deploy broke checkout.",
          "ar": "تراجعنا لأن النشر خرّب الدفع.",
          "when": "Giving a reason",
          "when_ar": "تعطين سبب"
        },
        {
          "en": "The primary failed, so we switched to the backup.",
          "ar": "الأساسي فشل، فحوّلنا للاحتياطي.",
          "when": "Giving a result",
          "when_ar": "تعطين نتيجة"
        },
        {
          "en": "Although it's slower, the fix is safe.",
          "ar": "مع إنه أبطأ، الحل آمن.",
          "when": "Contrast in one sentence",
          "when_ar": "تناقض بجملة وحدة"
        },
        {
          "en": "It works on staging. However, production is different.",
          "ar": "يشتغل على staging. لكن الإنتاج يختلف.",
          "when": "Turning the idea, new sentence",
          "when_ar": "تلفّين الفكرة بجملة جديدة"
        },
        {
          "en": "The issue is in the cache, which we cleared.",
          "ar": "المشكلة في الكاش، اللي مسحناه.",
          "when": "Adding detail about a thing",
          "when_ar": "تضيفين تفصيل عن شي"
        },
        {
          "en": "It's a small change, so it can go out today.",
          "ar": "تغيير بسيط، فيقدر يطلع اليوم.",
          "when": "From reason to result",
          "when_ar": "من سبب لنتيجة"
        }
      ],
      "example": {
        "setting": "Two choppy lines become one fluent one.",
        "setting_ar": "سطرين متقطّعين يصيرون سطر واحد سلس.",
        "lines": [
          {
            "who": "Choppy",
            "en": "The server was slow. We restarted it. Now it's fine.",
            "ar": "الخادم كان بطيء. أعدنا تشغيله. الحين تمام."
          },
          {
            "who": "Fluent",
            "en": "The server was slow, so we restarted it, and now it's fine.",
            "ar": "الخادم كان بطيء، فأعدنا تشغيله، والحين تمام."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Join two facts from your own work into one smooth sentence.",
        "prompt_ar": "اربطي حقيقتين من شغلك في جملة وحدة سلسة.",
        "hint": "Take a problem and what you did about it, and connect them with 'because' or 'so'. Then say it out loud.",
        "hint_ar": "خذي مشكلة واللي سويتيه فيها، واربطيهم بـ because أو so. بعدها قوليها بصوت."
      },
      "takeaway": "One connector turns two stiff sentences into one smooth one.",
      "takeaway_ar": "رابط واحد يحوّل جملتين ناشفتين لوحدة سلسة."
    }
  ]
},
{
  "id": "everyday",
  "order": 7,
  "icon": "Coffee",
  "ar": "الطلاقة اليومية",
  "en": "Everyday Fluency",
  "tagline": "The small, human English that makes work feel easy — before and around the real business.",
  "tagline_ar": "الإنجليزي الصغير الإنساني اللي يخلّي الشغل يحس سهل — قبل وحوالين الشغل الحقيقي.",
  "lessons": [
    {
      "id": "everyday-warm-openers",
      "order": 1,
      "ar": "افتتاحيات دافئة",
      "en": "Warm openers",
      "minutes": 6,
      "outcome": "Open a call or a chat with two or three warm lines before you get to business.",
      "outcome_ar": "تفتحين مكالمة أو محادثة بسطرين ثلاثة دافئين قبل ما تدخلين بالشغل.",
      "idea": {
        "body": "In most workplaces you don't dive straight into business — you warm up with ten seconds of small talk. It's not wasted time; it's how people relax and connect. A friendly opener, a light comment, and one question back is all it takes. The trick is to keep it short and genuine, then move on.",
        "model": "The rule: greet, a light line, one question back — then business.",
        "body_ar": "في أغلب أماكن الشغل ما تدخلين على طول بالشغل — تسخّنين بعشر ثواني دردشة خفيفة. مو وقت ضايع؛ هي اللي تخلّي الناس ترتاح وتتقارب. افتتاحية ودّية، تعليق خفيف، وسؤال ترجّعينه — بس. السرّ إنك تخلّينها قصيرة وصادقة، بعدها تمشين للشغل.",
        "model_ar": "القاعدة: سلّمي، جملة خفيفة، سؤال ترجّعينه — بعدها الشغل."
      },
      "phrases": [
        {
          "en": "Hi Tom, how's your week going?",
          "ar": "هاي توم، كيف أسبوعك؟",
          "when": "A warm opener",
          "when_ar": "افتتاحية دافئة"
        },
        {
          "en": "Good to see you — how have you been?",
          "ar": "حلو أشوفك — كيف حالك هالفترة؟",
          "when": "For someone you know",
          "when_ar": "لشخص تعرفينه"
        },
        {
          "en": "Busy on my side, but good. You?",
          "ar": "مزحوم من طرفي، بس زين. وأنت؟",
          "when": "A light answer, then bounce it back",
          "when_ar": "جواب خفيف، بعدها ترجعين السؤال"
        },
        {
          "en": "How was your weekend?",
          "ar": "كيف كان ويكندك؟",
          "when": "A Monday opener",
          "when_ar": "افتتاحية يوم الاثنين"
        },
        {
          "en": "Thanks for making the time.",
          "ar": "مشكور إنك خصّصت وقت.",
          "when": "A warm start on a scheduled call",
          "when_ar": "بداية دافئة لمكالمة مجدولة"
        },
        {
          "en": "Right, shall we get started?",
          "ar": "تمام، نبدأ؟",
          "when": "Moving to business",
          "when_ar": "الانتقال للشغل"
        }
      ],
      "example": {
        "setting": "The first fifteen seconds of a scheduled call.",
        "setting_ar": "أول خمسة عشر ثانية من مكالمة مجدولة.",
        "lines": [
          {
            "who": "Tom",
            "en": "Hey Sara, good to see you.",
            "ar": "هاي سارة، حلو أشوفك."
          },
          {
            "who": "You",
            "en": "You too — how's your week going?",
            "ar": "وأنت كذلك — كيف أسبوعك؟"
          },
          {
            "who": "Tom",
            "en": "Busy, but good. Yours?",
            "ar": "مزحوم، بس زين. وأنتِ؟"
          },
          {
            "who": "You",
            "en": "Same here. Shall we get started?",
            "ar": "نفس الشي. نبدأ؟"
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "A colleague opens with \"How's your week going?\". What's the most natural reply?",
        "prompt_ar": "زميل يفتح بـ «How is your week going؟». أنسب رد طبيعي؟",
        "options": [
          {
            "en": "That's not relevant to the meeting.",
            "ar": "هذا مو له علاقة بالاجتماع.",
            "correct": false,
            "why": "It's cold and shuts down a friendly moment.",
            "why_ar": "بارد ويقفل لحظة ودّية."
          },
          {
            "en": "Busy, but good — how about you?",
            "ar": "مزحوم، بس زين — وأنت؟",
            "correct": true,
            "why": "A light answer plus a question back keeps it warm and natural.",
            "why_ar": "جواب خفيف وسؤال ترجعينه يبقيها دافئة وطبيعية."
          },
          {
            "en": "Fine.",
            "ar": "تمام.",
            "correct": false,
            "why": "Not wrong, but one flat word ends the warmth early.",
            "why_ar": "مو غلط، بس كلمة وحدة ناشفة تنهي الدفء بدري."
          }
        ]
      },
      "takeaway": "Ten seconds of warmth makes the next ten minutes easier.",
      "takeaway_ar": "عشر ثواني دفء تسهّل العشر دقايق الجاية."
    },
    {
      "id": "everyday-on-the-phone",
      "order": 2,
      "ar": "على الهاتف",
      "en": "On the phone",
      "minutes": 7,
      "outcome": "Introduce yourself, put someone on hold, handle a wrong number, and wrap up — all on a call.",
      "outcome_ar": "تعرّفين نفسك، تحطّين أحد على الانتظار، تتعاملين مع رقم غلط، وتقفلين — كلها على المكالمة.",
      "idea": {
        "body": "The phone has its own fixed lines, and they barely change. You state who you are, you ask who you're speaking to, you park them politely if you need a second, and you close cleanly. Because there's no face and no chat window, these little scripts do a lot of work — knowing them means you never freeze.",
        "model": "The rule: say who you are, ask who they are, hold politely, close cleanly.",
        "body_ar": "الهاتف له جمله الثابتة، وتقريباً ما تتغيّر. تقولين مين أنتِ، تسألين مين معك، توقفينه بأدب لو تحتاجين ثانية، وتقفلين بنظافة. لأن ما فيه وجه ولا شاشة محادثة، هالجمل الصغيرة تسوّي شغل كثير — لو تعرفينها، ما تتجمّدين أبداً.",
        "model_ar": "القاعدة: قولي مين أنتِ، اسألي مين معك، أوقفي بأدب، اقفلي بنظافة."
      },
      "phrases": [
        {
          "en": "Hi, this is Sara from the infrastructure team.",
          "ar": "هاي، معك سارة من فريق البنية التحتية.",
          "when": "Introducing yourself",
          "when_ar": "تعرّفين نفسك"
        },
        {
          "en": "Who am I speaking with?",
          "ar": "مع مين أتكلّم؟",
          "when": "Asking who it is",
          "when_ar": "تسألين مين معك"
        },
        {
          "en": "Can I put you on hold for a moment?",
          "ar": "ممكن أحطّك على الانتظار لحظة؟",
          "when": "Before you pause",
          "when_ar": "قبل ما توقفين"
        },
        {
          "en": "Sorry, I think you've got the wrong number.",
          "ar": "آسفة، أظن الرقم غلط.",
          "when": "A wrong number",
          "when_ar": "رقم غلط"
        },
        {
          "en": "Could you speak up a little? You're quite faint.",
          "ar": "ممكن ترفع صوتك شوي؟ صوتك خافت.",
          "when": "A weak line",
          "when_ar": "خط ضعيف"
        },
        {
          "en": "Thanks for calling — I'll follow up by email.",
          "ar": "شكراً على اتصالك — بأتابع بالإيميل.",
          "when": "Wrapping up",
          "when_ar": "الإقفال"
        }
      ],
      "example": {
        "setting": "Sara answers a call meant for another team.",
        "setting_ar": "سارة ترد على مكالمة مخصّصة لفريق ثاني.",
        "lines": [
          {
            "who": "Caller",
            "en": "Hi, is this the billing department?",
            "ar": "هاي، هذا قسم الفوترة؟"
          },
          {
            "who": "You",
            "en": "Sorry, I think you've got the wrong number — this is infrastructure. Let me give you the right one.",
            "ar": "آسفة، أظن الرقم غلط — هذا قسم البنية التحتية. خلّيني أعطيك الرقم الصح."
          },
          {
            "who": "Caller",
            "en": "Oh, thank you.",
            "ar": "آه، شكراً."
          },
          {
            "who": "You",
            "en": "No problem — take care.",
            "ar": "ولا يهمّك — في أمان الله."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put together a clean way to open and hold a call:",
        "prompt_ar": "رتّبي طريقة نظيفة تفتحين وتوقفين فيها مكالمة:",
        "steps": [
          {
            "en": "Hi, this is Sara from infrastructure.",
            "ar": "هاي، معك سارة من البنية التحتية."
          },
          {
            "en": "Who am I speaking with?",
            "ar": "مع مين أتكلّم؟"
          },
          {
            "en": "Can I put you on hold for a moment?",
            "ar": "ممكن أحطّك على الانتظار لحظة؟"
          },
          {
            "en": "Thanks for waiting — where were we?",
            "ar": "مشكور على الانتظار — وين كنّا؟"
          }
        ]
      },
      "takeaway": "On the phone, a few fixed lines mean you never freeze.",
      "takeaway_ar": "على الهاتف، كم جملة ثابتة تكفي عشان ما تتجمّدين."
    },
    {
      "id": "everyday-scheduling",
      "order": 3,
      "ar": "الجدولة وإعادة الجدولة",
      "en": "Set and move a meeting",
      "minutes": 7,
      "outcome": "Propose a time, confirm one, and move a meeting politely without sounding flaky.",
      "outcome_ar": "تقترحين وقت، تأكّدينه، وتنقلين اجتماع بأدب بدون ما تطلعين غير جادّة.",
      "idea": {
        "body": "Half of work is agreeing when to talk. Propose a time with an option or two, confirm clearly so nobody double-books, and if you must move it, apologise lightly and offer a new slot in the same breath. The key move when rescheduling is to hand over the alternative immediately — it shows you still want the meeting.",
        "model": "The rule: propose with options, confirm clearly, and reschedule with a new time attached.",
        "body_ar": "نص الشغل اتفاق على متى نتكلّم. اقترحي وقت مع خيار أو خيارين، أكّدي بوضوح عشان ما أحد يحجز مرتين، ولو اضطريتي تنقلينه، اعتذري بخفّة وقدّمي وقت جديد بنفس النفس. الحركة المهمة بإعادة الجدولة إنك تعطين البديل على طول — يبيّن إنك لسه تبين الاجتماع.",
        "model_ar": "القاعدة: اقترحي بخيارات، أكّدي بوضوح، وأعيدي الجدولة ومعها وقت جديد."
      },
      "phrases": [
        {
          "en": "Does Tuesday at 10 work for you?",
          "ar": "يناسبك الثلاثاء الساعة ١٠؟",
          "when": "Proposing a time",
          "when_ar": "تقترحين وقت"
        },
        {
          "en": "I'm free Monday or Wednesday afternoon.",
          "ar": "فاضية الاثنين أو الأربعاء بعد الظهر.",
          "when": "Offering options",
          "when_ar": "تعطين خيارات"
        },
        {
          "en": "Great — I'll send an invite for 10.",
          "ar": "تمام — بأرسل دعوة للساعة ١٠.",
          "when": "Confirming",
          "when_ar": "تأكيد"
        },
        {
          "en": "Something's come up — can we move it to Thursday?",
          "ar": "طرأ شي — نقدر ننقله للخميس؟",
          "when": "Rescheduling politely",
          "when_ar": "إعادة جدولة بأدب"
        },
        {
          "en": "Sorry for the short notice — would 2 PM instead work?",
          "ar": "آسفة على التنبيه المتأخّر — تنفع الساعة ٢ بدالها؟",
          "when": "Apology plus a new slot",
          "when_ar": "اعتذار مع وقت جديد"
        },
        {
          "en": "Let's keep the time and I'll send the agenda ahead.",
          "ar": "نخلّي الوقت زي ما هو وبأرسل الأجندة قبل.",
          "when": "Confirming and preparing",
          "when_ar": "تأكيد وتجهيز"
        }
      ],
      "example": {
        "setting": "Sara needs to move a meeting but keep it soon.",
        "setting_ar": "سارة تحتاج تنقل اجتماع بس تخلّيه قريب.",
        "lines": [
          {
            "who": "Client",
            "en": "Looking forward to our 3 PM.",
            "ar": "متطلّع لموعدنا الساعة ٣."
          },
          {
            "who": "You",
            "en": "About that — something's come up. So sorry for the short notice. Could we do 4:30 instead, same day?",
            "ar": "بخصوص كذا — طرأ شي. آسفة على التنبيه المتأخّر. نقدر نسويها ٤:٣٠ بدالها، نفس اليوم؟"
          },
          {
            "who": "Client",
            "en": "4:30 works.",
            "ar": "الـ ٤:٣٠ تنفع."
          },
          {
            "who": "You",
            "en": "Perfect — I'll update the invite now.",
            "ar": "ممتاز — بحدّث الدعوة الحين."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You have to push a meeting an hour later. Which is the most professional?",
        "prompt_ar": "لازم تأخّرين اجتماع ساعة. أي وحدة الأكثر احترافية؟",
        "options": [
          {
            "en": "I can't make it. Bye.",
            "ar": "ما أقدر أحضر. باي.",
            "correct": false,
            "why": "It cancels without offering a way to still meet.",
            "why_ar": "تلغي بدون ما تعطين طريقة تلتقون فيها."
          },
          {
            "en": "Sorry for the short notice — could we push it an hour, to 4?",
            "ar": "آسفة على التنبيه المتأخّر — نقدر نأخّره ساعة، للـ ٤؟",
            "correct": true,
            "why": "A light apology plus an immediate new time keeps the meeting alive.",
            "why_ar": "اعتذار خفيف مع وقت جديد على طول يبقي الاجتماع حي."
          },
          {
            "en": "Maybe later, we'll see.",
            "ar": "يمكن بعدين، نشوف.",
            "correct": false,
            "why": "Vague — it leaves the other person with nothing to confirm.",
            "why_ar": "غامضة، تخلّي الطرف الثاني بدون شي يأكّده."
          }
        ]
      },
      "takeaway": "When you move a meeting, hand over the new time in the same message.",
      "takeaway_ar": "لما تنقلين اجتماع، سلّمي الوقت الجديد بنفس الرسالة."
    },
    {
      "id": "everyday-opinions",
      "order": 4,
      "ar": "الرأي والاتفاق بلطف",
      "en": "Opinions, softly",
      "minutes": 7,
      "outcome": "Give your view, agree warmly, and disagree without friction.",
      "outcome_ar": "تعطين رأيك، تتفقين بدفء، وتختلفين بدون احتكاك.",
      "idea": {
        "body": "In English meetings, opinions are softened — people say \"I think\" or \"it might be worth\" instead of blunt statements. Agreeing warmly builds goodwill, and disagreeing works best when you first acknowledge the other view, then add yours. \"That's fair, though I'd...\" lets you push back without a clash.",
        "model": "The rule: soften your view, acknowledge theirs, then add yours.",
        "body_ar": "في اجتماعات الإنجليزي، الآراء تتلطّف — الناس يقولون «I think» أو «it might be worth» بدل الجزم المباشر. الاتفاق بدفء يبني ودّ، والاختلاف يمشي أحسن لو اعترفتي برأي الثاني أول، بعدها تضيفين رأيك. «that is fair, though I would...» تخليك تعترضين بدون صدام.",
        "model_ar": "القاعدة: لطّفي رأيك، اعترفي برأيه، بعدها ضيفي رأيك."
      },
      "phrases": [
        {
          "en": "I think we should test it on staging first.",
          "ar": "أشوف إننا نختبرها على staging أول.",
          "when": "Giving a view softly",
          "when_ar": "تعطين رأي بلطف"
        },
        {
          "en": "That's a good point.",
          "ar": "نقطة زينة.",
          "when": "Agreeing warmly",
          "when_ar": "اتفاق دافئ"
        },
        {
          "en": "I see it the same way.",
          "ar": "أشوفها نفس شوفتك.",
          "when": "Full agreement",
          "when_ar": "اتفاق كامل"
        },
        {
          "en": "That's fair, though I'd add one thing.",
          "ar": "كلام منطقي، بس أضيف شي واحد.",
          "when": "Light disagreement",
          "when_ar": "اختلاف خفيف"
        },
        {
          "en": "I'm not totally sure about that — can we look closer?",
          "ar": "مو متأكّدة تماماً من هذي — نقدر نتعمّق فيها؟",
          "when": "Gentle doubt",
          "when_ar": "شك لطيف"
        },
        {
          "en": "It might be worth waiting for the numbers.",
          "ar": "يمكن يستاهل ننتظر الأرقام.",
          "when": "Suggesting, not insisting",
          "when_ar": "تقترحين، مو تصرّين"
        }
      ],
      "example": {
        "setting": "Sara disagrees with a plan without a clash.",
        "setting_ar": "سارة تختلف مع خطة بدون صدام.",
        "lines": [
          {
            "who": "Colleague",
            "en": "Let's just ship it today.",
            "ar": "خلّنا نطلّعها اليوم وبس."
          },
          {
            "who": "You",
            "en": "That's fair — I get the urgency. Though I'd test it on staging first, just to be safe.",
            "ar": "كلام منطقي — أفهم الاستعجال. بس أفضّل نختبرها على staging أول، بس للأمان."
          },
          {
            "who": "Colleague",
            "en": "Okay, that's reasonable.",
            "ar": "طيب، هذا معقول."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You disagree with a colleague's suggestion. Which keeps it friendly?",
        "prompt_ar": "تختلفين مع اقتراح زميل. أي وحدة تبقيها ودّية؟",
        "options": [
          {
            "en": "No, that's wrong.",
            "ar": "لا، هذا غلط.",
            "correct": false,
            "why": "Blunt, and it dismisses them — that invites friction.",
            "why_ar": "مباشرة وتلغيه — تجرّ احتكاك."
          },
          {
            "en": "That's fair, though I'd suggest we check the logs first.",
            "ar": "كلام منطقي، بس أقترح نتأكد من السجلّات أول.",
            "correct": true,
            "why": "It acknowledges their view, then adds yours — no clash.",
            "why_ar": "تعترف برأيه، بعدها تضيف رأيك — بدون صدام."
          },
          {
            "en": "Whatever you think.",
            "ar": "زي ما تشوف.",
            "correct": false,
            "why": "You're giving up your view instead of sharing it.",
            "why_ar": "تتنازلين عن رأيك بدل ما تشاركينه."
          }
        ]
      },
      "takeaway": "Acknowledge first, disagree second — that's how English stays smooth.",
      "takeaway_ar": "اعترفي أول، اختلفي ثاني — كذا يبقى الإنجليزي سلس."
    },
    {
      "id": "everyday-short-story",
      "order": 5,
      "ar": "حكاية قصيرة — وش صار",
      "en": "Tell what happened",
      "minutes": 6,
      "outcome": "Recount a quick event in order — first, then, in the end — without getting tangled.",
      "outcome_ar": "تحكين حدث سريع بالترتيب — أول، بعدها، وبالنهاية — بدون ما تتلخبطين.",
      "idea": {
        "body": "People ask \"what happened?\" all day — about a bug, a meeting, a weekend. A good short recount runs in order and stays in the past tense: set the scene, say what happened next, and land on how it ended. Little signpost words — first, then, after that, in the end — carry the listener through so you never lose them.",
        "model": "The rule: set the scene, then the events in order, then how it ended.",
        "body_ar": "الناس تسأل «وش صار؟» طول اليوم — عن مشكلة، اجتماع، ويكند. الحكاية القصيرة الزينة تمشي بالترتيب وتبقى بصيغة الماضي: افتحي المشهد، قولي وش صار بعده، وانزلي على كيف انتهى. كلمات الدلالة الصغيرة — first، then، after that، in the end — توصّل السامع فما تفقدينه.",
        "model_ar": "القاعدة: افتحي المشهد، بعدها الأحداث بالترتيب، بعدها كيف انتهت."
      },
      "phrases": [
        {
          "en": "So this morning, the alerts started going off.",
          "ar": "المهم الصبح، بدت التنبيهات تطلع.",
          "when": "Setting the scene",
          "when_ar": "تفتحين المشهد"
        },
        {
          "en": "First I checked the logs.",
          "ar": "أول شي فحصت السجلّات.",
          "when": "The first step",
          "when_ar": "أول خطوة"
        },
        {
          "en": "Then it turned out the disk was full.",
          "ar": "بعدها طلع القرص ممتلئ.",
          "when": "The next event",
          "when_ar": "الحدث اللي بعده"
        },
        {
          "en": "After that, I cleared the old backups.",
          "ar": "بعد كذا، مسحت النسخ القديمة.",
          "when": "Continuing in order",
          "when_ar": "تكمّلين بالترتيب"
        },
        {
          "en": "In the end, everything came back up.",
          "ar": "وبالنهاية، كل شي رجع شغّال.",
          "when": "How it ended",
          "when_ar": "كيف انتهت"
        },
        {
          "en": "It only took about twenty minutes.",
          "ar": "ما أخذت إلا حوالي عشرين دقيقة.",
          "when": "A closing detail",
          "when_ar": "تفصيل ختامي"
        }
      ],
      "example": {
        "setting": "A colleague asks Sara how the morning incident went.",
        "setting_ar": "زميل يسأل سارة كيف راحت حادثة الصباح.",
        "lines": [
          {
            "who": "Colleague",
            "en": "Heard you had a scare this morning — what happened?",
            "ar": "سمعت إنكم مررتوا بموقف الصبح — وش صار؟"
          },
          {
            "who": "You",
            "en": "So the alerts started around eight. First I checked the logs, then it turned out the disk was full. I cleared the old backups, and in the end everything came back up.",
            "ar": "المهم التنبيهات بدت حوالي الثمانية. أول شي فحصت السجلّات، بعدها طلع القرص ممتلئ. مسحت النسخ القديمة، وبالنهاية كل شي رجع شغّال."
          },
          {
            "who": "Colleague",
            "en": "Nice — quick work.",
            "ar": "حلو — شغل سريع."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put the recount in the order it happened:",
        "prompt_ar": "رتّبي الحكاية بالترتيب اللي صارت فيه:",
        "steps": [
          {
            "en": "So this morning, the alerts started going off.",
            "ar": "المهم الصبح، بدت التنبيهات تطلع."
          },
          {
            "en": "First I checked the logs.",
            "ar": "أول شي فحصت السجلّات."
          },
          {
            "en": "Then it turned out the disk was full.",
            "ar": "بعدها طلع القرص ممتلئ."
          },
          {
            "en": "In the end, everything came back up.",
            "ar": "وبالنهاية، كل شي رجع شغّال."
          }
        ]
      },
      "takeaway": "Signpost words — first, then, in the end — carry the listener with you.",
      "takeaway_ar": "كلمات الدلالة — first، then، in the end — توصّل السامع معك."
    },
    {
      "id": "everyday-networking",
      "order": 6,
      "ar": "التعارف في الفعاليات",
      "en": "Meeting new people",
      "minutes": 7,
      "outcome": "Introduce yourself, keep a light conversation going, and close warmly with a next step.",
      "outcome_ar": "تعرّفين نفسك، تخلّين الحوار الخفيف يمشي، وتقفلين بدفء مع خطوة جاية.",
      "idea": {
        "body": "At a conference or a work event, a good introduction is short: your name, what you do, and a friendly question. The conversation lives on open questions — \"what brings you here?\" — and it closes best with a small next step, like swapping contacts. You don't need to be clever; you need to be warm and easy to talk to.",
        "model": "The rule: name and role, an open question, a warm close with a next step.",
        "body_ar": "في مؤتمر أو فعالية شغل، التعريف الزين قصير: اسمك، وش تسوّين، وسؤال ودّي. الحوار يعيش على الأسئلة المفتوحة — «وش جابك هنا؟» — ويقفل أحسن بخطوة صغيرة، مثل تبادل التواصل. ما تحتاجين تكونين ذكية؛ تحتاجين تكونين دافئة وسهلة الكلام معك.",
        "model_ar": "القاعدة: الاسم والدور، سؤال مفتوح، إقفال دافئ مع خطوة جاية."
      },
      "phrases": [
        {
          "en": "Hi, I'm Sara — I work in infrastructure at a fintech.",
          "ar": "هاي، أنا سارة — أشتغل في البنية التحتية في شركة تقنية مالية.",
          "when": "Your introduction",
          "when_ar": "تعريفك"
        },
        {
          "en": "What brings you here?",
          "ar": "وش جابك هنا؟",
          "when": "An easy open question",
          "when_ar": "سؤال مفتوح سهل"
        },
        {
          "en": "Oh, how's that going for you?",
          "ar": "آه، كيف ماشية معك؟",
          "when": "Keeping it going",
          "when_ar": "تخلّينه يمشي"
        },
        {
          "en": "That sounds really interesting.",
          "ar": "يبدو ممتع فعلاً.",
          "when": "Showing genuine interest",
          "when_ar": "تبيّنين اهتمام صادق"
        },
        {
          "en": "It was great talking — shall we connect on LinkedIn?",
          "ar": "كان حلو نتكلّم — نتواصل على لينكدإن؟",
          "when": "A warm close plus a next step",
          "when_ar": "إقفال دافئ مع خطوة جاية"
        },
        {
          "en": "I'll grab a coffee — good to meet you.",
          "ar": "بجيب قهوة — سعدت بمعرفتك.",
          "when": "Stepping away politely",
          "when_ar": "تنسحبين بأدب"
        }
      ],
      "example": {
        "setting": "Sara meets someone in the coffee line at a tech conference.",
        "setting_ar": "سارة تقابل شخص في طابور القهوة في مؤتمر تقني.",
        "lines": [
          {
            "who": "Stranger",
            "en": "Long queue, huh?",
            "ar": "طابور طويل، صح؟"
          },
          {
            "who": "You",
            "en": "Always is. I'm Sara, by the way — I work in infrastructure. What brings you here?",
            "ar": "دايماً كذا. أنا سارة، بالمناسبة — أشتغل في البنية التحتية. وش جابك هنا؟"
          },
          {
            "who": "Stranger",
            "en": "I'm on the security side, here for the cloud talks.",
            "ar": "أنا من جهة الأمن، جاي لجلسات الكلاود."
          },
          {
            "who": "You",
            "en": "Oh nice — those look good. Shall we connect on LinkedIn?",
            "ar": "آه حلو — تبدو زينة. نتواصل على لينكدإن؟"
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Write your own three-line introduction for an event.",
        "prompt_ar": "اكتبي تعريفك من ثلاثة أسطر لفعالية.",
        "hint": "Include your name, what you do, and one open question to ask back. Then say it out loud until it feels easy.",
        "hint_ar": "خلّي فيه اسمك، وش تسوّين، وسؤال مفتوح ترجّعينه. بعدها قوليها بصوت لين تصير سهلة عليك."
      },
      "takeaway": "Warm and easy beats clever every time.",
      "takeaway_ar": "الدفء والسهولة يغلبون الذكاء كل مرة."
    }
  ]
},
{
  "id": "present",
  "order": 8,
  "icon": "Presentation",
  "ar": "العرض والتأثير",
  "en": "Presenting & Influence",
  "tagline": "Hold a room, walk people through your work, and be understood the first time.",
  "tagline_ar": "تمسكين الغرفة، توصّلين شغلك خطوة بخطوة، وتُفهمين من أول مرّة.",
  "lessons": [
    {
      "id": "present-hook",
      "order": 1,
      "ar": "افتحي بخطّاف",
      "en": "Open with a hook",
      "minutes": 7,
      "outcome": "Open a talk with a line that makes the room look up, instead of a flat, apologetic warm-up.",
      "outcome_ar": "تفتحين الكلام بجملة تخلّي الكل يرفع راسه، بدل بداية باهتة معتذرة.",
      "idea": {
        "body": "The first thirty seconds decide whether people lean in or drift to their phones. Don't open with your agenda or an apology — open with a hook: a sharp number, a real question, or a one-line story that makes your topic matter. The agenda can wait until sentence three.",
        "model": "The rule: earn the room in the first line — a number, a question, or a tiny story, never a mumbled warm-up.",
        "body_ar": "أول ثلاثين ثانية تقرّر إذا الناس بينتبهون لك أو يسرحون على جوّالاتهم. لا تفتحين بجدول الأعمال ولا باعتذار — افتحي بخطّاف: رقم قوي، سؤال حقيقي، أو قصّة سطر واحد تخلّي موضوعك يهمّهم. جدول الأعمال يستنى للجملة الثالثة.",
        "model_ar": "القاعدة: اكسبي الغرفة من أول جملة — رقم أو سؤال أو قصّة صغيرة، مو تمهيد متلعثم."
      },
      "phrases": [
        {
          "en": "Last month, we lost four hours to one missed alert. Here is how we fix that.",
          "ar": "الشهر اللي طاف ضاعت علينا أربع ساعات بسبب تنبيه ما شافه أحد. وهذي طريقة الحل.",
          "when": "A number that stings",
          "when_ar": "رقم يوجع"
        },
        {
          "en": "Quick question before I start: how many of you have been paged at 3 AM?",
          "ar": "سؤال سريع قبل ما أبدأ: كم واحد فيكم انطلب الساعة ٣ الفجر؟",
          "when": "A question that pulls them in",
          "when_ar": "سؤال يشدّهم"
        },
        {
          "en": "I'll keep this to five minutes, and by the end you'll know exactly what to change.",
          "ar": "بخلّيها خمس دقايق، وبالنهاية بتعرفون بالضبط وش تغيّرون.",
          "when": "A promise of payoff",
          "when_ar": "وعد بفائدة"
        },
        {
          "en": "Let me start with the thing that surprised me most.",
          "ar": "خلّوني أبدأ بأكثر شي فاجأني.",
          "when": "A curiosity opener",
          "when_ar": "فتحة فضول"
        },
        {
          "en": "Here's the one thing I want you to remember from today.",
          "ar": "هذا الشي الوحيد اللي أبيكم تذكرونه من اليوم.",
          "when": "Lead with the takeaway",
          "when_ar": "ابدئي بالخلاصة"
        },
        {
          "en": "Picture the last deploy that went sideways — that is the problem we are solving.",
          "ar": "تخيّلوا آخر نشرة راحت غلط — هذي المشكلة اللي بنحلّها.",
          "when": "A vivid image",
          "when_ar": "صورة حيّة"
        }
      ],
      "example": {
        "setting": "The first fifteen seconds of a team talk — a flat opener versus a hook.",
        "setting_ar": "أول خمس عشرة ثانية من عرض للفريق — بداية باهتة مقابل خطّاف.",
        "lines": [
          {
            "who": "A flat open",
            "en": "Um, hi everyone, so today I'm going to talk about our alerting system and, yeah, some issues we've had…",
            "ar": "إمم، هلا بالكل، اليوم بحكي عن نظام التنبيهات وكم مشكلة صارت لنا…"
          },
          {
            "who": "You",
            "en": "Last month we lost four hours to one alert nobody saw. In five minutes, I'll show you how we make sure that never happens again.",
            "ar": "الشهر اللي طاف ضاعت علينا أربع ساعات بسبب تنبيه ما شافه أحد. خلال خمس دقايق بوريكم كيف نضمن إنها ما تتكرر."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You're opening a fifteen-minute talk to your team. Which first line earns the room?",
        "prompt_ar": "تفتحين عرض خمس عشرة دقيقة لفريقك. أي جملة أولى تكسب الغرفة؟",
        "options": [
          {
            "en": "Hi, so, today I wanted to go over a few things about our monitoring, if that's okay.",
            "ar": "هلا، اليوم أبغى أمرّ على كم نقطة عن المراقبة، إذا ما فيه مانع.",
            "correct": false,
            "why": "It apologises and lists an agenda — the room drifts before you start.",
            "why_ar": "تعتذرين وتسردين جدول أعمال — الناس يسرحون قبل ما تبدين."
          },
          {
            "en": "We got paged eleven times last week. Nine were false alarms. Let's fix that today.",
            "ar": "انطلبنا إحدى عشرة مرة الأسبوع اللي طاف. تسع منها إنذارات كاذبة. خلّونا نصلّحها اليوم.",
            "correct": true,
            "why": "A concrete number creates a problem the room wants solved.",
            "why_ar": "رقم ملموس يصنع مشكلة الناس يبغون يحلّونها."
          },
          {
            "en": "I'm not really good at presentations, but I'll try to explain our alerting.",
            "ar": "أنا مو زينة بالعروض، بس بحاول أشرح نظام التنبيهات.",
            "correct": false,
            "why": "Opening with self-doubt lowers your authority before the first slide.",
            "why_ar": "الفتح بالتقليل من نفسك يضعّف هيبتك قبل أول شريحة."
          }
        ]
      },
      "takeaway": "The first line is a door — open it with a number, a question, or a story, never an apology.",
      "takeaway_ar": "أول جملة باب — افتحيه برقم أو سؤال أو قصّة، لا باعتذار."
    },
    {
      "id": "present-signpost",
      "order": 2,
      "ar": "ضعي علامات الطريق",
      "en": "Signpost your structure",
      "minutes": 7,
      "outcome": "Guide the room through your talk with signposts so no one gets lost — \"first… then… finally\", and \"let me come back to that\".",
      "outcome_ar": "توصّلين الناس عبر عرضك بعلامات إرشاد، محد يضيع — «أول… بعدها… أخيراً»، و«بأرجع لهالنقطة».",
      "idea": {
        "body": "A talk without signposts feels like driving in fog — people don't know where they are or how much is left. Signposting is the running map you say out loud: give the shape up front, mark each turn, and park side questions for later. It costs a few words and buys you a room that stays with you.",
        "model": "The rule: say the map, then call out every turn — first, then, finally, and let me come back to that.",
        "body_ar": "العرض بدون علامات إرشاد يشبه السياقة في الضباب — الناس ما يعرفون وينهم ولا كم باقي. علامات الإرشاد هي الخريطة اللي تقولينها بصوت: اعطيهم الشكل من البداية، نبّهي على كل منعطف، وأجّلي الأسئلة الجانبية لبعدين. تكلّفك كم كلمة وتكسبك غرفة تمشي معك.",
        "model_ar": "القاعدة: قولي الخريطة، وبعدها نبّهي على كل منعطف — أول، بعدها، أخيراً، وبأرجع لهالنقطة."
      },
      "phrases": [
        {
          "en": "I'll cover three things: the problem, the fix, and what I need from you.",
          "ar": "بغطّي ثلاث نقاط: المشكلة، الحل، ووش أحتاج منكم.",
          "when": "The map up front",
          "when_ar": "الخريطة من البداية"
        },
        {
          "en": "First, the problem.",
          "ar": "أول شي، المشكلة.",
          "when": "Marking the first stop",
          "when_ar": "تحديد المحطة الأولى"
        },
        {
          "en": "That's the problem — now, the fix.",
          "ar": "هذي المشكلة — الحين، الحل.",
          "when": "The transition",
          "when_ar": "الانتقال"
        },
        {
          "en": "Let me come back to that in a minute.",
          "ar": "خلّيني أرجع لها بعد دقيقة.",
          "when": "Parking a side question",
          "when_ar": "تأجيل سؤال جانبي"
        },
        {
          "en": "Finally, here's what I need from you.",
          "ar": "أخيراً، هذا اللي أحتاجه منكم.",
          "when": "The last stop",
          "when_ar": "المحطة الأخيرة"
        },
        {
          "en": "So, to bring it together…",
          "ar": "طيب، عشان نجمعها…",
          "when": "Signalling the wrap",
          "when_ar": "الإشارة للختام"
        }
      ],
      "example": {
        "setting": "You give the shape of your talk in one breath, then move cleanly between parts.",
        "setting_ar": "تعطين شكل عرضك في نفس واحد، وبعدها تنتقلين بنظافة بين الأجزاء.",
        "lines": [
          {
            "who": "You",
            "en": "I'll cover three things: what broke, how we fixed it, and what changes going forward. First, what broke.",
            "ar": "بغطّي ثلاث نقاط: وش خرب، كيف صلّحناه، ووش يتغيّر بعدها. أول شي، وش خرب."
          },
          {
            "who": "Colleague",
            "en": "Wait, does this affect the mobile app too?",
            "ar": "لحظة، هذا يأثّر على تطبيق الجوّال بعد؟"
          },
          {
            "who": "You",
            "en": "Great point — let me come back to that when I get to impact.",
            "ar": "نقطة زينة — خلّيني أرجع لها لما أوصل للأثر."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put a clearly signposted talk in order:",
        "prompt_ar": "رتّبي عرضًا بعلامات إرشاد واضحة:",
        "steps": [
          {
            "en": "I'll cover three things: the problem, the fix, and what I need.",
            "ar": "بغطّي ثلاث نقاط: المشكلة، الحل، ووش أحتاج."
          },
          {
            "en": "First, the problem.",
            "ar": "أول شي، المشكلة."
          },
          {
            "en": "Now, the fix.",
            "ar": "الحين، الحل."
          },
          {
            "en": "Finally, what I need from you.",
            "ar": "أخيراً، وش أحتاج منكم."
          }
        ]
      },
      "takeaway": "Give them the map, then call out every turn — a guided room never gets lost.",
      "takeaway_ar": "اعطيهم الخريطة، وبعدها نبّهي على كل منعطف — الغرفة الموجَّهة ما تضيع."
    },
    {
      "id": "present-data",
      "order": 3,
      "ar": "اشرحي الأرقام",
      "en": "Describe the data",
      "minutes": 8,
      "outcome": "Describe a chart, a trend, or a comparison in plain words — rise, drop, roughly, compared to — so the number lands.",
      "outcome_ar": "تشرحين رسمًا أو اتجاهًا أو مقارنة بكلمات بسيطة — ارتفاع، انخفاض، تقريباً، مقارنةً بـ — عشان الرقم يوصل.",
      "idea": {
        "body": "Numbers don't speak for themselves — you have to narrate them. Give the shape first (up, down, flat), then the size (roughly, about, nearly), then the anchor (compared to what). Errors dropped by about half compared to last month tells the whole story in one line; the raw figure alone does not.",
        "model": "The rule: shape, then size, then the comparison — rose sharply, roughly double, compared to last quarter.",
        "body_ar": "الأرقام ما تتكلّم عن نفسها — لازم تحكينها. اعطي الشكل أول (طالع، نازل، ثابت)، وبعدها الحجم (تقريباً، حوالي، يقارب)، وبعدها المرجع (مقارنةً بإيش). «الأخطاء نزلت تقريباً للنص مقارنةً بالشهر اللي طاف» تحكي القصّة كاملة في سطر؛ الرقم لحاله ما يحكيها.",
        "model_ar": "القاعدة: الشكل، وبعدها الحجم، وبعدها المقارنة — طلع فجأة، تقريباً الضِّعف، مقارنةً بالربع اللي طاف."
      },
      "phrases": [
        {
          "en": "Overall, the trend is up.",
          "ar": "عمومًا، الاتجاه طالع.",
          "when": "The big picture first",
          "when_ar": "الصورة الكبيرة أول"
        },
        {
          "en": "It rose sharply in the second half.",
          "ar": "ارتفع فجأة في النص الثاني.",
          "when": "A steep increase",
          "when_ar": "ارتفاع حاد"
        },
        {
          "en": "Then it dropped back to roughly where it started.",
          "ar": "وبعدها نزل تقريباً لوين بدأ.",
          "when": "A decrease",
          "when_ar": "انخفاض"
        },
        {
          "en": "That's about a third of all users.",
          "ar": "هذا تقريباً ثلث المستخدمين.",
          "when": "Making a number relatable",
          "when_ar": "تقريب الرقم للذهن"
        },
        {
          "en": "Compared to last month, that is a big improvement.",
          "ar": "مقارنةً بالشهر اللي طاف، هذا تحسّن كبير.",
          "when": "The comparison",
          "when_ar": "المقارنة"
        },
        {
          "en": "The peak was right after the launch.",
          "ar": "الذروة كانت بعد الإطلاق مباشرة.",
          "when": "Pointing to the high point",
          "when_ar": "الإشارة للذروة"
        }
      ],
      "terms": [
        {
          "term": "trend",
          "ar": "الاتجاه",
          "def_en": "the general direction over time — up, down, or flat",
          "example": "The trend is clearly upward."
        },
        {
          "term": "roughly",
          "ar": "تقريباً",
          "def_en": "an approximate amount, not exact",
          "example": "Roughly a third of users were affected."
        },
        {
          "term": "peak",
          "ar": "الذروة",
          "def_en": "the highest point",
          "example": "Traffic hit a peak at noon."
        },
        {
          "term": "compared to",
          "ar": "مقارنةً بـ",
          "def_en": "measured against another number",
          "example": "Errors are down compared to last week."
        }
      ],
      "example": {
        "setting": "You walk a manager through a simple line chart of error rates.",
        "setting_ar": "تشرحين لمديرك رسمًا خطّيًا بسيطًا لمعدّلات الأخطاء.",
        "lines": [
          {
            "who": "Manager",
            "en": "So what am I looking at here?",
            "ar": "طيب وش أشوف هنا؟"
          },
          {
            "who": "You",
            "en": "Overall, errors are down. They spiked right after the deploy — that's the peak here — then dropped to roughly half of last week's level. Compared to last month, we're in much better shape.",
            "ar": "عمومًا، الأخطاء نازلة. طلعت فجأة بعد النشر — هذي الذروة — وبعدها نزلت تقريباً لنص مستوى الأسبوع اللي طاف. مقارنةً بالشهر اللي راح، وضعنا أحسن بكثير."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put together a clear description of a trend, from big picture to comparison:",
        "prompt_ar": "رتّبي وصفًا واضحًا لاتجاه، من الصورة الكبيرة للمقارنة:",
        "steps": [
          {
            "en": "Overall, response times are down.",
            "ar": "عمومًا، أوقات الاستجابة نازلة."
          },
          {
            "en": "They rose sharply during the incident.",
            "ar": "ارتفعت فجأة أثناء الحادثة."
          },
          {
            "en": "Then they settled to roughly normal.",
            "ar": "وبعدها استقرّت على الطبيعي تقريباً."
          },
          {
            "en": "Compared to last week, that is a clear win.",
            "ar": "مقارنةً بالأسبوع اللي طاف، هذا مكسب واضح."
          }
        ]
      },
      "takeaway": "Narrate the number: shape, size, then what it's measured against.",
      "takeaway_ar": "احكي الرقم: الشكل، الحجم، وبعدها مقارنته بإيش."
    },
    {
      "id": "present-qa",
      "order": 4,
      "ar": "تعاملي مع الأسئلة",
      "en": "Handle Q&A",
      "minutes": 7,
      "outcome": "Field questions with control — buy a second, redirect, welcome the hard ones, and follow up cleanly when you don't know.",
      "outcome_ar": "تتعاملين مع الأسئلة بثقة — تكسبين ثانية، تعيدين التوجيه، ترحّبين بالصعبة، وتتابعين بنظافة لو ما تعرفين.",
      "idea": {
        "body": "The Q&A is where your confidence really shows — not because you know everything, but because you stay composed. Give yourself a beat before you answer, treat hard questions as a gift, and when you don't know, say so and commit to following up. \"I'll get back to you by end of day\" beats a confident guess every time.",
        "model": "The rule: welcome the question, take a beat, then answer or promise to follow up — never bluff.",
        "body_ar": "وقت الأسئلة هو اللي تبان فيه ثقتك — مو لأنك تعرفين كل شي، بس لأنك تبقين متّزنة. اعطي نفسك لحظة قبل ما تجاوبين، اعتبري السؤال الصعب هديّة، ولو ما تعرفين، قوليها والتزمي بالمتابعة. «بأرجع لك نهاية اليوم» أحسن من تخمين واثق كل مرّة.",
        "model_ar": "القاعدة: رحّبي بالسؤال، خذي لحظة، وبعدها جاوبي أو وِعدي بالمتابعة — لا تفبركين."
      },
      "phrases": [
        {
          "en": "Great question.",
          "ar": "سؤال ممتاز.",
          "when": "Buying a second and setting a warm tone",
          "when_ar": "تكسبين ثانية وتعطين نبرة ودّية"
        },
        {
          "en": "Let me make sure I understand — you're asking about the rollback, right?",
          "ar": "خلّيني أتأكد إني فهمت — تسألين عن التراجع، صح؟",
          "when": "Redirecting to the real question",
          "when_ar": "إعادة التوجيه للسؤال الحقيقي"
        },
        {
          "en": "That's exactly the right thing to worry about.",
          "ar": "هذا بالضبط الشي اللي يستاهل القلق.",
          "when": "Validating a hard question",
          "when_ar": "تثمين سؤال صعب"
        },
        {
          "en": "I don't have that number in front of me — I'll follow up by end of day.",
          "ar": "ما عندي الرقم قدّامي — بأتابع معك نهاية اليوم.",
          "when": "When you don't know",
          "when_ar": "لما ما تعرفين"
        },
        {
          "en": "Let's take that offline so I can give you a proper answer.",
          "ar": "خلّينا ناخذها على جنب عشان أعطيك جواب كامل.",
          "when": "Parking a deep-dive",
          "when_ar": "تأجيل نقاش عميق"
        },
        {
          "en": "Short answer: yes. Longer answer, if you want it…",
          "ar": "الجواب المختصر: نعم. والمطوّل، إذا تبغينه…",
          "when": "A layered answer",
          "when_ar": "إجابة على طبقات"
        }
      ],
      "example": {
        "setting": "After your talk, someone asks a question you can't answer on the spot.",
        "setting_ar": "بعد عرضك، أحد يسأل سؤالًا ما تقدرين تجاوبينه على طول.",
        "lines": [
          {
            "who": "Reviewer",
            "en": "What's the exact cost impact of this change per month?",
            "ar": "كم التكلفة الشهرية بالضبط لهالتغيير؟"
          },
          {
            "who": "You",
            "en": "Great question. I don't have the exact figure in front of me — I'll pull it and follow up by end of day. Roughly, it's in the low hundreds, but I want to give you the real number.",
            "ar": "سؤال ممتاز. ما عندي الرقم بالضبط الحين — بأجيبه وأتابع معك نهاية اليوم. تقريباً بالمئات القليلة، بس أبغى أعطيك الرقم الصحيح."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Someone asks a detailed question you genuinely can't answer right now. What's the strongest move?",
        "prompt_ar": "أحد يسأل سؤالًا دقيقًا ما تقدرين تجاوبينه الحين فعلاً. أقوى تصرّف؟",
        "options": [
          {
            "en": "Um, I think it's around… maybe… I'm not totally sure, sorry.",
            "ar": "إمم، أظن حوالي… يمكن… مو متأكدة تمام، آسفة.",
            "correct": false,
            "why": "Guessing out loud undercuts everything you just presented.",
            "why_ar": "التخمين بصوت يهدّ كل اللي قدّمتيه."
          },
          {
            "en": "Great question — I don't have that in front of me, so I'll follow up by end of day.",
            "ar": "سؤال ممتاز — ما هو قدّامي، فبأتابع معك نهاية اليوم.",
            "correct": true,
            "why": "It stays warm, honest, and committed to a real answer.",
            "why_ar": "تبقى ودّية، صادقة، وملتزمة بجواب حقيقي."
          },
          {
            "en": "That's not really relevant to what I'm presenting.",
            "ar": "هذا مو مرتبط فعلاً باللي أعرضه.",
            "correct": false,
            "why": "Dismissing a question makes the room defensive and reads as evasive.",
            "why_ar": "تجاهل السؤال يخلّي الناس دفاعية ويبان تهرّب."
          }
        ]
      },
      "takeaway": "You don't have to know everything — you have to stay composed and follow up.",
      "takeaway_ar": "مو لازم تعرفين كل شي — لازم تبقين متّزنة وتتابعين."
    },
    {
      "id": "present-demo",
      "order": 5,
      "ar": "اشرحي العرض الحي",
      "en": "Narrate the live demo",
      "minutes": 8,
      "outcome": "Walk people through a live demo out loud — say what you are about to do, do it, then say what they should notice.",
      "outcome_ar": "توصّلين الناس خلال عرض حي بالصوت — تقولين وش بتسوّين، تسوّينه، وبعدها تقولين وش يلاحظون.",
      "idea": {
        "body": "In a live demo, silence is the enemy — a quiet click leaves people guessing what just happened. Narrate as you go: announce the action, perform it, then point out the result. This say-it, do-it, show-it rhythm keeps everyone with you, and it saves you when a click is slow to load.",
        "model": "The rule: say what you'll do, do it, then point out what they should see.",
        "body_ar": "في العرض الحي، الصمت هو العدو — الضغطة الصامتة تخلّي الناس يخمّنون وش صار. احكي وأنتِ تمشين: أعلني الحركة، سوّيها، وبعدها أشيري للنتيجة. إيقاع «قوليها، سوّيها، وريهم» يخلّي الكل معك، ويغطّي عليك لو الضغطة تأخّرت بالتحميل.",
        "model_ar": "القاعدة: قولي وش بتسوّين، سوّيه، وبعدها أشيري لوش يشوفون."
      },
      "phrases": [
        {
          "en": "Let me show you what happens when an alert fires.",
          "ar": "خلّوني أوريكم وش يصير لما ينطلق تنبيه.",
          "when": "Announcing the action",
          "when_ar": "إعلان الحركة"
        },
        {
          "en": "So I'll click into the dashboard here…",
          "ar": "طيب بضغط على اللوحة هنا…",
          "when": "Narrating as you move",
          "when_ar": "الحكي وأنتِ تتحركين"
        },
        {
          "en": "Watch this part — this is the bit that matters.",
          "ar": "شوفوا هالجزء — هذا اللي يهم.",
          "when": "Directing attention",
          "when_ar": "توجيه الانتباه"
        },
        {
          "en": "Notice how it updates in real time.",
          "ar": "لاحظوا كيف يتحدّث لحظيًّا.",
          "when": "Pointing out the result",
          "when_ar": "الإشارة للنتيجة"
        },
        {
          "en": "Give it a second to load…",
          "ar": "خلّوه يحمّل ثانية…",
          "when": "Covering a pause",
          "when_ar": "تغطية لحظة تحميل"
        },
        {
          "en": "And that is the whole flow, start to finish.",
          "ar": "وهذا المسار كامل، من أوله لآخره.",
          "when": "Closing the walkthrough",
          "when_ar": "إقفال الجولة"
        }
      ],
      "example": {
        "setting": "You share your screen and walk the team through triggering and resolving an alert.",
        "setting_ar": "تشاركين شاشتك وتوصّلين الفريق خلال إطلاق تنبيه وحلّه.",
        "lines": [
          {
            "who": "You",
            "en": "Okay, let me show you the flow. First I'll trigger a test alert here… give it a second… and notice it pops up in the channel with the runbook link attached.",
            "ar": "طيب، أوريكم المسار. أول بشغّل تنبيه تجريبي هنا… ثانية يحمّل… ولاحظوا كيف يطلع في القناة ومعه رابط دليل المعالجة."
          },
          {
            "who": "Colleague",
            "en": "Oh nice, so the link is automatic?",
            "ar": "حلو، يعني الرابط تلقائي؟"
          },
          {
            "who": "You",
            "en": "Exactly. Watch this next part — I click resolve, and it closes the alert everywhere at once.",
            "ar": "بالضبط. شوفوا الجزء الجاي — أضغط «حل»، ويقفل التنبيه في كل مكان مرة وحدة."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Think of one task you do at work (deploying, running a check, opening a ticket). Write three narration lines for demoing it: one \"I'll do X\", one \"watch this\", one \"notice Y\".",
        "prompt_ar": "فكّري بمهمة تسوّينها في العمل (نشر، فحص، فتح تذكرة). اكتبي ثلاث جمل سرد لعرضها: وحدة «بسوّي X»، وحدة «شوفوا هنا»، وحدة «لاحظوا Y».",
        "hint": "Announce before you click, then point at the result — never click in silence.",
        "hint_ar": "أعلني قبل ما تضغطين، وبعدها أشيري للنتيجة — لا تضغطين بصمت."
      },
      "takeaway": "A silent demo loses the room — say it, do it, show it.",
      "takeaway_ar": "العرض الصامت يضيّع الناس — قوليها، سوّيها، وريهم."
    }
  ]
},
{
  "id": "negotiate",
  "order": 9,
  "icon": "Scale",
  "ar": "التفاوض والاعتراض",
  "en": "Negotiation & Pushback",
  "tagline": "Say no, ask for more, and disagree — all without damaging the relationship.",
  "tagline_ar": "تقولين لا، تطلبين أكثر، وتختلفين — بدون ما تخسّرين العلاقة.",
  "lessons": [
    {
      "id": "negotiate-no",
      "order": 1,
      "ar": "قولي لا بلياقة",
      "en": "Say no gracefully",
      "minutes": 7,
      "outcome": "Decline a request clearly without burning the bridge — acknowledge, decline, and offer a door.",
      "outcome_ar": "ترفضين طلبًا بوضوح بدون ما تحرقين الجسر — تقدّرين، ترفضين، وتفتحين باب.",
      "idea": {
        "body": "A good no protects your time without bruising the relationship. The shape is simple: acknowledge the request so they feel heard, decline clearly so there's no false hope, and offer an alternative or a door. A vague \"maybe\" that's really a no costs you far more later than an honest, kind no today.",
        "model": "The rule: acknowledge, decline clearly, offer a door — a soft no beats a fake yes.",
        "body_ar": "«لا» الزينة تحمي وقتك بدون ما تخدش العلاقة. الشكل بسيط: قدّري الطلب عشان يحسّون مسموعين، ارفضي بوضوح عشان ما يبقى أمل زائف، وافتحي باب أو قدّمي بديل. «يمكن» اللي هي لا في الحقيقة تكلّفك بعدين أكثر بكثير من «لا» صادقة ولطيفة اليوم.",
        "model_ar": "القاعدة: قدّري، ارفضي بوضوح، افتحي باب — «لا» لطيفة أحسن من «نعم» زائفة."
      },
      "phrases": [
        {
          "en": "I'd love to help, but I can't take this on this week.",
          "ar": "أحب أساعد، بس ما أقدر آخذها هالأسبوع.",
          "when": "A warm, clear decline",
          "when_ar": "رفض دافئ وواضح"
        },
        {
          "en": "That's not something I can commit to right now.",
          "ar": "هذا شي ما أقدر ألتزم فيه الحين.",
          "when": "Protecting your capacity",
          "when_ar": "حماية طاقتك"
        },
        {
          "en": "I can't do the whole thing, but I can point you to who can.",
          "ar": "ما أقدر آخذها كاملة، بس أقدر أدلّك على اللي يقدر.",
          "when": "Offering a door",
          "when_ar": "فتح باب بديل"
        },
        {
          "en": "If I take this, something else slips — which would you rather?",
          "ar": "لو آخذها، شي ثاني بيتأخّر — إيش تفضّل؟",
          "when": "Making the trade-off visible",
          "when_ar": "إظهار المقايضة"
        },
        {
          "en": "Let me be honest rather than over-promise.",
          "ar": "خلّيني أكون صادقة بدل ما أوعد بزيادة.",
          "when": "Choosing honesty over a fake yes",
          "when_ar": "الصدق بدل وعد زائف"
        },
        {
          "en": "Can we revisit this next sprint?",
          "ar": "نقدر نرجع لها الدورة الجاية؟",
          "when": "Deferring, not refusing forever",
          "when_ar": "تأجيل مو رفض دائم"
        }
      ],
      "example": {
        "setting": "A colleague asks you to own an extra task while you're already at capacity.",
        "setting_ar": "زميل يطلب منك تاخذين مهمة زيادة وأنتِ أصلاً محمّلة.",
        "lines": [
          {
            "who": "Faisal",
            "en": "Could you take over the migration docs too? You know that system best.",
            "ar": "تقدرين تاخذين توثيق الترحيل بعد؟ إنتِ أعرف وحدة بهالنظام."
          },
          {
            "who": "You",
            "en": "I'd genuinely like to help, and I can't take the whole thing this week without dropping the failover work. I can review your draft on Thursday, though — would that work?",
            "ar": "والله أحب أساعد، وما أقدر آخذها كاملة هالأسبوع إلا لو أوقّف شغل التحويل. بس أقدر أراجع مسودّتك يوم الخميس — يناسبك كذا؟"
          },
          {
            "who": "Faisal",
            "en": "That works, thanks.",
            "ar": "يناسبني، مشكورة."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Your manager asks you to take on a task you truly don't have time for. What's the best way to decline?",
        "prompt_ar": "مديرك يطلب منك مهمة ما عندك لها وقت فعلاً. أنسب طريقة ترفضين؟",
        "options": [
          {
            "en": "Yeah, sure, I'll try to fit it in somewhere.",
            "ar": "إيه أوكي، بحاول ألقّمها بمكان.",
            "correct": false,
            "why": "A reluctant yes you can't keep damages trust more than a clear no.",
            "why_ar": "«نعم» متردّدة ما تقدرين تلتزمين فيها تكسر الثقة أكثر من «لا» واضحة."
          },
          {
            "en": "No, I'm too busy.",
            "ar": "لا، أنا مشغولة وايد.",
            "correct": false,
            "why": "True, but blunt and closed — it offers nothing and strains the relationship.",
            "why_ar": "صحيحة بس حادّة ومقفلة — ما تقدّم شي وتشدّ العلاقة."
          },
          {
            "en": "I can't take this on without the failover work slipping — could we push it to next week, or hand it to someone with room?",
            "ar": "ما أقدر آخذها إلا وشغل التحويل يتأخّر — نأجّلها للأسبوع الجاي، أو نعطيها لأحد عنده وقت؟",
            "correct": true,
            "why": "It is honest about the trade-off and still offers a path forward.",
            "why_ar": "صادقة في المقايضة وبنفس الوقت تقدّم مخرج."
          }
        ]
      },
      "takeaway": "A kind, clear no today saves a broken promise tomorrow.",
      "takeaway_ar": "«لا» لطيفة وواضحة اليوم توفّر وعدًا مكسورًا بكرة."
    },
    {
      "id": "negotiate-ask",
      "order": 2,
      "ar": "اطلبي أكثر",
      "en": "Ask for more",
      "minutes": 8,
      "outcome": "Ask for more time, scope, or resources in a way that lands — name what you need, why, and the cost of not getting it.",
      "outcome_ar": "تطلبين وقت أو نطاق أو موارد أكثر بطريقة تنجح — تسمّين وش تحتاجين، ليش، وتكلفة عدم الحصول عليه.",
      "idea": {
        "body": "People say yes to a clear, reasoned ask far more often than to a vague hope. Name exactly what you need, tie it to the outcome they care about, and make the cost of no visible. \"I need two more days to test properly, or we risk shipping the same bug again\" is a request a manager can actually act on.",
        "model": "The rule: what you need, why it matters to them, and the cost of not getting it.",
        "body_ar": "الناس يوافقون على طلب واضح ومسبَّب أكثر بكثير من أمل غامض. سمّي بالضبط وش تحتاجين، اربطيه بالنتيجة اللي تهمّهم، وخلّي تكلفة «لا» واضحة. «أحتاج يومين زيادة أختبر صح، وإلا نخاطر بنفس الخطأ يتكرر» طلب المدير يقدر يتحرّك عليه فعلاً.",
        "model_ar": "القاعدة: وش تحتاجين، ليش يهمّهم، وتكلفة إنك ما تحصلين عليه."
      },
      "phrases": [
        {
          "en": "To do this properly, I'll need two more days.",
          "ar": "عشان أسوّيها صح، بحتاج يومين زيادة.",
          "when": "Naming the ask clearly",
          "when_ar": "تسمية الطلب بوضوح"
        },
        {
          "en": "I want to get this right the first time, not patch it twice.",
          "ar": "أبغى أضبطها من أول مرّة، مو أرقّعها مرتين.",
          "when": "Tying it to their goal",
          "when_ar": "ربطه بهدفهم"
        },
        {
          "en": "Without a second reviewer, we're one typo from an outage.",
          "ar": "بدون مراجِع ثاني، غلطة كتابة وحدة تفصلنا عن انقطاع.",
          "when": "Making the risk concrete",
          "when_ar": "تجسيد الخطر"
        },
        {
          "en": "Here's what I can deliver by Friday, and here's what needs another week.",
          "ar": "هذا اللي أقدر أسلّمه الخميس، وهذا اللي يبي أسبوع زيادة.",
          "when": "Offering options",
          "when_ar": "تقديم خيارات"
        },
        {
          "en": "Is there any flexibility on the deadline?",
          "ar": "فيه أي مرونة في الموعد النهائي؟",
          "when": "Opening the negotiation gently",
          "when_ar": "فتح التفاوض بلطف"
        },
        {
          "en": "What would you be comfortable trading to make room for this?",
          "ar": "إيش ترتاح تتنازل عنه عشان نفسح لها مكان؟",
          "when": "Inviting a trade",
          "when_ar": "الدعوة لمقايضة"
        }
      ],
      "example": {
        "setting": "You need two more days on a release, and you ask your manager for them.",
        "setting_ar": "تحتاجين يومين زيادة على إصدار، وتطلبينهم من مديرك.",
        "lines": [
          {
            "who": "You",
            "en": "I want to flag something before Friday. To test the failover properly, I need two more days. If we ship on time without it, we're risking the same outage we had last month.",
            "ar": "أبغى أنبّه على شي قبل الخميس. عشان أختبر التحويل صح، أحتاج يومين زيادة. لو نزّلناه بالوقت بدونها، نخاطر بنفس الانقطاع اللي صار الشهر اللي طاف."
          },
          {
            "who": "Manager",
            "en": "Two days is a lot right now.",
            "ar": "يومين وايد بالوضع الحالي."
          },
          {
            "who": "You",
            "en": "I hear that. I can ship the core on Friday and the failover check on Tuesday — would splitting it that way work?",
            "ar": "أفهمك. أقدر أنزّل الأساس الخميس وفحص التحويل الثلاثاء — يمشي لو قسمناها كذا؟"
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Build an ask that a manager can say yes to:",
        "prompt_ar": "ابني طلبًا يقدر المدير يوافق عليه:",
        "steps": [
          {
            "en": "To test this properly, I need two more days.",
            "ar": "عشان أختبرها صح، أحتاج يومين زيادة."
          },
          {
            "en": "I'd rather ship it right than patch it twice.",
            "ar": "أفضّل أنزّلها صح بدل ما أرقّعها مرتين."
          },
          {
            "en": "Without the extra time, we risk the same outage again.",
            "ar": "بدون الوقت الزيادة، نخاطر بنفس الانقطاع."
          },
          {
            "en": "Could we move the deadline, or split the release?",
            "ar": "نقدر نحرّك الموعد، أو نقسّم الإصدار؟"
          }
        ]
      },
      "takeaway": "A clear ask with a reason and a cost is one a manager can act on.",
      "takeaway_ar": "طلب واضح معه سبب وتكلفة، المدير يقدر يتحرّك عليه."
    },
    {
      "id": "negotiate-disagree",
      "order": 3,
      "ar": "اختلفي بلا احتكاك",
      "en": "Disagree without friction",
      "minutes": 8,
      "outcome": "Disagree with a colleague without it turning personal — separate the idea from the person and get curious first.",
      "outcome_ar": "تختلفين مع زميل بدون ما تصير شخصية — تفصلين الفكرة عن الشخص وتستفسرين أول.",
      "idea": {
        "body": "Disagreement doesn't have to mean friction. The trick is to go after the idea, not the person, and to get curious before you get critical. \"Help me understand your thinking\" opens a door that \"you're wrong\" slams shut — and often their reasoning changes yours, or yours changes theirs, with no bruised egos.",
        "model": "The rule: get curious before critical — I see it differently, and help me understand, never you are wrong.",
        "body_ar": "الاختلاف مو لازم يعني احتكاك. السرّ إنك تروحين على الفكرة مو على الشخص، وتستفسرين قبل ما تنتقدين. «ساعدني أفهم وجهة نظرك» تفتح باب اللي تقفله «إنت غلطان» — وكثير مرّة منطقهم يغيّر رأيك، أو رأيك يغيّر رأيهم، بدون ما تنجرح كرامة أحد.",
        "model_ar": "القاعدة: استفسري قبل ما تنتقدين — «أشوفها مختلفة» و«ساعدني أفهم»، مو «إنت غلطان»."
      },
      "phrases": [
        {
          "en": "I see it a little differently — can I share why?",
          "ar": "أشوفها شوي مختلفة — أقدر أقول ليش؟",
          "when": "Opening a disagreement softly",
          "when_ar": "فتح الاختلاف بلطف"
        },
        {
          "en": "Help me understand what's driving that choice.",
          "ar": "ساعدني أفهم وش اللي وراء هالاختيار.",
          "when": "Getting curious first",
          "when_ar": "الاستفسار أول"
        },
        {
          "en": "I agree with the goal — I'd get there a different way.",
          "ar": "أنا متفقة على الهدف — بس بوصله بطريقة ثانية.",
          "when": "Agreeing on ends, differing on means",
          "when_ar": "اتفاق على الهدف اختلاف على الطريقة"
        },
        {
          "en": "What am I missing here?",
          "ar": "وش اللي فاتني هنا؟",
          "when": "Leaving room to be wrong",
          "when_ar": "ترك مجال إنك غلطانة"
        },
        {
          "en": "Can we look at the trade-offs side by side?",
          "ar": "نقدر نشوف الإيجابيات والسلبيات جنب بعض؟",
          "when": "Moving it to the merits",
          "when_ar": "نقله للمعطيات"
        },
        {
          "en": "I might be wrong, but here's my worry.",
          "ar": "يمكن أكون غلطانة، بس هذا اللي يقلقني.",
          "when": "Raising a concern without ego",
          "when_ar": "إبداء تحفّظ بدون كبرياء"
        }
      ],
      "example": {
        "setting": "A colleague proposes a design you think is risky. You push back on the idea, not on him.",
        "setting_ar": "زميل يقترح تصميمًا تشوفينه محفوف بالمخاطر. تعترضين على الفكرة، مو عليه.",
        "lines": [
          {
            "who": "Omar",
            "en": "Let's just cache everything in memory — it'll be way faster.",
            "ar": "خلّنا نخزّن كل شي في الذاكرة — بيكون أسرع بكثير."
          },
          {
            "who": "You",
            "en": "I see the appeal, and I see it a bit differently — help me understand how we handle a restart. My worry is we lose the cache and hammer the database. What am I missing?",
            "ar": "أشوف جاذبيتها، وأشوفها شوي مختلفة — ساعدني أفهم كيف نتعامل مع إعادة التشغيل. قلقي إننا نخسر المخزون ونضغط على قاعدة البيانات. وش فاتني؟"
          },
          {
            "who": "Omar",
            "en": "Fair — I hadn't thought about the restart. Maybe a warm-up step?",
            "ar": "معك حق — ما فكّرت بإعادة التشغيل. يمكن خطوة تسخين؟"
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Think of a technical opinion you hold strongly. Write two lines disagreeing with someone who thinks the opposite — one using \"I see it differently\", one using \"help me understand\" — with no \"you're wrong\".",
        "prompt_ar": "فكّري برأي تقني عندك فيه قناعة. اكتبي سطرين تختلفين فيهما مع شخص عكسك — واحد بـ«أشوفها مختلفة»، وواحد بـ«ساعدني أفهم» — بدون «إنت غلطان».",
        "hint": "Attack the idea, stay warm to the person, and ask a real question you'd want answered.",
        "hint_ar": "هاجمي الفكرة، ابقي دافئة مع الشخص، واسألي سؤالًا حقيقيًا تبغين جوابه."
      },
      "takeaway": "Go after the idea, stay warm to the person — help me understand opens what you are wrong shuts.",
      "takeaway_ar": "هاجمي الفكرة، ابقي دافئة مع الشخص — «ساعدني أفهم» تفتح اللي تقفله «إنت غلطان»."
    },
    {
      "id": "negotiate-objections",
      "order": 4,
      "ar": "عالجي الاعتراضات",
      "en": "Handle objections",
      "minutes": 8,
      "outcome": "Meet an objection with acknowledge-then-answer, so the other person feels heard before you make your case.",
      "outcome_ar": "تقابلين الاعتراض بـ«أقدّر ثم أجيب»، عشان الطرف الثاني يحسّ إنه مسموع قبل ما تعرضين وجهة نظرك.",
      "idea": {
        "body": "When someone objects, the instinct is to defend immediately — but that makes them dig in. Acknowledge the concern first, in their words, so they feel heard; then answer it directly. \"You're right that it's a risk — here's how we contain it\" moves a conversation forward; \"no, that won't be a problem\" turns it into a fight.",
        "model": "The rule: acknowledge the concern in their words, then answer it — never skip straight to defending.",
        "body_ar": "لما أحد يعترض، الغريزة إنك تدافعين على طول — بس هذا يخلّيهم يتمسّكون أكثر. قدّري القلق أول، بكلماتهم، عشان يحسّون مسموعين؛ وبعدها جاوبي عليه مباشرة. «معك حق فيها مخاطرة — وهذي طريقة احتوائها» تمشّي النقاش؛ «لا، ما بتصير مشكلة» تحوّله لخناقة.",
        "model_ar": "القاعدة: قدّري القلق بكلماتهم، وبعدها جاوبي عليه — لا تقفزين مباشرة للدفاع."
      },
      "phrases": [
        {
          "en": "That's a fair concern.",
          "ar": "هذا تحفّظ منطقي.",
          "when": "Acknowledging first",
          "when_ar": "التقدير أول"
        },
        {
          "en": "You're right that there's a risk there — here's how we handle it.",
          "ar": "معك حق فيها مخاطرة هناك — وهذي طريقة تعاملنا معها.",
          "when": "Acknowledge, then answer",
          "when_ar": "تقدير ثم جواب"
        },
        {
          "en": "I understand why that worries you.",
          "ar": "أفهم ليش هذا يقلقك.",
          "when": "Naming their feeling",
          "when_ar": "تسمية شعورهم"
        },
        {
          "en": "Let me address that directly.",
          "ar": "خلّيني أعالجها مباشرة.",
          "when": "Signalling a real answer",
          "when_ar": "الإشارة لجواب مباشر"
        },
        {
          "en": "What would make you comfortable moving forward?",
          "ar": "إيش اللي يخلّيك مرتاح نمشي قدّام؟",
          "when": "Turning it into a solution",
          "when_ar": "تحويله لحل"
        },
        {
          "en": "If that changes, here's our fallback.",
          "ar": "لو تغيّر هذا، هذي خطتنا البديلة.",
          "when": "Offering a safety net",
          "when_ar": "تقديم شبكة أمان"
        }
      ],
      "example": {
        "setting": "A stakeholder objects that your plan is too risky. You acknowledge, then answer.",
        "setting_ar": "أحد أصحاب المصلحة يعترض إن خطتك مخاطرة زيادة. تقدّرين، وبعدها تجيبين.",
        "lines": [
          {
            "who": "Reem",
            "en": "Rolling this out to everyone at once feels way too risky.",
            "ar": "إطلاقها للكل مرة وحدة يحسّ مخاطرة كبيرة."
          },
          {
            "who": "You",
            "en": "That's a fair concern — a big-bang rollout would be risky. That's exactly why we're going in stages: five percent first, watch the metrics for a day, then widen. If anything spikes, we roll back in minutes.",
            "ar": "تحفّظ منطقي — الإطلاق الكامل مرة وحدة مخاطرة. عشان كذا بالضبط نمشي على مراحل: خمسة بالمية أول، نراقب المؤشرات يوم، وبعدها نوسّع. لو شي طلع، نتراجع خلال دقايق."
          },
          {
            "who": "Reem",
            "en": "Okay, staged I'm comfortable with.",
            "ar": "تمام، المراحل مرتاحة لها."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "A stakeholder says \"I'm worried this will slow down the app.\" What's the strongest response?",
        "prompt_ar": "أحد أصحاب المصلحة يقول «قلقان هذا بيبطّئ التطبيق». أقوى ردّ؟",
        "options": [
          {
            "en": "No, it won't slow anything down, don't worry.",
            "ar": "لا، ما بيبطّئ شي، لا تقلق.",
            "correct": false,
            "why": "Dismissing the worry makes them hold it tighter — you skipped the acknowledgement.",
            "why_ar": "تجاهل القلق يخلّيهم يتمسّكون فيه أكثر — تخطّيتي التقدير."
          },
          {
            "en": "That's a fair thing to check — here's the benchmark showing it stays under 50ms.",
            "ar": "شي يستاهل نتأكد منه — وهذا القياس يبيّن إنها تبقى تحت ٥٠ ملّي ثانية.",
            "correct": true,
            "why": "It validates the concern, then answers it with evidence.",
            "why_ar": "تثمّن القلق، وبعدها تجيبين بدليل."
          },
          {
            "en": "Performance isn't really my area, so I can't say.",
            "ar": "الأداء مو تخصّصي فعلاً، فما أقدر أقول.",
            "correct": false,
            "why": "Deflecting leaves the objection standing and reads as unprepared.",
            "why_ar": "التملّص يخلّي الاعتراض قائم ويبان إنك غير مستعدّة."
          }
        ]
      },
      "takeaway": "Make them feel heard first — an acknowledged objection is half-answered.",
      "takeaway_ar": "خلّيهم يحسّون مسموعين أول — الاعتراض المُقدَّر نصّه انحلّ."
    },
    {
      "id": "negotiate-close",
      "order": 5,
      "ar": "أقفلي وثبّتي الاتفاق",
      "en": "Close and confirm",
      "minutes": 7,
      "outcome": "End a conversation with a locked next step — who does what, by when — so nothing is left to assume.",
      "outcome_ar": "تقفلين النقاش بخطوة تالية مثبّتة — مين يسوّي وش، ومتى — بدون ما يبقى شي على الفرضيات.",
      "idea": {
        "body": "Most agreements fall apart in the gap between \"sounds good\" and \"who's actually doing it\". Before you leave, close the loop out loud: restate what was agreed, name the owner and the deadline, and confirm both sides heard the same thing. Thirty seconds of confirmation prevents a week of \"I thought you were handling that\".",
        "model": "The rule: restate the agreement, name owner and deadline, confirm you both heard the same thing.",
        "body_ar": "أغلب الاتفاقات تنهار في الفراغ بين «تمام» و«مين اللي فعلاً بيسوّيها». قبل ما تطلعين، أقفلي الحلقة بصوت: أعيدي اللي اتفقتوا عليه، سمّي المسؤول والموعد، وأكّدي إن الطرفين سمعوا نفس الشي. ثلاثين ثانية تأكيد توفّر أسبوع «أنا حسبتك إنت اللي ماسكها».",
        "model_ar": "القاعدة: أعيدي الاتفاق، سمّي المسؤول والموعد، وأكّدي إنكم سمعتوا نفس الشي."
      },
      "phrases": [
        {
          "en": "So, to confirm what we agreed…",
          "ar": "طيب، للتأكيد على اللي اتفقنا عليه…",
          "when": "Opening the close",
          "when_ar": "فتح الإقفال"
        },
        {
          "en": "You'll send the config, and I'll run the test by Thursday.",
          "ar": "إنت ترسل الإعداد، وأنا أشغّل الاختبار قبل الخميس.",
          "when": "Naming owners and actions",
          "when_ar": "تسمية المسؤولين والأفعال"
        },
        {
          "en": "Deadline is end of day Wednesday — does that work for you?",
          "ar": "الموعد نهاية يوم الأربعاء — يناسبك؟",
          "when": "Locking the date",
          "when_ar": "تثبيت التاريخ"
        },
        {
          "en": "Are we agreed on that?",
          "ar": "متفقين على كذا؟",
          "when": "Getting an explicit yes",
          "when_ar": "أخذ نعم صريحة"
        },
        {
          "en": "I'll put this in writing so we're both covered.",
          "ar": "بكتبها عشان نكون الاثنين مغطّيين.",
          "when": "Making it durable",
          "when_ar": "توثيقها"
        },
        {
          "en": "If anything changes, ping me before Wednesday.",
          "ar": "لو تغيّر شي، طرشلي قبل الأربعاء.",
          "when": "Setting the escape hatch",
          "when_ar": "وضع مخرج"
        }
      ],
      "example": {
        "setting": "A planning call is wrapping up. You lock the next steps before anyone hangs up.",
        "setting_ar": "مكالمة تخطيط قربت تخلص. تثبّتين الخطوات التالية قبل ما يقفل أحد.",
        "lines": [
          {
            "who": "You",
            "en": "Before we close — to confirm: you'll send me the staging config today, I'll run the failover test tomorrow, and we review together Thursday at ten. Are we agreed?",
            "ar": "قبل ما نقفل — للتأكيد: إنت ترسل لي إعداد الـ staging اليوم، وأنا أشغّل اختبار التحويل بكرة، ونراجع مع بعض الخميس الساعة عشرة. متفقين؟"
          },
          {
            "who": "Khalid",
            "en": "Agreed. I'll send the config within the hour.",
            "ar": "متفقين. برسل الإعداد خلال ساعة."
          },
          {
            "who": "You",
            "en": "Perfect — I'll write it up in the channel so it's on record.",
            "ar": "تمام — بكتبها في القناة عشان تكون موثّقة."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put together a clean close that leaves nothing to assume:",
        "prompt_ar": "رتّبي إقفالًا نظيفًا ما يخلّي شي على الفرضيات:",
        "steps": [
          {
            "en": "So, to confirm what we agreed…",
            "ar": "للتأكيد على اللي اتفقنا عليه…"
          },
          {
            "en": "You'll send the config, I'll run the test.",
            "ar": "إنت ترسل الإعداد، وأنا أشغّل الاختبار."
          },
          {
            "en": "We review together Thursday at ten.",
            "ar": "نراجع مع بعض الخميس الساعة عشرة."
          },
          {
            "en": "Are we agreed? I'll put it in writing.",
            "ar": "متفقين؟ بكتبها وأوثّقها."
          }
        ]
      },
      "takeaway": "The deal isn't done until the next step has a name and a date.",
      "takeaway_ar": "الاتفاق ما خلص إلا لما الخطوة الجاية يصير لها اسم وتاريخ."
    }
  ]
},
{
  "id": "email",
  "order": 10,
  "icon": "Mail",
  "ar": "البريد والمستندات",
  "en": "Email & Docs Mastery",
  "tagline": "Write emails and docs people actually read, act on, and respect.",
  "tagline_ar": "اكتبي إيميلات ومستندات الناس فعلاً يقرونها، ويتحركون عليها، ويحترمونها.",
  "lessons": [
    {
      "id": "email-subject-bluf",
      "order": 1,
      "ar": "العنوان والخلاصة أول",
      "en": "Subject lines & BLUF",
      "minutes": 7,
      "outcome": "Write a subject line that tells the reader what to do, and open with the ask in the very first line.",
      "outcome_ar": "تكتبين عنوان يقول للقارئ وش تبين منه، وتبدين بالطلب من أول سطر.",
      "idea": {
        "body": "Most work emails get skimmed on a phone in three seconds. If your subject line is vague and your ask is buried in paragraph three, it gets postponed — or lost. The professional move is BLUF: bottom line up front. Put the point, and what you need, right at the top; the detail can wait below.",
        "model": "The rule: the reader should know what to do before they finish the first line.",
        "body_ar": "أغلب إيميلات الشغل تُقرأ على الجوال في ثلاث ثواني. لو العنوان مبهم والطلب مدفون في الفقرة الثالثة، بيتأجّل — أو يضيع. الحركة الاحترافية: الخلاصة أول. حطي الزبدة واللي تبينه فوق، والتفاصيل تنتظر تحت.",
        "model_ar": "القاعدة: القارئ لازم يعرف وش يسوي قبل ما يخلّص أول سطر."
      },
      "phrases": [
        {
          "en": "Subject: Approval needed — vendor quote by Thursday",
          "ar": "العنوان: يبي موافقة — عرض المورّد قبل الخميس",
          "when": "A subject that names the action and the deadline",
          "when_ar": "عنوان يذكر الإجراء والموعد"
        },
        {
          "en": "Bottom line: I need your sign-off today to keep the discount.",
          "ar": "الخلاصة: أحتاج موافقتك اليوم عشان نحافظ على الخصم.",
          "when": "Leading with the point",
          "when_ar": "تبدين بالزبدة"
        },
        {
          "en": "Two decisions I need from you, below.",
          "ar": "قرارين أحتاجهم منك، تحت.",
          "when": "Flagging how many asks there are",
          "when_ar": "توضّحين كم طلب"
        },
        {
          "en": "No action needed — sharing for your awareness.",
          "ar": "ما يحتاج شي منك — للعلم بس.",
          "when": "It's an FYI, not a request",
          "when_ar": "للعلم، مو طلب"
        },
        {
          "en": "Subject: FYI — migration done, nothing to do",
          "ar": "العنوان: للعلم — خلصت الترحيل، ما فيه شي عليك",
          "when": "A pure heads-up",
          "when_ar": "مجرد تنبيه"
        },
        {
          "en": "Short version up top, full detail below.",
          "ar": "المختصر فوق، والتفصيل كامل تحت.",
          "when": "Layering a longer email",
          "when_ar": "ترتّبين إيميل طويل"
        }
      ],
      "terms": [
        {
          "term": "BLUF",
          "ar": "الخلاصة أول",
          "def_en": "bottom line up front — the main point and the ask in the opening line",
          "example": "She writes BLUF, so her manager never has to scroll to find the request."
        },
        {
          "term": "subject line",
          "ar": "سطر العنوان",
          "def_en": "the one line in the inbox that decides whether your email gets opened now or later",
          "example": "A clear subject line doubled his reply rate."
        }
      ],
      "example": {
        "setting": "You need your manager to approve a new backup vendor before the weekend discount ends.",
        "setting_ar": "تبين مديرك يوافق على مورّد نسخ احتياطي جديد قبل ما ينتهي خصم نهاية الأسبوع.",
        "lines": [
          {
            "who": "You",
            "en": "Subject: Approval needed — backup vendor by Thu",
            "ar": "العنوان: يبي موافقة — مورّد النسخ قبل الخميس"
          },
          {
            "who": "You",
            "en": "Bottom line: I need your approval on the attached quote by Thursday, or we lose the 20% discount. Detail and comparison below.",
            "ar": "الخلاصة: أحتاج موافقتك على العرض المرفق قبل الخميس، وإلا نخسر خصم ٢٠٪. التفاصيل والمقارنة تحت."
          },
          {
            "who": "Khalid",
            "en": "Approved. Go ahead and lock it in.",
            "ar": "موافق. امشي وثبّتيه."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Which subject line gets opened and acted on first?",
        "prompt_ar": "أي عنوان بينفتح ويتحرّكون عليه أول؟",
        "options": [
          {
            "en": "Quick question",
            "ar": "سؤال سريع",
            "correct": false,
            "why": "Vague — it hides the ask and signals low priority.",
            "why_ar": "مبهم — يخفي الطلب ويعطي إحساس إنه مو مهم."
          },
          {
            "en": "Approval needed: vendor quote — by Thu",
            "ar": "يبي موافقة: عرض المورّد — قبل الخميس",
            "correct": true,
            "why": "It names the exact action and the deadline, so it gets prioritised.",
            "why_ar": "يذكر الإجراء بالضبط والموعد، فيتقدّم بالأولوية."
          },
          {
            "en": "Following up on our chat",
            "ar": "متابعة لكلامنا",
            "correct": false,
            "why": "No action and no deadline — nothing tells the reader to act.",
            "why_ar": "لا إجراء ولا موعد — ما فيه شي يحرّك القارئ."
          }
        ]
      },
      "takeaway": "Your reader should know what to do before they finish line one.",
      "takeaway_ar": "القارئ لازم يعرف وش يسوي قبل ما يخلّص أول سطر."
    },
    {
      "id": "email-the-ask",
      "order": 2,
      "ar": "الطلب اللي يجيب \"تمام\"",
      "en": "The request that gets a yes",
      "minutes": 8,
      "outcome": "Make a request that is easy to say yes to: one clear ask, just enough context, a deadline, and an easy path.",
      "outcome_ar": "تسوّين طلب سهل يقولون له \"تمام\": طلب واحد واضح، سياق بقدر الحاجة، موعد، وطريق سهل.",
      "idea": {
        "body": "A request gets a fast yes when you've done the reader's thinking for them. Four parts do that: one clear ask (not three buried ones), one line of context so they know why, a deadline so it doesn't drift, and an easy path — the smallest possible thing they have to do. Remove the friction and the yes comes quickly.",
        "model": "The rule: the easier you make the yes, the faster it comes.",
        "body_ar": "الطلب يجيب \"تمام\" بسرعة لمّا تكونين سوّيتِ تفكير القارئ بداله. أربع أجزاء تسوّي كذا: طلب واحد واضح (مو ثلاثة مدفونين)، سطر سياق يعرف ليش، موعد عشان ما يتنسّى، وطريق سهل — أصغر شي لازم يسوّيه. شيلي التعب عنه ويجيك القبول بسرعة.",
        "model_ar": "القاعدة: كل ما سهّلتِ القبول، جاك أسرع."
      },
      "phrases": [
        {
          "en": "Could you review the attached doc and reply yes/no by Wednesday?",
          "ar": "تقدرين تطّلعين على المرفق وترجعين لي نعم/لا قبل الأربعاء؟",
          "when": "A clear ask with an easy answer and a deadline",
          "when_ar": "طلب واضح بجواب سهل وموعد"
        },
        {
          "en": "Here's the context in one line, then the ask.",
          "ar": "هذا السياق بسطر، بعدها الطلب.",
          "when": "Structuring the request",
          "when_ar": "ترتّبين الطلب"
        },
        {
          "en": "To make this easy, I've drafted the reply — you just approve it.",
          "ar": "عشان أسهّلها، جهّزت الرد — أنت بس توافق.",
          "when": "Removing their work",
          "when_ar": "تشيلين الشغل عنه"
        },
        {
          "en": "If it's simpler, a quick 'looks good' works.",
          "ar": "لو أسهل، تكفي كلمة \"تمام\".",
          "when": "Lowering the bar to reply",
          "when_ar": "تخفّفين حاجز الرد"
        },
        {
          "en": "Would Thursday work, or is early next week better?",
          "ar": "الخميس يزبط، ولا بداية الأسبوع الجاي أحسن؟",
          "when": "Offering options instead of an open question",
          "when_ar": "تعطين خيارات بدل سؤال مفتوح"
        },
        {
          "en": "All you'd need to do is click approve — I've handled the rest.",
          "ar": "كل اللي عليك تضغط موافقة — الباقي أنا مسوّيته.",
          "when": "Spelling out the easy path",
          "when_ar": "توضّحين الطريق السهل"
        }
      ],
      "example": {
        "setting": "You're finishing an integration and the only thing blocking you is one detail from a busy colleague.",
        "setting_ar": "تخلّصين ربط تقني، وآخر شي معطّلك تفصيل واحد عند زميلة مشغولة.",
        "lines": [
          {
            "who": "You",
            "en": "Reem, quick one — I'm finishing the integration and just need the production endpoint. Could you paste it here by end of day? That's literally the only thing blocking me.",
            "ar": "ريم، شي سريع — أخلّص الربط ومحتاجة بس رابط الإنتاج. تقدرين تلصقينه هنا قبل نهاية اليوم؟ هذا حرفياً الوحيد اللي معطّلني."
          },
          {
            "who": "Reem",
            "en": "Sure — here it is.",
            "ar": "أكيد — هذا هو."
          },
          {
            "who": "You",
            "en": "Perfect, thank you — that's everything I needed.",
            "ar": "تمام، مشكورة — هذا كل اللي احتجته."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Build a request that's easy to say yes to:",
        "prompt_ar": "ركّبي طلب سهل يقولون له \"تمام\":",
        "steps": [
          {
            "en": "Hi Omar — quick request.",
            "ar": "هلا عمر — طلب سريع."
          },
          {
            "en": "We're finalising the report and need the March figures.",
            "ar": "نخلّص التقرير ومحتاجين أرقام مارس."
          },
          {
            "en": "Could you send them over by Tuesday?",
            "ar": "تقدر ترسلها قبل الثلاثاء؟"
          },
          {
            "en": "Even a rough number works — I can refine it.",
            "ar": "حتى رقم تقريبي يكفي — أنا أظبطه."
          }
        ]
      },
      "takeaway": "The easier you make the yes, the faster it comes.",
      "takeaway_ar": "كل ما سهّلتِ القبول، جاك أسرع."
    },
    {
      "id": "email-follow-up",
      "order": 3,
      "ar": "المتابعة بدون إزعاج",
      "en": "The follow-up nudge",
      "minutes": 6,
      "outcome": "Chase a reply politely — resurface the ask, give them an easy out, no guilt-tripping.",
      "outcome_ar": "تتابعين الرد بأدب — ترجّعين الطلب للواجهة، تعطينه مخرج سهل، بدون تحسيس بالذنب.",
      "idea": {
        "body": "Silence usually means busy, not rude — so a good nudge reminds them of the ask, never of their silence. Restate what you need in one line, attach a deadline, and give them an easy out: a one-word reply, or a way to hand it to someone else. Guilt-tripping ('you still haven't replied') gets you a slower yes and a colder relationship.",
        "model": "The rule: a good nudge reminds them of the ask, not of their silence.",
        "body_ar": "الصمت غالباً معناه مشغول، مو قليل أدب — فالمتابعة الزينة تذكّره بالطلب، مو بسكوته. أعيدي اللي تبينه بسطر، حطي موعد، وأعطيه مخرج سهل: رد بكلمة، أو طريقة يحوّلها لشخص ثاني. التحسيس بالذنب (\"لين الحين ما رديت\") يجيبك قبول أبطأ وعلاقة أبرد.",
        "model_ar": "القاعدة: المتابعة الزينة تذكّره بالطلب، مو بسكوته."
      },
      "phrases": [
        {
          "en": "Just floating this back to the top of your inbox.",
          "ar": "أرجّع هذي لفوق في بريدك بس.",
          "when": "A gentle resurface",
          "when_ar": "ترجيع لطيف للواجهة"
        },
        {
          "en": "No rush if you're swamped — I just want to make sure it didn't slip.",
          "ar": "ولا يهمك لو مزحوم — بس أتأكد إنها ما فاتت.",
          "when": "Taking the pressure off",
          "when_ar": "تخفّفين الضغط"
        },
        {
          "en": "Quick nudge on the approval below — still good to go ahead?",
          "ar": "تذكير سريع بالموافقة تحت — نمشي فيها؟",
          "when": "Restating the ask",
          "when_ar": "تعيدين الطلب"
        },
        {
          "en": "Should I take the silence as a yes, or would you rather I wait?",
          "ar": "آخذ السكوت موافقة، ولا تفضّل أنتظر؟",
          "when": "Offering an easy out",
          "when_ar": "تعطينه مخرج سهل"
        },
        {
          "en": "If someone else is better placed for this, happy to redirect.",
          "ar": "لو فيه أحد أنسب لها، أحوّلها بكل سرور.",
          "when": "Giving them a way out",
          "when_ar": "تفتحين له باب"
        },
        {
          "en": "Following up on my note from Monday — any thoughts?",
          "ar": "متابعة لرسالتي يوم الاثنين — عندك رأي؟",
          "when": "Referencing the original",
          "when_ar": "تشيرين للأصل"
        }
      ],
      "example": {
        "setting": "Two days ago you asked for sign-off and heard nothing. The deadline is tomorrow.",
        "setting_ar": "قبل يومين طلبتِ موافقة وما جاك رد. والموعد بكرة.",
        "lines": [
          {
            "who": "You",
            "en": "Hi Khalid — floating this back up. I still need your sign-off on the vendor to keep the discount, and it closes tomorrow. A one-word 'yes' is all I need.",
            "ar": "هلا خالد — أرجّع هذي لفوق. لسه أحتاج موافقتك على المورّد عشان نحافظ على الخصم، وينتهي بكرة. كلمة \"تمام\" تكفيني."
          },
          {
            "who": "Khalid",
            "en": "Sorry, missed it. Yes — go ahead.",
            "ar": "آسف، فاتتني. تمام — امشي فيها."
          },
          {
            "who": "You",
            "en": "No worries at all — thanks, Khalid.",
            "ar": "ولا يهمك أبداً — مشكور يا خالد."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Two days, no reply, deadline tomorrow. What's the best nudge?",
        "prompt_ar": "يومين بدون رد، والموعد بكرة. أنسب تذكير؟",
        "options": [
          {
            "en": "You still haven't replied to my email.",
            "ar": "لين الحين ما رديت على إيميلي.",
            "correct": false,
            "why": "It points at their silence and reads as blame.",
            "why_ar": "يأشّر على سكوته ويطلع لوم."
          },
          {
            "en": "Just floating this back up — still need your yes by tomorrow to keep the discount. No rush beyond that.",
            "ar": "أرجّع هذي لفوق — لسه أحتاج موافقتك بكرة عشان الخصم. وما فيه استعجال أكثر من كذا.",
            "correct": true,
            "why": "It restates the ask and the deadline without any guilt.",
            "why_ar": "يعيد الطلب والموعد بدون أي تحسيس بالذنب."
          },
          {
            "en": "I guess this isn't a priority for you.",
            "ar": "واضح إنها مو أولوية عندك.",
            "correct": false,
            "why": "Passive-aggressive — it damages the relationship and rarely speeds things up.",
            "why_ar": "عدائي مبطّن — يضر العلاقة ونادر يسرّع الأمور."
          }
        ]
      },
      "takeaway": "A good nudge reminds them of the ask, not of their silence.",
      "takeaway_ar": "المتابعة الزينة تذكّره بالطلب، مو بسكوته."
    },
    {
      "id": "email-apologize",
      "order": 4,
      "ar": "اعتذري وصلّحي — بلا تذلّل",
      "en": "Apologize & fix in writing",
      "minutes": 7,
      "outcome": "Own a mistake in writing cleanly: one honest line of ownership, then the fix and the next step — no spiral.",
      "outcome_ar": "تتحمّلين الخطأ كتابةً بنظافة: سطر واحد صادق تتحمّلين فيه، بعدها الحل والخطوة الجاية — بدون دوّامة.",
      "idea": {
        "body": "A written apology that grovels makes people trust you less, not more — it drags the mistake out and makes you look shaky. Own it once and plainly ('that's on me'), state the concrete fix, and add the step you're taking so it can't repeat. Then stop. Confidence in a mistake is what tells people you can be handed the next big thing.",
        "model": "The rule: own it once, fix it clearly, and don't keep apologising.",
        "body_ar": "الاعتذار المكتوب اللي فيه تذلّل يخلّي الناس يثقون فيك أقل، مو أكثر — يطوّل الخطأ ويبيّنك مهزوزة. تحمّليه مرة وبوضوح (\"هذا خطئي\")، قولي الحل بالضبط، وزيدي الخطوة اللي تسوّينها عشان ما يتكرر. وبعدها وقّفي. الثقة وقت الخطأ هي اللي تقول للناس إنه يُسلَّم لك الشي الكبير الجاي.",
        "model_ar": "القاعدة: تحمّليه مرة، صلّحيه بوضوح، ولا تعتذرين على طول."
      },
      "phrases": [
        {
          "en": "You're right, and that's on me.",
          "ar": "معك حق، وهذا خطئي.",
          "when": "Clean ownership, no excuses",
          "when_ar": "تحمّل نظيف بدون أعذار"
        },
        {
          "en": "Here's what happened, and here's what I'm doing about it.",
          "ar": "هذا اللي صار، وهذا اللي أسوّيه عشانه.",
          "when": "Owning and moving to the fix",
          "when_ar": "تتحمّلين وتنتقلين للحل"
        },
        {
          "en": "To fix it: I've redeployed, and I'll confirm once it's stable.",
          "ar": "للحل: أعدت النشر، وبأأكّد لك أول ما يستقر.",
          "when": "Naming the concrete action",
          "when_ar": "تحدّدين الإجراء الملموس"
        },
        {
          "en": "To make sure it doesn't happen again, I've added a check.",
          "ar": "عشان ما يتكرر، ضفت فحص.",
          "when": "Showing prevention",
          "when_ar": "تبيّنين إجراء وقائي"
        },
        {
          "en": "I should have flagged this earlier — I'll keep you posted from here.",
          "ar": "كان لازم أنبّه بدري — بأحدّثك أول بأول من الحين.",
          "when": "Brief and forward-looking",
          "when_ar": "مختصر ومتّجه للقدام"
        },
        {
          "en": "Apologies for the mix-up. The corrected file is attached.",
          "ar": "أعتذر عن اللخبطة. الملف المصحّح مرفق.",
          "when": "Short, then move on",
          "when_ar": "مختصر وبعدها تكمّلين"
        }
      ],
      "example": {
        "setting": "You attached last month's numbers to a client instead of this month's.",
        "setting_ar": "رفعتِ أرقام الشهر اللي طاف للعميل بدل هذا الشهر.",
        "lines": [
          {
            "who": "You",
            "en": "Hi — that's my mistake; I attached the wrong month. The correct report is attached, and I've double-checked the figures. Sorry for the confusion.",
            "ar": "هلا — هذا خطئي؛ رفعت الشهر الغلط. التقرير الصحيح مرفق، وراجعت الأرقام مرتين. آسفة على اللخبطة."
          },
          {
            "who": "Client",
            "en": "No problem, thanks for the quick fix.",
            "ar": "ما فيه مشكلة، مشكورة على السرعة."
          },
          {
            "who": "You",
            "en": "Appreciate your patience.",
            "ar": "أقدّر تفهّمك."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Own a mistake and move to the fix:",
        "prompt_ar": "تحمّلي الخطأ وانتقلي للحل:",
        "steps": [
          {
            "en": "You're right — I sent the wrong version.",
            "ar": "معك حق — أرسلت النسخة الغلط."
          },
          {
            "en": "The correct one is attached now.",
            "ar": "الصحيحة مرفقة الحين."
          },
          {
            "en": "I've added a checklist so it won't repeat.",
            "ar": "ضفت قائمة تحقّق عشان ما يتكرر."
          },
          {
            "en": "Sorry for the extra step.",
            "ar": "آسفة على الخطوة الزيادة."
          }
        ]
      },
      "takeaway": "Own it once, fix it clearly, and don't keep apologising.",
      "takeaway_ar": "تحمّليه مرة، صلّحيه بوضوح، ولا تعتذرين على طول."
    },
    {
      "id": "email-status-update",
      "order": 5,
      "ar": "تحديث الحالة — واضح وسريع",
      "en": "The crisp status update",
      "minutes": 6,
      "outcome": "Send an update someone can skim in ten seconds: what's done, what's blocked, what's next.",
      "outcome_ar": "ترسلين تحديث ينقرأ بعشر ثواني: وش خلص، وش معلّق، وش الجاي.",
      "idea": {
        "body": "A status update isn't a diary of your effort — it's a fast answer to one question: where are we? Lead with the headline (on track / at risk), then three skimmable labels — Done, Blocked, Next. Name your blocker plainly so someone can clear it, and say 'no blockers' out loud when it's true. Effort belongs in the detail; the outcome belongs up top.",
        "model": "The rule: answer 'where are we?' before they have to ask.",
        "body_ar": "تحديث الحالة مو يومية عن تعبك — هو جواب سريع لسؤال واحد: وين وصلنا؟ ابدئي بالعنوان (ماشي على الخطة / فيه خطر)، بعدها ثلاث تسميات سريعة القراءة — خلص، معلّق، الجاي. سمّي المعطّل بصراحة عشان أحد يفكّه، وقولي \"ما فيه معطّلات\" بصوت لو صحيح. التعب مكانه في التفصيل؛ النتيجة مكانها فوق.",
        "model_ar": "القاعدة: جاوبي \"وين وصلنا؟\" قبل ما يسألون."
      },
      "phrases": [
        {
          "en": "Done: X. In progress: Y. Blocked: Z.",
          "ar": "خلص: X. قيد العمل: Y. معلّق: Z.",
          "when": "The skimmable skeleton",
          "when_ar": "الهيكل السريع"
        },
        {
          "en": "On track for Friday.",
          "ar": "ماشي على الخطة للجمعة.",
          "when": "The headline first",
          "when_ar": "العنوان أول"
        },
        {
          "en": "One blocker: I need access to the staging server.",
          "ar": "معطّل واحد: أحتاج صلاحية على سيرفر الاختبار.",
          "when": "Naming exactly what you need",
          "when_ar": "تحدّدين وش تحتاجين بالضبط"
        },
        {
          "en": "No blockers on my side.",
          "ar": "ما فيه معطّلات من طرفي.",
          "when": "Saying it explicitly when true",
          "when_ar": "تقولينها صراحة لو صحيح"
        },
        {
          "en": "Next: I'll start testing once the data lands.",
          "ar": "الجاي: أبدأ الاختبار أول ما توصل البيانات.",
          "when": "The forward step",
          "when_ar": "الخطوة الجاية"
        },
        {
          "en": "Short version up top, detail below if you need it.",
          "ar": "المختصر فوق، والتفصيل تحت لو تبينه.",
          "when": "Layering it",
          "when_ar": "ترتّبينها بطبقات"
        }
      ],
      "terms": [
        {
          "term": "blocker",
          "ar": "معطّل",
          "def_en": "the one thing stopping you from moving forward until someone else acts",
          "example": "My only blocker is prod access — everything else is ready."
        },
        {
          "term": "on track",
          "ar": "ماشي على الخطة",
          "def_en": "still expected to finish by the agreed date",
          "example": "We're on track for Friday with no surprises."
        }
      ],
      "example": {
        "setting": "Your team lead asked for a Monday status on the migration.",
        "setting_ar": "قائد فريقك طلب تحديث حالة يوم الاثنين عن الترحيل.",
        "lines": [
          {
            "who": "You",
            "en": "Migration — on track for Friday. Done: schema moved, data validated. In progress: cutover script. Blocked: I need prod access from IT to test it. Next: dry run once access lands.",
            "ar": "الترحيل — ماشي على الخطة للجمعة. خلص: نقل المخطط، تحقّقنا من البيانات. قيد العمل: سكربت التحويل. معلّق: أحتاج صلاحية إنتاج من التقنية عشان أختبره. الجاي: تجربة أول ما تجي الصلاحية."
          },
          {
            "who": "Lead",
            "en": "Clear. I'll chase IT for the access today.",
            "ar": "واضح. بألحّ على التقنية للصلاحية اليوم."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Write a 3-line update for something you're working on right now: one line Done, one line Blocked (or 'no blockers'), one line Next. Keep it skimmable.",
        "prompt_ar": "اكتبي تحديث بثلاث سطور لشي تشتغلين عليه الحين: سطر \"خلص\"، سطر \"معلّق\" (أو \"ما فيه معطّلات\")، سطر \"الجاي\". خلّيه سريع القراءة.",
        "hint": "Three labels: Done / Blocked / Next. One line each.",
        "hint_ar": "ثلاث تسميات: خلص / معلّق / الجاي. سطر لكل وحدة."
      },
      "takeaway": "A good update answers 'where are we?' before they have to ask.",
      "takeaway_ar": "التحديث الزين يجاوب \"وين وصلنا؟\" قبل ما يسألون."
    }
  ]
},
{
  "id": "career",
  "order": 11,
  "icon": "TrendingUp",
  "ar": "المسار المهني",
  "en": "Career & Growth",
  "tagline": "Talk about yourself and your work in the moments that decide your career.",
  "tagline_ar": "تتكلّمين عن نفسك وعن شغلك في اللحظات اللي تقرّر مسارك.",
  "lessons": [
    {
      "id": "career-tell-me-about-yourself",
      "order": 1,
      "ar": "عرّفيني عن نفسك",
      "en": "Tell me about yourself",
      "minutes": 7,
      "outcome": "Give a 60-second intro that lands: who you are now, what you're strong at with proof, and why you're in this room.",
      "outcome_ar": "تعطين تعريف بدقيقة يوصل: مين أنتِ الحين، وش تجيدين مع دليل، وليش أنتِ في هالمكان.",
      "idea": {
        "body": "'Tell me about yourself' is not an invitation for your life story — it's a 60-second audition. Use three beats: present (what you do now), proof (one win with a number), and purpose (why this role, right now). Skip childhood, skip the full CV. A tight answer signals that you can filter what matters — which is half of what they're testing.",
        "model": "The rule: present, proof, purpose — then stop talking.",
        "body_ar": "\"عرّفيني عن نفسك\" مو دعوة لقصة حياتك — هي اختبار بدقيقة. استخدمي ثلاث نبضات: الحاضر (وش تسوّين الحين)، الدليل (إنجاز واحد برقم)، والهدف (ليش هالدور، الحين). اتركي الطفولة، واتركي السيرة كاملة. الجواب المركّز يقول إنك تعرفين تفلترين المهم — وهذا نص اللي يختبرونه.",
        "model_ar": "القاعدة: الحاضر، الدليل، الهدف — وبعدها وقّفي."
      },
      "phrases": [
        {
          "en": "I'll keep this to a minute.",
          "ar": "بأخلّيها بدقيقة.",
          "when": "Signalling you respect their time",
          "when_ar": "تبيّنين إنك تحترمين وقتهم"
        },
        {
          "en": "I'm an infrastructure engineer — I keep critical systems up and recover them fast.",
          "ar": "أنا مهندسة بنية تحتية — أخلّي الأنظمة الحسّاسة شغّالة وأرجّعها بسرعة.",
          "when": "A one-line identity",
          "when_ar": "هوية بسطر"
        },
        {
          "en": "For the last few years I've focused on cloud reliability.",
          "ar": "آخر كم سنة تركيزي على موثوقية السحابة.",
          "when": "Present, not your whole past",
          "when_ar": "الحاضر، مو كل ماضيك"
        },
        {
          "en": "The work I'm proudest of is cutting our downtime by half last year.",
          "ar": "أكثر شي فخورة فيه إني خفّضت التعطّل للنص السنة اللي طافت.",
          "when": "One proof point with a number",
          "when_ar": "دليل واحد برقم"
        },
        {
          "en": "What draws me to this role is the scale you operate at.",
          "ar": "اللي يشدّني لهالدور هو حجم الشغل اللي تشتغلون عليه.",
          "when": "Why this room, right now",
          "when_ar": "ليش هالمكان، الحين"
        },
        {
          "en": "In short: reliability is my thing, and I want to do it where it really matters.",
          "ar": "باختصار: الموثوقية تخصّصي، وأبي أسوّيها بمكان لها قيمة فعلية.",
          "when": "The wrap-up line",
          "when_ar": "جملة الختام"
        }
      ],
      "example": {
        "setting": "The interviewer opens with the classic first question.",
        "setting_ar": "المُقابِل يبدأ بالسؤال الكلاسيكي الأول.",
        "lines": [
          {
            "who": "Interviewer",
            "en": "So — tell me about yourself.",
            "ar": "طيب — عرّفيني عن نفسك."
          },
          {
            "who": "You",
            "en": "Sure, I'll keep it short. I'm an infrastructure engineer with about four years in cloud reliability. Most of my work is keeping critical systems up and getting them back fast when something breaks — last year I helped cut our unplanned downtime by half. What draws me here is that you run at a scale where reliability really counts, and that's exactly the problem I want to work on.",
            "ar": "أكيد، بأخلّيها مختصرة. أنا مهندسة بنية تحتية بحدود أربع سنوات في موثوقية السحابة. أغلب شغلي أخلّي الأنظمة الحسّاسة شغّالة وأرجّعها بسرعة لو شي خرب — السنة اللي طافت ساعدت نخفّض التعطّل غير المخطّط للنص. اللي يشدّني هنا إنكم تشتغلون بحجم الموثوقية فيه لها قيمة كبيرة، وهذي بالضبط المشكلة اللي أبي أشتغل عليها."
          },
          {
            "who": "Interviewer",
            "en": "Great — let's dig into that downtime project.",
            "ar": "ممتاز — خلّينا ندخل في مشروع التعطّل ذاك."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Build a tight 60-second intro:",
        "prompt_ar": "ركّبي تعريف مركّز بدقيقة:",
        "steps": [
          {
            "en": "I'm an infrastructure engineer with four years in cloud reliability.",
            "ar": "أنا مهندسة بنية تحتية بأربع سنوات في موثوقية السحابة."
          },
          {
            "en": "My focus is keeping critical systems up and recovering them fast.",
            "ar": "تركيزي أخلّي الأنظمة الحسّاسة شغّالة وأرجّعها بسرعة."
          },
          {
            "en": "Last year I helped cut our downtime by half.",
            "ar": "السنة اللي طافت ساعدت نخفّض التعطّل للنص."
          },
          {
            "en": "I'm here because you operate at a scale where that skill really matters.",
            "ar": "أنا هنا لأنكم تشتغلون بحجم هالمهارة فيه لها قيمة فعلية."
          }
        ]
      },
      "takeaway": "Present, proof, purpose — then stop talking.",
      "takeaway_ar": "الحاضر، الدليل، الهدف — وبعدها وقّفي."
    },
    {
      "id": "career-star-answers",
      "order": 2,
      "ar": "إجابات STAR في المقابلة",
      "en": "STAR answers in interviews",
      "minutes": 8,
      "outcome": "Answer a behavioural question with a clear story: the Situation, your Task, what YOU did, and the measurable Result.",
      "outcome_ar": "تجاوبين على سؤال سلوكي بقصة واضحة: الموقف، مهمتك، وش سوّيتِ أنتِ، والنتيجة المقاسة.",
      "idea": {
        "body": "Behavioural questions ('tell me about a time you…') are looking for evidence, not opinions. STAR keeps your answer tight: Situation (set the scene in a sentence), Task (what YOU had to do), Action (the steps YOU took — say 'I', not 'we'), Result (what happened, with a number). Most people ramble the situation and skip the result. Do the opposite.",
        "model": "The rule: say 'I', not 'we' — they're hiring you, not your team.",
        "body_ar": "الأسئلة السلوكية (\"احكي لي عن موقف…\") تدوّر أدلّة، مو آراء. STAR تخلّي جوابك مركّز: الموقف (جهّزي المشهد بجملة)، المهمة (وش لازم تسوّين أنتِ)، الفعل (الخطوات اللي سوّيتيها — قولي \"أنا\"، مو \"احنا\")، النتيجة (وش صار، برقم). أغلب الناس يطوّلون بالموقف ويطنّشون النتيجة. سوّي العكس.",
        "model_ar": "القاعدة: قولي \"أنا\"، مو \"احنا\" — يوظّفونك أنتِ، مو فريقك."
      },
      "phrases": [
        {
          "en": "Let me give you a specific example.",
          "ar": "خلّيني أعطيك مثال محدّد.",
          "when": "Signalling a real story",
          "when_ar": "تبيّنين إنه مثال حقيقي"
        },
        {
          "en": "The situation was: our main database went down at peak hours.",
          "ar": "الموقف كان: قاعدة البيانات الرئيسية طاحت في وقت الذروة.",
          "when": "Setting the scene fast",
          "when_ar": "تجهّزين المشهد بسرعة"
        },
        {
          "en": "My job was to get it back without losing data.",
          "ar": "مهمتي أرجّعها بدون ما نخسر بيانات.",
          "when": "Naming your task",
          "when_ar": "تحدّدين مهمتك"
        },
        {
          "en": "So I isolated the failure, switched to the replica, and kept the team updated.",
          "ar": "فعزلت العطل، حوّلت للنسخة، وخلّيت الفريق على اطّلاع.",
          "when": "What YOU did — the actions",
          "when_ar": "وش سوّيتِ أنتِ — الأفعال"
        },
        {
          "en": "The result: we were back in twenty minutes, with no data lost.",
          "ar": "النتيجة: رجعنا خلال عشرين دقيقة، بدون فقد بيانات.",
          "when": "The measurable result",
          "when_ar": "النتيجة المقاسة"
        },
        {
          "en": "What I took from it was a cleaner failover checklist we still use.",
          "ar": "اللي طلعت فيه قائمة تحويل أنظف لسّا نستخدمها.",
          "when": "A short reflection to close",
          "when_ar": "تأمّل قصير للختام"
        }
      ],
      "terms": [
        {
          "term": "STAR",
          "ar": "ستار",
          "def_en": "Situation, Task, Action, Result — a four-part structure for interview stories",
          "example": "She used STAR so her answer had a clear beginning, middle, and result."
        },
        {
          "term": "behavioural question",
          "ar": "سؤال سلوكي",
          "def_en": "an interview question that asks for a past example ('tell me about a time…')",
          "example": "'Tell me about a time you disagreed with your manager' is a behavioural question."
        }
      ],
      "example": {
        "setting": "The interviewer asks a classic behavioural question.",
        "setting_ar": "المُقابِل يسأل سؤال سلوكي كلاسيكي.",
        "lines": [
          {
            "who": "Interviewer",
            "en": "Tell me about a time you handled a crisis under pressure.",
            "ar": "احكي لي عن موقف تعاملتِ فيه مع أزمة تحت ضغط."
          },
          {
            "who": "You",
            "en": "Sure. Situation: our payment database failed during a Friday sale. Task: I had to restore it fast without losing transactions. Action: I isolated the fault, failed over to the replica, and kept the team posted every five minutes. Result: we were live again in twenty minutes with zero data loss — and I turned that into a failover checklist the team still uses.",
            "ar": "أكيد. الموقف: قاعدة بيانات الدفع خربت خلال تخفيضات الجمعة. المهمة: لازم أرجّعها بسرعة بدون ما نخسر عمليات. الفعل: عزلت العطل، حوّلت للنسخة، وخلّيت الفريق على اطّلاع كل خمس دقايق. النتيجة: رجعنا خلال عشرين دقيقة بدون فقد أي بيانات — وحوّلت ذا لقائمة تحويل لسّا الفريق يستخدمها."
          },
          {
            "who": "Interviewer",
            "en": "That's exactly the kind of answer I was hoping for.",
            "ar": "هذا بالضبط نوع الجواب اللي كنت أتمنّاه."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Put a STAR answer in order:",
        "prompt_ar": "رتّبي إجابة STAR:",
        "steps": [
          {
            "en": "During a Friday sale, our payment database went down.",
            "ar": "خلال تخفيضات الجمعة، قاعدة بيانات الدفع طاحت."
          },
          {
            "en": "I had to restore it without losing any transactions.",
            "ar": "لازم أرجّعها بدون ما نخسر أي عملية."
          },
          {
            "en": "I failed over to the replica and kept everyone updated.",
            "ar": "حوّلت للنسخة وخلّيت الكل على اطّلاع."
          },
          {
            "en": "We were back in twenty minutes with no data lost.",
            "ar": "رجعنا خلال عشرين دقيقة بدون فقد بيانات."
          }
        ]
      },
      "takeaway": "Say 'I', not 'we' — the interviewer is hiring you, not your team.",
      "takeaway_ar": "قولي \"أنا\"، مو \"احنا\" — المُقابِل يوظّفك أنتِ، مو فريقك."
    },
    {
      "id": "career-performance-review",
      "order": 3,
      "ar": "تقييم أدائك — بلا مبالغة",
      "en": "Your performance review",
      "minutes": 7,
      "outcome": "Speak for your own work in a review — name your wins with evidence, without bragging or shrinking.",
      "outcome_ar": "تتكلّمين عن شغلك في التقييم — تذكرين إنجازاتك بدليل، بدون مبالغة ولا تصغير.",
      "idea": {
        "body": "In a review, whoever describes your year gets to define it — so if you shrink ('it was fine, I just did my job'), you hand that pen to someone else. The trick between shrinking and bragging is evidence: don't say you were great, say what changed and by how much. Numbers do the boasting for you, and honest attribution ('mine vs the team's') makes them believe the rest.",
        "model": "The rule: evidence isn't bragging — let the numbers do the boasting.",
        "body_ar": "في التقييم، اللي يوصف سنتك هو اللي يعرّفها — فلو صغّرتِ (\"عادي، سويت شغلي بس\")، سلّمتِ القلم لغيرك. السر بين التصغير والمبالغة هو الدليل: لا تقولين إنك كنتِ ممتازة، قولي وش تغيّر وبكم. الأرقام تفتخر عنك، والنسبة الصادقة (\"لي مقابل الفريق\") تخلّيهم يصدّقون الباقي.",
        "model_ar": "القاعدة: الدليل مو مبالغة — خلّي الأرقام تفتخر عنك."
      },
      "phrases": [
        {
          "en": "Here's what I'm proud of this cycle, with the numbers.",
          "ar": "هذا اللي فخورة فيه هالدورة، مع الأرقام.",
          "when": "Leading with evidence, not adjectives",
          "when_ar": "تبدين بالدليل، مو بالصفات"
        },
        {
          "en": "I led the migration, and it came in a week early.",
          "ar": "أنا قدت الترحيل، وخلص قبل أسبوع.",
          "when": "Claiming a win plainly",
          "when_ar": "تنسبين الإنجاز بوضوح"
        },
        {
          "en": "The impact was: support tickets dropped by thirty percent.",
          "ar": "الأثر: تذاكر الدعم نزلت ثلاثين بالمية.",
          "when": "Outcome over effort",
          "when_ar": "النتيجة قبل التعب"
        },
        {
          "en": "I want to be clear about what was mine versus the team's.",
          "ar": "أبي أكون واضحة وش لي ووش للفريق.",
          "when": "Honest attribution",
          "when_ar": "نسبة صادقة"
        },
        {
          "en": "Where I want to grow next is on the architecture side.",
          "ar": "اللي أبي أطوّر فيه بعدين هو ناحية التصميم المعماري.",
          "when": "Pairing a win with a growth line",
          "when_ar": "تربطين الإنجاز بخط تطوّر"
        },
        {
          "en": "I'd put this year as a strong one, and here's why.",
          "ar": "أعتبر هالسنة قوية، وهذا السبب.",
          "when": "A confident frame",
          "when_ar": "إطار واثق"
        }
      ],
      "example": {
        "setting": "Your manager opens your review with an open question.",
        "setting_ar": "مديرك يفتح تقييمك بسؤال مفتوح.",
        "lines": [
          {
            "who": "Manager",
            "en": "So, how do you feel this year went for you?",
            "ar": "طيب، كيف تشوفين سنتك هالسنة؟"
          },
          {
            "who": "You",
            "en": "Strong year, honestly. The headline for me is the monitoring overhaul I led — we cut detection time from an hour to under ten minutes, and incidents that used to page people at night mostly don't anymore. Next, I'd like to take on more of the architecture decisions.",
            "ar": "سنة قوية، بصراحة. العنوان عندي هو تجديد المراقبة اللي قدته — خفّضنا وقت الاكتشاف من ساعة لأقل من عشر دقايق، والحوادث اللي كانت تنبّه الناس بالليل صارت أغلبها ما تصير. بعدها، أبي آخذ قرارات معمارية أكثر."
          },
          {
            "who": "Manager",
            "en": "That matches what I've seen. Let's talk about that architecture path.",
            "ar": "هذا يطابق اللي شفته. خلّينا نتكلّم عن مسار التصميم ذاك."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Your manager asks how the year went. What's the strongest answer?",
        "prompt_ar": "مديرك يسأل كيف كانت سنتك. أقوى جواب؟",
        "options": [
          {
            "en": "It was fine, I just did my job.",
            "ar": "عادية، سويت شغلي بس.",
            "correct": false,
            "why": "It shrinks and hands the story of your year to someone else.",
            "why_ar": "تصغّر وتسلّم قصة سنتك لغيرك."
          },
          {
            "en": "Strong year — I led the monitoring overhaul and cut detection time from an hour to ten minutes.",
            "ar": "سنة قوية — قدت تجديد المراقبة وخفّضت وقت الاكتشاف من ساعة لعشر دقايق.",
            "correct": true,
            "why": "It claims the win and backs it with a clear number.",
            "why_ar": "تنسب الإنجاز وتسنده برقم واضح."
          },
          {
            "en": "I'm honestly the reason the team hit its targets.",
            "ar": "بصراحة أنا سبب إن الفريق حقّق أهدافه.",
            "correct": false,
            "why": "It overclaims and dismisses the team — it costs you credibility.",
            "why_ar": "تبالغ وتلغي الفريق — تكلّفك مصداقيتك."
          }
        ]
      },
      "takeaway": "Evidence isn't bragging — the numbers do the boasting for you.",
      "takeaway_ar": "الدليل مو مبالغة — الأرقام تفتخر عنك."
    },
    {
      "id": "career-feedback",
      "order": 4,
      "ar": "اطلبي واعطي ملاحظات",
      "en": "Ask for & give feedback",
      "minutes": 7,
      "outcome": "Ask for feedback that's actually useful, and give feedback that's specific, kind, and something they can act on.",
      "outcome_ar": "تطلبين ملاحظات مفيدة فعلاً، وتعطين ملاحظات محدّدة، لطيفة، ويقدرون يتحرّكون عليها.",
      "idea": {
        "body": "'How did I do?' gets you 'good, thanks' — useless. Ask small and specific instead: 'what's one thing I could do better next time?' On the giving side, kind and vague ('great job!') teaches nothing, and harsh and vague ('that was a mess') stings without helping. The sweet spot is specific + kind + actionable: name one thing that worked, and one thing to try next time.",
        "model": "The rule: good feedback names one specific thing they can change tomorrow.",
        "body_ar": "\"كيف كان أدائي؟\" يجيبك \"زين، مشكور\" — ما تنفع. اطلبي صغير ومحدّد بدالها: \"وش شي واحد أقدر أحسّنه المرة الجاية؟\" ومن ناحية العطاء، اللطيف المبهم (\"شغل ممتاز!\") ما يعلّم شي، والقاسي المبهم (\"كان خربطة\") يوجع بدون ما يفيد. المكان الحلو هو محدّد + لطيف + قابل للتنفيذ: اذكري شي اشتغل، وشي يجرّبونه المرة الجاية.",
        "model_ar": "القاعدة: الملاحظة الزينة تحدّد شي واحد يقدرون يغيّرونه بكرة."
      },
      "phrases": [
        {
          "en": "What's one thing I could do better next time?",
          "ar": "وش شي واحد أقدر أحسّنه المرة الجاية؟",
          "when": "Asking for something small and specific",
          "when_ar": "تطلبين شي صغير ومحدّد"
        },
        {
          "en": "Be honest — I'd rather hear it now than at review time.",
          "ar": "كوني صريحة — أفضّل أسمعها الحين بدل وقت التقييم.",
          "when": "Opening the door for candour",
          "when_ar": "تفتحين الباب للصراحة"
        },
        {
          "en": "Can I give you some quick feedback on the demo?",
          "ar": "أقدر أعطيك ملاحظة سريعة على العرض؟",
          "when": "Asking permission first",
          "when_ar": "تستأذنين أول"
        },
        {
          "en": "One thing that worked really well: your intro was clear.",
          "ar": "شي اشتغل عدل: مقدّمتك كانت واضحة.",
          "when": "Leading with a specific positive",
          "when_ar": "تبدين بإيجابي محدّد"
        },
        {
          "en": "One thing to try next time: slow down on the technical part.",
          "ar": "شي جرّبيه المرة الجاية: خفّفي على الجزء التقني.",
          "when": "A forward, actionable suggestion",
          "when_ar": "اقتراح متّجه للقدام وقابل للتنفيذ"
        },
        {
          "en": "That's the what — happy to talk through the how.",
          "ar": "هذا الـ\"وش\" — وأنا حاضرة نتكلّم عن الـ\"كيف\".",
          "when": "Offering to help, not just judge",
          "when_ar": "تعرضين المساعدة، مو بس الحكم"
        }
      ],
      "example": {
        "setting": "Your colleague Yusuf just finished a client demo and asks how it went.",
        "setting_ar": "زميلك يوسف خلّص عرض للعميل ويسألك كيف كان.",
        "lines": [
          {
            "who": "Yusuf",
            "en": "How did the demo come across?",
            "ar": "كيف طلع العرض؟"
          },
          {
            "who": "You",
            "en": "Can I give you a couple of specifics? The opening was really strong — you framed the problem in one clear sentence. One thing to try next time: you moved fast through the pricing slide, and that's the part the client cares most about. Slow down there and it lands even better.",
            "ar": "أقدر أعطيك ملاحظتين محدّدتين؟ البداية كانت قوية جداً — أطّرت المشكلة بجملة وحدة واضحة. شي جرّبه المرة الجاية: مرّيت بسرعة على شريحة الأسعار، وهذا الجزء اللي العميل يهتم فيه أكثر شي. خفّف عليها ويوصل أحسن."
          },
          {
            "who": "Yusuf",
            "en": "That's useful — I'll rework that slide.",
            "ar": "هذي مفيدة — بأعيد شغل الشريحة ذيك."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "A colleague asks for feedback on their demo. What's most useful?",
        "prompt_ar": "زميل يطلب ملاحظات على عرضه. أكثر شي مفيد؟",
        "options": [
          {
            "en": "It was great, really good job!",
            "ar": "كان ممتاز، شغل حلو!",
            "correct": false,
            "why": "Kind but vague — there is nothing to act on.",
            "why_ar": "لطيف بس مبهم — ما فيه شي يتحرّك عليه."
          },
          {
            "en": "The opening was clear; next time slow down on the pricing slide — that's what the client cares about.",
            "ar": "البداية كانت واضحة؛ المرة الجاية خفّف على شريحة الأسعار — هذا اللي يهم العميل.",
            "correct": true,
            "why": "Specific, kind, and gives one clear thing to change.",
            "why_ar": "محدّد، لطيف، ويعطي شي واحد واضح يتغيّر."
          },
          {
            "en": "The pricing part was a mess.",
            "ar": "جزء الأسعار كان خربطة.",
            "correct": false,
            "why": "A real issue, but harsh and with no path to fix it.",
            "why_ar": "مشكلة حقيقية، بس قاسية وبدون طريق للحل."
          }
        ]
      },
      "takeaway": "Good feedback names one specific thing they can change tomorrow.",
      "takeaway_ar": "الملاحظة الزينة تحدّد شي واحد يقدرون يغيّرونه بكرة."
    },
    {
      "id": "career-raise",
      "order": 5,
      "ar": "اطلبي زيادة أو ترقية",
      "en": "Ask for a raise or promotion",
      "minutes": 8,
      "outcome": "Ask for a raise or promotion as a business case: the value you've added, the level you're already at, and a clear ask.",
      "outcome_ar": "تطلبين زيادة أو ترقية كحُجّة عمل: القيمة اللي قدّمتيها، المستوى اللي أنتِ فيه أصلاً، وطلب واضح.",
      "idea": {
        "body": "A raise conversation isn't a favour you're begging for — it's a case you're presenting. Managers say yes to evidence, not to need or to how long you've been there. Show the value you've added (with a number where you can), show you're already operating at the next level, then make a specific ask. If it's not a yes today, ask what it would take — and frame the whole thing as planning, not demanding.",
        "model": "The rule: you're not asking for a favour — you're presenting a case.",
        "body_ar": "محادثة الزيادة مو معروف تشحدينه — هي حُجّة تقدّمينها. المدراء يقولون \"تمام\" للدليل، مو للحاجة ولا لمدة بقائك. بيّني القيمة اللي قدّمتيها (برقم لو تقدرين)، بيّني إنك أصلاً تشتغلين بمستوى الدرجة الجاية، بعدها اطلبي بالتحديد. لو مو \"تمام\" اليوم، اسألي وش يوصّلني لها — واطّرحي الكل كتخطيط، مو مطالبة.",
        "model_ar": "القاعدة: أنتِ ما تشحدين معروف — أنتِ تقدّمين حُجّة."
      },
      "phrases": [
        {
          "en": "I'd like to talk about my compensation, and I've come prepared.",
          "ar": "أبي أتكلّم عن راتبي، وجيت مجهّزة.",
          "when": "Opening it professionally",
          "when_ar": "تفتحينها باحترافية"
        },
        {
          "en": "Over the past year I've taken on the on-call rotation and two migrations.",
          "ar": "خلال السنة تولّيت مناوبة الطوارئ وترحيلين.",
          "when": "The scope you've grown into",
          "when_ar": "النطاق اللي كبرتِ فيه"
        },
        {
          "en": "I'm already operating at the next level — here's the evidence.",
          "ar": "أنا أصلاً أشتغل بمستوى الدرجة الجاية — هذا الدليل.",
          "when": "Level, not tenure",
          "when_ar": "المستوى، مو المدة"
        },
        {
          "en": "Based on that, I'm asking to move to senior engineer.",
          "ar": "بناءً على كذا، أطلب أنتقل لمهندسة أولى.",
          "when": "A specific ask",
          "when_ar": "طلب محدّد"
        },
        {
          "en": "What would it take to get there this cycle?",
          "ar": "وش اللي يوصّلني لها هالدورة؟",
          "when": "If it's not a yes today",
          "when_ar": "لو مو \"تمام\" اليوم"
        },
        {
          "en": "I'm raising it now so we can plan for it together.",
          "ar": "أطرحها الحين عشان نخطّط لها مع بعض.",
          "when": "Framing it as planning",
          "when_ar": "تطرحينها كتخطيط"
        }
      ],
      "example": {
        "setting": "You've booked time with your manager to make the case for a promotion.",
        "setting_ar": "حجزتِ وقت مع مديرك عشان تقدّمين حُجّة الترقية.",
        "lines": [
          {
            "who": "You",
            "en": "Thanks for the time. I want to make the case for moving up to senior engineer. This year I've owned the on-call rotation, led two migrations, and I'm mentoring the two new hires — that's the senior scope already. I'd like us to make it official this cycle. What would that take?",
            "ar": "مشكور على الوقت. أبي أقدّم حُجّة الترقية لمهندسة أولى. هالسنة تولّيت مناوبة الطوارئ، قدت ترحيلين، وأدرّب الموظفَين الجدد — هذا نطاق \"أولى\" أصلاً. أبي نثبّتها رسمياً هالدورة. وش اللي يحتاج لها؟"
          },
          {
            "who": "Manager",
            "en": "You've built a fair case. Let me look at what's possible and come back to you this week.",
            "ar": "بنيتِ حُجّة عادلة. خلّيني أشوف الممكن وأرجع لك هالأسبوع."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Draft your own two-line business case: line one, the value you've added this year (with a number if you can); line two, the specific ask. Say it out loud until it sounds calm, not apologetic.",
        "prompt_ar": "اكتبي حُجّتك بسطرين: سطر أول، القيمة اللي قدّمتيها هالسنة (برقم لو تقدرين)؛ سطر ثاني، الطلب بالتحديد. قوليها بصوت لين تطلع هادئة، مو معتذرة.",
        "hint": "Line 1: the value + evidence. Line 2: the specific ask.",
        "hint_ar": "سطر ١: القيمة + دليل. سطر ٢: الطلب بالتحديد."
      },
      "takeaway": "You're not asking for a favour — you're presenting a case.",
      "takeaway_ar": "أنتِ ما تشحدين معروف — أنتِ تقدّمين حُجّة."
    }
  ]
},
{
  "id": "clarity",
  "order": 12,
  "icon": "AudioLines",
  "ar": "الوضوح والنطق",
  "en": "Clarity & Pronunciation",
  "tagline": "Be understood the first time — especially on a bad phone line.",
  "tagline_ar": "تنفهمين من أول مرة — خصوصاً على خط هاتف سيّئ.",
  "lessons": [
    {
      "id": "clarity-word-stress",
      "order": 1,
      "ar": "نبرة الكلمة",
      "en": "Word stress — the beat",
      "minutes": 7,
      "outcome": "Put the stress on the right syllable so a word lands clearly, even on a weak line.",
      "outcome_ar": "تحطّين النبرة على المقطع الصح، عشان الكلمة توصل واضحة حتى على خط ضعيف.",
      "idea": {
        "body": "Every English word has one strong beat — one syllable you push harder than the rest. Land it on the wrong syllable and the word can sound like a different word, especially over the phone. Native ears catch the beat before the letters, so the stress is what really makes you understood.",
        "model": "The rule: one strong beat per word — hit it, and the rest can stay soft.",
        "body_ar": "كل كلمة إنجليزية لها نبرة قوية وحدة — مقطع تضغطينه أكثر من الباقي. لو حطّيتيها على المقطع الغلط، الكلمة تصير تشبه كلمة ثانية، خصوصاً على الهاتف. الأذن الإنجليزية تمسك النبرة قبل الحروف، فالنبرة هي اللي تخليك مفهومة.",
        "model_ar": "القاعدة: نبرة قوية وحدة لكل كلمة — اضربيها، والباقي يمشي خفيف."
      },
      "phrases": [
        {
          "en": "It's a PHOtograph — but she's a phoTOGrapher.",
          "ar": "هذي صورة — بس هي مصوّرة.",
          "when": "The beat moves when the word grows",
          "when_ar": "النبرة تتحرّك لما تكبر الكلمة"
        },
        {
          "en": "Can you reCORD the call? I'll check the REcord later.",
          "ar": "تقدرين تسجّلين المكالمة؟ بأراجع السجل بعدين.",
          "when": "Verb reCORD vs noun REcord",
          "when_ar": "فعل reCORD مقابل اسم REcord"
        },
        {
          "en": "We saw an INcrease, so we need to inCREASE capacity.",
          "ar": "شفنا زيادة، فلازم نزيد السعة.",
          "when": "Noun INcrease vs verb inCREASE",
          "when_ar": "اسم INcrease مقابل فعل inCREASE"
        },
        {
          "en": "That part is imPORtant — put it at the top.",
          "ar": "هالجزء مهم — حطّيه بالأول.",
          "when": "Hit the middle beat of important",
          "when_ar": "اضربي النبرة الوسطى في important"
        },
        {
          "en": "The deVELoper will deVELop the fix today.",
          "ar": "المطوّر بيطوّر الحل اليوم.",
          "when": "Same beat across the word family",
          "when_ar": "نفس النبرة عبر عائلة الكلمة"
        }
      ],
      "terms": [
        {
          "term": "syllable",
          "ar": "مقطع",
          "def_en": "a single beat of a word (pho-to-graph = 3)",
          "example": "'Manager' has three syllables."
        },
        {
          "term": "stress",
          "ar": "النبرة",
          "def_en": "the syllable you push hardest",
          "example": "The stress in 'computer' is on 'PU'."
        },
        {
          "term": "stress shift",
          "ar": "انزياح النبرة",
          "def_en": "when the beat moves as a word changes form",
          "example": "PHOtograph, but phoTOGrapher."
        }
      ],
      "example": {
        "setting": "On a weak line, a colleague mishears a noun for a verb.",
        "setting_ar": "على خط ضعيف، زميل يسمع الاسم فعل.",
        "lines": [
          {
            "who": "Omar",
            "en": "Sorry — did you say record it, or the record?",
            "ar": "آسف — قلتِ سجّليه، ولا السجل؟"
          },
          {
            "who": "You",
            "en": "The REcord — the noun. Just open the REcord and read me the number.",
            "ar": "السجل — الاسم. بس افتحي السجل واقري لي الرقم."
          },
          {
            "who": "Omar",
            "en": "Got it — opening the record now.",
            "ar": "تمام — أفتح السجل الحين."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You want a colleague to make the number bigger. Which line is stressed so it clearly means the verb?",
        "prompt_ar": "تبين زميل يكبّر الرقم. أي جملة نبرتها تخليها واضحة إنها الفعل؟",
        "options": [
          {
            "en": "We need to INcrease the limit.",
            "ar": "لازم نزيد الحد.",
            "correct": false,
            "why": "First-syllable stress sounds like the noun, so it lands as 'an increase,' not the action.",
            "why_ar": "النبرة على المقطع الأول تنسمع مثل الاسم، فتوصل «زيادة» مو الفعل."
          },
          {
            "en": "We need to inCREASE the limit.",
            "ar": "لازم نزيد الحد.",
            "correct": true,
            "why": "Second-syllable stress marks the verb — the action is unmistakable.",
            "why_ar": "النبرة على المقطع الثاني تعلّم إنه فعل — الحركة ما تلتبس."
          },
          {
            "en": "We need to increase the LImit.",
            "ar": "لازم نزيد الحد.",
            "correct": false,
            "why": "Stressing the wrong word blurs the verb you actually mean.",
            "why_ar": "تشديد الكلمة الغلط يطمس الفعل اللي تقصدينه."
          }
        ]
      },
      "takeaway": "One word, one beat — put it in the right place and you sound clear.",
      "takeaway_ar": "كلمة وحدة، نبرة وحدة — حطّيها بمكانها الصح وتطلعين واضحة."
    },
    {
      "id": "clarity-thought-groups",
      "order": 2,
      "ar": "مجموعات المعنى ونبرة الجملة",
      "en": "Thought groups & sentence stress",
      "minutes": 7,
      "outcome": "Break a sentence into small chunks and stress the words that carry the meaning.",
      "outcome_ar": "تكسّرين الجملة لمقاطع صغيرة، وتشدّين على الكلمات اللي تحمل المعنى.",
      "idea": {
        "body": "Fluent speakers don't say a sentence as one long line — they group it into small chunks with a tiny pause between them. Inside each chunk they push the content words (nouns, verbs) and glide over the small ones (the, of, to). Chunking is what keeps fast English still sounding clear.",
        "model": "The rule: chunk the sentence, stress the content words, glide over the small ones.",
        "body_ar": "المتحدّث الطليق ما يقول الجملة سطر طويل واحد — يجمّعها مقاطع صغيرة ويوقف لحظة بينها. جوّه كل مقطع يضغط الكلمات المهمة (أسماء، أفعال) ويمرّ على الصغيرة (the, of, to). التقطيع هو اللي يخلي الإنجليزي السريع يظل واضح.",
        "model_ar": "القاعدة: قطّعي الجملة، شدّي على الكلمات المهمة، ومرّي على الصغيرة."
      },
      "phrases": [
        {
          "en": "After the DEploy, / we saw an ERror / in the PAYment service.",
          "ar": "بعد النشر، شفنا خطأ في خدمة الدفع.",
          "when": "Three clean chunks",
          "when_ar": "ثلاث مقاطع نظيفة"
        },
        {
          "en": "I'll CHECK the logs, / and I'll get BACK to you / in ten MInutes.",
          "ar": "بأتأكّد من السجلات، وبأرجع لك خلال عشر دقائق.",
          "when": "A pause between ideas",
          "when_ar": "وقفة بين الأفكار"
        },
        {
          "en": "The FIX is READy, / but I want to TEST it / on STAging first.",
          "ar": "الحل جاهز، بس أبغى أختبره على staging أول.",
          "when": "A contrast chunk after 'but'",
          "when_ar": "مقطع تباين بعد but"
        },
        {
          "en": "Give me a SEcond / to PULL it up.",
          "ar": "أعطيني ثانية أفتحها.",
          "when": "A short two-chunk line",
          "when_ar": "جملة قصيرة بمقطعين"
        },
        {
          "en": "We rolled it BACK, / so the SERvice / is STAble now.",
          "ar": "تراجعنا عنه، فالخدمة مستقرّة الحين.",
          "when": "A result chunk after 'so'",
          "when_ar": "مقطع نتيجة بعد so"
        }
      ],
      "terms": [
        {
          "term": "thought group",
          "ar": "مجموعة معنى",
          "def_en": "a small chunk of words said together",
          "example": "'After the deploy' is one thought group."
        },
        {
          "term": "content word",
          "ar": "كلمة المعنى",
          "def_en": "a noun, verb, or adjective that carries meaning",
          "example": "Stress content words, not 'the' or 'of'."
        }
      ],
      "example": {
        "setting": "A teammate says a long sentence in one breath and you lose it.",
        "setting_ar": "زميل يقول جملة طويلة بنفس واحد وتضيع عليك.",
        "lines": [
          {
            "who": "Nadia",
            "en": "sowhatineedistorestartthenodeandcheckthereplicabeforethedeploy",
            "ar": "يعني اللي أبغاه إنك تعيدين تشغيل العقدة وتتأكّدين من النسخة قبل النشر."
          },
          {
            "who": "You",
            "en": "Let me chunk that back: restart the NODE, / check the REplica, / then DEploy. Right?",
            "ar": "خلّيني أقطّعها: أعيد تشغيل العقدة، أتأكّد من النسخة، بعدها أنشر. صح؟"
          },
          {
            "who": "Nadia",
            "en": "Exactly — much clearer.",
            "ar": "بالضبط — أوضح بكثير."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Arrange these chunks into a clear, well-grouped status line:",
        "prompt_ar": "رتّبي هالمقاطع لجملة حالة واضحة ومقسّمة زين:",
        "steps": [
          {
            "en": "The payment service is down",
            "ar": "خدمة الدفع واقفة"
          },
          {
            "en": "for about 20% of users,",
            "ar": "لتقريباً ٢٠٪ من المستخدمين،"
          },
          {
            "en": "it started after the deploy,",
            "ar": "بدأت بعد النشر،"
          },
          {
            "en": "and I'm rolling it back now.",
            "ar": "وأنا أتراجع عنها الحين."
          }
        ]
      },
      "takeaway": "Small chunks, strong content words — that's what 'clear' sounds like.",
      "takeaway_ar": "مقاطع صغيرة، وكلمات معنى قوية — هذا صوت «الوضوح»."
    },
    {
      "id": "clarity-tricky-sounds",
      "order": 3,
      "ar": "أصوات صعبة",
      "en": "Tricky sounds",
      "minutes": 8,
      "outcome": "Say th, v/w, p/b, and the -ed endings clearly so key words are never misheard.",
      "outcome_ar": "تنطقين th و v/w و p/b ونهايات -ed بوضوح، عشان الكلمات المهمة ما تنسمع غلط.",
      "idea": {
        "body": "A few English sounds don't exist in Arabic, so they slip — and one slipped sound can turn a word into another. Put your tongue between your teeth for th, bite your lip for v (not w), close your lips fully for p (not b), and give -ed its right ending. These tiny moves protect the whole word.",
        "model": "The rule: th between the teeth, v on the lip, p with closed lips, and -ed gets /t/, /d/, or /ɪd/.",
        "body_ar": "فيه أصوات إنجليزية مو موجودة بالعربي، فتنزلق — وصوت واحد ينزلق يقلب الكلمة كلمة ثانية. حطّي لسانك بين أسنانك لـ th، عضّي شفتك لـ v (مو w)، اقفلي شفتيك كامل لـ p (مو b)، وأعطي -ed نهايتها الصح. هالحركات الصغيرة تحمي الكلمة كلها.",
        "model_ar": "القاعدة: th بين الأسنان، v على الشفة، p بشفاه مقفلة، و-ed تاخذ /t/ أو /d/ أو /ɪd/."
      },
      "phrases": [
        {
          "en": "THINK about the THIRD option — the THin one.",
          "ar": "فكّري في الخيار الثالث — النحيف.",
          "when": "th = tongue between the teeth",
          "when_ar": "th = اللسان بين الأسنان"
        },
        {
          "en": "The server needs a VALid VERsion — a V, not a W.",
          "ar": "الخادم يحتاج نسخة صالحة — V مو W.",
          "when": "v = bite the lower lip",
          "when_ar": "v = عضّة الشفة السفلى"
        },
        {
          "en": "Did the PUSH work, or did the BUG come back? — P, then B.",
          "ar": "اشتغل الدفع، ولا رجع الخلل؟ — P بعدين B.",
          "when": "p vs b — closed vs soft lips",
          "when_ar": "p مقابل b — شفاه مقفلة مقابل خفيفة"
        },
        {
          "en": "I finiSHED it (finish-t), I depLOYED it (deploy-d), I updaTED it (update-id).",
          "ar": "خلّصته، نشرته، حدّثته.",
          "when": "The three -ed endings",
          "when_ar": "نهايات -ed الثلاث"
        },
        {
          "en": "We WAITED (wait-id), then WORKED (work-t), then SOLVED (solve-d) it.",
          "ar": "انتظرنا، بعدها اشتغلنا، بعدها حللناها.",
          "when": "Hear the ending difference",
          "when_ar": "اسمعي فرق النهاية"
        }
      ],
      "terms": [
        {
          "term": "/θ/ (th)",
          "ar": "صوت الـ th",
          "def_en": "the soft th in 'think,' tongue between the teeth",
          "example": "'Think,' 'third,' 'path.'"
        },
        {
          "term": "/v/ vs /w/",
          "ar": "الفرق بين v و w",
          "def_en": "v bites the lip; w rounds the lips",
          "example": "'Vote' vs 'won't.'"
        },
        {
          "term": "-ed endings",
          "ar": "نهايات -ed",
          "def_en": "the past ending sounds /t/, /d/, or /ɪd/",
          "example": "'Worked' /t/, 'solved' /d/, 'waited' /ɪd/."
        }
      ],
      "example": {
        "setting": "On a call, v and w blur and a word gets misheard.",
        "setting_ar": "في مكالمة، v و w يتشابهون وكلمة تنسمع غلط.",
        "lines": [
          {
            "who": "Client",
            "en": "You said we won the vote — or we want to vote?",
            "ar": "قلتِ فزنا بالتصويت — ولا نبغى نصوّت؟"
          },
          {
            "who": "You",
            "en": "We VOTED — past tense, with a V. The decision is done.",
            "ar": "صوّتنا — ماضي، بـ V. القرار خلص."
          },
          {
            "who": "Client",
            "en": "Perfect — thanks for clearing that up.",
            "ar": "ممتاز — مشكورة على التوضيح."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You finished a task in the past. Which spoken form makes the -ed clear so it can't be heard as present tense?",
        "prompt_ar": "خلّصتِ مهمة في الماضي. أي نطق يخلي نهاية -ed واضحة عشان ما تنسمع مضارع؟",
        "options": [
          {
            "en": "I updat the ticket.",
            "ar": "حدّثت التذكرة.",
            "correct": false,
            "why": "Dropping the ending sounds like the present — 'I update.'",
            "why_ar": "إسقاط النهاية ينسمع مضارع — «I update»."
          },
          {
            "en": "I updated the ticket (update-id).",
            "ar": "حدّثت التذكرة.",
            "correct": true,
            "why": "After a 't' sound, -ed is a full /ɪd/ syllable, so the past is unmistakable.",
            "why_ar": "بعد صوت «t»، -ed مقطع كامل /ɪd/، فالماضي ما يلتبس."
          },
          {
            "en": "I update-t the ticket.",
            "ar": "حدّثت التذكرة.",
            "correct": false,
            "why": "A /t/ ending is wrong here and sounds forced — 'updated' needs /ɪd/.",
            "why_ar": "نهاية /t/ غلط هنا وتطلع متكلّفة — «updated» تبي /ɪd/."
          }
        ]
      },
      "takeaway": "Protect the small sounds and the whole word survives the phone line.",
      "takeaway_ar": "احمي الأصوات الصغيرة، والكلمة كلها تنجو من خط الهاتف."
    },
    {
      "id": "clarity-linking",
      "order": 4,
      "ar": "الوصل والكلام المتّصل",
      "en": "Linking & connected speech",
      "minutes": 7,
      "outcome": "Link words the way natives do, so you sound smooth instead of choppy.",
      "outcome_ar": "توصلين الكلمات مثل أهل اللغة، فتطلعين سلسة بدل متقطّعة.",
      "idea": {
        "body": "Natives don't sound fast because they rush — they sound fast because they link words together. A final consonant slides into the next word's vowel ('an_email' becomes 'a-nemail'), and repeated sounds merge. You don't have to speak quickly; you just have to stop putting a wall between every word.",
        "model": "The rule: glide the end of one word into the start of the next — don't wall them off.",
        "body_ar": "أهل اللغة ما يطلعون سريعين لأنهم يستعجلون — يطلعون سريعين لأنهم يوصلون الكلمات. الحرف الساكن الأخير ينزلق على المتحرّك اللي بعده («an_email» تصير «a-nemail»)، والأصوات المكرّرة تندمج. مو لازم تتكلّمين بسرعة؛ بس لا تحطّين جدار بين كل كلمتين.",
        "model_ar": "القاعدة: زحلقي نهاية الكلمة على بداية اللي بعدها — لا تسدّين بينهم."
      },
      "phrases": [
        {
          "en": "I'll send_you an_email in_an hour.",
          "ar": "برسل لك إيميل خلال ساعة.",
          "when": "Consonant sliding into a vowel",
          "when_ar": "ساكن ينزلق على متحرّك"
        },
        {
          "en": "Can you check_it and get_back_to me?",
          "ar": "تقدرين تتأكّدين منها وترجعين لي؟",
          "when": "An everyday linked request",
          "when_ar": "طلب يومي موصول"
        },
        {
          "en": "It's_up_and running again.",
          "ar": "رجعت تشتغل.",
          "when": "Short words glued smooth",
          "when_ar": "كلمات قصيرة ملزوقة بسلاسة"
        },
        {
          "en": "Let_me pull_it_up real quick.",
          "ar": "خلّيني أفتحها بسرعة.",
          "when": "The natural flow of a filler line",
          "when_ar": "الانسياب الطبيعي لجملة تعبئة"
        },
        {
          "en": "We ran_out_of time, so we'll pick_it_up tomorrow.",
          "ar": "خلص الوقت، فبنكمّلها بكرة.",
          "when": "Two links in one line",
          "when_ar": "وصلتين في جملة وحدة"
        },
        {
          "en": "This_is the last_one, I promise.",
          "ar": "هذا الأخير، أوعدك.",
          "when": "Merging repeated s-sounds",
          "when_ar": "دمج أصوات s المكرّرة"
        }
      ],
      "terms": [
        {
          "term": "linking",
          "ar": "الوصل",
          "def_en": "joining the end of one word to the start of the next",
          "example": "'Turn it off' → 'tur-ni-toff.'"
        },
        {
          "term": "connected speech",
          "ar": "الكلام المتّصل",
          "def_en": "the smooth, joined way natives really talk",
          "example": "Connected speech makes 'want to' sound like 'wanna.'"
        }
      ],
      "example": {
        "setting": "A colleague says your careful, wall-between-words English sounds tense; you loosen it.",
        "setting_ar": "زميل يقول إن إنجليزيك المقطّع كلمة كلمة يطلع متوتّر؛ تليّنينه.",
        "lines": [
          {
            "who": "You",
            "en": "I. will. check. it. and. call. you.",
            "ar": "بأتأكّد منها وأتّصل فيك."
          },
          {
            "who": "Sam",
            "en": "You can relax — say it as one flow: I'll check_it and call_you.",
            "ar": "ارتاحي — قوليها انسياب واحد: I'll check_it and call_you."
          },
          {
            "who": "You",
            "en": "I'll check_it and call_you.",
            "ar": "بأتأكّد منها وأتّصل فيك."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Which reply sounds natural and smooth to a native ear?",
        "prompt_ar": "أي رد يطلع طبيعي وسلس للأذن الإنجليزية؟",
        "options": [
          {
            "en": "Turn. it. off. and. on. again.",
            "ar": "طفّيها وشغّليها مرة ثانية.",
            "correct": false,
            "why": "A hard wall between every word sounds tense and robotic.",
            "why_ar": "جدار قوي بين كل كلمة يطلع متوتّر وآلي."
          },
          {
            "en": "Turn_it_off and on_again.",
            "ar": "طفّيها وشغّليها مرة ثانية.",
            "correct": true,
            "why": "Linking the words is exactly how a native says it — smooth, not fast.",
            "why_ar": "وصل الكلمات هو بالضبط كيف ينطقها أهل اللغة — سلس، مو سريع."
          },
          {
            "en": "Turnitoffandonagain.",
            "ar": "طفّيها وشغّليها مرة ثانية.",
            "correct": false,
            "why": "Everything merged with no chunks is a blur — linking still keeps the beats.",
            "why_ar": "كل شي مدموج بدون مقاطع يطلع ضبابي — الوصل يظل يحافظ على النبرات."
          }
        ]
      },
      "takeaway": "Smooth beats fast — link the words and you sound fluent, not rushed.",
      "takeaway_ar": "السلاسة أهم من السرعة — صلي الكلمات وتطلعين طليقة، مو مستعجلة."
    },
    {
      "id": "clarity-intonation",
      "order": 5,
      "ar": "التنغيم",
      "en": "Intonation",
      "minutes": 7,
      "outcome": "Use rising, falling, and warm intonation so your tone matches your meaning.",
      "outcome_ar": "تستخدمين التنغيم الصاعد والهابط والدافئ، عشان نبرتك تطابق معناك.",
      "idea": {
        "body": "The same words can sound like a question, an order, or a warm offer — the melody decides. Rise at the end for a real question, fall at the end for a confident statement, and add a gentle rise-then-fall to sound warm instead of flat. Flat intonation is why polite words can still sound cold on a call.",
        "model": "The rule: rise for a question, fall for a statement, and soften the melody to sound warm.",
        "body_ar": "نفس الكلمات ممكن تطلع سؤال، أو أمر، أو عرض دافئ — اللحن هو اللي يقرّر. اصعدي بالنهاية للسؤال الحقيقي، اهبطي بالنهاية للجملة الواثقة، وحطّي صعود-ثم-هبوط خفيف عشان تطلعين دافئة مو مسطّحة. التنغيم المسطّح هو السبب إن الكلمات المهذّبة تطلع باردة بالمكالمة.",
        "model_ar": "القاعدة: اصعدي للسؤال، اهبطي للجملة، وليّني اللحن عشان تطلعين دافئة."
      },
      "phrases": [
        {
          "en": "You're free at three? ↗",
          "ar": "فاضية الساعة ٣؟",
          "when": "Rise = a real yes/no question",
          "when_ar": "الصعود = سؤال نعم/لا"
        },
        {
          "en": "The fix is deployed. ↘",
          "ar": "الحل تم نشره.",
          "when": "Fall = a confident statement",
          "when_ar": "الهبوط = جملة واثقة"
        },
        {
          "en": "Thanks so much for catching that. ↗↘",
          "ar": "مشكورة مرة إنك انتبهتي لها.",
          "when": "A warm rise-then-fall",
          "when_ar": "صعود-ثم-هبوط دافئ"
        },
        {
          "en": "So, to confirm — you want the rollback first? ↗",
          "ar": "يعني للتأكيد — تبين التراجع أول؟",
          "when": "Rise on a checking question",
          "when_ar": "صعود على سؤال تأكّد"
        },
        {
          "en": "Let's do it. ↘",
          "ar": "يلا نسوّيها.",
          "when": "Fall = a firm, calm decision",
          "when_ar": "الهبوط = قرار حازم وهادئ"
        },
        {
          "en": "No problem at all. ↗↘",
          "ar": "ولا يهمّك أبداً.",
          "when": "A warm melody softens a 'no problem'",
          "when_ar": "لحن دافئ يليّن «no problem»"
        }
      ],
      "terms": [
        {
          "term": "intonation",
          "ar": "التنغيم",
          "def_en": "the rise and fall of your voice",
          "example": "Rising intonation turns a statement into a question."
        },
        {
          "term": "rising tone",
          "ar": "النغمة الصاعدة",
          "def_en": "voice going up, usually a question",
          "example": "'Ready?' rises at the end."
        },
        {
          "term": "falling tone",
          "ar": "النغمة الهابطة",
          "def_en": "voice going down, a confident close",
          "example": "'It's done.' falls at the end."
        }
      ],
      "example": {
        "setting": "A flat 'okay' sounds cold; the same word with a warm melody reassures.",
        "setting_ar": "كلمة «okay» مسطّحة تطلع باردة؛ نفسها بلحن دافئ تطمئن.",
        "lines": [
          {
            "who": "Manager",
            "en": "Are you okay to take the on-call tonight?",
            "ar": "تقدرين تاخذين المناوبة الليلة؟"
          },
          {
            "who": "You",
            "en": "Okay ↗↘ — happy to. I'll keep you posted.",
            "ar": "أوكي — بكل سرور. بخلّيك على اطّلاع."
          },
          {
            "who": "Manager",
            "en": "Great — thank you.",
            "ar": "ممتاز — شكراً."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Say these three out loud with the right melody: a real question, a confident statement, and a warm thank-you. Notice where your voice rises and falls.",
        "prompt_ar": "قولي هالثلاث بصوت عالي باللحن الصح: سؤال حقيقي، جملة واثقة، وشكر دافئ. لاحظي وين صوتك يصعد ويهبط.",
        "hint": "Question rises ('Ready to deploy? ↗'), statement falls ('It's live now. ↘'), thank-you glides up then down ('Thanks so much. ↗↘').",
        "hint_ar": "السؤال يصعد («Ready to deploy? ↗»)، الجملة تهبط («It's live now. ↘»)، والشكر يصعد ثم يهبط («Thanks so much. ↗↘»)."
      },
      "takeaway": "Your melody carries your meaning — let it rise, fall, and warm on purpose.",
      "takeaway_ar": "لحنك يحمل معناك — خليه يصعد ويهبط ويدفّى بقصد."
    }
  ]
},
{
  "id": "wordpower",
  "order": 13,
  "icon": "BookOpenText",
  "ar": "قوة المفردات",
  "en": "Word Power",
  "tagline": "Swap weak, vague words for precise ones that make you sound senior.",
  "tagline_ar": "بدّلي الكلمات الضعيفة الغامضة بكلمات دقيقة تطلعك أكثر خبرة.",
  "lessons": [
    {
      "id": "wordpower-precise-verbs",
      "order": 1,
      "ar": "أفعال دقيقة",
      "en": "Precise verbs",
      "minutes": 8,
      "outcome": "Replace weak, vague verbs (get, do, make) with precise ones that sound senior.",
      "outcome_ar": "تبدّلين الأفعال الضعيفة الغامضة (get, do, make) بأفعال دقيقة تطلعك أكثر خبرة.",
      "idea": {
        "body": "Weak verbs like 'get,' 'do,' and 'make' work everywhere, which is exactly why they say nothing. A precise verb carries the meaning by itself — 'receive,' 'carry out,' 'arrange' — so the reader doesn't have to guess. Precise verbs are the fastest way to sound senior without using bigger words.",
        "model": "The rule: if 'get / do / make' could mean five things, pick the one verb that means exactly this.",
        "body_ar": "الأفعال الضعيفة مثل «get» و«do» و«make» تنفع بكل مكان، وهذا بالضبط ليش ما تقول شي. الفعل الدقيق يحمل المعنى بنفسه — «receive» و«carry out» و«arrange» — فالقارئ ما يخمّن. الأفعال الدقيقة أسرع طريقة تطلعين فيها أكثر خبرة بدون كلمات أكبر.",
        "model_ar": "القاعدة: لو «get / do / make» ممكن تعني خمس أشياء، اختاري الفعل اللي يعني هذا بالضبط."
      },
      "phrases": [
        {
          "en": "I received the logs this morning.",
          "ar": "وصلتني السجلات الصبح.",
          "when": "get → receive",
          "when_ar": "get ← receive"
        },
        {
          "en": "We need to obtain access from the security team.",
          "ar": "لازم نحصل على صلاحية من فريق الأمن.",
          "when": "get → obtain (more formal)",
          "when_ar": "get ← obtain (أرسمي)"
        },
        {
          "en": "The team carried out the migration overnight.",
          "ar": "الفريق نفّذ الترحيل بالليل.",
          "when": "do → carry out",
          "when_ar": "do ← carry out"
        },
        {
          "en": "I'll arrange a call with the vendor.",
          "ar": "بأرتّب مكالمة مع المورّد.",
          "when": "make → arrange",
          "when_ar": "make ← arrange"
        },
        {
          "en": "Can you resolve the ticket by noon?",
          "ar": "تقدرين تحلّين التذكرة قبل الظهر؟",
          "when": "fix → resolve (crisper)",
          "when_ar": "fix ← resolve (أدقّ)"
        },
        {
          "en": "We identified the root cause quickly.",
          "ar": "حدّدنا السبب الجذري بسرعة.",
          "when": "find → identify",
          "when_ar": "find ← identify"
        }
      ],
      "terms": [
        {
          "term": "obtain",
          "ar": "يحصل على",
          "def_en": "to get something, usually with effort or a process",
          "example": "We obtained approval from finance."
        },
        {
          "term": "carry out",
          "ar": "ينفّذ",
          "def_en": "to do or perform a task or plan",
          "example": "They carried out the tests."
        },
        {
          "term": "arrange",
          "ar": "يرتّب / ينظّم",
          "def_en": "to make plans for something to happen",
          "example": "I arranged the meeting for Tuesday."
        },
        {
          "term": "resolve",
          "ar": "يحلّ / يعالج",
          "def_en": "to fix a problem completely",
          "example": "The issue is now resolved."
        }
      ],
      "example": {
        "setting": "A vague update gets a precise rewrite that reads more senior.",
        "setting_ar": "تحديث غامض يتحوّل لصياغة دقيقة تطلع أكثر خبرة.",
        "lines": [
          {
            "who": "Draft",
            "en": "I got the files, did the thing, and made a meeting.",
            "ar": "جبت الملفات، سوّيت الشي، وسوّيت اجتماع."
          },
          {
            "who": "You",
            "en": "I received the files, carried out the migration, and arranged a review call.",
            "ar": "وصلتني الملفات، نفّذت الترحيل، ورتّبت مكالمة مراجعة."
          },
          {
            "who": "Manager",
            "en": "Much clearer — I know exactly what you did.",
            "ar": "أوضح بكثير — عرفت بالضبط وش سوّيتي."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You want to sound precise and senior. Which line replaces the weak verb with the exact one?",
        "prompt_ar": "تبين تطلعين دقيقة وذات خبرة. أي جملة تبدّل الفعل الضعيف بالدقيق؟",
        "options": [
          {
            "en": "I'll do the security review after lunch.",
            "ar": "بأسوّي مراجعة الأمن بعد الغدا.",
            "correct": false,
            "why": "'Do' is vague — it doesn't say whether you'll run it, write it, or attend it.",
            "why_ar": "«Do» غامضة — ما تقول إذا بتشغّلينها، ولا تكتبينها، ولا تحضرينها."
          },
          {
            "en": "I'll carry out the security review after lunch.",
            "ar": "بأنفّذ مراجعة الأمن بعد الغدا.",
            "correct": true,
            "why": "'Carry out' states clearly that you will perform the review yourself.",
            "why_ar": "«Carry out» تقول بوضوح إنك بتنفّذين المراجعة بنفسك."
          },
          {
            "en": "I'll make the security review after lunch.",
            "ar": "بأعمل مراجعة الأمن بعد الغدا.",
            "correct": false,
            "why": "'Make a review' isn't natural English — you carry out or conduct a review.",
            "why_ar": "«Make a review» مو إنجليزي طبيعي — تنفّذين أو تجرين مراجعة."
          }
        ]
      },
      "takeaway": "One exact verb beats three vague ones — it tells the reader precisely what happened.",
      "takeaway_ar": "فعل دقيق واحد أحسن من ثلاثة غامضة — يقول للقارئ بالضبط وش صار."
    },
    {
      "id": "wordpower-collocations",
      "order": 2,
      "ar": "المتلازمات اللفظية",
      "en": "Native collocations",
      "minutes": 8,
      "outcome": "Pair words the way natives do (make a decision, do research) so your English sounds natural.",
      "outcome_ar": "تجمّعين الكلمات مثل أهل اللغة (make a decision, do research) عشان إنجليزيك يطلع طبيعي.",
      "idea": {
        "body": "Some words simply travel together, and natives feel it instantly. You 'make a decision' but you 'do research'; you have a 'strong point' but a 'heavy load.' The grammar of a wrong pair can be perfect and it still sounds off. Learning the pair, not just the word, is what makes your English sound native.",
        "model": "The rule: learn the pair, not just the word — 'make a decision,' not 'do a decision.'",
        "body_ar": "فيه كلمات تمشي مع بعض، وأهل اللغة يحسّونها على طول. تقولين «make a decision» بس «do research»؛ «strong point» بس «heavy load». قواعد الزوج الغلط ممكن تكون سليمة وبرضه تطلع غريبة. تعلّم الزوج، مو بس الكلمة، هو اللي يخلي إنجليزيك يطلع أصلي.",
        "model_ar": "القاعدة: تعلّمي الزوج، مو بس الكلمة — «make a decision» مو «do a decision»."
      },
      "phrases": [
        {
          "en": "Let's make a decision before the call ends.",
          "ar": "خلّونا ناخذ قرار قبل ما تخلص المكالمة.",
          "when": "make + decision",
          "when_ar": "make + decision"
        },
        {
          "en": "I did some research on the vendor.",
          "ar": "سويت بحث عن المورّد.",
          "when": "do + research",
          "when_ar": "do + research"
        },
        {
          "en": "Reliability is a strong point of this design.",
          "ar": "الاعتمادية نقطة قوة في هالتصميم.",
          "when": "strong + point",
          "when_ar": "strong + point"
        },
        {
          "en": "The server is under a heavy load right now.",
          "ar": "الخادم عليه حمل ثقيل الحين.",
          "when": "heavy + load",
          "when_ar": "heavy + load"
        },
        {
          "en": "Let's take a different approach this time.",
          "ar": "خلّونا ناخذ نهج مختلف هالمرة.",
          "when": "take + approach",
          "when_ar": "take + approach"
        },
        {
          "en": "That raises a good question about scale.",
          "ar": "هذا يطرح سؤال زين عن التوسّع.",
          "when": "raise + question",
          "when_ar": "raise + question"
        }
      ],
      "terms": [
        {
          "term": "collocation",
          "ar": "متلازمة لفظية",
          "def_en": "words that naturally go together",
          "example": "'Heavy rain,' not 'strong rain.'"
        },
        {
          "term": "make a decision",
          "ar": "ياخذ قرار",
          "def_en": "to decide (never 'do a decision')",
          "example": "We made the decision together."
        },
        {
          "term": "do research",
          "ar": "يجري بحث",
          "def_en": "to study or investigate (never 'make research')",
          "example": "She did research on the market."
        },
        {
          "term": "heavy load",
          "ar": "حمل ثقيل",
          "def_en": "a large amount of work or traffic",
          "example": "The system handles a heavy load."
        }
      ],
      "example": {
        "setting": "A wrong pairing sounds off; the right collocation fixes it instantly.",
        "setting_ar": "زوج غلط يطلع غريب؛ المتلازمة الصح تصلّحه على طول.",
        "lines": [
          {
            "who": "You",
            "en": "We need to do a decision and make some research.",
            "ar": "لازم ناخذ قرار ونسوّي بحث."
          },
          {
            "who": "Lead",
            "en": "You mean make a decision and do some research?",
            "ar": "تقصدين ناخذ قرار ونجري بحث؟"
          },
          {
            "who": "You",
            "en": "Yes — make the decision, then do the research to back it up.",
            "ar": "إي — ناخذ القرار، بعدها نجري البحث اللي يدعمه."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "Which sentence uses the natural collocation?",
        "prompt_ar": "أي جملة تستخدم المتلازمة الطبيعية؟",
        "options": [
          {
            "en": "The database is under a strong load today.",
            "ar": "قاعدة البيانات عليها حمل قوي اليوم.",
            "correct": false,
            "why": "Load pairs with 'heavy,' not 'strong' — the grammar is fine but the pair is wrong.",
            "why_ar": "الحمل يتلازم مع «heavy» مو «strong» — القواعد سليمة بس الزوج غلط."
          },
          {
            "en": "The database is under a heavy load today.",
            "ar": "قاعدة البيانات عليها حمل ثقيل اليوم.",
            "correct": true,
            "why": "'Heavy load' is the pair every native uses.",
            "why_ar": "«Heavy load» هو الزوج اللي يستخدمه كل أهل اللغة."
          },
          {
            "en": "The database is under a big load today.",
            "ar": "قاعدة البيانات عليها حمل كبير اليوم.",
            "correct": false,
            "why": "'Big load' is understandable but not the natural collocation — 'heavy load' is.",
            "why_ar": "«Big load» مفهومة بس مو المتلازمة الطبيعية — «heavy load» هي الصح."
          }
        ]
      },
      "takeaway": "Right word, wrong partner still sounds off — learn the pair, not just the word.",
      "takeaway_ar": "كلمة صح مع شريك غلط تظل غريبة — تعلّمي الزوج، مو بس الكلمة."
    },
    {
      "id": "wordpower-phrasal-verbs",
      "order": 3,
      "ar": "الأفعال المركّبة في العمل",
      "en": "Phrasal verbs at work",
      "minutes": 8,
      "outcome": "Use everyday work phrasal verbs (follow up, roll out, reach out) so you sound like an insider.",
      "outcome_ar": "تستخدمين الأفعال المركّبة اليومية (follow up, roll out, reach out) عشان تطلعين من أهل المجال.",
      "idea": {
        "body": "Workplace English runs on phrasal verbs — two small words that together mean one specific thing. 'Follow up,' 'roll out,' 'reach out': reaching for the single fancy verb instead ('pursue,' 'deploy,' 'contact') can sound stiff. The phrasal verb is warmer and more natural — it's how colleagues actually talk to each other.",
        "model": "The rule: at work, the two-word verb usually sounds warmer than the fancy one.",
        "body_ar": "إنجليزي العمل يمشي على الأفعال المركّبة — كلمتين صغار مع بعض يعنون شي محدّد. «Follow up» و«roll out» و«reach out»: لو استخدمتي الفعل الفخم بدالها («pursue» و«deploy» و«contact») ممكن تطلعين متيبّسة. الفعل المركّب أدفأ وأطبع — هذا اللي يتكلّمونه الزملاء فيما بينهم.",
        "model_ar": "القاعدة: في العمل، الفعل ذو الكلمتين عادة يطلع أدفأ من الفخم."
      },
      "phrases": [
        {
          "en": "I'll follow up with the vendor after lunch.",
          "ar": "بأتابع مع المورّد بعد الغدا.",
          "when": "follow up = check back later",
          "when_ar": "follow up = يتابع لاحقاً"
        },
        {
          "en": "We're rolling out the update to 10% first.",
          "ar": "بننشر التحديث لـ ١٠٪ أول.",
          "when": "roll out = release gradually",
          "when_ar": "roll out = ينشر تدريجياً"
        },
        {
          "en": "Feel free to reach out if you get stuck.",
          "ar": "لا تترددين تتواصلين لو علّقتِ.",
          "when": "reach out = make contact",
          "when_ar": "reach out = يتواصل"
        },
        {
          "en": "Can you sort out the access issue today?",
          "ar": "تقدرين تحلّين مشكلة الصلاحية اليوم؟",
          "when": "sort out = fix / handle",
          "when_ar": "sort out = يحلّ / يعالج"
        },
        {
          "en": "I ran into a blocker on staging.",
          "ar": "صادفت عائق على staging.",
          "when": "run into = meet unexpectedly",
          "when_ar": "run into = يصادف فجأة"
        },
        {
          "en": "Let's catch up on this after standup.",
          "ar": "خلّونا نتحدّث في هذا بعد الاجتماع اليومي.",
          "when": "catch up = talk / sync",
          "when_ar": "catch up = يتحدّث / يزامن"
        }
      ],
      "terms": [
        {
          "term": "follow up",
          "ar": "يتابع",
          "def_en": "to check on something again later",
          "example": "I'll follow up tomorrow."
        },
        {
          "term": "roll out",
          "ar": "ينشر تدريجياً",
          "def_en": "to release something in stages",
          "example": "We rolled out the feature slowly."
        },
        {
          "term": "reach out",
          "ar": "يتواصل",
          "def_en": "to contact someone",
          "example": "Reach out any time."
        },
        {
          "term": "sort out",
          "ar": "يحلّ / يرتّب",
          "def_en": "to fix or organize a problem",
          "example": "I'll sort out the permissions."
        }
      ],
      "example": {
        "setting": "Fancy single verbs sound stiff; phrasal verbs warm the same message.",
        "setting_ar": "الأفعال الفخمة تطلع متيبّسة؛ الأفعال المركّبة تدفّي نفس الرسالة.",
        "lines": [
          {
            "who": "Draft",
            "en": "I will pursue the vendor and contact you if I encounter issues.",
            "ar": "بألاحق المورّد وأتّصل فيك لو واجهت مشاكل."
          },
          {
            "who": "You",
            "en": "I'll follow up with the vendor and reach out if I run into anything.",
            "ar": "بأتابع مع المورّد وأتواصل لو صادفت أي شي."
          },
          {
            "who": "Colleague",
            "en": "Sounds good — talk soon.",
            "ar": "تمام — نتواصل قريب."
          }
        ]
      },
      "practice": {
        "type": "order",
        "prompt": "Arrange this into one natural, colleague-to-colleague message:",
        "prompt_ar": "رتّبي هذا لرسالة طبيعية من زميل لزميل:",
        "steps": [
          {
            "en": "I ran into a blocker on staging,",
            "ar": "صادفت عائق على staging،"
          },
          {
            "en": "so I'll sort out the access first,",
            "ar": "فبأحلّ الصلاحية أول،"
          },
          {
            "en": "then follow up with networking,",
            "ar": "بعدها أتابع مع الشبكات،"
          },
          {
            "en": "and reach out if I need help.",
            "ar": "وأتواصل لو احتجت مساعدة."
          }
        ]
      },
      "takeaway": "At work, the small two-word verb often sounds warmer than the big one.",
      "takeaway_ar": "في العمل، الفعل الصغير ذو الكلمتين غالباً أدفأ من الكبير."
    },
    {
      "id": "wordpower-hedging",
      "order": 4,
      "ar": "التلطيف والتخفيف",
      "en": "Hedging & softening",
      "minutes": 7,
      "outcome": "Soften strong claims with hedges (might, tend to, a bit, I'd suggest) so you sound diplomatic.",
      "outcome_ar": "تلطّفين الجزم بكلمات تخفيف (might, tend to, a bit, I'd suggest) عشان تطلعين دبلوماسية.",
      "idea": {
        "body": "Being right isn't enough at work; how you say it decides whether people listen. A blunt 'you're wrong' starts a fight, while 'it seems there might be a small issue here' opens a door. Hedging words — 'might,' 'tend to,' 'a bit,' 'I'd suggest' — soften a claim without weakening it, so you sound diplomatic, not unsure.",
        "model": "The rule: soften the delivery, not the point — 'I'd suggest we test first,' not just 'test first.'",
        "body_ar": "مو كافي إنك صح في العمل؛ كيف تقولينها هو اللي يقرّر إذا الناس بيسمعون. «إنتِ غلطانة» المباشرة تبدأ خناقة، بس «يبدو إن فيه مشكلة صغيرة هنا» تفتح باب. كلمات التخفيف — «might» و«tend to» و«a bit» و«I would suggest» — تلطّف الجزم بدون ما تضعّفه، فتطلعين دبلوماسية مو مترددة.",
        "model_ar": "القاعدة: ليّني الأسلوب مو الفكرة — «أقترح نجرّب أول» مو بس «جرّبي أول»."
      },
      "phrases": [
        {
          "en": "This might cause a problem on production.",
          "ar": "هذا يمكن يسبّب مشكلة على الإنتاج.",
          "when": "might = soften a warning",
          "when_ar": "might = تلطيف تحذير"
        },
        {
          "en": "The cache tends to fill up under load.",
          "ar": "الكاش يميل يمتلئ تحت الحمل.",
          "when": "tend to = a soft general truth",
          "when_ar": "tend to = حقيقة عامة ملطّفة"
        },
        {
          "en": "The timeline looks a bit tight to me.",
          "ar": "الجدول يبان لي ضيّق شوي.",
          "when": "a bit = play down a concern",
          "when_ar": "a bit = تهوين قلق"
        },
        {
          "en": "I'd suggest we test on staging first.",
          "ar": "أقترح نجرّب على staging أول.",
          "when": "a gentle proposal",
          "when_ar": "اقتراح لطيف"
        },
        {
          "en": "It seems the config was reverted somewhere.",
          "ar": "يبدو إن الإعداد رجع لسابقه بمكان ما.",
          "when": "it seems = raise it without blame",
          "when_ar": "it seems = تطرحها بدون لوم"
        },
        {
          "en": "Correct me if I'm wrong, but the port looks closed.",
          "ar": "صحّحيني لو غلطانة، بس المنفذ يبان مقفول.",
          "when": "invite correction, keep the point",
          "when_ar": "تدعين للتصحيح وتحفظين النقطة"
        }
      ],
      "terms": [
        {
          "term": "hedge",
          "ar": "كلمة تخفيف",
          "def_en": "a word that softens a claim (might, seem, a bit)",
          "example": "She hedged with 'it might be.'"
        },
        {
          "term": "tend to",
          "ar": "يميل إلى",
          "def_en": "to usually do something",
          "example": "Users tend to skip the tutorial."
        },
        {
          "term": "I'd suggest",
          "ar": "أقترح",
          "def_en": "a polite way to propose an idea",
          "example": "I'd suggest a quick rollback."
        },
        {
          "term": "it seems",
          "ar": "يبدو أنّ",
          "def_en": "a soft way to state something uncertain",
          "example": "It seems the build failed."
        }
      ],
      "example": {
        "setting": "A blunt correction risks a fight; a hedged one keeps the room calm.",
        "setting_ar": "تصحيح مباشر يخاطر بخناقة؛ ملطّف يخلي الجو هادئ.",
        "lines": [
          {
            "who": "Colleague",
            "en": "The config is fine, let's just deploy.",
            "ar": "الإعداد تمام، خلّنا ننشر."
          },
          {
            "who": "You",
            "en": "It might be worth a quick check — the port seems closed. I'd suggest we test on staging first.",
            "ar": "يمكن يستاهل فحص سريع — المنفذ يبان مقفول. أقترح نجرّب على staging أول."
          },
          {
            "who": "Colleague",
            "en": "Good call — let's check.",
            "ar": "فكرة زينة — خلّنا نتأكّد."
          }
        ]
      },
      "practice": {
        "type": "choose",
        "prompt": "You disagree with a risky plan but want to keep the relationship. Which line is diplomatic without giving up your point?",
        "prompt_ar": "تختلفين مع خطة محفوفة بالمخاطر بس تبين تحفظين العلاقة. أي جملة دبلوماسية بدون ما تتنازلين عن نقطتك؟",
        "options": [
          {
            "en": "That won't work, it's a bad idea.",
            "ar": "هذا ما بيمشي، فكرة سيّئة.",
            "correct": false,
            "why": "Blunt and personal — it attacks the idea and invites a fight.",
            "why_ar": "مباشرة وشخصية — تهاجم الفكرة وتفتح خناقة."
          },
          {
            "en": "I might be missing something, but this could be risky on production — I'd suggest a staging test first.",
            "ar": "يمكن فايتني شي، بس هذا ممكن يكون خطر على الإنتاج — أقترح اختبار على staging أول.",
            "correct": true,
            "why": "Hedges soften the delivery while the concern and the alternative stay clear.",
            "why_ar": "كلمات التخفيف تليّن الأسلوب والقلق والبديل يظلّون واضحين."
          },
          {
            "en": "Whatever you think is best.",
            "ar": "اللي تشوفينه أنتِ.",
            "correct": false,
            "why": "Too soft — you gave up the point entirely.",
            "why_ar": "ملطّفة بزيادة — تنازلتِ عن النقطة كامل."
          }
        ]
      },
      "takeaway": "Soften how you say it, not what you mean — that's how you sound diplomatic.",
      "takeaway_ar": "ليّني كيف تقولينها، مو وش تقصدين — كذا تطلعين دبلوماسية."
    },
    {
      "id": "wordpower-register",
      "order": 5,
      "ar": "مستوى اللغة",
      "en": "Register — formal vs casual",
      "minutes": 8,
      "outcome": "Match your words to the reader — formal for a VP, casual for a teammate — and switch on purpose.",
      "outcome_ar": "تطابقين كلماتك مع القارئ — رسمي للنائب، وودّي للزميل — وتبدّلين بقصد.",
      "idea": {
        "body": "The same message needs different words for a VP than for a teammate on chat. 'I wanted to flag a potential concern' fits an email to leadership; 'heads up, small issue' fits a quick chat. Register isn't about being fancy — it's about matching the reader, and switching on purpose shows you read the room.",
        "model": "The rule: match the words to the reader — formal up the ladder, relaxed across it.",
        "body_ar": "نفس الرسالة تبي كلمات مختلفة للنائب عن الزميل بالشات. «I wanted to flag a potential concern» تناسب إيميل للقيادة؛ «heads up, small issue» تناسب شات سريع. المستوى مو إنك تطلعين فخمة — هو إنك تطابقين القارئ، والتبديل بقصد يبيّن إنك تقرين الجو.",
        "model_ar": "القاعدة: طابقي الكلمات مع القارئ — رسمي فوق السلّم، ومرتاح بعرضه."
      },
      "phrases": [
        {
          "en": "I wanted to flag a potential concern with the timeline.",
          "ar": "حبّيت أنبّه لتحفّظ محتمل على الجدول.",
          "when": "Formal — email to a VP",
          "when_ar": "رسمي — إيميل للنائب"
        },
        {
          "en": "Heads up — the timeline looks tight.",
          "ar": "تنبيه — الجدول يبان ضيّق.",
          "when": "Casual — teammate chat",
          "when_ar": "ودّي — شات زميل"
        },
        {
          "en": "Please find the summary below for your review.",
          "ar": "تجدون الملخّص أدناه لمراجعتكم.",
          "when": "Formal — sharing up",
          "when_ar": "رسمي — مشاركة للأعلى"
        },
        {
          "en": "Quick summary below, take a look.",
          "ar": "ملخّص سريع تحت، طلّي عليه.",
          "when": "Casual — sharing across",
          "when_ar": "ودّي — مشاركة بالعرض"
        },
        {
          "en": "Apologies for the delay; here is the update.",
          "ar": "أعتذر عن التأخير؛ هذا التحديث.",
          "when": "Formal apology",
          "when_ar": "اعتذار رسمي"
        },
        {
          "en": "Sorry for the wait — here's the update.",
          "ar": "آسفة على الانتظار — هذا التحديث.",
          "when": "Casual apology",
          "when_ar": "اعتذار ودّي"
        }
      ],
      "terms": [
        {
          "term": "register",
          "ar": "مستوى اللغة",
          "def_en": "how formal or casual your language is",
          "example": "A cover letter uses a formal register."
        },
        {
          "term": "formal",
          "ar": "رسمي",
          "def_en": "polished language for leadership or clients",
          "example": "'I would appreciate your guidance.'"
        },
        {
          "term": "casual",
          "ar": "ودّي / غير رسمي",
          "def_en": "relaxed language for peers",
          "example": "'Ping me when you're free.'"
        },
        {
          "term": "flag",
          "ar": "ينبّه إلى",
          "def_en": "to raise something for attention",
          "example": "I flagged the risk to my manager."
        }
      ],
      "example": {
        "setting": "The same warning, written twice — once up the ladder, once across it.",
        "setting_ar": "نفس التحذير، مكتوب مرتين — مرة للأعلى، مرة بالعرض.",
        "lines": [
          {
            "who": "To a VP",
            "en": "I wanted to flag a potential risk in tonight's deploy and recommend we postpone.",
            "ar": "حبّيت أنبّه لخطر محتمل في نشر الليلة وأوصي نأجّله."
          },
          {
            "who": "To a teammate",
            "en": "Heads up — tonight's deploy looks risky, maybe push it?",
            "ar": "تنبيه — نشر الليلة يبان خطر، نأجّله؟"
          },
          {
            "who": "You",
            "en": "Same point, two registers — I match the words to whoever's reading.",
            "ar": "نفس النقطة، مستويين — أطابق الكلمات مع مين يقرأ."
          }
        ]
      },
      "practice": {
        "type": "reflect",
        "prompt": "Take this casual chat line and rewrite it in English as a formal note to a VP: 'hey, deploy's gonna be late, ran into a bug.' Keep the facts, lift the register.",
        "prompt_ar": "خذي جملة الشات الودّية هذي وأعيدي كتابتها بالإنجليزي كملاحظة رسمية للنائب: «hey, deploy's gonna be late, ran into a bug». احفظي الحقائق وارفعي المستوى.",
        "hint": "Open with a polite frame, name the impact, and give a next step — e.g. 'I wanted to flag a short delay to tonight's deploy: we identified a bug and are resolving it. I'll share a new ETA within the hour.'",
        "hint_ar": "ابدئي بإطار مهذّب، سمّي الأثر، واعطي خطوة جاية — مثلاً: «I wanted to flag a short delay to tonight's deploy: we identified a bug and are resolving it. I'll share a new ETA within the hour»."
      },
      "takeaway": "Reading the room is a skill — match your words to whoever's on the other end.",
      "takeaway_ar": "قراءة الجو مهارة — طابقي كلماتك مع مين على الطرف الثاني."
    }
  ]
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
