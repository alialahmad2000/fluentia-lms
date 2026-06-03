import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import './premiumDashboard.css'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Premium Dashboard, shared presentational primitives.
 *
 * Pure view helpers — no data. They give the production dashboard one
 * consistent, refined visual language built on the design-system
 * `--ds-*` tokens. The accent is used as a precious material, not paint.
 * ------------------------------------------------------------------ */

export const APPLE_EASE = [0.16, 1, 0.3, 1]

/* Deterministic spark field (no Math.random → stable across renders). */
const SPARK_COLORS = ['--av-c1', '--av-c3', '--av-c1', '--av-c1']
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const c = `var(${SPARK_COLORS[i % SPARK_COLORS.length]})`
  return {
    left: `${(7 + i * 6.3) % 95}%`,
    bottom: `${5 + (i * 13) % 68}%`,
    size: i % 3 === 0 ? 4 : 3,
    color: c,
    animationDuration: `${9 + (i % 6) * 1.4}s`,
    animationDelay: `-${(i * 1.1).toFixed(1)}s`,
  }
})

/* AmbientField — a FULL-BLEED living "Aurora Veil" portaled to <body> so
 * it fills the whole screen (not just the centred content column). Drifting
 * jewel-tone light fields + a slowly rotating multi-hue halo + floating
 * sparks. Mounts/unmounts with the dashboard; pauses on hidden tab; all
 * motion + perf trimming lives in premiumDashboard.css. */
export function AmbientField() {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`av${paused ? ' is-paused' : ''}`} aria-hidden="true">
      <div className="av__base" />
      <div className="av__halo" />
      <div className="av__blob av__blob--1" />
      <div className="av__blob av__blob--2" />
      <div className="av__blob av__blob--3" />
      <div className="av__blob av__blob--4" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="av__spark"
          style={{
            left: s.left,
            bottom: s.bottom,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 8px 1px ${s.color}`,
            animationDuration: s.animationDuration,
            animationDelay: s.animationDelay,
          }}
        />
      ))}
      <div className="av__vig" />
    </div>,
    document.body
  )
}

/* An editorial section eyebrow: a small gradient spark, an uppercase
 * tracked label, a hairline rule that runs to the edge, optional hint. */
export function SectionLabel({ children, hint }) {
  return (
    <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 3,
          borderRadius: 3,
          flex: '0 0 auto',
          background: 'linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-secondary))',
          boxShadow: '0 0 12px var(--ds-accent-primary-glow)',
        }}
      />
      <h2
        style={{
          margin: 0,
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ds-text-secondary)',
          flex: '0 0 auto',
        }}
      >
        {children}
      </h2>
      <span className="pd-eyebrow__rule" aria-hidden="true" />
      {hint ? (
        <span
          className="truncate"
          style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontWeight: 500, flex: '0 0 auto' }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/* A staggered section wrapper: fades + lifts its block into view once. */
export function Band({ children, delay = 0, className = '', style }) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      className={className}
      style={{ position: 'relative', zIndex: 1, ...style }}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      animate={reduced ? { opacity: 1 } : undefined}
      viewport={{ once: true, margin: '-50px' }}
      transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay }}
    >
      {children}
    </motion.section>
  )
}
