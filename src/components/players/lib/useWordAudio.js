import { useCallback, useEffect, useRef } from 'react'

/**
 * Plays a slice of an audio file [start_ms, end_ms] using a shared <audio> element.
 *
 * Uses timeupdate events instead of setTimeout — setTimeout pauses in background
 * tabs / locked screens / iOS low-power mode. timeupdate fires ~250ms during
 * playback in all browsers and is gesture-safe.
 *
 * A shared DOM <audio> element preloads metadata once and survives hook re-renders.
 * iOS Safari requires metadata to be loaded before seeking reliably.
 */
export function useWordAudio(audioUrl) {
  const audioElRef = useRef(null)
  const activeStopAtRef = useRef(null) // ms
  const playTokenRef = useRef(0)

  // Lazy-attach one hidden <audio> element per URL, reused across renders
  const getAudio = useCallback(() => {
    if (!audioUrl) return null
    if (audioElRef.current?.src.endsWith(audioUrl) || audioElRef.current?.src === audioUrl) {
      return audioElRef.current
    }
    let el = document.querySelector(`audio[data-fluentia-word-audio="${CSS.escape(audioUrl)}"]`)
    if (!el) {
      el = document.createElement('audio')
      el.dataset.fluentiaWordAudio = audioUrl
      el.src = audioUrl
      el.preload = 'auto'
      el.crossOrigin = 'anonymous'
      el.playsInline = true
      el.style.display = 'none'
      document.body.appendChild(el)
    }
    audioElRef.current = el
    return el
  }, [audioUrl])

  // timeupdate listener — stops at end_ms. Attached once per URL.
  useEffect(() => {
    const el = getAudio()
    if (!el) return
    const onTimeUpdate = () => {
      const stopAt = activeStopAtRef.current
      if (stopAt != null && el.currentTime * 1000 >= stopAt) {
        el.pause()
        activeStopAtRef.current = null
      }
    }
    el.addEventListener('timeupdate', onTimeUpdate)
    return () => el.removeEventListener('timeupdate', onTimeUpdate)
  }, [audioUrl, getAudio])

  const playClipRange = useCallback(async ({ start_ms, end_ms }) => {
    const el = getAudio()
    if (!el || start_ms == null || end_ms == null) return false

    const myToken = ++playTokenRef.current

    // Wait for metadata so seeking is deterministic
    if (el.readyState < 1 /* HAVE_METADATA */) {
      await new Promise((resolve) => {
        const ready = () => { el.removeEventListener('loadedmetadata', ready); resolve() }
        el.addEventListener('loadedmetadata', ready)
        el.load()
        // Safety timeout in case the event never fires
        setTimeout(() => { el.removeEventListener('loadedmetadata', ready); resolve() }, 1500)
      })
    }

    if (myToken !== playTokenRef.current) return false // newer click superseded us

    try {
      el.pause()
      el.currentTime = start_ms / 1000
      // 40ms padding so final consonant isn't cut
      activeStopAtRef.current = end_ms + 40
      const p = el.play()
      if (p && typeof p.then === 'function') await p
      return true
    } catch (err) {
      console.warn('[useWordAudio] play blocked or failed:', err.message)
      return false
    }
  }, [getAudio])

  const playWord = useCallback(async (wordText, timestamps) => {
    let played = false
    if (timestamps && typeof timestamps.start_ms === 'number') {
      played = await playClipRange(timestamps)
    }
    if (!played && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(wordText)
      u.lang = 'en-US'
      u.rate = 0.9
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }
  }, [playClipRange])

  return { playWord }
}
