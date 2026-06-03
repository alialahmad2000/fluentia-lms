// Pointer-based chat gestures (touch + mouse), virtualization-safe.
// Strict disambiguation so swipe / scroll / double-tap / long-press never clash:
//   • first horizontal move > 10px  → swipe-to-reply (cancels tap + long-press)
//   • first vertical move   > 10px  → scroll (cancels everything; list scrolls)
//   • held 380ms without moving     → long-press menu
//   • two clean taps < 280ms apart  → double-tap (react)
// RTL: reply = drag the bubble toward the START edge (rightward, +x).
import { useRef, useCallback } from 'react'
import { useMotionValue, animate } from 'framer-motion'
import { ease } from './motion'

const SWIPE_TRIGGER = 56
const SWIPE_MAX = 72
const LONGPRESS_MS = 380
const DOUBLETAP_MS = 280
const MOVE_TOL = 10

export function useChatGestures({ onDoubleTap, onLongPress, onSwipeReply, disabled } = {}) {
  const swipeX = useMotionValue(0)
  const st = useRef({ startX: 0, startY: 0, mode: null, lastTapAt: 0, lpTimer: null, pointerId: null })

  const clearLP = () => { const s = st.current; if (s.lpTimer) { clearTimeout(s.lpTimer); s.lpTimer = null } }

  const onPointerDown = useCallback((e) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    const s = st.current
    s.startX = e.clientX; s.startY = e.clientY; s.mode = null; s.pointerId = e.pointerId
    clearLP()
    if (onLongPress) {
      s.lpTimer = setTimeout(() => { if (s.mode === null) { s.mode = 'longpress'; onLongPress(e) } }, LONGPRESS_MS)
    }
  }, [disabled, onLongPress])

  const onPointerMove = useCallback((e) => {
    const s = st.current
    if (s.pointerId !== e.pointerId) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    if (s.mode === null) {
      if (Math.abs(dx) > MOVE_TOL && Math.abs(dx) > Math.abs(dy)) { s.mode = 'swipe'; clearLP() }
      else if (Math.abs(dy) > MOVE_TOL) { s.mode = 'scroll'; clearLP() }
    }
    if (s.mode === 'swipe' && onSwipeReply) {
      swipeX.set(Math.max(0, Math.min(SWIPE_MAX, dx)))  // rightward only = toward START in RTL
    }
  }, [onSwipeReply, swipeX])

  const finish = useCallback((e) => {
    const s = st.current
    if (s.pointerId !== null && e.pointerId !== undefined && s.pointerId !== e.pointerId) return
    clearLP()
    if (s.mode === 'swipe') {
      if (swipeX.get() >= SWIPE_TRIGGER) { onSwipeReply?.(); try { navigator.vibrate?.(10) } catch {} }
      animate(swipeX, 0, { duration: 0.28, ease })
    } else if (s.mode === null) {
      const now = Date.now()
      if (now - s.lastTapAt < DOUBLETAP_MS) { s.lastTapAt = 0; onDoubleTap?.(e) }
      else s.lastTapAt = now
    }
    s.mode = null; s.pointerId = null
  }, [onDoubleTap, onSwipeReply, swipeX])

  const onContextMenu = useCallback((e) => {
    if (onLongPress) { e.preventDefault(); onLongPress(e) }
  }, [onLongPress])

  const bind = {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onContextMenu,
    style: { touchAction: 'pan-y' },
  }
  return { bind, swipeX }
}
