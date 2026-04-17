import { Flame } from 'lucide-react'

const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const SIZE = {
  sm: { fontSize: 10, padding: '2px 6px', gap: 3, iconSize: 10 },
  md: { fontSize: 12, padding: '3px 8px', gap: 4, iconSize: 12 },
}

export default function XPBadge({ amount = 0, variant = 'default', size = 'md' }) {
  const s = SIZE[size] ?? SIZE.md
  const isBonus = variant === 'bonus' || amount >= 15

  return (
    <span
      aria-label={`يمنح ${amount} نقطة خبرة`}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 800,
        fontFamily: 'Tajawal, sans-serif',
        borderRadius: 99,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        background: isBonus
          ? 'linear-gradient(135deg, var(--ds-xp-gold-bg, rgba(245,200,66,0.18)) 0%, var(--ds-xp-gold-bg, rgba(251,146,60,0.12)) 100%)'
          : 'var(--ds-xp-gold-bg, rgba(245,200,66,0.12))',
        border: `1px solid var(--ds-xp-gold-border, rgba(245,200,66,0.35))`,
        color: 'var(--ds-xp-gold-fg, #f5c842)',
        transition: REDUCED ? 'none' : 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!REDUCED) e.currentTarget.style.boxShadow = '0 0 8px var(--ds-xp-gold-border, rgba(245,200,66,0.4))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {isBonus && <Flame size={s.iconSize} style={{ color: 'var(--ds-xp-gold-fg, #f5c842)', flexShrink: 0 }} />}
      +{amount} XP
    </span>
  )
}
