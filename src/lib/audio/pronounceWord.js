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
//
// INSTANT-TAP (2026-06): prewarm now also primes the *bytes*. The Supabase
// Storage MP3s are served `cache-control: no-cache`, so warming the browser
// HTTP cache is NOT enough — the browser would still revalidate (a network
// round-trip) on first `.play()`. Instead we fetch the clip once and hold it
// as an in-memory `blob:` Object URL. On tap we play the blob, which starts
// from memory with zero network, so audio fires inside the user's gesture.
// Capped + throttled so a 300-word passage never holds hundreds of decoded
// elements on a phone (each clip is ~5-22 KB → the cap stays well under ~3 MB).

import { supabase } from '../supabase'
import { logAudioEvent, classifyPlayError } from './audioEventLog'

// Module-singleton state — guarantees concurrent taps cancel cleanly.
const wordAudioCache = new Map()  // word(normalized) → audio_url (string)
const wordBlobCache = new Map()   // word(normalized) → blob: Object URL (primed bytes)
const inFlightBytes = new Map()   // word(normalized) → Promise<blobUrl|null> (dedupe concurrent warms)
let liveAudio = null              // currently-playing HTMLAudioElement
let liveUtterance = null          // currently-speaking SpeechSynthesisUtterance

// Mobile-safe ceiling on how many decoded clips we hold at once. ~20 KB each →
// 140 clips ≈ <3 MB. When exceeded we evict the oldest blob (Map preserves
// insertion order). The URL string cache is cheap and stays uncapped.
const MAX_PRIMED_BLOBS = 140
// How many byte-warms run concurrently — keeps the radio/CPU calm on a phone.
const WARM_CONCURRENCY = 4

// IMPORTANT: this MUST match the normalization the tap path uses so a warmed
// word is always found on tap. Lowercase, trim, strip anything that isn't a
// letter / apostrophe / hyphen.
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

// iOS Safari silently ignores speechSynthesis.speak() until it's been "unlocked"
// by a speak() that ran inside a real user gesture. The word-tap auto-play runs in
// a useEffect (just outside the gesture), so on iOS the FIRST Web-Speech word can
// be silent (logged 'ok' but never heard). Unlock once on the first real user
// interaction anywhere; afterwards every speak() is honored. (WORD-AUDIO-SAFARI-FIX)
let speechUnlocked = false
function unlockSpeech() {
  if (speechUnlocked || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  speechUnlocked = true
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
    window.speechSynthesis.cancel()
  } catch {}
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const opt = { once: true, capture: true }
  window.addEventListener('pointerdown', unlockSpeech, opt)
  window.addEventListener('touchstart', unlockSpeech, opt)
  window.addEventListener('keydown', unlockSpeech, opt)
}

// Evict the oldest primed blob once we're over the cap (FIFO).
function evictIfNeeded() {
  while (wordBlobCache.size > MAX_PRIMED_BLOBS) {
    const oldestKey = wordBlobCache.keys().next().value
    const url = wordBlobCache.get(oldestKey)
    wordBlobCache.delete(oldestKey)
    try { URL.revokeObjectURL(url) } catch {}
  }
}

// Fetch the MP3 bytes once and store a blob: URL keyed by the normalized word.
// Returns the blob URL (or null on failure). Deduped so concurrent warms of the
// same word share one request.
function primeBytes(word, url) {
  if (!url || wordBlobCache.has(word)) return Promise.resolve(wordBlobCache.get(word) || null)
  if (inFlightBytes.has(word)) return inFlightBytes.get(word)
  if (typeof fetch !== 'function') return Promise.resolve(null)

  const p = (async () => {
    try {
      // Plain GET, no special mode — these are public, CORS-open media. Keeping
      // it simple avoids the strict CORS media path iOS Safari can abort.
      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      wordBlobCache.set(word, blobUrl)
      evictIfNeeded()
      return blobUrl
    } catch {
      return null  // best-effort priming
    } finally {
      inFlightBytes.delete(word)
    }
  })()

  inFlightBytes.set(word, p)
  return p
}

