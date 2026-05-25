import { useCallback, useEffect, useRef, useState } from 'react'

// Tier-fallback single-word audio (hybrid, NO passage slicing).
//
// MEGA-FIX (reading premium, 2026-05-25): the passage-slice tier was REMOVED.
// Slicing a single word out of the whole-passage MP3 via word_timestamps always
// carried co-articulated neighbour phonemes (the last consonant of the word
// bleeds into the next), and the setTimeout-based stop overran on slow networks
// playing the rest of the passage. "Click a word → hear it cleanly" is the #1
// student request, so a clean robotic Web Speech rendering beats a dirty slice.
//
// Order:
//   Layer 1  — curriculum_vocabulary.audio_url (curated per-word MP3)   ← best
//   Layer 1b — vocab_word_audio.audio_url (background-generated MP3)    ← optional, table-ready
//   Layer 2  — Web Speech API SpeechSynthesisUtterance (clean, free)    ← fallback
//
// `wordAudioUrl` (Layer 1b) is optional and currently passed as null until the
// vocab_word_audio table is populated by the background worker — the hook is
// forward-compatible so wiring it later needs no further change here.
//
// Caller must invoke `play()` from inside a user-gesture handler.

export function useWordLensAudio({ word, vocabAudioUrl, wordAudioUrl = null }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tier, setTier] = useState(null)
  const audioRef = useRef(null)
  const cancelledRef = useRef(false)

  const stop = useCallback(() => {
    cancelledRef.current = true
    if (audioRef.current) {
      try { audioRef.current.pause() } catch {}
      audioRef.current = null
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

    // Layer 2 — Web Speech (clean, instant, free). Last resort.
    const tryWebSpeech = () => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !word) {
          setIsPlaying(false)
          return
        }
        const u = new SpeechSynthesisUtterance(word)
        u.lang = 'en-US'
        u.rate = 0.9
        // Prefer a natural en-US voice (Google/Microsoft) over a slow-cold-start
        // platform default when available.
        try {
          const voices = window.speechSynthesis.getVoices() || []
          const preferred =
            voices.find((v) => /en-US/i.test(v.lang) && /Google|Microsoft|Natural/i.test(v.name)) ||
            voices.find((v) => /en-US/i.test(v.lang))
          if (preferred) u.voice = preferred
        } catch {}
        u.onend = () => { if (!cancelledRef.current) setIsPlaying(false) }
        u.onerror = () => { if (!cancelledRef.current) setIsPlaying(false) }
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(u)
        setTier('web_speech')
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }

    // Play a clean per-word MP3; on any failure, fall through to `onFail`.
    const tryMp3 = (url, tierLabel, onFail) => {
      if (!url) { onFail(); return }
      try {
        const el = new Audio()
        el.crossOrigin = 'anonymous'
        el.playsInline = true
        el.preload = 'auto'
        el.src = url
        audioRef.current = el

        el.addEventListener('ended', () => { if (!cancelledRef.current) setIsPlaying(false) }, { once: true })
        el.addEventListener('error', () => {
          if (cancelledRef.current) return
          audioRef.current = null
          onFail()
        }, { once: true })

        const p = el.play()
        if (p && typeof p.then === 'function') {
          p.then(() => {
            if (cancelledRef.current) return
            setTier(tierLabel)
            setIsPlaying(true)
          }).catch(() => { if (!cancelledRef.current) { audioRef.current = null; onFail() } })
        } else {
          setTier(tierLabel)
          setIsPlaying(true)
        }
      } catch {
        audioRef.current = null
        onFail()
      }
    }

    // Layer 1 → Layer 1b → Layer 2
    tryMp3(vocabAudioUrl, 'curriculum', () =>
      tryMp3(wordAudioUrl, 'word_audio', tryWebSpeech),
    )
  }, [word, vocabAudioUrl, wordAudioUrl, stop])

  return { play, stop, isPlaying, tier }
}
