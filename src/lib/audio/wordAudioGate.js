// Single-flight gate for vocabulary word pronunciation.
//
// Problem: each vocab "listen" control used its own `new Audio(url).play()`. Several kept no
// reference, so tapping a word repeatedly spawned multiple overlapping clips (two voices at once).
//
// Behaviour (per product): while a word clip is playing, further taps are IGNORED — they do
// nothing until the current clip finishes. Then the next tap plays. One word at a time, never
// stacked, never restart-stuttering on rapid taps.
//
// Use this for EVERY vocab listen button (curriculum vocab, flashcards, Anki, word-detail, etc.)
// instead of `new Audio()`.

let liveAudio = null
let busy = false
let safety = null

/** Is a word clip currently playing? (taps are ignored while true) */
export function isWordAudioBusy() {
  return busy
}

/** Hard-stop any current word clip and clear the gate (e.g. on unmount / card change). */
export function stopWordAudio() {
  if (safety) { clearTimeout(safety); safety = null }
  if (liveAudio) { try { liveAudio.pause() } catch {} liveAudio = null }
  busy = false
}

/**
 * Play a word clip from a direct URL, IGNORING the call if one is already playing.
 * @param {string} url - audio file URL (e.g. word.audio_url)
 * @param {object} [opts]
 * @param {() => void} [opts.onStart] - fired when playback actually begins
 * @param {() => void} [opts.onEnd]   - fired when it ends / errors / is stopped
 * @param {() => void} [opts.onError] - fired when load/play fails (e.g. iOS autoplay blocked)
 * @returns {boolean} true if a clip was started, false if ignored (already playing) or no url
 */
export function playWordAudioOnce(url, { onStart, onEnd, onError } = {}) {
  if (!url) return false
  if (busy) return false // ← a clip is playing: ignore this tap until it finishes

  let a
  try {
    a = new Audio(url)
    a.playsInline = true
  } catch {
    return false
  }

  liveAudio = a
  busy = true

  const done = () => {
    if (safety) { clearTimeout(safety); safety = null }
    if (liveAudio === a) liveAudio = null
    if (busy) { busy = false; try { onEnd?.() } catch {} }
  }
  const fail = () => { try { onError?.() } catch {}; done() }

  a.addEventListener('playing', () => { try { onStart?.() } catch {} }, { once: true })
  a.addEventListener('ended', done, { once: true })
  a.addEventListener('error', fail, { once: true })
  // Safety net: if 'ended' never fires (load stall), free the gate so taps work again.
  safety = setTimeout(done, 15000)

  a.play().catch(() => { fail() })
  return true
}
