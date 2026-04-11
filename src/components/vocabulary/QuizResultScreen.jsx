import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Clock, Zap, RefreshCw, X, Maximize2, AlertTriangle } from 'lucide-react'
import WordDetailModal from './WordDetailModal'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} ثانية`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Final screen after a quiz completes.
 */
export default function QuizResultScreen({
  correctCount,
  totalQuestions,
  durationSeconds,
  xpAwarded,
  wrongWords, // full word objects for missed questions
  onRetry,
  onClose,
  onReviewWord,
  studentId,
}) {
  const [detailWord, setDetailWord] = useState(null)
  const [detailInitialTab, setDetailInitialTab] = useState('meaning')

  const openDetail = (word, tab = 'meaning') => {
    setDetailInitialTab(tab)
    setDetailWord(word)
    if (typeof onReviewWord === 'function') {
      try { onReviewWord(word) } catch {}
    }
  }

  const ratio = totalQuestions > 0 ? correctCount / totalQuestions : 0
  const percent = Math.round(ratio * 100)

  const tone = ratio === 1 ? 'gold' : ratio >= 0.8 ? 'sky' : ratio >= 0.5 ? 'emerald' : 'rose'
  const toneMap = {
    gold: 'text-amber-400',
    sky: 'text-sky-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  }
  const headline =
    ratio === 1
      ? 'أداء مثالي! 🏆'
      : ratio >= 0.8
        ? 'عمل ممتاز! 🎯'
        : ratio >= 0.5
          ? 'جيد — استمر!'
          : 'تحتاج لمراجعة أكثر'

  return (
    <div dir="rtl" className="max-w-xl mx-auto flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 sm:p-8 text-center"
      >
        <Trophy size={44} className={`mx-auto mb-3 ${toneMap[tone]}`} />
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
          {headline}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-5">
          أنجزت الاختبار — راجع النتائج أدناه
        </p>

        <div className="flex items-center justify-center gap-1 mb-5">
          <span className={`text-5xl font-extrabold ${toneMap[tone]}`}>{correctCount}</span>
          <span className="text-xl text-[var(--text-muted)]">/ {totalQuestions}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">الدقة</div>
            <div className={`text-sm font-semibold ${toneMap[tone]}`}>{percent}%</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)] mb-1 flex items-center justify-center gap-1">
              <Clock size={11} /> الوقت
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {formatDuration(durationSeconds)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)] mb-1 flex items-center justify-center gap-1">
              <Zap size={11} /> XP
            </div>
            <div className="text-sm font-semibold text-amber-400">+{xpAwarded}</div>
          </div>
        </div>
      </motion.div>

      {wrongWords && wrongWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            الكلمات التي أخطأت فيها ({wrongWords.length})
          </h3>
          <div className="space-y-2.5">
            {wrongWords.map((w) => {
              const hasHighAlert = w.pronunciation_alert?.severity === 'high'
              return (
                <button
                  key={w.id}
                  onClick={() => openDetail(w, 'meaning')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-sky-400/30 hover:bg-white/5 transition-colors text-right"
                >
                  <span
                    className="font-semibold text-[var(--text-primary)] min-w-[100px] text-left"
                    dir="ltr"
                  >
                    {w.word}
                  </span>
                  <span className="flex-1 text-xs text-[var(--text-muted)] truncate text-right">
                    {w.definition_ar}
                  </span>
                  {hasHighAlert && (
                    <span
                      className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDetail(w, 'pronunciation')
                      }}
                      role="button"
                      aria-label="تنبيه نطق"
                    >
                      <AlertTriangle size={13} className="animate-pulse" />
                    </span>
                  )}
                  <Maximize2 size={14} className="text-[var(--text-muted)] shrink-0" />
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRetry}
          className="flex-1 h-11 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:border-sky-400/40 transition-colors"
        >
          <RefreshCw size={15} />
          حاول مرة أخرى
        </button>
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <X size={15} />
          إغلاق
        </button>
      </div>

      <WordDetailModal
        word={detailWord}
        studentId={studentId}
        isOpen={!!detailWord}
        onClose={() => setDetailWord(null)}
        initialTab={detailInitialTab}
      />
    </div>
  )
}
