// بناء الجُمل — Sentence Building trainer content (creditless, self-checking).
// Target: a vocab-rich B1 learner whose mind isn't yet trained to assemble FULL
// sentences on demand — the exact reflex speaking needs. Everything here is authored
// + checked locally (no runtime AI), so it works regardless of API credit.
//
// Arabic copy is FEMALE-form (the first learner is نادية). Brand = طلاقة.
// Drill types:
//   expand  — turn a bare word into a full, natural sentence for a situation
//   frame   — complete a sentence starter into a whole sentence
//   arrange — order shuffled word-chips into a correct sentence (auto-checked)
//   fuller  — grow a fragment into a full sentence
//   fix     — repair a shaky sentence (subject–verb, articles, prepositions)
//
// To add a set: append an object to SENTENCE_SETS. To add an item: push to `items`.

export const SENTENCE_SETS = [
  {
    id: 'daily-life',
    title_ar: 'يومكِ وحياتكِ',
    title_en: 'Your day & life',
    blurb_ar: 'حوّلي كلماتكِ عن يومكِ إلى جُمَل كاملة تقدرين تقولينها بثقة.',
    items: [
      {
        type: 'expand',
        word: 'coffee',
        gloss_ar: 'قهوة',
        situation_ar: 'اطلبي قهوة بأدب من الكاشير.',
        model: 'Could I have a coffee, please?',
        alt: ["I'd like a coffee, please.", 'Can I get a coffee, please?'],
        tip_ar: 'الطلب المؤدّب يبدأ بـ Could I / I’d like — وليس بالكلمة وحدها.',
      },
      {
        type: 'fix',
        broken: 'He have discount every month.',
        model: 'He has a discount every month.',
        rule_ar: 'مع he/she/it يصير الفعل has (مو have)، و«discount» تحتاج a قبلها.',
      },
      {
        type: 'frame',
        starter: 'Every morning, I usually',
        hint_ar: 'أكملي بعادة يومية حقيقية (فعل + تفاصيل).',
        model: 'Every morning, I usually drink tea and check my phone.',
        alt: ['Every morning, I usually wake up early and study English.'],
        tip_ar: 'بعد usually يجي فعل بالمضارع البسيط — كمّلي الجملة لين تصير كاملة.',
      },
      {
        type: 'arrange',
        tokens: ['I', 'went', 'to', 'the', 'market', 'yesterday'],
        model: 'I went to the market yesterday.',
        tip_ar: 'الترتيب: فاعل + فعل + مكان + زمان.',
      },
      {
        type: 'fuller',
        fragment: 'good place to study',
        model: 'It is a good place to study.',
        alt: ['This café is a good place to study.', "It's a really good place to study."],
        tip_ar: 'الجملة تحتاج فاعل وفعل: ابدئي بـ It is… أو This … is…',
      },
    ],
  },
  {
    id: 'people-opinions',
    title_ar: 'الناس والآراء',
    title_en: 'People & opinions',
    blurb_ar: 'اوصفي الناس وعبّري عن رأيكِ بجُمَل كاملة، لا مجرد كلمات.',
    items: [
      {
        type: 'fix',
        broken: 'They are good manager.',
        model: 'They are good managers.',
        rule_ar: 'مع they (جمع) الاسم يصير جمع: managers — طابقي العدد.',
      },
      {
        type: 'frame',
        starter: 'In my opinion,',
        hint_ar: 'اذكري رأياً كاملاً (مبتدأ + خبر).',
        model: 'In my opinion, learning English every day is the best way to improve.',
        alt: ['In my opinion, small classes are better than big ones.'],
        tip_ar: 'بعد «In my opinion,» لازم جملة كاملة، مو كلمة.',
      },
      {
        type: 'expand',
        word: 'kind',
        gloss_ar: 'لطيف/طيّب',
        situation_ar: 'اوصفي صديقتكِ بأنها لطيفة.',
        model: 'My friend is very kind.',
        alt: ['She is a kind and helpful person.'],
        tip_ar: 'الصفة وحدها مو جملة — أضيفي فاعل + is/are.',
      },
      {
        type: 'arrange',
        tokens: ['She', 'is', 'the', 'best', 'teacher', 'in', 'the', 'school'],
        model: 'She is the best teacher in the school.',
        tip_ar: 'is + the best + اسم + in the … — رتّبي الوصف بالترتيب.',
      },
      {
        type: 'fuller',
        fragment: 'high prices',
        model: 'Their prices are high.',
        alt: ['The prices there are quite high.'],
        tip_ar: 'حوّلي العبارة إلى جملة: مين صاحب الأسعار؟ + are.',
      },
    ],
  },
  {
    id: 'talk-about-you',
    title_ar: 'عرّفي عن نفسكِ',
    title_en: 'Talk about yourself',
    blurb_ar: 'أهم شيء في المحادثة: تعرفين تتكلمين عن نفسكِ بجُمَل واضحة.',
    items: [
      {
        type: 'frame',
        starter: 'My name is Nadiah and',
        hint_ar: 'أكملي بمعلومة عنكِ (I + فعل).',
        model: 'My name is Nadiah and I am learning English to speak with confidence.',
        alt: ['My name is Nadiah and I work as a teacher.'],
        tip_ar: 'بعد and نبدأ جملة ثانية كاملة — I am / I work / I like…',
      },
      {
        type: 'expand',
        word: 'weekend',
        gloss_ar: 'نهاية الأسبوع',
        situation_ar: 'قولي وش تحبين تسوين في نهاية الأسبوع.',
        model: 'On the weekend, I like to read and see my family.',
        alt: ['I usually relax and cook on the weekend.'],
        tip_ar: 'اربطي الكلمة بفعل حقيقي: On the weekend, I …',
      },
      {
        type: 'fix',
        broken: 'I very happy today.',
        model: 'I am very happy today.',
        rule_ar: 'الجملة ناقصة الفعل — نحتاج am بعد I.',
      },
      {
        type: 'fuller',
        fragment: 'love the coffee here',
        model: 'I love the coffee here.',
        alt: ['I really love the coffee in this place.'],
        tip_ar: 'ابدئي بفاعل: I love … (لا تبدئين بالفعل مباشرة).',
      },
      {
        type: 'arrange',
        tokens: ['I', 'have', 'been', 'studying', 'English', 'for', 'two', 'years'],
        model: 'I have been studying English for two years.',
        tip_ar: 'have been + فعل-ing + for + مدة — بناء المضارع التام المستمر.',
      },
    ],
  },
]

