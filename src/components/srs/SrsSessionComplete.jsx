import { motion } from 'framer-motion'
import { Flame, Sparkles, Trophy, Clock } from 'lucide-react'
import { useG } from '../../i18n/gender'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * Session summary screen. Subtle premium confetti — no cheesy bouncing.
 */
export default function SrsSessionComplete({
  totalReviewed = 0,
  correctCount = 0,
  xpGained = 0,
  elapsedSec = 0,
  streak = 0,
  newRecord = false,
  hasMoreCards = false,
  onClose,
  onExtra,
}) {
  const g = useG()
  const accuracyPct = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0
  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60

  // 18 confetti pieces — drift down with stagger, max 1.6s. Subtle.
  const pieces = Array.from({ length: 18 })

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 text-center relative overflow-hidden" dir="rtl">
      {/* Confetti layer */}
      <div className="absolute inset-0 pointer-events-none">
        {pieces.map((_, i) => {
          const left = Math.random() * 100
          const delay = Math.random() * 0.4
          const color = ['var(--accent-gold, #fbbf24)', 'var(--accent-violet, #a78bfa)', 'var(--accent-sky, #38bdf8)', 'var(--accent-emerald, #34d399)'][i % 4]
          return (
            <motion.span
              key={i}
              initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
              animate={{ y: 600, opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: 1.6, delay, ease: 'easeIn' }}
              className="absolute block"
              style={{
                left: `${left}%`,
                top: 0,
                width: 6,
                height: 10,
                background: color,
                borderRadius: 2,
              }}
            />
          )
        })}
      </div>

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6 z-10"
        style={{ background: 'var(--accent-gold-glow, rgba(251,191,36,0.15))' }}
      >
        <Trophy size={36} strokeWidth={1.5} style={{ color: 'var(--accent-gold, #fbbf24)' }} />
      </motion.div>

      <motion.h2
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-2xl font-bold font-['Tajawal'] z-10 mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        أحسنت! خلصت الجلسة
      </motion.h2>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="text-sm font-['Tajawal'] mb-8 z-10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {g('راجعت', 'راجعتِ')} {toArabicNum(totalReviewed)} كلمة بدقة {toArabicNum(accuracyPct)}٪
      </motion.p>

      {/* Stats grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md w-full mb-8 z-10"
      >
        <Stat icon={Sparkles} value={toArabicNum(totalReviewed)} label="كلمة" color="var(--accent-violet, #a78bfa)" />
        <Stat icon={Trophy} value={`${toArabicNum(accuracyPct)}٪`} label="دقة" color="var(--accent-gold, #fbbf24)" />
        <Stat
          icon={Flame}
          value={toArabicNum(streak)}
          label={newRecord ? 'يوم — رقم قياسي!' : 'يوم'}
          color={newRecord ? 'var(--accent-gold, #fbbf24)' : 'rgb(251,113,133)'}
        />
        <Stat icon={Clock} value={`${toArabicNum(minutes)}:${String(seconds).padStart(2, '0')}`} label="دقيقة" color="var(--accent-sky, #38bdf8)" />
      </motion.div>

      {xpGained > 0 && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-sm font-semibold font-['Tajawal'] mb-6 z-10"
          style={{ color: 'var(--accent-gold, #fbbf24)' }}
        >
          +{toArabicNum(xpGained)} XP
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-sm z-10"
      >
        <button
          onClick={onClose}
          className="fl-btn-primary flex-1 px-6 py-3 text-sm font-['Tajawal']"
        >
          العودة للوحة
        </button>
        {hasMoreCards && (
          <button
            onClick={onExtra}
            className="flex-1 px-6 py-3 rounded-xl text-sm font-bold font-['Tajawal'] transition-all"
            style={{
              background: 'var(--surface-raised, rgba(255,255,255,0.05))',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
            }}
          >
            مراجعة إضافية
          </button>
        )}
      </motion.div>
    </div>
  )
}

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        background: 'var(--surface-raised, rgba(255,255,255,0.04))',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      }}
    >
      <Icon size={18} style={{ color }} className="mx-auto mb-2" />
      <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[11px] mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
    </div>
  )
}
