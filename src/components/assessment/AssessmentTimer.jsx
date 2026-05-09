import { motion } from 'framer-motion'
import { Clock, AlertTriangle } from 'lucide-react'
import { useAssessmentTimer } from '../../hooks/useAssessmentTimer'

const STATUS_STYLES = {
  idle:     { bg: 'var(--ds-bg-glass)',                       fg: 'var(--ds-text-muted)',     ring: 'transparent' },
  safe:     { bg: 'var(--ds-bg-glass)',                       fg: 'var(--ds-text-primary)',   ring: 'var(--ds-border-subtle)' },
  warning:  { bg: 'var(--ds-amber-50, var(--ds-bg-glass))',   fg: 'var(--ds-amber-500)',      ring: 'var(--ds-amber-500)' },
  critical: { bg: 'var(--ds-orange-50, var(--ds-bg-glass))',  fg: 'var(--ds-orange-500)',     ring: 'var(--ds-orange-500)' },
  final:    { bg: 'var(--ds-rose-50, var(--ds-bg-glass))',    fg: 'var(--ds-rose-500)',       ring: 'var(--ds-rose-500)' },
  expired:  { bg: 'var(--ds-rose-100, var(--ds-bg-glass))',   fg: 'var(--ds-rose-600)',       ring: 'var(--ds-rose-500)' },
}

export default function AssessmentTimer({ startedAt, timeLimitSeconds, onExpire }) {
  const { formatted, status } = useAssessmentTimer(startedAt, timeLimitSeconds, onExpire)
  const styles = STATUS_STYLES[status]

  return (
    <motion.div
      role="timer"
      aria-live={status === 'final' ? 'assertive' : 'polite'}
      aria-label={`الوقت المتبقي ${formatted}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: status === 'final' ? [1, 1.04, 1] : 1,
      }}
      transition={{
        duration: 0.3,
        scale: { duration: 1, repeat: status === 'final' ? Infinity : 0 },
      }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: '0.75rem 1.25rem',
        borderRadius: 'var(--ds-radius-lg, 12px)',
        background: styles.bg,
        color: styles.fg,
        border: `1.5px solid ${styles.ring}`,
        backdropFilter: 'blur(10px)',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)',
        fontWeight: 600,
        fontSize: 'var(--ds-text-lg, 1.125rem)',
        boxShadow: status === 'final' ? `0 0 0 4px color-mix(in srgb, ${styles.ring} 20%, transparent)` : 'none',
        marginBottom: 'var(--ds-space-4, 1rem)',
      }}
    >
      {status === 'final' || status === 'critical' ? (
        <AlertTriangle size={18} aria-hidden="true" />
      ) : (
        <Clock size={18} aria-hidden="true" />
      )}
      <span>{formatted}</span>
      {status === 'warning' && (
        <span style={{ fontSize: 'var(--ds-text-sm, 0.875rem)', fontWeight: 400, marginInlineStart: '0.5rem' }}>
          باقي وقت قليل
        </span>
      )}
      {status === 'final' && (
        <span style={{ fontSize: 'var(--ds-text-sm, 0.875rem)', fontWeight: 500, marginInlineStart: '0.5rem' }}>
          أنهي الإجابة سريعاً
        </span>
      )}
    </motion.div>
  )
}
