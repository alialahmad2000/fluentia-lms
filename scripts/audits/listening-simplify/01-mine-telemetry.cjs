#!/usr/bin/env node
// LISTENING-SIMPLIFY-AND-SELF-HEAL Phase A
// Mine last 48h of public.audio_telemetry for listening failures.
// Group by error_code, browser, bundle_version, row_id. Output a JSON report.

const fs = require('fs')
const path = require('path')

function loadEnv() {
  const env = {}
  try {
    fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
      const idx = line.indexOf('=')
      if (idx <= 0) return
      let v = line.slice(idx + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      v = v.replace(/\\n$/, '')
      env[line.slice(0, idx).trim()] = v
    })
  } catch {}
  return env
}

function inferBrowser(ua) {
  if (!ua) return 'unknown'
  if (/iPhone|iPad/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) return 'iOS Safari'
  if (/iPhone|iPad/.test(ua) && /CriOS/.test(ua)) return 'iOS Chrome'
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'Android Chrome'
  if (/Macintosh.*Safari/.test(ua) && !/Chrome/.test(ua)) return 'macOS Safari'
  if (/Chrome\/(\d+)/.test(ua)) return 'Chrome'
  if (/Firefox/.test(ua)) return 'Firefox'
  return 'other'
}

;(async () => {
  const env = loadEnv()
  const URL = env.VITE_SUPABASE_URL
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL || !KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const { createClient } = require('@supabase/supabase-js')
  const sb = createClient(URL, KEY, { auth: { persistSession: false } })

  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

  const { data, error } = await sb
    .from('audio_telemetry')
    .select('id, occurred_at, profile_id, context, row_id, audio_url, error_code, error_message, browser_ua, network_status, bundle_version, extra, profile:profiles(email, full_name)')
    .eq('context', 'listening')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(2)
  }

  const byErrorCode = {}
  const byBrowser = {}
  const byBundleVersion = {}
  const byRow = {}
  const studentIds = new Set()
  for (const r of data) {
    const code = r.error_code ?? 'null'
    byErrorCode[code] = (byErrorCode[code] || 0) + 1
    const browser = inferBrowser(r.browser_ua)
    byBrowser[browser] = (byBrowser[browser] || 0) + 1
    const bv = r.bundle_version || 'unknown'
    byBundleVersion[bv] = (byBundleVersion[bv] || 0) + 1
    if (r.row_id) byRow[r.row_id] = (byRow[r.row_id] || 0) + 1
    if (r.profile_id) studentIds.add(r.profile_id)
  }

  const report = {
    generated_at: new Date().toISOString(),
    window_hours: 48,
    total_failures: data.length,
    unique_students: studentIds.size,
    by_error_code: byErrorCode,
    by_browser: byBrowser,
    by_bundle_version: byBundleVersion,
    top_failing_rows: Object.entries(byRow).sort((a, b) => b[1] - a[1]).slice(0, 10),
    recent_samples: data.slice(0, 20).map((r) => ({
      occurred_at: r.occurred_at,
      student: r.profile?.full_name || r.profile?.email || (r.profile_id ? r.profile_id.slice(0, 8) : null),
      row_id: r.row_id,
      error_code: r.error_code,
      error_message: r.error_message,
      browser: inferBrowser(r.browser_ua),
      ua: r.browser_ua?.slice(0, 120),
      bundle_version: r.bundle_version,
      network_status: r.network_status,
    })),
  }

  const outDir = path.resolve(__dirname, '../../../docs/audits/listening-simplify')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'telemetry-analysis.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log('Telemetry analysis (last 48h, context=listening):')
  console.log('  Total failures:    ', report.total_failures)
  console.log('  Unique students:   ', report.unique_students)
  console.log('  By error code:     ', JSON.stringify(byErrorCode))
  console.log('  By browser:        ', JSON.stringify(byBrowser))
  console.log('  By bundle version: ', JSON.stringify(byBundleVersion))
  console.log('  Top failing rows:  ', report.top_failing_rows.slice(0, 5))
  console.log('  → wrote', outPath)
})()
