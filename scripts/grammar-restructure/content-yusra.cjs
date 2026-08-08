/**
 * يسرا خوجة — «رؤى» custom B2 business-analyst track.
 *
 * BEFORE: every one of these 10 lessons was a SINGLE `explanation` section —
 * a 570-809 character English paragraph plus a 1,000-1,226 character Arabic
 * paragraph, with no formula, no examples and no common-mistakes card. The
 * Arabic already carried \n structure, but the renderer collapsed it, so the
 * student saw one unbroken wall of text.
 *
 * AFTER: the same teaching content, restructured into the shape the renderer
 * (and the rest of the curriculum) already supports — labelled rule groups,
 * a formula, a comparison table where the rule IS a mapping, four worked
 * examples in her own analyst context, and three real learner mistakes.
 *
 * Arabic is written in the feminine second person (she is the only student on
 * this track); `useGenderize` flips it for any male reader.
 */

module.exports = [
  // ── Unit 1 — Indirect / polite questions ────────────────────────────────
  {
    id: '8a8bcb81-70a2-40ed-9203-31e276289a3e',
    unit: 1,
    topic: 'Indirect / polite questions',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>What it is</b><br>' +
          'An indirect question wraps a direct question inside an opening phrase — <i>Could you tell me…</i>, <i>I was wondering whether…</i>, <i>Do you know if…</i> — so a discovery call sounds collaborative instead of interrogative.<br><br>' +
          '<b>Two things change after the opener</b><br>' +
          '1. Word order goes back to statement order: subject + verb.<br>' +
          '2. The auxiliary <b>do / does / did</b> disappears.<br>' +
          '<i>How does the process work?</i><br>' +
          '<i>→ Could you tell me how the process <b>works</b>?</i><br><br>' +
          '<b>Yes/no questions need if or whether</b><br>' +
          '<i>Has finance approved it?</i><br>' +
          '<i>→ Do you know <b>whether</b> finance has approved it?</i><br><br>' +
          '<b>Wh- questions keep the question word, lose the inversion</b><br>' +
          '<i>Why is the report late?</i><br>' +
          '<i>→ Could you tell me why the report <b>is</b> late?</i>',
        content_ar:
          'الأسئلة غير المباشرة طريقة مهذّبة لطرح ما تريدين معرفته، وهي أساسية في مكالمة الاكتشاف حيث تريدين أن يشعر العميل بالارتياح لا بالاستجواب.\n\n' +
          'بدل السؤال المباشر نغلّفه بعبارة تمهيدية مثل <b>Could you tell me…</b> أو <b>I was wondering whether…</b> أو <b>Do you know if…</b>\n\n' +
          'والقاعدة الأهم: بعد العبارة التمهيدية يعود ترتيب الجملة إلى الترتيب الخبري (فاعل ثم فعل)، ويُحذف الفعل المساعد <b>do/does/did</b>.\n\n' +
          '- أسئلة نعم/لا تُربَط بـ <b>if</b> أو <b>whether</b>.\n' +
          '- أسئلة الاستفهام (what, why, when, where, who) تُبقي الكلمة الاستفهامية ثم تُكمل بترتيب خبري.\n\n' +
          'استخدميها عند فتح المكالمة، وعند طلب معلومة حسّاسة (الميزانية، أو من يملك قرار الاعتماد)، وعند التأكد من فهمكِ.',
      },
      {
        type: 'formula',
        content:
          'opener + <b>wh-word / if / whether</b> + subject + verb<br>' +
          'Could you tell me <b>how</b> the process <b>works</b>?<br>' +
          'no <b>do / does / did</b> · no inversion',
      },
      {
        type: 'table',
        title_ar: 'من المباشر إلى غير المباشر',
        columns: [{ label_ar: 'مباشر' }, { label_ar: 'غير مباشر (مهذّب)' }],
        rows: [
          ['How does the process work?', 'Could you tell me how the process works?'],
          ['Who approves the budget?', 'Do you know who approves the budget?'],
          ['Has finance signed off?', 'I was wondering whether finance has signed off.'],
          ['Why is the report late?', 'Could you tell me why the report is late?'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'Could you tell me how the current approval process works?',
            highlight: 'how the current approval process works',
            translation_ar: 'هل يمكنكِ إخباري كيف تسير عملية الاعتماد الحالية؟',
          },
          {
            sentence: 'I was wondering whether the finance team has approved the budget.',
            highlight: 'whether the finance team has approved',
            translation_ar: 'كنتُ أتساءل إن كان فريق المالية قد اعتمد الميزانية.',
          },
          {
            sentence: 'Do you know who owns the final decision on this?',
            highlight: 'who owns the final decision',
            translation_ar: 'هل تعرفين مَن يملك القرار النهائي في هذا؟',
          },
          {
            sentence: 'Could you tell me why the monthly report is usually late?',
            highlight: 'why the monthly report is usually late',
            translation_ar: 'هل يمكنكِ إخباري لماذا يتأخّر التقرير الشهري عادةً؟',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'Could you tell me how does the process work?',
            correct: 'Could you tell me how the process works?',
            explanation_ar: 'بعد العبارة التمهيدية لا نُبقي does، والفعل يأخذ s مع الفاعل المفرد.',
          },
          {
            wrong: 'Do you know where is the file?',
            correct: 'Do you know where the file is?',
            explanation_ar: 'لا نقلب الفاعل والفعل داخل السؤال غير المباشر؛ الترتيب خبري.',
          },
          {
            wrong: 'I was wondering that finance approved it.',
            correct: 'I was wondering whether finance had approved it.',
            explanation_ar: 'مع سؤال نعم/لا نستخدم whether أو if، لا that.',
          },
        ],
      },
    ],
  },

  // ── Unit 2 — Reported speech ────────────────────────────────────────────
  {
    id: '66618b26-bf7c-4d3e-bdcb-3f7c3bab3c11',
    unit: 2,
    topic: 'Reported speech',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>What it is</b><br>' +
          'Reported speech tells what someone said without quoting them word for word — exactly what you do when you summarise a stakeholder in a confirmation email or a requirements document.<br><br>' +
          '<b>The backshift</b><br>' +
          'When the reporting verb is past (<b>said, asked, told</b>), the tense usually moves back one step.<br>' +
          '<i>"The report is slow." → He said the report <b>was</b> slow.</i><br><br>' +
          '<b>Reported questions</b><br>' +
          'Keep statement word order — no inversion. Use <b>whether / if</b> for yes/no questions and the same wh-word otherwise.<br>' +
          '<i>"Can we change the scope?" → She asked <b>whether</b> we <b>could</b> change the scope.</i><br><br>' +
          '<b>say vs tell</b><br>' +
          'You <b>say</b> something. You <b>tell somebody</b> something.<br><br>' +
          '<b>When you do NOT backshift</b><br>' +
          'If the fact is still true, or the reporting verb is present, the original tense can stay.<br>' +
          '<i>She says the report <b>is</b> slow.</i>',
        content_ar:
          'الكلام المنقول أن تنقلي ما قاله شخص آخر دون اقتباسه حرفيًّا. في عملكِ كمحلّلة تستخدمينه باستمرار: حين تلخّصين ما قاله صاحب المصلحة، أو ما سأله، أو ما أراده.\n\n' +
          'القاعدة الأساسية هي <b>التراجع الزمني (backshift)</b>: حين يكون فعل النقل في الماضي، يتراجع زمن الجملة خطوةً إلى الوراء (انظري الجدول).\n\n' +
          'ومع الأسئلة المنقولة نستخدم ترتيب الجملة الخبرية — لا نقلب الفاعل والفعل — ونضيف <b>whether/if</b> لسؤال نعم/لا.\n\n' +
          '- الفرق بين say و tell: نقول <b>say something</b>، لكن <b>tell somebody something</b>.\n' +
          '- تتغيّر كذلك كلمات الزمن والإشارة: <b>yesterday</b> تصبح <b>the day before</b>، و<b>this</b> تصبح <b>that</b>.\n\n' +
          'ملاحظة مهمة: التراجع الزمني ليس إلزاميًّا دائمًا. إن كانت الحقيقة ما زالت صحيحة، أو كان فعل النقل في المضارع، جاز إبقاء الزمن كما هو.',
      },
      {
        type: 'formula',
        content:
          'said / told + (that) + subject + <b>verb one step back</b><br>' +
          'asked + (somebody) + <b>whether / if / wh-</b> + subject + verb',
      },
      {
        type: 'table',
        title_ar: 'جدول التراجع الزمني',
        columns: [{ label_ar: 'الكلام المباشر' }, { label_ar: 'الكلام المنقول' }],
        rows: [
          ['is / are (present simple)', 'was / were (past simple)'],
          ['works (present simple)', 'worked (past simple)'],
          ['will', 'would'],
          ['can', 'could'],
          ['has / have finished', 'had finished'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'He said the monthly report was too slow for the finance team.',
            highlight: 'said the monthly report was',
            translation_ar: 'قال إنّ التقرير الشهري بطيء جدًّا بالنسبة لفريق المالية.',
          },
          {
            sentence: 'She told me they would finish the migration the following week.',
            highlight: 'told me they would finish',
            translation_ar: 'أخبرتني أنّهم سينهون الترحيل في الأسبوع التالي.',
          },
          {
            sentence: 'The sponsor asked whether we could change the scope.',
            highlight: 'asked whether we could change',
            translation_ar: 'سأل الراعي إن كان بإمكاننا تغيير النطاق.',
          },
          {
            sentence: 'They asked when the new dashboard would go live.',
            highlight: 'when the new dashboard would go live',
            translation_ar: 'سألوا متى ستُطلَق لوحة البيانات الجديدة.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'He said me the report was late.',
            correct: 'He told me the report was late.',
            explanation_ar: 'say لا يأخذ مفعولًا شخصيًّا مباشرًا؛ نقول tell somebody أو say to somebody.',
          },
          {
            wrong: 'She asked whether can we change the scope.',
            correct: 'She asked whether we could change the scope.',
            explanation_ar: 'السؤال المنقول يأخذ ترتيبًا خبريًّا، و can تتراجع إلى could.',
          },
          {
            wrong: 'He said that he will send it yesterday.',
            correct: 'He said that he would send it the day before.',
            explanation_ar: 'will تتراجع إلى would، و yesterday تصبح the day before في الكلام المنقول.',
          },
        ],
      },
    ],
  },

  // ── Unit 3 — Passive + sequencers ───────────────────────────────────────
  {
    id: 'e3a09c0f-f686-48e0-b7fa-2fd28b1e0454',
    unit: 3,
    topic: 'The passive + sequencers for describing processes',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Why the passive</b><br>' +
          'When you map a process, the step matters more than the person doing it, so the doer moves out of the subject position.<br>' +
          '<i>The invoice <b>is approved</b> by finance.</i><br>' +
          '<i>The tickets <b>are routed</b> automatically.</i><br><br>' +
          '<b>Form</b><br>' +
          'subject + <b>is / are</b> + past participle. Name the doer after <b>by</b> only when it matters; drop it when it does not.<br><br>' +
          '<b>Agreement</b><br>' +
          'Use <b>is</b> with a singular subject and with <b>each</b>; use <b>are</b> with a plural.<br>' +
          '<i>Each report <b>is</b> checked before it is sent.</i><br><br>' +
          '<b>Sequencers order the steps</b><br>' +
          'First · Then · After that · Once · Finally — normally at the start of the sentence, leading the reader step by step.',
        content_ar:
          'عند وصف عملية عمل — كسير الفواتير أو اعتماد الطلبات — نركّز على الخطوة نفسها لا على من يقوم بها، ولهذا نستخدم <b>المبني للمجهول</b>.\n\n' +
          'التكوين في المضارع البسيط: فاعل + <b>is/are</b> + التصريف الثالث للفعل. ويمكن ذكر مَن ينفّذ الخطوة بعد <b>by</b> إذا كان مهمًّا، أو حذفه إن لم يكن كذلك.\n\n' +
          '- The invoice is approved by finance. (تُعتمَد الفاتورة من قِبَل المالية.)\n' +
          '- The tickets are routed automatically. (تُوجَّه التذاكر تلقائيًّا.)\n\n' +
          'ولترتيب الخطوات نستعمل أدوات الترتيب: <b>First</b> ثم <b>Then</b> ثم <b>After that</b> و<b>Once</b> و<b>Finally</b>، وتوضع عادةً في بداية الجملة.\n\n' +
          'وانتبهي إلى المطابقة: مع الفاعل المفرد ومع each نستخدم <b>is</b>، ومع الجمع نستخدم <b>are</b>.',
      },
      {
        type: 'formula',
        content:
          'subject + <b>is / are</b> + past participle ( + by + doer )<br>' +
          'First… <b>Then</b>… <b>After that</b>… <b>Once</b>… <b>Finally</b>…',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'First, the request is logged in the service desk.',
            highlight: 'is logged',
            translation_ar: 'أولًا، يُسجَّل الطلب في مكتب الخدمة.',
          },
          {
            sentence: 'Then it is reviewed by a line manager.',
            highlight: 'is reviewed by a line manager',
            translation_ar: 'ثم يُراجَع من قِبَل مدير مباشر.',
          },
          {
            sentence: 'Once it has been approved, the payment is released.',
            highlight: 'has been approved',
            translation_ar: 'وبمجرّد اعتماده، يُصرَف الدفع.',
          },
          {
            sentence: 'Finally, each report is checked before it is sent to the client.',
            highlight: 'each report is checked',
            translation_ar: 'وأخيرًا، يُراجَع كل تقرير قبل إرساله إلى العميل.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'The invoice is approve by finance.',
            correct: 'The invoice is approved by finance.',
            explanation_ar: 'المبني للمجهول يحتاج التصريف الثالث للفعل، لا المجرّد.',
          },
          {
            wrong: 'Each report are checked before sending.',
            correct: 'Each report is checked before it is sent.',
            explanation_ar: 'كلمة each تُعامَل معاملة المفرد، فيأتي بعدها is.',
          },
          {
            wrong: 'The request logged, then reviewed.',
            correct: 'The request is logged, then it is reviewed.',
            explanation_ar: 'لا يصحّ حذف is/are؛ فعل الكينونة جزء أساسي من المبني للمجهول.',
          },
        ],
      },
    ],
  },

  // ── Unit 4 — Present perfect vs past simple ─────────────────────────────
  {
    id: '0e8e2c3c-8d68-4362-a7f2-a49134fd3889',
    unit: 4,
    topic: 'Present perfect vs past simple (reporting results)',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Past simple — a finished time</b><br>' +
          'Use it when the action is finished and the time is finished too: <i>last quarter, in 2023, two weeks ago</i>.<br>' +
          '<i>Sales <b>increased</b> 12% last quarter.</i><br><br>' +
          '<b>Present perfect — the result matters now</b><br>' +
          'Use it for an unfinished period (<i>this quarter, so far, recently</i>), or when the time is not stated but the effect is current.<br>' +
          '<i>We <b>have found</b> that customers churn in month two.</i><br>' +
          '<i>Revenue <b>has risen</b> 8% so far this year.</i><br><br>' +
          '<b>Rule of thumb</b><br>' +
          'A finished time marker points to the past simple. Presenting a finding whose relevance continues points to the present perfect — which is why the opening of a results deck is usually <i>we have found…</i>',
        content_ar:
          'عند عرض نتائجكِ أمام أصحاب المصلحة، يغيّر اختياركِ بين الزمنين المعنى تمامًا.\n\n' +
          'استخدمي <b>الماضي البسيط</b> لحدثٍ انتهى في وقتٍ محدّد ومنتهٍ، مع إشارات مثل last quarter و in 2023 و two weeks ago.\n\n' +
          'واستخدمي <b>المضارع التام</b> حين تربطين النتيجة بالحاضر، أو حين تكون الفترة ما زالت مفتوحة (this quarter, so far, recently)، أو حين لا يهمّ الوقت بل الأثر الآن.\n\n' +
          'القاعدة العملية: إذا ذكرتِ وقتًا محدّدًا منتهيًا فالماضي البسيط. أمّا في مقدّمة العرض عند تقديم ما توصّلتِ إليه فالمضارع التام أنسب، لأنّه يُبقي الأثر حاضرًا أمام الحضور.',
      },
      {
        type: 'formula',
        content:
          'past simple: subject + <b>verb-ed / V2</b> + finished time<br>' +
          'present perfect: subject + <b>have / has</b> + past participle',
      },
      {
        type: 'table',
        title_ar: 'الكلمات الدالة على كل زمن',
        columns: [{ label_ar: 'الماضي البسيط' }, { label_ar: 'المضارع التام' }],
        rows: [
          ['last quarter · yesterday', 'so far · up to now'],
          ['in 2023 · in March', 'this quarter · this year'],
          ['two weeks ago', 'recently · lately'],
          ['when we ran the pilot', 'already · just · yet'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'Sales increased 12% last quarter.',
            highlight: 'increased 12% last quarter',
            translation_ar: 'ارتفعت المبيعات ١٢٪ في الربع الماضي.',
          },
          {
            sentence: 'Revenue has risen 8% so far this year.',
            highlight: 'has risen 8% so far',
            translation_ar: 'ارتفعت الإيرادات ٨٪ حتى الآن هذا العام.',
          },
          {
            sentence: 'We have found that most customers leave in the second month.',
            highlight: 'have found',
            translation_ar: 'وجدنا أنّ معظم العملاء يغادرون في الشهر الثاني.',
          },
          {
            sentence: 'We interviewed nine stakeholders in March.',
            highlight: 'interviewed nine stakeholders in March',
            translation_ar: 'أجرينا مقابلات مع تسعة من أصحاب المصلحة في مارس.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'We have interviewed nine stakeholders last month.',
            correct: 'We interviewed nine stakeholders last month.',
            explanation_ar: 'مع وقت منتهٍ محدّد مثل last month نستخدم الماضي البسيط لا المضارع التام.',
          },
          {
            wrong: 'Revenue is risen 8% so far this year.',
            correct: 'Revenue has risen 8% so far this year.',
            explanation_ar: 'المضارع التام يُبنى بـ have/has، لا بـ is/are.',
          },
          {
            wrong: 'So far this year sales increased 8%.',
            correct: 'So far this year sales have increased 8%.',
            explanation_ar: 'العبارة so far this year تدلّ على فترة لم تنتهِ، فتستدعي المضارع التام.',
          },
        ],
      },
    ],
  },

  // ── Unit 5 — Relative clauses ───────────────────────────────────────────
  {
    id: 'ae87845f-3346-4d0e-9be0-8d4caac9b1e0',
    unit: 5,
    topic: 'Relative clauses (defining & non-defining)',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Defining — identifies which one, no commas</b><br>' +
          'Use <b>who / whose</b> for people, <b>which / that</b> for things, <b>where</b> for places.<br>' +
          '<i>The users <b>who have the Manager role</b> receive the report.</i><br><br>' +
          '<b>Non-defining — extra detail, between commas</b><br>' +
          'Never use <b>that</b> here; use <b>which</b> or <b>who</b>.<br>' +
          '<i>The report, <b>which is sent every Monday</b>, must show approved data only.</i><br><br>' +
          '<b>whose = possession</b><br>' +
          '<i>A requirement <b>whose meaning is unclear</b> will be rewritten.</i><br><br>' +
          '<b>The test</b><br>' +
          'Remove the clause. If you no longer know which thing you mean, it is defining (no commas). If the sentence still works and you just lost a detail, it is non-defining (commas).',
        content_ar:
          'الجُمَل الوصفية تربط معلومة إضافية بالاسم دون بدء جملة جديدة، وهي أداتك الأساسية لكتابة متطلَّبات دقيقة لا تحتمل تأويلين.\n\n' +
          '<b>المُعرِّفة (defining)</b> تحدّد أيّ شيء نقصد بالضبط، ولا فاصلة قبلها. للأشخاص who أو whose، وللأشياء which أو that، وللمكان where.\n' +
          'The users who have the Manager role receive the report.\n' +
          'المستخدمون الذين يملكون دور «مدير» يستلمون التقرير — بدون هذه الجملة لا نعرف أيّ مستخدمين.\n\n' +
          '<b>غير المُعرِّفة (non-defining)</b> تضيف معلومة عن شيء معروف أصلًا، ونحيطها بفاصلتين، ولا نستخدم that فيها.\n' +
          'The report, which is sent every Monday, must show approved data only.\n' +
          'التقرير، الذي يُرسَل كل اثنين، يجب أن يعرض البيانات المعتمدة فقط.\n\n' +
          'وللملكية استخدمي <b>whose</b>.\n\n' +
          'القاعدة العملية: إن كانت المعلومة ضرورية لتحديد المقصود فهي مُعرِّفة (بلا فواصل)، وإن كانت مجرّد إضافة فهي غير مُعرِّفة (بين فاصلتين).',
      },
      {
        type: 'formula',
        content:
          'defining: noun + <b>who / which / that / where</b> + clause &nbsp;(no commas)<br>' +
          'non-defining: noun<b>,</b> <b>who / which</b> + clause<b>,</b> …',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'The users who have the Manager role receive the weekly report.',
            highlight: 'who have the Manager role',
            translation_ar: 'المستخدمون الذين يملكون دور «مدير» يستلمون التقرير الأسبوعي.',
          },
          {
            sentence: 'The report, which is sent every Monday, must show approved data only.',
            highlight: 'which is sent every Monday',
            translation_ar: 'التقرير، الذي يُرسَل كل اثنين، يجب أن يعرض البيانات المعتمدة فقط.',
          },
          {
            sentence: 'A requirement whose meaning is unclear will be rewritten.',
            highlight: 'whose meaning is unclear',
            translation_ar: 'أيّ متطلَّب معناه غير واضح ستُعاد كتابته.',
          },
          {
            sentence: 'This is the screen where the approver adds a comment.',
            highlight: 'where the approver adds a comment',
            translation_ar: 'هذه هي الشاشة التي يضيف فيها المعتمِد ملاحظته.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'The report, that is sent every Monday, must show approved data.',
            correct: 'The report, which is sent every Monday, must show approved data.',
            explanation_ar: 'لا نستخدم that في الجملة غير المُعرِّفة بين فاصلتين؛ نستخدم which.',
          },
          {
            wrong: 'The users which have the Manager role receive the report.',
            correct: 'The users who have the Manager role receive the report.',
            explanation_ar: 'which للأشياء؛ للأشخاص نستخدم who.',
          },
          {
            wrong: 'A requirement who its meaning is unclear will be rewritten.',
            correct: 'A requirement whose meaning is unclear will be rewritten.',
            explanation_ar: 'للملكية نستخدم whose بدل «who its».',
          },
        ],
      },
    ],
  },

  // ── Unit 6 — Modals of recommendation and advice ────────────────────────
  {
    id: '3d6dbe10-ca4e-4ca8-bcb0-07867e55d2b1',
    unit: 6,
    topic: 'Modals of recommendation and advice',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>should / ought to + base verb</b> — firm, clear advice.<br>' +
          '<i>You <b>should</b> upgrade the old servers first.</i><br><br>' +
          "<b>I'd recommend / I'd suggest + -ing</b> — a polite professional recommendation. These take <b>-ing</b>, not <i>to</i>.<br>" +
          "<i>I'd recommend <b>running</b> a short pilot.</i><br><br>" +
          '<b>It would be better to + base verb</b> — a gentle comparison of two options.<br>' +
          '<i>It would be better to delay the launch than to risk a security gap.</i><br><br>' +
          '<b>You might want to + base verb</b> — a soft, low-pressure suggestion.<br>' +
          '<i>You might want to reconsider the cheaper vendor.</i><br><br>' +
          "<b>You'd better + base verb</b> — strong advice with an implied warning.<br>" +
          "<i>You'd better choose the option with real support.</i><br><br>" +
          '<b>Choosing the strength</b><br>' +
          'The more certain you are, the stronger the modal. The more room you want to leave the client, the softer it should be.',
        content_ar:
          'أفعال النصح والتوصية هي أدواتكِ حين تقترحين على العميل أو الفريق ما ينبغي فعله دون أن تبدو أوامر جافّة.\n\n' +
          '- <b>should / ought to</b> + الفعل المجرّد: نصيحة قوية وواضحة.\n' +
          "- <b>I'd recommend / I'd suggest</b> + الفعل بصيغة ing: توصية مهنية مهذّبة — لاحظي أنها تأخذ ing لا to.\n" +
          '- <b>It would be better to</b> + الفعل: مقارنة لطيفة بين خيارين.\n' +
          '- <b>You might want to</b> + الفعل: اقتراح خفيف غير مُلزِم، مناسب حين لا تريدين الضغط.\n' +
          "- <b>You'd better</b> + الفعل: نصيحة قوية فيها تحذير ضمني.\n\n" +
          'القاعدة الذهبية في عملكِ: كلّما اشتدّت ثقتكِ استعملي should أو ought to، وكلّما أردتِ ترك المساحة للعميل استعملي might want to.',
      },
      {
        type: 'formula',
        content:
          'should / ought to / might want to / had better + <b>base verb</b><br>' +
          "I'd recommend / I'd suggest + <b>verb-ing</b><br>" +
          'It would be better <b>to</b> + base verb',
      },
      {
        type: 'table',
        title_ar: 'من الأقوى إلى الألطف',
        columns: [{ label_ar: 'الصيغة' }, { label_ar: 'القوّة' }],
        rows: [
          ["You'd better upgrade now.", 'نصيحة قوية مع تحذير ضمني'],
          ['You should upgrade the servers.', 'نصيحة واضحة'],
          ["I'd recommend running a pilot.", 'توصية مهنية مهذّبة'],
          ['You might want to reconsider.', 'اقتراح خفيف غير مُلزِم'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'You should upgrade the old servers before the migration.',
            highlight: 'should upgrade',
            translation_ar: 'ينبغي أن تُحدّثي الخوادم القديمة قبل الترحيل.',
          },
          {
            sentence: "I'd recommend running a short pilot with one team first.",
            highlight: 'recommend running',
            translation_ar: 'أوصي بإجراء تجربة قصيرة مع فريق واحد أولًا.',
          },
          {
            sentence: 'It would be better to delay the launch than to risk a security gap.',
            highlight: 'would be better to delay',
            translation_ar: 'من الأنسب تأجيل الإطلاق بدل المخاطرة بثغرة أمنية.',
          },
          {
            sentence: 'You might want to reconsider the cheaper vendor.',
            highlight: 'might want to reconsider',
            translation_ar: 'قد ترغبين في إعادة النظر في المورِّد الأرخص.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: "I'd recommend to run a pilot.",
            correct: "I'd recommend running a pilot.",
            explanation_ar: 'بعد recommend و suggest يأتي الفعل بصيغة ing، لا المصدر بـ to.',
          },
          {
            wrong: 'You should to upgrade the servers.',
            correct: 'You should upgrade the servers.',
            explanation_ar: 'بعد should يأتي الفعل مجرّدًا بدون to.',
          },
          {
            wrong: 'You had better to choose the supported option.',
            correct: "You'd better choose the supported option.",
            explanation_ar: 'had better يتبعها الفعل المجرّد مباشرةً بدون to.',
          },
        ],
      },
    ],
  },

  // ── Unit 7 — Concession & contrast ──────────────────────────────────────
  {
    id: '6cd87b46-2043-4bc2-95ae-aee491c54c51',
    unit: 7,
    topic: 'Concession & contrast',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>although / even though / though + a full clause</b><br>' +
          'You accept a fact, then say something that works against it.<br>' +
          '<i><b>Although</b> the budget is tight, we can still deliver the core features.</i><br><br>' +
          '<b>however / nevertheless — joining two sentences</b><br>' +
          'They follow a full stop or a semicolon, and take a comma after them.<br>' +
          '<i>The timeline is fixed<b>;</b> <b>however,</b> we can adjust the scope.</i><br><br>' +
          '<b>whereas / while — a direct contrast</b><br>' +
          '<i>The first vendor is cheaper, <b>whereas</b> the second is more reliable.</i><br><br>' +
          '<b>despite / in spite of + a noun or an -ing form</b> (never a full clause)<br>' +
          '<i>We met the deadline <b>despite</b> the reduced budget.</i><br><br>' +
          '<b>The most diplomatic move</b><br>' +
          '<i>While I understand …, we still need to …</i> — acknowledge the concern first, then hold your position.',
        content_ar:
          'أدوات التنازل والتباين تساعدكِ على الإقرار بوجهة نظر الطرف الآخر مع الثبات على موقفكِ — وهي جوهر التعامل مع الاعتراضات.\n\n' +
          '- <b>although</b> و<b>even though</b> و<b>though</b> تُدخل جملة كاملة: تُقرّين بحقيقة ثم تُكملين بما يخالف توقّعها.\n' +
          '- <b>however</b> و<b>nevertheless</b> تربطان جملتين مستقلتين، وتوضَعان بعد نقطة أو فاصلة منقوطة، وبعدهما فاصلة.\n' +
          '- <b>whereas</b> و<b>while</b> تُظهران تباينًا مباشرًا بين طرفين.\n' +
          '- <b>despite</b> و<b>in spite of</b> تأتيان قبل اسم أو فعل بصيغة ing، لا قبل جملة كاملة.\n\n' +
          'والصيغة الأقوى دبلوماسيًّا هي «While I understand…, we still need to…» — تعترفين بالقلق أولًا، ثم تحفظين موقفكِ بلطف.',
      },
      {
        type: 'formula',
        content:
          '<b>Although / Even though</b> + subject + verb, main clause<br>' +
          'sentence<b>;</b> <b>however,</b> sentence<br>' +
          '<b>Despite / In spite of</b> + noun or verb-<b>ing</b>',
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'Although the budget is tight, we can still deliver the core features.',
            highlight: 'Although the budget is tight',
            translation_ar: 'مع أنّ الميزانية محدودة، ما زال بإمكاننا تسليم المزايا الأساسية.',
          },
          {
            sentence: 'The timeline is fixed; however, we can adjust the scope.',
            highlight: 'however',
            translation_ar: 'الموعد ثابت؛ لكن يمكننا تعديل النطاق.',
          },
          {
            sentence: 'The first vendor is cheaper, whereas the second is more reliable.',
            highlight: 'whereas',
            translation_ar: 'المورِّد الأول أرخص، بينما الثاني أكثر موثوقية.',
          },
          {
            sentence: 'We met the deadline despite the reduced budget.',
            highlight: 'despite the reduced budget',
            translation_ar: 'التزمنا بالموعد رغم خفض الميزانية.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'Despite the budget is tight, we delivered on time.',
            correct: 'Although the budget was tight, we delivered on time.',
            explanation_ar: 'بعد despite يأتي اسم أو فعل بصيغة ing؛ ومع الجملة الكاملة نستخدم although.',
          },
          {
            wrong: 'Despite of the delay, the launch went well.',
            correct: 'In spite of the delay, the launch went well.',
            explanation_ar: 'نقول despite بدون of، أو in spite of كاملة — لا «despite of».',
          },
          {
            wrong: 'Although the budget is tight, but we can deliver.',
            correct: 'Although the budget is tight, we can deliver.',
            explanation_ar: 'لا نجمع although مع but في الجملة نفسها؛ واحدة منهما تكفي.',
          },
        ],
      },
    ],
  },

  // ── Unit 8 — Present continuous & present perfect continuous ────────────
  {
    id: '240dc7c7-2f0d-4c58-948d-e15c0961b170',
    unit: 8,
    topic: 'Present continuous & present perfect continuous for progress',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>Present continuous — happening now</b><br>' +
          'am / is / are + -ing, for what is going on right now or around now.<br>' +
          '<i>We <b>are currently testing</b> the payment module.</i><br><br>' +
          '<b>Present perfect continuous — started earlier, still going</b><br>' +
          'have / has been + -ing, usually to stress how long it has taken or how much effort has gone in.<br>' +
          '<i>We <b>have been working</b> on the migration for three weeks.</i><br><br>' +
          '<b>Signal words</b><br>' +
          'currently, right now, at the moment, this week → present continuous.<br>' +
          'for, since, lately, recently, so far → present perfect continuous.<br><br>' +
          '<b>Quick test</b><br>' +
          'If you can add <i>for two weeks</i> or <i>since Monday</i> and it still sounds right, you need <b>have/has been + -ing</b>.',
        content_ar:
          'عند تقديم تحديث الحالة، هناك زمنان يقومان بمعظم العمل.\n\n' +
          '<b>الحاضر المستمر</b> (am/is/are + الفعل + ing) لما يحدث الآن أو في هذه الفترة.\n' +
          'We are currently testing the payment module.\n\n' +
          '<b>الحاضر التام المستمر</b> (have/has been + الفعل + ing) لنشاط بدأ في الماضي وما زال مستمرًّا، وغالبًا للتأكيد على المدة أو الجهد.\n' +
          'We have been working on the migration for three weeks.\n\n' +
          'كلمات دالة: مع الحاضر المستمر تأتي currently و right now و at the moment؛ ومع الحاضر التام المستمر تأتي for و since و lately و so far.\n\n' +
          'اختبار سريع: إذا صحّ أن تضيفي «for two weeks» أو «since Monday»، فالغالب أنكِ تحتاجين have/has been + ing.',
      },
      {
        type: 'formula',
        content:
          'now: subject + <b>am / is / are</b> + verb-ing<br>' +
          'since / for: subject + <b>have / has been</b> + verb-ing',
      },
      {
        type: 'table',
        title_ar: 'أيّ زمن أختار؟',
        columns: [{ label_ar: 'ما تقصدينه' }, { label_ar: 'الصيغة' }],
        rows: [
          ['ما يجري في هذه اللحظة', 'We are testing the module now.'],
          ['نشاط بدأ وما زال — مع مدّة', 'We have been testing it for three days.'],
          ['خطة قريبة متّفق عليها', 'We are meeting the sponsor on Sunday.'],
          ['جهد متواصل حتى الآن', 'I have been reviewing the requirements since Monday.'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'We are currently testing the payment module.',
            highlight: 'are currently testing',
            translation_ar: 'نختبر حاليًّا وحدة الدفع.',
          },
          {
            sentence: 'The team is finalising the requirements document this week.',
            highlight: 'is finalising',
            translation_ar: 'الفريق يُنهي وثيقة المتطلبات هذا الأسبوع.',
          },
          {
            sentence: 'We have been working on the migration for three weeks.',
            highlight: 'have been working',
            translation_ar: 'نعمل على الترحيل منذ ثلاثة أسابيع.',
          },
          {
            sentence: 'I have been reviewing the requirements since Monday.',
            highlight: 'have been reviewing',
            translation_ar: 'أراجع المتطلبات منذ يوم الإثنين.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'We are working on the migration since three weeks.',
            correct: 'We have been working on the migration for three weeks.',
            explanation_ar: 'مع المدّة نستخدم الحاضر التام المستمر، و for مع المدة و since مع نقطة البداية.',
          },
          {
            wrong: 'I have been reviewing the requirements since two weeks.',
            correct: 'I have been reviewing the requirements for two weeks.',
            explanation_ar: 'since تأتي مع نقطة زمنية (Monday, March)، و for تأتي مع المدة (two weeks).',
          },
          {
            wrong: 'We have been finishing the report yesterday.',
            correct: 'We finished the report yesterday.',
            explanation_ar: 'مع وقت منتهٍ محدّد نستخدم الماضي البسيط، لا الحاضر التام المستمر.',
          },
        ],
      },
    ],
  },

  // ── Unit 9 — First & second conditionals ────────────────────────────────
  {
    id: '1e4e17b9-2b45-4b07-abe9-e2c97a8d19c7',
    unit: 9,
    topic: 'First & second conditionals',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>First conditional — a real, likely result</b><br>' +
          'if + present simple, then <b>will</b> + base verb.<br>' +
          '<i><b>If</b> we add this feature, the timeline <b>will</b> slip.</i><br><br>' +
          '<b>Second conditional — hypothetical, or advice</b><br>' +
          'if + past simple, then <b>would</b> + base verb.<br>' +
          '<i><b>If</b> we <b>had</b> more time, we <b>would</b> add the extra report.</i><br>' +
          '<i><b>If I were you</b>, I would phase the delivery.</i> — <b>were</b> is used with every subject in this fixed phrase.<br><br>' +
          '<b>In one line</b><br>' +
          'First conditional = the real impact of going ahead. Second conditional = a what-if option or trade-off that has not happened.<br><br>' +
          '<b>Watch the if-half</b><br>' +
          'Never put <b>will</b> or <b>would</b> after <i>if</i>.',
        content_ar:
          'الجملتان الشرطيتان الأولى والثانية أداتان أساسيتان حين تشرحين أثر أيّ تغيير.\n\n' +
          '<b>الشرطية الأولى</b> تصف احتمالًا واقعيًّا في المستقبل: if + مضارع بسيط، ثم will + الفعل. تستخدمينها للأثر المُرجَّح فعلًا.\n' +
          'If we add this feature, the timeline will slip.\n' +
          'إذا أضفنا هذه الميزة، سيتأخّر الجدول الزمني.\n\n' +
          '<b>الشرطية الثانية</b> تصف موقفًا افتراضيًّا أو غير واقعيّ الآن: if + ماضٍ بسيط، ثم would + الفعل. تستخدمينها لعرض خيارٍ لم يحدث، أو لتقديم نصيحة.\n' +
          'If we had more time, we would include the extra report.\n' +
          'لو كان لدينا وقتٌ أكثر، لأدرجنا التقرير الإضافي.\n\n' +
          'ولاحظي استخدام <b>were</b> مع جميع الضمائر في التعبير الثابت «If I were you».\n\n' +
          'الفكرة العملية: الأولى لِما ستحدث نتيجته فعلًا إن مضيتِ في الطلب، والثانية لعرض «ماذا لو» ومقايضةٍ لم تتحقّق بعد.',
      },
      {
        type: 'formula',
        content:
          '1st: <b>If</b> + present simple, … <b>will</b> + base verb<br>' +
          '2nd: <b>If</b> + past simple, … <b>would</b> + base verb',
      },
      {
        type: 'table',
        title_ar: 'الفرق في سطر',
        columns: [{ label_ar: 'الشرطية الأولى' }, { label_ar: 'الشرطية الثانية' }],
        rows: [
          ['أثر واقعي مُرجَّح', 'افتراض أو مقايضة لم تحدث'],
          ['If we add it, the date will slip.', 'If we had more time, we would add it.'],
          ['if + present simple', 'if + past simple'],
          ['will + base verb', 'would + base verb'],
        ],
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'If we add this feature, the timeline will slip by two weeks.',
            highlight: 'If we add … will slip',
            translation_ar: 'إذا أضفنا هذه الميزة، سيتأخّر الجدول الزمني أسبوعين.',
          },
          {
            sentence: 'If the client approves today, we will start tomorrow.',
            highlight: 'If the client approves … we will start',
            translation_ar: 'إذا وافق العميل اليوم، سنبدأ غدًا.',
          },
          {
            sentence: 'If we had more time, we would include the extra report.',
            highlight: 'If we had … we would include',
            translation_ar: 'لو كان لدينا وقتٌ أكثر، لأدرجنا التقرير الإضافي.',
          },
          {
            sentence: 'If I were you, I would phase the delivery over two releases.',
            highlight: 'If I were you',
            translation_ar: 'لو كنتُ مكانكِ، لقسّمتُ التسليم على إصدارين.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'If we will add this feature, the timeline will slip.',
            correct: 'If we add this feature, the timeline will slip.',
            explanation_ar: 'لا نضع will بعد if؛ نصف الشرط يأتي في المضارع البسيط.',
          },
          {
            wrong: 'If we would have more time, we would add the report.',
            correct: 'If we had more time, we would add the report.',
            explanation_ar: 'في الشرطية الثانية يأتي بعد if ماضٍ بسيط، لا would.',
          },
          {
            wrong: 'If I was you, I would phase the delivery.',
            correct: 'If I were you, I would phase the delivery.',
            explanation_ar: 'التعبير الثابت يستخدم were مع جميع الضمائر.',
          },
        ],
      },
    ],
  },

  // ── Unit 10 — Clear instructions ────────────────────────────────────────
  {
    id: '681266ec-876b-4a30-aae1-8dfb7466ee40',
    unit: 10,
    topic: 'Giving clear instructions',
    sections: [
      {
        type: 'explanation',
        content_en:
          '<b>1. Imperatives — the step itself</b><br>' +
          'Start with the base verb: <i>Log in</i>, <i>Click Save</i>. For a negative step use <b>don\'t</b> + verb: <i>Don\'t close without saving.</i> Use <i>make sure you…</i> to stress a required step.<br><br>' +
          '<b>2. Sequencers — the order</b><br>' +
          'First · Then · Next · After that · Once · Before.<br>' +
          '<i><b>First</b> log in, <b>then</b> open the dashboard.</i><br><br>' +
          '<b>3. Modals of obligation — what is required</b><br>' +
          '<b>have to / need to</b> for practical necessity, <b>must</b> for strong obligation.<br>' +
          '<i>You <b>have to</b> save before you close.</i> · <i>Every user <b>must</b> log out.</i><br><br>' +
          '<b>Careful with the negatives</b><br>' +
          '<b>mustn\'t</b> = it is not allowed. <b>don\'t have to</b> = it is not necessary. They are not the same.<br><br>' +
          '<b>Put them together</b><br>' +
          '<i>First, log in, and make sure you save before you close.</i>',
        content_ar:
          'عندما تسلّمين الحل وتدرّبين المستخدمين، تحتاجين إلى لغة تعليمات واضحة لا تحتمل اللبس. نبنيها من ثلاثة عناصر:\n\n' +
          '- <b>صيغة الأمر</b>: نبدأ بالفعل المجرّد مباشرةً — Log in with your credentials. وللنهي نستخدم don\'t + الفعل. ومن أشهر العبارات «make sure you…» للتأكيد على خطوة إلزامية.\n' +
          '- <b>روابط الترتيب</b>: First ثم Then ثم Next و After that و Once و Before.\n' +
          '- <b>أفعال الوجوب</b>: have to و need to للضرورة العملية، و must للإلزام القوي.\n\n' +
          'وانتبهي إلى فرق مهم: <b>mustn\'t</b> تعني «ممنوع»، أمّا <b>don\'t have to</b> فتعني «ليس ضروريًّا» — والمعنيان مختلفان تمامًا.\n\n' +
          'نصيحة: ادمجي العناصر الثلاثة في جملة واحدة عند الحاجة، فتُعطين خطوة مرتّبة وواجبًا واضحًا في آنٍ واحد.',
      },
      {
        type: 'formula',
        content:
          'sequencer + <b>base verb</b> + object<br>' +
          'subject + <b>have to / need to / must</b> + base verb<br>' +
          "<b>mustn't</b> = not allowed &nbsp;·&nbsp; <b>don't have to</b> = not necessary",
      },
      {
        type: 'examples',
        items: [
          {
            sentence: 'First, log in with your work credentials.',
            highlight: 'First, log in',
            translation_ar: 'أولًا، سجّلي الدخول ببيانات العمل.',
          },
          {
            sentence: 'Then open the dashboard and make sure you select the right period.',
            highlight: 'make sure you select',
            translation_ar: 'ثم افتحي لوحة البيانات وتأكّدي من اختيار الفترة الصحيحة.',
          },
          {
            sentence: 'You have to save the record before you close it.',
            highlight: 'have to save',
            translation_ar: 'عليكِ حفظ السجلّ قبل إغلاقه.',
          },
          {
            sentence: "You don't have to export the file, but every user must log out.",
            highlight: "don't have to export",
            translation_ar: 'لستِ مضطرّة لتصدير الملف، لكن على كل مستخدم تسجيل الخروج.',
          },
        ],
      },
      {
        type: 'common_mistakes',
        items: [
          {
            wrong: 'You must to save before you close.',
            correct: 'You must save before you close.',
            explanation_ar: 'بعد must يأتي الفعل مجرّدًا بدون to.',
          },
          {
            wrong: "You don't must close the record.",
            correct: "You mustn't close the record.",
            explanation_ar: 'نفي المنع هو mustn\'t، ولا نقول «don\'t must».',
          },
          {
            wrong: "You mustn't export the file — it is optional.",
            correct: "You don't have to export the file — it is optional.",
            explanation_ar: 'mustn\'t تعني «ممنوع»؛ وللاختياري نستخدم don\'t have to.',
          },
        ],
      },
    ],
  },
]
