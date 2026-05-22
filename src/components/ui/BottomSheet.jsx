// MEGA-FIX V2 Phase D — Shared bottom-sheet primitive.
//
// Always portals to document.body. Spans the full viewport bottom
// regardless of sidebar (sheets are mobile/tablet idiom; on desktop
// the sidebar still occupies its strip but the sheet takes precedence
// via z-modal, and a backdrop covers the rest).

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function BottomSheet({
  open,
  onClose,
  children,
  ariaLabel,
  maxHeight = '80vh',
  className = '',
  backdropClassName = '',
}) {
  // Body scroll lock + Escape to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        className={backdropClassName}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 'var(--z-modal, 70)',
          opacity: 1,
          transition: 'opacity 200ms ease',
        }}
      />
      <div
        role="dialog"
        aria-label={ariaLabel}
        className={className}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight,
          background: 'var(--ds-card, var(--bg-card, #0a1628))',
          color: 'var(--ds-text-primary, var(--text-primary, #f8fafc))',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 'calc(var(--z-modal, 70) + 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: 'translate3d(0,0,0)',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
