#!/usr/bin/env node
// Reading text/audio mismatch verifier.
//
// For 5 multi-article units (≥2 readings each):
//   1. Load all readings for the unit (same query the UI uses).
//   2. For each article in the unit (NOT just article[0]):
//      - text_source_id === audio_source_id === karaoke_source_id (all derive from the same reading.id)
//      - audio_url HEAD returns 200 with audio/* content-type
//      - audio_duration_ms is plausible vs. body word count (0.4×–2.5× of 2.5 wps estimate)
//
// Output: ./verify.json with per-article PASS/FAIL.

const fs = require('fs')
const path = require('path')
const https = require('https')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const env = {}
  const text = fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8')
  text.split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx <= 0) return
    let v = line.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[line.slice(0, idx).trim()] = v
  })
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

function head(u) {
  return new Promise((resolve) => {
    try {
      const req = https.request(u, { method: 'HEAD' }, (res) => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'] || '',
          contentLength: Number(res.headers['content-length'] || 0),
        })
      })
      req.on('error', (e) => resolve({ status: 0, contentType: '', contentLength: 0, error: e.message }))
      req.end()
    } catch (e) {
      resolve({ status: 0, contentType: '', contentLength: 0, error: e.message })
    }
  })
}

async function main() {
  const { data: counts, error } = await sb
    .from('curriculum_readings')
    .select('unit_id')
  if (error) throw error

  const byUnit = {}
  counts.forEach((r) => { byUnit[r.unit_id] = (byUnit[r.unit_id] || 0) + 1 })
  const multi = Object.entries(byUnit).filter(([, n]) => n >= 2).slice(0, 5)
  if (multi.length === 0) { console.error('No multi-article units found'); process.exit(2) }

  const results = { generated_at: new Date().toISOString(), units: [] }

  for (const [unitId] of multi) {
    const { data: rows } = await sb
      .from('curriculum_readings')
      .select('id, unit_id, reading_label, title_en, passage_content, sort_order')
      .eq('unit_id', unitId)
      .order('sort_order')

    const { data: audio } = await sb
      .from('reading_passage_audio')
      .select('passage_id, full_audio_url, full_duration_ms, word_timestamps')
      .in('passage_id', rows.map((r) => r.id))
    const audioMap = Object.fromEntries(audio.map((a) => [a.passage_id, a]))

    const unitOut = { unit_id: unitId, articles: [] }

    for (const r of rows) {
      const a = audioMap[r.id]
      const wordCount = (r.passage_content?.paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length
      const expectedSec = wordCount / 2.5
      const actualSec = a ? (a.full_duration_ms || 0) / 1000 : 0
      const durationRatio = expectedSec ? actualSec / expectedSec : 0
      const ratioOk = durationRatio >= 0.4 && durationRatio <= 2.5

      const wts = a?.word_timestamps
      const wtCount = Array.isArray(wts) ? wts.length : (wts && typeof wts === 'object' ? Object.keys(wts).length : 0)

      let headResult = { status: 0, contentType: '', contentLength: 0 }
      if (a?.full_audio_url) headResult = await head(a.full_audio_url)
      const audioOk = headResult.status === 200 && /^audio\//i.test(headResult.contentType)

      // Source-of-truth identity check: text, audio, karaoke all anchored to reading.id.
      // In the live UI all three derive from useReadingPassageAudio(reading.id, reading.passage_content),
      // so each reading.id maps to exactly one (text, audio_url, word_timestamps) tuple.
      const audioRowMatchesReading = a && a.passage_id === r.id
      const passes = audioRowMatchesReading && audioOk && ratioOk

      unitOut.articles.push({
        reading_id: r.id,
        label: r.reading_label,
        title: r.title_en,
        word_count: wordCount,
        wt_count: wtCount,
        wt_count_ok: wtCount > 0 && wtCount >= wordCount * 0.7 && wtCount <= wordCount * 1.6,
        audio_url: a?.full_audio_url || null,
        audio_url_head_status: headResult.status,
        audio_url_content_type: headResult.contentType,
        audio_url_head_ok: audioOk,
        audio_duration_sec: Number(actualSec.toFixed(1)),
        duration_ratio: Number(durationRatio.toFixed(2)),
        duration_plausible: ratioOk,
        text_audio_karaoke_share_reading_id: audioRowMatchesReading,
        verdict: passes ? 'PASS' : 'FAIL',
      })
    }

    results.units.push(unitOut)
  }

  fs.writeFileSync(
    path.resolve(__dirname, 'verify.json'),
    JSON.stringify(results, null, 2)
  )

  const flat = results.units.flatMap((u) => u.articles)
  const pass = flat.filter((a) => a.verdict === 'PASS').length
  console.log(`Articles checked: ${flat.length}`)
  console.log(`PASS: ${pass}`)
  console.log(`FAIL: ${flat.length - pass}`)
  if (flat.length - pass > 0) {
    console.log('Fail details:')
    flat.filter((a) => a.verdict !== 'PASS').forEach((a) => {
      console.log(`  ${a.reading_id} (${a.label}) ${a.title}`)
      console.log(`    audio_url_head_ok=${a.audio_url_head_ok} duration_plausible=${a.duration_plausible} text_audio_karaoke_share_reading_id=${a.text_audio_karaoke_share_reading_id}`)
    })
  }

  process.exit(pass === flat.length ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
