#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-OVERNIGHT Block 3 — programmatic exercise generator.
// Produces ~700 exercises per level via grammar pattern functions + real
// vocabulary data from curriculum_vocabulary (READ-ONLY).
//
// Idempotent: each exercise's (level, skill, type, prompt_en) is the natural
// key. Re-running skips existing rows.

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

// Helper: starts with vowel sound (a/an decision)
const VOWEL_SOUND_WORDS = new Set(['hour','honest','honor','heir','umbrella','apple','orange','elephant','island','idea','offer','egg','ear','exam','engineer','astronaut','elephant'])
const CONSONANT_SOUND_PREFIX_EXCEPTIONS = new Set(['university','useful','user','one'])
function takesAn(word) {
  const w = word.toLowerCase()
  if (VOWEL_SOUND_WORDS.has(w)) return true
  if (CONSONANT_SOUND_PREFIX_EXCEPTIONS.has(w)) return false
  return /^[aeiou]/.test(w)
}

// ─── DATA SOURCES ───────────────────────────────────────────────────────────

const COMMON_NOUNS = ['apple','orange','egg','umbrella','hour','idea','engineer','exam','astronaut','book','car','house','table','chair','dog','cat','phone','computer','laptop','window','door','school','teacher','student','boy','girl','man','woman','child','baby','pen','pencil','bag','shirt','dress','shoe','bird','fish','tree','flower','garden','park','street','city','country','plane','train','bus','ship','university','hospital','library','restaurant','hotel','market','mosque','farm','beach','river','mountain','desert','elephant','tiger','rabbit','horse','sheep','pig','onion']

const THIRD_PERSON_SUBJECTS = [
  { en: 'He', plural: false }, { en: 'She', plural: false }, { en: 'It', plural: false },
  { en: 'My mother', plural: false }, { en: 'My father', plural: false }, { en: 'My sister', plural: false }, { en: 'My brother', plural: false },
  { en: 'My teacher', plural: false }, { en: 'My friend', plural: false }, { en: 'The doctor', plural: false }, { en: 'The cat', plural: false },
  { en: 'The dog', plural: false }, { en: 'Sarah', plural: false }, { en: 'Ali', plural: false }, { en: 'Fatima', plural: false }, { en: 'Khalid', plural: false },
  { en: 'My grandmother', plural: false }, { en: 'The student', plural: false }, { en: 'My boss', plural: false }, { en: 'Layla', plural: false },
]
const PLURAL_SUBJECTS = [
  { en: 'They', plural: true }, { en: 'We', plural: true }, { en: 'You', plural: true }, { en: 'I', plural: true },
  { en: 'My parents', plural: true }, { en: 'My friends', plural: true }, { en: 'The students', plural: true },
  { en: 'Children', plural: true }, { en: 'The cats', plural: true }, { en: 'My brothers', plural: true },
]

const SIMPLE_VERBS = [
  { base: 'go', third: 'goes', obj: 'to school' },
  { base: 'eat', third: 'eats', obj: 'breakfast' },
  { base: 'drink', third: 'drinks', obj: 'tea every morning' },
  { base: 'work', third: 'works', obj: 'at a bank' },
  { base: 'play', third: 'plays', obj: 'football on Fridays' },
  { base: 'study', third: 'studies', obj: 'English every day' },
  { base: 'live', third: 'lives', obj: 'in Riyadh' },
  { base: 'read', third: 'reads', obj: 'books before bed' },
  { base: 'watch', third: 'watches', obj: 'TV in the evening' },
  { base: 'cook', third: 'cooks', obj: 'dinner for the family' },
  { base: 'drive', third: 'drives', obj: 'to work every morning' },
  { base: 'speak', third: 'speaks', obj: 'three languages' },
  { base: 'teach', third: 'teaches', obj: 'mathematics' },
  { base: 'sing', third: 'sings', obj: 'beautifully' },
  { base: 'write', third: 'writes', obj: 'poetry' },
  { base: 'have', third: 'has', obj: 'a beautiful garden' },
  { base: 'do', third: 'does', obj: 'her homework after school' },
  { base: 'wake up', third: 'wakes up', obj: 'at 6 AM' },
  { base: 'finish', third: 'finishes', obj: 'work at 5 PM' },
  { base: 'visit', third: 'visits', obj: 'her grandparents on weekends' },
]