export async function pronounceWord(rawWord, { studentId = null } = {}) {
  const word = normalize(rawWord)
  if (!word || word.length < 1) {
    return { ok: false, reason: 'empty' }
  }

  // Cancel any in-flight word audio so the second tap wins.
  stopAll()

  // ── Tier 1 (fastest): primed in-memory bytes → instant, no network ─────
  if (wordBlobCache.has(word)) {
    return playUrl(wordBlobCache.get(word), word, studentId, 'primed')
  }

  // ── Tier 1 (URL cache): prime the BYTES, then play the blob ────────────
  // Playing the remote URL via <audio> fails on Safari/iOS with NotSupportedError
  // (telemetry: 53 failures, 100% iOS/Mac-Safari) — while the blob path ("primed")
  // NEVER failed. So always play from an in-memory blob. The fetch is tiny
  // (~5-20 KB, SW-bypassed) and well within iOS's post-gesture activation window,
  // so playback still fires for the tap. (WORD-AUDIO-SAFARI-FIX 2026-06)
  if (wordAudioCache.has(word)) {
    const url = wordAudioCache.get(word)
    const blobUrl = await primeBytes(word, url)
    return playUrl(blobUrl || url, word, studentId, blobUrl ? 'primed' : 'cache')
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
      // Play from a blob (Safari-reliable), not the remote URL — see above.
      const blobUrl = await primeBytes(word, data.audio_url)
      return playUrl(blobUrl || data.audio_url, word, studentId, blobUrl ? 'primed' : 'vocabulary')
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

    // iOS Safari autoplay: `.play()` MUST be reached synchronously within the
    // tap gesture. The blob/URL is already resolved before this call, so no
    // network await sits between the tap and play() — playback starts at once.
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
    const synth = window.speechSynthesis
    unlockSpeech() // ensure iOS is unlocked even if this is the first speak()
    synth.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = 0.9
    u.pitch = 1
    u.volume = 1

    // getVoices() is often [] until the async 'voiceschanged' fires (esp. iOS).
    // Pick a good English voice if present; otherwise the platform default still
    // speaks. Never block on voices — speak immediately to stay within the gesture.
    const voices = synth.getVoices()
    if (voices && voices.length) {
      const preferred =
        voices.find((v) => /en-(US|GB)/i.test(v.lang) && /(samantha|google|microsoft|alex|daniel|karen)/i.test(v.name)) ||
        voices.find((v) => /^en[-_]/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang))
      if (preferred) u.voice = preferred
    }

    liveUtterance = u
    u.onend = () => { if (liveUtterance === u) liveUtterance = null }
    u.onerror = () => { if (liveUtterance === u) liveUtterance = null }

    synth.speak(u)
    // iOS/Chrome sometimes leave the utterance queue 'paused' — kick it.
    try { if (synth.paused) synth.resume() } catch {}
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

// Throttled byte-warm of a list of [word, url] pairs (WARM_CONCURRENCY at a
// time). Best-effort; never throws.
async function warmBytesThrottled(pairs) {
  let i = 0
  async function worker() {
    while (i < pairs.length) {
      const idx = i++
      const [word, url] = pairs[idx]
      if (!wordBlobCache.has(word)) {
        // eslint-disable-next-line no-await-in-loop
        await primeBytes(word, url)
      }
    }
  }
  const workers = Array.from({ length: Math.min(WARM_CONCURRENCY, pairs.length) }, worker)
  await Promise.all(workers)
}

// Pre-warm the cache for a passage so the first tap is instant.
// Pass the passage's full text; the helper extracts unique English words,
// resolves their audio URLs, and (for a prioritized, capped subset) eagerly
// fetches the MP3 bytes into in-memory blob URLs so tapping plays from memory.
//
// Optional opts:
//   priorityWords — array of raw words (e.g. the passage's highlighted /
//     vocabulary words) to byte-warm FIRST. These are the words students are
//     most likely to tap, so they should be instant even under the cap.
export async function prewarmPassageWords(passageText, opts = {}) {
  if (typeof passageText !== 'string' || passageText.length === 0) return
  // Normalize identically to the tap path so warmed keys always match on tap.
  const rawTokens = passageText.toLowerCase().match(/[a-z'-]+/g) || []
  const words = [...new Set(rawTokens.map(normalize).filter((w) => w.length > 1))]
  if (words.length === 0) return

  // Prioritized order: requested priority words first (deduped), then the rest.
  const priority = [...new Set((opts.priorityWords || []).map(normalize).filter((w) => w.length > 1))]
  const prioritySet = new Set(priority)
  const ordered = [...priority.filter((w) => words.includes(w)), ...words.filter((w) => !prioritySet.has(w))]

  // Resolve URLs for words we don't already have cached.
  const missing = ordered.filter((w) => !wordAudioCache.has(w))
  if (missing.length > 0) {
    try {
      const { data } = await supabase
        .from('curriculum_vocabulary')
        .select('word, audio_url')
        .in('word', missing)
        .not('audio_url', 'is', null)
      ;(data || []).forEach(({ word, audio_url }) => {
        wordAudioCache.set(normalize(word), audio_url)
      })
    } catch {
      // Cache pre-warm is best-effort.
    }
  }

  // Build the prioritized list of [word, url] pairs that have a known URL,
  // capped to the blob ceiling so we never over-fetch on a phone.
  const pairs = []
  for (const w of ordered) {
    if (pairs.length >= MAX_PRIMED_BLOBS) break
    const url = wordAudioCache.get(w)
    if (url && !wordBlobCache.has(w)) pairs.push([w, url])
  }

  // Eagerly fetch the bytes (throttled) so the first tap plays from memory.
  if (pairs.length > 0) {
    warmBytesThrottled(pairs).catch(() => {})
  }
}

// Warm an explicit set of raw words on demand (e.g. lazily as they scroll into
// view). Resolves missing URLs then primes bytes, respecting the cap/throttle.
export async function prewarmWords(rawWords) {
  if (!Array.isArray(rawWords) || rawWords.length === 0) return
  const words = [...new Set(rawWords.map(normalize).filter((w) => w.length > 1))]
  if (words.length === 0) return

  const missing = words.filter((w) => !wordAudioCache.has(w))
  if (missing.length > 0) {
    try {
      const { data } = await supabase
        .from('curriculum_vocabulary')
        .select('word, audio_url')
        .in('word', missing)
        .not('audio_url', 'is', null)
      ;(data || []).forEach(({ word, audio_url }) => {
        wordAudioCache.set(normalize(word), audio_url)
      })
    } catch {
      // best-effort
    }
  }

  const pairs = []
  for (const w of words) {
    if (wordBlobCache.size + pairs.length >= MAX_PRIMED_BLOBS) break
    const url = wordAudioCache.get(w)
    if (url && !wordBlobCache.has(w)) pairs.push([w, url])
  }
  if (pairs.length > 0) await warmBytesThrottled(pairs)
}

export function stopPronunciation() {
  stopAll()
}
