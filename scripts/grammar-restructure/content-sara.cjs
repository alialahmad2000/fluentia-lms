/**
 * سارة — B1 IT-support custom track (control theme).
 *
 * Her English halves were already well authored (<b> labels, <br> lines); the
 * damage was elsewhere: the Arabic bullets were collapsed by the old renderer,
 * emphasis was faked with SHOUTING CAPS inside Arabic sentences, and every one
 * of the 8 lessons had a single `explanation` section — no formula, no worked
 * examples, no common-mistakes card.
 *
 * So this pass keeps her explanations (caps → <b>) and adds the three missing
 * sections, in her own incident/service-desk context.
 */

module.exports = [
  // ── Unit 1 — Past Simple vs Present Perfect ─────────────────────────────
  {
    id: '1d7b129b-c017-453b-9356-283e3d536136',
    unit: 1,
    topic: 'Past Simple vs Present Perfect',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Past Simple vs Present Perfect</b><br><br>' +
          '• Past simple = a finished action at a known time: <b>The server went down at 09:14.</b><br>' +
          '• Present perfect = the result matters now / no exact time: <b>We have restored the service.</b><br><br>' +
          'On a call, narrate the timeline in past simple (went, failed, moved) and give the current result in present perfect (has been restored, has started).',
        content_ar:
          '- <b>الماضي البسيط</b> لحدث انتهى في وقت محدّد: the server <b>went</b> down at 09:14.\n' +
          '- <b>المضارع التام</b> لحدث نتيجته مهمّة الآن أو بلا وقت محدّد: we <b>have restored</b> the service.\n' +
          '- على المكالمة: اسردي التسلسل بالماضي البسيط (went, failed, moved)، واذكري النتيجة الحالية بالمضارع التام (has been restored, has started).',
      },
      {
        type: 'formula',
        content:
          'past simple: subject + <b>V2</b> + at 09:14 / yesterday<br>' +
          'present perfect: subject + <b>have / has</b> + past participle',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'The server went down at 09:14 this morning.',
            highlight: 'went down at 09:14',
            translation_ar: 'تعطّل الخادم الساعة ٩:١٤ هذا الصباح.',
          },
          {
            sentence: 'We have restored the service and it is stable now.',
            highlight: 'have restored',
            translation_ar: 'أعدنا الخدمة وهي مستقرّة الآن.',
          },
          {
            sentence: 'The backup job failed twice before we moved the traffic.',
            highlight: 'failed twice',
            translation_ar: 'فشلت مهمّة النسخ الاحتياطي مرّتين قبل أن ننقل حركة البيانات.',
          },
          {
            sentence: 'The team has already opened a ticket with the vendor.',
            highlight: 'has already opened',
            translation_ar: 'فتح الفريق بالفعل تذكرة لدى المورِّد.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'We have restored the service at 09:41.',
            correct: 'We restored the service at 09:41.',
            explanation_ar: 'مع وقت محدّد منتهٍ نستخدم الماضي البسيط لا المضارع التام.',
          },
          {
            wrong: 'The server is went down this morning.',
            correct: 'The server went down this morning.',
            explanation_ar: 'الماضي البسيط لا يحتاج فعل كينونة قبله.',
          },
          {
            wrong: 'We have restore the service.',
            correct: 'We have restored the service.',
            explanation_ar: 'بعد have/has يأتي التصريف الثالث للفعل.',
          },
        ],
      },
    ],
  },

  // ── Unit 2 — Adverbs of Frequency + Present Simple ──────────────────────
  {
    id: 'bc692c08-abb1-4477-a9a5-ff474fb74e94',
    unit: 2,
    topic: 'Adverbs of Frequency + Present Simple',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Adverbs of Frequency + Present Simple</b><br><br>' +
          '• Use the present simple for recurring behaviour: <b>It freezes</b>, the dashboard <b>returns</b> a timeout.<br>' +
          '• Put the frequency adverb before the main verb: <b>It sometimes freezes / usually works / occasionally fails.</b><br>' +
          '• With <b>to be</b>, the adverb goes after it: <b>The API is usually slow.</b><br>' +
          '• This tense describes how the system normally behaves — exactly what you need for an intermittent issue.',
        content_ar:
          '- للسلوك المتكرّر نستخدم <b>المضارع البسيط</b>: it <b>freezes</b>, the dashboard <b>returns</b> a timeout.\n' +
          '- ظرف التكرار يأتي عادةً <b>قبل الفعل الأصلي</b>: it <b>sometimes</b> freezes / it <b>usually</b> works.\n' +
          '- أمّا مع فعل الكينونة to be فيأتي الظرف <b>بعده</b>: the API is <b>usually</b> slow.\n' +
          '- هذا الزمن يصف «كيف يتصرّف النظام عادةً»، وهو المطلوب بالضبط لوصف مشكلة متقطّعة.',
      },
      {
        type: 'formula',
        content:
          'subject + <b>adverb</b> + main verb &nbsp;·&nbsp; subject + <b>be</b> + <b>adverb</b><br>' +
          'always &gt; usually &gt; often &gt; sometimes &gt; occasionally &gt; rarely &gt; never',
      },
      {
        type: 'table',
        title_ar: 'سُلَّم التكرار',
        columns: [{ label_ar: 'الظرف' }, { label_ar: 'المعنى' }],
        rows: [
          ['always', 'دائمًا'],
          ['usually · often', 'غالبًا · كثيرًا'],
          ['sometimes · occasionally', 'أحيانًا · من حينٍ لآخر'],
          ['rarely · never', 'نادرًا · أبدًا'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'The dashboard sometimes freezes when the report is large.',
            highlight: 'sometimes freezes',
            translation_ar: 'تتجمّد لوحة البيانات أحيانًا حين يكون التقرير كبيرًا.',
          },
          {
            sentence: 'It usually works on the second attempt.',
            highlight: 'usually works',
            translation_ar: 'تعمل عادةً من المحاولة الثانية.',
          },
          {
            sentence: 'The API is often slow between 8 and 9 a.m.',
            highlight: 'is often slow',
            translation_ar: 'واجهة البرمجة بطيئة كثيرًا بين الثامنة والتاسعة صباحًا.',
          },
          {
            sentence: 'The error never appears on the test environment.',
            highlight: 'never appears',
            translation_ar: 'لا يظهر الخطأ أبدًا في بيئة الاختبار.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'It freezes sometimes the dashboard.',
            correct: 'The dashboard sometimes freezes.',
            explanation_ar: 'ظرف التكرار يأتي قبل الفعل الأصلي، لا في نهاية الجملة بهذا الشكل.',
          },
          {
            wrong: 'The API usually is slow.',
            correct: 'The API is usually slow.',
            explanation_ar: 'مع فعل الكينونة is/are يأتي الظرف بعده لا قبله.',
          },
          {
            wrong: 'It freeze sometimes when the report is large.',
            correct: 'It sometimes freezes when the report is large.',
            explanation_ar: 'مع الفاعل المفرد it يأخذ الفعل s في المضارع البسيط.',
          },
        ],
      },
    ],
  },

  // ── Unit 3 — Sequence Connectors + Past Simple ──────────────────────────
  {
    id: '4c00084d-1761-4fd8-a139-66f8e7248b68',
    unit: 3,
    topic: 'Sequence Connectors + Past Simple',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Sequence Connectors + Past Simple</b><br><br>' +
          '• Narrate investigation steps in the past simple with sequence connectors.<br>' +
          '• first / at first · then / after that · so (result) · finally.<br>' +
          '<i><b>First</b> we checked the network, <b>then</b> we found the wrong value, <b>so</b> we raised the limit.</i><br>' +
          '• The order makes your explanation easy to follow and shows methodical thinking.',
        content_ar:
          '- لسرد خطوات التحقيق نستخدم <b>الماضي البسيط</b> مع روابط التسلسل.\n' +
          '- <b>first / at first</b> (أولًا) · <b>then / after that</b> (بعدها) · <b>so</b> (لذلك، للنتيجة) · <b>finally</b> (أخيرًا).\n' +
          '- مثال: <b>First</b> we checked the network, <b>then</b> we found the wrong value, <b>so</b> we raised the limit.\n' +
          '- الترتيب يجعل شرحكِ سهل المتابعة ويُظهر تفكيركِ المنهجي.',
      },
      {
        type: 'formula',
        content:
          '<b>First</b>, subject + V2 … <b>then</b> subject + V2 … <b>so</b> subject + V2 … <b>Finally</b>, …',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'First we checked the network connection.',
            highlight: 'First we checked',
            translation_ar: 'أولًا فحصنا اتصال الشبكة.',
          },
          {
            sentence: 'Then we found the wrong value in the config file.',
            highlight: 'Then we found',
            translation_ar: 'بعدها وجدنا القيمة الخاطئة في ملف الإعدادات.',
          },
          {
            sentence: 'So we raised the limit and restarted the service.',
            highlight: 'So we raised',
            translation_ar: 'لذلك رفعنا الحدّ وأعدنا تشغيل الخدمة.',
          },
          {
            sentence: 'Finally, we monitored the system for two hours.',
            highlight: 'Finally, we monitored',
            translation_ar: 'وأخيرًا راقبنا النظام لمدّة ساعتين.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'First we check the network, then we find the value.',
            correct: 'First we checked the network, then we found the value.',
            explanation_ar: 'سرد خطوات انتهت يكون بالماضي البسيط لا بالمضارع.',
          },
          {
            wrong: 'After that, we have restarted the service.',
            correct: 'After that, we restarted the service.',
            explanation_ar: 'داخل سرد متسلسل في الماضي نُكمل بالماضي البسيط.',
          },
          {
            wrong: 'We raised the limit, finally we monitor it.',
            correct: 'We raised the limit, and finally we monitored it.',
            explanation_ar: 'حافظي على الزمن نفسه في كل خطوات السرد.',
          },
        ],
      },
    ],
  },

  // ── Unit 4 — Question Forms + Polite Clarification ──────────────────────
  {
    id: 'd5217dd9-2676-4362-9de0-7754cda54818',
    unit: 4,
    topic: 'Question Forms + Polite Clarification',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Question Forms + Polite Clarification</b><br><br>' +
          '• Yes/No questions: <b>Does</b> it happen on both? <b>Did</b> it start after the update?<br>' +
          '• Wh- questions: <b>Which</b> endpoint returns the error? <b>When</b> did it start?<br>' +
          '• After <b>does</b> and <b>did</b>, the main verb goes back to its base form.<br>' +
          '• Polite clarification: <i>Just to confirm, …</i> / <i>Let me clarify, …</i> / <i>Sorry, could you repeat that?</i><br>' +
          '• Short answers keep the call moving: Yes, it does. / No, it doesn\'t. / Exactly.',
        content_ar:
          '- أسئلة نعم/لا: <b>Does</b> it happen on both? · <b>Did</b> it start after the update?\n' +
          '- أسئلة الاستفهام: <b>Which</b> endpoint returns the error? · <b>When</b> did it start?\n' +
          '- بعد does و did يعود الفعل الأصلي إلى صيغته المجرّدة.\n' +
          '- للتوضيح المهذّب: «Just to confirm, …» أو «Let me clarify, …» أو «Sorry, could you repeat that?»\n' +
          '- والإجابات القصيرة تُبقي الحوار سريعًا: Yes, it does. / No, it doesn\'t. / Exactly.',
      },
      {
        type: 'formula',
        content:
          '<b>Do / Does / Did</b> + subject + <b>base verb</b>?<br>' +
          '<b>Wh-</b> + do/does/did + subject + <b>base verb</b>?',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'Does it happen on both browsers?',
            highlight: 'Does it happen',
            translation_ar: 'هل تحدث المشكلة في المتصفّحين معًا؟',
          },
          {
            sentence: 'Did it start after the last update?',
            highlight: 'Did it start',
            translation_ar: 'هل بدأت بعد التحديث الأخير؟',
          },
          {
            sentence: 'Which endpoint returns the error?',
            highlight: 'Which endpoint returns',
            translation_ar: 'أيّ نقطة نهاية تُرجِع الخطأ؟',
          },
          {
            sentence: 'Just to confirm, the issue only appears on mobile?',
            highlight: 'Just to confirm',
            translation_ar: 'فقط للتأكيد، المشكلة تظهر على الجوال فقط؟',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'Did it started after the update?',
            correct: 'Did it start after the update?',
            explanation_ar: 'بعد did يعود الفعل إلى صيغته المجرّدة.',
          },
          {
            wrong: 'Does the dashboard freezes on both?',
            correct: 'Does the dashboard freeze on both?',
            explanation_ar: 'مع does لا نضيف s إلى الفعل الأصلي.',
          },
          {
            wrong: 'Which endpoint does return the error?',
            correct: 'Which endpoint returns the error?',
            explanation_ar: 'حين تكون كلمة الاستفهام هي الفاعل نفسه لا نحتاج does.',
          },
        ],
      },
    ],
  },

  // ── Unit 5 — Expressing Necessity and Urgency ───────────────────────────
  {
    id: '68e8ed26-b807-4751-a823-ed0a9cb75120',
    unit: 5,
    topic: 'Expressing Necessity and Urgency',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Expressing Necessity and Urgency</b><br><br>' +
          '• <b>need to</b> = a strong need: <i>We need to act now.</i><br>' +
          '• <b>have to</b> = obligation / no choice: <i>We have to add storage.</i><br>' +
          '• <b>should</b> = advice / recommendation, softer: <i>It should be treated as top priority.</i><br>' +
          '• All three take the <b>base verb</b> — no <i>to</i> after <b>should</b>.<br>' +
          '• When escalating, use need to / have to to show urgency clearly without exaggerating.',
        content_ar:
          '- <b>need to</b> = نحتاج أن (حاجة قوية): We <b>need to</b> act now.\n' +
          '- <b>have to</b> = علينا أن / مضطرّون (إلزام خارجي): We <b>have to</b> add storage.\n' +
          '- <b>should</b> = ينبغي (نصيحة أو توصية أقلّ قوة): It <b>should</b> be treated as top priority.\n' +
          '- الثلاثة يتبعها الفعل المجرّد، ولا نضع to بعد should.\n' +
          '- وللتصعيد استخدمي need to أو have to لإظهار الإلحاح بوضوح دون مبالغة.',
      },
      {
        type: 'formula',
        content:
          'subject + <b>need to / have to / should</b> + base verb<br>' +
          'he / she / it + <b>needs to · has to · should</b>',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'We need to act now before the queue grows.',
            highlight: 'need to act',
            translation_ar: 'نحتاج أن نتحرّك الآن قبل أن يكبر الطابور.',
          },
          {
            sentence: 'We have to add storage before Thursday.',
            highlight: 'have to add',
            translation_ar: 'علينا إضافة مساحة تخزين قبل الخميس.',
          },
          {
            sentence: 'This should be treated as top priority.',
            highlight: 'should be treated',
            translation_ar: 'ينبغي التعامل مع هذا بأعلى أولوية.',
          },
          {
            sentence: 'The vendor has to confirm the fix in writing.',
            highlight: 'has to confirm',
            translation_ar: 'على المورِّد تأكيد الإصلاح كتابيًّا.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'We need act now.',
            correct: 'We need to act now.',
            explanation_ar: 'صيغة need to تحتفظ بـ to قبل الفعل.',
          },
          {
            wrong: 'It should to be treated as top priority.',
            correct: 'It should be treated as top priority.',
            explanation_ar: 'بعد should يأتي الفعل مجرّدًا بدون to.',
          },
          {
            wrong: 'The vendor have to confirm the fix.',
            correct: 'The vendor has to confirm the fix.',
            explanation_ar: 'مع الفاعل المفرد نستخدم has to.',
          },
        ],
      },
    ],
  },

  // ── Unit 6 — Present Perfect + Present Continuous ───────────────────────
  {
    id: 'a10709e0-8956-4791-a9e7-740b02f17ddd',
    unit: 6,
    topic: 'Present Perfect + Present Continuous',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Present Perfect + Present Continuous</b><br><br>' +
          '• Present perfect for completed work with a result now: <b>We have deployed the fix.</b><br>' +
          '• Present continuous for what is happening now / this period: <b>We are monitoring it</b> · <b>I am working on the backup.</b><br>' +
          '• In a standup: use the perfect for what is done, the continuous for what is in progress — a clear picture of your status.',
        content_ar:
          '- <b>المضارع التام</b> لِما أُنجز وأثره باقٍ الآن: we <b>have deployed</b> the fix.\n' +
          '- <b>المضارع المستمر</b> لِما يحدث الآن أو في هذه الفترة: we <b>are monitoring</b> it · I <b>am working</b> on the backup.\n' +
          '- في التحديث اليومي: استخدمي التام للمنجَز، والمستمر لِما هو قيد التنفيذ — فتعطين صورة واضحة عن حالتكِ.',
      },
      {
        type: 'formula',
        content:
          'done: subject + <b>have / has</b> + past participle<br>' +
          'in progress: subject + <b>am / is / are</b> + verb-ing',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'We have deployed the fix to production.',
            highlight: 'have deployed',
            translation_ar: 'نشرنا الإصلاح على بيئة الإنتاج.',
          },
          {
            sentence: 'We are monitoring the error rate this morning.',
            highlight: 'are monitoring',
            translation_ar: 'نراقب معدّل الأخطاء هذا الصباح.',
          },
          {
            sentence: 'I am working on the backup schedule today.',
            highlight: 'am working',
            translation_ar: 'أعمل اليوم على جدول النسخ الاحتياطي.',
          },
          {
            sentence: 'The team has closed all the high-priority tickets.',
            highlight: 'has closed',
            translation_ar: 'أغلق الفريق جميع التذاكر عالية الأولوية.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'We are deployed the fix.',
            correct: 'We have deployed the fix.',
            explanation_ar: 'المضارع التام يُبنى بـ have/has لا بـ are.',
          },
          {
            wrong: 'I working on the backup today.',
            correct: 'I am working on the backup today.',
            explanation_ar: 'المضارع المستمر يحتاج am/is/are قبل الفعل.',
          },
          {
            wrong: 'The team have closed all the tickets.',
            correct: 'The team has closed all the tickets.',
            explanation_ar: 'كلمة team هنا وحدة واحدة، فتأخذ has.',
          },
        ],
      },
    ],
  },

  // ── Unit 7 — Clear Reporting Sentences + Passive Voice ──────────────────
  {
    id: 'f360a039-f177-4308-bce0-bd3be5758469',
    unit: 7,
    topic: 'Clear Reporting Sentences + Passive Voice',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Clear Reporting Sentences + Passive Voice</b><br><br>' +
          '• Reports focus on the event, not the doer, so we use the passive: <b>The issue was resolved at 09:41.</b> · <b>Traffic was moved to a backup server.</b><br>' +
          '• Form: <b>was / were</b> + past participle.<br>' +
          '• Add <b>by …</b> only when the doer matters.<br>' +
          '• Use short, clear sentences and start each section with its label — Summary / Impact / Resolution / Next steps.',
        content_ar:
          '- في التقارير نركّز على الحدث لا الفاعل، فنستخدم <b>المبني للمجهول</b>: the issue <b>was resolved</b> at 09:41 · traffic <b>was moved</b> to a backup server.\n' +
          '- التكوين: <b>was/were</b> + التصريف الثالث للفعل.\n' +
          '- ونضيف <b>by</b> فقط حين يكون المنفِّذ مهمًّا.\n' +
          '- استخدمي جُمَلًا قصيرة وواضحة، وابدئي كل قسم بعنوانه: Summary / Impact / Resolution / Next steps.',
      },
      {
        type: 'formula',
        content: 'subject + <b>was / were</b> + past participle ( + by + doer )',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'The issue was resolved at 09:41.',
            highlight: 'was resolved',
            translation_ar: 'حُلّت المشكلة الساعة ٩:٤١.',
          },
          {
            sentence: 'Traffic was moved to a backup server.',
            highlight: 'was moved',
            translation_ar: 'نُقلت حركة البيانات إلى خادم احتياطي.',
          },
          {
            sentence: 'Around ninety orders were delayed during the outage.',
            highlight: 'were delayed',
            translation_ar: 'تأخّر نحو تسعين طلبًا أثناء الانقطاع.',
          },
          {
            sentence: 'The root cause was identified by the network team.',
            highlight: 'was identified by the network team',
            translation_ar: 'حُدِّد السبب الجذري من قِبَل فريق الشبكة.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'The issue was resolve at 09:41.',
            correct: 'The issue was resolved at 09:41.',
            explanation_ar: 'المبني للمجهول يحتاج التصريف الثالث للفعل.',
          },
          {
            wrong: 'Around ninety orders was delayed.',
            correct: 'Around ninety orders were delayed.',
            explanation_ar: 'مع الجمع نستخدم were لا was.',
          },
          {
            wrong: 'Traffic moved to a backup server by us.',
            correct: 'Traffic was moved to a backup server.',
            explanation_ar: 'لا يصحّ حذف was/were، وذكر المنفِّذ غير ضروري هنا.',
          },
        ],
      },
    ],
  },

  // ── Unit 8 — Simplifying for non-technical people ───────────────────────
  {
    id: 'e482a038-7b69-431a-b102-8cb8da720805',
    unit: 8,
    topic: 'Simplifying: Short Sentences + "which means / so"',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Simplifying: Short Sentences + "which means / so"</b><br><br>' +
          '• For non-technical people: short sentences, one idea each, no jargon.<br>' +
          '• Turn the technical part into a result with <b>…, which means …</b> or <b>…, so …</b><br>' +
          '<i>The server stopped, <b>so</b> customers could not pay.</i><br>' +
          '<i>Around ninety orders failed, <b>which means</b> a short delay for those customers.</i><br>' +
          '• <b>so</b> introduces a clause; <b>which means</b> can introduce a clause or a noun phrase.',
        content_ar:
          '- لغير التقنيين: جُمَل قصيرة، فكرة واحدة في كل جملة، وتجنّبي المصطلحات.\n' +
          '- ولترجمة التقني إلى نتيجة استخدمي «…, <b>which means</b> …» أو «…, <b>so</b> …».\n' +
          '- مثال: The server stopped, <b>so</b> customers could not pay → around ninety orders failed, <b>which means</b> a short delay for them.\n' +
          '- <b>so</b> يتبعها جملة كاملة، أمّا <b>which means</b> فيمكن أن يتبعها جملة أو عبارة اسمية.\n' +
          '- هذا يحوّل كلامكِ من تقني إلى مفهوم لأيّ شخص.',
      },
      {
        type: 'formula',
        content:
          'technical fact<b>, so</b> + subject + verb<br>' +
          'technical fact<b>, which means</b> + clause / noun phrase',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'The server stopped, so customers could not pay.',
            highlight: 'so customers could not pay',
            translation_ar: 'توقّف الخادم، لذلك لم يتمكّن العملاء من الدفع.',
          },
          {
            sentence: 'Around ninety orders failed, which means a short delay for those customers.',
            highlight: 'which means a short delay',
            translation_ar: 'فشل نحو تسعين طلبًا، ما يعني تأخيرًا قصيرًا لأولئك العملاء.',
          },
          {
            sentence: 'The backup ran late, so this morning\'s report is missing two hours of data.',
            highlight: 'so this morning\'s report is missing',
            translation_ar: 'تأخّر النسخ الاحتياطي، لذلك ينقص تقرير هذا الصباح ساعتين من البيانات.',
          },
          {
            sentence: 'We moved the traffic, which means the site is available again.',
            highlight: 'which means the site is available',
            translation_ar: 'نقلنا حركة البيانات، ما يعني أنّ الموقع متاح مرّة أخرى.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'The server stopped, which means customers.',
            correct: 'The server stopped, which means customers could not pay.',
            explanation_ar: 'أكملي النتيجة؛ which means تحتاج جملة أو عبارة اسمية واضحة.',
          },
          {
            wrong: 'The server stopped so that customers could not pay.',
            correct: 'The server stopped, so customers could not pay.',
            explanation_ar: '«so that» تعني «لكي» وتفيد الهدف؛ وللنتيجة نستخدم «so» وحدها.',
          },
          {
            wrong: 'The latency increased, that means a delay.',
            correct: 'The latency increased, which means a delay.',
            explanation_ar: 'نستخدم which means للإشارة إلى الجملة السابقة، لا that means.',
          },
        ],
      },
    ],
  },
]
