import { motion } from 'framer-motion'
import { Lock, Play, Check, Brain } from 'lucide-react'

/**
 * Single chunk card in the selector grid.
 * Shows chunk number, word range, progress bar, status icon, and action buttons.
 */
export default function ChunkCard({ chunk, onPractice, onQuiz }) {
  const {
    index,
    startIdx,
    endIdx,
    words,
    masteredCount,
    passingCount,
    unlocked,
    complete,
    status,
    matchesFilter = true,
  } = chunk

  const total = words.length
  const percent = total > 0 ? Math.round((passingCount / total) * 100) : 0
  const dimmed = !matchesFilter

  const borderClass = complete
    ? 'border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
    : !unlocked
      ? 'border-[var(--border-subtle)]'
      : 'border-[var(--border-subtle)] hover:border-sky-400/60'

  const statusIcon = !unlocked ? (
    <Lock size={14} className="text-[var(--text-muted)]" />
  ) : complete ? (
    <Check size={14} className="text-sky-400" />
  ) : (
    <Play size={14} className="text-sky-400 fill-sky-400" />
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: dimmed ? 0.4 : unlocked ? 1 : 0.55, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`relative p-4 rounded-2xl border bg-[var(--surface-raised)] transition-all ${borderClass} ${
        !unlocked ? 'cursor-not-allowed' : ''
      }`}
      title={!unlocked ? 'أكمل 80% من الدفعة السابقة' : undefined}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Brain size={14} className="text-sky-400 opacity-70" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            الدفعة {index + 1}
          </span>
        </div>
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)]">
          {statusIcon}
        </div>
      </div>

      {/* Word range */}
      <div className="text-xs text-[var(--text-muted)] mb-3">
        الكلمات {startIdx + 1}-{endIdx + 1}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-1.5 rounded-full bg-[var(--surface-base)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-sky-400 to-sky-500"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-[var(--text-muted)]">
          <span>
            {masteredCount}/{total} متقنة
          </span>
          <span>{percent}%</span>
        </div>
      </div>

      {/* Actions */}
      {unlocked ? (
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          <button
            onClick={() => onPractice?.(chunk)}
            className="h-9 rounded-xl text-xs font-medium bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors"
          >
            تدريب
          </button>
          <button
            onClick={() => onQuiz?.(chunk)}
            className="h-9 rounded-xl text-xs font-medium bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-400/40 transition-colors"
          >
            اختبار
          </button>
        </div>
      ) : (
        <div className="mt-3 h-9 rounded-xl bg-[var(--surface-base)] flex items-center justify-center text-[11px] text-[var(--text-muted)]">
          أكمل 80% من الدفعة السابقة
        </div>
      )}
    </motion.div>
  )
}
