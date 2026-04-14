import GlassPanel from './GlassPanel'

const ACCENT_COLORS = {
  primary: 'var(--ds-accent-primary)',
  gold: 'var(--ds-accent-gold)',
  success: 'var(--ds-accent-success)',
  warning: 'var(--ds-accent-warning)',
  danger: 'var(--ds-accent-danger)',
}

export default function PremiumCard({
  header,
  children,
  footer,
  accent,
  elevation = 1,
  hover = true,
  className = '',
  style,
  ...rest
}) {
  const accentColor = accent ? ACCENT_COLORS[accent] : null

  return (
    <GlassPanel
      elevation={elevation}
      hover={hover}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {/* Accent strip */}
      {accentColor && (
        <div
          className="absolute top-0 bottom-0"
          style={{
            insetInlineStart: 0,
            width: 3,
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        />
      )}

      {header && (
        <div style={{ marginBlockEnd: 'var(--space-3)' }}>{header}</div>
      )}

      <div>{children}</div>

      {footer && (
        <div style={{ marginBlockStart: 'var(--space-4)', borderTop: '1px solid var(--ds-border-subtle)', paddingBlockStart: 'var(--space-3)' }}>
          {footer}
        </div>
      )}
    </GlassPanel>
  )
}