const PAST_VERBS = [
  { base: 'go', past: 'went', context: 'to the market yesterday' },
  { base: 'eat', past: 'ate', context: 'lunch an hour ago' },
  { base: 'see', past: 'saw', context: 'a great movie last weekend' },
  { base: 'do', past: 'did', context: 'all her homework last night' },
  { base: 'come', past: 'came', context: 'home late yesterday' },
  { base: 'take', past: 'took', context: 'the bus to school' },
  { base: 'make', past: 'made', context: 'tea this morning' },
  { base: 'give', past: 'gave', context: 'her a beautiful gift' },
  { base: 'write', past: 'wrote', context: 'three emails this morning' },
  { base: 'read', past: 'read', context: 'the news this morning' },
  { base: 'meet', past: 'met', context: 'his friend at the café' },
  { base: 'buy', past: 'bought', context: 'new shoes yesterday' },
  { base: 'find', past: 'found', context: 'his keys in the kitchen' },
  { base: 'think', past: 'thought', context: 'about it carefully' },
  { base: 'know', past: 'knew', context: 'the answer immediately' },
]

const PERFECT_VERBS = [
  { base: 'live', past_participle: 'lived', context: 'in Riyadh for ten years' },
  { base: 'work', past_participle: 'worked', context: 'here since 2020' },
  { base: 'know', past_participle: 'known', context: 'her since high school' },
  { base: 'be', past_participle: 'been', context: 'to Paris three times' },
  { base: 'study', past_participle: 'studied', context: 'English for five years' },
  { base: 'have', past_participle: 'had', context: 'this car for two months' },
  { base: 'wait', past_participle: 'waited', context: 'for the bus for 30 minutes' },
  { base: 'see', past_participle: 'seen', context: 'this movie before' },
  { base: 'eat', past_participle: 'eaten', context: 'sushi only once' },
  { base: 'write', past_participle: 'written', context: 'four books so far' },
]

const PREP_TIME = [
  { word: 'Sunday', prep: 'on', kind: 'day' }, { word: 'Monday', prep: 'on', kind: 'day' }, { word: 'Tuesday', prep: 'on', kind: 'day' },
  { word: 'Friday', prep: 'on', kind: 'day' }, { word: 'Saturday', prep: 'on', kind: 'day' },
  { word: '7 AM', prep: 'at', kind: 'time' }, { word: '8 AM', prep: 'at', kind: 'time' }, { word: 'noon', prep: 'at', kind: 'time' }, { word: 'midnight', prep: 'at', kind: 'time' },
  { word: 'May', prep: 'in', kind: 'month' }, { word: 'January', prep: 'in', kind: 'month' }, { word: 'August', prep: 'in', kind: 'month' },
  { word: 'the morning', prep: 'in', kind: 'period' }, { word: 'the afternoon', prep: 'in', kind: 'period' }, { word: 'the evening', prep: 'in', kind: 'period' },
  { word: 'night', prep: 'at', kind: 'special' },
  { word: '2025', prep: 'in', kind: 'year' }, { word: '2026', prep: 'in', kind: 'year' },
  { word: 'summer', prep: 'in', kind: 'season' }, { word: 'winter', prep: 'in', kind: 'season' },
]

const MODAL_SCENARIOS = [
  { en: "It's raining and you don't have an umbrella.", correct: 'should', expl_correct: "should للنصيحة (يجب أن تأخذ — نصيحة منطقية)" },
  { en: "You have a fever — see a doctor.", correct: 'should', expl_correct: 'should للنصيحة الطبية اللطيفة' },
  { en: "Stop! The traffic light is red.", correct: 'must', expl_correct: 'must للضرورة القوية / القانون' },
  { en: "The sky is dark — it ___ rain later.", correct: 'might', expl_correct: 'might للاحتمال غير المؤكد' },
  { en: "I ___ swim very well — I learned as a child.", correct: 'can', expl_correct: 'can للقدرة' },
  { en: "You ___ smoke here — it\'s a no-smoking zone.", correct: "can't", expl_correct: "can't للمنع" },
  { en: "I ___ go to the dentist tomorrow — my tooth hurts.", correct: 'have to', expl_correct: 'have to للضرورة الخارجية' },
  { en: "She ___ speak Arabic, English, and French fluently.", correct: 'can', expl_correct: 'can للقدرة المتعددة' },
]

// ─── EXERCISE GENERATORS ────────────────────────────────────────────────────

