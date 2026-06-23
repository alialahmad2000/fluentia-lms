import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const GLOW_MAP = {
  primary: 'var(--ds-accent-primary-glow)',
  gold: 'rgba(251, 191, 36, 0.35)',
  success: 'rgba(74, 222, 128, 0.3)',
}
/* per-glow tint (icon) + low-alpha fill (orb interior) so each orb reads
   as a lit glass jewel rather than a flat disc — explicit rgba, iOS-safe */
const TINT_MAP = {
  primary: 'var(--ds-accent-primary)',
  gold: '#fbbf24',
  success: '#4ade80',
}
const FILL_MAP = {
  primary: 'rgba(56, 189, 248, 0.16)',
  gold: 'rgba(251, 191, 36, 0.18)',
  success: 'rgba(74, 222, 128, 0.16)',
}

export default function StatOrb({ label, value, icon, trend, caption, glow = 'primary', className = '' }) {
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
  const tint = TINT_MAP[glow] || TINT_MAP.primary
  const fill = FILL_MAP[glow] || FILL_MAP.primary

  return (
    <motion.div
      className={`flex flex-col items-center gap-1.5 ${className}`}
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
          background: `radial-gradient(120% 120% at 50% 22%, ${fill}, var(--ds-surface-1))`,
          border: '1px solid var(--ds-border-subtle)',
          boxShadow: `0 10px 26px -8px ${glowColor}, 0 0 22px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
      >
        {icon && <span style={{ color: tint, display: 'flex' }}>{icon}</span>}
      </div>

      <span
        ref={ref}
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--ds-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 4,
        }}
      >
        {displayValue}
      </span>

      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-secondary)' }}>{label}</span>
      )}

      {caption && (
        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ds-text-tertiary)' }}>{caption}</span>
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
