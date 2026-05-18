// Voice diversity audit for multi-speaker listening rows.
// Each distinct speaker should have a distinct voice_id.
const fs = require('fs')

const INVENTORY = JSON.parse(fs.readFileSync('docs/audits/listening-qa/inventory.json', 'utf8'))

const MULTI_TYPES = new Set(['dialogue', 'interview', 'conversation'])
const out = { rows_audited: 0, single_voice_collisions: [], voice_id_not_stored: [], ok: [] }

for (const row of INVENTORY) {
  if (!MULTI_TYPES.has(row.audio_type)) continue
  out.rows_audited++

  const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : []
  if (segs.length === 0) {
    out.voice_id_not_stored.push({ id: row.id, title_ar: row.title_ar, reason: 'no segments' })
    continue
  }

  // Map each speaker to its voice_id (verify consistency too)
  const speakerToVoices = {}
  const allVoiceIds = new Set()
  let anyMissingVoiceId = false
  for (const seg of segs) {
    const speaker = seg.speaker || seg.speaker_name || `(unknown-${seg.order})`
    const vid = seg.voice_id
    if (!vid) { anyMissingVoiceId = true; continue }
    allVoiceIds.add(vid)
    if (!speakerToVoices[speaker]) speakerToVoices[speaker] = new Set()
    speakerToVoices[speaker].add(vid)
  }

  if (anyMissingVoiceId) {
    out.voice_id_not_stored.push({ id: row.id, title_ar: row.title_ar, reason: 'some segments missing voice_id' })
    continue
  }

  const distinctSpeakers = Object.keys(speakerToVoices).length
  const distinctVoices = allVoiceIds.size

  // Each speaker should map to exactly one voice — if any speaker has 2+ voices that's inconsistent
  const inconsistentSpeakers = Object.entries(speakerToVoices)
    .filter(([, vids]) => vids.size > 1)
    .map(([sp, vids]) => ({ speaker: sp, voice_ids: [...vids] }))

  const result = {
    id: row.id,
    title_ar: row.title_ar,
    audio_type: row.audio_type,
    distinct_speakers: distinctSpeakers,
    distinct_voices: distinctVoices,
    voice_per_speaker: Object.fromEntries(Object.entries(speakerToVoices).map(([s, v]) => [s, [...v]])),
    inconsistent_speakers: inconsistentSpeakers,
  }

  if (distinctSpeakers >= 2 && distinctVoices < distinctSpeakers) {
    result.verdict = 'SINGLE_VOICE_COLLISION'
    out.single_voice_collisions.push(result)
  } else if (inconsistentSpeakers.length > 0) {
    result.verdict = 'INCONSISTENT_VOICE_PER_SPEAKER'
    out.single_voice_collisions.push(result)
  } else {
    result.verdict = 'OK'
    out.ok.push(result)
  }
}

fs.writeFileSync('docs/audits/listening-qa/voice-diversity.json', JSON.stringify(out, null, 2))
console.log(`Rows audited: ${out.rows_audited}`)
console.log(`OK: ${out.ok.length}`)
console.log(`Single-voice collisions: ${out.single_voice_collisions.length}`)
console.log(`Voice_id not stored: ${out.voice_id_not_stored.length}`)
if (out.single_voice_collisions.length > 0) {
  console.log('\nCollisions:')
  for (const r of out.single_voice_collisions) {
    console.log(`  ${r.id.slice(0, 8)} | ${r.title_ar?.slice(0, 50)} | speakers=${r.distinct_speakers} voices=${r.distinct_voices} verdict=${r.verdict}`)
  }
}
