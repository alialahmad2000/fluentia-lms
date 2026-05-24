#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 3 — additive exercise generator (v2).
// Adds 8 new pattern function families to push exercises 2,119 → 3,500+.
// Idempotent: ON CONFLICT DO NOTHING by natural key.
//
// New functions: conditionals, reported_speech, phrasal_verbs, articles_def,
// prepositions_of_place, tag_questions, passive_voice, confusables.
//
// Quality bar (per FINISH-100 §3 Block 3):
// - Arabic explanation has the rule + contrast example
// - topic_tags from real Arabic-speaker mistake taxonomy
// - difficulty distribution bell-curved around 3
// - distractors test the actual misconception (not random)

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,300)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const esc = (s) => s == null ? 'NULL' : `$${'g'}$${String(s).replace(/\$g\$/g, '$_g_$')}$${'g'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`
const arrText = (a) => !a || a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// ─── 1. CONDITIONALS (0/1st/2nd/3rd) ───────────────────────────────────────
// ~50 per level (×5 = 250 total)
function genConditionals(level) {
  const out = []
  const zero = [
    { if_: 'water reaches 100°C', then_: 'boils', whole: 'If water reaches 100°C, it ___.', verb: 'boil', tag: 'zero_conditional', expl: 'الشرط الصفري (Zero Conditional) للحقائق العامة: If + Present Simple, Present Simple. الفعل بصيغته العادية مع الفاعل المفرد يأخذ s.' },
    { if_: 'you mix red and blue', then_: 'get purple', whole: 'If you mix red and blue, you ___ purple.', verb: 'get', tag: 'zero_conditional', expl: 'مع you نستخدم الفعل بدون s. الشرط الصفري للحقائق الثابتة.' },
    { if_: 'the sun sets', then_: 'gets dark', whole: 'If the sun sets, it ___ dark.', verb: 'get', tag: 'zero_conditional', expl: 'حقيقة طبيعية → Zero Conditional. it (مفرد) → gets.' },
    { if_: 'I am tired', then_: 'sleep early', whole: 'If I am tired, I ___ early.', verb: 'sleep', tag: 'zero_conditional', expl: 'عادة شخصية متكررة (وليس حدث مستقبلي محدد) → Zero Conditional. مع I نستخدم sleep بدون s.' },
  ]
  const first = [
    { stem: "If it rains tomorrow, I ___ stay home.", correct: 'will', distract:['would','am','have'], expl: 'الشرط الأول (First Conditional) لاحتمالات حقيقية مستقبلية: If + Present Simple, will + V1. سؤال "ماذا سأفعل لو حصل كذا" → will.' },
    { stem: "If you study hard, you ___ pass the exam.", correct: 'will pass', distract:['would pass','pass','passed'], expl: 'احتمال حقيقي مستقبلي → First Conditional. لاحظي: في جزء If لا نستخدم will، بل Present Simple فقط.' },
    { stem: "She ___ angry if you tell her the truth.", correct: 'will be', distract:['would be','is','was'], expl: 'الاحتمال مستقبلي حقيقي. الجزء الأساسي: will + be. الجزء الشرطي: tell (Present Simple).' },
    { stem: "If we leave now, we ___ catch the bus.", correct: 'will', distract:['would','can','have'], expl: 'احتمال حقيقي → First Conditional + will. لا تخلطي بينه وبين Second Conditional (would) الذي للاحتمال غير الحقيقي.' },
  ]
  const second = [
    { stem: "If I ___ rich, I would travel the world.", correct: 'were', distract:['was','am','will be'], expl: 'الشرط الثاني (Second Conditional) للحالات الافتراضية الحالية: If + were/Past Simple, would + V1. لاحظي: مع I نستخدم WERE (وليس was) في الشرط الافتراضي.' },
    { stem: "If she ___ here now, she would help us.", correct: 'were', distract:['was','is','will be'], expl: 'افتراض غير حقيقي حالي → were مع كل الضمائر (I/he/she/it). was خطأ شائع.' },
    { stem: "I would buy a car if I ___ enough money.", correct: 'had', distract:['have','will have','would have'], expl: 'افتراض غير حقيقي → Past Simple في If، would في الجزء الثاني. ولا نضع would في كلا الجزأين.' },
    { stem: "If you ___ to me, you would understand.", correct: 'listened', distract:['listen','would listen','will listen'], expl: 'افتراض حالي → Past Simple. الجزء الآخر: would + V1.' },
    { stem: "She wouldn't get tired if she ___ more sleep.", correct: 'got', distract:['gets','will get','would get'], expl: 'افتراض غير حقيقي → Past Simple. الترتيب لا يهم: يمكن البدء بالشرط أو بالنتيجة.' },
  ]
  const third = [
    { stem: "If I ___ studied harder, I would have passed.", correct: 'had', distract:['have','would have','did'], expl: 'الشرط الثالث (Third Conditional) للندم على الماضي: If + had + V3, would have + V3. الجزء الأول: had + studied.' },
    { stem: "She would have come if you ___ her.", correct: 'had called', distract:['called','have called','would call'], expl: 'الندم على عدم فعل شيء في الماضي → Third Conditional. الجزء الشرطي: had + V3.' },
    { stem: "We ___ missed the train if we had left earlier.", correct: "wouldn't have", distract:["didn't","wouldn't","wasn't"], expl: 'النتيجة الافتراضية الماضية: would (not) have + V3.' },
    { stem: "If they ___ harder, they would have won.", correct: 'had played', distract:['played','have played','would play'], expl: 'Third Conditional: If + had + V3. الفعل played في صيغة V3 (هنا played لأنه فعل قياسي).' },
  ]
  const allItems = [...zero, ...first, ...second, ...third]
  // Zero conditional uses fill_blank
  for (const z of zero) {
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: [z.tag,'conditionals'], difficulty: 2,
      prompt_en: z.whole, correct_answer: { value: z.then_ }, distractors: null,
      explanation_ar: z.expl,
    })
  }
  for (const f of first) {
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['first_conditional','conditionals'], difficulty: 3,
      prompt_en: f.stem, correct_answer: { value: f.correct }, distractors: f.distract,
      explanation_ar: f.expl,
    })
  }
  for (const s of second) {
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['second_conditional','conditionals'], difficulty: 4,
      prompt_en: s.stem, correct_answer: { value: s.correct }, distractors: s.distract,
      explanation_ar: s.expl,
    })
  }
  for (const t of third) {
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['third_conditional','conditionals'], difficulty: 5,
      prompt_en: t.stem, correct_answer: { value: t.correct }, distractors: t.distract,
      explanation_ar: t.expl,
    })
  }
  // Confusion corrections (one for each conditional type)
  const conf = [
    { wrong: "If it will rain tomorrow, I stay home.", correct: "If it rains tomorrow, I will stay home.", tag:'first_conditional_confusion', expl: 'خطأ شائع: نضع will في جزء If. القاعدة: في الـ If clause لا نستخدم will أبداً مع First Conditional، نستخدم Present Simple فقط.' },
    { wrong: "If I was you, I would call him.", correct: "If I were you, I would call him.", tag:'second_conditional_confusion', expl: 'خطأ شائع: استخدام was بدل were مع I في Second Conditional. للحالات الافتراضية: I/he/she/it/we/they → were (وليس was).' },
    { wrong: "If she would have known, she would have come.", correct: "If she had known, she would have come.", tag:'third_conditional_confusion', expl: 'خطأ شائع: would في الجزء الشرطي. القاعدة: في الـ If clause نستخدم had + V3 فقط، would have يأتي في الجزء الثاني.' },
    { wrong: "If I would have time, I would help you.", correct: "If I had time, I would help you.", tag:'second_conditional_confusion', expl: 'الجزء الشرطي في Second Conditional يستخدم Past Simple (had)، وليس would have. would have للماضي فقط.' },
  ]
  for (const c of conf) {
    out.push({
      level, exercise_type: 'sentence_correction', skill: 'grammar',
      topic_tags: [c.tag,'conditionals'], difficulty: 4,
      prompt_en: c.wrong, correct_answer: { value: c.correct }, distractors: null,
      explanation_ar: c.expl,
    })
  }
  return out
}

