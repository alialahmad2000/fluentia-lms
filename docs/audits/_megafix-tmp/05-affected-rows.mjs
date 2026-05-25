import { admin } from '../../../scripts/lib/supa.mjs'

const { data: lf } = await admin
  .from('audio_telemetry')
  .select('row_id, error_code, browser_ua')
  .eq('context', 'listening')

const byRow = {}
for (const r of lf) {
  if (!byRow[r.row_id]) byRow[r.row_id] = { count: 0, codes: {} }
  byRow[r.row_id].count++
  byRow[r.row_id].codes[r.error_code] = (byRow[r.row_id].codes[r.error_code] || 0) + 1
}

const ids = Object.keys(byRow).filter(x => x !== 'null')
const { data: rows } = await admin
  .from('curriculum_listening')
  .select('id, unit_id, audio_type, audio_url, title_ar')
  .in('id', ids)

const { data: units } = await admin.from('curriculum_units').select('id, level_id, title_ar, unit_number').in('id', rows.map(r=>r.unit_id))
const unitMap = {}; for (const u of units||[]) unitMap[u.id] = u

console.log('Affected listening rows (sorted by failure count):')
rows.map(r => ({ ...r, fails: byRow[r.id] }))
  .sort((a,b)=>b.fails.count - a.fails.count)
  .forEach(r => {
    const u = unitMap[r.unit_id]
    const lvl = r.audio_url.match(/listening\/(L\d)/)?.[1] || '?'
    console.log(`  ${r.fails.count}x  ${lvl} ${r.audio_type.padEnd(10)} codes=${JSON.stringify(r.fails.codes)}  "${(r.title_ar||'').slice(0,28)}"`)
  })

// How many rows are concatenated combined.mp3 (multi-segment) vs single?
const { data: all } = await admin.from('curriculum_listening').select('audio_url, audio_type, speaker_segments')
let combined = 0, single = 0
const typeCount = {}
for (const r of all) {
  if (/combined\.mp3$/.test(r.audio_url || '')) combined++; else single++
  typeCount[r.audio_type] = (typeCount[r.audio_type]||0)+1
}
console.log(`\nAll 72 rows: combined.mp3=${combined}, other=${single}`)
console.log('audio_type distribution:', JSON.stringify(typeCount))