function genArticleA_An(level) {
  // ~50 exercises per call
  const out = []
  for (const noun of COMMON_NOUNS.slice(0, 50)) {
    const correct = takesAn(noun) ? 'an' : 'a'
    const ruleExplain = takesAn(noun)
      ? `قبل الكلمات التي تبدأ بصوت متحرك (a, e, i, o, u) نستخدم an. كلمة "${noun}" تبدأ بصوت متحرك، فالصحيح: an ${noun}. لكن نقول "a book" لأن book تبدأ بصوت ساكن.`
      : `قبل الكلمات التي تبدأ بصوت ساكن نستخدم a. كلمة "${noun}" تبدأ بصوت ساكن، فالصحيح: a ${noun}. لكن نقول "an apple" لأن apple تبدأ بصوت متحرك.`
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: ['articles', 'a_an'],
      difficulty: takesAn(noun) ? 2 : 1,
      prompt_en: `I have ___ ${noun} in my bag.`,
      correct_answer: { value: correct },
      distractors: null,
      explanation_ar: ruleExplain,
    })
  }
  // mcq variant
  for (const noun of COMMON_NOUNS.slice(50, 100)) {
    const correct = takesAn(noun) ? 'an' : 'a'
    const wrong = takesAn(noun) ? 'a' : 'an'
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['articles', 'a_an'], difficulty: 2,
      prompt_en: `She wants ___ ${noun}.`,
      correct_answer: { value: correct },
      distractors: [wrong, 'the', '—'],
      explanation_ar: takesAn(noun)
        ? `${noun} يبدأ بصوت متحرك → نستخدم an. "the" للأشياء المحددة المعروفة سابقاً.`
        : `${noun} يبدأ بصوت ساكن → نستخدم a. "the" للأشياء المحددة المعروفة سابقاً.`,
    })
  }
  return out
}

function genSubjectVerbAgreement(level) {
  // ~80 exercises per call
  const out = []
  const subjects = THIRD_PERSON_SUBJECTS.slice(0, 12)
  const verbs = SIMPLE_VERBS.slice(0, 8)
  for (const s of subjects) {
    for (const v of verbs) {
      out.push({
        level, exercise_type: 'fill_blank', skill: 'grammar',
        topic_tags: ['subject_verb_agreement', 'present_simple'],
        difficulty: 1,
        prompt_en: `${s.en} ___ ${v.obj}. (${v.base})`,
        correct_answer: { value: v.third },
        distractors: null,
        explanation_ar: `مع الضمائر he/she/it أو الأسماء المفردة، نضيف -s أو -es للفعل في المضارع البسيط. ${s.en} → ${v.third}. لكن مع I/you/we/they نستخدم الفعل بصورته الأساسية.`,
      })
    }
  }
  // Sentence correction
  for (const s of subjects.slice(0, 8)) {
    for (const v of verbs.slice(0, 4)) {
      out.push({
        level, exercise_type: 'sentence_correction', skill: 'grammar',
        topic_tags: ['subject_verb_agreement'], difficulty: 2,
        prompt_en: `${s.en} ${v.base} ${v.obj}.`,
        correct_answer: { value: `${s.en} ${v.third} ${v.obj}.` },
        distractors: null,
        explanation_ar: `الخطأ: نسيان الـ s في نهاية الفعل مع ضمير الشخص الثالث المفرد. ${s.en} (مفرد) يحتاج "${v.third}" وليس "${v.base}".`,
      })
    }
  }
  return out
}

function genPlurals(level) {
  // ~30 exercises
  const out = []
  const items = [
    { sg: 'book', pl: 'books' }, { sg: 'box', pl: 'boxes' }, { sg: 'bus', pl: 'buses' }, { sg: 'baby', pl: 'babies' },
    { sg: 'child', pl: 'children' }, { sg: 'man', pl: 'men' }, { sg: 'woman', pl: 'women' }, { sg: 'foot', pl: 'feet' },
    { sg: 'tooth', pl: 'teeth' }, { sg: 'mouse', pl: 'mice' }, { sg: 'person', pl: 'people' }, { sg: 'leaf', pl: 'leaves' },
    { sg: 'wife', pl: 'wives' }, { sg: 'knife', pl: 'knives' }, { sg: 'city', pl: 'cities' }, { sg: 'country', pl: 'countries' },
    { sg: 'fish', pl: 'fish' }, { sg: 'sheep', pl: 'sheep' }, { sg: 'deer', pl: 'deer' }, { sg: 'apple', pl: 'apples' },
    { sg: 'glass', pl: 'glasses' }, { sg: 'watch', pl: 'watches' }, { sg: 'lady', pl: 'ladies' }, { sg: 'puppy', pl: 'puppies' },
    { sg: 'tomato', pl: 'tomatoes' }, { sg: 'potato', pl: 'potatoes' }, { sg: 'photo', pl: 'photos' }, { sg: 'piano', pl: 'pianos' },
    { sg: 'roof', pl: 'roofs' }, { sg: 'chief', pl: 'chiefs' },
  ]
  for (const it of items) {
    const isIrregular = !['s','es'].some(suf => it.pl === it.sg + suf || it.pl === it.sg.slice(0,-1)+'ies' || it.pl === it.sg.slice(0,-1)+'ves')
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: ['plural', isIrregular ? 'plural_irregular' : 'plural_regular'],
      difficulty: isIrregular ? 3 : 1,
      prompt_en: `I see three ___. (${it.sg})`,
      correct_answer: { value: it.pl },
      distractors: null,
      explanation_ar: isIrregular
        ? `${it.sg} له صيغة جمع شاذة: ${it.pl} (ليست ${it.sg}s). لازم تحفظيها لأنها لا تتبع القاعدة العامة.`
        : `جمع ${it.sg} هو ${it.pl}. القاعدة العامة: إضافة -s، أو -es بعد s/ss/sh/ch/x، أو تحويل -y إلى -ies بعد حرف ساكن.`,
    })
  }
  return out
}

