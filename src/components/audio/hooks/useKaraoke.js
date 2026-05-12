import { useState, useEffect, useRef, useCallback } from 'react'

const LS_KEY = 'fluentia:player:karaoke-enabled'

function binarySearchWord(timestamps, ms) {
  if (!timestamps || timestamps.length === 0) return -1
  let lo = 0, hi = timestamps.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const w = timestamps[mid]
    if (ms >= w.start_ms && ms <= w.end_ms) return mid
    if (ms < w.start_ms) hi = mid - 1
    else lo = mid + 1
  }
  // Return last word whose end_ms is before current time
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (ms >= timestamps[i].start_ms) return i
  }
  return -1
}

export function useKaraoke({ currentTime, currentSegmentIndex, segments, audioUrl, wordTimestamps, isBottomBarMode = false }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(LS_KEY) !== 'false' } catch { return true }
  })
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const wordRefs = useRef({})
  const lastScrollAt = useRef(0)
  const lastUserScrollAt = useRef(0)
  const scrollThrottle = useRef(null)

  const toggle = useCallback(() => {
    setEnabled(v => {
      const next = !v
      try { localStorage.setItem(LS_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  // Track user scroll
  useEffect(() => {
    const onScroll = () => { lastUserScrollAt.current = Date.now() }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!enabled) { setCurrentWordIndex(-1); return }

    let timestamps = wordTimestamps
    if (!timestamps && segments && segments[currentSegmentIndex]) {
      timestamps = segments[currentSegmentIndex].word_timestamps
    }

    const idx = binarySearchWord(timestamps, currentTime)
    setCurrentWordIndex(idx)

    // Auto-scroll — throttled, paused after user scroll
    if (idx >= 0) {
      const key = `${currentSegmentIndex}-${idx}`
      const now = Date.now()
      if (now - lastScrollAt.current > 500 && now - lastUserScrollAt.current > 3000) {
        lastScrollAt.current = now
        const el = wordRefs.current[key]
        if (el) {
          clearTimeout(scrollThrottle.current)
          scrollThrottle.current = setTimeout(() => {
            const barHeight = isBottomBarMode ? (window.innerWidth < 768 ? 80 : 96) : 0
            const rect = el.getBoundingClientRect()
            const vh = window.innerHeight
            const targetTop = vh * 0.40
            const effectiveBottom = vh - barHeight - 40
            if (rect.top < 80 || rect.bottom > effectiveBottom) {
              const delta = rect.top - targetTop
              window.scrollBy({ top: delta, behavior: 'smooth' })
            }
          }, 50)
        }
      }
    }
  }, [currentTime, currentSegmentIndex, enabled, segments, wordTimestamps])

  const setWordRef = useCallback((segIdx, wordIdx, el) => {
    const key = `${segIdx}-${wordIdx}`
    if (el) wordRefs.current[key] = el
    else delete wordRefs.current[key]
  }, [])

  return { enabled, toggle, currentWordIndex, setWordRef }
}
