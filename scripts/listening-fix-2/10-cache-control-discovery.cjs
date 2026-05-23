// Phase A discovery for the Cache-Control backfill.
//
// Inventory ALL audio files reachable through the Listening path:
//   - 72 curriculum_listening rows × full-mix audio_url
//   - listening_audio table per-segment audio_url (multi-speaker rows)
// For each unique mp3, HEAD it and capture the Cache-Control header.
//
// Output:
//   docs/audits/listening-cache-control-inventory.json — full inventory
//   stdout — summary by Cache-Control value

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('=')
    if (i <= 0) return
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[l.slice(0, i).trim()] = v
  })
  return env
}
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function headUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentLength: res.headers.get('content-length'),
      cacheControl: res.headers.get('cache-control'),
      etag: res.headers.get('etag'),
      cfCache: res.headers.get('cf-cache-status'),
    }
  } catch (e) {
    return { error: e.message }
  }
}

;(async () => {
  // 1. curriculum_listening full-mix audio URLs
  const { data: rows1, error: e1 } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url')
    .not('audio_url', 'is', null)
  if (e1) throw e1
  console.log(`curriculum_listening rows with audio_url: ${rows1.length}`)

  // 2. listening_audio per-segment audio URLs
  const { data: rows2, error: e2 } = await sb
    .from('listening_audio')
    .select('transcript_id, segment_index, audio_url')
    .not('audio_url', 'is', null)
  if (e2) {
    console.log('listening_audio table:', e2.message)
  } else {
    console.log(`listening_audio rows with audio_url: ${rows2.length}`)
  }

  // 3. Unique URLs across both
  const urlSet = new Set()
  for (const r of rows1) urlSet.add(r.audio_url)
  for (const r of (rows2 || [])) urlSet.add(r.audio_url)
  const uniqueUrls = [...urlSet]
  console.log(`Unique listening audio URLs: ${uniqueUrls.length}`)

  // 4. HEAD each URL (parallelism: 6)
  const results = []
  const CONCURRENCY = 6
  let cursor = 0
  async function worker() {
    while (cursor < uniqueUrls.length) {
      const i = cursor++
      const url = uniqueUrls[i]
      const meta = await headUrl(url)
      results.push({ url, ...meta })
      if (results.length % 25 === 0) console.log(`  ...HEAD ${results.length}/${uniqueUrls.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  // 5. Aggregate by cache-control value
  const byCC = {}
  for (const r of results) {
    const k = r.error ? `ERROR:${r.error}` : (r.cacheControl || '<none>')
    byCC[k] = (byCC[k] || 0) + 1
  }

  console.log('\n=== Cache-Control distribution ===')
  for (const k of Object.keys(byCC).sort()) console.log(`  ${k}: ${byCC[k]}`)

  // 6. Write artifact
  const out = {
    summary: {
      curriculum_listening_rows: rows1.length,
      listening_audio_rows: (rows2 || []).length,
      unique_urls: uniqueUrls.length,
      cache_control_distribution: byCC,
    },
    samples: results.slice(0, 5),
    all: results,
  }
  const outDir = path.resolve(__dirname, '../../docs/audits')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'listening-cache-control-inventory.json'), JSON.stringify(out, null, 2))
  console.log(`\nWrote ${path.join(outDir, 'listening-cache-control-inventory.json')}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
