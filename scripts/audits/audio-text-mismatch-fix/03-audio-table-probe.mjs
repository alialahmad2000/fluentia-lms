import { admin as sb } from '../../lib/supa.mjs'

// Probe every plausible audio-related table — does any have variant audio
// keyed by interest_bucket / user_id ?

const tables = [
  'personalized_reading_audio',
  'personalized_audio',
  'reading_variant_audio',
  'variant_audio',
  'audio_files',
  'reading_audio_variants',
  'student_audio',
  // also re-test the known tables
  'reading_passage_audio',
  'personalized_readings',
  'curriculum_listening',
]
for (const t of tables) {
  const { data, error } = await sb.from(t).select('*').limit(1)
  if (error) console.log(`  ${t}: ❌ ${error.message}`)
  else {
    const cols = data && data[0] ? Object.keys(data[0]) : []
    console.log(`  ${t}: ✅ ${cols.length} cols${cols.length ? ' [' + cols.join(', ') + ']' : ''}`)
  }
}

// Confirm: does reading_passage_audio.full_audio_url ever reference a non-canonical path?
console.log('\n--- All distinct URL prefixes in reading_passage_audio ---')
const { data: rpa } = await sb
  .from('reading_passage_audio')
  .select('passage_id, full_audio_url')
const prefixes = new Set()
let countContainPassageId = 0
let countMatch = 0
for (const r of rpa || []) {
  if (!r.full_audio_url) continue
  countMatch++
  const m = r.full_audio_url.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//)
  if (m) {
    if (m[1] === r.passage_id) countContainPassageId++
  }
  const pref = r.full_audio_url.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*/i, 'UUID…')
  prefixes.add(pref)
}
console.log(`  total rows: ${countMatch}, URL embeds passage_id: ${countContainPassageId}`)
console.log(`  prefix patterns:`, [...prefixes])
