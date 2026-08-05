// Free listening audio for أنوار's 12 custom «مكتبتي» B1 units — no ElevenLabs ($0).
//
// WHY THIS EXISTS: her B1 course shipped with reading narration, vocab word-audio and
// covers, but the LISTENING audio was never generated. All 12 units had audio_url = NULL,
// so the listening section was impossible to complete — 1 of the 7 slots every unit is
// scored out of was permanently dead, and her unit progress could never pass ~57%.
//
// Her transcripts are two-speaker dialogues stored as audio_type='monologue' with no
// speaker_segments (e.g. "Huda: ... Sara: ..."). This script parses the turns, gives each
// speaker her own free edge-tts neural voice, synthesizes per turn, and concatenates.
//
// TWO TRAPS, BOTH HANDLED — both are documented in CLAUDE.md as having shipped before:
//   1. Speaker labels must NEVER be spoken. "Huda:" is a cue, not dialogue. We strip the
//      leading label from every turn's spoken text (mid-sentence colons and times like
//      "3:45" are preserved — see scripts/audio-v2/lib/strip-speaker-label.cjs).
//   2. Output must be UNIFORM MONO. A single mp3 whose frames alternate mono/stereo plays
//      in Chrome but is SILENT in Safari/WebKit — that bug took 6 attempts to find. Every
//      segment is forced to mono 24k on synthesis and the concat re-encodes to mono 44.1k
//      CBR, then we assert per-frame channel uniformity before upload.
//
// Run: node scripts/generate-anwar-listening-audio.mjs [--force] [--limit N] [--dry]
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { stripSpeakerLabel } = require('./audio-v2/lib/strip-speaker-label.cjs')

const URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const KEY = readFileSync(
  '/private/tmp/claude-501/-Users-dr-ali/282e44eb-aea8-4a34-ada0-d2da223c05a6/scratchpad/svckey',
  'utf8',
).trim()
const ANWAR_LEVEL = 'f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab'
const BUCKET = 'curriculum-audio'
const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const TMP = '/private/tmp/claude-501/-Users-dr-ali/282e44eb-aea8-4a34-ada0-d2da223c05a6/scratchpad/anwar-listening'

// All her recurring characters are female (head librarian Huda, students Sara/Reem/Mona,
// guest author Nora). Distinct warm US/GB female neurals so turns are tellable apart.
// RATE -8%: B1 learner, matches the -10% used for her reading narration.
const VOICES = [
  'en-US-AriaNeural',
  'en-US-JennyNeural',
  'en-GB-SoniaNeural',
  'en-US-MichelleNeural',
]
const NARRATOR = 'en-US-AriaNeural'
const RATE = '-8%'

