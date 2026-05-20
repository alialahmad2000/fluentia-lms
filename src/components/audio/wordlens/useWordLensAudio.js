import { useCallback, useEffect, useRef, useState } from 'react'
import { playAudioSlice } from '../../../lib/playAudioSlice'

// Tier-fallback single-word audio.
//
// Tier 1 — slice the passage MP3 between [start_ms, end_ms] from word_timestamps.
//          Uses lib/playAudioSlice.js — iOS Safari safe (canplay → seek → play).
// Tier 2 — curriculum_vocabulary.audio_url (pre-cached MP3 per word).
// Tier 3 — Web Speech API SpeechSynthesisUtterance.
//
// Caller must invoke `play()` from inside a user-gesture handler.

export function useWordLensAudio({ word, wordTimestamp, passageAudioUrl, vocabAudioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tier, setTier] = useState(null)
  const sliceRef = useRef(null)
  const vocabAudioRef = useRef(null)
  const cancelledRef = useRef(false)

  const stop = useCallback(() => {
    cancelledRef.current = true
    if (sliceRef.current) {
      try { sliceRef.current.cancel() } catch {}
      sliceRef.current = null
    }
    if (vocabAudioRef.current) {
      try { vocabAudioRef.current.pause() } catch {}
      vocabAudioRef.current = null
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    } catch {}
    setIsPlaying(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop])

  // Reset when the word changes
  useEffect(() => {
    stop()
    setTier(null)
  }, [word, stop])

  const play = useCallback(() => {
    stop()
    cancelledRef.current = false

    const tryTier3 = () => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !word) {
          setIsPlaying(false)
          return
        }
        const u = new SpeechSynthesisUtterance(word)
        u.lang = 'en-US'
        u.rate = 0.9
        u.onend = () => { if (!cancelledRef.current) setIsPlaying(false) }
        u.onerror = () => { if (!cancelledRef.current) setIsPlaying(false) }
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
        setTier(3)
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }

    const tryTier2 = () => {
      if (!vocabAudioUrl) { tryTier3(); return }
      try {
        const el = new Audio()
        el.crossOrigin = 'anonymous'
        el.playsInline = true
        el.preload = 'auto'
        el.src = vocabAudioUrl
        vocabAudioRef.current = el

        const handleEnded = () => { if (!cancelledRef.current) setIsPlaying(false) }
        const handleError = () => {
          if (cancelledRef.current) return
          vocabAudioRef.current = null
          tryTier3()
        }
        el.addEventListener('ended', handleEnded, { once: true })
        el.addEventListener('error', handleError, { once: true })

        const p = el.play()
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (cancelledRef.current) return
            setTier(2)
            setIsPlaying(true)
          }).catch(() => {
            if (!cancelledRef.current) tryTier3()
          })
        } else {
          setTier(2)
          setIsPlaying(true)
        }
      } catch {
        tryTier3()
      }
    }

    if (
      wordTimestamp &&
      passageAudioUrl &&
      Number.isFinite(wordTimestamp.start_ms) &&
      Number.isFinite(wordTimestamp.end_ms)
    ) {
      sliceRef.current = playAudioSlice({
        audioUrl: passageAudioUrl,
        startMs: wordTimestamp.start_ms,
        endMs: wordTimestamp.end_ms,
        paddingMs: 60,
        onPlayStart: () => {
          if (cancelledRef.current) return
          setTier(1)
          setIsPlaying(true)
        },
        onPlayEnd: () => { if (!cancelledRef.current) setIsPlaying(false) },
        onError: () => { if (!cancelledRef.current) tryTier2() },
      })
      return
    }

    tryTier2()
  }, [word, wordTimestamp, passageAudioUrl, vocabAudioUrl, stop])

  return { play, stop, isPlaying, tier }
}