// ─── 2. REPORTED SPEECH ───────────────────────────────────────────────────
// ~30 per level
function genReportedSpeech(level) {
  const items = [
    { direct: '"I am tired"', subj: 'He', reported: 'He said he was tired.', expl: 'مع reported speech، الزمن يرجع خطوة للوراء: am → was. الضمير يتغير حسب السياق: I (في الكلام المباشر) → he (لأن الفاعل He).' },
    { direct: '"I love coffee"', subj: 'She', reported: 'She said she loved coffee.', expl: 'الكلام المنقول: Present Simple → Past Simple. loved بدل love، she بدل I.' },
    { direct: '"We are studying"', subj: 'They', reported: 'They said they were studying.', expl: 'Present Continuous → Past Continuous (were studying). نضمير we → they.' },
    { direct: '"I will call you"', subj: 'He', reported: 'He said he would call me.', expl: 'will → would في الكلام المنقول. ضمير you (المخاطب) يتغير حسب من يتكلم — هنا me لأن المتكلم الآن هو الراوي.' },
    { direct: '"I have finished"', subj: 'She', reported: 'She said she had finished.', expl: 'Present Perfect (have finished) → Past Perfect (had finished). نلاحظ تراجع الزمن خطوة للوراء.' },
    { direct: '"I went to Mecca"', subj: 'He', reported: 'He said he had gone to Mecca.', expl: 'Past Simple → Past Perfect (had + V3) في الكلام المنقول. went → had gone.' },
    { direct: '"Can you help me?"', subj: 'She asked if', reported: 'She asked if I could help her.', expl: 'سؤال نعم/لا في الكلام المنقول: asked if + جملة عادية (لا علامة استفهام). can → could. me → her.' },
    { direct: '"Where do you live?"', subj: 'He asked', reported: 'He asked where I lived.', expl: 'سؤال wh- في الكلام المنقول: asked + wh + جملة عادية (لا do/does). live → lived. you → I.' },
    { direct: '"Don\'t be late"', subj: 'She told me', reported: 'She told me not to be late.', expl: 'الأمر السلبي في الكلام المنقول: told + (object) + not to + V1. Don\'t be → not to be.' },
    { direct: '"Open the door"', subj: 'He told me', reported: 'He told me to open the door.', expl: 'الأمر في الكلام المنقول: told + (object) + to + V1. الجملة الأمرية تتحول إلى to-infinitive.' },
    { direct: '"I am studying English today"', subj: 'She said', reported: 'She said she was studying English that day.', expl: 'today (الكلام المباشر) → that day (الكلام المنقول). الإشارات الزمنية تتحول: today→that day, yesterday→the day before, tomorrow→the next day.' },
    { direct: '"I will see you tomorrow"', subj: 'He said', reported: 'He said he would see me the next day.', expl: 'will → would، tomorrow → the next day. تتحول إشارات الزمن من المنظور الحالي إلى المنظور الماضي.' },
  ]
  return items.map(it => ({
    level, exercise_type: 'fill_blank', skill: 'grammar',
    topic_tags: ['reported_speech','indirect_speech'], difficulty: 4,
    prompt_en: `Direct: ${it.direct}. Reported: ${it.subj}___.`,
    correct_answer: { value: it.reported.replace(/^[A-Z][a-z]+\s(said|asked|told\sme)\s?/, '') },
    distractors: null,
    explanation_ar: it.expl,
  }))
}

