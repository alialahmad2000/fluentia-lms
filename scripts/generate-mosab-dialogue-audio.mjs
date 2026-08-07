// Two-voice audio for مصعب's «محادثات جاهزة» — free, unlimited, $0 (no ElevenLabs).
//
// Each scene gets TWO distinct neural voices: Mosab's own side is always the same
// male voice (so "his" line always sounds like him), and the other speaker has a
// voice chosen per scene — a professor, a barista, a customer. That single choice
// is what turns a transcript into a scene you can rehearse against.
//
// Pipeline per scenario:
//   edge-tts each line in its speaker's voice → re-encode to uniform mono 24k WAV →
//   ffprobe the real duration → concat FILTER with 420 ms of silence between turns
//   (never `-c copy`: mp3 padding drifts) → one scene mp3 + exact per-line start/end.
// Line files are uploaded too, so tapping one line never needs a seek — Safari's
// Range handling on the PWA service worker has bitten this project before.
//
// Run:  node scripts/generate-mosab-dialogue-audio.mjs [--force] [--only <key>]
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import dotenv from 'dotenv'
import { createRequire } from 'node:module'
dotenv.config()
const require = createRequire(import.meta.url)
const { SCENARIOS, A_VOICE } = require('./mosab-dialogues/dialogues.cjs')

const STUDENT_ID = '4fb98807-526d-4675-adb5-eb938b31b948'
const RATE = '-8%'                       // conversational, but clear for an A2 ear
const GAP_S = 0.42                       // silence between turns
const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const TMP = join(tmpdir(), 'mosab-dialogue-audio')   // scratch only; every artifact is uploaded

const argv = process.argv.slice(2)
const FORCE = argv.includes('--force')
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null

const svc = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
const dur = (f) => parseFloat(sh(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim())
const hash8 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8)

async function tts(text, voice, out, attempt = 1) {
  try {
    execFileSync('python3', ['-m', 'edge_tts', '--voice', voice, `--rate=${RATE}`, '--text', text, '--write-media', out],
      { stdio: ['ignore', 'ignore', 'pipe'] })
    if (!existsSync(out) || dur(out) < 0.05) throw new Error('empty clip')
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 700 * attempt)); return tts(text, voice, out, attempt + 1) }
    throw new Error(`edge-tts failed on "${text.slice(0, 40)}…": ${e.message}`)
  }
}

async function upload(path, file, contentType = 'audio/mpeg') {
  const bytes = readFileSync(file)
  const up = await svc.storage.from('curriculum-audio').upload(path, bytes, { contentType, upsert: true })
  if (up.error) throw new Error(`upload ${path}: ${up.error.message}`)
  return svc.storage.from('curriculum-audio').getPublicUrl(path).data.publicUrl
}

async function buildScenario(spec) {
  const { data: scen, error } = await svc
    .from('dialogue_scenarios').select('id, full_audio_url')
    .eq('student_id', STUDENT_ID).eq('scenario_key', spec.key).single()
  if (error) throw new Error(`${spec.key}: ${error.message}`)

  const { data: lines } = await svc
    .from('dialogue_lines').select('id, idx, speaker, text_en, audio_url')
    .eq('scenario_id', scen.id).order('idx')

  if (!FORCE && scen.full_audio_url && lines.every((l) => l.audio_url)) {
    console.log(`  · ${spec.key} — already voiced (use --force to redo)`)
    return
  }

  const dir = `${TMP}/${spec.key}`
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  // silence spacer, generated once per scenario at the exact target format
  const sil = `${dir}/gap.wav`
  sh(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`, '-t', String(GAP_S), sil])

  const wavs = []
  const timing = []
  let cursor = 0
  for (const l of lines) {
    const voice = l.speaker === 'A' ? A_VOICE : spec.bVoice
    const mp3 = `${dir}/${l.idx}.mp3`
    const wav = `${dir}/${l.idx}.wav`
    await tts(l.text_en, voice, mp3)
    // uniform mono 24k CBR — Safari chokes on mixed formats inside one concat
    sh(FFMPEG, ['-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '24000', wav])
    const d = dur(wav)
    if (wavs.length) { wavs.push(sil); cursor += GAP_S }
    wavs.push(wav)
    timing.push({ id: l.id, idx: l.idx, start: cursor, end: cursor + d, mp3 })
    cursor += d
  }

  // scene track — concat FILTER (sample-exact), not `-c copy`
  const full = `${dir}/full.mp3`
  const inputs = wavs.flatMap((w) => ['-i', w])
  const graph = wavs.map((_, i) => `[${i}:a]`).join('') + `concat=n=${wavs.length}:v=0:a=1[out]`
  sh(FFMPEG, ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]',
    '-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', '24000', full])

  const fullUrl = await upload(`dialogues/mosab/${spec.key}/full.mp3`, full)
  const scenTextHash = hash8(lines.map((l) => l.text_en).join('|'))
  const { error: fErr } = await svc.from('dialogue_scenarios')
    .update({ full_audio_url: `${fullUrl}?v=${scenTextHash}` }).eq('id', scen.id)
  if (fErr) throw new Error(`${spec.key} full url: ${fErr.message}`)

  for (const t of timing) {
    const line = lines.find((l) => l.id === t.id)
    const url = await upload(`dialogues/mosab/${spec.key}/${t.idx}.mp3`, t.mp3)
    const { error: uErr } = await svc.from('dialogue_lines').update({
      audio_url: `${url}?v=${hash8(line.text_en)}`,
      start_ms: Math.round(t.start * 1000),
      end_ms: Math.round(t.end * 1000),
    }).eq('id', t.id)
    if (uErr) throw new Error(`${spec.key}[${t.idx}]: ${uErr.message}`)
  }

  console.log(`  ✓ ${spec.key.padEnd(20)} ${lines.length} lines · ${dur(full).toFixed(1)}s scene`)
  rmSync(dir, { recursive: true, force: true })
}

async function main() {
  const list = ONLY ? SCENARIOS.filter((s) => s.key === ONLY) : SCENARIOS
  if (!list.length) throw new Error(`no scenario matching --only ${ONLY}`)
  console.log(`voicing ${list.length} scenario(s) · you = ${A_VOICE} @ ${RATE}`)
  for (const s of list) await buildScenario(s)

  const { count } = await svc.from('dialogue_lines').select('id', { count: 'exact', head: true }).is('audio_url', null)
  console.log(`\ndone. lines still without audio: ${count}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
