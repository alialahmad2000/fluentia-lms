import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Mic, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useGradingQueue } from '@/hooks/trainer/useGradingQueue'
import { CommandCard } from '@/design-system/trainer'
import SubmissionReviewModal from '@/components/trainer/grading/SubmissionReviewModal'
import './GradingStationPage.css'

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'writing', label: 'كتابة' },
  { id: 'speaking', label: 'محادثة' },
  { id: 'urgent', label: '⚠️ متأخر' },
]

function TypeIcon({ type }) {
  if (type === 'speaking') return <Mic size={14} className="gs-row__type-icon gs-row__type-icon--speaking" />
  return <PenLine size={14} className="gs-row__type-icon gs-row__type-icon--writing" />
}

function formatHours(h) {
  if (!h) return '—'
  if (h < 1) return 'أقل من ساعة'
  if (h < 24) return `${Math.floor(h)}س`
  return `${Math.floor(h / 24)} يوم`
}

function QueueSkeleton() {
  return (
    <div className="gs-skeleton">
      {[1, 2, 3, 4].map(i => <div key={i} className="gs-skeleton__row" />)}
    </div>
  )
}

export default function GradingStationPage() {
  const navigate = useNavigate()
  const { data: queue = [], isLoading } = useGradingQueue(100)
  const [filter, setFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)

  const filtered = queue.filter(item => {
    if (filter === 'writing') return item.submission_type === 'writing'
    if (filter === 'speaking') return item.submission_type === 'speaking'
    if (filter === 'urgent') return item.is_urgent
    return true
  })

  const urgentCount = queue.filter(i => i.is_urgent).length

  return (
    <div className="gs-page" dir="rtl">
      {/* Header */}
      <div className="gs-header">
        <div className="gs-header__title-row">
          <h1 className="gs-header__title">محطة التصحيح</h1>
          {queue.length > 0 && (
            <span className="gs-header__badge">{queue.length}</span>
          )}
        </div>
        {urgentCount > 0 && (
          <div className="gs-header__urgent">
            <AlertCircle size={14} />
            {urgentCount} {urgentCount === 1 ? 'تسليم متأخر أكثر من 48 ساعة' : 'تسليمات متأخرة أكثر من 48 ساعة'}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="gs-filters">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`gs-filter ${filter === f.id ? 'gs-filter--active' : ''}`}
          >
            {f.label}
            {f.id === 'urgent' && urgentCount > 0 && (
              <span className="gs-filter__count">{urgentCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Queue */}
      {isLoading ? (
        <QueueSkeleton />
      ) : filtered.length === 0 ? (
        <CommandCard className="gs-empty">
          <CheckCircle size={40} className="gs-empty__icon" />
          <h3 className="gs-empty__title">
            {filter === 'all' ? 'لا توجد تسليمات معلقة' : `لا توجد تسليمات ${FILTERS.find(f=>f.id===filter)?.label}`}
          </h3>
          <p className="gs-empty__sub">
            {filter === 'all' ? 'ممتاز! كل التسليمات مصححة.' : 'جرّب تصفية مختلفة.'}
          </p>
        </CommandCard>
      ) : (
        <div className="gs-list">
          <AnimatePresence mode="popLayout">
            {filtered.map(item => (
              <motion.div
                key={item.submission_id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CommandCard
                  className={`gs-row ${item.is_urgent ? 'gs-row--urgent' : ''}`}
                  as="button"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="gs-row__left">
                    <TypeIcon type={item.submission_type} />
                    <div className="gs-row__info">
                      <div className="gs-row__name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.student_name}
                        {item.student_id && (
                          <button
                            style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '0.3rem', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); navigate(`/trainer/student/${item.student_id}`) }}
                            title="ملف الطالب ٣٦٠"
                          >
                            ٣٦٠
                          </button>
                        )}
                      </div>
                      <div className="gs-row__meta">
                        {item.group_name} · {item.unit_title || 'وحدة غير محددة'}
                      </div>
                    </div>
                  </div>
                  <div className="gs-row__right">
                    <div className="gs-row__ai-score">
                      {item.ai_score > 0 ? `${item.ai_score}/10` : '—'}
                    </div>
                    <div className={`gs-row__age ${item.is_urgent ? 'gs-row__age--urgent' : ''}`}>
                      <Clock size={11} />
                      {formatHours(item.hours_pending)}
                    </div>
                    <span className="gs-row__cta">مراجعة ←</span>
                  </div>
                </CommandCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {selectedItem && (
          <SubmissionReviewModal
            item={selectedItem}
            queue={filtered}
            onClose={() => setSelectedItem(null)}
            onAdvance={(next) => setSelectedItem(next || null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