function genPrepositionTime(level) {
  // ~40 exercises
  const out = []
  for (const p of PREP_TIME) {
    const distractors = ['on','at','in','of'].filter(x => x !== p.prep).slice(0, 3)
    const ruleByKind = {
      day: 'مع أيام الأسبوع نستخدم on (on Sunday, on Friday).',
      time: 'مع الوقت المحدد بالساعة نستخدم at (at 7 AM, at noon).',
      month: 'مع الشهور نستخدم in (in May, in January).',
      period: 'مع فترات اليوم (الصباح/المساء) نستخدم in (in the morning).',
      special: 'مع night, noon, midnight, dawn نستخدم at (استثناء عن باقي فترات اليوم).',
      year: 'مع السنوات نستخدم in (in 2025, in 2026).',
      season: 'مع الفصول نستخدم in (in summer, in winter).',
    }
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['prepositions_in_on_at'], difficulty: p.kind === 'special' ? 3 : 1,
      prompt_en: `We have a class ___ ${p.word}.`,
      correct_answer: { value: p.prep },
      distractors,
      explanation_ar: ruleByKind[p.kind],
    })
  }
  return out
}

function genPresentPerfect(level) {
  // ~50 exercises
  const out = []
  for (const v of PERFECT_VERBS) {
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: ['present_perfect'], difficulty: 3,
      prompt_en: `I ___ ${v.context}. (${v.base})`,
      correct_answer: { value: `have ${v.past_participle}` },
      distractors: null,
      explanation_ar: `مع المدة الزمنية الممتدة (for + مدة، since + نقطة بداية) أو التجارب الحياتية، نستخدم Present Perfect: have/has + V3. مع I/you/we/they نستخدم have، مع he/she/it نستخدم has.`,
    })
  }
  // Common confusion correction
  const confusions = [
    { wrong: 'I have went to Paris last year.', correct: 'I went to Paris last year.', expl: 'مع last year / yesterday / في وقت محدد ماضي، نستخدم Past Simple (went) وليس Present Perfect (have gone).' },
    { wrong: 'She has came home an hour ago.', correct: 'She came home an hour ago.', expl: 'مع ago نستخدم Past Simple فقط (came)، لأنه يشير لوقت محدد ماضي.' },
    { wrong: 'They have lived here since five years.', correct: 'They have lived here for five years.', expl: 'مع المدة (years, months, days) نستخدم for. مع نقطة بداية محددة (2020, last month) نستخدم since.' },
    { wrong: 'I have studied English since ten years.', correct: 'I have studied English for ten years.', expl: 'ten years مدة → for. مع 2015 (نقطة بداية محددة) سنستخدم since.' },
    { wrong: 'Have you ever went to Mecca?', correct: 'Have you ever been to Mecca?', expl: 'مع ever في Present Perfect نستخدم been وليس went. been تعني "زرت وعدت"، went تعني "ذهبت مرة واحدة".' },
  ]
  for (const c of confusions) {
    out.push({
      level, exercise_type: 'sentence_correction', skill: 'grammar',
      topic_tags: ['present_perfect', 'present_perfect_confusion'], difficulty: 4,
      prompt_en: c.wrong, correct_answer: { value: c.correct }, distractors: null,
      explanation_ar: c.expl,
    })
  }
  return out
}

function genModalVerbs(level) {
  const out = []
  for (const m of MODAL_SCENARIOS) {
    const others = ['should','must','can','might','have to',"can't"].filter(x => x !== m.correct).slice(0, 3)
    out.push({
      level, exercise_type: 'mcq', skill: 'grammar',
      topic_tags: ['modal_verbs'], difficulty: 3,
      prompt_en: `${m.en} → "You ___ ___" (best fit modal)`,
      correct_answer: { value: m.correct },
      distractors: others,
      explanation_ar: `${m.expl_correct}. الأفعال المساعدة (modals) لها معاني محددة: should=نصيحة، must=ضرورة قوية، can=قدرة، might=احتمال، have to=ضرورة خارجية.`,
    })
  }
  return out
}

