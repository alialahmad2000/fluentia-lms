// PROMPT 13 L1 — Phase 0 Discovery + Baseline Analysis
// Queries curriculum tables, computes FKGL/word count/OOV per passage,
// writes the baseline JSON report to PHASE-2-CLEANUP/13-L1-baseline.json
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) env[key.trim()] = val.join('=').trim()
})

const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('missing supabase env'); process.exit(1) }

const admin = createClient(url, key, { auth: { persistSession: false } })

// --- Text analysis helpers ---
// Syllable counter (Flesch-Kincaid requires syllable counts)
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 0
  if (word.length <= 3) return 1
  // Remove silent trailing e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

function splitSentences(text) {
  // Normalize whitespace, split on . ! ? followed by space/end
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function splitWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function fkgl(text) {
  const sentences = splitSentences(text)
  const words = splitWords(text)
  if (!sentences.length || !words.length) return 0
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0)
  const asl = words.length / sentences.length
  const asw = syllables / words.length
  return 0.39 * asl + 11.8 * asw - 15.59
}

function avgSentenceLength(text) {
  const s = splitSentences(text)
  const w = splitWords(text)
  if (!s.length) return 0
  return w.length / s.length
}

// --- Function word allowlist (A1/A2 function-word core, always allowed) ---
const FUNCTION_WORDS = new Set([
  'a','an','the','and','or','but','so','if','when','then','not','no','yes',
  'is','am','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','can','could','should','may','might','must','shall',
  'i','me','my','mine','myself','you','your','yours','yourself','yourselves',
  'he','him','his','himself','she','her','hers','herself','it','its','itself',
  'we','us','our','ours','ourselves','they','them','their','theirs','themselves',
  'this','that','these','those','there','here',
  'in','on','at','to','from','with','by','for','of','about','as','into','onto',
  'up','down','out','off','over','under','through','after','before','between','during',
  'again','also','just','very','too','more','most','much','many','some','any','each','every','all',
  'other','another','such','than','because','while','until','where','why','how','what','who','whom','whose','which',
  'good','bad','new','old','big','small','high','low','long','short',
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'now','today','yesterday','tomorrow','always','never','sometimes','often','usually',
  'something','nothing','anything','someone','anyone','everyone','everything','nobody','somebody',
  'get','got','go','goes','went','gone','make','makes','made','say','says','said',
  'know','knew','known','think','thought','see','saw','seen','come','came','take','took','taken','give','gave','given',
  'put','find','found','want','wanted','use','used','tell','told','work','worked','call','called',
  'try','tried','ask','asked','need','needed','feel','felt','become','became','leave','left','mean','meant','keep','kept','let','begin','began','seem','seemed','help','helped','talk','talked','turn','turned','start','started','show','showed','hear','heard','play','played','run','ran','move','moved','live','lived','believe','believed','hold','held','bring','brought','happen','happened','write','wrote','written','provide','sit','sat','stand','stood','lose','lost','pay','paid','meet','met','include','continue','set','learn','learned','change','changed','lead','led','understand','understood','watch','watched','follow','followed','stop','stopped','create','speak','spoke','spoken','read','spend','spent','grow','grew','grown','open','opened','walk','walked','win','won','offer','remember','remembered','love','loved','consider','appear','appeared','buy','bought','wait','waited','serve','die','died','send','sent','expect','build','built','stay','stayed','fall','fell','cut','reach','reached','kill','killed','remain','suggest','raise','pass','passed','sell','sold','require','report','decide','decided','pull','pulled',
  's','t','re','ve','ll','m','d','nt',
])

function computeOOV(text, allowlist) {
  const words = splitWords(text)
  const oov = []
  for (const w of words) {
    if (!w || /^[0-9]+$/.test(w)) continue
    const bare = w.replace(/'s$/, '').replace(/'$/, '')
    if (!bare) continue
    if (FUNCTION_WORDS.has(bare)) continue
    if (allowlist.has(bare)) continue
    // Try singular (drop trailing 's') and base verb forms
    if (bare.endsWith('s') && allowlist.has(bare.slice(0, -1))) continue
    if (bare.endsWith('es') && allowlist.has(bare.slice(0, -2))) continue
    if (bare.endsWith('ed') && allowlist.has(bare.slice(0, -2))) continue
    if (bare.endsWith('ed') && allowlist.has(bare.slice(0, -1))) continue // e.g. lived -> live
    if (bare.endsWith('ing') && allowlist.has(bare.slice(0, -3))) continue
    if (bare.endsWith('ing') && allowlist.has(bare.slice(0, -3) + 'e')) continue
    if (bare.endsWith('er') && allowlist.has(bare.slice(0, -2))) continue
    if (bare.endsWith('est') && allowlist.has(bare.slice(0, -3))) continue
    if (bare.endsWith('ly') && allowlist.has(bare.slice(0, -2))) continue
    if (bare.endsWith('ies') && allowlist.has(bare.slice(0, -3) + 'y')) continue
    if (bare.endsWith('ied') && allowlist.has(bare.slice(0, -3) + 'y')) continue
    oov.push(bare)
  }
  return oov
}

