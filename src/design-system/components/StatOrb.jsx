import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const GLOW_MAP = {
  primary: 'var(--ds-accent-primary-glow)',
  gold: 'rgba(251, 191, 36, 0.35)',
  success: 'rgba(74, 222, 128, 0.3)',
}

export default function StatOrb({ label, value, icon, trend, glow = 'primary', className = '' }) {
  const reducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (reducedMotion || typeof value !== 'number') {
      setDisplayValue(value)
      return
    }
    let frame
    const start = performance.now()
    const duration = 800
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(eased * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reducedMotion])

  const glowColor = GLOW_MAP[glow] || GLOW_MAP.primary

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--ds-surface-1)',
          border: '1px solid var(--ds-border-subtle)',
          boxShadow: `0 0 24px ${glowColor}`,
        }}
      >
        {icon && <span style={{ color: 'var(--ds-accent-primary)' }}>{icon}</span>}
      </div>

      <span
        ref={ref}
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--ds-text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayValue}
      </span>

      {label && (
        <span style={{ fontSize: 13, color: 'var(--ds-text-tertiary)' }}>{label}</span>
      )}

      {trend && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: trend.startsWith('+') ? 'var(--ds-accent-success)' : 'var(--ds-accent-danger)',
          }}
        >
          {trend}
        </span>
      )}
    </motion.div>
  )
}
