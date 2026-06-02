// MEGA-FIX V2 Phase C — Isolated per-word pronunciation utility.
//
// Three-layer fallback, NEVER touches the passage player:
//   Tier 1 — curriculum_vocabulary.audio_url (100% covered, 13,930 rows)
//   Tier 2 — Web Speech API SpeechSynthesisUtterance
//   Tier 3 — silent fail (logged)
//
// Decoupled from any SmartAudioPlayer / SmartAudioPlayer.playSlice() so the
// passage audio never starts when a student taps a word. Each call cancels
// any previous in-flight word audio. Use a fire-and-forget call pattern:
//
//   import { pronounceWord, prewarmPassageWords } from '@/lib/audio/pronounceWord'
//   pronounceWord(rawWord, { studentId: profile?.id })

import { supabase } from '../supabase'
import { logAudioEvent, classifyPlayError } from './audioEventLog'

// Module-singleton state — guarantees concurrent taps cancel cleanly.
const wordAudioCache = new Map() // word(lowercase) → audio_url
let liveAudio = null              // currently-playing HTMLAudioElement
let liveUtterance = null          // currently-speaking SpeechSynthesisUtterance

function normalize(raw) {
  if (typeof raw !== 'string') return ''
  return raw.toLowerCase().trim().replace(/[^a-z'-]/g, '')
}

function stopAll() {
  if (liveAudio) {
    try { liveAudio.pause() } catch {}
    try { liveAudio.src = '' } catch {}
    liveAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel() } catch {}
  }
  liveUtterance = null
}

export async function pronounceWord(rawWord, { studentId = null } = {}) {
  const word = normalize(rawWord)
  if (!word || word.length < 1) {
    return { ok: false, reason: 'empty' }
  }

  // Cancel any in-flight word audio so the second tap wins.
  stopAll()

  // ── Tier 1: in-memory cache ────────────────────────────────────────
  if (wordAudioCache.has(word)) {
    return playUrl(wordAudioCache.get(word), word, studentId, 'cache')
  }

  // ── Tier 1 (DB): curriculum_vocabulary.audio_url ──────────────────
  try {
    const { data } = await supabase
      .from('curriculum_vocabulary')
      .select('audio_url')
      .ilike('word', word)
      .not('audio_url', 'is', null)
      .limit(1)
      .maybeSingle()

    if (data?.audio_url) {
      wordAudioCache.set(word, data.audio_url)
      return playUrl(data.audio_url, word, studentId, 'vocabulary')
    }
  } catch {
    // Network blip → fall through to Web Speech.
  }

  // ── Tier 2: Web Speech ────────────────────────────────────────────
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return speakBrowser(word, studentId)
  }

  logAudioEvent({
    studentId,
    playerId: `word:${word}`,
    event: 'word_pronounce',
    reason: 'no_audio_available',
    state: 'error',
  })
  return { ok: false, reason: 'no_audio_available' }
}

async function playUrl(url, word, studentId, source) {
  try {
    const audio = new Audio()
    audio.preload = 'auto'
    // no crossOrigin — plain playback of public Supabase media; it forces strict
    // CORS media mode that iOS Safari can silently abort (WebKit fix, prompt 10)
    audio.playsInline = true
    audio.src = url
    liveAudio = audio

    const p = audio.play()
    if (p !== undefined) await p

    logAudioEvent({
      studentId,
      playerId: `word:${word}`,
      audioUrl: url,
      event: 'word_pronounce',
      reason: source,
      state: 'ok',
    })

    audio.addEventListener('ended', () => { if (liveAudio === audio) liveAudio = null }, { once: true })
    audio.addEventListener('error', () => { if (liveAudio === audio) liveAudio = null }, { once: true })
    return { ok: true, source }
  } catch (e) {
    const reason = classifyPlayError(e)
    logAudioEvent({
      studentId,
      playerId: `word:${word}`,
      audioUrl: url,
      event: 'word_pronounce',
      reason: `${source}_play_failed:${reason}`,
      state: 'error',
    })
    if (reason === 'AbortError') return { ok: false, reason: 'aborted' }
    // Promote to Web Speech on any non-abort failure.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return speakBrowser(word, studentId)
    }
    return { ok: false, reason: 'play_failed' }
  }
}

function speakBrowser(word, studentId) {
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = 0.9
    u.pitch = 1
    u.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((v) =>
      /en-(US|GB)/i.test(v.lang) &&
      /(samantha|google|microsoft|alex|daniel|karen)/i.test(v.name)
    )
    if (preferred) u.voice = preferred

    liveUtterance = u
    u.onend = () => { if (liveUtterance === u) liveUtterance = null }
    u.onerror = () => { if (liveUtterance === u) liveUtterance = null }

    window.speechSynthesis.speak(u)
    logAudioEvent({
      studentId,
      playerId: `word:${word}`,
      event: 'word_pronounce',
      reason: 'web_speech',
      state: 'ok',
    })
    return { ok: true, source: 'web_speech' }
  } catch (e) {
    logAudioEvent({
      studentId,
      playerId: `word:${word}`,
      event: 'word_pronounce',
      reason: 'web_speech_failed',
      state: 'error',
    })
    return { ok: false, reason: 'tts_failed' }
  }
}

// Pre-warm the cache for a passage so the first tap is instant.
// Pass the passage's full text; the helper extracts unique English words.
export async function prewarmPassageWords(passageText) {
  if (typeof passageText !== 'string' || passageText.length === 0) return
  const words = [...new Set(passageText.toLowerCase().match(/[a-z'-]+/g) || [])]
  if (words.length === 0) return

  // Filter to ones not yet cached.
  const missing = words.filter((w) => !wordAudioCache.has(w))
  if (missing.length === 0) return

  try {
    const { data } = await supabase
      .from('curriculum_vocabulary')
      .select('word, audio_url')
      .in('word', missing)
      .not('audio_url', 'is', null)
    ;(data || []).forEach(({ word, audio_url }) => {
      wordAudioCache.set(word.toLowerCase(), audio_url)
    })
  } catch {
    // Cache pre-warm is best-effort.
  }
}

export function stopPronunciation() {
  stopAll()
}
