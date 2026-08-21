#!/usr/bin/env node
// Validates and loads «ورقة المذاكرة» content into curriculum_readings.study_sheet.
//
// The validator is the point of this script. Every rule below is a bug that was
// caught by screenshotting the real component, and each one is invisible in the
// markup — Arabic that reads fine in a JSON file paints wrong in an RTL page:
//
//   • an Arabic sentence that ENDS on a Latin word puts its closing «.» on the
//     wrong side (".so" instead of "so.")
//   • «و» glued straight onto a Latin word paints as garbage ("وwhen" → "wheng")
//   • tatweel + Latin ("ـer") breaks shaping the same way
//   • a feminine imperative that src/i18n/gender.js does not cover reaches male
//     students unconverted
//   • a highlight that is not literally in the passage means the "من النص" quote
//     is not actually from the text — the whole premise of the sheet
//
// Usage:
//   node scripts/reading-study-sheets/load.cjs <batch.json>          # validate + write
//   node scripts/reading-study-sheets/load.cjs <batch.json> --dry    # validate only
//
// batch.json: [{ "id": "<reading uuid>", "sheet": { …v1 shape… } }, …]
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO = path.join(__dirname, '..', '..')
const MGMT = path.join(REPO, 'scripts', '_mgmt-query.cjs')

const AR = '؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿'
const HAS_AR = new RegExp(`[${AR}]`)
// Only LETTERS matter: an Arabic letter touching a Latin one breaks Arabic
// shaping («وwhen» paints as «wheng»). Arabic PUNCTUATION beside Latin («if،»)
// is just bidi ordering, which resolves correctly — so it is excluded here.
const AR_PUNCT = '\\u060C\\u061B\\u061F\\u0640\\u066A-\\u066D\\u06D4«»…'
const AR_LETTER = `[${AR}](?<![${AR_PUNCT}])`
const COLLIDE = new RegExp(`(?:${AR_LETTER}|ـ)[A-Za-z]|[A-Za-z](?:${AR_LETTER}|ـ)`)
// A MULTI-word Latin run is wrapped in <bdi> by isolateLatin() with its closing
// punctuation inside, so it renders correctly. A SINGLE trailing Latin word is
// not isolated, so the sentence's final «.» flips to the wrong side.
const LATIN_TAIL = /(?:^|[^A-Za-z])([A-Za-z][A-Za-z'’-]*)[)"'\]]?\s*[.!?]\s*$/

