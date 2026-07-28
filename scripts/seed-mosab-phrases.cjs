#!/usr/bin/env node
/**
 * Seeds مصعب العمري's phrase bank («عبارات جاهزة»).
 *
 * Ali's ask: phrases he can actually memorise — some from his field (business),
 * some from everyday life — each with the meaning, WHERE to use it, and drills
 * that prove he knows when to reach for it.
 *
 * Every phrase carries a `situation_ar`: the drill shows the situation and he
 * picks the phrase. That tests usage, not translation — which is the whole point.
 * Distractors are drawn from the same group so the choice is never trivial.
 *
 * Idempotent (upsert on student_id + phrase_en). Usage: node seed-mosab-phrases.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'nmjexpuycmqcxuxljier';
const STUDENT_ID = '4fb98807-526d-4675-adb5-eb938b31b948'; // مصعب جمال العمري
const REPO = '/Users/dr.ali/projects/fluentia-lms';

const token = () => fs.readFileSync(path.join(REPO, '.mcp.json'), 'utf8').match(/sbp_[A-Za-z0-9]+/)[0];
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  });
  const t = await res.text();
  if (!res.ok) { console.error('HTTP', res.status, t.slice(0, 500)); process.exit(1); }
  try { return JSON.parse(t); } catch { return t; }
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

// register: 'work' = his major · 'life' = everyday
const GROUPS = [
  {
    key: 'meetings', register: 'work',
    label_ar: 'في الاجتماع', label_en: 'In a meeting',
    phrases: [
      { en: 'Could you go over that again?', ar: 'ممكن تعيد شرح هذه النقطة؟',
        use: 'حين لا تفهم نقطة ولا تريد أن تبدو غير منتبه — أدبها عالٍ ومقبولة في أي اجتماع.',
        ex_en: 'Sorry, could you go over that again? I want to be sure I understood.', ex_ar: 'عذرًا، ممكن تعيد شرح هذه النقطة؟ أريد أن أتأكد أنني فهمت.',
        sit: 'المدير شرح خطة التوزيع بسرعة ولم تلتقط التفاصيل. ماذا تقول؟' },
      { en: 'Just to make sure I understood…', ar: 'فقط لأتأكد أنني فهمت…',
        use: 'قبل أن تعيد صياغة ما قيل بكلامك، لتتأكد من الفهم دون أن تتهم أحدًا بسوء الشرح.',
        ex_en: 'Just to make sure I understood — we ship on Sunday, not Monday?', ex_ar: 'فقط لأتأكد أنني فهمت — نشحن يوم الأحد لا الاثنين؟',
        sit: 'تريد أن تعيد الكلام بأسلوبك لتتأكد أنك فهمت الاتفاق صحيحًا. بماذا تبدأ؟' },
      { en: 'Can I add something here?', ar: 'ممكن أضيف نقطة هنا؟',
        use: 'حين تريد المشاركة بأدب دون مقاطعة فجّة.',
        ex_en: 'Can I add something here? We had the same issue last quarter.', ex_ar: 'ممكن أضيف نقطة هنا؟ واجهنا المشكلة نفسها الربع الماضي.',
        sit: 'عندك معلومة مهمة والزميل ما زال يتكلم، وتريد الدخول بلباقة. ماذا تقول؟' },
      { en: 'Let me get back to you on that.', ar: 'سأعود إليك بخصوص هذا.',
        use: 'حين تُسأل عن شيء لا تعرف إجابته الآن — أفضل بكثير من التخمين.',
        ex_en: 'I don’t have the exact figure — let me get back to you on that.', ex_ar: 'ليس لديّ الرقم الدقيق — سأعود إليك بخصوص هذا.',
        sit: 'سُئلت عن رقم دقيق لا تعرفه، ولا تريد أن تخمّن. ماذا تقول؟' },
      { en: 'To sum up, …', ar: 'باختصار، …',
        use: 'في نهاية كلامك أو نهاية الاجتماع، قبل ذكر الخلاصة.',
        ex_en: 'To sum up, we need two more suppliers before June.', ex_ar: 'باختصار، نحتاج موردَين إضافيين قبل يونيو.',
        sit: 'انتهى النقاش وتريد أن تختم بخلاصة واضحة. بماذا تبدأ جملتك؟' },
      { en: 'Where do we stand on this?', ar: 'أين وصلنا في هذا الموضوع؟',
        use: 'لتسأل عن حالة مهمة أو مشروع دون أن تبدو محاسبًا.',
        ex_en: 'Where do we stand on the supplier contract?', ex_ar: 'أين وصلنا في عقد المورّد؟',
        sit: 'تريد معرفة آخر تطورات مهمة أُسندت لفريق آخر. ماذا تسأل؟' },
    ],
  },
  {
    key: 'agree', register: 'work',
    label_ar: 'الموافقة والاعتراض بلطف', label_en: 'Agreeing & disagreeing',
    phrases: [
      { en: 'That makes sense.', ar: 'كلام منطقي.',
        use: 'موافقة قصيرة وطبيعية جدًّا — أفضل من تكرار yes.',
        ex_en: 'That makes sense. Let’s try it for a month.', ex_ar: 'كلام منطقي. لنجرّبه شهرًا.',
        sit: 'اقترح زميلك فكرة وجدتها معقولة وتريد تأييدها بجملة قصيرة. ماذا تقول؟' },
      { en: 'I see your point, but…', ar: 'أفهم وجهة نظرك، لكن…',
        use: 'لتعترض دون أن تُحرج الطرف الآخر — تعترف برأيه أولًا ثم تخالفه.',
        ex_en: 'I see your point, but the cost is too high for us.', ex_ar: 'أفهم وجهة نظرك، لكن التكلفة مرتفعة علينا.',
        sit: 'تريد أن تخالف رأي مديرك دون أن تبدو معارضًا بشكل حادّ. بماذا تبدأ؟' },
      { en: 'I’m not sure about that.', ar: 'لست متأكدًا من ذلك.',
        use: 'اعتراض لطيف جدًّا حين لا تريد رفضًا مباشرًا.',
        ex_en: 'I’m not sure about that — can we check the numbers first?', ex_ar: 'لست متأكدًا من ذلك — ممكن نراجع الأرقام أولًا؟',
        sit: 'لا تقتنع بالفكرة لكنك لا تملك دليلًا بعد، ولا تريد رفضًا قاطعًا. ماذا تقول؟' },
      { en: 'Fair enough.', ar: 'كلامك مقبول / لا بأس.',
        use: 'حين يقنعك الطرف الآخر بعد نقاش — تنهي الخلاف بلطف.',
        ex_en: 'Fair enough, let’s do it your way this time.', ex_ar: 'كلامك مقبول، لنفعلها بطريقتك هذه المرة.',
        sit: 'ناقشتَ زميلك واقتنعت برأيه أخيرًا وتريد إنهاء النقاش بود. ماذا تقول؟' },
      { en: 'Let’s agree to look at it again next week.', ar: 'لنتفق على مراجعته الأسبوع القادم.',
        use: 'حين لا تصلون إلى قرار وتريد تأجيلًا محترمًا بدل الجدال.',
        ex_en: 'We’re going in circles — let’s agree to look at it again next week.', ex_ar: 'ندور في حلقة — لنتفق على مراجعته الأسبوع القادم.',
        sit: 'طال النقاش دون قرار والجميع متعب. ماذا تقترح؟' },
    ],
  },
  {
    key: 'followup', register: 'work',
    label_ar: 'المتابعة والمواعيد', label_en: 'Follow-up & deadlines',
    phrases: [
      { en: 'I’ll keep you posted.', ar: 'سأبقيك على اطّلاع.',
        use: 'حين تتولى مهمة وتَعِد بتحديث الطرف الآخر أولًا بأول.',
        ex_en: 'I’ll handle the order and keep you posted.', ex_ar: 'سأتولى الطلب وأبقيك على اطّلاع.',
        sit: 'أخذت المهمة على عاتقك وتريد أن تطمئن مديرك أنك ستحدّثه. ماذا تقول؟' },
      { en: 'Just following up on my last email.', ar: 'أتابع فقط بخصوص رسالتي السابقة.',
        use: 'حين لا يردّ أحد عليك — تذكير مهذّب لا يبدو عتابًا.',
        ex_en: 'Hi, just following up on my last email about the invoice.', ex_ar: 'مرحبًا، أتابع فقط بخصوص رسالتي السابقة عن الفاتورة.',
        sit: 'أرسلت بريدًا قبل ثلاثة أيام ولم يصلك ردّ. بماذا تبدأ رسالتك الثانية؟' },
      { en: 'Can we set a deadline for this?', ar: 'ممكن نحدد موعدًا نهائيًا لهذا؟',
        use: 'حين تكون المهمة مفتوحة بلا تاريخ وتريد إغلاقها.',
        ex_en: 'Can we set a deadline for this? Otherwise it will slip again.', ex_ar: 'ممكن نحدد موعدًا نهائيًا لهذا؟ وإلا سيتأخر مرة أخرى.',
        sit: 'المهمة معلّقة منذ أسابيع بلا تاريخ تسليم. ماذا تقترح؟' },
      { en: 'I’m running a bit behind.', ar: 'أنا متأخر قليلًا.',
        use: 'لتعترف بالتأخير مبكرًا وبصدق — أفضل من الصمت.',
        ex_en: 'I’m running a bit behind — I’ll send it tomorrow morning.', ex_ar: 'أنا متأخر قليلًا — سأرسله صباح الغد.',
        sit: 'لن تنهي العمل في موعده وتريد إبلاغ مديرك قبل أن يسأل. ماذا تقول؟' },
      { en: 'That works for me.', ar: 'هذا يناسبني.',
        use: 'للموافقة على موعد أو ترتيب مقترح.',
        ex_en: 'Sunday at ten? That works for me.', ex_ar: 'الأحد الساعة العاشرة؟ هذا يناسبني.',
        sit: 'اقترح عليك زميلك موعدًا للاجتماع وهو مناسب لك. ماذا تردّ؟' },
    ],
  },
  {
    key: 'explain', register: 'work',
    label_ar: 'الشرح والعرض', label_en: 'Explaining & presenting',
    phrases: [
      { en: 'Let me walk you through it.', ar: 'دعني أشرحها لك خطوة بخطوة.',
        use: 'قبل أن تشرح عملية أو تقريرًا من أوله إلى آخره.',
        ex_en: 'Let me walk you through it — there are three steps.', ex_ar: 'دعني أشرحها لك خطوة بخطوة — هناك ثلاث مراحل.',
        sit: 'ستشرح للعميل عملية الطلب من البداية للنهاية. بماذا تبدأ؟' },
      { en: 'In other words, …', ar: 'بعبارة أخرى، …',
        use: 'لإعادة صياغة فكرة صعبة بأسلوب أبسط.',
        ex_en: 'In other words, we lose money on every small order.', ex_ar: 'بعبارة أخرى، نخسر في كل طلب صغير.',
        sit: 'شرحت فكرة معقّدة وترى أن الوجوه لم تفهم، فتريد تبسيطها. ماذا تقول؟' },
      { en: 'For example, …', ar: 'على سبيل المثال، …',
        use: 'لدعم كلامك بمثال محسوس — يرفع وضوح كلامك فورًا.',
        ex_en: 'For example, last month we waited ten days for one shipment.', ex_ar: 'على سبيل المثال، انتظرنا الشهر الماضي عشرة أيام لشحنة واحدة.',
        sit: 'قلت إن التأخير يضرّنا، وتريد أن تُثبت ذلك بحالة حقيقية. ماذا تقول؟' },
      { en: 'The main point is…', ar: 'النقطة الأساسية هي…',
        use: 'لتوجيه الانتباه إلى أهم ما تقول قبل أن تضيع الفكرة.',
        ex_en: 'The main point is that we need a second supplier.', ex_ar: 'النقطة الأساسية هي أننا نحتاج موردًا ثانيًا.',
        sit: 'تكلمت كثيرًا وتريد أن تُبرز الفكرة الأهم قبل أن تنتهي. ماذا تقول؟' },
      { en: 'Does that answer your question?', ar: 'هل أجاب هذا على سؤالك؟',
        use: 'بعد أن تجيب على سؤال، لتتأكد أن السائل اكتفى.',
        ex_en: 'Does that answer your question, or should I explain the cost part?', ex_ar: 'هل أجاب هذا على سؤالك، أم أشرح جزء التكلفة؟',
        sit: 'أنهيت إجابتك على سؤال العميل وتريد التأكد أنه اقتنع. ماذا تسأل؟' },
    ],
  },
  {
    key: 'smalltalk', register: 'life',
    label_ar: 'كلام يومي مع الناس', label_en: 'Everyday small talk',
    phrases: [
      { en: 'How’s it going?', ar: 'كيف الأمور؟',
        use: 'تحية ودودة غير رسمية مع زميل أو صديق.',
        ex_en: 'Hey, how’s it going?', ex_ar: 'أهلًا، كيف الأمور؟',
        sit: 'قابلت زميلًا في الممر صباحًا وتريد تحية ودّية قصيرة. ماذا تقول؟' },
      { en: 'Long time no see!', ar: 'زمان ما شفتك!',
        use: 'حين تقابل شخصًا بعد غياب طويل.',
        ex_en: 'Long time no see! How have you been?', ex_ar: 'زمان ما شفتك! كيف حالك؟',
        sit: 'صادفت صديقًا لم تره منذ سنة. ماذا تقول أولًا؟' },
      { en: 'Same here.', ar: 'وأنا كذلك.',
        use: 'لتقول إن حالك أو رأيك مثل الطرف الآخر — قصيرة وطبيعية.',
        ex_en: '“I’m exhausted.” — “Same here.”', ex_ar: '«أنا منهك.» — «وأنا كذلك.»',
        sit: 'قال صديقك إنه متعب من الدوام، وأنت مثله تمامًا. ماذا تردّ؟' },
      { en: 'No worries.', ar: 'ولا يهمك.',
        use: 'لتطمئن من اعتذر لك أو تأخر عليك.',
        ex_en: '“Sorry I’m late.” — “No worries.”', ex_ar: '«آسف على التأخير.» — «ولا يهمك.»',
        sit: 'اعتذر لك صديقك عن تأخره عشر دقائق. ماذا تردّ؟' },
      { en: 'Have a good one.', ar: 'يومك سعيد.',
        use: 'وداع ودّي في نهاية لقاء قصير.',
        ex_en: 'See you tomorrow — have a good one.', ex_ar: 'أراك غدًا — يومك سعيد.',
        sit: 'تودّع زميلك في نهاية الدوام. ماذا تقول؟' },
      { en: 'It’s good to see you.', ar: 'سعيد برؤيتك.',
        use: 'ترحيب دافئ حين تلتقي شخصًا تعرفه.',
        ex_en: 'It’s good to see you — come in.', ex_ar: 'سعيد برؤيتك — تفضّل.',
        sit: 'وصل ضيف تعرفه إلى مكتبك وتريد استقباله بدفء. ماذا تقول؟' },
    ],
  },
  {
    key: 'polite', register: 'life',
    label_ar: 'الطلب والاستفسار بأدب', label_en: 'Asking politely',
    phrases: [
      { en: 'Would you mind helping me with this?', ar: 'هل تمانع في مساعدتي بهذا؟',
        use: 'أكثر صيغ الطلب أدبًا — تستخدمها مع من لا تعرفه جيدًا أو مع من هو أعلى منك.',
        ex_en: 'Would you mind helping me with this file?', ex_ar: 'هل تمانع في مساعدتي بهذا الملف؟',
        sit: 'تحتاج مساعدة من موظف أقدم منك ولا تعرفه جيدًا. كيف تطلب؟' },
      { en: 'Could you do me a favour?', ar: 'ممكن تسدي لي معروفًا؟',
        use: 'تمهيد لطلب من شخص تعرفه جيدًا.',
        ex_en: 'Could you do me a favour and check this number?', ex_ar: 'ممكن تسدي لي معروفًا وتتأكد من هذا الرقم؟',
        sit: 'ستطلب من صديق مقرّب خدمة صغيرة. بماذا تمهّد؟' },
      { en: 'Do you happen to know…?', ar: 'هل تعرف صدفةً…؟',
        use: 'سؤال لطيف حين لا تتوقع أن الشخص يعرف الإجابة بالضرورة.',
        ex_en: 'Do you happen to know where the finance office is?', ex_ar: 'هل تعرف صدفةً أين مكتب المالية؟',
        sit: 'تسأل شخصًا غريبًا عن مكان، ولا تريد أن تُحرجه إن لم يعرف. ماذا تقول؟' },
      { en: 'Sorry to bother you, but…', ar: 'أعتذر على الإزعاج، لكن…',
        use: 'حين تقاطع شخصًا مشغولًا لأمر ضروري.',
        ex_en: 'Sorry to bother you, but the client is waiting.', ex_ar: 'أعتذر على الإزعاج، لكن العميل ينتظر.',
        sit: 'مديرك مشغول ولا بد أن تخبره بأمر عاجل. بماذا تبدأ؟' },
      { en: 'Whenever you get a chance.', ar: 'متى ما تيسّر لك.',
        use: 'تُلحقها بطلب لتُشعر الطرف الآخر أنك لا تستعجله.',
        ex_en: 'Could you review it whenever you get a chance?', ex_ar: 'ممكن تراجعه متى ما تيسّر لك؟',
        sit: 'طلبت مراجعة ملف وتريد أن تُشعر زميلك أنه غير مستعجل. بماذا تختم؟' },
    ],
  },
  {
    key: 'buytime', register: 'life',
    label_ar: 'حين تحتاج وقتًا أو لا تعرف', label_en: 'Buying time & not knowing',
    phrases: [
      { en: 'Let me think about it for a second.', ar: 'دعني أفكر قليلًا.',
        use: 'لتكسب وقتًا للتفكير بدل الصمت المحرج.',
        ex_en: 'Let me think about it for a second… yes, Tuesday works.', ex_ar: 'دعني أفكر قليلًا… نعم، الثلاثاء مناسب.',
        sit: 'سُئلت سؤالًا وتحتاج ثوانيَ للتفكير قبل الإجابة. ماذا تقول؟' },
      { en: 'How do you say… in English?', ar: 'كيف نقول… بالإنجليزية؟',
        use: 'حين تنقصك كلمة وأنت تتحدث — اسأل بدل أن تتوقف.',
        ex_en: 'How do you say “مستودع” in English?', ex_ar: 'كيف نقول «مستودع» بالإنجليزية؟',
        sit: 'وقفت في منتصف جملة لأن كلمة غابت عنك. ماذا تسأل؟' },
      { en: 'I’m not sure how to put this.', ar: 'لا أعرف كيف أصيغها.',
        use: 'حين تكون الفكرة في رأسك لكن الصياغة تتعثّر — تُشعِر السامع أن يمهلك.',
        ex_en: 'I’m not sure how to put this, but the plan feels risky.', ex_ar: 'لا أعرف كيف أصيغها، لكن الخطة تبدو محفوفة بالمخاطر.',
        sit: 'تريد قول شيء حسّاس ولا تجد الصياغة المناسبة. بماذا تبدأ؟' },
      { en: 'Sorry, I didn’t catch that.', ar: 'عذرًا، لم أسمع ذلك جيدًا.',
        use: 'حين لا تسمع الكلام — أدقّ من "repeat please" وأكثر طبيعية.',
        ex_en: 'Sorry, I didn’t catch that — could you say it again?', ex_ar: 'عذرًا، لم أسمع ذلك جيدًا — ممكن تعيده؟',
        sit: 'الاتصال ضعيف ولم تسمع آخر جملة قالها العميل. ماذا تقول؟' },
      { en: 'To be honest, I don’t know.', ar: 'بصراحة، لا أعرف.',
        use: 'الاعتراف بعدم المعرفة بثقة — يحترمه الناس أكثر من التخمين.',
        ex_en: 'To be honest, I don’t know — but I’ll find out today.', ex_ar: 'بصراحة، لا أعرف — لكنني سأعرف اليوم.',
        sit: 'سُئلت عن أمر لا تعرفه إطلاقًا ولا تريد التخمين. ماذا تقول؟' },
    ],
  },
];

(async () => {
  const rows = [];
  let order = 0;
  for (const gp of GROUPS) {
    // the drill needs at least 4 phrases per group so distractors are same-context
    if (gp.phrases.length < 4) throw new Error(`group ${gp.key} needs >= 4 phrases for the drill`);
    for (const p of gp.phrases) {
      if (!p.sit) throw new Error(`missing situation: ${p.en}`);
      rows.push({ ...p, group_key: gp.key, group_label_ar: gp.label_ar, group_label_en: gp.label_en, register: gp.register, sort_order: order++ });
    }
  }
  const seen = new Set();
  for (const r of rows) { if (seen.has(r.en)) throw new Error(`duplicate phrase: ${r.en}`); seen.add(r.en); }
  console.log(`✅ ${rows.length} phrases across ${GROUPS.length} groups validated`);

  const values = rows.map((r) => `(${q(STUDENT_ID)}, ${q(r.group_key)}, ${q(r.group_label_ar)}, ${q(r.group_label_en)}, ${q(r.register)}, ${q(r.en)}, ${q(r.ar)}, ${q(r.use)}, ${q(r.ex_en)}, ${q(r.ex_ar)}, ${q(r.sit)}, ${r.sort_order})`).join(',\n');

  await sql(`insert into phrase_bank_phrases
    (student_id, group_key, group_label_ar, group_label_en, register, phrase_en, meaning_ar, when_to_use_ar, example_en, example_ar, situation_ar, sort_order)
    values\n${values}
    on conflict (student_id, phrase_en) do update set
      group_key=excluded.group_key, group_label_ar=excluded.group_label_ar, group_label_en=excluded.group_label_en,
      register=excluded.register, meaning_ar=excluded.meaning_ar, when_to_use_ar=excluded.when_to_use_ar,
      example_en=excluded.example_en, example_ar=excluded.example_ar, situation_ar=excluded.situation_ar,
      sort_order=excluded.sort_order;`);

  await sql(`update students set uses_phrase_bank = true where id = ${q(STUDENT_ID)};`);

  const check = await sql(`select group_label_ar, register, count(*) n
    from phrase_bank_phrases where student_id=${q(STUDENT_ID)} group by 1,2 order by min(sort_order);`);
  console.log(JSON.stringify(check, null, 2));
  const flag = await sql(`select uses_phrase_bank from students where id=${q(STUDENT_ID)};`);
  console.log('gate:', JSON.stringify(flag));
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
