import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, History, ChevronDown, Trophy, Star } from 'lucide-react'

function formatDateAr(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Shared attempts panel used by all practice activity tabs (Reading, Listening, etc).
// Props:
//   allAttempts   — array of student_curriculum_progress rows, ordered attempt_number DESC
//   onRetry       — callback when student clicks retry
//   isAssessment  — when true, hides the retry button (final assessments are single-attempt)
//   accentColor   — optional CSS color string for the accent (default: sky blue)
export default function AttemptsHistoryPanel({
  allAttempts = [],
  onRetry,
  isAssessment = false,
  accentColor = '#38bdf8',
}) {
  const [expanded, setExpanded] = useState(false)

  const completed = allAttempts.filter(a => a.status === 'completed' && !a.is_phantom)
  if (completed.length === 0) return null

  const latest = completed.find(a => a.is_latest) || completed[0]
  const best   = completed.find(a => a.is_best) || completed.reduce((b, r) => (r.score || 0) > (b.score || 0) ? r : b, completed[0])
  const prior  = completed.filter(a => !a.is_latest)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header strip — best attempt */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Trophy size={16} style={{ color: accentColor }} />
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            أفضل درجة: {best.score ?? '—'}%
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-['Tajawal']"
            style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}>
            محاولة {best.attempt_number}
          </span>
          {best.is_latest && best.is_best && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-['Tajawal']">
              الأحدث
            </span>
          )}
          {latest.attempt_number !== best.attempt_number && (
            <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">
              · آخر محاولة: {latest.score ?? '—'}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {prior.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[11px] font-['Tajawal'] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <History size={12} />
              جميع المحاولات ({completed.length})
              <ChevronDown
                size={12}
                className="transition-transform"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          )}

          {!isAssessment && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-['Tajawal'] transition-all"
              style={{
                color: accentColor,
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}44`,
              }}
            >
              <RotateCcw size={12} />
              محاولة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Expandable history */}
      <AnimatePresence>
        {expanded && prior.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] pt-2 pb-1">المحاولات السابقة</p>
              {completed.map(row => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 py-1.5 text-xs font-['Tajawal']"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="font-medium w-16">محاولة {row.attempt_number}</span>
                  <span className="font-bold w-10" style={{ color: row.is_best ? '#d4af37' : 'var(--text-secondary)' }}>
                    {row.score ?? '—'}%
                  </span>
                  {row.is_best && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                      <Star size={8} className="fill-current" />
                      الأفضل
                    </span>
                  )}
                  {row.is_latest && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                      الأحدث
                    </span>
                  )}
                  <span className="text-[var(--text-muted)] mr-auto" dir="ltr">
                    {formatDateAr(row.completed_at)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