// Feminine imperatives src/i18n/gender.js can convert for male students. Keep in
// sync with FEM_TO_MASC there; anything outside this list must not be used.
const COVERED_FEM = [
  'اكتبي','ابدئي','اختاري','حاولي','أجيبي','راجعي','أكملي','اقرئي','استمعي','شاهدي',
  'حوّلي','صنّفي','رتّبي','طابقي','عبّري','اشرحي','حدّدي','املئي','اربطي','لاحظي',
  'انتبهي','تذكّري','سجّلي','أعيدي','كرّري','ترجمي','استخدمي','فكّري','تخيّلي','لخّصي',
  'قارني','اذكري','اسمعي','اختبري','شاركي','جرّبي','تواصلي','ركّزي','أتقني','تابعي',
  'واصلي','أرسلي','أضيفي','صحّحي','تحدّثي','اطلبي','اعرضي','ناقشي','وضّحي','علّقي',
]
// A feminine 2nd-person form that FEM_TO_MASC does not list reaches male students
// unconverted. genderizeText only rewrites a curated set of imperatives — it does
// NOT cover negatives («لا تضيفي») or subjunctives («أن تبدئي»), so those must be
// rephrased: state rules in the first-person plural («لا نضيف») and address the
// student only with covered imperatives.
// Two distinct shapes, because a blanket "ends in ـي" rule drowns in false
// positives (كل من «التي» و«تأتي» و«أسبوعي» ينتهي بها):
//   • ا/أ/إ-initial → an imperative (اكتبي، أضيفي). Always 2nd person.
//   • ت-initial → ambiguous: «تأتي» (she comes, fine) vs «تضيفي» (you add, a bug).
//     Only the negated/subjunctive contexts are actually 2nd person, so flag it
//     just after «لا» / «أن» / «ألا» / «حتى» / «لن» / «كي» — which is exactly
//     where genderizeText's imperative list cannot reach.
const FEM_IMPERATIVE = new RegExp(`(?:^|[^${AR}])((?:ا|أ|إ)[${AR}]{2,6}ي)(?=$|[^${AR}])`, 'g')
const FEM_2P_CLAUSE = new RegExp(`(?:لا|أن|ألا|حتى|لن|كي)\\s+(ت[${AR}]{2,6}ي)(?=$|[^${AR}])`, 'g')
// ـي words that are not 2nd-person feminine at all: relative pronouns, and
// 3rd-person feminine verbs describing the LANGUAGE («الصفة تأتي بعد الشيء»),
// which read the same for every student. Anything ت-initial outside this list is
// treated as 2nd-person feminine and must be rewritten — that ambiguity is
// exactly where the gender bug hides, so it needs a deliberate decision.
const NOT_A_VERB = [
  'التي', 'الذي', 'اللاتي', 'اللواتي', 'الماضي', 'إنجليزي', 'الإنجليزي', 'عربي', 'العربي',
  'الثاني', 'التالي', 'الباقي',
  'تعني', 'تأتي', 'تربط', 'تصف', 'تحمل', 'تجعل', 'تنقل', 'تحفظ', 'تبدأ', 'تشرح', 'تقود',
  'تدل', 'تعمل', 'تكفي', 'تظهر', 'تسبق', 'تلي', 'تخبر', 'تعطي', 'تبقى', 'تعادل', 'تناقض',
  'تفيد', 'تحدد', 'تشير', 'تحتاج', 'تختلف', 'تعبر', 'تمنح', 'تضيف', 'تحول', 'تكرر',
  'أهلي', 'أسبوعي', 'أسلوبي', 'أساليبي', 'أوّلي', 'إقناعي', 'إبداعي', 'استثنائي', 'ابتدائي', 'أخلاقي', 'أصلي', 'أدبي', 'أمني', 'احتياطي', 'إجمالي', 'اجتماعي', 'إداري', 'افتراضي', 'اختياري', 'إلزامي', 'إضافي', 'ابتدائي', 'انتقالي', 'إعلامي', 'إنتاجي', 'أساسي', 'أولي', 'أجنبي', 'إلكتروني', 'الإلكتروني', 'تغطي', 'تكفي', 'تسمّي', 'تمشي', 'تبني', 'تروي', 'تعطي', 'تلقي', 'تنهي', 'تبقي', 'تقريبي', 'تدريبي', 'تعليمي',
]

// Feminine imperatives that do NOT start with ا/أ/إ/ت, so FEM_SHAPE cannot see
// them, and that FEM_TO_MASC does not convert either. Listed explicitly because
// each one reaches male students in the wrong gender.
const DENY_FEM = [
  'عرّفي', 'عرفي', 'ضعي', 'خذي', 'قولي', 'صفي', 'سمّي', 'دوّني', 'دوني', 'غيّري', 'غيري',
  'حوّليها', 'قسّمي', 'قسمي', 'أعدّي', 'هاتي', 'زوري', 'قودي', 'مرّي', 'عودي', 'كوني',
  'ضيفي', 'نظّمي', 'نظمي', 'جهّزي', 'جهزي', 'اقلبي', 'انقلي',
  'قدّمي', 'قدمي', 'فسّري', 'فسري', 'بيّني', 'بيني', 'طبّقي', 'طبقي', 'حسّني', 'حسني',
  'صمّمي', 'حدّثي', 'حدثي', 'هيّئي', 'اجعلي', 'أجيبيها', 'سجّليها', 'اسألي', 'ابحثي',
  'احفظي', 'اذهبي', 'احسبي', 'أعدّي', 'رقّمي', 'لوّني',
]

