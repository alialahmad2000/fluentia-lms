// Cache-Control dry-run on a single Listening audio file.
//
// Approach: download bytes from public URL → re-upload via supabase-js with
// cacheControl:'31536000' + upsert:true. Verify the new HEAD response.
//
// Target: L1 U1 (the file the Playwright repro tests). Once this is verified
// passing, the same logic is applied to the remaining 71 files in Phase D.

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

const TARGET_URL = process.env.TARGET_URL ||
  'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L1/2992edc4-d68d-4f16-99d1-ab7b7a2683c3/s0_nadia.mp3'
const BUCKET = 'curriculum-audio'
const PUBLIC_PREFIX = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`

function urlToObjectPath(url) {
  if (!url.startsWith(PUBLIC_PREFIX)) throw new Error(`URL doesn't match expected prefix: ${url}`)
  return url.slice(PUBLIC_PREFIX.length)
}

async function headInfo(url) {
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
  return {
    status: res.status,
    cacheControl: res.headers.get('cache-control'),
    contentType: res.headers.get('content-type'),
    contentLength: res.headers.get('content-length'),
    etag: res.headers.get('etag'),
    cfCache: res.headers.get('cf-cache-status'),
  }
}

;(async () => {
  const objectPath = urlToObjectPath(TARGET_URL)
  console.log(`Target: ${objectPath}`)
  console.log(`Full URL: ${TARGET_URL}\n`)

  console.log('--- BEFORE ---')
  const before = await headInfo(TARGET_URL)
  console.log(JSON.stringify(before, null, 2))

  // Download the file bytes
  console.log('\n--- DOWNLOAD ---')
  const dl = await fetch(TARGET_URL, { cache: 'no-store' })
  if (!dl.ok) throw new Error(`download failed: ${dl.status}`)
  const buf = Buffer.from(await dl.arrayBuffer())
  console.log(`Downloaded ${buf.length} bytes`)
  const beforeSha = require('crypto').createHash('sha256').update(buf).digest('hex')
  console.log(`SHA256: ${beforeSha}`)

  // Re-upload with cacheControl. supabase-js v2 .update() expects (path, fileBody, options).
  console.log('\n--- RE-UPLOAD with cacheControl: 31536000 ---')
  const { data: upd, error: updErr } = await sb.storage.from(BUCKET).update(objectPath, buf, {
    cacheControl: '31536000',  // seconds → 1 year
    contentType: before.contentType || 'audio/mpeg',
    upsert: true,
  })
  if (updErr) throw new Error(`update failed: ${updErr.message}`)
  console.log('update OK:', JSON.stringify(upd))

  // Wait briefly for CDN to update
  console.log('\nWaiting 3s for CDN purge...')
  await new Promise(r => setTimeout(r, 3000))

  console.log('\n--- AFTER ---')
  const after = await headInfo(TARGET_URL)
  console.log(JSON.stringify(after, null, 2))

  // Verify bytes still identical
  console.log('\n--- BYTE INTEGRITY ---')
  const dl2 = await fetch(TARGET_URL + `?_cb=${Date.now()}`, { cache: 'no-store' })
  const buf2 = Buffer.from(await dl2.arrayBuffer())
  const afterSha = require('crypto').createHash('sha256').update(buf2).digest('hex')
  console.log(`SHA256 after: ${afterSha}`)
  console.log(`identical: ${beforeSha === afterSha}`)

  // Summary
  console.log('\n=== SUMMARY ===')
  console.log(`Cache-Control: '${before.cacheControl}' → '${after.cacheControl}'`)
  if (after.cacheControl && after.cacheControl.includes('31536000')) console.log('✅ Cache-Control updated successfully')
  else console.log('❌ Cache-Control did NOT update — CDN may need more time, OR Supabase silently rejected the setting')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
