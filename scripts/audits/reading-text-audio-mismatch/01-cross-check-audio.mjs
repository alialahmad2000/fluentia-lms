import { admin as sb } from '../../lib/supa.mjs'

// Check if curriculum_readings.passage_audio_url matches reading_passage_audio.full_audio_url
// And check for any mismatches where the audio file might be wrong
const { data: rows } = await sb
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_en, passage_content, passage_audio_url, audio_duration_seconds')
  .order('unit_id, sort_order')

console.log('Total readings:', rows.length)

// Build map of audio rows
const { data: audioRows } = await sb
  .from('reading_passage_audio')
  .select('passage_id, full_audio_url, full_duration_ms, word_timestamps, paragraph_audio')

const audioMap = {}
for (const a of audioRows) audioMap[a.passage_id] = a

let urlMismatch = 0
let missing = 0
let durationOff = 0
let wtMismatch = 0
let perfect = 0
const mismatches = []

for (const r of rows) {
  const a = audioMap[r.id]
  if (!a) { missing++; continue }
  
  // URL match?
  const urlsMatch = r.passage_audio_url === a.full_audio_url
  if (!urlsMatch && r.passage_audio_url) {
    urlMismatch++
    mismatches.push({ type: 'URL', id: r.id, title: r.title_en, reading_url: r.passage_audio_url, audio_table_url: a.full_audio_url })
  }
  
  // Duration match between rows (within 5%)
  const readingSec = r.audio_duration_seconds || 0
  const audioSec = (a.full_duration_ms || 0) / 1000
  if (Math.abs(readingSec - audioSec) > Math.max(2, readingSec * 0.05)) {
    durationOff++
  }
  
  // word_timestamps count vs passage word count
  const words = (r.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean)
  const wtCount = Array.isArray(a.word_timestamps) ? a.word_timestamps.length : (a.word_timestamps && typeof a.word_timestamps === 'object' ? Object.keys(a.word_timestamps).length : 0)
  const ratio = wtCount / Math.max(1, words.length)
  if (ratio < 0.7 || ratio > 1.5) {
    wtMismatch++
    mismatches.push({ type: 'WT_COUNT', id: r.id, title: r.title_en, words: words.length, wtCount, ratio: ratio.toFixed(2) })
  }
  
  if (urlsMatch && ratio >= 0.7 && ratio <= 1.5) perfect++
}

console.log('Perfect rows:', perfect)
console.log('Missing audio row:', missing)
console.log('Audio URL mismatch (reading.passage_audio_url != audio.full_audio_url):', urlMismatch)
console.log('Duration off (between rows):', durationOff)
console.log('Word_timestamps count off vs passage_content:', wtMismatch)

if (mismatches.length > 0) {
  console.log('\n=== First 20 mismatches ===')
  console.log(JSON.stringify(mismatches.slice(0, 20), null, 2))
}

// Spot-check: for the test unit, fetch both rows + their audio
console.log('\n=== Test unit audit (00ca3625) ===')
const testRows = rows.filter(r => r.unit_id === '00ca3625-46ee-4e38-95da-2255f522aff8')
for (const r of testRows) {
  const a = audioMap[r.id]
  console.log(`Article ${r.reading_label}: id=${r.id} title="${r.title_en}"`)
  console.log(`  reading.passage_audio_url: ${r.passage_audio_url?.slice(-40)}`)
  console.log(`  audio.full_audio_url:      ${a?.full_audio_url?.slice(-40)}`)
  console.log(`  match: ${r.passage_audio_url === a?.full_audio_url}`)
}
