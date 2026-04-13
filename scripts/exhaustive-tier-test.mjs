#!/usr/bin/env node
/**
 * Exhaustive Tier Test — tests every recording × every tier × every UA
 * Run: node scripts/exhaustive-tier-test.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/121.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'

function extractFileId(url) {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/([a-zA-Z0-9_-]{25,})/)
  return m?.[1] || null
}

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function probeVideoEndpoint(url, ua) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': ua, 'Range': 'bytes=0-65535' },
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const ct = resp.headers.get('content-type') || ''
    const buf = await resp.arrayBuffer()
    const hex = bufToHex(buf.slice(0, 16))

    const isVideo = hex.includes('66747970') || hex.startsWith('1a45dfa3')
    const isHtml = hex.startsWith('3c21') || hex.startsWith('3c68')
    return {
      works: (resp.status === 200 || resp.status === 206) && isVideo && !isHtml,
      status: resp.status, contentType: ct, isVideo, isHtml, isWebM: hex.startsWith('1a45dfa3'),
      firstBytes: hex.substring(0, 32), size: buf.byteLength,
    }
  } catch (e) {
    return { works: false, error: e.message }
  }
}

async function probeIframe(url, ua) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const resp = await fetch(url, {
      method: 'GET', headers: { 'User-Agent': ua }, redirect: 'follow', signal: controller.signal,
    })
    clearTimeout(timeout)

    const html = await resp.text()
    const hasPlayer = html.includes('video') || html.includes('VideoPlayer') || html.includes('player') || html.includes('drive_embed')
    const isBlocked = html.includes('denied') || html.includes('not found') || html.includes('Request access') || resp.status === 404 || resp.status === 403

    return {
      works: resp.status === 200 && hasPlayer && !isBlocked,
      status: resp.status, hasPlayer, isBlocked,
    }
  } catch (e) {
    return { works: false, error: e.message }
  }
}

async function probeHead(url, ua) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const resp = await fetch(url, {
      method: 'HEAD', headers: { 'User-Agent': ua }, redirect: 'manual', signal: controller.signal,
    })
    clearTimeout(timeout)
    return { works: resp.status === 200 || resp.status === 302, status: resp.status }
  } catch (e) {
    return { works: false, error: e.message }
  }
}

async function testTier(fileId, tier, ua) {
  switch (tier) {
    case 1: // Premium proxy
      return await probeVideoEndpoint(`${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}`, ua)
    case 2: // Drive /preview
      return await probeIframe(`https://drive.google.com/file/d/${fileId}/preview`, ua)
    case 3: // Drive /embed
      return await probeIframe(`https://drive.google.com/embed/${fileId}`, ua)
    case 4: // Direct HTML5
      return await probeVideoEndpoint(`https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`, ua)
    case 5: // Docs viewer
      return await probeIframe(`https://docs.google.com/viewer?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}&embedded=true`, ua)
    case 6: // Direct link
      return await probeHead(`https://drive.google.com/file/d/${fileId}/view`, ua)
    default:
      return { works: false, error: 'unknown tier' }
  }
}

async function main() {
  console.log('=== Exhaustive Tier Test ===\n')
  const startTime = Date.now()

  const { data: recordings, error } = await supabase
    .from('class_recordings')
    .select('id, title, google_drive_url, google_drive_file_id, unit_id, part, is_archive')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }

  // Get unit info for labels
  const { data: units } = await supabase.from('curriculum_units').select('id, unit_number, title_ar')
  const unitMap = new Map((units || []).map(u => [u.id, u]))
  const { data: groups } = await supabase.from('groups').select('id, code')
  const groupMap = new Map((groups || []).map(g => [g.id, g]))

  console.log(`Found ${recordings.length} recordings. Testing 6 tiers × 3 UAs = ${recordings.length * 18} probes\n`)

  const allResults = []
  const perRecording = {} // id → { ios: [working tiers], android: [...], desktop: [...] }
  const UAs = [['ios', IOS_UA], ['android', ANDROID_UA], ['desktop', DESKTOP_UA]]

  for (let ri = 0; ri < recordings.length; ri++) {
    const rec = recordings[ri]
    const fileId = extractFileId(rec.google_drive_url) || rec.google_drive_file_id
    const unit = unitMap.get(rec.unit_id)
    const label = unit ? `Unit ${unit.unit_number} Part ${rec.part?.toUpperCase()}` : (rec.title || rec.id.substring(0, 8))

    if (!fileId) {
      console.log(`[${ri + 1}/${recordings.length}] ${label} — NO FILE ID, skipping`)
      perRecording[rec.id] = { label, fileId: null, ios: [], android: [], desktop: [] }
      continue
    }

    perRecording[rec.id] = { label, fileId, ios: [], android: [], desktop: [] }
    process.stdout.write(`[${ri + 1}/${recordings.length}] ${label} `)

    for (const tier of [1, 2, 3, 4, 5, 6]) {
      for (const [uaName, ua] of UAs) {
        const result = await testTier(fileId, tier, ua)
        allResults.push({
          recording_id: rec.id, label, fileId, tier, ua: uaName,
          ...result,
        })
        if (result.works) {
          perRecording[rec.id][uaName].push(tier)
        }
        process.stdout.write(result.works ? '.' : 'x')
      }
    }
    const iosW = perRecording[rec.id].ios
    const androidW = perRecording[rec.id].android
    const desktopW = perRecording[rec.id].desktop
    console.log(` ios=[${iosW}] android=[${androidW}] desktop=[${desktopW}]`)
  }

  // Save raw JSON
  writeFileSync('TIER_TEST_MATRIX.json', JSON.stringify(allResults, null, 2))

  // Build per-recording tier results for DB storage
  const tierResultsForDB = []
  for (const [id, data] of Object.entries(perRecording)) {
    tierResultsForDB.push({
      id,
      tier_test_results: { ios: data.ios, android: data.android, desktop: data.desktop },
      last_tier_test: new Date().toISOString(),
      playable: data.ios.length > 0 || data.android.length > 0 || data.desktop.length > 0,
    })
  }

  // Summary stats
  const tierStats = {}
  for (let t = 1; t <= 6; t++) {
    const total = allResults.filter(r => r.tier === t).length
    const pass = allResults.filter(r => r.tier === t && r.works).length
    tierStats[t] = { total, pass, pct: total > 0 ? Math.round(pass / total * 100) : 0 }
  }

  const fullOk = Object.values(perRecording).filter(r => r.ios.length > 0 && r.android.length > 0 && r.desktop.length > 0).length
  const iosOnly = Object.values(perRecording).filter(r => r.ios.length > 0).length
  const androidOnly = Object.values(perRecording).filter(r => r.android.length > 0).length
  const desktopOnly = Object.values(perRecording).filter(r => r.desktop.length > 0).length
  const criticalFails = Object.entries(perRecording).filter(([_, r]) => r.ios.length === 0 && r.android.length === 0 && r.desktop.length === 0)
  const webmFiles = allResults.filter(r => r.tier === 1 && r.isWebM)

  // Generate markdown report
  let md = '# Exhaustive Tier Test Matrix\n\n'
  md += `Tested: ${recordings.length} recordings × 6 tiers × 3 UAs = ${allResults.length} probes\n`
  md += `Date: ${new Date().toISOString()}\n`
  md += `Duration: ${Math.round((Date.now() - startTime) / 1000)}s\n\n`

  md += '## Tier Success Rates\n\n'
  md += '| Tier | Description | Success | Total | Rate |\n'
  md += '|------|-------------|---------|-------|------|\n'
  const tierNames = { 1: 'Premium Proxy', 2: 'Drive /preview', 3: 'Drive /embed', 4: 'Direct HTML5', 5: 'Docs Viewer', 6: 'Direct Link' }
  for (let t = 1; t <= 6; t++) {
    md += `| ${t} | ${tierNames[t]} | ${tierStats[t].pass} | ${tierStats[t].total} | ${tierStats[t].pct}% |\n`
  }

  md += '\n## Per-Recording Matrix (iOS)\n\n'
  md += '| Recording | T1 | T2 | T3 | T4 | T5 | T6 | Working Tiers |\n'
  md += '|-----------|----|----|----|----|----|----|---------------|\n'
  for (const [id, data] of Object.entries(perRecording)) {
    const iosResults = allResults.filter(r => r.recording_id === id && r.ua === 'ios')
    const cells = [1, 2, 3, 4, 5, 6].map(t => {
      const r = iosResults.find(x => x.tier === t)
      return r?.works ? 'OK' : 'FAIL'
    })
    md += `| ${data.label} | ${cells.join(' | ')} | [${data.ios.join(',')}] |\n`
  }

  md += '\n## Coverage Summary\n\n'
  md += `- Total recordings: ${recordings.length}\n`
  md += `- Fully healthy (all devices have working tier): ${fullOk}\n`
  md += `- iOS playable: ${iosOnly}/${recordings.length}\n`
  md += `- Android playable: ${androidOnly}/${recordings.length}\n`
  md += `- Desktop playable: ${desktopOnly}/${recordings.length}\n`
  md += `- Critical failures (NO tier works): ${criticalFails.length}\n`
  if (webmFiles.length > 0) md += `- WebM files detected: ${webmFiles.length}\n`

  if (criticalFails.length > 0) {
    md += '\n## Critical Failures (all tiers failed)\n\n'
    for (const [id, data] of criticalFails) {
      md += `- **${data.label}** (fileId: ${data.fileId})\n`
      md += `  - Drive link: https://drive.google.com/file/d/${data.fileId}/view\n`
    }
  }

  md += '\n## Actions for Ali\n\n'
  const notPublic = Object.entries(perRecording).filter(([_, r]) => r.ios.length === 0 && r.android.length === 0 && r.desktop.length === 0 && r.fileId)
  if (notPublic.length > 0) {
    md += '### Recordings that need re-sharing or re-upload\n'
    for (const [_, data] of notPublic) {
      md += `- ${data.label}: https://drive.google.com/file/d/${data.fileId}/view\n`
    }
  }
  if (criticalFails.length === 0 && notPublic.length === 0) {
    md += 'No manual action needed — all recordings have at least one working tier.\n'
  }

  writeFileSync('TIER_TEST_MATRIX.md', md)
  console.log('\nReport saved to TIER_TEST_MATRIX.md')

  // Print summary
  console.log('\n=== SUMMARY ===')
  console.log(`Total: ${recordings.length} recordings, ${allResults.length} probes`)
  console.log(`Tier success rates: ${Object.entries(tierStats).map(([t, s]) => `T${t}:${s.pct}%`).join(' ')}`)
  console.log(`Fully healthy: ${fullOk}/${recordings.length}`)
  console.log(`iOS playable: ${iosOnly}, Android: ${androidOnly}, Desktop: ${desktopOnly}`)
  console.log(`Critical failures: ${criticalFails.length}`)

  // Return data for next phase
  return { perRecording, tierStats, tierResultsForDB, criticalFails }
}

main().then(data => {
  console.log('\n=== TIER RESULTS FOR DB ===')
  console.log(JSON.stringify(data.tierResultsForDB.map(r => ({
    id: r.id.substring(0, 8), playable: r.playable,
    ios: r.tier_test_results.ios, android: r.tier_test_results.android, desktop: r.tier_test_results.desktop,
  })), null, 2))
}).catch(e => { console.error(e); process.exit(1) })
