// For every canonical reading, compare:
//   * the first ~10 words of the DISPLAYED text (passage_content.paragraphs[0])
//   * the first ~10 words of the SPOKEN audio (word_timestamps[0..9])
// If they're a different opening, the audio is from an old version of the text.

import { admin as sb } from '../../lib/supa.mjs'
import { writeFileSync } from 'node:fs'

const { data: rs } = await sb
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_en, passage_content, passage_word_count, sort_order')
  .order('unit_id, sort_order')

const { data: audio } = await sb
  .from('reading_passage_audio')
  .select('passage_id, full_audio_url, full_duration_ms, word_timestamps')

const audioMap = Object.fromEntries(audio.map(a => [a.passage_id, a]))

function firstWordsFromTimestamps(wts, n = 8) {
  if (!wts) return null
  let arr
  if (Array.isArray(wts)) arr = wts
  else if (wts.all_words && Array.isArray(wts.all_words)) arr = wts.all_words
  else if (typeof wts === 'object') {
    // numeric-keyed object (legacy shape)
    arr = []
    for (let i = 0; i < 30; i++) {
      if (wts[String(i)]) arr.push(wts[String(i)])
      else if (wts[i]) arr.push(wts[i])
    }
  }
  if (!arr || arr.length === 0) return null
  return arr.slice(0, n).map(w => (w?.word || w?.text || w?.w || '').replace(/[^a-zA-Z؀-ۿ']/g, '')).filter(Boolean).join(' ')
}

function firstWordsFromText(passage_content, n = 8) {
  const p1 = passage_content?.paragraphs?.[0] || ''
  return p1.split(/\s+/).filter(Boolean).slice(0, n).map(w => w.replace(/[^a-zA-Z؀-ۿ']/g, '')).filter(Boolean).join(' ')
}

const out = []
let drifted = 0
let clean = 0
let noAudio = 0
let noTimestamps = 0
let noText = 0

for (const r of rs) {
  const a = audioMap[r.id]
  if (!a) { noAudio++; continue }

  const spokenOpening = firstWordsFromTimestamps(a.word_timestamps)
  const displayedOpening = firstWordsFromText(r.passage_content)

  if (!spokenOpening) {
    noTimestamps++
    out.push({ reading_id: r.id, status: 'NO_TIMESTAMPS', spoken: null, displayed: displayedOpening })
    continue
  }
  if (!displayedOpening) {
    noText++
    out.push({ reading_id: r.id, status: 'NO_TEXT', spoken: spokenOpening, displayed: null })
    continue
  }

  // Compare first 4 distinct words case-insensitively
  const s = spokenOpening.toLowerCase().split(' ').filter(Boolean).slice(0, 4).join(' ')
  const d = displayedOpening.toLowerCase().split(' ').filter(Boolean).slice(0, 4).join(' ')
  const same = s === d

  const row = {
    reading_id: r.id,
    unit_id: r.unit_id,
    reading_label: r.reading_label,
    title_en: r.title_en,
    sort_order: r.sort_order,
    passage_word_count: r.passage_word_count,
    spoken_opening: spokenOpening,
    displayed_opening: displayedOpening,
    same_opening: same,
    wt_count: Array.isArray(a.word_timestamps) ? a.word_timestamps.length : Object.keys(a.word_timestamps || {}).length,
    audio_duration_sec: (a.full_duration_ms || 0) / 1000,
  }

  if (same) clean++
  else { drifted++; row.status = 'DRIFTED' }
  out.push(row)
}

console.log(`Total readings: ${rs.length}`)
console.log(`  CLEAN (audio opening == text opening): ${clean}`)
console.log(`  DRIFTED (audio opening ≠ text opening): ${drifted}`)
console.log(`  NO AUDIO row: ${noAudio}`)
console.log(`  NO timestamps in audio row: ${noTimestamps}`)
console.log(`  NO text paragraph in reading row: ${noText}`)

console.log(`\nFirst 5 DRIFTED examples:`)
for (const r of out.filter(x => x.status === 'DRIFTED').slice(0, 5)) {
  console.log(`\n  reading_id=${r.reading_id} unit=${r.unit_id.slice(0,8)}… label=${r.reading_label}`)
  console.log(`    title: "${r.title_en}"`)
  console.log(`    DISPLAYED text starts: "${r.displayed_opening}"`)
  console.log(`    SPOKEN  audio starts:  "${r.spoken_opening}"`)
}

writeFileSync(
  'docs/audits/audio-text-mismatch-fix/text-vs-audio-drift.json',
  JSON.stringify({
    generated_at: new Date().toISOString(),
    summary: { total: rs.length, clean, drifted, noAudio, noTimestamps, noText },
    drifted_rows: out.filter(x => x.status === 'DRIFTED'),
    clean_rows: out.filter(x => x.same_opening).map(r => ({ reading_id: r.reading_id })),
  }, null, 2)
)
console.log('\n✓ saved docs/audits/audio-text-mismatch-fix/text-vs-audio-drift.json')