function extractText(passage_content) {
  if (!passage_content) return ''
  if (typeof passage_content === 'string') return passage_content
  const paragraphs = passage_content.paragraphs || passage_content.content || []
  if (Array.isArray(paragraphs)) {
    return paragraphs
      .map(p => (typeof p === 'string' ? p : (p?.text || p?.content || '')))
      .join('\n\n')
  }
  return JSON.stringify(passage_content)
}

// --- Phase 0 queries ---
console.log('=== L1 PHASE 0 DISCOVERY ===\n')

// 1. Levels
const { data: levels } = await admin
  .from('curriculum_levels')
  .select('id, cefr, level_number')
  .order('level_number')
const L0 = levels.find(l => l.level_number === 0)
const L1 = levels.find(l => l.level_number === 1)
console.log('L0:', L0?.id, L0?.cefr)
console.log('L1:', L1?.id, L1?.cefr)

// 2. L1 units
const { data: units, error: unitsErr } = await admin
  .from('curriculum_units')
  .select('*')
  .eq('level_id', L1.id)
if (unitsErr) { console.error('units err:', unitsErr); process.exit(1) }
if (units?.[0]) console.log('unit columns:', Object.keys(units[0]).join(', '))
// Try to determine unit number field
units.sort((a, b) => (a.unit_number ?? a.order_index ?? a.sort_order ?? 0) - (b.unit_number ?? b.order_index ?? b.sort_order ?? 0))
console.log(`L1 units: ${units.length}`)

// 3. L1 passages
const unitIds = units.map(u => u.id)
const { data: readings } = await admin
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_en, passage_content, passage_word_count')
  .in('unit_id', unitIds)
  .order('unit_id')
  .order('reading_label')
console.log(`L1 passages: ${readings.length}`)

// 4. L1 questions
const readingIds = readings.map(r => r.id)
const { data: questions } = await admin
  .from('curriculum_comprehension_questions')
  .select('id, reading_id, section, question_type, question_en, question_ar, choices, correct_answer, explanation_en, explanation_ar, sort_order')
  .in('reading_id', readingIds)
  .order('reading_id')
  .order('sort_order')
console.log(`L1 questions: ${questions.length}`)

// Per-passage question count
const qByReading = new Map()
for (const q of questions) {
  if (!qByReading.has(q.reading_id)) qByReading.set(q.reading_id, [])
  qByReading.get(q.reading_id).push(q)
}

// 5. L0 + L1 vocabulary — vocab is linked via reading_id, not level_id directly
const { data: allL01Readings, error: l01ReadingsErr } = await admin
  .from('curriculum_readings')
  .select('id, unit_id, curriculum_units!inner(level_id)')
  .in('curriculum_units.level_id', [L0.id, L1.id])
if (l01ReadingsErr) { console.error('readings join err:', l01ReadingsErr); process.exit(1) }
const l01ReadingIds = (allL01Readings || []).map(r => r.id)
console.log(`L0+L1 reading rows (for vocab join): ${l01ReadingIds.length}`)

// Batch the IN clause to avoid PostgREST URL limits
async function fetchVocabBatched(readingIds) {
  const out = []
  for (let i = 0; i < readingIds.length; i += 100) {
    const batch = readingIds.slice(i, i + 100)
    const { data, error } = await admin
      .from('curriculum_vocabulary')
      .select('word')
      .in('reading_id', batch)
    if (error) { console.error('vocab err:', error); process.exit(1) }
    out.push(...(data || []))
  }
  return out
}
const vocab = await fetchVocabBatched(l01ReadingIds)
const allowlist = new Set(vocab.map(v => v.word.toLowerCase().trim()))
console.log(`L0+L1 vocab allowlist: ${allowlist.size}`)

