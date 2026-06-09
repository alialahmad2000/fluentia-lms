import { motion } from 'framer-motion'
import { fadeRise } from '../../lib/motion'

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  // compare by CALENDAR date (midnight-to-midnight) — matches dayKey() in the
  // stream, so yesterday-afternoon reads "أمس", never a duplicate "اليوم"
  const midnight = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((midnight(now) - midnight(d)) / 86400000)

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
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.14em',
          fontFamily: 'Tajawal, sans-serif',
          color: 'color-mix(in srgb, var(--ds-accent-gold) 46%, transparent)',
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
