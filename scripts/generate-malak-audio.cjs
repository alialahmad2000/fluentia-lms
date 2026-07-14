// Malak Al-Kendi — audio for her 10 custom marketing units.
// ElevenLabs (Alice), ffmpeg -ac 1 mono (Safari-safe), upsert reading_passage_audio +
// mirror curriculum_readings.passage_audio_url + curriculum_vocabulary.audio_url.
// BUDGET-AWARE + whole-unit atomic: voices units in order (passage + its vocab together)
// until the ElevenLabs char budget runs out, so early units are fully voiced and the rest
// finish trivially after a top-up. Idempotent (skips rows already voiced + reachable).
// Run: node scripts/generate-malak-audio.cjs
const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
require('dotenv').config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const XI_KEY = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY
if (!SUPABASE_URL || !SERVICE_KEY || !XI_KEY) { console.error('Missing URL / SERVICE_ROLE / ELEVENLABS key'); process.exit(1) }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const MALAK = '28a83f30-9474-4869-8f08-f63dc40c767d'
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2', VOICE_NAME = 'Alice', MODEL = 'eleven_multilingual_v2', BUCKET = 'curriculum-audio'
const SAFETY = 250 // leave a margin under the hard limit
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'malak-audio-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function budgetRemaining() {
  const r = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': XI_KEY } })).json()
  return { remaining: r.character_limit - r.character_count, used: r.character_count, limit: r.character_limit }
}
async function elevenTTS(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': XI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!r.ok) throw new Error(`EL ${r.status}: ${(await r.text()).slice(0, 120)}`)
  return Buffer.from(await r.arrayBuffer())
}
async function ttsToMono(text, tag) {
  const raw = path.join(TMP, `${tag}.raw.mp3`), mono = path.join(TMP, `${tag}.mp3`)
  fs.writeFileSync(raw, await elevenTTS(text))
  execFileSync('ffmpeg', ['-y', '-i', raw, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', mono], { stdio: 'ignore' })
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mono]).toString().trim())
  return { buffer: fs.readFileSync(mono), durationMs: Math.round(dur * 1000) }
}
async function upload(spath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(spath, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error('upload: ' + error.message)
  return sb.storage.from(BUCKET).getPublicUrl(spath).data.publicUrl
}
async function reachable(url) { try { return (await fetch(url, { method: 'HEAD' })).ok } catch { return false } }
const passageText = (pc) => (pc?.paragraphs || []).map((p) => (typeof p === 'string' ? p : p.text || p.content || '')).join(' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim()

async function main() {
  const b0 = await budgetRemaining()
  let budget = b0.remaining - SAFETY
  console.log(`ElevenLabs: ${b0.used}/${b0.limit} used · ${b0.remaining} remaining (usable ~${budget})\n`)

  const { data: units } = await sb.from('curriculum_units').select('id, custom_sort, theme_ar').eq('owner_student_id', MALAK).order('custom_sort')
  const rep = { passages: 0, vocab: 0, passSkip: 0, vocabSkip: 0, unitsVoiced: 0, unitsDeferred: [], fail: [] }
  let used = 0

  for (const u of units) {
    const { data: reading } = await sb.from('curriculum_readings').select('id, passage_content, passage_audio_url').eq('unit_id', u.id).order('reading_label').limit(1).maybeSingle()
    if (!reading) { console.log(`U${u.custom_sort}: no reading — skip`); continue }
    const { data: vocab } = await sb.from('curriculum_vocabulary').select('id, word, audio_url').eq('reading_id', reading.id).order('sort_order')
    const txt = passageText(reading.passage_content)

    // estimate the chars this whole unit needs for items NOT already voiced
    const needPassage = !(reading.passage_audio_url && (await reachable(reading.passage_audio_url)))
    let estimate = needPassage ? txt.length : 0
    const vocabToDo = []
    for (const v of vocab || []) { if (!(v.audio_url && (await reachable(v.audio_url)))) { vocabToDo.push(v); estimate += (v.word || '').length } }

    if (estimate === 0) { console.log(`U${u.custom_sort}: already fully voiced — skip`); rep.unitsVoiced++; continue }
    if (used + estimate > budget) { console.log(`U${u.custom_sort}: DEFERRED — needs ~${estimate}, only ~${budget - used} left`); rep.unitsDeferred.push(u.custom_sort); break }

    console.log(`U${u.custom_sort} «${u.theme_ar}» — voicing (~${estimate} chars)`)
    // passage
    if (needPassage) {
      try {
        const { buffer, durationMs } = await ttsToMono(txt, `u${u.custom_sort}-passage`)
        const spath = `reading/malak/${reading.id}/full.mp3`
        const url = await upload(spath, buffer)
        const rpaPayload = { passage_id: reading.id, full_audio_url: url, full_audio_path: spath, full_duration_ms: durationMs, paragraph_audio: [], word_timestamps: [], voice_id: VOICE_ID, generated_at: new Date().toISOString() }
        const { data: ex } = await sb.from('reading_passage_audio').select('passage_id').eq('passage_id', reading.id).maybeSingle()
        if (ex) await sb.from('reading_passage_audio').update(rpaPayload).eq('passage_id', reading.id)
        else await sb.from('reading_passage_audio').insert(rpaPayload)
        await sb.from('curriculum_readings').update({ passage_audio_url: url, audio_duration_seconds: Math.round(durationMs / 1000), audio_generated_at: new Date().toISOString() }).eq('id', reading.id)
        used += txt.length; rep.passages++
        console.log(`   ✅ passage (${(durationMs / 1000).toFixed(1)}s)`); await sleep(350)
      } catch (e) { rep.fail.push(`u${u.custom_sort} passage: ${e.message}`); console.log(`   ❌ passage: ${e.message}`) }
    } else rep.passSkip++
    // vocab
    for (const v of vocabToDo) {
      try {
        const { buffer } = await ttsToMono(v.word, `u${u.custom_sort}-v-${v.id.slice(0, 8)}`)
        const url = await upload(`vocab/malak/${v.id}.mp3`, buffer)
        await sb.from('curriculum_vocabulary').update({ audio_url: url, audio_voice_name: VOICE_NAME, audio_generated_at: new Date().toISOString() }).eq('id', v.id)
        used += (v.word || '').length; rep.vocab++; await sleep(250)
      } catch (e) { rep.fail.push(`u${u.custom_sort} vocab "${v.word}": ${e.message}`); console.log(`   ❌ vocab "${v.word}": ${e.message}`) }
    }
    rep.unitsVoiced++
  }

  console.log(`\n=== REPORT ===`)
  console.log(`units fully voiced: ${rep.unitsVoiced}/10 · deferred (budget): ${rep.unitsDeferred.join(',') || 'none'}`)
  console.log(`passages: +${rep.passages} (skip ${rep.passSkip}) · vocab: +${rep.vocab} (skip ${rep.vocabSkip})`)
  console.log(`chars used this run: ~${used}`)
  if (rep.fail.length) { console.log('FAILURES:'); rep.fail.forEach((f) => console.log('  - ' + f)) }
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {}
  console.log('Done.')
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })
