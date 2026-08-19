/**
 * Contrast cards — the confusable-neighbour layer.
 *
 * The audit found only 14% of standard lessons and 21% of personalised ones
 * contrast the structure with the one students actually mix it up with. That
 * gap is the main reason a student can finish a unit and still not feel sure:
 * she learned what the rule IS, and never had to CHOOSE it against its rival.
 *
 * Each card is a two-column table of parallel facts plus one quick decision
 * test she can apply under pressure.
 */

const C = (title_ar, a, b, rows, test_ar) => ({
  title_ar,
  columns: [{ label_ar: a }, { label_ar: b }],
  rows,
  test_ar,
})

const CONTRASTS = {
  pp_vs_past: C('الفرق بين المضارع التام والماضي البسيط', 'Present Perfect', 'Past Simple', [
    ['الأثر مهم الآن', 'الحدث انتهى في وقت محدّد'],
    ['فترة لم تنتهِ: this year, so far', 'وقت منتهٍ: last year, in 2023'],
    ['I have finished the report.', 'I finished the report yesterday.'],
    ['لا يُذكر معه وقت محدّد منتهٍ', 'يُذكر معه الوقت غالبًا'],
  ], 'الاختبار السريع: هل تستطيعين ذكر متى حدث بالضبط؟ إن نعم — الماضي البسيط.'),

  will_vs_going_to: C('الفرق بين will و going to', 'will', 'going to', [
    ['قرار في لحظة الكلام', 'خطة سابقة اتُّخذت قبل الآن'],
    ['توقّع من رأيك', 'توقّع من دليل تراه الآن'],
    ["It's heavy — I'll help you.", "I'm going to help him tomorrow."],
    ['وعد أو عرض', 'نيّة مؤكّدة'],
  ], 'الاختبار السريع: هل قرّرتِ الآن أم كنتِ قد قرّرتِ من قبل؟'),

  simple_vs_cont: C('الفرق بين المضارع البسيط والمستمر', 'Present Simple', 'Present Continuous', [
    ['حقيقة أو عادة ثابتة', 'ما يحدث الآن أو في هذه الفترة'],
    ['She works in a bank.', 'She is working from home this week.'],
    ['always, usually, every day', 'now, at the moment, this week'],
    ['الأفعال الذهنية: know, like, want', 'لا تُستخدم عادةً مع هذه الأفعال'],
  ], 'الاختبار السريع: هل هذا وصف دائم أم شيء مؤقّت يحدث الآن؟'),

  past_simple_vs_cont: C('الفرق بين الماضي البسيط والماضي المستمر', 'Past Simple', 'Past Continuous', [
    ['حدث مكتمل', 'خلفية أو فعل كان مستمرًّا'],
    ['The phone rang.', 'I was cooking when the phone rang.'],
    ['الحدث القصير المُقاطِع', 'الحدث الطويل المُقاطَع'],
    ['يُستخدم لسرد التسلسل', 'يُستخدم لرسم المشهد'],
  ], 'الاختبار السريع: أيّهما قاطع الآخر؟ القاطع = ماضٍ بسيط.'),

  must_vs_have_to: C('الفرق بين must و have to', 'must', 'have to', [
    ['إلزام من المتحدّث نفسه', 'إلزام من نظام أو ظرف خارجي'],
    ['I must stop eating late.', 'I have to wear a badge at work.'],
    ["mustn't = ممنوع", "don't have to = ليس ضروريًّا"],
    ['لا ماضي لها — نستخدم had to', 'لها كل الأزمنة: had to, will have to'],
  ], 'الاختبار السريع: مَن فرض هذا — أنتِ أم النظام؟'),

  should_vs_must: C('الفرق بين should و must', 'should', 'must', [
    ['نصيحة — يبقى الخيار لكِ', 'إلزام — لا خيار'],
    ['You should rest.', 'You must wear a seatbelt.'],
    ['أخفّ وأكثر أدبًا', 'أقوى وقد يبدو آمرًا'],
  ], 'الاختبار السريع: هل ستحدث مشكلة حقيقية إن لم تفعل؟ إن نعم — must.'),

  some_vs_any: C('الفرق بين some و any', 'some', 'any', [
    ['الجملة المثبتة', 'النفي والسؤال'],
    ['I have some questions.', "I don't have any questions."],
    ['العرض والطلب المهذّب', 'Do you have any questions?'],
    ['Would you like some tea?', 'أي واحد، لا يهمّ: Any day is fine.'],
  ], 'الاختبار السريع: مثبتة → some. منفية أو سؤال → any (إلا في العرض والطلب).'),

  much_vs_many: C('الفرق بين much و many', 'much', 'many', [
    ['مع غير المعدود', 'مع المعدود الجمع'],
    ['much information · much time', 'many files · many people'],
    ['How much time do we have?', 'How many people are coming?'],
    ['a lot of / lots of تصلح مع الاثنين', 'a lot of / lots of تصلح مع الاثنين'],
  ], 'الاختبار السريع: هل يمكن عدّه بـ one, two, three؟ إن نعم — many.'),

  gerund_vs_inf: C('الفرق بين ing و to + مصدر', 'verb + -ing', 'verb + to', [
    ['enjoy · avoid · finish · suggest', 'want · decide · hope · plan'],
    ['I enjoy reading.', 'I decided to read.'],
    ['بعد أي حرف جر', 'للتعبير عن الهدف'],
    ['Running is good for you.', 'I came here to help.'],
  ], 'الاختبار السريع: بعد حرف جر؟ دائمًا ing.'),

  defining_vs_not: C('الفرق بين الجملة المُعرِّفة وغير المُعرِّفة', 'مُعرِّفة (بلا فواصل)', 'غير مُعرِّفة (بين فاصلتين)', [
    ['تحدّد أيّ شيء نقصد', 'تضيف معلومة عن شيء معروف'],
    ['The report that arrived today is late.', 'The report, which arrives weekly, is late.'],
    ['يجوز فيها that', 'لا يجوز فيها that'],
    ['حذفها يغيّر المعنى', 'حذفها لا يغيّر المعنى الأساسي'],
  ], 'الاختبار السريع: احذفي الجملة — هل ما زلتِ تعرفين أيّ شيء نقصد؟'),

  used_to_forms: C('الفرق بين used to و be/get used to', 'used to + مصدر', 'be / get used to + ing', [
    ['عادة ماضية انتهت', 'الاعتياد على شيء'],
    ['I used to live in Jeddah.', "I'm used to living here now."],
    ['يتبعها الفعل المجرّد', 'يتبعها اسم أو فعل + ing'],
    ['لا تُستخدم للحاضر', 'get used to = يعتاد تدريجيًّا'],
  ], 'الاختبار السريع: هل بعدها فعل مجرّد أم ing؟ ing يعني الاعتياد.'),

  cond_1_vs_2: C('الفرق بين الشرطية الأولى والثانية', 'الأولى (واقعية)', 'الثانية (افتراضية)', [
    ['احتمال حقيقي', 'موقف غير واقعيّ الآن'],
    ['If it rains, we will stay in.', 'If I were rich, I would travel.'],
    ['if + مضارع بسيط، will', 'if + ماضٍ بسيط، would'],
    ['نتيجة متوقّعة فعلًا', 'خيال أو نصيحة'],
  ], 'الاختبار السريع: هل يمكن أن يحدث فعلًا؟ إن نعم — الأولى.'),

  cond_2_vs_3: C('الفرق بين الشرطية الثانية والثالثة', 'الثانية (حاضر افتراضي)', 'الثالثة (ماضٍ لم يحدث)', [
    ['الآن أو عمومًا', 'انتهى ولا يمكن تغييره'],
    ['If I had time, I would help.', 'If I had had time, I would have helped.'],
    ['if + ماضٍ بسيط، would + مصدر', 'if + had + p.p.، would have + p.p.'],
    ['ما زال ممكنًا نظريًّا', 'ندم على ما فات'],
  ], 'الاختبار السريع: هل الوقت قد فات فعلًا؟ إن نعم — الثالثة.'),

  comp_vs_sup: C('الفرق بين المقارنة والتفضيل', 'Comparative', 'Superlative', [
    ['بين شيئين', 'بين ثلاثة فأكثر'],
    ['This is cheaper than that.', 'This is the cheapest of all.'],
    ['adj-er / more + adj + than', 'the + adj-est / the most + adj'],
    ['يحتاج than', 'يحتاج the'],
  ], 'الاختبار السريع: كم شيئًا تقارنين؟ اثنان — مقارنة.'),

  say_vs_tell: C('الفرق بين say و tell', 'say', 'tell', [
    ['لا يأخذ مفعولًا شخصيًّا مباشرًا', 'يأخذ الشخص مباشرةً بعده'],
    ['He said (that) it was ready.', 'He told me (that) it was ready.'],
    ['say to somebody', 'tell somebody something'],
    ['say hello · say sorry', 'tell a story · tell the truth'],
  ], 'الاختبار السريع: هل ذكرتِ لمَن قال؟ إن نعم — tell.'),

  want_vs_would_like: C('الفرق بين want و would like', 'want', 'would like', [
    ['مباشر — مع المقرّبين', 'مهذّب — مع الغرباء وفي الخدمات'],
    ['I want a coffee.', "I'd like a coffee, please."],
    ['Do you want…?', 'Would you like…?'],
    ['يتبعها اسم أو to + فعل', 'يتبعها اسم أو to + فعل'],
  ], 'الاختبار السريع: في مطعم أو مع شخص لا تعرفينه — استخدمي would like.'),

  too_vs_enough: C('الفرق بين too و enough', 'too', 'enough', [
    ['أكثر من اللازم — سلبي', 'بالقدر الكافي'],
    ['This bag is too heavy.', 'This bag is light enough.'],
    ['too + صفة', 'صفة + enough'],
    ['too much / too many + اسم', 'enough + اسم'],
  ], 'الاختبار السريع: enough تأتي بعد الصفة وقبل الاسم.'),

  since_vs_for: C('الفرق بين since و for', 'since', 'for', [
    ['نقطة البداية', 'طول المدّة'],
    ['since Monday · since 2020', 'for three days · for two years'],
    ['I have worked here since March.', 'I have worked here for six months.'],
  ], 'الاختبار السريع: هل هذا وقت محدّد بدأ فيه؟ إن نعم — since.'),

  articles: C('الفرق بين a / an / the', 'a / an', 'the', [
    ['شيء غير محدّد أو يُذكر أول مرة', 'شيء محدّد أو ذُكر من قبل'],
    ['I saw a car.', 'The car was red.'],
    ['a قبل صوت ساكن · an قبل صوت علّة', 'تصلح للمفرد والجمع'],
    ['a university (صوت y) · an hour (h صامتة)', 'the sun · the first · the best'],
  ], 'الاختبار السريع: هل يعرف السامع أيّ واحد تحديدًا؟ إن نعم — the.'),

  demonstratives: C('الفرق بين this / that / these / those', 'قريب', 'بعيد', [
    ['this (مفرد قريب)', 'that (مفرد بعيد)'],
    ['these (جمع قريب)', 'those (جمع بعيد)'],
    ['This file is mine.', 'That file is yours.'],
    ['These files are new.', 'Those files are old.'],
  ], 'الاختبار السريع: قريب أم بعيد؟ ثم مفرد أم جمع؟'),

  pp_vs_ppc: C('الفرق بين المضارع التام والمضارع التام المستمر', 'have + p.p.', 'have been + ing', [
    ['النتيجة أو الكمّ المنجَز', 'المدّة والاستمرار'],
    ['I have written three emails.', 'I have been writing all morning.'],
    ['كم أنجزتِ', 'كم استغرق الأمر'],
    ['يصلح مع الأفعال الذهنية', 'لا يُستخدم مع know, like'],
  ], 'الاختبار السريع: تُبرزين العدد المنجَز أم طول الوقت؟'),

  so_vs_such: C('الفرق بين so و such', 'so', 'such', [
    ['so + صفة أو ظرف', 'such + (a/an) + صفة + اسم'],
    ['The report was so long.', 'It was such a long report.'],
    ['so many / so much + اسم', 'such + اسم جمع بدون a'],
  ], 'الاختبار السريع: هل يوجد اسم بعد الصفة؟ إن نعم — such.'),

  despite_vs_although: C('الفرق بين although و despite', 'although / even though', 'despite / in spite of', [
    ['يتبعها جملة كاملة', 'يتبعها اسم أو فعل + ing'],
    ['Although it was late, we finished.', 'Despite the late hour, we finished.'],
    ['فاعل + فعل', 'لا فعل مصرَّف بعدها'],
    ['لا نقول «despite of»', 'in spite of تُكتب بثلاث كلمات'],
  ], 'الاختبار السريع: بعدها فاعل وفعل؟ إذًا although.'),

  both_either_neither: C('الفرق بين both / either / neither', 'both', 'either / neither', [
    ['الاثنان معًا', 'either = أحدهما · neither = لا أحد منهما'],
    ['Both options work.', 'Either option works. · Neither option works.'],
    ['both + جمع', 'either / neither + مفرد'],
    ['both … and', 'either … or · neither … nor'],
  ], 'الاختبار السريع: both يأخذ الجمع، و either/neither يأخذان المفرد.'),

  active_vs_passive: C('الفرق بين المبني للمعلوم والمجهول', 'Active', 'Passive', [
    ['نركّز على الفاعل', 'نركّز على الحدث'],
    ['Finance approves the invoice.', 'The invoice is approved by finance.'],
    ['المفعول به يصبح فاعلًا نحويًّا', 'be + التصريف الثالث'],
    ['أوضح وأقصر', 'أنسب للتقارير والعمليات'],
  ], 'الاختبار السريع: هل يهمّ مَن نفّذ؟ إن لا — المجهول.'),

  wish_forms: C('الفرق بين صيغ wish', 'wish + ماضٍ بسيط', 'wish + ماضٍ تام', [
    ['تمنٍّ عن الحاضر', 'ندم على الماضي'],
    ['I wish I had more time.', 'I wish I had studied earlier.'],
    ['الوضع ما زال قائمًا', 'الوقت فات'],
  ], 'الاختبار السريع: هل تتمنّين تغيير الآن أم تندمين على ما مضى؟'),

  frequency_position: C('أين يقع ظرف التكرار؟', 'قبل الفعل الأصلي', 'بعد فعل الكينونة', [
    ['She always checks the log.', 'She is always careful.'],
    ['They never reply late.', 'They are never late.'],
    ['مع have to: I always have to check.', 'مع can: I can always check.'],
  ], 'الاختبار السريع: هل الفعل هو be؟ إن نعم — الظرف بعده.'),

  by_vs_with: C('الفرق بين by و with في المبني للمجهول', 'by', 'with', [
    ['مَن نفّذ الفعل', 'الأداة المستخدمة'],
    ['The file was opened by the manager.', 'The file was opened with a password.'],
    ['شخص أو جهة', 'أداة أو وسيلة'],
  ], 'الاختبار السريع: شخص → by. أداة → with.'),
}

