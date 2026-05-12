import { motion } from 'framer-motion'
import { fadeRise } from '../../lib/motion'

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)

  if (diffDays === 0) return 'اليوم'
  if (diffDays === 1) return 'أمس'
  if (diffDays < 7) {
    return d.toLocaleDateString('ar-SA', { weekday: 'long' })
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
  })
}

export default function DaySeparator({ date }) {
  return (
    <motion.div
      {...fadeRise}
      className="flex items-center gap-3 my-8 px-4"
      style={{ direction: 'rtl' }}
    >
      <div className="flex-1 h-px bg-[var(--ds-border-subtle)]" />
      <span
        className="text-xs text-[var(--ds-text-muted)] px-3 py-1 rounded-full shrink-0"
        style={{
          fontFamily: 'Tajawal, sans-serif',
          background: 'var(--ds-surface-glass)',
          border: '1px solid var(--ds-border-subtle)',
        }}
      >
        {formatDayLabel(date)}
      </span>
      <div className="flex-1 h-px bg-[var(--ds-border-subtle)]" />
    </motion.div>
  )
}
