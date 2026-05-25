import { admin } from '../../../scripts/lib/supa.mjs'
import { writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'

mkdirSync('docs/audits/listening-fix', { recursive: true })

// 1. Pull ALL 72 curriculum_listening rows — NO audio_url filter
const { data: rows, error } = await admin
  .from('curriculum_listening')
  .select('id, unit_id, listening_number, title_ar, title_en, audio_url, audio_type, is_published, transcript')
  .order('unit_id')
if (error) { console.error('FETCH ERR', error.message); process.exit(1) }
console.log(`Fetched ${rows.length} curriculum_listening rows`)

// 2. Also map how many listening_audio segments each transcript_id has
const { data: segs } = await admin.from('listening_audio').select('transcript_id, audio_url')
const segByTranscript = {}
for (const s of segs || []) {
  if (!segByTranscript[s.transcript_id]) segByTranscript[s.transcript_id] = { total: 0, with_url: 0 }
  segByTranscript[s.transcript_id].total++
  if (s.audio_url) segByTranscript[s.transcript_id].with_url++
}

// HEAD probe helper (force IPv4 via curl -4)
function headProbe(url) {
  try {
    const out = execSync(
      `curl -4 -s -I -m 25 -o /dev/null -w '%{http_code}|%{content_type}|%{size_download}|%{header_json}' ${JSON.stringify(url)}`,
      { encoding: 'utf8', timeout: 30000 }
    )
    // header_json may contain content-length; size_download is 0 for HEAD. Parse header_json for content-length.
    const [code, ctype, size, headerJson] = out.split('|')
    let contentLength = null
    try {
      const hj = JSON.parse(headerJson)
      const cl = hj['content-length'] || hj['Content-Length']
      if (cl) contentLength = parseInt(Array.isArray(cl) ? cl[0] : cl, 10)
    } catch {}
    return { status: parseInt(code, 10), content_type: ctype || null, content_length: contentLength }
  } catch (e) {
    return { status: 0, content_type: null, content_length: null, error: String(e.message || e).slice(0, 120) }
  }
}

function categorize(status, ctype) {
  if (status === 200 || status === 206) {
    if (ctype && /audio|mpeg|mp3|octet-stream/i.test(ctype)) return '200_OK'
    return 'wrong_content_type'
  }
  if (status === 404) return '404'
  if (status === 403) return '403'
  if (status >= 500) return '5xx'
  if (status === 0) return 'probe_error'
  return `http_${status}`
}

const perRow = []
let i = 0
for (const r of rows) {
  i++
  const hasUrl = !!(r.audio_url && r.audio_url.trim())
  const isPublic = hasUrl && r.audio_url.includes('/storage/v1/object/public/')
  let probe = null
  let category = 'NEVER_GENERATED'
  if (hasUrl) {
    probe = headProbe(r.audio_url)
    category = categorize(probe.status, probe.content_type)
    process.stdout.write(`[${i}/${rows.length}] ${r.unit_id?.slice(0,8)} #${r.listening_number} -> ${probe.status} ${probe.content_type} ${category}\n`)
  } else {
    process.stdout.write(`[${i}/${rows.length}] ${r.unit_id?.slice(0,8)} #${r.listening_number} -> NEVER_GENERATED (no audio_url)\n`)
  }
  perRow.push({
    id: r.id,
    unit_id: r.unit_id,
    listening_number: r.listening_number,
    title_ar: r.title_ar,
    title_en: r.title_en,
    audio_type: r.audio_type,
    is_published: r.is_published,
    has_transcript: !!(r.transcript && r.transcript.trim()),
    audio_url: r.audio_url || null,
    has_url: hasUrl,
    is_public_url: isPublic,
    segments_in_listening_audio: segByTranscript[r.id]?.total || 0,
    segments_with_url: segByTranscript[r.id]?.with_url || 0,
    probe,
    category,
    decode: null, // filled in step 3 for sampled rows
  })
}

writeFileSync('docs/audits/_megafix-tmp/perrow-raw.json', JSON.stringify(perRow, null, 2))
console.log('Wrote perrow-raw.json — now run 02-decode-sample.mjs')
