// RetentionCard — base surface for all retention-module cards.
// Wraps GlassPanel with a tonal accent stripe that varies per module so a student
// can recognise at a glance which module a card belongs to.
//
// Uses the actual design-system tokens (var(--ds-*) for colours, var(--radius-*)
// for rounding, var(--space-*) for spacing — note these do NOT use the ds- prefix).

import { motion } from 'framer-motion'
import GlassPanel from '../components/GlassPanel.jsx'

const MODULE_ACCENTS = {
  daily_partner:     { tone: 'var(--ds-accent-primary)',   glow: 'var(--ds-accent-primary-glow)' },
  smart_homework:    { tone: 'var(--ds-accent-secondary)', glow: 'var(--ds-accent-primary-glow)' },
  weekly_reports:    { tone: 'var(--ds-accent-gold)',      glow: 'var(--ds-accent-primary-glow)' },
  streak_activation: { tone: 'var(--ds-accent-success)',   glow: 'var(--ds-accent-primary-glow)' },
  lesson_briefs:     { tone: 'var(--ds-amber)',            glow: 'var(--ds-accent-primary-glow)' },
  default:           { tone: 'var(--ds-border-strong)',    glow: 'transparent' },
}

export default function RetentionCard({
  moduleKey,
  title,
  subtitle,
  badge,
  icon,
  children,
  footer,
  onClick,
  className = '',
  variant = 'default',
}) {
  const accent = MODULE_ACCENTS[moduleKey] || MODULE_ACCENTS.default
  const isInteractive = typeof onClick === 'function'

  const handleKeyDown = (e) => {
    if (!isInteractive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(e)
    }
  }

  return (
    <motion.div
      whileHover={isInteractive ? { y: -2 } : undefined}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`relative ${className}`}
    >
      <GlassPanel
        elevation={1}
        padding="lg"
        hover={isInteractive}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        className="text-right cursor-default"
        style={{
          cursor: isInteractive ? 'pointer' : 'default',
          boxShadow:
            variant === 'featured'
              ? `var(--ds-shadow-md), 0 24px 40px -16px ${accent.glow}`
              : undefined,
        }}
      >
        {/* Accent stripe — top edge */}
        <span
          aria-hidden
          className="absolute top-0 right-0 left-0"
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${accent.tone}, transparent)`,
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
          }}
        />

        {/* Header row */}
        {(title || icon || badge) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h3
                  className="text-lg md:text-xl font-bold leading-tight"
                  style={{ color: 'var(--ds-text-primary)' }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: 'var(--ds-text-secondary)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {(icon || badge) && (
              <div className="flex items-center gap-2 shrink-0">
                {badge && (
                  <span
                    className="px-3 py-1 text-xs font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${accent.tone} 18%, transparent)`,
                      color: accent.tone,
                      border: `1px solid color-mix(in srgb, ${accent.tone} 35%, transparent)`,
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {badge}
                  </span>
                )}
                {icon && (
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      background: `color-mix(in srgb, ${accent.tone} 14%, transparent)`,
                      color: accent.tone,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {icon}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {children && (
          <div style={{ color: 'var(--ds-text-secondary)' }}>{children}</div>
        )}

        {/* Footer */}
        {footer && (
          <div
            className="mt-5 pt-4"
            style={{ borderTop: '1px solid var(--ds-border-subtle)' }}
          >
            {footer}
          </div>
        )}
      </GlassPanel>
    </motion.div>
  )
}
