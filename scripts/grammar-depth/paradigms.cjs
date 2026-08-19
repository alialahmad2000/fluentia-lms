/**
 * Shared form paradigms — the efficiency core of the depth layer.
 *
 * The audit found the standard curriculum covers the negative form in 33% of
 * lessons, the question form in 24%, short answers in 0% and spelling/form
 * changes in 1%. That gap is almost entirely SYSTEMATIC: every tense and modal
 * builds its negative, question and short answer the same way. So instead of
 * writing 154 forms tables, we write ~22 paradigms here and generate them.
 *
 * `null` paradigm is a first-class answer: prepositions, discourse markers and
 * register have no verb paradigm, and inventing a forms table for them would be
 * fabricated teaching content. Those lessons get depth from the other layers.
 *
 * Each paradigm yields a table: الصيغة | البنية | مثال
 */

const T = (rows) => rows.map(([form, pattern, example]) => [form, pattern, example])

const PARADIGMS = {
  be_present: {
    label_ar: 'فعل الكينونة في المضارع',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>am / is / are</b>', 'She <b>is</b> a teacher.'],
      ['منفي', "subject + <b>am not / isn't / aren't</b>", "She <b>isn't</b> a teacher."],
      ['سؤال', '<b>Am / Is / Are</b> + subject …?', '<b>Is</b> she a teacher?'],
      ['إجابة قصيرة', 'Yes, subject + be. / No, subject + be + not.', "Yes, she <b>is</b>. / No, she <b>isn't</b>."],
    ]),
    persons: T([
      ['I', 'am', "I'm ready."],
      ['he / she / it', 'is', "He's ready."],
      ['you / we / they', 'are', "They're ready."],
    ]),
  },

  present_simple: {
    label_ar: 'المضارع البسيط',
    spelling: ['third_person_s'],
    forms: T([
      ['مثبت', 'subject + <b>base verb</b> ( + <b>s</b> with he/she/it )', 'She <b>works</b> from home.'],
      ['منفي', "subject + <b>don't / doesn't</b> + base verb", "She <b>doesn't work</b> from home."],
      ['سؤال', '<b>Do / Does</b> + subject + base verb?', '<b>Does</b> she <b>work</b> from home?'],
      ['إجابة قصيرة', "Yes, subject + do/does. / No, subject + don't/doesn't.", "Yes, she <b>does</b>. / No, she <b>doesn't</b>."],
    ]),
    note_ar: 'انتبهي: الـ <b>s</b> تنتقل إلى does في النفي والسؤال، فلا نكرّرها على الفعل.',
  },

  present_continuous: {
    label_ar: 'المضارع المستمر',
    spelling: ['ing_form'],
    forms: T([
      ['مثبت', 'subject + <b>am / is / are</b> + verb-<b>ing</b>', 'They <b>are testing</b> the module.'],
      ['منفي', "subject + <b>am not / isn't / aren't</b> + verb-ing", "They <b>aren't testing</b> the module."],
      ['سؤال', '<b>Am / Is / Are</b> + subject + verb-ing?', '<b>Are</b> they <b>testing</b> the module?'],
      ['إجابة قصيرة', 'Yes, subject + be. / No, subject + be + not.', "Yes, they <b>are</b>. / No, they <b>aren't</b>."],
    ]),
  },

  past_simple_regular: {
    label_ar: 'الماضي البسيط — الأفعال المنتظمة',
    spelling: ['ed_form'],
    forms: T([
      ['مثبت', 'subject + verb-<b>ed</b>', 'We <b>finished</b> the report.'],
      ['منفي', "subject + <b>didn't</b> + <b>base verb</b>", "We <b>didn't finish</b> the report."],
      ['سؤال', '<b>Did</b> + subject + <b>base verb</b>?', '<b>Did</b> you <b>finish</b> the report?'],
      ['إجابة قصيرة', "Yes, subject + did. / No, subject + didn't.", "Yes, we <b>did</b>. / No, we <b>didn't</b>."],
    ]),
    note_ar: 'القاعدة الذهبية: بعد <b>did</b> و<b>didn\'t</b> يعود الفعل إلى شكله المجرّد — لا ماضٍ ولا s.',
  },

  past_simple_irregular: {
    label_ar: 'الماضي البسيط — الأفعال الشاذة',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>V2</b> (الشكل الثاني)', 'She <b>went</b> to the meeting.'],
      ['منفي', "subject + <b>didn't</b> + <b>base verb</b>", "She <b>didn't go</b> to the meeting."],
      ['سؤال', '<b>Did</b> + subject + <b>base verb</b>?', '<b>Did</b> she <b>go</b> to the meeting?'],
      ['إجابة قصيرة', "Yes, subject + did. / No, subject + didn't.", "Yes, she <b>did</b>. / No, she <b>didn't</b>."],
    ]),
    note_ar: 'الشكل الشاذ يظهر في الإثبات فقط. في النفي والسؤال يعود الفعل مجرّدًا: <i>didn\'t go</i> لا <i>didn\'t went</i>.',
  },

  past_continuous: {
    label_ar: 'الماضي المستمر',
    spelling: ['ing_form'],
    forms: T([
      ['مثبت', 'subject + <b>was / were</b> + verb-<b>ing</b>', 'I <b>was working</b> when she called.'],
      ['منفي', "subject + <b>wasn't / weren't</b> + verb-ing", "I <b>wasn't working</b> at the time."],
      ['سؤال', '<b>Was / Were</b> + subject + verb-ing?', '<b>Were</b> you <b>working</b> then?'],
      ['إجابة قصيرة', 'Yes, subject + was/were. / No, + not.', "Yes, I <b>was</b>. / No, I <b>wasn't</b>."],
    ]),
  },

  present_perfect: {
    label_ar: 'المضارع التام',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>have / has</b> + past participle', 'She <b>has finished</b> the report.'],
      ['منفي', "subject + <b>haven't / hasn't</b> + past participle", "She <b>hasn't finished</b> the report."],
      ['سؤال', '<b>Have / Has</b> + subject + past participle?', '<b>Has</b> she <b>finished</b> the report?'],
      ['إجابة قصيرة', "Yes, subject + have/has. / No, + haven't/hasn't.", "Yes, she <b>has</b>. / No, she <b>hasn't</b>."],
    ]),
    persons: T([
      ['I / you / we / they', 'have', 'They <b>have</b> arrived.'],
      ['he / she / it', 'has', 'He <b>has</b> arrived.'],
    ]),
  },

  present_perfect_continuous: {
    label_ar: 'المضارع التام المستمر',
    spelling: ['ing_form'],
    forms: T([
      ['مثبت', 'subject + <b>have / has been</b> + verb-<b>ing</b>', 'We <b>have been working</b> since Monday.'],
      ['منفي', "subject + <b>haven't / hasn't been</b> + verb-ing", "We <b>haven't been working</b> on it."],
      ['سؤال', '<b>Have / Has</b> + subject + <b>been</b> + verb-ing?', '<b>Have</b> you <b>been working</b> on it?'],
      ['إجابة قصيرة', "Yes, subject + have/has. / No, + haven't/hasn't.", "Yes, we <b>have</b>. / No, we <b>haven't</b>."],
    ]),
  },

  past_perfect: {
    label_ar: 'الماضي التام',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>had</b> + past participle', 'They <b>had left</b> before I arrived.'],
      ['منفي', "subject + <b>hadn't</b> + past participle", "They <b>hadn't left</b> yet."],
      ['سؤال', '<b>Had</b> + subject + past participle?', '<b>Had</b> they <b>left</b> already?'],
      ['إجابة قصيرة', "Yes, subject + had. / No, subject + hadn't.", "Yes, they <b>had</b>. / No, they <b>hadn't</b>."],
    ]),
  },

  future_will: {
    label_ar: 'المستقبل بـ will',
    spelling: [],
    forms: T([
      ['مثبت', "subject + <b>will</b> + base verb", "I <b>will send</b> it today."],
      ['منفي', "subject + <b>won't</b> + base verb", "I <b>won't send</b> it today."],
      ['سؤال', '<b>Will</b> + subject + base verb?', '<b>Will</b> you <b>send</b> it today?'],
      ['إجابة قصيرة', "Yes, subject + will. / No, subject + won't.", "Yes, I <b>will</b>. / No, I <b>won't</b>."],
    ]),
    note_ar: 'صيغة <b>will</b> لا تتغيّر مع الفاعل أبدًا — لا نقول <i>he wills</i>.',
  },

  future_going_to: {
    label_ar: 'المستقبل بـ going to',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>am / is / are going to</b> + base verb', 'We <b>are going to launch</b> in May.'],
      ['منفي', "subject + <b>am not / isn't / aren't going to</b> + base verb", "We <b>aren't going to launch</b> in May."],
      ['سؤال', '<b>Am / Is / Are</b> + subject + <b>going to</b> + base verb?', '<b>Are</b> you <b>going to launch</b> in May?'],
      ['إجابة قصيرة', 'Yes, subject + be. / No, subject + be + not.', "Yes, we <b>are</b>. / No, we <b>aren't</b>."],
    ]),
  },

  future_perfect: {
    label_ar: 'المستقبل التام',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>will have</b> + past participle', 'By June we <b>will have finished</b>.'],
      ['منفي', "subject + <b>won't have</b> + past participle", "By June we <b>won't have finished</b>."],
      ['سؤال', '<b>Will</b> + subject + <b>have</b> + past participle?', '<b>Will</b> you <b>have finished</b> by June?'],
      ['إجابة قصيرة', "Yes, subject + will. / No, subject + won't.", "Yes, we <b>will</b>. / No, we <b>won't</b>."],
    ]),
  },

  future_continuous: {
    label_ar: 'المستقبل المستمر',
    spelling: ['ing_form'],
    forms: T([
      ['مثبت', 'subject + <b>will be</b> + verb-<b>ing</b>', 'At 9 we <b>will be testing</b>.'],
      ['منفي', "subject + <b>won't be</b> + verb-ing", "At 9 we <b>won't be testing</b>."],
      ['سؤال', '<b>Will</b> + subject + <b>be</b> + verb-ing?', '<b>Will</b> you <b>be testing</b> at 9?'],
      ['إجابة قصيرة', "Yes, subject + will. / No, subject + won't.", "Yes, we <b>will</b>. / No, we <b>won't</b>."],
    ]),
  },

  modal: {
    label_ar: 'الأفعال الناقصة (modals)',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>modal</b> + <b>base verb</b>', 'You <b>should send</b> it now.'],
      ['منفي', "subject + <b>modal + not</b> + base verb", "You <b>shouldn't send</b> it now."],
      ['سؤال', '<b>Modal</b> + subject + base verb?', '<b>Should</b> I <b>send</b> it now?'],
      ['إجابة قصيرة', 'Yes, subject + modal. / No, + modal + not.', "Yes, you <b>should</b>. / No, you <b>shouldn't</b>."],
    ]),
    note_ar: 'الفعل الناقص لا يأخذ <b>s</b> ولا <b>to</b> ولا <b>did</b>: <i>She can go</i> — لا <i>She cans</i> ولا <i>She can to go</i>.',
  },

  have_to: {
    label_ar: 'have to / need to — تتصرّف كفعل عادي',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>have to / has to</b> + base verb', 'She <b>has to</b> confirm it.'],
      ['منفي', "subject + <b>don't / doesn't have to</b> + base verb", "She <b>doesn't have to</b> confirm it."],
      ['سؤال', '<b>Do / Does</b> + subject + <b>have to</b> + base verb?', '<b>Does</b> she <b>have to</b> confirm it?'],
      ['إجابة قصيرة', "Yes, subject + do/does. / No, + don't/doesn't.", "Yes, she <b>does</b>. / No, she <b>doesn't</b>."],
    ]),
    note_ar: 'الفرق الحاسم: <b>mustn\'t</b> تعني «ممنوع»، أمّا <b>don\'t have to</b> فتعني «ليس ضروريًّا».',
  },

  passive_present: {
    label_ar: 'المبني للمجهول — المضارع',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>is / are</b> + past participle', 'The invoice <b>is approved</b> by finance.'],
      ['منفي', "subject + <b>isn't / aren't</b> + past participle", "The invoice <b>isn't approved</b> yet."],
      ['سؤال', '<b>Is / Are</b> + subject + past participle?', '<b>Is</b> the invoice <b>approved</b>?'],
      ['إجابة قصيرة', 'Yes, subject + be. / No, subject + be + not.', "Yes, it <b>is</b>. / No, it <b>isn't</b>."],
    ]),
  },

  passive_past: {
    label_ar: 'المبني للمجهول — الماضي',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>was / were</b> + past participle', 'The issue <b>was resolved</b> at 09:41.'],
      ['منفي', "subject + <b>wasn't / weren't</b> + past participle", "The issue <b>wasn't resolved</b> then."],
      ['سؤال', '<b>Was / Were</b> + subject + past participle?', '<b>Was</b> the issue <b>resolved</b>?'],
      ['إجابة قصيرة', 'Yes, subject + was/were. / No, + not.', "Yes, it <b>was</b>. / No, it <b>wasn't</b>."],
    ]),
  },

  conditional_1: {
    label_ar: 'الشرطية الأولى',
    spelling: [],
    forms: T([
      ['مثبت', '<b>If</b> + present simple, … <b>will</b> + base verb', '<b>If</b> we add it, the date <b>will</b> slip.'],
      ['منفي', "<b>If</b> + don't/doesn't …, … <b>won't</b> + base verb", "<b>If</b> we <b>don't</b> add it, the date <b>won't</b> slip."],
      ['سؤال', '<b>What will</b> happen <b>if</b> + present simple?', '<b>What will</b> happen <b>if</b> we add it?'],
      ['ترتيب معكوس', '… will + base verb <b>if</b> + present simple', 'The date <b>will</b> slip <b>if</b> we add it.'],
    ]),
    note_ar: 'لا نضع <b>will</b> بعد <b>if</b> أبدًا. وإذا بدأت الجملة بـ if نضع فاصلة في المنتصف؛ وإذا بدأت بالنتيجة فلا فاصلة.',
  },

  conditional_2: {
    label_ar: 'الشرطية الثانية',
    spelling: [],
    forms: T([
      ['مثبت', '<b>If</b> + past simple, … <b>would</b> + base verb', '<b>If</b> we <b>had</b> time, we <b>would</b> add it.'],
      ['منفي', "<b>If</b> + didn't …, … <b>wouldn't</b> + base verb", "<b>If</b> we <b>didn't</b> have time, we <b>wouldn't</b> add it."],
      ['نصيحة', '<b>If I were you</b>, I <b>would</b> + base verb', '<b>If I were you</b>, I <b>would</b> phase it.'],
      ['سؤال', '<b>What would</b> you do <b>if</b> + past simple?', '<b>What would</b> you do <b>if</b> he refused?'],
    ]),
    note_ar: 'تُستخدم <b>were</b> مع جميع الضمائر في «If I were you». ولا نضع <b>would</b> بعد if.',
  },

  conditional_3: {
    label_ar: 'الشرطية الثالثة',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', '<b>If</b> + had + p.p., … <b>would have</b> + p.p.', '<b>If</b> we <b>had known</b>, we <b>would have</b> waited.'],
      ['منفي', "<b>If</b> + hadn't + p.p., … <b>wouldn't have</b> + p.p.", "<b>If</b> we <b>hadn't</b> waited, we <b>wouldn't have</b> found it."],
      ['سؤال', '<b>What would</b> you <b>have</b> done <b>if</b> …?', '<b>What would</b> you <b>have</b> done <b>if</b> it failed?'],
    ]),
    note_ar: 'الشرطية الثالثة تتحدّث عن ماضٍ لم يحدث — نتيجتها خيالية لا واقعية.',
  },

  there_be: {
    label_ar: 'there is / there are',
    spelling: [],
    forms: T([
      ['مثبت', '<b>There is</b> + مفرد · <b>There are</b> + جمع', '<b>There is</b> a problem. · <b>There are</b> two options.'],
      ['منفي', "<b>There isn't</b> / <b>There aren't</b>", "<b>There isn't</b> a problem."],
      ['سؤال', '<b>Is there</b> …? · <b>Are there</b> …?', '<b>Is there</b> a problem?'],
      ['إجابة قصيرة', "Yes, there is. / No, there isn't.", "Yes, there <b>is</b>. / No, there <b>isn't</b>."],
    ]),
  },

  imperative: {
    label_ar: 'صيغة الأمر',
    spelling: [],
    forms: T([
      ['أمر', '<b>base verb</b> + …', '<b>Log in</b> with your credentials.'],
      ['نهي', "<b>Don't</b> + base verb", "<b>Don't close</b> it before saving."],
      ['تلطيف', '<b>Please</b> + base verb · <b>Could you</b> + base verb?', '<b>Please</b> save first. · <b>Could you</b> save first?'],
      ['تأكيد', '<b>Make sure you</b> + base verb', '<b>Make sure you</b> save before closing.'],
    ]),
    note_ar: 'صيغة الأمر لا تذكر الفاعل — المخاطَب مفهوم ضمنًا.',
  },

  comparative_superlative: {
    label_ar: 'المقارنة والتفضيل',
    spelling: ['comparative_form'],
    forms: T([
      ['مقارنة', 'adj-<b>er</b> / <b>more</b> + adj + <b>than</b>', 'This option is <b>cheaper than</b> that one.'],
      ['تفضيل', '<b>the</b> + adj-<b>est</b> / <b>the most</b> + adj', 'This is <b>the cheapest</b> option.'],
      ['تساوٍ', '<b>as</b> + adj + <b>as</b>', "It's <b>as fast as</b> the old one."],
      ['نفي التساوي', "<b>not as</b> + adj + <b>as</b>", "It's <b>not as fast as</b> the old one."],
    ]),
  },

  used_to: {
    label_ar: 'used to — عادة ماضية',
    spelling: [],
    forms: T([
      ['مثبت', 'subject + <b>used to</b> + base verb', 'We <b>used to</b> meet weekly.'],
      ['منفي', "subject + <b>didn't use to</b> + base verb", "We <b>didn't use to</b> meet weekly."],
      ['سؤال', '<b>Did</b> + subject + <b>use to</b> + base verb?', '<b>Did</b> you <b>use to</b> meet weekly?'],
    ]),
    note_ar: 'في النفي والسؤال تسقط الـ <b>d</b>: <i>didn\'t use to</i> لا <i>didn\'t used to</i>.',
  },

  reported_speech: {
    label_ar: 'الكلام المنقول',
    spelling: [],
    forms: T([
      ['خبر', 'said / told + (that) + subject + <b>فعل متراجع خطوة</b>', 'He <b>said</b> the report <b>was</b> ready.'],
      ['سؤال نعم/لا', 'asked + <b>if / whether</b> + subject + verb', 'She <b>asked whether</b> we <b>could</b> start.'],
      ['سؤال استفهام', 'asked + <b>wh-</b> + subject + verb', 'They <b>asked when</b> it <b>would</b> launch.'],
      ['أمر', 'told + somebody + <b>to</b> + base verb', 'She <b>told me to</b> wait.'],
    ]),
    note_ar: 'لا نقلب الفاعل والفعل في السؤال المنقول، ولا نضع علامة استفهام.',
  },

  relative_clause: {
    label_ar: 'الجُمَل الوصفية',
    spelling: [],
    forms: T([
      ['مُعرِّفة', 'noun + <b>who / which / that</b> + clause — بلا فواصل', 'The users <b>who have</b> the role get it.'],
      ['غير مُعرِّفة', 'noun<b>,</b> <b>who / which</b> + clause<b>,</b> …', 'The report<b>, which</b> is weekly<b>,</b> is automated.'],
      ['ملكية', 'noun + <b>whose</b> + noun', 'A rule <b>whose</b> meaning is unclear.'],
      ['مكان / زمان', 'noun + <b>where / when</b> + clause', 'The screen <b>where</b> you approve it.'],
    ]),
    note_ar: 'لا تُستخدم <b>that</b> في الجملة غير المُعرِّفة بين فاصلتين.',
  },

  gerund_infinitive: {
    label_ar: 'المصدر الصريح والـ gerund',
    spelling: ['ing_form'],
    forms: T([
      ['gerund', 'verb + <b>-ing</b>', 'I <b>recommend running</b> a pilot.'],
      ['to + مصدر', 'verb + <b>to</b> + base verb', 'I <b>decided to run</b> a pilot.'],
      ['بعد حرف جر', 'preposition + <b>-ing</b>', "We're interested <b>in running</b> a pilot."],
      ['كفاعل', '<b>-ing</b> + … + verb', '<b>Running</b> a pilot <b>takes</b> two weeks.'],
    ]),
  },

  would_like: {
    label_ar: 'would like — الرغبة المهذّبة',
    spelling: [],
    forms: T([
      ['مثبت + فعل', "subject + <b>would like to</b> + base verb", "I <b>'d like to</b> book a room."],
      ['مثبت + اسم', 'subject + <b>would like</b> + noun', "I <b>'d like</b> a coffee, please."],
      ['منفي', "subject + <b>wouldn't like</b> + …", "I <b>wouldn't like</b> to wait."],
      ['سؤال', '<b>Would</b> + subject + <b>like</b> …?', '<b>Would</b> you <b>like</b> some tea?'],
      ['إجابة قصيرة', "Yes, please. / No, thank you. / Yes, I would.", 'Yes, please.'],
    ]),
    note_ar: 'صيغة <b>would like</b> أهذب من <b>want</b>، وتُختصر دائمًا إلى <b>\'d like</b> في الكلام.',
  },

  wish: {
    label_ar: 'wish — التمنّي',
    spelling: [],
    forms: T([
      ['تمنٍّ في الحاضر', 'wish + subject + <b>past simple</b>', 'I <b>wish</b> I <b>had</b> more time.'],
      ['تمنٍّ في الماضي', 'wish + subject + <b>had</b> + past participle', 'I <b>wish</b> I <b>had known</b> earlier.'],
      ['انزعاج من عادة', 'wish + subject + <b>would</b> + base verb', 'I <b>wish</b> he <b>would</b> reply faster.'],
      ['مع be', 'wish + subject + <b>were</b> (لكل الضمائر)', 'I <b>wish</b> it <b>were</b> simpler.'],
    ]),
    note_ar: 'الزمن يتراجع خطوة عن الواقع: للحاضر نستخدم الماضي، وللماضي نستخدم الماضي التام.',
  },

  have_something_done: {
    label_ar: 'have / get something done',
    spelling: ['past_participle'],
    forms: T([
      ['مثبت', 'subject + <b>have</b> + object + <b>past participle</b>', 'We <b>had</b> the servers <b>upgraded</b>.'],
      ['منفي', "subject + <b>didn't have</b> + object + past participle", "We <b>didn't have</b> them <b>upgraded</b>."],
      ['سؤال', '<b>Did</b> + subject + <b>have</b> + object + p.p.?', '<b>Did</b> you <b>have</b> them <b>upgraded</b>?'],
      ['بديل أقرب للكلام', 'subject + <b>get</b> + object + past participle', 'We <b>got</b> the report <b>reviewed</b>.'],
    ]),
    note_ar: 'المعنى: شخص آخر نفّذ العمل بترتيبٍ منكِ — لا أنتِ.',
  },

  mixed_conditional: {
    label_ar: 'الشرطية المختلطة',
    spelling: ['past_participle'],
    forms: T([
      ['ماضٍ ← حاضر', '<b>If</b> + had + p.p., … <b>would</b> + base verb', '<b>If</b> we <b>had planned</b> better, we <b>would be</b> ready now.'],
      ['حاضر ← ماضٍ', '<b>If</b> + past simple, … <b>would have</b> + p.p.', "<b>If</b> she <b>were</b> more careful, she <b>wouldn't have missed</b> it."],
    ]),
    note_ar: 'نخلط الزمنين حين يكون سبب الشرط في زمن ونتيجته في زمن آخر.',
  },
}

module.exports = { PARADIGMS }
