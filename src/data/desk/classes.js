// Pro Desk — "My Classes": each live 1-on-1 class becomes a guided JOURNEY,
// not one long page. A class is a syllabus of small focused STATIONS; each
// station is one topic taught in three beats:
//   Understand  →  Check  →  Practice.
// She learns a piece, checks it, then PRACTISES it — before moving on.
//
// ENGLISH-PRIMARY: English is the dominant text everywhere (headings, body,
// teaching content, activities). Arabic is a small, muted GLOSS kept only where
// it truly helps (titles, grammar terms, example translations, translate-source).
//
// 100% CREDITLESS — authored from the teacher's real class notes, no runtime AI.
// Repeatable SYSTEM: every future class = one new entry with the same shape.
//
// A chapter (every KEY preserved; `_en` = primary, `_ar` = optional gloss):
//   { id, ar, en, icon, minutes, goal_en, goal_ar,
//     concept : [ { en?, ar?, body_en, body_ar, model_en?, model_ar?,
//                   examples:[{en, ar?, note_en?, note_ar?}], rule_en?, rule_ar? } ],
//     check   : [ { q_en, q_ar, options:[{en?, ar?, correct, why_en, why_ar}] } ],
//     practice: [ <activity> ] }
//
// Practice activity types (all self-checking, creditless):
//   choose    : { title_en, title_ar, prompt_en, prompt_ar, options:[{en?, ar?, correct, why_en, why_ar}] }
//   fill      : { title_en, title_ar, prompt_en, prompt_ar, before, after, options:[{en, correct, why_en, why_ar}] }
//   build     : { title_en, title_ar, prompt_en, prompt_ar, ar?, words:[...correct order] }
//   classify  : { title_en, title_ar, prompt_en, prompt_ar, buckets:[{id, label_en, label_ar}], items:[{en, ar?, bucket}] }
//   ladder    : { title_en, title_ar, intro_en, intro_ar, base:{en, ar}, rungs:[{task_en, task_ar, en, why_en, why_ar}] }
//   fix       : { title_en, title_ar, intro_en, intro_ar, items:[{wrong, right, why_en, why_ar}] }
//   irregular : { title_en, title_ar, intro_en, intro_ar, verbs:[{base, past, pp, ar}] }
//   translate : { title_en, title_ar, intro_en, intro_ar, items:[{ar, en, alt_en?}] }

