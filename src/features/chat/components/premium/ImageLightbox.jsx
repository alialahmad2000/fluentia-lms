import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { X, Download } from 'lucide-react'
import { popIn } from '../../lib/motion'

// Fullscreen image lightbox for the premium group chat.
// Gestures (iPhone-safe):
//   • double-tap / double-click  → toggle 2× zoom (anchored to the tap point)
//   • drag (while zoomed)        → pan the image
//   • swipe down (while at 1×)   → dismiss; backdrop fades with drag distance
//   • swipe left / right         → page between images (when images.length > 1)
//   • Escape                     → close
//
// Props:
//   images       : string[]  — resolved URL strings (1 or more)
//   index        : number    — starting index (default 0)
//   senderName   : string    — Arabic display name, tinted with senderColor
//   senderColor  : string    — hex string (saturated mid-tone) for the name tint
//   onClose      : () => void
export default function ImageLightbox({ images = [], index = 0, senderName, senderColor, onClose }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
  const total = safeImages.length
  const startIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))

  const [current, setCurrent] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)

  // Drag tracking for the active image (pan when zoomed, swipe-dismiss/page at 1×).
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  // Backdrop opacity tracks vertical drag distance (swipe-down to dismiss).
  const backdropOpacity = useTransform(y, [-240, 0, 240], [0.55, 1, 0.55])

  const lastTapRef = useRef(0)
  const dragStartedRef = useRef(false)

  // Lock body scroll while mounted; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Reset transforms whenever the active image or zoom state changes.
  useEffect(() => {
    x.set(0)
    y.set(0)
  }, [current, zoomed, x, y])

  const goTo = useCallback((next) => {
    if (total < 2) return
    const clamped = (next + total) % total
    setZoomed(false)
    setCurrent(clamped)
  }, [total])

  // Escape closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowLeft') goTo(current + 1)   // RTL: left = next
      else if (e.key === 'ArrowRight') goTo(current - 1)  // RTL: right = prev
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goTo, current])

  const toggleZoom = useCallback(() => {
    setZoomed((z) => !z)
  }, [])

  // Double-tap / double-click detection (works on touch + pointer).
  const handleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 280) {
      toggleZoom()
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }, [toggleZoom])

  const handleDragEnd = useCallback((_e, info) => {
    if (zoomed) return // while zoomed, drag is a free pan — keep position
    const { offset, velocity } = info
    // Swipe down to dismiss.
    if (offset.y > 120 || velocity.y > 800) {
      onClose?.()
      return
    }
    // Horizontal paging (RTL: drag right→prev, drag left→next).
    if (total > 1 && Math.abs(offset.x) > 80 && Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x > 0) goTo(current - 1)
      else goTo(current + 1)
      return
    }
    // Snap back.
    x.set(0)
    y.set(0)
  }, [zoomed, total, current, goTo, onClose, x, y])

  if (total === 0) return null

  const activeUrl = safeImages[current]
  const tint = senderColor || 'var(--ds-accent-primary)'

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="image-lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 80,
          height: '100dvh',
          direction: 'rtl',
        }}
      >
        {/* Backdrop — opacity tracks vertical drag distance */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'rgba(6,14,28,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            opacity: backdropOpacity,
          }}
          onClick={onClose}
        />

        {/* Close button — top, logical inline-start */}
        <button
          onMouseDown={(e) => { e.preventDefault(); onClose?.() }}
          onClick={(e) => e.stopPropagation()}
          aria-label="إغلاق"
          className="absolute flex items-center justify-center rounded-full"
          style={{
            zIndex: 4,
            top: 'calc(14px + env(safe-area-inset-top, 0px))',
            insetInlineStart: 'calc(14px + env(safe-area-inset-left, 0px))',
            width: 40,
            height: 40,
            color: 'var(--ds-text-primary)',
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 70%, transparent)',
            border: '1px solid color-mix(in srgb, white 14%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 6px 18px -6px rgba(0,0,0,0.5)',
          }}
        >
          <X size={20} />
        </button>

        {/* Active image — popIn entrance, draggable, double-tap to zoom */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={`${current}:${activeUrl}`}
            src={activeUrl}
            alt={senderName ? `صورة من ${senderName}` : 'صورة'}
            {...popIn}
            drag
            dragElastic={zoomed ? 0.2 : 0.5}
            dragMomentum={false}
            onDragStart={() => { dragStartedRef.current = true }}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              e.stopPropagation()
              // Suppress the tap that follows a drag gesture.
              if (dragStartedRef.current) { dragStartedRef.current = false; return }
              handleTap()
            }}
            style={{
              x,
              y,
              position: 'relative',
              zIndex: 2,
              maxWidth: '94vw',
              maxHeight: '82dvh',
              objectFit: 'contain',
              borderRadius: 14,
              cursor: zoomed ? 'grab' : 'zoom-in',
              scale: zoomed ? 2 : 1,
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              boxShadow: '0 24px 70px -18px rgba(0,0,0,0.7)',
            }}
            draggable={false}
            transition={{ scale: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
          />
        </AnimatePresence>

        {/* Bottom bar — sender name, download, dots (safe-area padded) */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pt-5"
          style={{
            zIndex: 4,
            paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(to top, rgba(6,14,28,0.82), transparent)',
            pointerEvents: 'none',
          }}
        >
          {/* Paging dots + index */}
          {total > 1 && (
            <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); goTo(i) }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`الصورة ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? 22 : 7,
                    height: 7,
                    background: i === current
                      ? 'var(--ds-text-primary)'
                      : 'color-mix(in srgb, var(--ds-text-primary) 35%, transparent)',
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4" style={{ pointerEvents: 'auto' }}>
            {senderName && (
              <span
                className="text-[13px] font-semibold truncate"
                style={{
                  fontFamily: 'Tajawal, sans-serif',
                  color: tint,
                  maxWidth: '50vw',
                  letterSpacing: '0.01em',
                }}
              >
                {senderName}
              </span>
            )}

            {total > 1 && (
              <span
                className="text-[12px] font-medium tabular-nums"
                style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-tertiary)' }}
              >
                {current + 1} / {total}
              </span>
            )}

            <a
              href={activeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="تنزيل الصورة"
              className="flex items-center justify-center rounded-full"
              style={{
                width: 38,
                height: 38,
                color: 'var(--ds-accent-primary)',
                background: 'color-mix(in srgb, var(--ds-accent-primary) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 32%, transparent)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Download size={17} />
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
