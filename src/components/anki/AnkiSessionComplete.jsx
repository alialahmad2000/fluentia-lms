import { motion } from 'framer-motion'
import { Trophy, Clock, Target, Calendar } from 'lucide-react'

/**
 * Shown after the queue is exhausted.
 */
export default function AnkiSessionComplete({ stats, onExit }) {
  const minutes = Math.floor((stats.durationSec || 0) / 60)
  const seconds = (stats.durationSec || 0) % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div dir="rtl" className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-emerald-500/20 flex items-center justify-center">
            <Trophy size={38} className="text-amber-400" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal']">
            خلصت مراجعة اليوم! 🎉
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1">
            استمر يوم آخر للحفاظ على سلسلتك
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            icon={<Target size={16} className="text-emerald-400" />}
            label="راجعتها"
            value={stats.reviewed}
          />
          <StatBlock
            icon={<span className="text-sky-400 text-xs font-bold">%</span>}
            label="الدقة"
            value={`${stats.accuracy}%`}
          />
          <StatBlock
            icon={<Clock size={16} className="text-amber-400" />}
            label="الوقت"
            value={timeLabel}
          />
        </div>

        {stats.dueCountTomorrow > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] font-['Tajawal'] pt-1">
            <Calendar size={14} />
            بكرة عندك {stats.dueCountTomorrow} مراجعة
          </div>
        )}

        <button
          onClick={onExit}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold font-['Tajawal']"
        >
          تمام
        </button>
      </motion.div>
    </div>
  )
}

function StatBlock({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-3">
      <div className="flex items-center justify-center mb-1.5">{icon}</div>
      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] mt-0.5">{label}</div>
    </div>
  )
}