const argv = process.argv.slice(2)
const FORCE = argv.includes('--force')
const DRY = argv.includes('--dry')
const LIMIT = argv.includes('--limit') ? parseInt(argv[argv.indexOf('--limit') + 1], 10) : Infinity

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
const probeDur = (f) =>
  parseFloat(sh(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim())

// Assert every frame has the same channel count — the Safari-silence guard.
function assertUniformMono(file) {
  const out = sh(FFPROBE, [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=channels',
    '-of', 'default=nw=1:nk=1', '-read_intervals', '%+#2000', file,
  ]).toString().trim()
  const vals = [...new Set(out.split('\n').map((s) => s.trim()).filter(Boolean))]
  if (vals.length !== 1 || vals[0] !== '1') {
    throw new Error(`channel layout not uniform mono: saw [${vals.join(', ')}] in ${file}`)
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res
}

// ── Parse "Name: line" dialogue into ordered turns ─────────────────────────
// Falls back to a single narrator turn when the transcript carries no labels.
function parseTurns(transcript) {
  const text = (transcript || '').replace(/\r/g, '').trim()
  if (!text) return []
  // A label is a short capitalised name at a turn boundary followed by ':'.
  const re = /(^|\s)([A-Z][A-Za-z'’-]{1,20})\s*:\s+/g
  const marks = []
  let m
  while ((m = re.exec(text)) !== null) {
    marks.push({ name: m[2], start: m.index + m[1].length, textStart: m.index + m[0].length })
  }
  if (marks.length < 2) {
    return [{ speaker: 'Narrator', text: stripSpeakerLabel(text) }]
  }
  const turns = []
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length
    const body = text.slice(marks[i].textStart, end).trim()
    if (body) turns.push({ speaker: marks[i].name, text: stripSpeakerLabel(body) })
  }
  // Any prose before the first label is narration.
  const lead = text.slice(0, marks[0].start).trim()
  if (lead) turns.unshift({ speaker: 'Narrator', text: stripSpeakerLabel(lead) })
  return turns
}

function assignVoices(turns) {
  const speakers = [...new Set(turns.map((t) => t.speaker))]
  const map = {}
  let vi = 0
  for (const s of speakers) {
    map[s] = s === 'Narrator' ? NARRATOR : VOICES[vi++ % VOICES.length]
    if (s !== 'Narrator' && map[s] === NARRATOR && speakers.length > 1) {
      map[s] = VOICES[vi++ % VOICES.length]
    }
  }
  return map
}

function tts(text, voice, out) {
  execFileSync(
    'python3',
    ['-m', 'edge_tts', '--voice', voice, `--rate=${RATE}`, '--text', text, '--write-media', out],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  if (!existsSync(out)) throw new Error(`edge-tts produced nothing for voice ${voice}`)
}

async function main() {
  mkdirSync(TMP, { recursive: true })

  // Her units = B1 level, published, custom_sort 1..12, rich vocab (>15 words).
  // The other custom students' units share this level but carry 6–9 vocab words.
  const unitsRes = await api(
    `/rest/v1/curriculum_units?select=id,custom_sort,theme_ar&level_id=eq.${ANWAR_LEVEL}` +
      `&is_published=eq.true&custom_sort=gte.1&custom_sort=lte.12&order=custom_sort`,
  )
  const allUnits = await unitsRes.json()

  const mine = []
  for (const u of allUnits) {
    const r = await api(
      `/rest/v1/curriculum_vocabulary?select=id,curriculum_readings!inner(unit_id)` +
        `&curriculum_readings.unit_id=eq.${u.id}`,
    )
    if ((await r.json()).length > 15) mine.push(u)
  }
  console.log(`أنوار units resolved: ${mine.length} (expect 12)`)

  const listRes = await api(
    `/rest/v1/curriculum_listening?select=id,unit_id,title_ar,transcript,audio_url` +
      `&unit_id=in.(${mine.map((u) => u.id).join(',')})`,
  )
  const rows = await listRes.json()
  const byUnit = new Map(mine.map((u) => [u.id, u]))
  const todo = rows
    .filter((r) => FORCE || !r.audio_url)
    .sort((a, b) => byUnit.get(a.unit_id).custom_sort - byUnit.get(b.unit_id).custom_sort)
    .slice(0, LIMIT)

  console.log(`🎙️  ${todo.length} listening task(s) to voice — FREE edge-tts, rate ${RATE}\n`)

  let ok = 0
  const failures = []

  for (const row of todo) {
    const u = byUnit.get(row.unit_id)
    const tag = `U${String(u.custom_sort).padStart(2, '0')} ${row.title_ar || ''}`.trim()
    try {
      const turns = parseTurns(row.transcript)
      if (!turns.length) throw new Error('empty transcript')
      const vmap = assignVoices(turns)

      // Sanity: a stripped turn must not still begin with its own label.
      for (const t of turns) {
        if (new RegExp(`^${t.speaker}\\s*:`, 'i').test(t.text)) {
          throw new Error(`speaker label survived stripping in a "${t.speaker}" turn`)
        }
      }

      const dir = `${TMP}/${row.id}`
      rmSync(dir, { recursive: true, force: true })
      mkdirSync(dir, { recursive: true })

      const parts = []
      const segments = []
      let cursor = 0
      for (let i = 0; i < turns.length; i++) {
        const raw = `${dir}/${i}.mp3`
        const wav = `${dir}/${i}.wav`
        tts(turns[i].text, vmap[turns[i].speaker], raw)
        // Force mono 24k up front so nothing stereo can enter the concat.
        sh(FFMPEG, ['-y', '-i', raw, '-ac', '1', '-ar', '24000', wav])
        const d = probeDur(wav)
        segments.push({
          speaker: turns[i].speaker,
          text: turns[i].text,
          voice_id: `edge:${vmap[turns[i].speaker]}${RATE}`,
          start_ms: Math.round(cursor * 1000),
          end_ms: Math.round((cursor + d) * 1000),
        })
        cursor += d + 0.35 // natural beat between turns
        parts.push(wav)
      }

      // Gapless concat with a 350ms beat, re-encoded to UNIFORM mono 44.1k CBR.
      const silence = `${dir}/sil.wav`
      sh(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.35', silence])
      const listFile = `${dir}/list.txt`
      const seq = []
      parts.forEach((p, i) => {
        seq.push(`file '${p}'`)
        if (i < parts.length - 1) seq.push(`file '${silence}'`)
      })
      writeFileSync(listFile, seq.join('\n'))

      const outMp3 = `${dir}/combined.mp3`
      sh(FFMPEG, [
        '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k',
        '-map_metadata', '-1', outMp3,
      ])
      assertUniformMono(outMp3)
      const duration = probeDur(outMp3)

      if (DRY) {
        console.log(`  · ${tag} — ${turns.length} turns, ${duration.toFixed(1)}s [dry]`)
        ok++
        continue
      }

      // PUT + x-upsert: POST errors when the object already exists.
      const objectPath = `listening/anwar-${row.id}.mp3`
      await api(`/storage/v1/object/${BUCKET}/${objectPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
        body: readFileSync(outMp3),
      })
      const publicUrl = `${URL}/storage/v1/object/public/${BUCKET}/${objectPath}`

      await api(`/rest/v1/curriculum_listening?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          audio_url: publicUrl,
          audio_duration_seconds: Math.round(duration),
          audio_type: turns.length > 1 ? 'dialogue' : 'monologue',
          speaker_segments: segments,
          audio_generated_at: new Date().toISOString(),
        }),
      })

      console.log(`  ✓ ${tag} — ${turns.length} turns, ${duration.toFixed(1)}s, ${new Set(Object.values(vmap)).size} voice(s)`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${tag} — ${e.message}`)
      failures.push({ tag, error: e.message })
    }
  }

  console.log(`\nDone: ${ok} ok, ${failures.length} failed`)
  if (failures.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
