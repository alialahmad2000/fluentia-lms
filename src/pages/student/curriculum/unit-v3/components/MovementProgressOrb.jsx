import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { V3_MOTION } from '../_v3Tokens'
import { useG } from '@/i18n/gender'

// Small circular arc — fillRatio rendered as a stroke-dashoffset on a 64px ring.
// Sits in the movement panel header to summarize per-movement progress.
export default function MovementProgressOrb({ fillRatio, accent, completed, total }) {
  const g = useG()
  const reduce = useReducedMotion()
  const size = 64
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r

  const dashOffset = useMemo(() => circ * (1 - Math.max(0, Math.min(1, fillRatio))), [circ, fillRatio])

  const label = total > 0
    ? `${g('أنجزت', 'أنجزتِ')} ${completed} من ${total} في هذه المرحلة`
    : 'لا أنشطة في هذه المرحلة'

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--ds-border-subtle)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={reduce ? V3_MOTION.reducedMotionFallback : { ...V3_MOTION.compassDraw, delay: 0.3 }}
        />
      </svg>
      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          fontSize: '14px',
          color: 'var(--ds-text-primary)',
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {completed}<span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>/{total}</span>
      </div>
    </div>
  )
}
