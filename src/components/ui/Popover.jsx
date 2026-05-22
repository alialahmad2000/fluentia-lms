// MEGA-FIX V2 Phase D — Shared sidebar-aware Popover primitive.
//
// Renders via createPortal to document.body to avoid overflow:hidden clipping.
// Repositions on scroll/resize. Closes on outside-click + Escape.
// Reads --sidebar-width and --header-height live via computePopupPosition.

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { computePopupPosition } from '../../lib/ui/computePopupPosition'

export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  ariaLabel,
  margin,
  closeOnOutsideClick = true,
  closeOnEsc = true,
  className = '',
  style = {},
}) {
  const popupRef = useRef(null)
  const [pos, setPos] = useState(null)

  // Measure + position whenever open / children change.
  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !popupRef.current) return
    const compute = () => {
      const anchorRect = anchorRef.current.getBoundingClientRect()
      const popupSize = {
        width: popupRef.current.offsetWidth,
        height: popupRef.current.offsetHeight,
      }
      setPos(computePopupPosition(anchorRect, popupSize, { margin }))
    }
    compute()
    const raf = requestAnimationFrame(compute)
    return () => cancelAnimationFrame(raf)
  }, [open, anchorRef, children, margin])

  // Reposition on scroll/resize.
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!anchorRef?.current || !popupRef.current) return
      const anchorRect = anchorRef.current.getBoundingClientRect()
      const popupSize = {
        width: popupRef.current.offsetWidth,
        height: popupRef.current.offsetHeight,
      }
      setPos(computePopupPosition(anchorRect, popupSize, { margin }))
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, margin])

  // Outside click + escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => {
      if (!closeOnOutsideClick) return
      if (popupRef.current?.contains(e.target)) return
      if (anchorRef?.current?.contains(e.target)) return
      onClose?.()
    }
    const onKey = (e) => {
      if (closeOnEsc && e.key === 'Escape') onClose?.()
    }
    // Delay binding so the opening gesture doesn't immediately close.
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', onPointer)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef, closeOnOutsideClick, closeOnEsc])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={popupRef}
      role="dialog"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 'var(--z-popup, 60)',
        opacity: pos ? 1 : 0,
        transition: 'opacity 120ms ease',
        ...style,
      }}
    >
      {children}
    </div>,
    document.body
  )
}