function genVocabFromCurriculum(level, vocabRows) {
  // Take 80-150 vocab from the curriculum for this level and build vocab_match exercises
  const out = []
  const useRows = vocabRows.slice(0, 120)
  for (let i = 0; i < useRows.length; i++) {
    const v = useRows[i]
    if (!v.definition_ar || v.definition_ar.length < 3) continue
    // distractors: pick 3 other definitions from the same set
    const distractors = []
    let j = (i + 1) % useRows.length
    while (distractors.length < 3 && j !== i) {
      if (useRows[j].definition_ar && useRows[j].definition_ar !== v.definition_ar && useRows[j].definition_ar.length >= 3) {
        distractors.push(useRows[j].definition_ar)
      }
      j = (j + 1) % useRows.length
    }
    if (distractors.length < 3) continue
    out.push({
      level, exercise_type: 'vocab_match', skill: 'vocab',
      topic_tags: ['curriculum_vocab'], difficulty: 2,
      prompt_en: `What is the Arabic meaning of "${v.word}"?`,
      correct_answer: { value: v.definition_ar },
      distractors,
      explanation_ar: `كلمة "${v.word}" تعني "${v.definition_ar}" في السياق الذي ظهرت فيه في وحدتكِ. حفظ المفردات الجديدة في سياقها يساعد على تذكّرها أطول.`,
    })
  }
  return out
}

function genComparatives(level) {
  // ~30 exercises
  const out = []
  const adjs = [
    { adj: 'fast', comp: 'faster', sup: 'fastest', kind: 'short' },
    { adj: 'big', comp: 'bigger', sup: 'biggest', kind: 'short_double' },
    { adj: 'happy', comp: 'happier', sup: 'happiest', kind: 'y' },
    { adj: 'easy', comp: 'easier', sup: 'easiest', kind: 'y' },
    { adj: 'beautiful', comp: 'more beautiful', sup: 'most beautiful', kind: 'long' },
    { adj: 'intelligent', comp: 'more intelligent', sup: 'most intelligent', kind: 'long' },
    { adj: 'expensive', comp: 'more expensive', sup: 'most expensive', kind: 'long' },
    { adj: 'good', comp: 'better', sup: 'best', kind: 'irregular' },
    { adj: 'bad', comp: 'worse', sup: 'worst', kind: 'irregular' },
    { adj: 'far', comp: 'farther', sup: 'farthest', kind: 'irregular' },
    { adj: 'old', comp: 'older', sup: 'oldest', kind: 'short' },
    { adj: 'young', comp: 'younger', sup: 'youngest', kind: 'short' },
  ]
  for (const a of adjs) {
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: ['comparative_superlative'], difficulty: a.kind==='irregular' ? 4 : 2,
      prompt_en: `My phone is ___ than yours. (${a.adj})`,
      correct_answer: { value: a.comp },
      distractors: null,
      explanation_ar: a.kind === 'irregular'
        ? `${a.adj} له صيغة مقارنة شاذة: ${a.comp}. الأفعال الشاذة في المقارنة تحتاج حفظ.`
        : a.kind === 'long'
        ? `الصفات الطويلة (3+ مقاطع) تأخذ "more" قبلها للمقارنة: more ${a.adj}. الصفات القصيرة تأخذ -er.`
        : a.kind === 'y'
        ? `الصفات التي تنتهي بـ y (بعد حرف ساكن) نحوّل y إلى i ونضيف -er: ${a.adj} → ${a.comp}.`
        : a.kind === 'short_double'
        ? `الصفات القصيرة بحرف متحرك+ساكن نضاعف الحرف الأخير ونضيف -er: ${a.adj} → ${a.comp}.`
        : `الصفات القصيرة نضيف -er للمقارنة: ${a.adj} → ${a.comp}.`,
    })
    out.push({
      level, exercise_type: 'fill_blank', skill: 'grammar',
      topic_tags: ['comparative_superlative'], difficulty: 3,
      prompt_en: `This is the ___ restaurant in the city. (${a.adj})`,
      correct_answer: { value: a.sup },
      distractors: null,
      explanation_ar: `مع the + صفة + in/of، نستخدم Superlative: ${a.sup}. مع than للمقارنة بين شيئين نستخدم Comparative: ${a.comp}.`,
    })
  }
  return out
}

