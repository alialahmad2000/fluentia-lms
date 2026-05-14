import { useCallback, useRef } from 'react'

export function useWordAudio(audioUrl) {
  const audioRef = useRef(null)
  const stopTimerRef = useRef(null)

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(audioUrl)
      a.preload = 'auto'
      audioRef.current = a
    }
    return audioRef.current
  }, [audioUrl])

  const playWordFromClip = useCallback(({ start_ms, end_ms }) => {
    if (!audioUrl || start_ms == null || end_ms == null) return false
    const a = ensureAudio()
    a.pause()
    clearTimeout(stopTimerRef.current)
    a.currentTime = start_ms / 1000
    a.play().catch(() => {})
    const dur = Math.max(120, end_ms - start_ms + 60)
    stopTimerRef.current = setTimeout(() => { a.pause() }, dur)
    return true
  }, [audioUrl, ensureAudio])

  const playWordViaSpeechSynthesis = useCallback((wordText) => {
    if (!('speechSynthesis' in window)) return false
    const u = new SpeechSynthesisUtterance(wordText)
    u.lang = 'en-US'
    u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    return true
  }, [])

  const playWord = useCallback((wordText, timestamps) => {
    if (timestamps) {
      const played = playWordFromClip(timestamps)
      if (played) return
    }
    playWordViaSpeechSynthesis(wordText)
  }, [playWordFromClip, playWordViaSpeechSynthesis])

  return { playWord }
}
