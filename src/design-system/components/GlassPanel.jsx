import { forwardRef } from 'react'

const PADDING_MAP = { sm: 'var(--space-4)', md: 'var(--space-5)', lg: 'var(--space-6)', xl: 'var(--space-7)' }

const GlassPanel = forwardRef(function GlassPanel(
  { elevation = 1, padding = 'md', glow = false, hover = false, className = '', style, children, ...rest },
  ref
) {
  const baseStyles = {
    background: `var(--ds-surface-${elevation})`,
    border: '1px solid var(--ds-border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: PADDING_MAP[padding] || PADDING_MAP.md,
    transition: `all var(--motion-base) var(--ease-out)`,
    ...style,
  }

  const hoverClass = hover ? 'ds-glass-hover' : ''
  const glowClass = glow ? 'ds-glass-glow' : ''

  return (
    <>
      <div
        ref={ref}
        className={`ds-glass-panel ${hoverClass} ${glowClass} ${className}`.trim()}
        style={baseStyles}
        {...rest}
      >
        {children}
      </div>
      <style>{`
        :where([data-theme="aurora-cinematic"]) .ds-glass-panel,
        :where([data-theme="night"]) .ds-glass-panel {
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
        }
        .ds-glass-hover:hover {
          transform: translateY(-2px);
          border-color: var(--ds-border-strong) !important;
        }
        .ds-glass-glow:hover {
          box-shadow: var(--ds-shadow-glow);
        }
      `}</style>
    </>
  )
})

export default GlassPanel