// ── Local, creditless checker ────────────────────────────────────────────────
// Normalizes case, spacing, and trailing punctuation so a right answer typed
// naturally still counts. Never calls out to a server.
export function normalizeSentence(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?؛،]+/g, ' ')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkAnswer(item, answer) {
  const a = normalizeSentence(answer)
  if (!a) return { ok: false, reason: 'empty' }
  const targets = [item.model, ...(item.alt || [])].map(normalizeSentence)
  if (targets.includes(a)) return { ok: true, exact: true }
  // arrange: exact ordering matters, but be forgiving of the model's punctuation
  if (item.type === 'arrange') {
    const want = normalizeSentence(item.model)
    return { ok: a === want, exact: a === want }
  }
  // For open builders (expand/frame/fuller/fix) we can't grade free text perfectly
  // without AI, so "close enough" = contains the key content words of the model.
  const modelWords = normalizeSentence(item.model).split(' ').filter((w) => w.length > 2)
  const hit = modelWords.filter((w) => a.includes(w)).length
  const coverage = modelWords.length ? hit / modelWords.length : 0
  const fullSentence = a.split(' ').length >= 3 && /\b(i|he|she|it|they|we|you|this|that|there|my|the)\b/.test(a)
  if (coverage >= 0.6 && fullSentence) return { ok: true, close: true }
  return { ok: false, close: coverage >= 0.35, fullSentence }
}

// A tiny "did she speak/write in a FULL sentence?" heuristic used for the recap score.
export function isFullSentence(text) {
  const a = normalizeSentence(text)
  const words = a.split(' ').filter(Boolean)
  const hasSubject = /\b(i|he|she|it|they|we|you|this|that|there|my|the|his|her|their)\b/.test(a)
  const hasVerbish = /\b(is|am|are|was|were|have|has|had|do|does|did|like|want|go|went|will|can|study|work|love|need|think|make|makes|get|gets|see|drink|eat|read)\b/.test(a)
  return words.length >= 3 && hasSubject && hasVerbish
}
