import 'dotenv/config'
import { query, closeDb } from '../audio-generator/lib/db.mjs'

const r = await query('SELECT passage_id, full_audio_url, full_duration_ms, word_timestamps FROM reading_passage_audio LIMIT 1')
const rr = r[0]
const rWt = rr.word_timestamps
console.log('Reading sample:')
console.log('  audio_url:', rr.full_audio_url?.slice(-60))
console.log('  word_timestamps length:', rWt?.length)
console.log('  first 3 entries:', JSON.stringify(rWt?.slice(0,3)))
console.log('  last entry:', JSON.stringify(rWt?.[rWt.length-1]))

const l = await query('SELECT transcript_id, segment_index, audio_url, duration_ms, word_timestamps FROM listening_audio LIMIT 3')
console.log('\nListening samples:')
l.forEach((row, i) => {
  const wt = row.word_timestamps
  console.log('  seg', i, 'words=' + wt?.length, 'duration=' + row.duration_ms + 'ms')
  console.log('    first word:', JSON.stringify(wt?.[0]))
  console.log('    last word:', JSON.stringify(wt?.[wt?.length-1]))
})

const rCount = await query('SELECT count(*) AS c FROM reading_passage_audio')
const lCount = await query('SELECT count(*) AS c FROM listening_audio WHERE word_timestamps IS NOT NULL AND jsonb_array_length(word_timestamps) > 0')
console.log('\nReading rows:', rCount[0].c)
console.log('Listening rows with timestamps:', lCount[0].c)

await closeDb()
