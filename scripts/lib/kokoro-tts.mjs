// Free local TTS for the project — Kokoro-82M (Apache-2.0) via kokoro-js.
// Runs 100% on-device (CPU), no API key, no cost, unlimited. Replaces ElevenLabs
// for batch voice generation (reading passages, vocab, etc.).
//   Setup (once): npm i kokoro-js
//   Voices: bf_emma/bf_isabella/bf_alice/bf_lily (British F), af_heart/af_bella/... (American F), bm_*/am_* (male)
// synthMono(text, voice) → { buffer: mono 44.1k mp3, durationMs } (Safari-safe -ac 1)
import { KokoroTTS } from 'kokoro-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

let _tts = null
export async function getKokoro() {
  if (!_tts) {
    _tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })
  }
  return _tts
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kokoro-'))

export async function synthMono(text, voice = 'bf_emma', tag = 'clip') {
  const tts = await getKokoro()
  const audio = await tts.generate(text, { voice })
  const wav = path.join(TMP, `${tag}.wav`)
  const mp3 = path.join(TMP, `${tag}.mp3`)
  await audio.save(wav)
  execFileSync('ffmpeg', ['-y', '-i', wav, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', mp3], { stdio: 'ignore' })
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim())
  const buffer = fs.readFileSync(mp3)
  try { fs.rmSync(wav, { force: true }); fs.rmSync(mp3, { force: true }) } catch {}
  return { buffer, durationMs: Math.round(dur * 1000) }
}

export async function listVoices() {
  const tts = await getKokoro()
  return Object.keys(tts.voices || {})
}
