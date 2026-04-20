import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export default function WeekReveal({
  weekNumber,
  title,
  description,
  goals = [],
  onDismiss,
  open = false,
}) {
  const reducedMotion = useReducedMotion()
  const firstFocusRef = useRef(null)
  const lastFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    firstFocusRef.current?.focus()

    const trapFocus = (e) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === firstFocusRef.current) {
          e.preventDefault()
          lastFocusRef.current?.focus()
        }
      } else {
        if (document.activeElement === lastFocusRef.current) {
          e.preventDefault()
          firstFocusRef.current?.focus()
        }
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') onDismiss?.() }

    document.addEventListener('keydown', trapFocus)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      document.removeEventListener('keydown', onEsc)
      prev?.focus?.()
    }
  }, [open, onDismiss])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onDismiss}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9000,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-5)',
              pointerEvents: 'none',
            }}
          >
            <div
              dir="rtl"
              style={{
                background: 'var(--ds-bg-elevated)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-7)',
                maxWidth: 520,
                width: '100%',
                boxShadow: 'var(--ds-shadow-lg)',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-5)',
              }}
            >
              {/* Week number */}
              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: 80,
                  fontWeight: 900,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--ds-accent-primary)',
                  lineHeight: 1,
                  display: 'block',
                }}>
                  {weekNumber}
                </span>
                <h2 style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                  color: 'var(--ds-text-primary)',
                }}>
                  {title}
                </h2>
              </div>

              {/* Description */}
              <p style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.8,
                color: 'var(--ds-text-secondary)',
                fontFamily: "'Tajawal', sans-serif",
              }}>
                {description}
              </p>

              {/* Goals */}
              {goals.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {goals.map((goal, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                      <span style={{ color: 'var(--ds-accent-primary)', fontSize: 16, flexShrink: 0, marginTop: 2 }}>✓</span>
                      <span style={{ fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6 }}>{goal}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA */}
              <button
                ref={firstFocusRef}
                onClick={onDismiss}
                style={{
                  padding: 'var(--space-4) var(--space-6)',
                  background: 'var(--ds-accent-primary)',
                  color: 'var(--ds-text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'opacity var(--motion-fast) var(--ease-out)',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ابدأ الأسبوع ←
              </button>

              <button
                ref={lastFocusRef}
                onClick={onDismiss}
                aria-label="إغلاق"
                style={{
                  position: 'absolute',
                  top: 'var(--space-4)',
                  insetInlineEnd: 'var(--space-4)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-text-tertiary)',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
