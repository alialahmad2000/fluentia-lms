import 'dotenv/config'
import pg from 'pg'

const { Client } = pg
const db = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
})
await db.connect()
const q = (sql, p=[]) => db.query(sql, p).then(r=>r.rows)

// 1. Coverage per level
console.log('\n=== Coverage per level ===')
const coverage = await q(`
  SELECT cl.level_number,
    count(DISTINCT cli.id) AS transcripts,
    count(DISTINCT la.transcript_id) AS with_audio,
    coalesce(sum(sc.cnt),0) AS total_segments,
    round(coalesce(avg(sc.cnt),0)::numeric,1) AS avg_segs
  FROM curriculum_levels cl
  LEFT JOIN curriculum_units cu ON cu.level_id=cl.id
  LEFT JOIN curriculum_listening cli ON cli.unit_id=cu.id
  LEFT JOIN listening_audio la ON la.transcript_id=cli.id
  LEFT JOIN (SELECT transcript_id, count(*) cnt FROM listening_audio GROUP BY transcript_id) sc ON sc.transcript_id=cli.id
  GROUP BY cl.level_number ORDER BY cl.level_number
`)
console.table(coverage)

// 2. Transcripts with ≤2 segments
const segs = await q('SELECT transcript_id, count(*) AS cnt FROM listening_audio GROUP BY transcript_id')
const thin = segs.filter(r => parseInt(r.cnt) <= 2)
console.log(`\nTranscripts with ≤2 segments: ${thin.length}`)
if (thin.length > 0) console.log('Sample IDs:', thin.slice(0,3).map(r=>r.transcript_id.substring(0,8)))

// 3. Speaker distribution
console.log('\n=== Speaker distribution (top 8) ===')
const spk = await q('SELECT speaker_label, voice_id, count(*) AS segments FROM listening_audio GROUP BY speaker_label, voice_id ORDER BY segments DESC LIMIT 8')
console.table(spk.map(r=>({speaker: r.speaker_label, voice: r.voice_id?.substring(0,12), count: r.segments})))

// 4. Sample transcript — find a dialogue or interview
console.log('\n=== Sample multi-segment transcript ===')
const sample = await q(`
  SELECT cli.id, cli.title_en, cli.audio_type, count(la.id) AS seg_count,
    sum(la.duration_ms) AS total_ms
  FROM curriculum_listening cli
  JOIN listening_audio la ON la.transcript_id=cli.id
  WHERE cli.audio_type IN ('dialogue','interview')
  GROUP BY cli.id, cli.title_en, cli.audio_type
  ORDER BY seg_count DESC LIMIT 3
`)
for (const s of sample) {
  console.log(`\n[${s.audio_type}] ${s.title_en} (${s.id.substring(0,8)})`)
  console.log(`  Segments: ${s.seg_count}, Total: ${(parseInt(s.total_ms)/1000).toFixed(1)}s`)
  const sSegs = await q('SELECT segment_index, speaker_label, duration_ms, char_count FROM listening_audio WHERE transcript_id=$1 ORDER BY segment_index', [s.id])
  sSegs.forEach(seg => console.log(`    seg${seg.segment_index}: ${seg.speaker_label} | ${(seg.duration_ms/1000).toFixed(1)}s | ${seg.char_count}c`))
}

// 5. Word timestamps shape
console.log('\n=== Word timestamps shape ===')
const wts = await q('SELECT transcript_id, segment_index, word_timestamps, char_count FROM listening_audio WHERE word_timestamps IS NOT NULL LIMIT 3')
for (const r of wts) {
  const wt = r.word_timestamps
  const len = Array.isArray(wt) ? wt.length : '?'
  console.log(`Seg ${r.transcript_id.substring(0,8)}/${r.segment_index}: ${len} words, chars=${r.char_count}`)
  if (Array.isArray(wt) && wt.length > 0) {
    console.log('  first:', JSON.stringify(wt[0]))
    console.log('  last:', JSON.stringify(wt[wt.length-1]))
  }
}

// 6. Storage HEAD check (10 random)
console.log('\n=== Storage HEAD check ===')
const urlRows = await q('SELECT audio_url, segment_index, transcript_id FROM listening_audio ORDER BY random() LIMIT 20')
const sampled = urlRows.slice(0, 10)
let pass = 0, fail = 0
for (const u of sampled) {
  try {
    const r = await fetch(u.audio_url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    const ct = r.headers.get('content-type') || ''
    if (r.ok && ct.includes('audio')) { pass++ }
    else { console.log(`  ❌ ${u.transcript_id.substring(0,8)}/${u.segment_index}: ${r.status} ${ct}`) ; fail++ }
  } catch(e) {
    console.log(`  ❌ ${u.transcript_id.substring(0,8)}/${u.segment_index}: ${e.message}`)
    fail++
  }
}
console.log(`Storage check: ${pass}/10 pass, ${fail}/10 fail`)

await db.end()
