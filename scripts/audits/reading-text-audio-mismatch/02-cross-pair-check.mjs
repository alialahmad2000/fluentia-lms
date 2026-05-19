import { admin as sb } from '../../lib/supa.mjs'

// For each unit with 2+ articles, check if Article A's audio_duration_ms is closer to
// Article B's text length than to Article A's text length.

const { data: rows } = await sb
  .from('curriculum_readings')
  .select('id, unit_id, reading_label, title_en, passage_content, sort_order')
  .order('unit_id, sort_order')

const { data: audioRows } = await sb
  .from('reading_passage_audio')
  .select('passage_id, full_audio_url, full_duration_ms')
const audioMap = Object.fromEntries(audioRows.map(a => [a.passage_id, a]))

const byUnit = {}
for (const r of rows) {
  if (!byUnit[r.unit_id]) byUnit[r.unit_id] = []
  byUnit[r.unit_id].push(r)
}

const suspect = []
let checked = 0
let cleanPairs = 0

for (const [unit_id, articles] of Object.entries(byUnit)) {
  if (articles.length < 2) continue
  
  for (const r of articles) {
    const a = audioMap[r.id]
    if (!a) continue
    const myWords = (r.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length
    const myExpectedSec = myWords / 2.5  // typical TTS rate
    const actualSec = (a.full_duration_ms || 0) / 1000
    const myRatio = actualSec / Math.max(1, myExpectedSec)
    
    // Compare to other articles in same unit
    let bestMatchOtherId = null
    let bestMatchOtherRatio = null
    let bestMatchOtherDelta = Infinity
    for (const other of articles) {
      if (other.id === r.id) continue
      const otherWords = (other.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length
      const otherExpectedSec = otherWords / 2.5
      const otherRatio = actualSec / Math.max(1, otherExpectedSec)
      const delta = Math.abs(1 - otherRatio)
      if (delta < bestMatchOtherDelta) {
        bestMatchOtherDelta = delta
        bestMatchOtherId = other.id
        bestMatchOtherRatio = otherRatio
      }
    }
    
    const myDelta = Math.abs(1 - myRatio)
    // If my audio matches another article's text length WAY better than my own
    if (myDelta > 0.20 && bestMatchOtherDelta < 0.10) {
      suspect.push({
        unit_id, my_id: r.id, my_label: r.reading_label, my_title: r.title_en,
        my_words: myWords, audio_sec: actualSec.toFixed(1),
        my_ratio: myRatio.toFixed(2), other_match_ratio: bestMatchOtherRatio.toFixed(2),
        likely_swapped_with: bestMatchOtherId,
      })
    } else {
      cleanPairs++
    }
    checked++
  }
}

console.log('Articles checked:', checked)
console.log('Clean pairs:', cleanPairs)
console.log('Suspect rows (audio matches OTHER article better):', suspect.length)
if (suspect.length > 0) {
  console.log('\n=== Suspect rows ===')
  console.log(JSON.stringify(suspect.slice(0, 20), null, 2))
}
