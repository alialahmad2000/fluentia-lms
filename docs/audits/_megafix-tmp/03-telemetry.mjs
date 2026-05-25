import { admin } from '../../../scripts/lib/supa.mjs'

// Does the table exist? what columns?
const { data: sample, error: sErr } = await admin.from('audio_telemetry').select('*').limit(1)
if (sErr) { console.log('audio_telemetry table:', sErr.message); }
else console.log('audio_telemetry columns:', sample?.[0] ? Object.keys(sample[0]) : '(empty table)')

const { count } = await admin.from('audio_telemetry').select('*', { count: 'exact', head: true })
console.log('audio_telemetry total rows:', count)

// listening failures specifically
const { data: lf, error: lErr } = await admin
  .from('audio_telemetry')
  .select('context, row_id, error_code, error_message, browser_ua, network_status, created_at')
  .eq('context', 'listening')
  .order('created_at', { ascending: false })
  .limit(40)
if (lErr) console.log('listening query err:', lErr.message)
else {
  console.log(`\nListening failure rows: ${lf.length}`)
  // breakdown by error_code
  const byCode = {}
  for (const r of lf) byCode[r.error_code] = (byCode[r.error_code] || 0) + 1
  console.log('By error_code:', JSON.stringify(byCode))
  // browser breakdown
  const byBrowser = {}
  for (const r of lf) {
    const ua = r.browser_ua || ''
    let b = 'other'
    if (/iPhone|iPad|Mac.*Safari/i.test(ua) && !/CriOS|Chrome/i.test(ua)) b = 'iOS/Safari'
    else if (/CriOS/i.test(ua)) b = 'iOS/Chrome'
    else if (/Chrome/i.test(ua)) b = 'Chrome'
    byBrowser[b] = (byBrowser[b] || 0) + 1
  }
  console.log('By browser:', JSON.stringify(byBrowser))
  console.log('\nRecent 12:')
  lf.slice(0, 12).forEach(r => console.log(`  ${r.created_at?.slice(0,16)} code=${r.error_code} "${(r.error_message||'').slice(0,60)}" ${(r.browser_ua||'').slice(0,40)}`))
}

// also overall context breakdown
const { data: all } = await admin.from('audio_telemetry').select('context')
const byCtx = {}
for (const r of all || []) byCtx[r.context] = (byCtx[r.context] || 0) + 1
console.log('\nAll telemetry by context:', JSON.stringify(byCtx))
