import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Pull-to-refresh hook for mobile.
 * Returns { isRefreshing, pullProgress, handlers }
 * Attach handlers to the scrollable container.
 *
 * @param {Function} onRefresh - async function to call on refresh
 * @param {Object} [options]
 * @param {number} [options.threshold=80] - pull distance to trigger refresh
 * @param {boolean} [options.disabled=false] - disable the behavior
 */
export default function usePullToRefresh(onRefresh, { threshold = 60, disabled = false } = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return
    // Only activate when scrolled to top
    if (window.scrollY > 5) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || disabled || isRefreshing) return
    const deltaY = e.touches[0].clientY - startY.current
    if (deltaY > 0) {
      // Resist pull (rubber band)
      const distance = Math.min(deltaY * 0.4, threshold * 1.5)
      setPullDistance(distance)
    } else {
      pulling.current = false
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.5) // hold at half
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh])

  useEffect(() => {
    if (disabled) return
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1),
    pullDistance,
  }
}
