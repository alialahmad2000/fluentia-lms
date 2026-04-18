export default function BriefNextPreview({ nextUnit }) {
  if (!nextUnit) return null

  return (
    <div style={{
      background: 'var(--ds-surface-1)',
      border: '1px solid var(--ds-border-subtle)',
      borderRadius: '14px',
      padding: 'clamp(14px, 3vw, 20px)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        flexShrink: 0,
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 900,
        color: 'var(--ds-text-tertiary)',
        fontFamily: "'Inter', sans-serif",
        filter: 'blur(1px)',
      }}>
        {nextUnit.unit_number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', marginBottom: '4px', letterSpacing: '0.5px' }}>
          الوحدة القادمة بعد إكمالك
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text-secondary)', filter: 'blur(2px)', userSelect: 'none' }}>
          {nextUnit.theme_ar || nextUnit.theme_en}
        </div>
      </div>
      <div style={{ fontSize: '18px', flexShrink: 0, opacity: 0.3 }}>🔒</div>
    </div>
  )
}