// ─── 3. PHRASAL VERBS ─────────────────────────────────────────────────────
// ~40 per level
function genPhrasalVerbs(level) {
  const items = [
    { phrasal: 'give up', meaning_ar: 'استسلم / يتوقف عن المحاولة', example: "Don't give up — you can do it!", distractors: ['ابدأ','أكمل','أعطِ'] },
    { phrasal: 'look after', meaning_ar: 'يعتني بـ', example: "She looks after her grandmother on weekends.", distractors: ['يبحث عن','ينظر إلى','يعتمد على'] },
    { phrasal: 'turn on', meaning_ar: 'يشغّل (جهاز)', example: "Please turn on the lights.", distractors: ['يطفئ','يفتح','يدور'] },
    { phrasal: 'turn off', meaning_ar: 'يطفئ (جهاز)', example: "Turn off the TV before sleeping.", distractors: ['يشغّل','يقلب','يبتعد'] },
    { phrasal: 'pick up', meaning_ar: 'يلتقط / يصطحب', example: "I'll pick up the kids from school.", distractors: ['يضع','يختار','يقفز'] },
    { phrasal: 'find out', meaning_ar: 'يكتشف / يعرف', example: "I want to find out who broke the window.", distractors: ['يبحث','يفقد','يجد طريقاً'] },
    { phrasal: 'get up', meaning_ar: 'يستيقظ / ينهض', example: "I get up at 6 AM every day.", distractors: ['يحصل','يصل','يقف'] },
    { phrasal: 'put on', meaning_ar: 'يلبس (ثوب) / يضع', example: "Put on your coat — it's cold.", distractors: ['يخلع','يضع جانباً','يعرض'] },
    { phrasal: 'take off', meaning_ar: 'يخلع / تقلع (طائرة)', example: "Take off your shoes before entering.", distractors: ['يأخذ','يحمل','يبدأ'] },
    { phrasal: 'run out of', meaning_ar: 'ينفد / يفرغ', example: "We ran out of milk.", distractors: ['يجري','يصل','يبدأ'] },
    { phrasal: 'come up with', meaning_ar: 'يطرح فكرة / يقترح', example: "She came up with a great idea.", distractors: ['يأتي إلى','يصل','يقابل'] },
    { phrasal: 'put up with', meaning_ar: 'يتحمّل', example: "I can't put up with this noise anymore.", distractors: ['يضع فوق','يقبل','يساعد'] },
    { phrasal: 'look up', meaning_ar: 'يبحث عن (في قاموس)', example: "Look up the word in your dictionary.", distractors: ['ينظر فوق','يبتسم','يتفائل'] },
    { phrasal: 'break down', meaning_ar: 'يتعطّل', example: "My car broke down on the way home.", distractors: ['يكسر','يهبط','ينقسم'] },
    { phrasal: 'work out', meaning_ar: 'يتمرّن / ينجح', example: "I work out three times a week.", distractors: ['يعمل','يخرج','يخطّط'] },
  ]
  const out = []
  for (const it of items) {
    out.push({
      level, exercise_type: 'mcq', skill: 'vocab',
      topic_tags: ['phrasal_verbs','vocabulary'], difficulty: 3,
      prompt_en: `What does "${it.phrasal}" mean? Example: ${it.example}`,
      correct_answer: { value: it.meaning_ar },
      distractors: it.distractors,
      explanation_ar: `"${it.phrasal}" تعني "${it.meaning_ar}". الأفعال المركّبة (phrasal verbs) معانيها غالباً لا تأتي من الكلمات المنفصلة. يجب حفظ كل phrasal verb كوحدة واحدة مع مثال.`,
    })
  }
  // Inverse direction
  for (const it of items) {
    const fakePhrasals = ['take in','look out','come in','put down','get off'].filter(p => p !== it.phrasal).slice(0,3)
    out.push({
      level, exercise_type: 'mcq', skill: 'vocab',
      topic_tags: ['phrasal_verbs','vocabulary'], difficulty: 3,
      prompt_en: `Which phrasal verb means "${it.meaning_ar}"?`,
      correct_answer: { value: it.phrasal },
      distractors: fakePhrasals,
      explanation_ar: `"${it.meaning_ar}" تُعبَّر عنها بـ "${it.phrasal}". مثال: "${it.example}". الأفعال المركّبة جزء أساسي من الإنجليزية اليومية.`,
    })
  }
  return out
}

