import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MOTION } from './_motion'

export default function ChapterTransition({
  chapterNumber,
  chapterTitle,
  totalChapters = 4,
  duration = 5000,
  onComplete,
}) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState('chapter') // 'chapter' | 'title' | 'bar'
  const [visible, setVisible] = useState(true)
  const timers = useRef([])

  useEffect(() => {
    const push = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t) }

    if (reducedMotion) {
      push(() => { setVisible(false); onComplete?.() }, 400)
      return
    }

    push(() => setPhase('title'), 1000)
    push(() => setPhase('bar'), 1200)
    push(() => setVisible(false), duration - 400)
    push(() => onComplete?.(), duration)

    return () => timers.current.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        timers.current.forEach(clearTimeout)
        setVisible(false)
        onComplete?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.chapter.duration, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'var(--ds-reveal-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-5)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Chapter ${chapterNumber}: ${chapterTitle}`}
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              margin: 0,
              fontSize: 14,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ds-text-tertiary)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            CHAPTER {chapterNumber} OF {totalChapters}
          </motion.p>

          <AnimatePresence>
            {(phase === 'title' || phase === 'bar') && (
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  margin: 0,
                  fontSize: 'clamp(36px, 8vw, 72px)',
                  fontWeight: 700,
                  fontFamily: "'Tajawal', sans-serif",
                  color: 'var(--ds-reveal-text)',
                  textAlign: 'center',
                  direction: 'rtl',
                }}
              >
                {chapterTitle}
              </motion.h2>
            )}
          </AnimatePresence>

          <div style={{ width: 'min(400px, 80vw)', height: 2, background: 'var(--ds-border-subtle)', borderRadius: 'var(--radius-full)', marginTop: 'var(--space-5)' }}>
            <AnimatePresence>
              {phase === 'bar' && (
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: MOTION.chapter.progressDuration / 1000, ease: 'linear' }}
                  style={{
                    height: '100%',
                    background: 'var(--ds-accent-primary)',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--ds-shadow-glow)',
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          <p style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--ds-text-tertiary)',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            اضغط ESC للتخطي
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
