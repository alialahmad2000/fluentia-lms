/**
 * worksheetGrader.js — STRUCTURE-FIRST grading for the tense-transformation worksheet
 * («الأزمنة الأربعة — تحويل الجُمل», content.render === 'worksheet').
 *
 * WHY THIS EXISTS
 * ---------------
 * The generic `validateAnswer` compares the student's sentence to the model answer
 * string. On this worksheet that is the WRONG contract: only ONE cell per row is
 * given, so the student legitimately CANNOT know the object/complement of the other
 * three cells. Example — given «What is he deploying now?» the student must write the
 * affirmative; "He is deploying now." is a perfect transformation, but string-matching
 * marks it wrong because the model says "He is deploying the new build now."
 *
 * The skill this worksheet teaches is the TRANSFORMATION — auxiliary, verb form,
 * negation, word order (inversion), subject agreement. So that is what we grade:
 *
 *   COUNTED WRONG  →  wrong/missing auxiliary · wrong verb form for the tense ·
 *                     missing negation (or negation where none belongs) ·
 *                     no inversion in a question · missing main verb ·
 *                     answering with the wrong sentence type · different subject.
 *   NOT COUNTED    →  a different object/complement · a missing object the student
 *                     could not know · a different (but valid) wh-word · articles ·
 *                     punctuation, capitalisation, contractions · spelling typos in
 *                     the verb/subject stem ("configauring", "beckup", "enginers").
 *
 * Everything is derived from the row's OWN four canonical forms (worksheet.tenses[].
 * rows[].forms) — subject, auxiliary, base/‑ing/past verb forms — so the grader needs
 * no dictionary and stays correct for every worksheet the seeders generate.
 */

const AUX_DO = new Set(['do', 'does', 'did'])
const AUX_BE = new Set(['am', 'is', 'are', 'was', 'were'])
const AUX = new Set([...AUX_DO, ...AUX_BE])
const WH = new Set(['what', 'where', 'when', 'who', 'whom', 'whose', 'why', 'which', 'how'])
const ARTICLES = new Set(['the', 'a', 'an'])

/* ───────────────────────── text → tokens ───────────────────────── */

