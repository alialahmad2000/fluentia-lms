import { useCallback, useEffect, useRef, useState } from 'react'
import { playAudioSlice } from '../../../lib/playAudioSlice'

// Tier-fallback single-word audio.
//
// MEGA-FIX V2 (R1): Tier 2 (per-word MP3) is now the DEFAULT path. The
// passage-slice (Tier 1) is reliable only when `word_timestamps` are
// perfectly aligned with the passage MP3, otherwise the setTimeout-based
// stop can miss and the rest of the passage plays through. Since
// curriculum_vocabulary.audio_url has 100% coverage (13,930/13,930 rows),
// Tier 2 is strictly safer.
//
// Order:
//   Tier 2 — curriculum_vocabulary.audio_url (pre-cached MP3 per word)  ← DEFAULT
//   Tier 1 — slice the passage MP3 between [start_ms, end_ms]            ← fallback only
//   Tier 3 — Web Speech API SpeechSynthesisUtterance                     ← last resort
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

    // Default to vocab MP3 (Tier 2). If that's missing, fall through to
    // passage-slice (Tier 1) as a fallback before Web Speech (Tier 3).
    const trySlice = () => {
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
          onError: () => { if (!cancelledRef.current) tryTier3() },
        })
        return
      }
      tryTier3()
    }

    if (vocabAudioUrl) {
      // Tier 2 path — but route any tier-2 failure through trySlice (legacy fallback).
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
          trySlice()
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
            if (!cancelledRef.current) trySlice()
          })
        } else {
          setTier(2)
          setIsPlaying(true)
        }
      } catch {
        trySlice()
      }
      return
    }

    // No vocab audio at all — try slice, then Web Speech.
    trySlice()
  }, [word, wordTimestamp, passageAudioUrl, vocabAudioUrl, stop])

  return { play, stop, isPlaying, tier }
}
