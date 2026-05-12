import { useEffect, useRef } from 'react'

const H_THRESHOLD = 60
const V_MAX_DRIFT = 30
const DOUBLE_TAP_MS = 250

export function useMobileGestures({ enabled, containerRef, toggle, skip }) {
  const touchStart = useRef(null)
  const lastTap = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const el = containerRef?.current
    if (!el) return

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse') return
      touchStart.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    }

    const onPointerUp = (e) => {
      if (e.pointerType === 'mouse' || !touchStart.current) return
      const dx = e.clientX - touchStart.current.x
      const dy = e.clientY - touchStart.current.y
      const dt = Date.now() - touchStart.current.time
      touchStart.current = null

      // Abort if vertical scroll
      if (Math.abs(dy) > V_MAX_DRIFT) return

      // Swipe
      if (Math.abs(dx) > H_THRESHOLD && dt < 400) return // swipe handled elsewhere

      // Tap
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 250) {
        const now = Date.now()
        const isDouble = now - lastTap.current < DOUBLE_TAP_MS
        lastTap.current = now

        if (isDouble) {
          const rect = el.getBoundingClientRect()
          const isLeftHalf = e.clientX < rect.left + rect.width / 2
          skip(isLeftHalf ? -10000 : 10000)
        } else {
          // single tap — defer to check for double
          setTimeout(() => {
            if (Date.now() - lastTap.current >= DOUBLE_TAP_MS) {
              toggle()
            }
          }, DOUBLE_TAP_MS + 10)
        }
      }
    }

    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('pointerup', onPointerUp, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
    }
  }, [enabled, containerRef, toggle, skip])
}
