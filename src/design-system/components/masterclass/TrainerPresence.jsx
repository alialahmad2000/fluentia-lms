import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MOTION } from './_motion'

const SIZE_PX = { sm: 36, md: 48, lg: 64 }

function getInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

export default function TrainerPresence({
  trainerName,
  avatarUrl,
  hasUnread = false,
  lastSeenMinutesAgo,
  onClick,
  position = 'inline',
  size = 'md',
  className = '',
}) {
  const reducedMotion = useReducedMotion()
  const [showTooltip, setShowTooltip] = useState(false)
  const px = SIZE_PX[size] || SIZE_PX.md

  const isRecent = lastSeenMinutesAgo != null && lastSeenMinutesAgo <= 10

  const container = {
    position: position === 'floating' ? 'fixed' : 'relative',
    bottom: position === 'floating' ? 'var(--space-6)' : undefined,
    insetInlineStart: position === 'floating' ? 'var(--space-6)' : undefined,
    zIndex: position === 'floating' ? 1000 : undefined,
    display: 'inline-block',
  }

  return (
    <div className={className} style={container}>
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`${trainerName}${hasUnread ? ' — لديك رسائل جديدة' : ''}`}
        style={{
          position: 'relative',
          width: px,
          height: px,
          borderRadius: 'var(--radius-full)',
          border: hasUnread ? '2px solid var(--ds-accent-primary)' : '2px solid var(--ds-border-subtle)',
          padding: 0,
          background: 'transparent',
          cursor: onClick ? 'pointer' : 'default',
          outline: 'none',
          display: 'block',
        }}
      >
        {/* Pulse ring when hasUnread */}
        {hasUnread && !reducedMotion && (
          <motion.span
            aria-hidden="true"
            animate={{ scale: MOTION.pulse.scale, opacity: [0.6, 0, 0.6] }}
            transition={{ duration: MOTION.pulse.duration, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--ds-sky)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Avatar image or initials */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={trainerName}
            style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            borderRadius: 'var(--radius-full)',
            background: 'var(--ds-surface-2)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.floor(px * 0.35),
            fontWeight: 700,
            color: 'var(--ds-accent-primary)',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            {getInitials(trainerName)}
          </span>
        )}

        {/* Unread gold dot */}
        {hasUnread && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              insetInlineEnd: 0,
              width: 10,
              height: 10,
              borderRadius: 'var(--radius-full)',
              background: 'var(--ds-accent-gold)',
              border: '2px solid var(--ds-bg-base)',
            }}
          />
        )}

        {/* Online indicator */}
        {isRecent && !hasUnread && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 0,
              insetInlineEnd: 0,
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              background: 'var(--ds-accent-success)',
              border: '2px solid var(--ds-bg-base)',
            }}
          />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: 'var(--ds-bg-elevated)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: 12,
            whiteSpace: 'nowrap',
            color: 'var(--ds-text-secondary)',
            fontFamily: "'Tajawal', sans-serif",
            boxShadow: 'var(--ds-shadow-md)',
            direction: 'rtl',
            pointerEvents: 'none',
          }}
        >
          {trainerName}{hasUnread ? ' — جديد لديك' : ''}
        </div>
      )}
    </div>
  )
}