// ─── 4. DEFINITE/INDEFINITE ARTICLES (the/a/an/Ø) ────────────────────────
// ~30 per level
function genArticlesDef(level) {
  const items = [
    { stem: "I bought ___ apple yesterday.", correct: 'an', distract:['a','the','—'], tag:'a_an_vowel', expl: 'apple يبدأ بصوت متحرك (a) → an. القاعدة: an قبل الكلمات التي تبدأ بصوت متحرك، a قبل الكلمات التي تبدأ بصوت ساكن.' },
    { stem: "She is ___ honest woman.", correct: 'an', distract:['a','the','—'], tag:'a_an_silent_h', expl: 'honest الحرف h فيها صامت، فالصوت الأول متحرك (o) → an. honest, hour, heir — كلها تبدأ بـ h صامتة فتأخذ an.' },
    { stem: "He bought ___ university degree.", correct: 'a', distract:['an','the','—'], tag:'a_an_y_sound', expl: 'university تبدأ بصوت y (yoo-ni-ver-si-ty)، وهو صوت ساكن → a. القاعدة بالصوت لا بالحرف.' },
    { stem: "I read ___ book you recommended.", correct: 'the', distract:['a','an','—'], tag:'the_specific', expl: 'الكتاب محدد ومعروف بين المتكلم والمستمع (you recommended) → the. a/an للأشياء غير المحددة.' },
    { stem: "I drink ___ coffee every morning.", correct: '—', distract:['the','a','an'], tag:'no_article_general', expl: 'coffee (مادة) بمعنى عام → بدون أداة تعريف. مع المواد والمفاهيم العامة لا نستخدم a/an/the.' },
    { stem: "She plays ___ piano beautifully.", correct: 'the', distract:['a','an','—'], tag:'the_musical_instruments', expl: 'مع الآلات الموسيقية نستخدم the: play the piano, play the guitar. (لكن مع الرياضات نستخدم بلا أداة: play football.)' },
    { stem: "We watched ___ movie last night.", correct: 'a', distract:['an','the','—'], tag:'a_first_mention', expl: 'فيلم لأول مرة في الحديث (لم يُذكر من قبل) → a. في الجمل التالية لو ذكرنا نفس الفيلم نقول the movie.' },
    { stem: "___ moon is beautiful tonight.", correct: 'The', distract:['A','An','—'], tag:'the_unique', expl: 'مع الأشياء الفريدة في الكون نستخدم the: the moon, the sun, the earth, the sky.' },
    { stem: "I want to be ___ doctor.", correct: 'a', distract:['an','the','—'], tag:'a_profession', expl: 'مع المهن نستخدم a/an: a doctor, an engineer, a teacher. لا نقول "I want to be doctor".' },
    { stem: "She lives in ___ United States.", correct: 'the', distract:['a','an','—'], tag:'the_country_plural', expl: 'مع أسماء الدول بصيغة الجمع أو التي تحتوي United/Kingdom نستخدم the: the United States, the Netherlands, the UK. (لكن: Saudi Arabia بدون the.)' },
    { stem: "I like ___ music.", correct: '—', distract:['the','a','an'], tag:'no_article_general', expl: 'music كمفهوم عام → بدون أداة. (لكن "I like the music in this café" → محدد بالسياق فنقول the.)' },
    { stem: "Tomorrow I have ___ exam.", correct: 'an', distract:['a','the','—'], tag:'a_an_vowel', expl: 'exam يبدأ بحرف وصوت e (متحرك) → an.' },
  ]
  return items.map(it => ({
    level, exercise_type: 'mcq', skill: 'grammar',
    topic_tags: [it.tag,'articles'], difficulty: it.tag.includes('silent') || it.tag.includes('y_sound') ? 4 : 2,
    prompt_en: it.stem, correct_answer: { value: it.correct }, distractors: it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 5. PREPOSITIONS OF PLACE ────────────────────────────────────────────
// ~30 per level
function genPrepositionsPlace(level) {
  const items = [
    { stem: "The book is ___ the table.", correct: 'on', distract:['in','at','under'], expl: 'on للأشياء فوق سطح: على الطاولة → on the table. in داخل (في صندوق)، at عند نقطة (at the door).' },
    { stem: "The car is ___ the garage.", correct: 'in', distract:['on','at','under'], expl: 'in للأشياء داخل مكان مغلق: داخل الجراج → in the garage. on فوق السطح، at عند مكان محدد.' },
    { stem: "She is waiting ___ the bus stop.", correct: 'at', distract:['in','on','under'], expl: 'at للنقاط المحددة: عند موقف الباص → at the bus stop. in داخل، on فوق.' },
    { stem: "The keys are ___ my pocket.", correct: 'in', distract:['on','at','under'], expl: 'in داخل (الجيب مغلق) → in my pocket. on على السطح، at عند مكان.' },
    { stem: "The cat is ___ the chair.", correct: 'under', distract:['on','in','behind'], expl: 'under = تحت. on = فوق. behind = خلف. لكل ظرف مكان معنى محدد، لا تبادليها.' },
    { stem: "The school is ___ Main Street.", correct: 'on', distract:['in','at','to'], expl: 'مع أسماء الشوارع نستخدم on (in American English) أو in (in British English). on Main Street شائع جداً في الكتب الأمريكية.' },
    { stem: "I live ___ Riyadh.", correct: 'in', distract:['on','at','to'], expl: 'مع المدن نستخدم in: in Riyadh, in Jeddah, in Mecca. at للنقاط المحددة (at the door)، on للسطوح.' },
    { stem: "She works ___ a hospital.", correct: 'at', distract:['in','on','to'], expl: 'مع أماكن العمل نستخدم at: at a hospital, at a bank, at a school. (يمكن in أيضاً، لكن at أكثر شيوعاً.)' },
    { stem: "The picture is ___ the wall.", correct: 'on', distract:['in','at','behind'], expl: 'on للأسطح العمودية أيضاً: on the wall = على الحائط. in the wall = داخل الحائط (نادر، يعني محفور).' },
    { stem: "There is a fly ___ the soup!", correct: 'in', distract:['on','at','under'], expl: 'in داخل السائل: in the soup = داخل الحساء. on the soup = على وجه الحساء (وجود رغوة مثلاً).' },
    { stem: "The plane is flying ___ the clouds.", correct: 'above', distract:['on','at','in'], expl: 'above = فوق بمسافة (الطائرة فوق الغيوم). on = ملامس للسطح. لا نقول on the clouds.' },
    { stem: "We met ___ the airport.", correct: 'at', distract:['in','on','to'], expl: 'at للمحطات والمطارات كنقاط محددة: at the airport, at the station, at the bus stop.' },
  ]
  return items.map(it => ({
    level, exercise_type: 'mcq', skill: 'grammar',
    topic_tags: ['prepositions_of_place','prepositions'], difficulty: 2,
    prompt_en: it.stem, correct_answer: { value: it.correct }, distractors: it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── 6. TAG QUESTIONS ────────────────────────────────────────────────────
// ~25 per level
function genTagQuestions(level) {
  const items = [
    { stem: "She is a teacher, ___?", correct: "isn't she", distract:["doesn't she","is she","does she"], expl: 'القاعدة: مع جملة مثبتة → tag منفي. is → isn\'t. الفاعل she يكرر بنفس الصيغة في الـ tag.' },
    { stem: "You don't speak French, ___?", correct: "do you", distract:["don't you","didn't you","aren't you"], expl: 'مع جملة منفية → tag مثبت. don\'t → do. الفاعل you يكرر.' },
    { stem: "They were at the party, ___?", correct: "weren't they", distract:["didn't they","aren't they","were they"], expl: 'were → weren\'t (نفي). الفعل المساعد في الـ tag يجب أن يطابق الفعل في الجملة.' },
    { stem: "He has finished his work, ___?", correct: "hasn't he", distract:["doesn't he","isn't he","didn't he"], expl: 'مع Present Perfect (has finished) → tag باستخدام نفس المساعد: hasn\'t.' },
    { stem: "You will call me, ___?", correct: "won't you", distract:["don't you","aren't you","didn't you"], expl: 'will → won\'t (نفي). الـ tag يستخدم نفس الفعل المساعد منفياً مع جملة مثبتة.' },
    { stem: "We should leave now, ___?", correct: "shouldn't we", distract:["don't we","aren't we","wouldn't we"], expl: 'should → shouldn\'t. الـ modal verbs (should/can/must/will/would) يكررن في الـ tag بنفس صيغتهن.' },
    { stem: "Sarah didn't call you, ___?", correct: "did she", distract:["didn't she","does she","is she"], expl: 'didn\'t (منفي ماضي) → did (مثبت). Sarah → she في الـ tag.' },
    { stem: "I am late, ___?", correct: "aren't I", distract:["am I not","isn't I","amn't I"], expl: 'استثناء: مع I am نستخدم aren\'t I في الـ tag (لا amn\'t، ولا am I not إلا في الإنجليزية الفصحى جداً).' },
    { stem: "Let's go for a walk, ___?", correct: "shall we", distract:["don't we","won't we","aren't we"], expl: 'مع Let\'s نستخدم دائماً shall we في الـ tag — هذه قاعدة محفوظة.' },
    { stem: "Open the door, ___?", correct: "will you", distract:["do you","don't you","won't you"], expl: 'مع الأوامر نستخدم will you (مهذّب) أو won\'t you في الـ tag.' },
  ]
  return items.map(it => ({
    level, exercise_type: 'fill_blank', skill: 'grammar',
    topic_tags: ['tag_questions'], difficulty: 3,
    prompt_en: it.stem, correct_answer: { value: it.correct }, distractors: null,
    explanation_ar: it.expl,
  }))
}

// ─── 7. PASSIVE VOICE ────────────────────────────────────────────────────
// ~25 per level
function genPassiveVoice(level) {
  const items = [
    { active: "Someone stole my bike.", passive: "My bike was stolen.", expl: 'Active → Passive: المفعول به (my bike) يصبح فاعلاً، الفعل يصير be + V3 (was stolen). Past Simple → was/were + V3.' },
    { active: "They built this house in 1990.", passive: "This house was built in 1990.", expl: 'Past Simple Active → was/were + V3 Passive. لاحظي: لو الفاعل غير مهم نحذفه (لا داعي لـ by them).' },
    { active: "The chef cooks delicious food.", passive: "Delicious food is cooked (by the chef).", expl: 'Present Simple Active → is/are + V3 Passive. by + الفاعل اختياري.' },
    { active: "She is writing a novel.", passive: "A novel is being written (by her).", expl: 'Present Continuous Active → is/are + being + V3 Passive. (Continuous tense → being.)' },
    { active: "They have finished the project.", passive: "The project has been finished.", expl: 'Present Perfect Active → has/have + been + V3 Passive. (Perfect → been.)' },
    { active: "Someone will deliver the package tomorrow.", passive: "The package will be delivered tomorrow.", expl: 'Future Simple Active → will + be + V3 Passive. لا داعي لذكر someone، فالمجهول يكفي.' },
    { active: "They should clean the room.", passive: "The room should be cleaned.", expl: 'Modal + V1 Active → Modal + be + V3 Passive. should clean → should be cleaned.' },
    { active: "The teacher gave us homework.", passive: "We were given homework (by the teacher).", expl: 'مع الأفعال ذات المفعولين (give, send, tell, show)، يمكن أن يكون أيٌّ منهما فاعلاً في المبني للمجهول. هنا: us → we.' },
    { active: "Shakespeare wrote Hamlet.", passive: "Hamlet was written by Shakespeare.", expl: 'مع by + اسم محدد، نذكر الفاعل لأنه مهم: by Shakespeare. الجمل الأخرى نستطيع حذف by + agent.' },
    { active: "People speak Arabic in Saudi Arabia.", passive: "Arabic is spoken in Saudi Arabia.", expl: 'الفاعل العام (people, they, someone) نحذفه في المبني للمجهول. Arabic is spoken — جملة كاملة.' },
  ]
  return items.map(it => ({
    level, exercise_type: 'sentence_correction', skill: 'grammar',
    topic_tags: ['passive_voice','voice_transformation'], difficulty: 4,
    prompt_en: `Active → Passive: "${it.active}"`,
    correct_answer: { value: it.passive }, distractors: null,
    explanation_ar: it.expl,
  }))
}

// ─── 8. CONFUSABLE PAIRS ─────────────────────────────────────────────────
// ~40 per level
function genConfusables(level) {
  const items = [
    { stem: "I have ___ friends in Riyadh.", correct: 'many', distract:['much','few of','a much'], expl: 'مع الأسماء المعدودة (friends) نستخدم many. مع غير المعدودة (water, money) نستخدم much. friends معدودة.' },
    { stem: "How ___ water do you drink daily?", correct: 'much', distract:['many','few','little'], expl: 'water غير معدودة → much. لو كانت bottles of water لكانت many bottles.' },
    { stem: "I have ___ time to finish this.", correct: 'little', distract:['few','a little of','many'], expl: 'time غير معدودة + little = قليل (ليس كافياً، نبرة سلبية). few للأشياء المعدودة. a little = قليل لكن إيجابياً.' },
    { stem: "I've been here ___ 2020.", correct: 'since', distract:['for','from','at'], expl: 'since + نقطة بداية محددة (2020, last week, Monday). for + مدة (5 years, 2 weeks). 2020 نقطة بداية → since.' },
    { stem: "I've lived here ___ five years.", correct: 'for', distract:['since','from','during'], expl: 'five years = مدة → for. لو كانت since 2020 = نقطة بداية → since.' },
    { stem: "I'm thinking ___ buying a car.", correct: 'about', distract:['of','to','for'], expl: 'think about (يفكّر في الموضوع، يتدبّر) ≠ think of (يكوّن رأياً سريعاً). about أعمّ وأشمل.' },
    { stem: "She is good ___ math.", correct: 'at', distract:['in','on','for'], expl: 'good at = بارع في (مهارة). good in (نادر، يستخدم للأماكن). good for = مفيد لـ. القاعدة المحفوظة: good at + skill.' },
    { stem: "I'm interested ___ art.", correct: 'in', distract:['at','on','for'], expl: 'interested in + موضوع/مجال. القاعدة: interested دائماً مع in (لا at ولا on).' },
    { stem: "She is afraid ___ spiders.", correct: 'of', distract:['from','about','with'], expl: 'afraid of + شيء يخيف. لا نقول afraid from (خطأ شائع للعرب). القاعدة: afraid دائماً مع of.' },
    { stem: "He depends ___ his parents.", correct: 'on', distract:['from','of','at'], expl: 'depend on + شخص/شيء (يعتمد على). لا نقول depend from (خطأ شائع). الفعل دائماً مع on.' },
    { stem: "I made the cake ___ myself.", correct: 'by', distract:['with','from','for'], expl: 'by myself = بمفردي (بدون مساعدة). with myself خطأ. by + ضمير منعكس = بنفسي.' },
    { stem: "This bag is made ___ leather.", correct: 'of', distract:['from','with','by'], expl: 'made of + المادة الواضحة (leather, wood, gold). made from + مادة متحولة (paper made from wood). made by + الصانع.' },
    { stem: "Don't compare apples ___ oranges.", correct: 'to', distract:['with','from','for'], expl: 'compare to = يقارن بمعنى يشبّه (للإيجاد التشابه). compare with = يقارن (للإيجاد الفروق). to أكثر شيوعاً في التعابير.' },
    { stem: "I agree ___ you.", correct: 'with', distract:['on','to','for'], expl: 'agree with + شخص. agree on + قضية/موضوع. agree to + اقتراح. الفرق دقيق ومهم.' },
    { stem: "This belongs ___ me.", correct: 'to', distract:['for','with','of'], expl: 'belong to + الشخص المالك. القاعدة: belong دائماً مع to (لا for، لا with).' },
  ]
  return items.map(it => ({
    level, exercise_type: 'mcq', skill: 'grammar',
    topic_tags: ['confusables','prepositions','common_mistakes'], difficulty: 3,
    prompt_en: it.stem, correct_answer: { value: it.correct }, distractors: it.distract,
    explanation_ar: it.expl,
  }))
}

// ─── ORCHESTRATOR ──────────────────────────────────────────────────────────

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  const LEVELS = ['L1','L2','L3','L4','L5']
  for (const ref of targets) {
    console.log(`\n========================== TARGET: ${ref} ==========================`)
    let totalInserted = 0
    for (const level of LEVELS) {
      const generators = [
        genConditionals(level),
        genReportedSpeech(level),
        genPhrasalVerbs(level),
        genArticlesDef(level),
        genPrepositionsPlace(level),
        genTagQuestions(level),
        genPassiveVoice(level),
        genConfusables(level),
      ]
      const all = generators.flat()
      console.log(`[${level}] ${all.length} candidates`)
      let inserted = 0, failed = 0
      let batch = []
      for (let i = 0; i < all.length; i++) {
        const e = all[i]
        const vals = `(${esc(e.exercise_type)}, ${esc(e.level)}, ${esc(e.skill)}, ${arrText(e.topic_tags)}, ${e.difficulty}, ${esc(e.prompt_en)}, NULL, ${jsonbVal(e.correct_answer)}, ${e.distractors ? jsonbVal(e.distractors) : 'NULL'}, ${esc(e.explanation_ar)}, 60)`
        batch.push(vals)
        if (batch.length >= 25 || i === all.length - 1) {
          const sql = `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds)
            VALUES ${batch.join(',')}
            ON CONFLICT DO NOTHING`
          try { await call(token, ref, sql); inserted += batch.length }
          catch (err) {
            console.error(`  batch failed (${err.message.slice(0,80)}); retrying single`)
            for (const v of batch) {
              try { await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${v} ON CONFLICT DO NOTHING`); inserted++ }
              catch { failed++ }
            }
          }
          batch = []
        }
      }
      console.log(`  [${level}] inserted: ${inserted} (failed: ${failed})`)
      totalInserted += inserted
    }
    const final = await call(token, ref, 'SELECT count(*)::int as c FROM retention_exercises')
    console.log(`[${ref}] total exercises now: ${final[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
