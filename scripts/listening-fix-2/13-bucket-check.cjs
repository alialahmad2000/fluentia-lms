const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const env = {}
fs.readFileSync('/Users/dr.ali/projects/fluentia-lms/.env','utf8').split('\n').forEach(l => {
  const i = l.indexOf('='); if (i<=0) return
  let v = l.slice(i+1).trim()
  if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1)
  v = v.replace(/\\n$/, '')
  env[l.slice(0,i).trim()] = v
})
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
;(async () => {
  // List buckets + bucket settings
  const { data: buckets } = await sb.storage.listBuckets()
  for (const b of buckets) console.log(b.id, b)
  console.log('---')
  // Test signed URL
  const { data: signed } = await sb.storage.from('curriculum-audio').createSignedUrl(
    'listening/L1/2992edc4-d68d-4f16-99d1-ab7b7a2683c3/s0_nadia.mp3', 3600)
  console.log('signed:', signed?.signedUrl)
  if (signed?.signedUrl) {
    const r = await fetch(signed.signedUrl, { method: 'HEAD' })
    console.log('signed HEAD status:', r.status)
    console.log('signed cache-control:', r.headers.get('cache-control'))
  }
})()
