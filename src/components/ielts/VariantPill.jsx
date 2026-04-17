import { memo } from 'react'

const CONFIG = {
  academic:         { label: 'أكاديمي', bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8' },
  general_training: { label: 'عام',     bg: 'rgba(168,85,247,0.12)',  color: '#a855f7' },
}

export const VariantPill = memo(function VariantPill({ variant, size = 'sm' }) {
  if (!variant) {
    return <span style={{ color: 'var(--text-muted)', fontSize: size === 'sm' ? 11 : 13 }}>—</span>
  }
  const cfg = CONFIG[variant] || CONFIG.academic
  return (
    <span style={{
      display: 'inline-block',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 700,
      borderRadius: 999,
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontFamily: 'Tajawal',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
})