const errors = []
const warnings = []

function arChecks(where, s) {
  if (typeof s !== 'string' || !s.trim()) return
  if (!HAS_AR.test(s)) return
  if (COLLIDE.test(s)) {
    const m = s.match(new RegExp(`.{0,14}(?:(?:${AR_LETTER}|ـ)[A-Za-z]|[A-Za-z](?:${AR_LETTER}|ـ)).{0,14}`))
    errors.push(`${where}: Arabic/Latin letters touching — "${m && m[0]}" (add a space)`)
  }
  for (const bad of DENY_FEM) {
    if (new RegExp(`(?:^|[^${AR}])${bad}(?=$|[^${AR}])`).test(s)) {
      errors.push(
        `${where}: «${bad}» is a feminine imperative gender.js cannot convert — ` +
          `male students would read it wrong. Use a covered imperative or the first-person plural.`
      )
    }
  }
  for (const re of [FEM_IMPERATIVE, FEM_2P_CLAUSE]) {
    let m
    re.lastIndex = 0
    while ((m = re.exec(s))) {
      const w = m[1]
      if (COVERED_FEM.includes(w) || NOT_A_VERB.includes(w) || w.startsWith('ال')) continue
      errors.push(
        `${where}: «${w}» is a feminine form gender.js cannot convert — male students would read it wrong. ` +
          `Use the first-person plural («لا نضيف») or a covered imperative.`
      )
    }
  }
}

function validate(entry, passages) {
  const { id, sheet } = entry
  const src = passages[id]
  const at = (k) => `${src ? src.title_en : id} → ${k}`

  if (!src) { errors.push(`${id}: no such published reading awaiting a sheet`); return }
  if (sheet.version !== 1) errors.push(at('version') + ': must be 1')

  const dg = sheet.digest_ar || []
  if (dg.length < 2 || dg.length > 4) errors.push(at('digest_ar') + `: ${dg.length} lines (want 3)`)
  dg.forEach((l, i) => arChecks(at(`digest_ar[${i}]`), l))

  const teach = sheet.teach || []
  if (teach.length < 2 || teach.length > 4) errors.push(at('teach') + `: ${teach.length} patterns (want 3)`)
  // The stored passage marks vocabulary with *asterisks*; quotes never carry them.
  const lowerPassage = (src.passage || '').replace(/\*/g, '').toLowerCase()
  teach.forEach((t, i) => {
    const w = (k) => at(`teach[${i}].${k}`)
    for (const k of ['id', 'title_ar', 'from_text', 'explain_ar', 'watch_out_ar', 'try_ar']) {
      if (!t[k] || !String(t[k]).trim()) errors.push(w(k) + ': missing')
    }
    for (const k of ['explain_ar', 'watch_out_ar', 'try_ar', 'title_ar']) arChecks(w(k), t[k])
    if ((t.examples_en || []).length < 1) errors.push(w('examples_en') + ': need at least 1')
    for (const h of t.highlights || []) {
      if (!String(t.from_text || '').toLowerCase().includes(String(h).toLowerCase())) {
        errors.push(w('highlights') + `: "${h}" is not inside from_text`)
      }
      if (!lowerPassage.includes(String(h).toLowerCase())) {
        errors.push(w('highlights') + `: "${h}" is not in the actual passage`)
      }
    }
    if (String(t.explain_ar || '').length < 120) warnings.push(w('explain_ar') + ': very short for a taught explanation')
  })

  for (const [i, p] of (sheet.phrases || []).entries()) {
    if (!p.en || !p.ar) errors.push(at(`phrases[${i}]`) + ': needs en + ar')
    arChecks(at(`phrases[${i}].ar`), p.ar)
  }
  if ((sheet.phrases || []).length < 4) warnings.push(at('phrases') + ': fewer than 4')

  const check = sheet.check || []
  if (check.length < 3) errors.push(at('check') + `: ${check.length} items (want 4-5)`)
  const seen = new Set()
  check.forEach((c, i) => {
    const w = (k) => at(`check[${i}].${k}`)
    if (!c.id) errors.push(w('id') + ': missing')
    if (seen.has(c.id)) errors.push(w('id') + `: duplicate "${c.id}"`)
    seen.add(c.id)
    arChecks(w('why_ar'), c.why_ar)
    arChecks(w('prompt_ar'), c.prompt_ar)
    if (c.type === 'order') {
      if (!Array.isArray(c.tokens) || !c.tokens.length) errors.push(w('tokens') + ': missing')
      const a = String(c.answer || '').split(/\s+/).slice().sort().join(' ')
      const t = (c.tokens || []).slice().sort().join(' ')
      if (a !== t) errors.push(w('answer') + ': answer words do not match tokens exactly')
    } else if (c.type === 'produce') {
      if (!c.prompt_ar) errors.push(w('prompt_ar') + ': missing')
      if (!c.model_en) errors.push(w('model_en') + ': missing (the student compares against it)')
    } else {
      if (!Array.isArray(c.options) || c.options.length < 3) errors.push(w('options') + ': need 3+')
      if (!(c.options || []).includes(c.answer)) errors.push(w('answer') + ': not one of the options')
      if (!c.stem_en) errors.push(w('stem_en') + ': missing')
      if (!c.why_ar) errors.push(w('why_ar') + ': missing — the check has to teach on the way out')
    }
  })
  if (!check.some((c) => c.type === 'produce')) warnings.push(at('check') + ': no produce item')
}

