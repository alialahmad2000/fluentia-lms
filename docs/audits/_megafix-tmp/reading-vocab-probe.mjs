import { admin } from '../../../scripts/lib/supa.mjs'

function k(o) { return o ? Object.keys(o) : [] }

// 1. curriculum_vocabulary columns
const { data: cvSample } = await admin.from('curriculum_vocabulary').select('*').limit(1)
console.log('=== curriculum_vocabulary columns ===')
console.log(k(cvSample?.[0]).join(', '))
console.log('sample row:', JSON.stringify(cvSample?.[0], null, 2))

// audio_url coverage overall
const { count: totalVocab } = await admin.from('curriculum_vocabulary').select('id', { count: 'exact', head: true })
const { count: withAudio } = await admin.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).not('audio_url', 'is', null)
console.log(`\ncurriculum_vocabulary total=${totalVocab} withAudio=${withAudio} (${(100*withAudio/totalVocab).toFixed(1)}%)`)

// 2. curriculum_readings columns
const { data: crSample } = await admin.from('curriculum_readings').select('*').limit(1)
console.log('\n=== curriculum_readings columns ===')
console.log(k(crSample?.[0]).join(', '))

// 3. Find a Level 1 unit with a reading article of >=8 paragraphs
// levels: level_number 1 -> get its id
const { data: levels } = await admin.from('curriculum_levels').select('id, level_number, name_en').order('level_number')
console.log('\n=== levels ===', JSON.stringify(levels))
const l1 = levels.find(l => l.level_number === 1)
const { data: l1units } = await admin.from('curriculum_units').select('id, unit_number, theme_en').eq('level_id', l1.id).order('unit_number')
console.log(`L1 (id=${l1.id}) has ${l1units.length} units`)

// search readings in L1 units for >=8 paragraphs
let ref = null
for (const u of l1units) {
  const { data: rds } = await admin.from('curriculum_readings').select('id, unit_id, title_en, reading_label, passage_content, passage_word_count').eq('unit_id', u.id)
  for (const r of (rds||[])) {
    const paras = r.passage_content?.paragraphs || []
    if (paras.length >= 8) { ref = { ...r, unit_number: u.unit_number, theme: u.theme_en }; break }
  }
  if (ref) break
}
if (!ref) {
  // fallback: largest paragraph count in L1
  let best = null
  for (const u of l1units) {
    const { data: rds } = await admin.from('curriculum_readings').select('id, unit_id, title_en, reading_label, passage_content, passage_word_count').eq('unit_id', u.id)
    for (const r of (rds||[])) {
      const n = (r.passage_content?.paragraphs || []).length
      if (!best || n > best._n) best = { ...r, _n: n, unit_number: u.unit_number, theme: u.theme_en }
    }
  }
  ref = best
  console.log('\nNo L1 reading with >=8 paragraphs; using largest:', ref?._n, 'paragraphs')
}
console.log('\n=== Reference article ===')
console.log(`unit ${ref.unit_number} "${ref.theme}" | reading ${ref.id} "${ref.title_en}" label=${ref.reading_label} | paragraphs=${(ref.passage_content?.paragraphs||[]).length} | word_count=${ref.passage_word_count}`)

// 4. Tokenize the English body
const paras = ref.passage_content?.paragraphs || []
const fullText = paras.join('\n\n')
// strip *vocab* markers and punctuation
const cleaned = fullText.replace(/\*/g, ' ')
const tokens = (cleaned.toLowerCase().match(/[a-z][a-z'-]*[a-z]|[a-z]/g) || [])
const distinct = [...new Set(tokens)]
console.log(`\nTotal tokens=${tokens.length} | distinct=${distinct.length}`)

// 5. For each distinct token, check curriculum_vocabulary case-insensitive + has audio_url
// Batch query: fetch all vocab rows matching any of these words
let covered = 0, coveredWithAudio = 0
const coveredWords = [], uncoveredWords = []
// chunk the ilike via in() on lowercased word — but word may be stored mixed-case; use in with both? Use a fetch of all words then map.
// Efficient: query curriculum_vocabulary where lower(word) in distinct. Supabase has no lower() in filter easily; fetch matching via .in on word (exact) won't catch case. So fetch all distinct via individual? Too many. Instead pull all vocab words once into a map.
const { data: allVocab } = await admin.from('curriculum_vocabulary').select('word, audio_url')
const vocabMap = new Map()
for (const v of (allVocab||[])) {
  const w = (v.word||'').toLowerCase().trim()
  // keep one with audio if any
  const existing = vocabMap.get(w)
  if (!existing || (!existing.audio_url && v.audio_url)) vocabMap.set(w, { word: w, audio_url: v.audio_url })
}
console.log(`vocab distinct words in table: ${vocabMap.size}`)
for (const t of distinct) {
  const hit = vocabMap.get(t)
  if (hit) {
    covered++
    if (hit.audio_url) { coveredWithAudio++; coveredWords.push(t) }
    else uncoveredWords.push(t+'(no-audio)')
  } else {
    uncoveredWords.push(t)
  }
}
console.log(`\n=== Coverage for reference article ===`)
console.log(`distinct tokens: ${distinct.length}`)
console.log(`covered by curriculum_vocabulary (any): ${covered} (${(100*covered/distinct.length).toFixed(1)}%)`)
console.log(`covered WITH clean audio_url: ${coveredWithAudio} (${(100*coveredWithAudio/distinct.length).toFixed(1)}%)`)
console.log(`uncovered (queue burden): ${distinct.length - coveredWithAudio}`)
console.log(`\nsample uncovered (first 40):`, uncoveredWords.slice(0,40).join(', '))

// check vocab_word_audio table existence
const { error: vwaErr } = await admin.from('vocab_word_audio').select('*').limit(1)
console.log(`\nvocab_word_audio table exists: ${!vwaErr} ${vwaErr ? '('+vwaErr.message+')' : ''}`)
