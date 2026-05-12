// IELTS V3 Phase 5a — Bank of Lessons (Library)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight } from 'lucide-react'
import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useErrorStats, useErrorList, useDueErrors, useImprovementTips, SKILL_LABELS } from './useErrorBank'

const NARRATIVE_LINES = ['بنك الدروس.', 'كل خطأ — درس.', 'كل مراجعة — خطوة.']

const STATUS_OPTIONS = [
  { key: 'all',        label: 'الكل' },
  { key: 'unreviewed', label: 'غير مراجعة' },
  { key: 'review',     label: 'قيد المراجعة' },
  { key: 'mastered',   label: 'أتقنتها' },
]
const SORT_OPTIONS = [
  { key: 'due',    label: 'مستحقة أولاً' },
  { key: 'newest', label: 'الأحدث' },
  { key: 'oldest', label: 'الأقدم' },
]

function StatCard({ label, value, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, minWidth: 100, padding: '14px 16px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)', backdropFilter: 'blur(6px)', cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 900, color: accent || 'var(--ds-text)', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value ?? '—'}</span>
    </div>
  )
}

function ErrorCard({ item, onReview }) {
  const isRL = item.skill_type === 'reading' || item.skill_type === 'listening'
  const dueDate = item.next_review_at ? new Date(item.next_review_at) : null
  const isDue = !dueDate || dueDate <= new Date()
  return (
    <motion.button
      whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }}
      onClick={() => onReview(item)}
      style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1px solid ${isDue && !item.mastered ? 'color-mix(in srgb, var(--sunset-orange) 25%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'right' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {item.skill_type === 'reading' ? '📖' : item.skill_type === 'listening' ? '🎧' : item.skill_type === 'writing' ? '✍️' : '🎤'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>{SKILL_LABELS[item.skill_type]}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {item.mastered && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'color-mix(in srgb, #4ade80 10%, transparent)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontFamily: "'IBM Plex Sans', sans-serif" }}>✓ أتقنتها</span>}
            {!item.mastered && isDue && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'color-mix(in srgb, var(--sunset-orange) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-orange) 25%, transparent)', color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif" }}>للمراجعة</span>}
            {!item.mastered && !isDue && dueDate && <span style={{ fontSize: 10, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{dueDate.toLocaleDateString('ar-SA')}</span>}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: isRL ? "'IBM Plex Sans', sans-serif" : "'Tajawal', sans-serif", lineHeight: 1.6, direction: isRL ? 'ltr' : 'rtl', textAlign: isRL ? 'left' : 'right', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.question_text}
        </p>
        {isRL && (
          <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace", direction: 'ltr' }}>✗ {item.student_answer || '—'}</span>
            <span style={{ fontSize: 11, color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace", direction: 'ltr' }}>✓ {item.correct_answer || '—'}</span>
          </div>
        )}
      </div>
      <ChevronRight size={14} color="var(--ds-text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
    </motion.button>
  )
}

export default function ErrorsHub() {
  const navigate    = useNavigate()
  const studentId   = useStudentId()
  const [narrativeDone, setNarrativeDone] = useState(false)
  const [skillFilter, setSkillFilter]     = useState(null)
  const [statusFilter, setStatusFilter]   = useState('all')
  const [sort, setSort]                   = useState('due')

  const statsQ = useErrorStats(studentId)
  const listQ  = useErrorList(studentId, { skill: skillFilter, status: statusFilter, sort })
  const dueQ   = useDueErrors(studentId, 5)

  const stats   = statsQ.data || {}
  const errors  = listQ.data || []
  const dueCount = stats.due || 0

  function handleReviewSingle(item) {
    navigate(`/student/ielts-v2/errors/review?id=${item.id}`)
  }

  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 28 }}>
      {!narrativeDone && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 32 }}>
          <NarrativeReveal lines={NARRATIVE_LINES} delayBetweenLines={700} pauseAfterLast={400} onComplete={() => setNarrativeDone(true)} />
        </motion.section>
      )}

      {/* Stats */}
      {stats.total > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard label="إجمالي الدروس" value={stats.total} />
          <StatCard label="للمراجعة اليوم" value={dueCount} accent={dueCount > 0 ? 'var(--sunset-orange)' : undefined} />
          <StatCard label="قيد المراجعة" value={stats.inReview} />
          <StatCard label="أتقنتها" value={stats.mastered} accent={stats.mastered > 0 ? '#4ade80' : undefined} />
        </motion.div>
      )}

      {/* Review Today CTA */}
      {dueCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/student/ielts-v2/errors/review')}
          style={{ padding: '18px 24px', borderRadius: 18, border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 16%, var(--sunset-base-mid))', color: 'var(--ds-text)', fontSize: 16, fontWeight: 900, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>مراجعة اليوم ({dueCount} درس)</span>
          <ChevronRight size={20} />
        </motion.button>
      )}

      {/* Insights tab link */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/student/ielts-v2/errors/insights')}
          style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          📊 إحصائيات الأداء
        </button>
      </motion.div>

      {/* Filters */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Skill filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[null, 'reading', 'listening', 'writing', 'speaking'].map(s => (
            <button key={String(s)} onClick={() => setSkillFilter(s)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontFamily: "'Tajawal', sans-serif", fontWeight: skillFilter === s ? 700 : 500, border: `1px solid ${skillFilter === s ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: skillFilter === s ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent', color: skillFilter === s ? 'var(--ds-text)' : 'var(--ds-text-muted)', cursor: 'pointer' }}>
              {s ? SKILL_LABELS[s] : 'الكل'}
            </button>
          ))}
        </div>
        {/* Status + sort */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setStatusFilter(o.key)} style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, fontFamily: "'Tajawal', sans-serif", fontWeight: statusFilter === o.key ? 700 : 400, border: `1px solid ${statusFilter === o.key ? 'color-mix(in srgb, var(--ds-border) 80%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, background: statusFilter === o.key ? 'color-mix(in srgb, var(--ds-surface) 70%, transparent)' : 'transparent', color: statusFilter === o.key ? 'var(--ds-text)' : 'var(--ds-text-muted)', cursor: 'pointer' }}>
              {o.label}
            </button>
          ))}
          <div style={{ marginRight: 'auto', display: 'flex', gap: 4 }}>
            {SORT_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setSort(o.key)} style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: sort === o.key ? 700 : 400, border: `1px solid ${sort === o.key ? 'color-mix(in srgb, var(--ds-border) 80%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, background: sort === o.key ? 'color-mix(in srgb, var(--ds-surface) 70%, transparent)' : 'transparent', color: sort === o.key ? 'var(--ds-text)' : 'var(--ds-text-muted)', cursor: 'pointer' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Error list */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {listQ.isLoading ? (
          Array(5).fill(0).map((_, i) => <div key={i} style={{ height: 90, borderRadius: 14, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 30%, transparent)' }} />)
        ) : errors.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)' }}>
            <BookOpen size={36} color="var(--ds-text-muted)" style={{ marginBottom: 14 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>
              لا توجد دروس بعد. أكملي جلسة قراءة أو استماع لتبدأ!
            </p>
          </div>
        ) : (
          errors.map(item => <ErrorCard key={item.id} item={item} onReview={handleReviewSingle} />)
        )}
      </section>
    </div>
  )
}
