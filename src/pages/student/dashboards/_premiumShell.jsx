import { motion, useReducedMotion } from 'framer-motion'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Premium Dashboard, shared presentational primitives.
 *
 * These are PURE view helpers — no data, no fetching. They give the
 * production dashboard one consistent, refined visual language built on
 * the design-system `--ds-*` tokens (so dark / light / theme switches
 * all "just work"). Spacing, depth and motion are intentional and
 * restrained — gold (`--ds-accent-primary`) is used sparingly.
 * ------------------------------------------------------------------ */

export const APPLE_EASE = [0.16, 1, 0.3, 1]

/* Page-scoped ambient gradient. Lives BEHIND the content, inside the
 * app's <main> (so it never fights the global layout). GPU-only
 * transform/opacity drift; fully static under reduced-motion. */
export function AmbientField() {
  const reduced = useReducedMotion()
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: '-10% -10% auto -10%',
        height: 'clamp(420px, 60vh, 760px)',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={false}
        animate={reduced ? undefined : { x: ['0%', '3%', '-2%', '0%'], y: ['0%', '-2%', '2%', '0%'] }}
        transition={
          reduced ? undefined : { duration: 64, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }
        }
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(48% 60% at 78% 0%, var(--ds-accent-primary-glow), transparent 70%),' +
            'radial-gradient(52% 64% at 18% 8%, color-mix(in srgb, var(--ds-aurora-2, #5a4a8c) 40%, transparent), transparent 72%)',
          opacity: 'var(--ds-aurora-opacity, 0.18)',
          willChange: 'transform',
          filter: 'saturate(120%)',
        }}
      />
    </div>
  )
}

/* A quiet, uppercase mono section label with a short gold tick. RTL-safe
 * (the tick sits at the inline-start edge). */
export function SectionLabel({ children, hint }) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{ marginBottom: 'var(--space-4)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          aria-hidden="true"
          style={{
            width: 18,
            height: 2,
            borderRadius: 2,
            flex: '0 0 auto',
            background: 'var(--ds-accent-primary)',
            boxShadow: '0 0 10px var(--ds-accent-primary-glow)',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ds-text-secondary)',
          }}
        >
          {children}
        </h2>
      </div>
      {hint ? (
        <span
          className="truncate"
          style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/* A staggered section wrapper: fades + lifts its block into view once.
 * Use for every major band so the page assembles itself calmly. */
export function Band({ children, delay = 0, className = '', style }) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      className={className}
      style={{ position: 'relative', zIndex: 1, ...style }}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      animate={reduced ? { opacity: 1 } : undefined}
      viewport={{ once: true, margin: '-40px' }}
      transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay }}
    >
      {children}
    </motion.section>
  )
}