// 6. Student completions baseline
const { count: studentCompCount } = await admin
  .from('student_curriculum_progress')
  .select('*', { count: 'exact', head: true })
  .in('reading_id', readingIds)
  .eq('section_type', 'comprehension')
  .eq('status', 'completed')
console.log(`Student completions on L1 comprehension: ${studentCompCount}`)

// --- Baseline analysis per passage ---
const unitMap = new Map(units.map(u => [u.id, u]))
const baseline = {
  run_at: new Date().toISOString(),
  L0_id: L0.id,
  L1_id: L1.id,
  allowlist_size: allowlist.size,
  student_completions: studentCompCount,
  units: [],
}

console.log('\n=== BASELINE ANALYSIS ===')
console.log('Target: wc 120-200, FKGL 2.0-4.0, avg sent 8-12, 0 OOV')
console.log()

for (const u of units) {
  const unitReadings = readings.filter(r => r.unit_id === u.id)
  const unitReport = {
    unit_id: u.id,
    unit_number: u.unit_number,
    title_en: u.theme_en || u.title_en,
    passages: [],
  }
  for (const r of unitReadings) {
    const text = extractText(r.passage_content)
    const words = splitWords(text)
    const sentences = splitSentences(text)
    const oov = computeOOV(text, allowlist)
    const f = fkgl(text)
    const asl = avgSentenceLength(text)
    const qList = qByReading.get(r.id) || []
    const passTargets =
      words.length >= 120 && words.length <= 200 &&
      f >= 2.0 && f <= 4.0 &&
      asl >= 8 && asl <= 12 &&
      oov.length === 0

    unitReport.passages.push({
      reading_id: r.id,
      reading_label: r.reading_label,
      title_en: r.title_en,
      word_count: words.length,
      stored_word_count: r.passage_word_count,
      sentence_count: sentences.length,
      fkgl: +f.toFixed(2),
      avg_sentence_length: +asl.toFixed(2),
      oov_count: oov.length,
      oov_sample: oov.slice(0, 20),
      question_count: qList.length,
      passes_targets: passTargets,
    })
    console.log(`  U${String(u.unit_number).padStart(2,'0')} ${r.reading_label}  wc=${words.length.toString().padStart(3)}  fkgl=${f.toFixed(2).padStart(5)}  asl=${asl.toFixed(1).padStart(4)}  oov=${oov.length.toString().padStart(3)}  q=${qList.length}  ${passTargets ? 'PASS' : 'FAIL'}`)
  }
  baseline.units.push(unitReport)
}

// Summary
const allPassages = baseline.units.flatMap(u => u.passages)
const passing = allPassages.filter(p => p.passes_targets).length
console.log(`\nTOTAL: ${allPassages.length} passages  |  passing: ${passing}  |  failing: ${allPassages.length - passing}`)

mkdirSync('PHASE-2-CLEANUP', { recursive: true })
writeFileSync('PHASE-2-CLEANUP/13-L1-baseline.json', JSON.stringify(baseline, null, 2))
console.log('\nWrote PHASE-2-CLEANUP/13-L1-baseline.json')

// Also write the raw passage content + questions so the rewriter script has everything in one place
const fullData = {
  L0_id: L0.id,
  L1_id: L1.id,
  allowlist: [...allowlist].sort(),
  units: units.map(u => ({
    id: u.id,
    unit_number: u.unit_number,
    title_en: u.theme_en || u.title_en,
    readings: readings.filter(r => r.unit_id === u.id).map(r => ({
      id: r.id,
      reading_label: r.reading_label,
      title_en: r.title_en,
      passage_content: r.passage_content,
      passage_word_count: r.passage_word_count,
      questions: (qByReading.get(r.id) || []).map(q => ({
        id: q.id,
        section: q.section,
        question_type: q.question_type,
        question_en: q.question_en,
        question_ar: q.question_ar,
        choices: q.choices,
        correct_answer: q.correct_answer,
        explanation_en: q.explanation_en,
        explanation_ar: q.explanation_ar,
        sort_order: q.sort_order,
      })),
    })),
  })),
}
writeFileSync('PHASE-2-CLEANUP/13-L1-fulldata.json', JSON.stringify(fullData, null, 2))
console.log('Wrote PHASE-2-CLEANUP/13-L1-fulldata.json')
