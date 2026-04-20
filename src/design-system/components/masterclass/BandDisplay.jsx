import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MOTION } from './_motion'

const SIZE_MAP = {
  sm: { fontSize: 24, labelSize: 12 },
  md: { fontSize: 48, labelSize: 13 },
  lg: { fontSize: 72, labelSize: 14 },
  xl: { fontSize: 120, labelSize: 16 },
}

function useBandAnimation(target, animate) {
  const reducedMotion = useReducedMotion()
  const [displayed, setDisplayed] = useState(animate && !reducedMotion ? 0 : target)
  const frame = useRef(null)

  useEffect(() => {
    if (!animate || reducedMotion || target == null) {
      setDisplayed(target)
      return
    }
    const start = performance.now()
    const dur = MOTION.bandAnimate.duration * 1000
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplayed(+(ease * target).toFixed(1))
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => frame.current && cancelAnimationFrame(frame.current)
  }, [target, animate, reducedMotion])

  return displayed
}

function DeltaIndicator({ delta }) {
  if (!delta || delta === 0) return null
  const positive = delta > 0
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      fontSize: 14,
      fontWeight: 700,
      color: positive ? 'var(--ds-sky)' : 'var(--ds-amber)',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {Math.abs(delta).toFixed(1)}
    </span>
  )
}

export default function BandDisplay({
  band = null,
  size = 'lg',
  label,
  delta,
  animate = false,
  variant = 'numeric',
  comparisonBand,
  className = '',
}) {
  const { fontSize, labelSize } = SIZE_MAP[size] || SIZE_MAP.lg
  const displayed = useBandAnimation(band, animate)

  const bandText = band == null ? '—' : displayed?.toFixed(1) ?? '—'
  const compText = comparisonBand == null ? '—' : comparisonBand.toFixed(1)

  if (variant === 'comparison') {
    return (
      <div
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-4)' }}
        aria-label={`Band ${band} to ${comparisonBand}`}
      >
        <span style={{
          fontSize,
          fontWeight: 900,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--ds-text-secondary)',
          lineHeight: 1,
        }}>
          {bandText}
        </span>
        <span style={{
          fontSize: Math.max(24, fontSize * 0.35),
          color: 'var(--ds-sky)',
          fontWeight: 700,
        }} aria-hidden="true">→</span>
        <span style={{
          fontSize,
          fontWeight: 900,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--ds-accent-primary)',
          lineHeight: 1,
        }}>
          {compText}
        </span>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      {label && (
        <span style={{
          fontSize: labelSize,
          color: 'var(--ds-text-tertiary)',
          fontFamily: "'Tajawal', sans-serif",
          fontWeight: 500,
        }}>
          {label}
        </span>
      )}
      <motion.span
        style={{
          fontSize,
          fontWeight: 900,
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--ds-accent-primary)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        aria-label={`Band score: ${bandText}`}
      >
        {bandText}
      </motion.span>
      {delta != null && <DeltaIndicator delta={delta} />}
    </div>
  )
}