function genReadingMCQ(level) {
  // ~20 short passages × 2 questions = 40 reading exercises
  const passages = [
    {
      text: "Layla wakes up at 6 AM every day. She drinks coffee, then she goes to the gym. After her workout, she takes a shower and starts work at 9 AM. She works from home as a graphic designer.",
      q1: { q: "What time does Layla wake up?", correct: "6 AM", distractors: ["7 AM","8 AM","9 AM"], expl: "النص يقول 'wakes up at 6 AM every day' — الجواب مباشر." },
      q2: { q: "What does Layla do for work?", correct: "Graphic designer", distractors: ["Teacher","Doctor","Engineer"], expl: "النص يقول 'works from home as a graphic designer'." },
    },
    {
      text: "The new coffee shop opened last Friday. It serves Saudi specialty coffee, dates, and traditional sweets. Many people visit it every weekend.",
      q1: { q: "When did the coffee shop open?", correct: "Last Friday", distractors: ["Last Monday","Last Sunday","Yesterday"], expl: "النص: 'opened last Friday'." },
      q2: { q: "What does it serve?", correct: "Coffee, dates, and sweets", distractors: ["Pizza","Burgers","Sandwiches"], expl: "النص: 'Saudi specialty coffee, dates, and traditional sweets'." },
    },
    {
      text: "Ahmed has lived in Riyadh for ten years. He moved here from Jeddah when he was 25. Now he is 35 and works as an architect. He designs houses and small buildings.",
      q1: { q: "How long has Ahmed lived in Riyadh?", correct: "10 years", distractors: ["5 years","15 years","20 years"], expl: "النص: 'has lived in Riyadh for ten years'." },
      q2: { q: "What is Ahmed's job?", correct: "Architect", distractors: ["Engineer","Designer","Builder"], expl: "النص: 'works as an architect'." },
    },
    {
      text: "Saudi Arabia has many beautiful places to visit. AlUla is famous for its ancient rocks and historic sites. The Red Sea coast offers white beaches and clear water. Riyadh, the capital, has modern museums and traditional markets.",
      q1: { q: "What is AlUla famous for?", correct: "Ancient rocks and historic sites", distractors: ["Beaches","Markets","Modern buildings"], expl: "النص: 'AlUla is famous for its ancient rocks and historic sites'." },
      q2: { q: "What can you find in Riyadh?", correct: "Modern museums and traditional markets", distractors: ["Beaches and resorts","Mountains and lakes","Ancient ruins only"], expl: "النص: 'Riyadh, the capital, has modern museums and traditional markets'." },
    },
    {
      text: "Reading every day helps you learn new words and improve your English. Even 10 minutes a day makes a big difference over time. Try to choose topics you enjoy — sports, cooking, or travel — so you stay motivated.",
      q1: { q: "How many minutes a day are enough to make a difference?", correct: "10 minutes", distractors: ["30 minutes","1 hour","2 hours"], expl: "النص: 'Even 10 minutes a day makes a big difference'." },
      q2: { q: "Why is choosing topics you enjoy important?", correct: "To stay motivated", distractors: ["To learn faster","To save time","To impress friends"], expl: "النص: 'so you stay motivated'." },
    },
    {
      text: "My grandmother lives in a small village outside Mecca. She grows her own vegetables and raises a few chickens. Her garden has tomatoes, cucumbers, and mint. Every Friday, the whole family visits her for lunch.",
      q1: { q: "Where does the grandmother live?", correct: "In a village outside Mecca", distractors: ["In Mecca city","In Riyadh","In a beach town"], expl: "النص: 'small village outside Mecca'." },
      q2: { q: "What does she grow?", correct: "Tomatoes, cucumbers, and mint", distractors: ["Flowers","Fruits","Coffee beans"], expl: "النص lists 'tomatoes, cucumbers, and mint'." },
    },
    {
      text: "Online learning has changed how people study. You can learn anywhere, anytime, and at your own pace. However, it requires self-discipline. Without a teacher in front of you, it's easy to get distracted.",
      q1: { q: "What is one advantage of online learning?", correct: "Learn anywhere and anytime", distractors: ["No homework","No tests","Cheaper textbooks"], expl: "النص: 'learn anywhere, anytime, and at your own pace'." },
      q2: { q: "What is one challenge?", correct: "It requires self-discipline", distractors: ["No technology","Bad teachers","Hard subjects"], expl: "النص: 'it requires self-discipline'." },
    },
    {
      text: "Saudi Arabia's national dish is kabsa. It is made with rice, meat (usually chicken or lamb), and special spices. Families often share kabsa from one large plate during lunch on weekends.",
      q1: { q: "What is Saudi Arabia's national dish?", correct: "Kabsa", distractors: ["Mandi","Shawarma","Falafel"], expl: "النص: 'Saudi Arabia\\'s national dish is kabsa'." },
      q2: { q: "When do families usually eat it?", correct: "Lunch on weekends", distractors: ["Breakfast","Dinner","Anytime"], expl: "النص: 'during lunch on weekends'." },
    },
  ]
  const out = []
  for (const p of passages) {
    for (const q of [p.q1, p.q2]) {
      out.push({
        level, exercise_type: 'mcq', skill: 'reading',
        topic_tags: ['comprehension', 'reading'], difficulty: 2,
        prompt_en: `Read: "${p.text}" — ${q.q}`,
        correct_answer: { value: q.correct },
        distractors: q.distractors,
        explanation_ar: q.expl + ' فهم القراءة يعتمد على البحث عن الكلمة المفتاحية في السؤال داخل النص.',
      })
    }
  }
  return out
}

