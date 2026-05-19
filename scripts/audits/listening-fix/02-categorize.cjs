#!/usr/bin/env node
// Categorize every listening row with HEAD + Range tests + content-type + duration sanity.
//   HEALTHY        — HEAD 200, audio/mpeg, range 206, transcript present
//   MISSING_AUDIO  — audio_url null but transcript present
//   BROKEN_URL     — HEAD non-200
//   WRONG_MIME     — HEAD 200 but Content-Type isn't audio/*
//   NO_RANGE       — HEAD 200 but range 0-64K returns 200 (not 206)
//   TRUNCATED      — Content-Length implies file far shorter than stated duration would need
//   INCOMPLETE_DATA — audio_url null AND transcript null

const fs = require('fs')
const path = require('path')
const https = require('https')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() { const env = {}; fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i <= 0) return; let v = l.slice(i+1).trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); v=v.replace(/\\n$/,''); env[l.slice(0,i).trim()]=v }); return env }
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function http(url, opts = {}) {
  return new Promise((resolve) => {
    try {
      const req = https.request(url, { method: opts.method || 'HEAD', headers: opts.headers || {}, timeout: 8000 }, (res) => {
        let buf = Buffer.alloc(0)
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          buf = Buffer.concat(chunks)
          resolve({ status: res.statusCode, headers: res.headers, body: buf })
        })
      })
      req.on('error', (e) => resolve({ status: 0, headers: {}, error: e.message }))
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, headers: {}, error: 'timeout' }) })
      req.end()
    } catch (e) { resolve({ status: 0, headers: {}, error: e.message }) }
  })
}

;(async () => {
  const inv = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../docs/audits/listening-fix/inventory.json'), 'utf8'))
  const rows = inv.rows
  console.log(`Categorizing ${rows.length} listening rows…`)

  const out = []
  let i = 0
  for (const r of rows) {
    i++
    const slot = { id: r.id, title_ar: r.title_ar, title_en: r.title_en, unit_id: r.unit_id, audio_url: r.audio_url }

    if (!r.audio_url && !r.transcript) { slot.category = 'INCOMPLETE_DATA'; out.push(slot); continue }
    if (!r.audio_url) { slot.category = 'MISSING_AUDIO'; out.push(slot); continue }

    const head = await http(r.audio_url, { method: 'HEAD' })
    slot.head_status = head.status
    slot.content_type = head.headers['content-type'] || ''
    slot.content_length = Number(head.headers['content-length'] || 0)
    slot.accept_ranges = head.headers['accept-ranges'] || ''

    if (head.status !== 200) { slot.category = 'BROKEN_URL'; out.push(slot); continue }
    if (!/^audio\//i.test(slot.content_type)) { slot.category = 'WRONG_MIME'; out.push(slot); continue }

    // Range probe
    const rg = await http(r.audio_url, { method: 'GET', headers: { Range: 'bytes=0-65535' } })
    slot.range_status = rg.status
    if (rg.status !== 206 && rg.status !== 200) { slot.category = 'RANGE_ERROR'; out.push(slot); continue }
    if (rg.status === 200 && slot.content_length > 65536) { slot.category = 'NO_RANGE'; out.push(slot); continue }

    // Duration sanity (Content-Length vs expected for stated duration_seconds at 128 kbps)
    const durSec = r.audio_duration_seconds || 0
    const expectedBytes = durSec * 128 * 1024 / 8 // ~16 KB/s
    const ratio = expectedBytes > 0 ? slot.content_length / expectedBytes : 1
    slot.bytes_expected = Math.round(expectedBytes)
    slot.bytes_ratio = Number(ratio.toFixed(2))
    if (ratio > 0.5 && ratio < 1.8) {
      slot.category = 'HEALTHY'
    } else {
      slot.category = 'SIZE_DURATION_MISMATCH'
    }
    out.push(slot)

    if (i % 10 === 0) process.stdout.write(`  ${i}/${rows.length}\n`)
  }

  // Summary
  const byCat = {}
  for (const s of out) byCat[s.category] = (byCat[s.category] || 0) + 1

  fs.writeFileSync(path.resolve(__dirname, '../../../docs/audits/listening-fix/categorized.json'), JSON.stringify({ generated_at: new Date().toISOString(), by_category: byCat, rows: out }, null, 2))
  console.log('\nResults:')
  console.log(JSON.stringify(byCat, null, 2))
  const problems = out.filter(s => s.category !== 'HEALTHY' && s.category !== 'MISSING_AUDIO')
  if (problems.length) {
    console.log(`\nFirst 10 problem rows:`)
    for (const p of problems.slice(0, 10)) {
      console.log(`  ${p.category} ${p.id} status=${p.head_status} ct=${p.content_type} range=${p.range_status} title="${p.title_en}"`)
    }
  }
})().catch(e => { console.error(e); process.exit(1) })
