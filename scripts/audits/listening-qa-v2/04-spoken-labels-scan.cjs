// Scan every listening row's speaker_segments[].text for strippable speaker labels.
// If stripSpeakerLabel changes the text → that segment's audio likely contains a spoken label.

const fs = require('fs')
const path = require('path')
const { stripSpeakerLabel } = require('../../audio-v2/lib/strip-speaker-label.cjs')

// Use the v1 inventory as our source (same DB).
const INV_PATH = fs.existsSync('docs/audits/listening-qa-v2/inventory.json')
  ? 'docs/audits/listening-qa-v2/inventory.json'
  : 'docs/audits/listening-qa/inventory.json'

const data = JSON.parse(fs.readFileSync(INV_PATH, 'utf8'))
const out = {
  total_rows: 0,
  rows_with_segments: 0,
  suspect_rows: [],
  clean_rows: [],
}

for (const row of data) {
  out.total_rows++
  const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : []
  if (segs.length === 0) continue
  out.rows_with_segments++

  const offendingSegs = []
  for (let i = 0; i < segs.length; i++) {
    const orig = segs[i]?.text
    if (!orig || typeof orig !== 'string') continue
    const stripped = stripSpeakerLabel(orig)
    if (stripped !== orig.trim()) {
      offendingSegs.push({
        idx: i,
        speaker: segs[i].speaker,
        before: orig.slice(0, 80),
        after: stripped.slice(0, 80),
      })
    }
  }

  if (offendingSegs.length > 0) {
    out.suspect_rows.push({
      id: row.id,
      title_ar: row.title_ar,
      audio_type: row.audio_type,
      total_segments: segs.length,
      offending_count: offendingSegs.length,
      offending_pct: Math.round((offendingSegs.length / segs.length) * 100),
      samples: offendingSegs.slice(0, 3),
    })
  } else {
    out.clean_rows.push({ id: row.id, title_ar: row.title_ar })
  }
}

fs.mkdirSync('docs/audits/listening-qa-v2', { recursive: true })
fs.writeFileSync('docs/audits/listening-qa-v2/spoken-labels-scan.json', JSON.stringify(out, null, 2))

console.log(`Total rows: ${out.total_rows}`)
console.log(`Rows with segments: ${out.rows_with_segments}`)
console.log(`SUSPECT rows: ${out.suspect_rows.length}`)
console.log(`CLEAN rows: ${out.clean_rows.length}`)
if (out.suspect_rows.length > 0) {
  console.log('\nSuspect rows:')
  for (const r of out.suspect_rows.slice(0, 20)) {
    console.log(`  ${r.id.slice(0, 8)} | ${r.title_ar?.slice(0, 50)} | ${r.offending_count}/${r.total_segments} segs (${r.offending_pct}%)`)
    for (const s of r.samples) {
      console.log(`    seg${s.idx} [${s.speaker}]: "${s.before}" → "${s.after}"`)
    }
  }
}
