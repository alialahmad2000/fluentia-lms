#!/usr/bin/env node
/**
 * Recording Health Scanner
 * Tests every class_recording against the video proxy and classifies results.
 * Run: node scripts/scan-recordings.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function extractFileId(url) {
  if (!url) return null
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/id=([a-zA-Z0-9_-]+)/)
    || url.match(/([a-zA-Z0-9_-]{25,})/)
  return m?.[1] || null
}

function bufferToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function classify(result) {
  if (!result.proxy_ok) return { status: 'UNRESOLVABLE', detail: result.proxy_error || 'Proxy returned error' }
  if (result.is_webm) return { status: 'WEBM_FORMAT', detail: 'WebM/VP9 — iOS incompatible' }
  if (!result.is_mp4 && !result.is_webm) {
    // Check if first bytes look like HTML
    if (result.first_bytes?.startsWith('3c21') || result.first_bytes?.startsWith('3c68')) {
      return { status: 'UNKNOWN_FORMAT', detail: 'Got HTML instead of video — file may not be public' }
    }
    return { status: 'UNKNOWN_FORMAT', detail: `Unknown format: first bytes = ${result.first_bytes?.substring(0, 32)}` }
  }
  if (result.bytes_status !== 200 && result.bytes_status !== 206) {
    return { status: 'NO_RANGE_SUPPORT', detail: `Range request returned ${result.bytes_status}` }
  }
  const ct = result.content_type || ''
  if (!ct.startsWith('video/') && ct !== 'application/octet-stream') {
    return { status: 'WRONG_MIME', detail: `Content-Type: ${ct}` }
  }
  return { status: 'OK', detail: null }
}

async function scanRecording(rec) {
  const fileId = extractFileId(rec.google_drive_url)
  if (!fileId) {
    return {
      recording_id: rec.id,
      status: 'UNRESOLVABLE',
      error_detail: 'No file ID extractable from URL',
      drive_status: null,
      content_type: null,
      is_mp4: false,
      is_webm: false,
      bytes_status: null,
      first_bytes: null,
    }
  }

  const result = {
    recording_id: rec.id,
    drive_status: null,
    content_type: null,
    is_mp4: false,
    is_webm: false,
    bytes_status: null,
    first_bytes: null,
    proxy_ok: false,
    proxy_error: null,
  }

  // Test via our proxy (same path students use)
  try {
    const proxyUrl = `${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const resp = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
        'Range': 'bytes=0-4095',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    result.bytes_status = resp.status
    result.content_type = resp.headers.get('content-type') || ''

    if (resp.ok || resp.status === 206) {
      const buf = await resp.arrayBuffer()
      const hex = bufferToHex(buf.slice(0, 32))
      result.first_bytes = hex

      // MP4: look for 'ftyp' (66747970) typically at bytes 4-7
      result.is_mp4 = hex.includes('66747970')
      // WebM: starts with 1A 45 DF A3
      result.is_webm = hex.startsWith('1a45dfa3')

      result.proxy_ok = true
    } else {
      const text = await resp.text()
      result.proxy_error = `HTTP ${resp.status}: ${text.substring(0, 200)}`
      result.proxy_ok = false
    }
  } catch (e) {
    result.proxy_error = e.message || 'Network error'
    result.proxy_ok = false
  }

  const classification = classify(result)
  return {
    recording_id: result.recording_id,
    checked_at: new Date().toISOString(),
    status: classification.status,
    drive_status: result.drive_status,
    content_type: result.content_type,
    is_mp4: result.is_mp4,
    is_webm: result.is_webm,
    bytes_status: result.bytes_status,
    first_bytes: result.first_bytes,
    error_detail: classification.detail,
  }
}

async function main() {
  console.log('=== Recording Health Scanner ===\n')

  // Fetch all active recordings
  const { data: recordings, error } = await supabase
    .from('class_recordings')
    .select('id, title, google_drive_url, google_drive_file_id, unit_id, group_id, part, is_archive')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch recordings:', error.message)
    process.exit(1)
  }

  console.log(`Found ${recordings.length} recordings to scan\n`)

  // Fetch unit info for the report
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, unit_number, title_ar, title_en')

  const unitMap = new Map((units || []).map(u => [u.id, u]))

  // Fetch group info
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, code')

  const groupMap = new Map((groups || []).map(g => [g.id, g]))

  const results = []
  for (let i = 0; i < recordings.length; i++) {
    const rec = recordings[i]
    const unit = unitMap.get(rec.unit_id)
    const group = groupMap.get(rec.group_id)
    const label = unit
      ? `Unit ${unit.unit_number} Part ${rec.part?.toUpperCase()} (${group?.code || 'no-group'})`
      : (rec.title || rec.id.substring(0, 8))

    process.stdout.write(`[${i + 1}/${recordings.length}] Scanning ${label}... `)
    const result = await scanRecording(rec)
    results.push({ ...result, _label: label, _rec: rec, _unit: unit, _group: group })
    console.log(result.status)
  }

  // Upsert results into recording_health table
  console.log('\nSaving results to recording_health table...')
  const upsertData = results.map(r => ({
    recording_id: r.recording_id,
    checked_at: r.checked_at,
    status: r.status,
    drive_status: r.drive_status,
    content_type: r.content_type,
    is_mp4: r.is_mp4,
    is_webm: r.is_webm,
    bytes_status: r.bytes_status,
    first_bytes: r.first_bytes,
    error_detail: r.error_detail,
  }))

  const { error: upsertErr } = await supabase
    .from('recording_health')
    .upsert(upsertData, { onConflict: 'recording_id' })

  if (upsertErr) {
    console.error('Failed to save results:', upsertErr.message)
  } else {
    console.log('Saved successfully!')
  }

  // Generate report
  const grouped = {
    OK: results.filter(r => r.status === 'OK'),
    NOT_PUBLIC: results.filter(r => r.status === 'NOT_PUBLIC'),
    WEBM_FORMAT: results.filter(r => r.status === 'WEBM_FORMAT'),
    UNRESOLVABLE: results.filter(r => r.status === 'UNRESOLVABLE'),
    UNKNOWN_FORMAT: results.filter(r => r.status === 'UNKNOWN_FORMAT'),
    NO_RANGE_SUPPORT: results.filter(r => r.status === 'NO_RANGE_SUPPORT'),
    WRONG_MIME: results.filter(r => r.status === 'WRONG_MIME'),
  }

  const issues = results.filter(r => r.status !== 'OK')

  let report = `# Recording Health Report\n\n`
  report += `Scanned: ${results.length} recordings\n`
  report += `Date: ${new Date().toISOString()}\n\n`
  report += `- OK: ${grouped.OK.length}\n`
  report += `- NOT_PUBLIC: ${grouped.NOT_PUBLIC.length}\n`
  report += `- WEBM_FORMAT: ${grouped.WEBM_FORMAT.length}\n`
  report += `- UNRESOLVABLE: ${grouped.UNRESOLVABLE.length}\n`
  report += `- UNKNOWN_FORMAT: ${grouped.UNKNOWN_FORMAT.length}\n`
  report += `- NO_RANGE_SUPPORT: ${grouped.NO_RANGE_SUPPORT.length}\n`
  report += `- WRONG_MIME: ${grouped.WRONG_MIME.length}\n\n`

  if (issues.length > 0) {
    report += `## Issues Found\n\n`
    for (const r of issues) {
      const fileId = extractFileId(r._rec.google_drive_url)
      report += `### ${r._label}\n`
      report += `- Status: **${r.status}**\n`
      report += `- Detail: ${r.error_detail || 'N/A'}\n`
      report += `- Content-Type: ${r.content_type || 'N/A'}\n`
      report += `- First bytes: ${r.first_bytes?.substring(0, 32) || 'N/A'}\n`
      if (fileId) report += `- Drive link: https://drive.google.com/file/d/${fileId}/view\n`
      report += '\n'
    }

    report += `## Instructions for Ali\n\n`
    if (grouped.NOT_PUBLIC.length > 0) {
      report += `### Recordings needing public sharing\n`
      report += `Open each link and set sharing to "Anyone with link - Viewer":\n\n`
      for (const r of grouped.NOT_PUBLIC) {
        const fileId = extractFileId(r._rec.google_drive_url)
        report += `- ${r._label}: https://drive.google.com/file/d/${fileId}/view\n`
      }
      report += '\n'
    }
    if (grouped.WEBM_FORMAT.length > 0) {
      report += `### WebM recordings (iOS incompatible)\n`
      report += `These recordings use WebM/VP9 format which iOS Safari cannot play.\n`
      report += `Options: re-record as MP4, use an online converter, or accept iOS limitation.\n\n`
      for (const r of grouped.WEBM_FORMAT) {
        const fileId = extractFileId(r._rec.google_drive_url)
        report += `- ${r._label}: https://drive.google.com/file/d/${fileId}/view\n`
      }
      report += '\n'
    }
    if (grouped.UNRESOLVABLE.length > 0) {
      report += `### Unresolvable recordings\n`
      report += `These recordings could not be accessed. They may be deleted or the URL is invalid.\n\n`
      for (const r of grouped.UNRESOLVABLE) {
        report += `- ${r._label}: ${r.error_detail}\n`
      }
      report += '\n'
    }
  } else {
    report += `## All recordings are healthy!\n`
  }

  writeFileSync('RECORDING_HEALTH_REPORT.md', report, 'utf-8')
  console.log('\nReport saved to RECORDING_HEALTH_REPORT.md')

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Total: ${results.length}`)
  console.log(`OK: ${grouped.OK.length}`)
  console.log(`Issues: ${issues.length}`)
  for (const [status, items] of Object.entries(grouped)) {
    if (status !== 'OK' && items.length > 0) {
      console.log(`  ${status}: ${items.length}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
