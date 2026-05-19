import { admin as sb } from '../../lib/supa.mjs'
import { readFileSync } from 'node:fs'

const drift = JSON.parse(readFileSync('docs/audits/audio-text-mismatch-fix/text-vs-audio-drift.json', 'utf8'))
const noTsIds = []

// Re-derive the no-ts list since the drift JSON only stored drifted_rows
const { data: rs } = await sb
  .from('curriculum_readings')
  .select('id, reading_label, title_en, passage_content, passage_word_count, sort_order, unit_id')

const { data: audio } = await sb.from('reading_passage_audio').select('passage_id, full_audio_url, full_duration_ms, word_timestamps')
const audioMap = Object.fromEntries(audio.map(a => [a.passage_id, a]))

for (const r of rs) {
  const a = audioMap[r.id]
  if (!a) continue
  const wts = a.word_timestamps
  const cnt = Array.isArray(wts) ? wts.length : (wts && typeof wts === 'object' ? Object.keys(wts).length : 0)
  if (cnt < 5) {
    noTsIds.push({
      reading_id: r.id, label: r.reading_label, title: r.title_en,
      passage_word_count: r.passage_word_count,
      audio_duration_ms: a.full_duration_ms,
      wt_count: cnt,
    })
  }
}

console.log(`Rows with <5 word_timestamps: ${noTsIds.length}`)
for (const r of noTsIds) {
  const expectedSec = r.passage_word_count / 2.5
  const actualSec = r.audio_duration_ms / 1000
  const ratio = actualSec / expectedSec
  console.log(`  ${r.reading_id} L=${r.label} wc=${r.passage_word_count} dur=${actualSec.toFixed(1)}s (expected ${expectedSec.toFixed(1)}s, ratio=${ratio.toFixed(2)}) wt=${r.wt_count} title="${r.title}"`)
}
