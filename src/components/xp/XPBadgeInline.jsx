/**
 * XPBadgeInline — tiny pill for placement inside button labels.
 * Usage: <button>تسليم الكتابة <XPBadgeInline amount={5} /></button>
 */
export default function XPBadgeInline({ amount = 0 }) {
  return (
    <span
      aria-label={`يمنح ${amount} نقطة خبرة`}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: 6,
        padding: '1px 5px',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: 'Tajawal, sans-serif',
        borderRadius: 99,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        background: 'var(--ds-xp-gold-bg, rgba(245,200,66,0.14))',
        border: '1px solid var(--ds-xp-gold-border, rgba(245,200,66,0.32))',
        color: 'var(--ds-xp-gold-fg, #f5c842)',
        verticalAlign: 'middle',
      }}
    >
      +{amount} XP
    </span>
  )
}
