import { motion } from 'framer-motion'
import { fadeRise } from '../../lib/motion'

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)

  if (diffDays === 0) return { text: 'اليوم', isArabic: true }
  if (diffDays === 1) return { text: 'أمس', isArabic: true }
  if (diffDays < 7) {
    return { text: d.toLocaleDateString('ar-SA', { weekday: 'long' }), isArabic: true }
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameYear) {
    // e.g. "٥ مايو" — numeric day + Arabic month
    return { text: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }), isArabic: true }
  }
  return { text: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }), isArabic: true }
}

export default function DaySeparator({ date }) {
  const { text } = formatDayLabel(date)

  return (
    <motion.div
      {...fadeRise}
      className="flex items-center gap-0 my-6 px-6"
      style={{ direction: 'rtl' }}
    >
      {/* Left gradient rail */}
      <div
        className="flex-1 h-px"
        style={{
          background: 'linear-gradient(to left, var(--ds-border-subtle) 0%, transparent 100%)',
        }}
      />

      {/* Glass pill */}
      <div
        className="shrink-0 select-none"
        style={{
          background: 'color-mix(in srgb, var(--ds-bg-elevated) 70%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          fontFamily: 'Tajawal, sans-serif',
          color: 'var(--ds-text-secondary)',
          fontFeatureSettings: '"tnum"',
          boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, white 4%, transparent)',
        }}
      >
        {text}
      </div>

      {/* Right gradient rail */}
      <div
        className="flex-1 h-px"
        style={{
          background: 'linear-gradient(to right, var(--ds-border-subtle) 0%, transparent 100%)',
        }}
      />
    </motion.div>
  )
}