function normalizeText(s) {
  return String(s ?? '')
    .replace(/[‘’′`]/g, "'")   // smart quotes → straight
    .toLowerCase()
    .replace(/\bcan'?t\b/g, 'can not')
    .replace(/\bwon'?t\b/g, 'will not')
    .replace(/\bshan'?t\b/g, 'shall not')
    .replace(/n't\b/g, ' not')                // doesn't/didn't/isn't/wasn't/weren't/aren't…
    .replace(/\b(he|she|it|that|there|what|who|where)'s\b/g, '$1 is')
    .replace(/\b(i)'m\b/g, '$1 am')
    .replace(/\b(they|we|you)'re\b/g, '$1 are')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')        // drop punctuation (incl. the apostrophe leftovers)
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s) {
  const n = normalizeText(s)
  return n ? n.split(' ') : []
}

/* ───────────────────────── fuzzy helpers ───────────────────────── */

function lev(a, b) {
  a = a || ''; b = b || ''
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    const t = prev; prev = cur; cur = t
  }
  return prev[n]
}

/** Same word, allowing a typo — but short words (he/she/it/we) must match exactly. */
function fuzzyEq(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const len = Math.max(a.length, b.length)
  if (len <= 4) return false                       // he/she/it/they… no guessing
  const singular = (w) => (w.endsWith('s') ? w.slice(0, -1) : w)
  if (singular(a) === singular(b)) return true     // customer / customers
  return lev(a, b) <= Math.max(1, Math.floor(len * 0.2))
}

/**
 * Does `cand` carry the EXPECTED verb form?
 * Typos in the stem are forgiven; a WRONG morphological form is not — so "check" can
 * never pass for "checks", and "buy"/"finish" can never pass for "bought"/"finished".
 */
function verbFormMatches(cand, expected, alternatives) {
  if (!cand || !expected) return false
  if (cand === expected) return true
  const d = lev(cand, expected)
  const tol = Math.min(2, Math.max(1, Math.floor(expected.length * 0.25)))
  if (d > tol) return false
  for (const alt of alternatives) {
    if (!alt || alt === expected) continue
    if (lev(cand, alt) <= d) return false          // closer to (or tied with) a wrong form
  }
  return true
}

/** Loose "this is the same verb, wrong shape" probe — powers verb_form vs verb_missing. */
function sameVerbStem(cand, base) {
  if (!cand || !base) return false
  const a = cand.slice(0, Math.min(5, base.length))
  const b = base.slice(0, Math.min(5, base.length))
  return a === b || lev(cand, base) <= 3
}

/* ───────────────────────── row skeleton ───────────────────────── */

/**
 * Derive the row's grammar from its four canonical forms.
 * The NEGATIVE form is the anchor: it always reads  SUBJECT + AUX + not + VERB …
 * which pins the subject boundary, the auxiliary, and the verb — with no lexicon.
 */
export function buildRowSkeleton(forms) {
  if (!forms?.neg || !forms?.aff || !forms?.q) return null
  const neg = tokens(forms.neg)
  const aff = tokens(forms.aff)
  const q = tokens(forms.q)
  const wh = tokens(forms.wh || '')

  const auxIdx = neg.findIndex((t) => AUX.has(t))
  if (auxIdx < 1) return null

  const subject = neg.slice(0, auxIdx)
  const aux = neg[auxIdx]
  const continuous = AUX_BE.has(aux)

  let vi = auxIdx + 1
  if (neg[vi] === 'not') vi++
  const negVerb = neg[vi]                       // base form (simple) | V-ing (continuous)
  if (!negVerb) return null

  const affRest = aff.slice(subject.length)
  const affBe = continuous ? affRest[0] : null  // is/are/was/were inside the affirmative
  const affVerb = continuous ? affRest[1] : affRest[0]
  if (!affVerb) return null

  const qAux = AUX.has(q[0]) ? q[0] : aux
  const ving = continuous ? negVerb : null
  const base = continuous ? null : negVerb

  // stem guesses so a wrong shape can never sneak through as a "typo"
  const stem = continuous ? String(ving).replace(/ing$/, '') : base
  const alternatives = [
    base, affVerb, negVerb, ving,
    stem, `${stem}e`, `${stem}s`, `${stem}es`, `${stem}ed`, `${stem}ing`,
    `${stem}ed`.replace(/ee?d$/, 'ed'),
  ].filter(Boolean)

  // «Who is the manager talking to?» → aux follows the wh-word (normal).
  // «Who restarts the server?»       → the wh-word IS the subject (no aux, no subject).
  const whSubjectQuestion = wh.length > 1 && !AUX.has(wh[1])

  return {
    subject, aux, qAux, continuous, affBe, affVerb, base, ving,
    alternatives, whSubjectQuestion,
    stem,
  }
}

/* ───────────────────────── grading ───────────────────────── */

// {aux} / {verb} / {be} are filled from the row itself, so the note always names the
// exact word that was missing — far more useful than a generic "wrong answer".
const NOTES = {
  empty: 'لم تُكتب إجابة في هذه الخانة.',
  negation_missing: 'الخانة منفية، والجملة هنا مثبتة — ينقصها not / n’t.',
  negation_extra: 'هذه الخانة ليست منفية — أداة النفي زائدة هنا.',
  statement_expected: 'الخانة تحتاج جملةً خبرية تبدأ بالفاعل، لا سؤالًا.',
  q_is_wh: 'هذه خانة سؤال «نعم/لا» — تبدأ بالفعل المساعد «{aux}» لا بأداة استفهام.',
  q_no_aux: 'سؤال «نعم/لا» يبدأ بالفعل المساعد «{aux}».',
  wh_missing: 'السؤال بأداة يبدأ بأداة استفهام (What / Where / When / Who / Why).',
  wh_no_aux: 'بعد أداة الاستفهام يأتي الفعل المساعد «{aux}» ثم الفاعل.',
  wh_inversion: 'الترتيب: أداة الاستفهام ← «{aux}» ← الفاعل ← الفعل.',
  aux_wrong: 'الفعل المساعد المناسب لهذا الزمن والفاعل هو «{aux}».',
  aux_missing: 'ينقص الفعل المساعد «{aux}» قبل not.',
  be_missing: 'الزمن المستمر يحتاج «{be}» قبل الفعل المنتهي بـ ing.',
  be_wrong: 'صيغة verb to be لا تناسب الفاعل هنا — الصواب «{be}».',
  verb_form: 'صيغة الفعل لا تناسب هذا الزمن — الصواب «{verb}».',
  verb_missing: 'الفعل الأساسي ناقص في الجملة.',
  subject: 'الفاعل يختلف عن الفاعل المُعطى في الصف.',
  structure: 'التركيب صحيح — الاختلاف في الكلمات فقط، وهذا مقبول.',
}

function note(code, fill) {
  const t = NOTES[code]
  if (!t) return null
  return t.replace(/\{(aux|verb|be)\}/g, (_, k) => fill?.[k] ?? '—')
}

const verdict = (ok, code, fill) => ({ ok, code, note_ar: note(code, fill) })

/** Find the expected subject, tolerating articles, plural slips and typos. */
function matchSubject(s, from, subject) {
  const want = subject.filter((t) => !ARTICLES.has(t))
  let cur = from
  if (!want.length) return { ok: true, next: cur }
  for (const w of want) {
    let found = -1
    for (let j = cur; j < Math.min(s.length, cur + 3); j++) {
      if (s[j] === w || fuzzyEq(s[j], w)) { found = j; break }
    }
    if (found < 0) return { ok: false, next: cur }
    cur = found + 1
  }
  return { ok: true, next: cur }
}

/** Locate the main verb from `from` onwards; distinguishes "wrong shape" from "absent". */
function findVerb(s, from, expected, sk) {
  for (let j = from; j < s.length; j++) {
    if (verbFormMatches(s[j], expected, sk.alternatives)) return { type: 'ok', at: j }
  }
  for (let j = from; j < s.length; j++) {
    if (sameVerbStem(s[j], sk.stem)) return { type: 'form', at: j }
  }
  return { type: 'none', at: -1 }
}

/**
 * Grade ONE blank.
 * @param {'aff'|'neg'|'q'|'wh'} form  the cell the student had to produce
 * @param {object} forms               the row's four canonical forms
 * @param {string} model               the model answer for this cell
 * @param {string} student             what the student wrote
 * @returns {{ok:boolean, code:string, note_ar:string|null}}
 */
export function gradeWorksheetAnswer({ form, forms, model, student }) {
  const s = tokens(student)
  if (!s.length) return verdict(false, 'empty')

  const sk = buildRowSkeleton(forms)
  if (!sk) {
    // Shouldn't happen for generated worksheets — fall back to a forgiving string compare.
    const ok = normalizeText(student) === normalizeText(model)
    return verdict(ok, ok ? 'exact' : 'verb_form')
  }

  const expectedVerb = form === 'aff'
    ? sk.affVerb                                   // restarts / installed / (continuous) reviewing
    : (sk.continuous ? sk.ving : sk.base)          // after do/does/did → base; after be → V-ing
  const fill = { aux: sk.qAux, be: sk.affBe || sk.aux, verb: expectedVerb }

  const exact = normalizeText(student) === normalizeText(model)

  // 1) sentence TYPE first — «wrote a statement in a question cell» is the headline
  //    error, and reporting it beats a confusing note about the negation.
  if (form === 'wh' && !WH.has(s[0])) return verdict(false, 'wh_missing', fill)
  if (form === 'q') {
    if (WH.has(s[0])) return verdict(false, 'q_is_wh', fill)
    if (!AUX.has(s[0])) return verdict(false, 'q_no_aux', fill)
  }
  if ((form === 'aff' || form === 'neg') && (WH.has(s[0]) || AUX.has(s[0]))) {
    return verdict(false, 'statement_expected', fill)
  }

  // 2) negation
  const hasNot = s.includes('not')
  if (form === 'neg' && !hasNot) return verdict(false, 'negation_missing', fill)
  if (form !== 'neg' && hasNot) return verdict(false, 'negation_extra', fill)

  let i = 0

  if (form === 'wh') {
    i = 1
    if (!sk.whSubjectQuestion) {
      if (!AUX.has(s[i])) {
        // «When he was driving …?» — subject before the auxiliary = no inversion
        const looksLikeSubject = matchSubject(s, i, sk.subject).ok
        return verdict(false, looksLikeSubject ? 'wh_inversion' : 'wh_no_aux', fill)
      }
      if (s[i] !== sk.qAux) return verdict(false, 'aux_wrong', fill)
      i++
    }
  } else if (form === 'q') {
    if (s[0] !== sk.qAux) return verdict(false, 'aux_wrong', fill)
    i = 1
  }

  // subject (skipped for a subject-wh question, where the wh-word IS the subject)
  const needsSubject = !(form === 'wh' && sk.whSubjectQuestion)
  if (needsSubject) {
    const sub = matchSubject(s, i, sk.subject)
    if (!sub.ok) return verdict(false, 'subject', fill)
    i = sub.next
  }

  // affirmative continuous → the be-auxiliary sits between subject and verb
  if (form === 'aff' && sk.continuous) {
    let at = -1
    for (let j = i; j < Math.min(s.length, i + 3); j++) if (s[j] === sk.affBe) { at = j; break }
    if (at < 0) {
      const anyBe = s.slice(i, i + 3).some((t) => AUX_BE.has(t))
      return verdict(false, anyBe ? 'be_wrong' : 'be_missing', fill)
    }
    i = at + 1
  }

  // negative → auxiliary, then "not"
  if (form === 'neg') {
    let at = -1
    for (let j = i; j < Math.min(s.length, i + 3); j++) if (s[j] === sk.aux) { at = j; break }
    if (at < 0) {
      const anyAux = s.slice(i, i + 3).some((t) => AUX.has(t))
      return verdict(false, anyAux ? 'aux_wrong' : 'aux_missing', fill)
    }
    i = at + 1
    const n = s.indexOf('not', i)
    if (n < 0 || n > i + 1) return verdict(false, 'aux_missing', fill)
    i = n + 1
  }

  const v = findVerb(s, i, expectedVerb, sk)
  if (v.type === 'none') return verdict(false, 'verb_missing', fill)
  if (v.type === 'form') return verdict(false, 'verb_form', fill)

  return verdict(true, exact ? 'exact' : 'structure')
}

/**
 * Grade a whole worksheet submission.
 * @param {object} content  targeted_exercises.content (render === 'worksheet')
 * @param {object} answers  { [questionId]: string }
 * @returns {{results:Record<string,object>, correct:number, total:number, score:number}}
 */
export function gradeWorksheet(content, answers = {}) {
  const questions = content?.questions || []
  const tenses = content?.worksheet?.tenses || []
  const rowFor = (qid) => {
    const m = String(qid).match(/^(.+)-(\d+)-(aff|neg|q|wh)$/)
    if (!m) return null
    const t = tenses.find((x) => x.id === m[1])
    return t?.rows?.[Number(m[2])] || null
  }

  const results = {}
  let correct = 0
  for (const q of questions) {
    const row = rowFor(q.id)
    const form = q.form || String(q.id).split('-').pop()
    const res = row?.forms
      ? gradeWorksheetAnswer({ form, forms: row.forms, model: q.correct_answer, student: answers[q.id] })
      : verdict(normalizeText(answers[q.id]) === normalizeText(q.correct_answer), 'exact')
    results[q.id] = res
    if (res.ok) correct++
  }
  const total = questions.length
  return { results, correct, total, score: Math.round((correct / (total || 1)) * 100) }
}

export const __test__ = { tokens, normalizeText, lev, verbFormMatches, buildRowSkeleton }
