import { admin } from '../../../scripts/lib/supa.mjs'

const { data: lf } = await admin
  .from('audio_telemetry')
  .select('context, row_id, error_code, error_message, browser_ua, network_status, bundle_version, occurred_at, extra')
  .eq('context', 'listening')
  .order('occurred_at', { ascending: false })

console.log('Total listening failures:', lf.length)

const byCode = {}, byBrowser = {}, byBundle = {}, byNet = {}, byRow = {}
for (const r of lf) {
  byCode[r.error_code] = (byCode[r.error_code] || 0) + 1
  byBundle[r.bundle_version || 'null'] = (byBundle[r.bundle_version || 'null'] || 0) + 1
  byNet[r.network_status || 'null'] = (byNet[r.network_status || 'null'] || 0) + 1
  byRow[r.row_id || 'null'] = (byRow[r.row_id || 'null'] || 0) + 1
  const ua = r.browser_ua || ''
  let b = 'other'
  if (/iPhone|iPad/i.test(ua)) b = /CriOS/i.test(ua) ? 'iOS-Chrome' : 'iOS-Safari'
  else if (/Android/i.test(ua)) b = 'Android'
  else if (/Macintosh/i.test(ua)) b = /Chrome/i.test(ua) ? 'Mac-Chrome' : 'Mac-Safari'
  else if (/Windows/i.test(ua)) b = 'Windows'
  byBrowser[b] = (byBrowser[b] || 0) + 1
}
console.log('\nerror_code (0=play() reject, -1=silent watchdog, 1-4=MediaError):', JSON.stringify(byCode, null, 2))
console.log('browser:', JSON.stringify(byBrowser, null, 2))
console.log('network_status:', JSON.stringify(byNet, null, 2))
console.log('bundle_version:', JSON.stringify(byBundle, null, 2))
console.log('distinct rows affected:', Object.keys(byRow).length)

console.log('\nDate range:', lf[lf.length-1]?.occurred_at?.slice(0,16), '->', lf[0]?.occurred_at?.slice(0,16))

console.log('\n=== Sample error messages (most recent 20) ===')
lf.slice(0, 20).forEach(r => {
  console.log(`${r.occurred_at?.slice(0,16)} code=${r.error_code} net=${r.network_status} "${(r.error_message||'').slice(0,70)}"`)
  console.log(`    UA: ${(r.browser_ua||'').slice(0,75)}`)
  if (r.extra) console.log(`    extra: ${JSON.stringify(r.extra).slice(0,120)}`)
})
