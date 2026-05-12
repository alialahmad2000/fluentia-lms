import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'fluentia:player:bg-playback-enabled'

export function getBackgroundPlaybackPref() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

export function setBackgroundPlaybackPref(enabled) {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)) } catch {}
}

/**
 * Pauses audio when user navigates away, unless bg-playback opt-in is set.
 * Variant-agnostic — wired into SmartAudioPlayer directly.
 */
export function useAudioNavigationPause({ isPlaying, pause }) {
  const location = useLocation()
  const lastPathRef = useRef(location.pathname)
  const pauseRef = useRef(pause)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => { pauseRef.current = pause }, [pause])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    const current = location.pathname
    const last = lastPathRef.current
    if (current !== last && isPlayingRef.current) {
      if (!getBackgroundPlaybackPref()) {
        try { pauseRef.current() } catch {}
      }
    }
    lastPathRef.current = current
  }, [location.pathname])

  // Pause on unmount (page leave) unless bg-playback enabled
  useEffect(() => {
    return () => {
      if (!getBackgroundPlaybackPref()) {
        try { pauseRef.current() } catch {}
      }
    }
  }, []) // eslint-disable-line
}