// lesson topic → contrast card key(s)
const CONTRAST_RULES = [
  [/(present perfect.*(vs|versus).*past simple)|(past simple.*(vs|versus).*present perfect)/, ['pp_vs_past']],
  [/present perfect.*(\+|&|and).*present continuous|present perfect (continuous|cont)/, ['pp_vs_ppc']],
  [/will vs going to|future forms|will.*going to/, ['will_vs_going_to']],
  [/(present continuous.*(vs|versus).*present simple)|(present simple.*(vs|versus).*present continuous)/, ['simple_vs_cont']],
  [/past continuous/, ['past_simple_vs_cont']],
  [/must.*have to|have to.*must|obligation/, ['must_vs_have_to', 'should_vs_must']],
  [/necessity|urgency/, ['must_vs_have_to']],
  [/should/, ['should_vs_must']],
  [/some\/any|some.*any/, ['some_vs_any']],
  [/how much\/how many|much.*many|countable/, ['much_vs_many']],
  [/gerund|infinitive/, ['gerund_vs_inf']],
  [/relative clause/, ['defining_vs_not']],
  [/get used to|be used to/, ['used_to_forms']],
  [/used to/, ['used_to_forms']],
  [/first (&|and) second conditional/, ['cond_1_vs_2']],
  [/third conditional|mixed conditional/, ['cond_2_vs_3']],
  [/second conditional/, ['cond_1_vs_2']],
  [/first conditional/, ['cond_1_vs_2']],
  [/superlative/, ['comp_vs_sup']],
  [/comparative/, ['comp_vs_sup']],
  [/reported speech|indirect/, ['say_vs_tell']],
  [/want\/would like|would like/, ['want_vs_would_like']],
  [/too\/enough|too.*enough/, ['too_vs_enough']],
  [/present perfect/, ['pp_vs_past', 'since_vs_for']],
  [/a\/an\/the|articles/, ['articles']],
  [/this\/that\/these\/those/, ['demonstratives']],
  [/so\/such/, ['so_vs_such']],
  [/concession|contrast|although|despite/, ['despite_vs_although']],
  [/both\/either\/neither/, ['both_either_neither']],
  [/passive/, ['active_vs_passive', 'by_vs_with']],
  [/wish/, ['wish_forms']],
  [/adverbs? of frequency/, ['frequency_position']],
  [/past simple|simple past/, ['pp_vs_past']],
]

function contrastsFor(topic) {
  const t = String(topic || '').toLowerCase()
  for (const [re, keys] of CONTRAST_RULES) if (re.test(t)) return keys
  return []
}

module.exports = { CONTRASTS, contrastsFor }