export const DESK_CLASSES = [
  {
    id: 'class-01',
    number: 1,
    date: '2026-07-04',
    title_en: 'Grammar Foundations: Sentences & Tenses',
    title_ar: 'أساسيات القواعد: الجملة والأزمنة',
    tagline_en: 'Your first class — we built the foundation. Review it station by station: understand each piece, check it, then practise.',
    tagline_ar: '',
    takeaways_en: [
      'Add -s to the verb only for a third-person singular subject, and only in the present simple.',
      'Any verb + -ing becomes "heavy" — it needs a form of "to be" to help it.',
      'Past progressive = shift "be" to the past (was / were) and add -ing.',
      '"Be" shows up in three places: nominal sentences, the present progressive, and the passive voice.',
    ],
    takeaways_ar: [],

    chapters: [
      // ── 1 ──────────────────────────────────────────────────────────────
      {
        id: 'sentence-types',
        ar: 'نوع الجملة',
        en: 'Nominal vs Verbal',
        icon: 'AlignRight',
        minutes: 4,
        goal_en: 'Tell nominal and verbal sentences apart with confidence.',
        goal_ar: '',
        concept: [
          {
            en: '',
            ar: '',
            body_en: 'Every sentence is either nominal or verbal. A nominal sentence has no action verb — it describes a state and uses a form of "to be." A verbal sentence has a real action verb: something actually happens.',
            body_ar: '',
            model_en: 'Rule: no action verb → nominal (with "to be"). An action verb → verbal.',
            model_ar: '',
            examples: [
              { en: 'This building is amazing.', ar: 'هذا المبنى رائع.', note_en: 'nominal — the verb "to be": is', note_ar: '' },
              { en: 'Ali plays football.', ar: 'علي يلعب كرة القدم.', note_en: 'verbal — the action verb "play"', note_ar: '' },
            ],
          },
        ],
        check: [
          {
            q_en: '"This car is fast." — which type is it?',
            q_ar: '',
            options: [
              { en: 'Nominal', ar: 'اسمية', correct: true, why_en: 'Right — there is no action verb; it uses "is".', why_ar: '' },
              { en: 'Verbal', ar: 'فعلية', correct: false, why_en: 'A verbal sentence has an action verb (like "play"); here it is just "is".', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'classify',
            title_en: 'Sort the sentences',
            title_ar: '',
            prompt_en: 'Drop each sentence into the right column:',
            prompt_ar: '',
            buckets: [{ id: 'nom', label_en: 'Nominal', label_ar: 'اسمية' }, { id: 'verb', label_en: 'Verbal', label_ar: 'فعلية' }],
            items: [
              { en: 'The coffee is hot.', bucket: 'nom' },
              { en: 'Sarah writes reports.', bucket: 'verb' },
              { en: 'My laptop is new.', bucket: 'nom' },
              { en: 'The team fixes the server.', bucket: 'verb' },
            ],
          },
        ],
      },

      // ── 2 ──────────────────────────────────────────────────────────────
      {
        id: 'present-simple',
        ar: 'المضارع البسيط وقاعدة الـ S',
        en: 'Present simple & the S rule',
        icon: 'UserRound',
        minutes: 6,
        goal_en: 'Know when to add -s to a verb, and why.',
        goal_ar: '',
        concept: [
          {
            en: 'Who is the subject?',
            ar: 'مين الفاعل؟',
            body_en: 'Before you conjugate a verb, work out who the subject is. There are three cases: the speaker, the person you are talking to, and a third party.',
            body_ar: '',
            model_en: 'I / we = first person · you = second person · anything else = third person.',
            model_ar: '',
            examples: [
              { en: 'He / She / It / Sarah / the team / the company / the server …', ar: '', note_en: 'all third person — anyone or anything not directly in the conversation', note_ar: '' },
            ],
          },
          {
            en: 'The S rule',
            ar: 'قاعدة الـ S',
            body_en: 'When the subject is third-person singular in the present simple, add -s to the verb. Two conditions must both be true: third person AND singular.',
            body_ar: '',
            model_en: 'Rule: third-person singular + present simple → add -s. And only in the present simple!',
            model_ar: '',
            examples: [
              { en: 'I play football.', ar: 'أنا ألعب', note_en: 'first person — no -s', note_ar: '' },
              { en: 'Sarah plays football.', ar: 'سارة تلعب', note_en: 'third-person singular — add -s', note_ar: '' },
              { en: 'Sarah does her homework.', ar: '', note_en: 'do → does', note_ar: '' },
            ],
            rule_en: 'Watch out: the -s applies only to the present simple, not to the other tenses.',
            rule_ar: '',
          },
        ],
        check: [
          {
            q_en: 'When do you add -s to the verb?',
            q_ar: '',
            options: [
              { en: 'With any subject in the present', ar: '', correct: false, why_en: 'Not with any subject — only with a third-person singular one.', why_ar: '' },
              { en: 'When the subject is third-person singular, in the present simple only', ar: '', correct: true, why_en: 'Exactly — third person + singular + present simple.', why_ar: '' },
              { en: 'In every tense', ar: '', correct: false, why_en: 'No — the -s is specific to the present simple.', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_en: 'Fill the gap',
            title_ar: '',
            prompt_en: 'Choose the correct form of the verb:',
            prompt_ar: '',
            before: 'Sarah', after: 'football every day.',
            options: [
              { en: 'play', correct: false, why_en: 'Sarah is third-person singular → it must be "plays".', why_ar: '' },
              { en: 'plays', correct: true, why_en: 'Right! Third-person singular + present simple → plays.', why_ar: '' },
              { en: 'is play', correct: false, why_en: 'We do not combine "is" with the base verb.', why_ar: '' },
            ],
          },
          {
            type: 'build',
            title_en: 'Arrange the sentence',
            title_ar: '',
            prompt_en: 'Put the words in order to make a correct present-simple sentence:',
            prompt_ar: '',
            ar: 'المهندس يراقب الخوادم.',
            words: ['The', 'engineer', 'monitors', 'the', 'servers'],
          },
        ],
      },

      // ── 3 ──────────────────────────────────────────────────────────────
      {
        id: 'present-progressive',
        ar: 'المضارع المستمر',
        en: 'Present progressive',
        icon: 'Activity',
        minutes: 5,
        goal_en: 'Build a correct progressive sentence with "to be".',
        goal_ar: '',
        concept: [
          {
            en: '',
            ar: '',
            body_en: 'The progressive means the action is happening right now, so we add -ing. And any verb with -ing becomes "heavy" — it needs help from a form of "to be" (am / is / are).',
            body_ar: '',
            model_en: 'The idea: verb + -ing gets heavy → it needs "to be" to help it. "play" is 4 letters, "playing" is 7 — it wants a hand!',
            model_ar: '',
            examples: [
              { en: 'Sarah is playing football.', ar: 'سارة تلعب الحين', note_en: 'is + playing', note_ar: '' },
              { en: 'I am doing my homework.', ar: 'أنا أسوّي واجبي الحين', note_en: 'am + doing', note_ar: '' },
            ],
          },
        ],
        check: [
          {
            q_en: 'Why does "playing" need a form of "to be" in front of it?',
            q_ar: '',
            options: [
              { en: 'Because the -ing makes the verb "heavy," so it needs help', ar: '', correct: true, why_en: 'Yes — any verb + -ing needs am / is / are to help it.', why_ar: '' },
              { en: 'Because it is a past verb', ar: '', correct: false, why_en: 'It is not past — the -ing shows an action ongoing in the present.', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_en: 'Fill the gap',
            title_ar: '',
            prompt_en: 'Choose the right form of "to be":',
            prompt_ar: '',
            before: 'The servers', after: 'restarting now.',
            options: [
              { en: 'is', correct: false, why_en: '"servers" is plural → use "are".', why_ar: '' },
              { en: 'are', correct: true, why_en: 'Right — "servers" is plural → are restarting.', why_ar: '' },
              { en: 'am', correct: false, why_en: '"am" only goes with "I".', why_ar: '' },
            ],
          },
          {
            type: 'build',
            title_en: 'Arrange the sentence',
            title_ar: '',
            prompt_en: 'Put the words in order to make a correct progressive sentence:',
            prompt_ar: '',
            ar: 'سارة تلعب كرة القدم الحين.',
            words: ['Sarah', 'is', 'playing', 'football'],
          },
        ],
      },

      // ── 4 ──────────────────────────────────────────────────────────────
      {
        id: 'past',
        ar: 'الماضي: بسيط ومستمر',
        en: 'Past simple & progressive',
        icon: 'History',
        minutes: 6,
        goal_en: 'Move a sentence into both past tenses, and know the irregular verbs.',
        goal_ar: '',
        concept: [
          {
            en: '',
            ar: '',
            body_en: 'For the past simple, use the second form of the verb. For the past progressive, just shift "to be" from the present to the past (is → was, are → were) and keep the -ing.',
            body_ar: '',
            examples: [
              { en: 'I played football.', ar: 'أنا لعبت', note_en: 'past simple — play → played', note_ar: '' },
              { en: 'Sarah was playing football.', ar: 'سارة كانت تلعب', note_en: 'was + playing', note_ar: '' },
              { en: 'We were playing football.', ar: 'كنّا نلعب', note_en: 'were + playing', note_ar: '' },
            ],
            rule_en: 'Some verbs are "irregular" — they do not follow the -ed rule, so you have to memorise them.',
            rule_ar: '',
          },
        ],
        check: [
          {
            q_en: 'Complete: "We ___ playing when the power went off."',
            q_ar: '',
            options: [
              { en: 'was', correct: false, why_en: '"we" is plural → were.', why_ar: '' },
              { en: 'were', correct: true, why_en: 'Right — we + were + playing (past progressive).', why_ar: '' },
              { en: 'are', correct: false, why_en: '"are" is present; the sentence is in the past.', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'fill',
            title_en: 'Move it to the past',
            title_ar: '',
            prompt_en: 'Choose the correct past simple:',
            prompt_ar: '',
            before: 'Yesterday she', after: 'the report.',
            options: [
              { en: 'writes', correct: false, why_en: '"writes" is present; we need the past.', why_ar: '' },
              { en: 'wrote', correct: true, why_en: 'Right — "write" is irregular: wrote in the past.', why_ar: '' },
              { en: 'writed', correct: false, why_en: 'We do not add -ed to irregular verbs — it is "wrote".', why_ar: '' },
            ],
          },
          {
            type: 'irregular',
            title_en: 'Irregular verbs',
            title_ar: '',
            intro_en: 'The verbs we covered. Try to recall the forms, then flip the card.',
            intro_ar: '',
            verbs: [
              { base: 'go', past: 'went', pp: 'gone', ar: 'يذهب' },
              { base: 'cost', past: 'cost', pp: 'cost', ar: 'يكلّف' },
              { base: 'cut', past: 'cut', pp: 'cut', ar: 'يقطع' },
              { base: 'build', past: 'built', pp: 'built', ar: 'يبني' },
              { base: 'sleep', past: 'slept', pp: 'slept', ar: 'ينام' },
              { base: 'be', past: 'was / were', pp: 'been', ar: 'يكون' },
              { base: 'think', past: 'thought', pp: 'thought', ar: 'يفكّر' },
              { base: 'buy', past: 'bought', pp: 'bought', ar: 'يشتري' },
            ],
          },
        ],
      },

      // ── 5 ──────────────────────────────────────────────────────────────
      {
        id: 'questions-negatives',
        ar: 'السؤال والنفي',
        en: 'Questions & negatives',
        icon: 'HelpCircle',
        minutes: 7,
        goal_en: 'Form a question and a negative in every tense — step by step.',
        goal_ar: '',
        concept: [
          {
            en: '',
            ar: '',
            body_en: 'Each tense has its own way to make questions and negatives. The present simple uses do / does, the past simple uses did, and the progressive uses "to be" itself.',
            body_ar: '',
            examples: [
              { en: 'Do I play?  ·  When do I play?', ar: '', note_en: 'present simple — do / does + subject + verb', note_ar: '' },
              { en: 'Are you playing?  ·  When are you playing?', ar: '', note_en: 'present progressive — be + subject + -ing', note_ar: '' },
              { en: 'Did I play?  ·  When did I play?', ar: '', note_en: 'past simple — did + subject + verb', note_ar: '' },
            ],
            rule_en: 'Question words: When / Where / Who / Whom / Whose / How.',
            rule_ar: '',
          },
        ],
        check: [
          {
            q_en: 'How do you turn "You are playing football" into a question?',
            q_ar: '',
            options: [
              { en: 'Do you playing football?', correct: false, why_en: 'With the progressive we use "be" itself, not "do".', why_ar: '' },
              { en: 'Are you playing football?', correct: true, why_en: 'Right — move "be" to the front: Are + you + playing.', why_ar: '' },
              { en: 'Are you play football?', correct: false, why_en: 'The -ing is missing: Are you playing.', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'ladder',
            title_en: 'The tense ladder',
            title_ar: '',
            intro_en: 'Same sentence, raised one rung at a time — just like in class. Think first, then tap "Reveal".',
            intro_ar: '',
            base: { en: 'Sarah plays football.', ar: 'سارة تلعب كرة القدم.' },
            rungs: [
              { task_en: 'Make it a yes/no question', task_ar: '', en: 'Does Sarah play football?', why_en: 'Present simple + third-person singular → does + subject + base verb (no -s).', why_ar: '' },
              { task_en: 'Make it negative', task_ar: '', en: "Sarah doesn't play football.", why_en: "does + not = doesn't, and the verb drops the -s.", why_ar: '' },
              { task_en: 'Ask with "When"', task_ar: '', en: 'When does Sarah play football?', why_en: 'Question word "When" + does + subject + verb.', why_ar: '' },
              { task_en: 'Move it to the past simple', task_ar: '', en: 'Sarah played football.', why_en: 'Second form: play → played.', why_ar: '' },
              { task_en: 'Move it to the past progressive', task_ar: '', en: 'Sarah was playing football.', why_en: 'was + playing — shift "be" to the past and add -ing.', why_ar: '' },
            ],
          },
          {
            type: 'build',
            title_en: 'Build the question',
            title_ar: '',
            prompt_en: 'Arrange the words into a present-progressive question:',
            prompt_ar: '',
            ar: 'وين تلعبين كرة القدم؟',
            words: ['Where', 'are', 'you', 'playing', 'football'],
          },
        ],
      },

      // ── 6 ──────────────────────────────────────────────────────────────
      {
        id: 'auxiliaries',
        ar: 'الأفعال المساعدة و be',
        en: 'Auxiliaries & the uses of be',
        icon: 'Wrench',
        minutes: 6,
        goal_en: 'Know the auxiliary verbs, and the three places "be" shows up.',
        goal_ar: '',
        concept: [
          {
            en: 'Auxiliary verbs',
            ar: 'الأفعال المساعدة',
            body_en: 'Auxiliaries (helping verbs) support the main verb in questions, negatives, and tenses. Here are the key ones with their forms:',
            body_ar: '',
            examples: [
              { en: 'be → am / is / are · was / were · been', ar: '', note_en: '"to be"', note_ar: '' },
              { en: 'do → do / does / did', ar: '', note_en: '"to do"', note_ar: '' },
              { en: 'have → have / has / had', ar: '', note_en: 'for the perfect tenses', note_ar: '' },
              { en: 'can → can / could · will → will / would', ar: '', note_en: 'ability / future', note_ar: '' },
            ],
          },
          {
            en: 'Where "be" appears',
            ar: 'مواضع فعل be',
            body_en: '"Be" shows up in three important situations — memorise them, because they come up all the time:',
            body_ar: '',
            examples: [
              { en: 'This car is fast.', ar: '', note_en: '1 — nominal sentence', note_ar: '' },
              { en: 'I am playing football.', ar: '', note_en: '2 — present progressive', note_ar: '' },
              { en: 'The palace was built in 1999.', ar: '', note_en: '3 — passive voice', note_ar: '' },
            ],
          },
        ],
        check: [
          {
            q_en: 'Complete: "The palace ___ built in 1999."',
            q_ar: '',
            options: [
              { en: 'was', correct: true, why_en: 'Right — passive in the past: was + the third form "built".', why_ar: '' },
              { en: 'is', correct: false, why_en: 'The event was in 1999 (past) → was.', why_ar: '' },
              { en: 'did', correct: false, why_en: 'The passive uses "be" (was), not "did".', why_ar: '' },
            ],
          },
        ],
        practice: [
          {
            type: 'classify',
            title_en: 'Sort the uses of "be"',
            title_ar: '',
            prompt_en: 'Each sentence has a form of "be" — which use is it?',
            prompt_ar: '',
            buckets: [{ id: 'nom', label_en: 'Nominal', label_ar: 'اسمية' }, { id: 'prog', label_en: 'Progressive', label_ar: 'مستمر' }, { id: 'pass', label_en: 'Passive', label_ar: 'مبني للمجهول' }],
            items: [
              { en: 'The room is quiet.', bucket: 'nom' },
              { en: 'She is writing an email.', bucket: 'prog' },
              { en: 'The system was updated last night.', bucket: 'pass' },
            ],
          },
          {
            type: 'fill',
            title_en: 'Pick the right auxiliary',
            title_ar: '',
            prompt_en: 'Choose the auxiliary that fits the question:',
            prompt_ar: '',
            before: '', after: 'Sarah finish the report yesterday?',
            options: [
              { en: 'Does', correct: false, why_en: 'The sentence is in the past (yesterday) → Did.', why_ar: '' },
              { en: 'Did', correct: true, why_en: 'Right — past simple → Did + subject + verb.', why_ar: '' },
              { en: 'Is', correct: false, why_en: '"is" is for the progressive or nominal, not a past-simple question.', why_ar: '' },
            ],
          },
        ],
      },

      // ── 7 ──────────────────────────────────────────────────────────────
      {
        id: 'preference',
        ar: 'لمسة: التفضيل',
        en: 'Talking about preference',
        icon: 'Sparkles',
        minutes: 4,
        goal_en: 'Express preference smoothly, at work and in life.',
        goal_ar: '',
        concept: [
          {
            en: '',
            ar: '',
            body_en: 'We touched on how to talk about preference — handy at work and in daily life:',
            body_ar: '',
            examples: [
              { en: 'I prefer tea. · I prefer to read. · I prefer reading.', ar: '', note_en: 'prefer + noun / to / -ing', note_ar: '' },
              { en: 'I favor this option.', ar: '', note_en: 'favor (verb) · favorite (the one you like most)', note_ar: '' },
              { en: 'Do me a favor.', ar: '', note_en: 'a ready-made expression', note_ar: '' },
            ],
            rule_en: 'Some verbs are followed by -ing or "to" (like prefer / like / love).',
            rule_ar: '',
          },
        ],
        check: [],
        practice: [
          {
            type: 'translate',
            title_en: 'Say it in English',
            title_ar: '',
            intro_en: 'Try to say it yourself, then reveal the model. More than one wording can be correct.',
            intro_ar: '',
            items: [
              { ar: 'أفضّل أن أفطر مبكرًا في الصباح.', en: 'I prefer to have breakfast early in the morning.', alt_en: 'I like eating breakfast early in the morning.' },
              { ar: 'اعملي لي معروف.', en: 'Do me a favor.', alt_en: '' },
            ],
          },
          {
            type: 'fix',
            title_en: 'Fix it',
            title_ar: '',
            intro_en: 'Sentences from your class with mistakes in them. Think of the correction, then reveal it.',
            intro_ar: '',
            items: [
              { wrong: 'How many users got impact?', right: 'How many users were impacted?', why_en: '"got impact" is not idiomatic. Say "were impacted" or "were affected."', why_ar: '' },
              { wrong: 'This issues become showing in the tools.', right: 'The technical issues started showing up on the monitoring tools.', why_en: '"this" is singular but "issues" is plural, and "become showing" is not correct. Better: "started showing up on…"', why_ar: '' },
            ],
          },
        ],
      },
    ],
  },
]

// ── derived helpers ─────────────────────────────────────────────────────────
export const ALL_CLASSES = [...DESK_CLASSES].sort((a, b) => b.number - a.number) // newest first
export const TOTAL_CLASSES = DESK_CLASSES.length

export function getClass(classId) {
  return DESK_CLASSES.find((c) => c.id === classId) || null
}
export function getChapter(classId, chapterId) {
  const cls = getClass(classId)
  if (!cls) return { cls: null, chapter: null, index: -1, next: null, prev: null }
  const index = cls.chapters.findIndex((ch) => ch.id === chapterId)
  return {
    cls,
    chapter: index >= 0 ? cls.chapters[index] : null,
    index,
    next: index >= 0 && index + 1 < cls.chapters.length ? cls.chapters[index + 1] : null,
    prev: index > 0 ? cls.chapters[index - 1] : null,
  }
}
// count of interactive beats a chapter has (for the 3-dot sub-progress: understand always on)
export function chapterParts(ch) {
  return { understand: true, check: (ch.check?.length || 0) > 0, practice: (ch.practice?.length || 0) > 0 }
}
