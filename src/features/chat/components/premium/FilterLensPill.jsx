import { motion } from 'framer-motion'

export default function FilterLensPill({ lens, isActive, count, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-all"
      style={{
        background: isActive
          ? 'color-mix(in srgb, var(--ds-accent-gold) 12%, transparent)'
          : 'color-mix(in srgb, var(--ds-bg-elevated) 80%, transparent)',
        border: isActive
          ? '1px solid color-mix(in srgb, var(--ds-accent-gold) 45%, transparent)'
          : '1px solid var(--ds-border-subtle)',
        color: isActive ? 'var(--ds-accent-gold)' : 'var(--ds-text-secondary)',
        backdropFilter: 'blur(12px)',
        fontSize: 13,
        fontFamily: 'Tajawal, sans-serif',
        minHeight: 32,
      }}
    >
      <span style={{ fontSize: 14 }}>{lens.icon}</span>
      <span>{lens.label}</span>
      {count > 0 && (
        <span
          className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums"
          style={{
            background: isActive
              ? 'color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)'
              : 'var(--ds-surface-glass)',
            color: isActive ? 'var(--ds-accent-gold)' : 'var(--ds-text-muted)',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </motion.button>
  )
}