function sql(q) {
  return execFileSync('node', [MGMT, q], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function main() {
  const file = process.argv[2]
  const dry = process.argv.includes('--dry')
  if (!file) { console.error('usage: load.cjs <batch.json> [--dry]'); process.exit(1) }
  const batch = JSON.parse(fs.readFileSync(file, 'utf8'))

  const ids = batch.map((b) => `'${b.id}'`).join(',')
  const rows = JSON.parse(
    sql(`select json_agg(json_build_object('id', r.id, 'title_en', r.title_en,
           'passage', (select string_agg(p, ' ') from jsonb_array_elements_text(r.passage_content->'paragraphs') p)))
         from curriculum_readings r where r.id in (${ids}) and r.is_published;`)
  )[0].json_agg || []
  const passages = Object.fromEntries(rows.map((r) => [r.id, r]))

  batch.forEach((e) => validate(e, passages))

  for (const w of warnings) console.warn(`  warn  ${w}`)
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL  ${e}`)
    console.error(`\n${errors.length} error(s) — nothing written.`)
    process.exit(1)
  }
  console.log(`validated ${batch.length} sheet(s), ${warnings.length} warning(s)`)
  if (dry) return

  // One statement per row; jsonb literal is dollar-quoted so Arabic and quotes
  // pass through untouched.
  const stmts = batch.map((e, i) => {
    const tag = `$s${i}$`
    return `update curriculum_readings set study_sheet = ${tag}${JSON.stringify(e.sheet)}${tag}::jsonb where id = '${e.id}';`
  })
  sql(stmts.join('\n'))

  // Read back — a successful UPDATE can still have written nothing.
  const check = JSON.parse(
    sql(`select json_agg(json_build_object('id', id, 'teach', jsonb_array_length(study_sheet->'teach'),
         'check', jsonb_array_length(study_sheet->'check')))
         from curriculum_readings where id in (${ids}) and study_sheet is not null;`)
  )[0].json_agg || []
  if (check.length !== batch.length) {
    console.error(`WROTE ${check.length}/${batch.length} — read-back mismatch`)
    process.exit(1)
  }
  console.log(`wrote + verified ${check.length} sheet(s)`)
}

main()
