import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function XPCounter({ value = 0, showDelta = true }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [delta, setDelta] = useState(null)
  const [flashing, setFlashing] = useState(false)
  const prevValueRef = useRef(value)
  const animFrameRef = useRef(null)
  const deltaKeyRef = useRef(0)

  // Animate counting from old value to new value
  const animateCount = useCallback((from, to) => {
    const duration = 600
    const startTime = performance.now()

    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplayValue(current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    const prev = prevValueRef.current
    if (value !== prev) {
      const diff = value - prev

      // Trigger gold flash
      setFlashing(true)
      setTimeout(() => setFlashing(false), 400)

      // Show delta float
      if (showDelta && diff > 0) {
        deltaKeyRef.current += 1
        setDelta({ amount: diff, key: deltaKeyRef.current })
      }

      // Animate the number
      animateCount(prev, value)
      prevValueRef.current = value
    }
  }, [value, showDelta, animateCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // Format number to Arabic-friendly display
  const formatted = displayValue.toLocaleString('ar-EG')

  return (
    <div className="relative inline-flex items-center gap-1" dir="ltr">
      <motion.span
        className={`font-bold text-lg tabular-nums ${flashing ? 'number-flash' : ''}`}
        style={{
          color: flashing ? 'var(--accent-gold)' : 'var(--text-primary)',
          transition: 'color 0.3s',
        }}
        animate={flashing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        {formatted}
      </motion.span>

      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--accent-sky)' }}
      >
        XP
      </span>

      {/* Floating +N XP delta */}
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.key}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -30, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="xp-float absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none font-bold text-sm whitespace-nowrap"
            style={{ color: 'var(--accent-gold)' }}
          >
            +{delta.amount} XP
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
