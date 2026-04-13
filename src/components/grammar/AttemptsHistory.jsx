import { useState } from 'react'
import { History, ChevronDown } from 'lucide-react'
import { useFadeIn } from './useFadeIn'

const TYPE_LABELS = {
  fill_blank: 'أكمل الفراغ',
  choose: 'اختيار من متعدد',
  error_correction: 'صحّح الخطأ',
  reorder: 'رتّب الكلمات',
  transform: 'حوّل الجملة',
  make_question: 'كوّن سؤالاً',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  return d.toLocaleDateString('ar-SA', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AttemptsHistory({ allAttempts, exercises }) {
  const ref = useFadeIn()
  const [expanded, setExpanded] = useState(false)
  const [viewingId, setViewingId] = useState(null)

  const completed = allAttempts.filter(a => a.status === 'completed')
  if (completed.length <= 1) return null

  return (
    <div ref={ref} className="grammar-glass grammar-fade-in overflow-hidden mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-card-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-2">
          <History size={16} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
            جميع المحاولات ({completed.length})
          </span>
        </div>
        <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="pt-3 space-y-1">
            {completed.map(row => (
              <div key={row.id}>
                <button
                  onClick={() => setViewingId(viewingId === row.id ? null : row.id)}
                  className="w-full flex items-center gap-3 text-xs py-2 px-2 rounded-lg transition-colors font-['Tajawal']"
                >
                  <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>محاولة {row.attempt_number || 1}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{row.score != null ? `${Math.round(row.score)}%` : '—'}</span>
                  <span style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>{timeAgo(row.completed_at)}</span>
                  {row.is_best && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--warning-bg)', color: 'var(--accent-gold)', border: '1px solid var(--warning-border)' }}
                    >
                      الأفضل
                    </span>
                  )}
                  {row.is_latest && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--info-bg)', color: 'var(--accent-sky)', border: '1px solid var(--info-border)' }}
                    >
                      الأحدث
                    </span>
                  )}
                  <ChevronDown
                    size={12}
                    className={`mr-auto transition-transform ${viewingId === row.id ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </button>

                {/* Inline read-only answers */}
                {viewingId === row.id && row.answers?.exercises && (
                  <div
                    className="mx-2 mb-2 p-3 rounded-lg space-y-1.5"
                    style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
                  >
                    {row.answers.exercises.map((ex, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="mt-0.5" style={{ color: ex.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                          {ex.isCorrect ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <span className="font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>{TYPE_LABELS[ex.type] || ex.type} — </span>
                          <span className="font-['Inter']" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                            {typeof ex.studentAnswer === 'string' ? ex.studentAnswer : JSON.stringify(ex.studentAnswer)}
                          </span>
                          {!ex.isCorrect && ex.correctAnswer && (
                            <span className="font-['Inter'] mr-2" dir="ltr" style={{ color: 'var(--success)', opacity: 0.7 }}> → {ex.correctAnswer}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
