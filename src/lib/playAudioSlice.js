/**
 * playAudioSlice — plays a time slice of an audio file.
 *
 * Uses native HTML5 <audio> + currentTime seek.
 * iOS Safari safe: seeks only after canplay event fires.
 * Dual stop enforcement: setTimeout + timeupdate listener.
 *
 * @param {string}   audioUrl  - Public URL to the MP3
 * @param {number}   startMs   - Slice start (milliseconds)
 * @param {number}   endMs     - Slice end (milliseconds)
 * @param {number}   [paddingMs=60] - Extra ms before/after to avoid clipping
 * @param {Function} [onPlayStart] - Called when playback begins
 * @param {Function} [onPlayEnd]   - Called when slice finishes
 * @param {Function} [onError]     - Called on any error
 * @returns {{ cancel: Function }} — call cancel() to stop and clean up
 */
export function playAudioSlice({ audioUrl, startMs, endMs, paddingMs = 60, onPlayStart, onPlayEnd, onError } = {}) {
  if (!audioUrl || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    onError?.(new Error('Invalid slice parameters'))
    return { cancel: () => {} }
  }

  const startSec = Math.max(0, (startMs - paddingMs) / 1000)
  const stopSec  = (endMs + paddingMs) / 1000

  const audio = new Audio()
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'   // CORS-safe for Supabase storage URLs
  audio.playsInline = true          // iOS Safari required

  let cleaned   = false
  let stopTimer = null

  function cleanup() {
    if (cleaned) return
    cleaned = true
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
    try { audio.pause() } catch {}
    audio.src = ''
    audio.removeAttribute('src')
    try { audio.load() } catch {}
    onPlayEnd?.()
  }

  function onCanPlay() {
    audio.removeEventListener('canplay', onCanPlay)
    if (cleaned) return

    audio.currentTime = startSec

    audio.play()
      .then(() => {
        onPlayStart?.()

        // Primary stop: timeout based on slice duration
        const sliceMs = (stopSec - startSec) * 1000
        stopTimer = setTimeout(() => {
          cleanup()
        }, sliceMs)

        // Secondary stop: timeupdate guard (handles variable playback rate)
        const onTimeUpdate = () => {
          if (audio.currentTime >= stopSec) {
            audio.removeEventListener('timeupdate', onTimeUpdate)
            cleanup()
          }
        }
        audio.addEventListener('timeupdate', onTimeUpdate)

        // Natural end (file shorter than expected)
        audio.addEventListener('ended', cleanup, { once: true })
      })
      .catch((err) => {
        onError?.(err)
        cleanup()
      })
  }

  audio.addEventListener('canplay', onCanPlay)
  audio.addEventListener('error', () => { onError?.(new Error('Audio load error')); cleanup() }, { once: true })

  audio.src = audioUrl
  audio.load()

  return { cancel: cleanup }
}
