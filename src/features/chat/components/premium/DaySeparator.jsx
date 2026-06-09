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
    return { text: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }), isArabic: true }
  }
  return { text: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }), isArabic: true }
}

export default function DaySeparator({ date }) {
  const { text } = formatDayLabel(date)

  return (
    <motion.div
      {...fadeRise}
      className="flex items-center justify-center gap-0 my-7 px-6"
      style={{ direction: 'rtl' }}
    >
      {/* short brass-tinted hairline rail (capped so the label anchors the centre) */}
      <div className="flex-1 h-px" style={{ maxWidth: 84, background: 'linear-gradient(to left, color-mix(in srgb, var(--ds-accent-gold) 14%, transparent) 0%, transparent 100%)' }} />

      {/* المجلس — plain label on the rails (prototype style, no pill) */}
      <span
        className="shrink-0 select-none px-4"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.16em',
          fontFamily: 'Tajawal, sans-serif',
          color: 'color-mix(in srgb, var(--ds-accent-gold) 60%, transparent)',
          fontFeatureSettings: '"tnum"',
        }}
      >
        {text}
      </span>

      {/* short brass-tinted hairline rail */}
      <div className="flex-1 h-px" style={{ maxWidth: 84, background: 'linear-gradient(to right, color-mix(in srgb, var(--ds-accent-gold) 14%, transparent) 0%, transparent 100%)' }} />
    </motion.div>
  )
}
