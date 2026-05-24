#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-OVERNIGHT Block 5 — ElevenLabs audio generation.
// Generates audio for: (1) lesson briefs without audio_path,
// (2) dialogue turns without ai_audio_path.
// Uploads to Supabase Storage at retention-audio/{briefs|dialogues/<scenario>}/<id>.mp3
// and UPDATEs the row.
//
// Per FINISH-OVERNIGHT §0.1: 10× backoff retry on ElevenLabs network errors,
// then skip+log+continue. Never stops the batch.

const https = require('https')
const fs = require('fs')
const path = require('path')

const ELEVENLABS_KEY = (process.env.ELEVENLABS_API_KEY || '').replace(/[\r\n"]/g, '')
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROD_SR = (process.env.PROD_SR || '').replace(/[\r\n"]/g, '')
const BRANCH_SR = (process.env.BRANCH_SR || '').replace(/[\r\n"]/g, '')

// Per FINISH-OVERNIGHT §0.1: 10× backoff. Tuned for tonight's network conditions
// (ElevenLabs read-timeout has been intermittent — short waits work better than
// long waits since failures cluster).
const BACKOFFS = [500, 1500, 3000, 6000, 12000, 20000, 30000, 45000, 60000, 90000]

const TARGETS = [
  { ref: 'dxpkissdfuioibefozvc', host: 'dxpkissdfuioibefozvc.supabase.co', sr: BRANCH_SR, label: 'branch' },
  { ref: 'nmjexpuycmqcxuxljier', host: 'nmjexpuycmqcxuxljier.supabase.co', sr: PROD_SR, label: 'prod' },
]

// Default narrator voice for briefs (warm female)
const NARRATOR_VOICE = 'EXAVITQu4vr4xnSDxMaL' // Sarah / Alice

let totalCharsConsumed = 0
const HARD_CAP_CHARS = parseInt(process.env.HARD_CAP_CHARS || '750000', 10) // FINISH-100: Growing Business plan, ~1M remaining

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function httpRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const timeout = opts.timeout || 45000
    // FINISH-100 fix: force IPv4 (NAT64 IPv6 path is broken on this network)
    const req = https.request({ ...opts, timeout, family: 4 }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve({ statusCode: res.statusCode, body: buf, headers: res.headers })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(new Error('socket_timeout')) })
    if (body) req.write(body)
    req.end()
  })
}

async function mgmtQuery(ref, sql) {
  const data = JSON.stringify({ query: sql })
  const res = await httpRequest({
    hostname: 'api.supabase.com', path: `/v1/projects/${ref}/database/query`, method: 'POST',
    headers: { 'Authorization': `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  }, data)
  if (res.statusCode >= 400) throw new Error(`mgmt ${res.statusCode}: ${res.body.toString().slice(0,200)}`)
  return JSON.parse(res.body.toString())
}

async function elevenLabsGen(text, voiceId) {
  // Retry with §0.1 backoff
  let lastErr
  for (let attempt = 0; attempt < BACKOFFS.length; attempt++) {
    try {
      const body = JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      })
      const res = await httpRequest({
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 60000,
      }, body)
      if (res.statusCode === 200) {
        totalCharsConsumed += text.length
        return res.body
      }
      lastErr = new Error(`ElevenLabs ${res.statusCode}: ${res.body.toString().slice(0,200)}`)
      if (res.statusCode === 401 || res.statusCode === 403) throw lastErr // no point retrying
      if (res.statusCode === 429) {
        // quota or rate limit
        if (res.body.toString().toLowerCase().includes('quota')) throw new Error('QUOTA_EXHAUSTED')
      }
    } catch (e) {
      lastErr = e
      if (e.message === 'QUOTA_EXHAUSTED') throw e
    }
    const wait = BACKOFFS[attempt]
    console.error(`  retry ${attempt+1}/10 after ${wait}ms — ${lastErr?.message?.slice(0,100)}`)
    await sleep(wait)
  }
  throw lastErr
}

async function storageUpload(host, sr, bucket, key, audioBuf) {
  // Use POST first, fall back to PUT on conflict (we want overwrite to be safe on retry)
  const res = await httpRequest({
    hostname: host, path: `/storage/v1/object/${bucket}/${key}`, method: 'POST',
    headers: { 'Authorization': `Bearer ${sr}`, 'apikey': sr, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true', 'Content-Length': audioBuf.length },
  }, audioBuf)
  if (res.statusCode >= 400 && res.statusCode !== 409) {
    throw new Error(`storage ${res.statusCode}: ${res.body.toString().slice(0,200)}`)
  }
  return `${bucket}/${key}` // path relative to storage root
}

async function objectExists(host, sr, bucket, key) {
  // HEAD via storage REST
  const res = await httpRequest({
    hostname: host, path: `/storage/v1/object/info/public/${bucket}/${key}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${sr}`, 'apikey': sr },
  })
  return res.statusCode === 200
}

function publicUrl(host, bucket, key) {
  return `https://${host}/storage/v1/object/public/${bucket}/${key}`
}

async function generateForTarget(target) {
  console.log(`\n===== ${target.label} (${target.ref}) =====`)

  // Track skipped files for log
  const skipped = []

  // 1. Briefs without audio (priority 1)
  console.log('Loading briefs without audio...')
  const briefs = await mgmtQuery(target.ref,
    `SELECT b.id, b.body_ar FROM retention_lesson_briefs b WHERE b.audio_path IS NULL ORDER BY b.id LIMIT 200`
  )
  console.log(`  ${briefs.length} briefs to generate`)

  let briefSuccess = 0
  for (let i = 0; i < briefs.length; i++) {
    if (totalCharsConsumed > HARD_CAP_CHARS) {
      console.log(`  HARD CAP reached (${totalCharsConsumed}/${HARD_CAP_CHARS}); stopping briefs`)
      break
    }
    const b = briefs[i]
    const key = `briefs/${b.id}.mp3`
    try {
      const exists = await objectExists(target.host, target.sr, 'retention-audio', key)
      if (exists) {
        // Just update DB
        await mgmtQuery(target.ref, `UPDATE retention_lesson_briefs SET audio_path = '${publicUrl(target.host, 'retention-audio', key)}' WHERE id = '${b.id}'`)
        briefSuccess++
        continue
      }
      const audio = await elevenLabsGen(b.body_ar, NARRATOR_VOICE)
      await storageUpload(target.host, target.sr, 'retention-audio', key, audio)
      const url = publicUrl(target.host, 'retention-audio', key)
      await mgmtQuery(target.ref, `UPDATE retention_lesson_briefs SET audio_path = '${url}' WHERE id = '${b.id}'`)
      briefSuccess++
      if (briefSuccess % 10 === 0) console.log(`  briefs progress: ${briefSuccess}/${briefs.length} (chars: ${totalCharsConsumed})`)
    } catch (e) {
      console.error(`  SKIP brief ${b.id}: ${e.message?.slice(0,150)}`)
      skipped.push({ kind: 'brief', id: b.id, error: e.message?.slice(0,200) })
      if (e.message === 'QUOTA_EXHAUSTED') { console.error('  QUOTA HIT — stopping audio gen'); break }
    }
  }
  console.log(`  briefs done: ${briefSuccess}/${briefs.length}`)

  // 2. Dialogue turns without audio (priority 2)
  console.log('\nLoading dialogue turns without audio...')
  const turns = await mgmtQuery(target.ref,
    `SELECT t.id, t.scenario_id, t.ai_text_en, p.voice_id
     FROM retention_dialogue_turns t
     JOIN retention_scenarios s ON s.id = t.scenario_id
     JOIN retention_personas p ON p.id = s.persona_id
     WHERE t.ai_audio_path IS NULL
     ORDER BY s.target_level, t.scenario_id, t.turn_number
     LIMIT 700`
  )
  console.log(`  ${turns.length} turns to generate`)

  let turnSuccess = 0
  for (let i = 0; i < turns.length; i++) {
    if (totalCharsConsumed > HARD_CAP_CHARS) {
      console.log(`  HARD CAP reached (${totalCharsConsumed}); stopping turns`)
      break
    }
    const t = turns[i]
    const voice = t.voice_id || NARRATOR_VOICE
    const key = `dialogues/${t.scenario_id}/${t.id}.mp3`
    try {
      const exists = await objectExists(target.host, target.sr, 'retention-audio', key)
      if (exists) {
        await mgmtQuery(target.ref, `UPDATE retention_dialogue_turns SET ai_audio_path = '${publicUrl(target.host, 'retention-audio', key)}' WHERE id = '${t.id}'`)
        turnSuccess++
        continue
      }
      const audio = await elevenLabsGen(t.ai_text_en, voice)
      await storageUpload(target.host, target.sr, 'retention-audio', key, audio)
      const url = publicUrl(target.host, 'retention-audio', key)
      await mgmtQuery(target.ref, `UPDATE retention_dialogue_turns SET ai_audio_path = '${url}' WHERE id = '${t.id}'`)
      turnSuccess++
      if (turnSuccess % 20 === 0) console.log(`  turns progress: ${turnSuccess}/${turns.length} (chars: ${totalCharsConsumed})`)
    } catch (e) {
      console.error(`  SKIP turn ${t.id}: ${e.message?.slice(0,150)}`)
      skipped.push({ kind: 'turn', id: t.id, scenario_id: t.scenario_id, error: e.message?.slice(0,200) })
      if (e.message === 'QUOTA_EXHAUSTED') { console.error('  QUOTA HIT — stopping audio gen'); break }
    }
  }
  console.log(`  turns done: ${turnSuccess}/${turns.length}`)

  // Write skip log
  if (skipped.length > 0) {
    const logPath = `docs/retention/skipped-audio-${target.label}.json`
    fs.writeFileSync(logPath, JSON.stringify(skipped, null, 2))
    console.log(`  ${skipped.length} skipped — see ${logPath}`)
  }

  // Final counts
  const f = await mgmtQuery(target.ref,
    `SELECT (SELECT count(*) FROM retention_lesson_briefs WHERE audio_path IS NOT NULL) AS briefs_with_audio,
            (SELECT count(*) FROM retention_dialogue_turns WHERE ai_audio_path IS NOT NULL) AS turns_with_audio,
            (SELECT count(*) FROM retention_lesson_briefs) AS briefs_total,
            (SELECT count(*) FROM retention_dialogue_turns) AS turns_total`
  )
  console.log(`  final state ${target.label}:`, f[0])
}

;(async () => {
  if (!ELEVENLABS_KEY || !MGMT_TOKEN || !PROD_SR || !BRANCH_SR) {
    console.error('Missing env: ELEVENLABS_API_KEY, SUPABASE_ACCESS_TOKEN, PROD_SR, BRANCH_SR')
    process.exit(1)
  }
  // FINISH-100: prod only (audio is what students hear; branch parity isn't worth the cost)
  // To also run branch, set RUN_BRANCH=1
  await generateForTarget(TARGETS[1]) // prod
  if (process.env.RUN_BRANCH === '1') await generateForTarget(TARGETS[0])
  console.log(`\n=== TOTAL ELEVENLABS CHARS CONSUMED: ${totalCharsConsumed} ===`)
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
