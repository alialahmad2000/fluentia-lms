import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const STATUS_STYLE = {
  past: { bg: 'var(--ds-accent-primary)', border: 'var(--ds-accent-primary)', text: 'var(--ds-text-inverse)' },
  current: { bg: 'var(--ds-surface-2)', border: 'var(--ds-accent-primary)', text: 'var(--ds-accent-primary)' },
  future: { bg: 'transparent', border: 'var(--ds-border-subtle)', text: 'var(--ds-text-tertiary)' },
  locked: { bg: 'transparent', border: 'var(--ds-border-subtle)', text: 'var(--ds-text-tertiary)' },
}

function WeekNode({ week, onClick, isHorizontal, index }) {
  const reducedMotion = useReducedMotion()
  const style = STATUS_STYLE[week.status] || STATUS_STYLE.future
  const isClickable = week.status === 'past' || week.status === 'current'
  const isCurrent = week.status === 'current'
  const hasMilestone = !!week.milestone
  const isLocked = week.status === 'locked'

  return (
    <motion.button
      initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => isClickable && onClick?.(week.weekNumber)}
      disabled={isLocked}
      aria-label={`الأسبوع ${week.weekNumber}: ${week.title}${week.status === 'locked' ? ' (مقفل)' : ''}`}
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-full)',
        background: style.bg,
        border: `2px solid ${hasMilestone ? 'var(--ds-accent-gold)' : style.border}`,
        boxShadow: isCurrent ? 'var(--ds-shadow-glow)' : 'none',
        cursor: isClickable ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: hasMilestone ? 'var(--ds-accent-gold)' : style.text,
        fontFamily: "'IBM Plex Sans', sans-serif",
        flexShrink: 0,
        outline: 'none',
        transition: 'box-shadow var(--motion-base) var(--ease-out)',
      }}
    >
      {isLocked ? '🔒' : week.weekNumber}
      {isCurrent && !reducedMotion && (
        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: 'var(--radius-full)',
            border: '2px solid var(--ds-accent-primary)',
            pointerEvents: 'none',
          }}
        />
      )}
      {week.bandAtEnd != null && (
        <span style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9,
          color: 'var(--ds-text-tertiary)',
          whiteSpace: 'nowrap',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          {week.bandAtEnd}
        </span>
      )}
    </motion.button>
  )
}

export default function JourneyTimeline({
  currentWeek = 1,
  weeks = [],
  onWeekClick,
  orientation,
  className = '',
}) {
  const [isVertical, setIsVertical] = useState(orientation === 'vertical' || (typeof window !== 'undefined' && window.innerWidth < 640))

  useEffect(() => {
    if (orientation) return
    const check = () => setIsVertical(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [orientation])

  const isH = !isVertical

  return (
    <div
      className={className}
      style={{
        overflowX: isH ? 'auto' : undefined,
        padding: 'var(--space-5)',
      }}
      role="list"
      aria-label="رحلة الأسابيع"
    >
      <div style={{
        display: 'flex',
        flexDirection: isH ? 'row' : 'column',
        alignItems: isH ? 'center' : 'flex-start',
        gap: 0,
        minWidth: isH ? 'max-content' : undefined,
        position: 'relative',
      }}>
        {weeks.map((week, i) => (
          <div
            key={week.weekNumber}
            role="listitem"
            style={{
              display: 'flex',
              flexDirection: isH ? 'column' : 'row',
              alignItems: 'center',
              gap: isH ? 'var(--space-2)' : 'var(--space-3)',
            }}
          >
            {/* Connector line before */}
            {i > 0 && (
              <div style={{
                background: week.status === 'past' ? 'var(--ds-accent-primary)' : 'var(--ds-border-subtle)',
                ...(isH
                  ? { width: 24, height: 2, order: -1 }
                  : { width: 2, height: 20, alignSelf: 'flex-start', marginInlineStart: 15 }),
              }} />
            )}

            <WeekNode week={week} onClick={onWeekClick} isHorizontal={isH} index={i} />

            {/* Week title below node */}
            <span style={{
              fontSize: 10,
              color: week.status === 'current' ? 'var(--ds-accent-primary)' : 'var(--ds-text-tertiary)',
              fontFamily: "'Tajawal', sans-serif",
              maxWidth: isH ? 48 : undefined,
              textAlign: 'center',
              lineHeight: 1.3,
            }}>
              {week.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