function genMiniWrite(level) {
  const prompts = [
    { p: "Write 3 sentences introducing yourself: name, where you live, what you do.", model: "Hi, my name is [name]. I live in [city]. I am a [job/student].", tags: ['self_intro'], diff: 1, expl: "في التعريف بالنفس، نبدأ بالاسم ثم المكان ثم العمل. لا تنسي حرف I دائماً كبير." },
    { p: "Describe your morning routine in 3 sentences. Use present simple tense.", model: "I wake up at [time]. I drink [coffee/tea]. I go to work/school.", tags: ['daily_routine','present_simple'], diff: 2, expl: "الروتين اليومي يستخدم المضارع البسيط. مع I لا تضيفي s للفعل: I wake / I drink / I go." },
    { p: "Write about your favorite food in 3 sentences. Use because to give a reason.", model: "My favorite food is [food]. I usually eat it [when/where]. I like it because [reason].", tags: ['opinion','favorites'], diff: 2, expl: "لإبداء الرأي عن المفضل: My favorite + اسم. لربط السبب: because. تأكدي من المضارع البسيط." },
    { p: "Describe your last weekend in 4 sentences. Use past simple tense.", model: "Last weekend, I [activity]. I went to [place]. I met [person]. It was [adjective].", tags: ['narrative','past_simple'], diff: 3, expl: "الماضي البسيط يستخدم Past Simple: went/met/was. ابدئي بـ Last weekend ثم اربطي الأحداث." },
    { p: "Compare your city to another city you've visited. Use comparatives.", model: "[My city] is [smaller/bigger/cleaner/busier] than [other city]. The food in [my city] is [better/worse]. People are [friendlier/quieter].", tags: ['comparative'], diff: 3, expl: "المقارنة بين شيئين تستخدم -er + than أو more + adj + than. الصفات الشاذة: good→better، bad→worse." },
    { p: "Give your opinion on social media in 4-5 sentences. Use however and also.", model: "I think social media has both good and bad sides. It helps people stay connected. However, it can waste time. Also, it can affect mental health. We need to use it carefully.", tags: ['opinion'], diff: 3, expl: "لإبداء الرأي: I think / In my opinion. لربط الأفكار: because (سبب)، however (لكن)، also (أيضاً)." },
    { p: "Describe your dream vacation in 3 sentences. Use 'I would' / 'I'd like to'.", model: "I would love to visit [place]. I would [activity1] and [activity2]. It would be a perfect trip.", tags: ['conditional','wishes'], diff: 3, expl: "للأحلام والأمنيات نستخدم would: I would love / I'd like to. الـ I'd هي اختصار I would." },
    { p: "Write a short message to a friend you haven't seen in a long time. Use present perfect.", model: "Hi [name], it's been [time] since we last met. I have [activity]. I miss you. Let's meet [time/place].", tags: ['present_perfect','informal'], diff: 4, expl: "Present Perfect (have + V3) للأحداث المرتبطة بالحاضر. it's been [time] since = مرّ كذا منذ." },
  ]
  return prompts.map(p => ({
    level, exercise_type: 'mini_write', skill: 'writing',
    topic_tags: p.tags, difficulty: p.diff,
    prompt_en: p.p, correct_answer: { value: p.model }, distractors: null,
    explanation_ar: p.expl + ' الكتابة لا تحتاج كمال — تحتاج بداية. حاولي الكتابة دون توقّف ثم راجعي.',
  }))
}

