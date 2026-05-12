import { useEffect, useRef } from 'react'

export function useKeyboardShortcuts({
  enabled,
  containerRef,
  toggle, skip, setRate, playbackRate, seek, duration,
  karaokeToggle,
  setMarkerA, setMarkerB, toggleLoop,
  currentTime,
}) {
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e) => {
      if (!enabledRef.current) return
      // Don't fire when user is typing
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return

      // Only fire if our container or body is "active"
      const container = containerRef?.current
      if (container && !container.contains(document.activeElement) &&
          document.body.dataset.audioPlayerActive !== 'true') return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggle()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(e.shiftKey ? -10000 : -5000)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(e.shiftKey ? 10000 : 5000)
          break
        case 'ArrowUp':
          e.preventDefault()
          setRate(Math.min(1.5, playbackRate + 0.25))
          break
        case 'ArrowDown':
          e.preventDefault()
          setRate(Math.max(0.5, playbackRate - 0.25))
          break
        case '0':
          setRate(1.0)
          break
        case 'm': case 'M':
          break
        case 'k': case 'K':
          karaokeToggle?.()
          break
        case 'a': case 'A':
          setMarkerA?.(currentTime)
          break
        case 'b': case 'B':
          setMarkerB?.(currentTime)
          break
        case 'l': case 'L':
          toggleLoop?.()
          break
        default:
          if (e.key >= '1' && e.key <= '9' && duration > 0) {
            const pct = parseInt(e.key) / 10
            seek(pct * duration)
          }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, toggle, skip, setRate, playbackRate, seek, duration, karaokeToggle, setMarkerA, setMarkerB, toggleLoop, currentTime, containerRef])
}
