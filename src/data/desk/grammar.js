// Pro Desk — Daily grammar bank. The highest-value grammar points a working
// professional needs, surfaced as a daily "Rule of the day" + a browsable bank.
// 100% CREDITLESS: authored, self-checking. IT/work-flavored. ENGLISH-PRIMARY —
// Arabic kept only as small glosses (نورة prefers her learning resources in English).
//
// A point: { id, order, en, ar (gloss), rule, rule_ar (gloss), model, model_ar (gloss),
//            examples:[{en, ar (gloss), note}],
//            check:[{q, q_ar? (gloss), options:[{en, correct, why}]}] }

export const DESK_GRAMMAR = [
  {
    id: 'g-present-simple', order: 1, en: 'Present simple', ar: 'المضارع البسيط',
    rule: 'Use it for habits, facts, and schedules. With a singular third person (he / she / it / Sarah), add -s to the verb.',
    rule_ar: 'عادات وحقائق وجداول · الغائب المفرد يأخذ ‎+s',
    model: 'Habit / fact → present simple.  Singular third person → +s.',
    model_ar: 'غائب مفرد ← ‎+s',
    examples: [
      { en: 'I check the logs every morning.', ar: 'أراجع السجلّات كل صباح.', note: 'habit' },
      { en: 'The system runs on Linux.', ar: 'النظام يشتغل على لينكس.', note: 'fact · it → runs' },
      { en: 'Sarah leads the standup.', ar: 'سارة تدير الاجتماع اليومي.', note: 'third person → +s' },
    ],
    check: [
      { q: 'Complete: "The server ___ every night." (it runs an automatic backup)',
        options: [
          { en: 'backup', correct: false, why: '"backup" is a noun — you need a verb, and the subject is singular third person.' },
          { en: 'backs up', correct: true, why: 'Correct — singular third person + habit → back up → backs up.' },
          { en: 'is backing', correct: false, why: 'That is continuous; "every night" is a habit → present simple.' },
        ] },
    ],
  },
  {
    id: 'g-present-continuous', order: 2, en: 'Present continuous', ar: 'المضارع المستمر',
    rule: 'Use it for something happening right now or around this period. Form: am / is / are + verb + -ing.',
    rule_ar: 'شيء يحصل الآن · ‎be + verb-ing',
    model: 'Happening now → be + verb-ing.',
    model_ar: 'يحصل الحين',
    examples: [
      { en: 'The servers are restarting now.', ar: 'الخوادم تعيد التشغيل الحين.', note: 'are + restarting' },
      { en: 'I am reviewing the pull request.', ar: 'أراجع طلب الدمج.', note: 'am + reviewing' },
    ],
    check: [
      { q: 'Complete: "She ___ the incident report right now."',
        options: [
          { en: 'writes', correct: false, why: '"right now" means at this moment → use the continuous.' },
          { en: 'is writing', correct: true, why: 'Correct — is + writing (happening now).' },
          { en: 'write', correct: false, why: 'Missing the verb "to be" and the -ing.' },
        ] },
    ],
  },
  {
    id: 'g-past-simple', order: 3, en: 'Past simple', ar: 'الماضي البسيط',
    rule: 'Use it for a finished action in the past. The verb takes the second form (played / went). In questions and negatives, use "did" + the base verb.',
    rule_ar: 'حدث انتهى · ‎v2 · السؤال/النفي ← ‎did + v1',
    model: 'Finished in the past → v2.  Question / negative → did + base verb.',
    model_ar: 'انتهى ← v2',
    examples: [
      { en: 'We deployed the fix at 2 PM.', ar: 'نشرنا الإصلاح الساعة ٢.', note: 'deploy → deployed' },
      { en: 'The service went down last night.', ar: 'الخدمة وقعت أمس بالليل.', note: 'go → went (irregular)' },
      { en: 'Did you restart the node?', ar: 'أعدتِ تشغيل العقدة؟', note: 'did + restart' },
    ],
    check: [
      { q: 'Complete: "Yesterday the team ___ the outage quickly."',
        options: [
          { en: 'resolves', correct: false, why: '"resolves" is present; "yesterday" is past.' },
          { en: 'resolved', correct: true, why: 'Correct — resolve → resolved (past simple).' },
          { en: 'did resolved', correct: false, why: 'After "did", go back to the base verb: did resolve.' },
        ] },
    ],
  },
  {
    id: 'g-present-perfect', order: 4, en: 'Present perfect', ar: 'المضارع التام',
    rule: 'Use it for a result that matters now, an experience, or something that started in the past and still continues. Form: have / has + past participle (v3).',
    rule_ar: 'نتيجة تهمّنا الآن · ‎have/has + v3 · (already / just / yet / since / for)',
    model: 'Has an effect now → have / has + v3.',
    model_ar: 'له أثر الآن',
    examples: [
      { en: 'I have fixed the bug.', ar: 'صلّحت الخطأ — والنتيجة الآن: انحلّ.', note: 'have + fixed' },
      { en: 'She has worked here for three years.', ar: 'تشتغل هنا من ثلاث سنوات.', note: 'has + worked' },
      { en: 'We haven’t deployed it yet.', ar: 'ما نشرناه بعد.', note: 'haven’t + v3 + yet' },
    ],
    check: [
      { q: 'Complete: "The team ___ the root cause." (they just found it — the result matters now)',
        options: [
          { en: 'has found', correct: true, why: 'Correct — a result that matters now → have / has + v3 (find → found).' },
          { en: 'found', correct: false, why: 'Grammatically fine, but the perfect highlights the current result.' },
          { en: 'have found', correct: false, why: 'Here "the team" is treated as singular → has.' },
        ] },
    ],
  },
  {
    id: 'g-questions', order: 5, en: 'Forming questions', ar: 'صياغة السؤال',
    rule: 'Present simple: Do / Does + subject + verb. Past: Did + subject + verb. For the continuous and for "be" sentences, move "be" to the front. Question words: When / Where / Who / Why / How.',
    rule_ar: 'أفعال ← ‎do/does/did · قدّم ‎be مع المستمر والاسمية',
    model: 'do / does / did for verbs · move "be" to the front for the continuous & "be" sentences.',
    model_ar: 'قدّم ‎be',
    examples: [
      { en: 'Do you have access to the server?', ar: 'عندك وصول للخادم؟', note: 'Do + you + have' },
      { en: 'Are the backups running?', ar: 'النسخ الاحتياطية شغّالة؟', note: 'be moved to front' },
      { en: 'When did the outage start?', ar: 'متى بدأ الانقطاع؟', note: 'When + did + start' },
    ],
    check: [
      { q: 'Turn into a question: "The service is available."',
        options: [
          { en: 'Does the service available?', correct: false, why: 'With "be", move it to the front — don’t use "does".' },
          { en: 'Is the service available?', correct: true, why: 'Correct — front the "be": Is + the service + available.' },
          { en: 'Is available the service?', correct: false, why: 'Order: Is + subject + description.' },
        ] },
    ],
  },
  {
    id: 'g-articles', order: 6, en: 'Articles: a / an / the', ar: 'أدوات التعريف',
    rule: 'Use a / an for a singular, non-specific noun (an before a vowel sound). Use "the" for something specific or already mentioned. Use no article with general plurals and general uncountables.',
    rule_ar: 'نكرة مفرد ← ‎a/an · محدّد ← ‎the',
    model: 'Non-specific singular → a / an ·  specific → the.',
    model_ar: 'محدّد ← ‎the',
    examples: [
      { en: 'I opened a ticket.', ar: 'فتحت تذكرة (أول مرة).', note: 'non-specific → a' },
      { en: 'The ticket is still open.', ar: 'التذكرة (اللي ذكرناها) لسا مفتوحة.', note: 'specific → the' },
      { en: 'It’s an urgent issue.', ar: 'مشكلة عاجلة.', note: 'vowel sound → an' },
    ],
    check: [
      { q: 'Complete: "We need ___ reliable backup, and ___ backup must run daily."',
        options: [
          { en: 'a … the', correct: true, why: 'Correct — first mention is non-specific (a), then specific (the).' },
          { en: 'the … a', correct: false, why: 'Reversed — non-specific first, then specific.' },
          { en: 'an … the', correct: false, why: '"reliable" starts with a consonant sound → a, not an.' },
        ] },
    ],
  },
  {
    id: 'g-prep-time', order: 7, en: 'Prepositions of time: at / on / in', ar: 'حروف الجر للوقت',
    rule: 'Use "at" for a clock time or a moment (at 2 PM, at night). Use "on" for a day or date (on Monday). Use "in" for a month, year, or part of the day (in May, in the morning).',
    rule_ar: 'at ساعة · on يوم · in شهر/سنة/فترة',
    model: 'at = clock time · on = day · in = month / year / period.',
    model_ar: '',
    examples: [
      { en: 'The deploy is at 3 PM.', ar: 'النشر الساعة ٣.', note: 'at + clock time' },
      { en: 'We meet on Sunday.', ar: 'نجتمع يوم الأحد.', note: 'on + day' },
      { en: 'The migration is in July.', ar: 'الترحيل في يوليو.', note: 'in + month' },
    ],
    check: [
      { q: 'Complete: "Let’s sync ___ the morning, ___ Monday, ___ 9 AM."',
        options: [
          { en: 'in … on … at', correct: true, why: 'Correct — in the morning · on Monday · at 9.' },
          { en: 'on … in … at', correct: false, why: 'Period → in, day → on, clock time → at.' },
          { en: 'at … on … in', correct: false, why: 'Completely reversed.' },
        ] },
    ],
  },
  {
    id: 'g-modals', order: 8, en: 'Modals', ar: 'الأفعال الناقصة',
    rule: 'can / could (ability, polite request), should (advice), would (politeness / hypothetical), must (necessity), may / might (possibility). A base verb follows — no "to", no -s.',
    rule_ar: 'قدرة/طلب/نصيحة/ضرورة/احتمال · بعدها فعل أساسي بلا ‎to ولا ‎s',
    model: 'modal + base verb (no "to", no -s).',
    model_ar: '',
    examples: [
      { en: 'Could you check the logs?', ar: 'ممكن تراجعين السجلّات؟', note: 'polite request' },
      { en: 'We should add a failover rule.', ar: 'المفروض نضيف قاعدة تحوّل احتياطي.', note: 'advice' },
      { en: 'You must not deploy on Friday.', ar: 'ممنوع تنشرين يوم الجمعة.', note: 'must not = prohibition' },
    ],
    check: [
      { q: 'The most polite request to a colleague:',
        options: [
          { en: 'You will send me the file.', correct: false, why: 'That’s an order, not a polite request.' },
          { en: 'Could you send me the file, please?', correct: true, why: 'Correct — Could + base verb = a polite request.' },
          { en: 'Could you to send the file?', correct: false, why: 'No "to" after a modal.' },
        ] },
    ],
  },
  {
    id: 'g-passive', order: 9, en: 'The passive', ar: 'المبني للمجهول',
    rule: 'Use it when the doer is unknown or unimportant, or when you want to focus on the action. Form: be (in the right tense) + past participle (v3).',
    rule_ar: 'الفاعل غير مهم · ‎be + v3',
    model: 'be + v3 (the action matters more than the doer).',
    model_ar: 'الحدث أهم من الفاعل',
    examples: [
      { en: 'The server was configured last week.', ar: 'الخادم جُهّز الأسبوع الماضي.', note: 'was + configured' },
      { en: 'The servers are monitored 24/7.', ar: 'الخوادم تُراقب على مدار الساعة.', note: 'are + monitored' },
      { en: 'The bug has been fixed.', ar: 'الخطأ انصلح.', note: 'has been + fixed' },
    ],
    check: [
      { q: 'Complete: "The system ___ last night." (it was updated — the doer doesn’t matter)',
        options: [
          { en: 'updated', correct: false, why: 'That’s active; we want the passive here.' },
          { en: 'was updated', correct: true, why: 'Correct — was + v3 (update → updated).' },
          { en: 'is updated', correct: false, why: 'The action is past (last night) → was.' },
        ] },
    ],
  },
  {
    id: 'g-conditional', order: 10, en: 'First conditional', ar: 'الجملة الشرطية الأولى',
    rule: 'Use it for a realistic, likely result in the future. Form: If + present simple , will + base verb.',
    rule_ar: 'نتيجة واقعية محتملة · ‎If + present , will + verb',
    model: 'If + present , will + verb.',
    model_ar: '',
    examples: [
      { en: 'If we don’t act now, the backlog will double.', ar: 'إذا ما تحرّكنا الحين، بيتضاعف المتراكم.', note: 'If + present , will' },
      { en: 'If the test passes, we will deploy.', ar: 'إذا نجح الاختبار، بننشر.', note: '' },
    ],
    check: [
      { q: 'Complete: "If the primary fails, the system ___ to the backup."',
        options: [
          { en: 'will switch', correct: true, why: 'Correct — If + present (fails) , will + verb (switch).' },
          { en: 'switches', correct: false, why: 'The second part takes "will" for the future result.' },
          { en: 'will fails', correct: false, why: 'The "if" part takes the present simple, not "will".' },
        ] },
    ],
  },
  {
    id: 'g-comparatives', order: 11, en: 'Comparatives & superlatives', ar: 'المقارنة والتفضيل',
    rule: 'Short words: +er … than / the …est (faster, the fastest). Long words: more … than / the most … (more reliable, the most reliable).',
    rule_ar: 'قصير: ‎-er/-est · طويل: ‎more/most',
    model: 'Short: -er / -est ·  long: more / most.',
    model_ar: '',
    examples: [
      { en: 'This server is faster than the old one.', ar: 'هالخادم أسرع من القديم.', note: 'fast → faster than' },
      { en: 'It’s the most reliable option we have.', ar: 'أكثر خيار موثوق عندنا.', note: 'reliable → the most reliable' },
    ],
    check: [
      { q: 'Complete: "Latency is now ___ than before."',
        options: [
          { en: 'lower', correct: true, why: 'Correct — "low" is short → lower than.' },
          { en: 'more low', correct: false, why: '"low" is short — use -er, not "more".' },
          { en: 'lowest', correct: false, why: '"lowest" is the superlative (the lowest), not a comparison.' },
        ] },
    ],
  },
  {
    id: 'g-countable', order: 12, en: 'Countable & uncountable', ar: 'المعدود وغير المعدود',
    rule: 'Countable nouns have singular and plural (a bug / two bugs) and take many / a few. Uncountable nouns have no plural (data, feedback, traffic) and take much / a little / some.',
    rule_ar: 'معدود ← ‎many/a few · غير معدود ← ‎much/a little',
    model: 'Countable → many / a few ·  uncountable → much / a little.',
    model_ar: '',
    examples: [
      { en: 'We had a few issues today.', ar: 'كان عندنا كم مشكلة اليوم.', note: '"issues" is countable' },
      { en: 'There isn’t much traffic right now.', ar: 'ما فيه ضغط كثير على الشبكة الحين.', note: '"traffic" is uncountable' },
      { en: 'Thanks for the feedback.', ar: 'شكرًا على الملاحظات.', note: '"feedback" is uncountable (no -s)' },
    ],
    check: [
      { q: 'Complete: "We don’t have ___ information yet."',
        options: [
          { en: 'many', correct: false, why: '"information" is uncountable — it doesn’t take "many".' },
          { en: 'much', correct: true, why: 'Correct — uncountable nouns take "much".' },
          { en: 'a few', correct: false, why: '"a few" is for countable nouns; "information" is uncountable.' },
        ] },
    ],
  },
]

export const TOTAL_GRAMMAR = DESK_GRAMMAR.length
export function getPoint(id) { return DESK_GRAMMAR.find((p) => p.id === id) || null }