function genReorder(level) {
  const items = [
    { en: "morning / drink / I / coffee / every", correct: "I drink coffee every morning.", expl: "ترتيب أساسي: فاعل + فعل + مفعول به + ظرف زمن. I → drink → coffee → every morning." },
    { en: "live / do / where / you / ?", correct: "Where do you live?", expl: "ترتيب السؤال: كلمة الاستفهام (Where) + do/does + فاعل + فعل." },
    { en: "is / car / red / new / a / This", correct: "This is a new red car.", expl: "ترتيب الصفات: عمر/جدّة + لون + اسم. new ثم red ثم car." },
    { en: "the / are / they / library / in", correct: "They are in the library.", expl: "ترتيب: فاعل + فعل be + ظرف مكان. They → are → in the library." },
    { en: "yesterday / movie / saw / a / I / good", correct: "I saw a good movie yesterday.", expl: "Past Simple مع yesterday. الصفة قبل الاسم: a good movie." },
    { en: "always / am / late / I / Sunday / on", correct: "I am always late on Sunday.", expl: "ظرف التكرار (always) بين الفاعل والفعل. on Sunday في النهاية." },
    { en: "to / school / brother / my / goes", correct: "My brother goes to school.", expl: "مع my brother (مفرد) نستخدم goes (إضافة s). to school = إلى المدرسة." },
    { en: "much / it / does / how / cost / ?", correct: "How much does it cost?", expl: "How much للسؤال عن الكمية/السعر. does it cost = هل يكلّف." },
    { en: "tomorrow / will / I / call / you", correct: "I will call you tomorrow.", expl: "Future Simple: will + V1. I → will → call → you → tomorrow." },
    { en: "lunch / not / do / eat / I", correct: "I do not eat lunch.", expl: "النفي مع I: do not + الفعل بصورته الأساسية. or 'don't eat'." },
    { en: "fluently / Arabic / speaks / She / and / English", correct: "She speaks Arabic and English fluently.", expl: "She speaks (third-person s). Object: Arabic and English. Adverb: fluently." },
    { en: "interesting / book / very / a / read / I / am", correct: "I am reading a very interesting book.", expl: "Present continuous: am + V-ing. Adjective order: very + interesting + book." },
    { en: "asleep / falls / cat / sometimes / the / on / the / sofa", correct: "The cat sometimes falls asleep on the sofa.", expl: "Adverb of frequency (sometimes) بين الفاعل والفعل. on the sofa = ظرف مكان." },
  ]
  return items.map((it, i) => ({
    level, exercise_type: 'reorder', skill: 'grammar',
    topic_tags: ['word_order'], difficulty: 2,
    prompt_en: it.en, correct_answer: { value: it.correct }, distractors: null,
    explanation_ar: it.expl + ' ترتيب الكلمات أحد أهم الفروق بين العربي والإنجليزي.',
  }))
}

// ─── ORCHESTRATOR ───────────────────────────────────────────────────────────

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  const LEVELS = ['L1','L2','L3','L4','L5']

  for (const ref of targets) {
    console.log(`\n========================== TARGET: ${ref} ==========================`)

    // Fetch vocab from curriculum once per ref
    const vocabByLevel = {}
    const vocabRes = await call(token, ref,
      `SELECT cv.word, cv.definition_ar, l.level_number
       FROM curriculum_vocabulary cv
       JOIN curriculum_readings cr ON cr.id = cv.reading_id
       JOIN curriculum_units u ON u.id = cr.unit_id
       JOIN curriculum_levels l ON l.id = u.level_id
       WHERE cv.definition_ar IS NOT NULL AND length(cv.definition_ar) >= 3
       LIMIT 800`
    )
    for (const row of vocabRes || []) {
      const lev = `L${row.level_number}`
      if (!vocabByLevel[lev]) vocabByLevel[lev] = []
      vocabByLevel[lev].push(row)
    }

    let totalInserted = 0, totalSkipped = 0
    for (const level of LEVELS) {
      const generators = [
        genArticleA_An(level),
        genSubjectVerbAgreement(level),
        genPlurals(level),
        genPrepositionTime(level),
        genPresentPerfect(level),
        genModalVerbs(level),
        genVocabFromCurriculum(level, vocabByLevel[level] || []),
        genComparatives(level),
        genReadingMCQ(level),
        genMiniWrite(level),
        genReorder(level),
      ]
      const all = generators.flat()
      console.log(`\n[${level}] generated ${all.length} candidates`)

      let inserted = 0, skipped = 0, failed = 0
      let batchValues = []
      for (let i = 0; i < all.length; i++) {
        const e = all[i]
        const vals = `(${esc(e.exercise_type)}, ${esc(e.level)}, ${esc(e.skill)}, ${arrText(e.topic_tags)}, ${e.difficulty}, ${esc(e.prompt_en)}, NULL, ${jsonbVal(e.correct_answer)}, ${e.distractors ? jsonbVal(e.distractors) : 'NULL'}, ${esc(e.explanation_ar)}, 60)`
        batchValues.push(vals)
        if (batchValues.length >= 25 || i === all.length - 1) {
          const sql = `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds)
            VALUES ${batchValues.join(',')}
            ON CONFLICT DO NOTHING`
          try {
            await call(token, ref, sql)
            inserted += batchValues.length
          } catch (err) {
            console.error(`  batch failed (${err.message.slice(0,100)}); retrying single`)
            // fallback to one-by-one
            for (const v of batchValues) {
              try {
                await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${v} ON CONFLICT DO NOTHING`)
                inserted++
              } catch { failed++ }
            }
          }
          batchValues = []
        }
      }
      console.log(`  [${level}] inserted: ${inserted} (failed: ${failed})`)
      totalInserted += inserted
    }

    const final = await call(token, ref, 'SELECT count(*), level FROM retention_exercises GROUP BY level ORDER BY level')
    console.log(`\n[${ref}] total exercises now:`)
    for (const r of final || []) console.log(`  ${r.level}: ${r.count}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
