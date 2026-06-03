import { motion, useReducedMotion } from 'framer-motion'
import './premiumDashboard.css'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Premium Dashboard, shared presentational primitives.
 *
 * Pure view helpers — no data, no fetching. They give the production
 * dashboard one consistent, refined visual language built on the
 * design-system `--ds-*` tokens (so night / aurora / minimal all just
 * work). Spacing, depth and motion are intentional and restrained;
 * the accent is used as a precious material, not a coat of paint.
 * ------------------------------------------------------------------ */

export const APPLE_EASE = [0.16, 1, 0.3, 1]

/* Page-scoped ambient field — a dual-temperature wash that lives BEHIND
 * the whole dashboard. A warm primary bloom crowns the hero; cool
 * secondary/teal blooms drift through the lower page. This is the layer
 * that makes the background feel composed rather than flat. All motion
 * + perf trimming lives in premiumDashboard.css. */
export function AmbientField() {
  return (
    <div className="pd-atmo" aria-hidden="true">
      <div className="pd-atmo__beam" />
      <div className="pd-atmo__bloom pd-atmo__bloom--gold" />
      <div className="pd-atmo__bloom pd-atmo__bloom--violet" />
      <div className="pd-atmo__bloom pd-atmo__bloom--teal" />
      <div className="pd-atmo__horizon" />
    </div>
  )
}

/* An editorial section eyebrow: a small gradient spark, an uppercase
 * tracked label, a hairline rule that runs to the edge, and an optional
 * hint. RTL-safe — the spark sits at the inline-start edge. */
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

/* A staggered section wrapper: fades + lifts its block into view once, so
 * the page assembles itself calmly as the student scrolls. */
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
