import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'

export default function PlaceholderPage({
  icon: Icon,
  eyebrow,
  headline,
  lines = [],
  phaseLabel,
  children,
}) {
  return (
    <section
      dir="rtl"
      style={{
        maxWidth: 820,
        margin: '24px auto 0',
        textAlign: 'center',
      }}
    >
      {Icon && (
        <div
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--ds-sky) 22%, transparent), color-mix(in srgb, var(--ds-amber) 14%, transparent))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-sky)',
            marginBottom: 22,
            border: '1px solid var(--ds-border-subtle)',
          }}
        >
          <Icon size={32} strokeWidth={1.6} />
        </div>
      )}

      {eyebrow && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          color: 'var(--ds-amber)',
          textTransform: 'uppercase',
          marginBottom: 10,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          {eyebrow}
        </div>
      )}

      <h2 style={{
        fontSize: 'clamp(28px, 4.2vw, 44px)',
        fontWeight: 900,
        color: 'var(--ds-text-primary)',
        lineHeight: 1.2,
        marginBottom: 20,
        letterSpacing: '-0.02em',
        fontFamily: "'Tajawal', sans-serif",
      }}>
        {headline}
      </h2>

      {lines.length > 0 && (
        <div style={{ maxWidth: 640, margin: '0 auto 32px' }}>
          <NarrativeReveal lines={lines} delayBetweenLines={1400} />
        </div>
      )}

      {children}

      {phaseLabel && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 36,
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--ds-surface-1)',
          border: '1px solid var(--ds-border-subtle)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--ds-text-tertiary)',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--ds-amber)',
            boxShadow: '0 0 8px var(--ds-amber)',
            flexShrink: 0,
          }} aria-hidden="true" />
          {phaseLabel}
        </div>
      )}
    </section>
  )
}
