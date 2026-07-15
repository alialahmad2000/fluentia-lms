// Deep, structured grammar explanations for Malak's 10 units.
// Uses the platform's real section types (verified via Explore):
//   type:'explanation' -> content_ar (plain RTL text; use ● headers + \n) + content_en (HTML)
//   type:'examples'    -> items:[{sentence, highlight, translation_ar}] (LessonCard highlights `highlight`)
//   type:'common_mistakes' -> items:[{wrong, correct, explanation_ar}] (pulled to CommonMistakesCard)
// Examples are drawn from each unit's OWN passage so the grammar lives in her marketing world.
// Feminine Najdi teaching voice. Brand words forbidden.

module.exports = {
  1: { // Future Forms
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\nثلاث صيغ للمستقبل، وكل وحدة لها مكانها:\n• going to = خطة قرّرتيها من قبل: “We ARE GOING TO focus on three channels.”\n• المضارع المستمر (am/is/are + -ing) = ترتيب مؤكد بموعد: “I AM MEETING the design team on Sunday.”\n• will = قرار لحظي أو توقّع أو نتيجة شرط: “If the results are strong, we WILL launch a second phase.”',
        content_en: '<b>Future forms — three tools, one job each</b><br>• <b>going to</b> = a plan you already decided.<br>• <b>present continuous</b> = a fixed arrangement with a time.<br>• <b>will</b> = an instant decision, a prediction, or the result of a condition.' },
      { type: 'examples', items: [
        { sentence: 'We are going to test two versions of each ad.', highlight: 'going to', translation_ar: 'خطة مقرّرة ← going to.' },
        { sentence: 'I am presenting the full plan to the client next week.', highlight: 'am presenting', translation_ar: 'ترتيب مؤكد بموعد ← مضارع مستمر.' },
        { sentence: 'If the results are strong, we will extend the campaign.', highlight: 'will extend', translation_ar: 'نتيجة شرط ← will.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في العرض\nابدئي خططك المقرّرة بـ going to، واذكري مواعيدك المؤكدة بالمضارع المستمر، واحفظي will للوعود والتوقعات. لا تخلطينهم — الوضوح في الصيغة يخلّي العميل يثق بالخطة.',
        content_en: '<b>In a strategy meeting:</b> lead decided plans with <i>going to</i>, state confirmed times with the present continuous, and keep <i>will</i> for promises and predictions.' },
      { type: 'common_mistakes', items: [
        { wrong: 'We will focus on three channels (a plan decided last week).', correct: 'We are going to focus on three channels.', explanation_ar: 'خطة قرّرتيها من قبل ← going to، مو will.' },
        { wrong: 'I will meet the team on Sunday (already in the calendar).', correct: 'I am meeting the team on Sunday.', explanation_ar: 'ترتيب مؤكد بموعد ← المضارع المستمر.' },
        { wrong: 'We are going to launched a second phase.', correct: 'We are going to launch a second phase.', explanation_ar: 'بعد going to نستخدم المصدر ← launch.' } ] },
    ],
  },
  2: { // Modals of obligation
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• must / have to = إلزام قوي (لازم): “Everyone MUST read the guidelines.”\n• need to = ضرورة عملية: “We NEED TO deliver the drafts by Thursday.”\n• should = نصيحة / الخيار الأنسب: “The tone SHOULD be warm.”\n• don’t have to = مو لازم (اختياري): “We DON’T HAVE TO translate everything.”\n• shouldn’t = يُفضَّل تجنّبه: “They SHOULDN’T use other shades.”',
        content_en: '<b>Obligation modals</b><br>• <b>must / have to</b> = strong obligation.<br>• <b>need to</b> = practical necessity.<br>• <b>should</b> = advice / the wiser choice.<br>• <b>don’t have to</b> = optional, no obligation.<br>• <b>shouldn’t</b> = advised against.' },
      { type: 'examples', items: [
        { sentence: 'You have to keep this message in every video.', highlight: 'have to', translation_ar: 'إلزام ← have to.' },
        { sentence: 'The tone should be warm and friendly, not formal.', highlight: 'should', translation_ar: 'نصيحة ← should.' },
        { sentence: 'We don’t have to translate everything into English.', highlight: 'don’t have to', translation_ar: 'اختياري ← don’t have to.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في الموجز\nفرّقي بين «لازم» و«يُفضَّل» عشان فريقك يعرف الأولويات: الإلزام بـ must/have to/need to، والنصيحة بـ should. و«مو لازم» تقولينها بـ don’t have to — لا تقولين mustn’t (معناها ممنوع!).',
        content_en: '<b>Careful:</b> <i>don’t have to</i> = optional. <i>mustn’t</i> = forbidden. They are opposites.' },
      { type: 'common_mistakes', items: [
        { wrong: 'You don’t must use other colors.', correct: 'You mustn’t use other colors. / You shouldn’t use other colors.', explanation_ar: 'must ما يجي بعده don’t — النفي mustn’t أو shouldn’t.' },
        { wrong: 'We mustn’t translate everything (meaning: it’s optional).', correct: 'We don’t have to translate everything.', explanation_ar: 'الاختياري ← don’t have to، مو mustn’t (اللي معناها ممنوع).' },
        { wrong: 'Everyone must to read the guidelines.', correct: 'Everyone must read the guidelines.', explanation_ar: 'بعد must نستخدم المصدر بدون to.' } ] },
    ],
  },
  3: { // Past simple vs present perfect
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• الماضي البسيط = حدث خلص بوقت محدّد: “We LAUNCHED it on the first of April.”\n• المضارع التام (have/has + التصريف الثالث) = نتيجة مهمة الحين أو وقت ما خلص: “We HAVE GAINED 24,000 followers.”\nالمفتاح في كلمة الوقت: (in April, last week, yesterday) ← ماضٍ بسيط. (already, yet, so far, since) ← مضارع تام.',
        content_en: '<b>Past simple vs present perfect</b><br>• Past simple = a finished action at a known time.<br>• Present perfect = the result matters now / an open time.<br>Time words decide: <i>in April, last week</i> → past simple; <i>already, yet, so far, since</i> → present perfect.' },
      { type: 'examples', items: [
        { sentence: 'The campaign ran for six weeks and reached 2.3 million people.', highlight: 'ran', translation_ar: 'فترة انتهت ← ماضٍ بسيط.' },
        { sentence: 'So far, we have gained 24,000 new followers.', highlight: 'have gained', translation_ar: 'so far ونتيجة مستمرة ← مضارع تام.' },
        { sentence: 'We have not finished the final analysis yet.', highlight: 'have not finished', translation_ar: 'yet ← مضارع تام.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في التقرير\nاسردي وش سوّيتِ بالماضي البسيط (launched, ran, spent)، ثم اعرضي النتائج اللي أثرها مستمر بالمضارع التام (have grown, has approved). هالتفريق يخلّي العميل يشوف الإنجاز الحي بوضوح.',
        content_en: '<b>In a results report:</b> narrate what you did in past simple, then present the results that still matter in the present perfect.' },
      { type: 'common_mistakes', items: [
        { wrong: 'We have launched the campaign on the first of April.', correct: 'We launched the campaign on the first of April.', explanation_ar: 'وقت محدّد (on the first of April) ← ماضٍ بسيط.' },
        { wrong: 'Sales grew by 31% since the campaign started.', correct: 'Sales have grown by 31% since the campaign started.', explanation_ar: 'since ← مضارع تام.' },
        { wrong: 'We have gain 24,000 followers.', correct: 'We have gained 24,000 followers.', explanation_ar: 'المضارع التام يحتاج التصريف الثالث ← gained.' } ] },
    ],
  },
  4: { // Conditionals
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• الشرط الأول (واقعي/وارد): if + مضارع بسيط ← will/can: “If you POST three reels, we WILL PAY 8,000.”\n• الشرط الثاني (افتراضي/أقل احتمالاً): if + ماضي بسيط ← would/could: “If you INCREASED the fee, I WOULD INCLUDE an extra reel.”\nالشرط الثاني مو «ماضي» — هو طريقة مؤدّبة تطرحين فيها احتمال.',
        content_en: '<b>First & second conditionals</b><br>• First (real/likely): if + present simple → will/can.<br>• Second (hypothetical/softer): if + past simple → would/could.<br>The second conditional is not about the past — it floats a possibility politely.' },
      { type: 'examples', items: [
        { sentence: 'If you accept today, we will send the brief tomorrow.', highlight: 'will send', translation_ar: 'شرط أول واقعي ← will.' },
        { sentence: 'If you gave me more creative freedom, the content would feel more natural.', highlight: 'would feel', translation_ar: 'شرط ثاني افتراضي ← would.' },
        { sentence: 'If the reels get strong engagement, we can extend the collaboration.', highlight: 'get', translation_ar: 'if + مضارع بسيط.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في التفاوض\nاستخدمي الشرط الأول للعروض المؤكدة، والشرط الثاني عشان تطرحين طلبًا أو احتمالًا بلطف بدون التزام — يخلّي التفاوض مرن ومحترم.',
        content_en: '<b>In a negotiation:</b> first conditional for firm offers; second conditional to float a request softly, with no commitment.' },
      { type: 'common_mistakes', items: [
        { wrong: 'If you will post three reels, we will pay 8,000.', correct: 'If you post three reels, we will pay 8,000.', explanation_ar: 'ما نستخدم will بعد if — الفعل مضارع بسيط.' },
        { wrong: 'If you increased the fee, I will include an extra reel.', correct: 'If you increased the fee, I would include an extra reel.', explanation_ar: 'شرط ثاني: if + ماضي ← would.' },
        { wrong: 'If we agreed today, we can start next week.', correct: 'If we agreed today, we could start next week.', explanation_ar: 'الشرط الثاني يأخذ could مو can.' } ] },
    ],
  },
  5: { // Comparatives + softening
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• المقارنة: صفة قصيرة + er + than: “clearer THAN the last one.” وصفة طويلة ← more + صفة: “more dynamic.”\n• التلطيف (softening): كلمات تخفّف النقد عشان يوصل بلطف: a bit, slightly, a little, rather, a touch: “The opening is A BIT slow.”\nصفة شاذّة: good ← better، bad ← worse.',
        content_en: '<b>Comparatives + softeners</b><br>• short adjective + <b>er + than</b>; long adjective → <b>more + adjective</b>.<br>• soften criticism with <i>a bit, slightly, a little, rather, a touch</i>.<br>Irregulars: good → better, bad → worse.' },
      { type: 'examples', items: [
        { sentence: 'This version is much clearer than the first cut.', highlight: 'clearer than', translation_ar: 'صفة قصيرة ← -er + than.' },
        { sentence: 'Could we make the opening a little more dynamic?', highlight: 'a little more dynamic', translation_ar: 'صفة طويلة ← more + تلطيف.' },
        { sentence: 'The music is rather loud in the middle.', highlight: 'rather', translation_ar: 'كلمة تلطيف تخفّف النقد.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في الملاحظات\nابدئي بإيجابية، ثم قارني بالنسخة السابقة عشان الفريق يشوف التقدّم، وخفّفي النقد بكلمات التلطيف عشان يوصل باحترام لا كهجوم.',
        content_en: '<b>Giving feedback:</b> open positively, compare with the previous version to show progress, and use softeners so the note lands with respect.' },
      { type: 'common_mistakes', items: [
        { wrong: 'The opening is more slow than it needs to be.', correct: 'The opening is slower than it needs to be.', explanation_ar: 'صفة قصيرة تأخذ -er مو more ← slower.' },
        { wrong: 'This draft is more good than the last one.', correct: 'This draft is better than the last one.', explanation_ar: 'good شاذّة ← better.' },
        { wrong: 'It is clearer that the last one.', correct: 'It is clearer than the last one.', explanation_ar: 'المقارنة تحتاج than مو that.' } ] },
    ],
  },
  6: { // Present continuous vs present simple + time
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• المضارع المستمر (am/is/are + -ing) = يصير الحين أو هالفترة: “The team IS FINISHING the banners.”\n• المضارع البسيط = عادة أو حقيقة ثابتة: “We usually PUBLISH on Sundays.”\nتعابير الوقت ترشدك: (right now, at the moment, today) ← مستمر. (usually, always, every week, normally) ← بسيط.',
        content_en: '<b>Present continuous vs present simple</b><br>• continuous = happening now / around now.<br>• simple = a habit or fixed fact.<br>Time words guide you: <i>right now, at the moment</i> → continuous; <i>usually, every week</i> → simple.' },
      { type: 'examples', items: [
        { sentence: 'Right now, I am waiting for the client’s approval.', highlight: 'am waiting', translation_ar: 'right now ← مستمر.' },
        { sentence: 'Every week we check the metrics on Monday.', highlight: 'check', translation_ar: 'every week ← بسيط.' },
        { sentence: 'The influencer is posting her first reel tonight.', highlight: 'is posting', translation_ar: 'ترتيب مؤكد قريب ← مستمر.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في اجتماع المتابعة\nافصلي بين اللي يصير الحين (مستمر) واللي هو روتين ثابت (بسيط) عشان كل واحد بالفريق يعرف حالة مهمته بدقّة. تذكّري: أفعال الحالة (know, want, need) ما تجي مستمرة.',
        content_en: '<b>Note:</b> state verbs (know, want, need, believe) are not used in the continuous — say “I need”, not “I am needing”.' },
      { type: 'common_mistakes', items: [
        { wrong: 'We are usually publishing on Sundays.', correct: 'We usually publish on Sundays.', explanation_ar: 'usually = عادة ← مضارع بسيط.' },
        { wrong: 'At the moment, the team finish the banners.', correct: 'At the moment, the team is finishing the banners.', explanation_ar: 'at the moment ← مضارع مستمر.' },
        { wrong: 'I am needing the final visuals now.', correct: 'I need the final visuals now.', explanation_ar: 'أفعال الحالة مثل need ما تجي مستمرة.' } ] },
    ],
  },
  7: { // Questions + polite disagreement
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• أسئلة نعم/لا: أداة مساعدة + فاعل + فعل: “DO YOU have a deadline?”\n• أسئلة المعلومة: أداة استفهام + مساعد + فاعل + فعل: “How much WILL this cost?”\n• الاختلاف بلطف: اعترفي أولًا ثم اختلفي: “That’s a fair point, BUT…” / “I see what you mean, HOWEVER…”.',
        content_en: '<b>Questions + polite disagreement</b><br>• yes/no: auxiliary + subject + verb.<br>• information: question word + auxiliary + subject + verb.<br>• disagree politely: acknowledge, then <i>but/however</i>, then offer a solution as a question.' },
      { type: 'examples', items: [
        { sentence: 'Do you have a deadline in mind?', highlight: 'Do you have', translation_ar: 'سؤال نعم/لا: Do + الفاعل + الفعل.' },
        { sentence: 'That’s a fair point, but our research shows the opposite.', highlight: 'but', translation_ar: 'اختلاف مهذّب بعد الاعتراف.' },
        { sentence: 'What if we delivered the first phase in two weeks?', highlight: 'What if', translation_ar: 'طرح بديل على شكل سؤال.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها مع العميل\nحوّلي الاعتراض إلى حوار: اعترفي بوجهة نظره، ردّي بلطف بـ but/however، ثم اطرحي حلًّا على شكل سؤال (What if…? Would it help if…؟) عشان تكسبين ثقته لا تخسرينها.',
        content_en: '<b>Handling objections:</b> acknowledge, answer gently with but/however, then propose a solution as a question — you keep the client, not just the point.' },
      { type: 'common_mistakes', items: [
        { wrong: 'How much this campaign will cost?', correct: 'How much will this campaign cost?', explanation_ar: 'سؤال المعلومة: أداة الاستفهام + will + الفاعل + الفعل.' },
        { wrong: 'You have a deadline in mind?', correct: 'Do you have a deadline in mind?', explanation_ar: 'سؤال نعم/لا يبدأ بـ Do.' },
        { wrong: 'No, you are wrong about the colors.', correct: 'I see what you mean, however these colors follow the brand.', explanation_ar: 'الاختلاف بلطف يبني الثقة؛ «you’re wrong» تكسر العلاقة.' } ] },
    ],
  },
  8: { // Linking words + formal register
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\nكلمات الربط تنظّم الإيميل:\n• ترتيب: Firstly, Secondly.\n• إضافة: Moreover, In addition.\n• نتيجة: Therefore, so that.\n• تناقض: Although, However.\nوالأسلوب الرسمي: ابدئي بـ Dear + الاسم، جُمَل كاملة، تجنّبي الاختصار (don’t ← do not)، واختمي بـ Kind regards.',
        content_en: '<b>Linking words + formal register</b><br>order: Firstly, Secondly · addition: Moreover, In addition · result: Therefore, so that · contrast: Although, However.<br>Formal: open with <i>Dear + name</i>, full sentences, no contractions, close with <i>Kind regards</i>.' },
      { type: 'examples', items: [
        { sentence: 'Firstly, our team will prepare the concept by next week.', highlight: 'Firstly', translation_ar: 'ترتيب.' },
        { sentence: 'Although the campaign runs for six weeks, we will report weekly.', highlight: 'Although', translation_ar: 'تناقض.' },
        { sentence: 'We will provide weekly reports so that you can follow the progress.', highlight: 'so that', translation_ar: 'غرض/نتيجة.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في الإيميل\nكل فكرة جديدة تبدأ بكلمة ربط عشان الإيميل يكون مترابط لا جُمَل مبعثرة. وخلّي الأسلوب رسميًا — يعكس احترافيّتك قبل ما يقابلك العميل.',
        content_en: '<b>In an email:</b> start each new idea with a linker so it flows, and keep the register formal — it signals your professionalism before the client meets you.' },
      { type: 'common_mistakes', items: [
        { wrong: 'Although the campaign runs for six weeks, but we report weekly.', correct: 'Although the campaign runs for six weeks, we report weekly.', explanation_ar: 'ما نجمع Although و but في نفس الجملة.' },
        { wrong: 'Please don’t hesitate to contact me. (formal email)', correct: 'Please do not hesitate to contact me.', explanation_ar: 'الأسلوب الرسمي بدون اختصار ← do not.' },
        { wrong: 'We report weekly therefore you always know the progress.', correct: 'We report weekly; therefore, you always know the progress.', explanation_ar: 'Therefore تبدأ جملة/شبه جملة، وتحتاج فصلًا قبلها.' } ] },
    ],
  },
  9: { // Passive voice
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\nالمبني للمجهول = نركّز على الفعل مو على مين سوّاه. التكوين: be + التصريف الثالث (past participle):\n• مضارع: “The images ARE EDITED.”\n• مستقبل: “The store WILL BE LAUNCHED.”\n• مضارع تام: “The process HAS BEEN DESIGNED.”\nلو تبين تذكرين الفاعل، استخدمي by: “handled BY a secure system.”',
        content_en: '<b>Passive voice</b> = focus on the action, not the doer. Form: <b>be + past participle</b>. Present: are edited · future: will be launched · present perfect: has been designed. Name the doer with <i>by</i>.' },
      { type: 'examples', items: [
        { sentence: 'The new store will be launched next month.', highlight: 'will be launched', translation_ar: 'مستقبل مبني للمجهول.' },
        { sentence: 'A confirmation email is sent automatically after an order.', highlight: 'is sent', translation_ar: 'مضارع مبني للمجهول.' },
        { sentence: 'The whole process has been designed carefully.', highlight: 'has been designed', translation_ar: 'مضارع تام مبني للمجهول.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في وصف الإطلاق\nاستخدمي المبني للمجهول لوصف العمليات والخطوات لأن الأهم «وش يصير» مو «مين يسويه» — يخلّي شرح المسار للعميل واضحًا ومنظّمًا.',
        content_en: '<b>Describing a launch/process:</b> the passive keeps the focus on the steps, which is exactly what a client wants to follow.' },
      { type: 'common_mistakes', items: [
        { wrong: 'A confirmation email is send automatically.', correct: 'A confirmation email is sent automatically.', explanation_ar: 'المبني للمجهول يحتاج التصريف الثالث ← sent.' },
        { wrong: 'The store will launched next month.', correct: 'The store will be launched next month.', explanation_ar: 'ناقص be ← will be launched.' },
        { wrong: 'The images are edit by the design team.', correct: 'The images are edited by the design team.', explanation_ar: 'be + التصريف الثالث ← are edited.' } ] },
    ],
  },
  10: { // Purpose & persuasion
    sections: [
      { type: 'explanation',
        content_ar: '● القاعدة\n• للهدف: in order to + فعل (مصدر): “…IN ORDER TO build trust.” و so that + جملة: “…SO THAT viewers feel a connection.”\n• للإقناع: which means + جملة تشرح النتيجة/الفائدة: “…WHICH MEANS we reach a loyal audience at a lower cost.”\nالقاعدة: اربطي كل فكرة بفائدتها.',
        content_en: '<b>Purpose & persuasion</b><br>• purpose: <b>in order to + verb</b>, <b>so that + clause</b>.<br>• persuade: <b>which means + clause</b> explains the benefit.<br>Tie every point to its result.' },
      { type: 'examples', items: [
        { sentence: 'We’ll release one video each week in order to keep the momentum going.', highlight: 'in order to', translation_ar: 'هدف ← in order to + مصدر.' },
        { sentence: 'Each video tells one story so that viewers feel a connection.', highlight: 'so that', translation_ar: 'هدف ← so that + جملة.' },
        { sentence: 'We partner with micro-influencers, which means we reach a loyal audience at a lower cost.', highlight: 'which means', translation_ar: 'ربط بالفائدة ← which means.' } ] },
      { type: 'explanation',
        content_ar: '● متى تستخدمينها في التقديم\nكل نقطة في عرضك اربطيها بهدفها (in order to / so that) وبفائدتها (which means). الهدف + النتيجة = إقناع قوي يخلّي أصحاب القرار يقولون «نعم».',
        content_en: '<b>Pitching:</b> connect each point to its purpose and its benefit — purpose + result is what turns a pitch into a yes.' },
      { type: 'common_mistakes', items: [
        { wrong: 'We release videos in order to keeping the momentum.', correct: 'We release videos in order to keep the momentum.', explanation_ar: 'بعد in order to نستخدم المصدر ← keep.' },
        { wrong: 'We add a hashtag so that customers can sharing their stories.', correct: 'We add a hashtag so that customers can share their stories.', explanation_ar: 'بعد can نستخدم المصدر ← share.' },
        { wrong: 'Real stories are memorable, which mean people remember us.', correct: 'Real stories are memorable, which means people remember us.', explanation_ar: 'which means (مفرد) ← means.' } ] },
    ],
  },
};
