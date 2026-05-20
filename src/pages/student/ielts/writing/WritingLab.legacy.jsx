import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, ChevronLeft, Clock, Lock, History } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useWritingTasks, useWritingSubmissions, useWritingQuota } from '@/hooks/ielts/useWritingLab'

const CATEGORY_META = {
  'task1-academic': {
    icon: '📊', label_ar: 'Task 1 Academic', subtitle_ar: 'وصف الرسوم البيانية',
    desc_ar: 'صف الرسوم البيانية والجداول والرسوم التوضيحية بأسلوب أكاديمي (150+ كلمة)',
    en: 'Graphs, charts, diagrams',
  },
  'task1-gt': {
    icon: '✉️', label_ar: 'Task 1 General Training', subtitle_ar: 'كتابة الرسائل',
    desc_ar: 'اكتب رسالة رسمية أو غير رسمية بناءً على الموقف المطلوب (150+ كلمة)',
    en: 'Letters & correspondence',
  },
  'task2': {
    icon: '📝', label_ar: 'Task 2', subtitle_ar: 'مقال رأي',
    desc_ar: 'اكتب مقالاً أكاديمياً يناقش رأياً أو مشكلة أو وجهتي نظر (250+ كلمة)',
    en: 'Opinion & discussion essays',
  },
}

function formatRelative(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  return `قبل ${Math.floor(hrs / 24)} يوم`
}

function computeStats(submissions) {
  const stats = {
    'task1-academic': { count: 0, bands: [] },
    'task1-gt': { count: 0, bands: [] },
    'task2': { count: 0, bands: [] },
  }
  for (const s of submissions) {
    const key = s.submission_type === 'writing_task2' ? 'task2'
      : s.test_variant === 'general_training' ? 'task1-gt' : 'task1-academic'
    stats[key].count++
    if (s.band_score != null) stats[key].bands.push(Number(s.band_score))
  }
  for (const k of Object.keys(stats)) {
    const b = stats[k].bands
    stats[k].avgBand = b.length ? b.reduce((a, x) => a + x, 0) / b.length : null
  }
  return stats
}

function NoAccessPanel({ onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <Lock size={32} style={{ color: '#fbbf24', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
          هذه الخدمة متاحة لباقة IELTS
        </h2>
        <button onClick={onBack} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
          العودة للوحة IELTS
        </button>
      </GlassPanel>
    </div>
  )
}

function QuotaWidget({ quota }) {
  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0
  const color = quota.remaining === 0 ? '#ef4444' : quota.remaining <= 3 ? '#fb923c' : '#4ade80'
  return (
    <GlassPanel style={{ padding: 16, marginBottom: 20, border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          استخدام التقييم هذا الشهر
        </p>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'Tajawal' }}>
          {quota.used} / {quota.limit}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 6, transition: 'width 0.4s' }} />
      </div>
      {quota.remaining === 0 ? (
        <p style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal', marginTop: 8 }}>
          استهلكت حصتك لهذا الشهر — ستتجدد في أول الشهر القادم
        </p>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 8 }}>
          {quota.remaining} تقييم متبقٍ
        </p>
      )}
    </GlassPanel>
  )
}

function CategoryCard({ categoryKey, tasks, stats, onClick }) {
  const meta = CATEGORY_META[categoryKey]
  const s = stats[categoryKey] || { count: 0, avgBand: null }
  const hasContent = tasks.length > 0
  const band = s.avgBand
  const bandColor = band ? (band >= 7 ? '#4ade80' : band >= 5.5 ? '#38bdf8' : '#fb923c') : 'var(--text-tertiary)'

  return (
    <GlassPanel
      hover={hasContent}
      style={{
        padding: 20, cursor: hasContent ? 'pointer' : 'default',
        opacity: hasContent ? 1 : 0.5,
        border: band ? `1px solid ${bandColor}22` : '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={hasContent ? onClick : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{meta.label_ar}</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{meta.subtitle_ar}</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', marginTop: 2 }}>{meta.en}</p>
        </div>
        <span style={{ fontSize: 26, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal', flexShrink: 0, lineHeight: 1 }}>
          {band ? band.toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {s.count > 0 ? `${s.count} إجابة مقيّمة` : 'لم تبدأ بعد'}
        </span>
        <span style={{ fontSize: 11, color: hasContent ? 'rgba(56,189,248,0.7)' : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {hasContent ? `${tasks.length} مهمة متاحة` : 'قريباً'}
        </span>
      </div>
    </GlassPanel>
  )
}

function RecentList({ submissions, navigate }) {
  if (submissions.length === 0) {
    return (
      <GlassPanel style={{ padding: 24, textAlign: 'center', marginTop: 20 }}>
        <p style={{ fontSize: 26, marginBottom: 10 }}>✍️</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          ما قيّمت أي إجابة بعد
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          اختر نوع المهمة وابدأ الكتابة!
        </p>
      </GlassPanel>
    )
  }
  return (
    <GlassPanel style={{ padding: 20, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>آخر إجاباتي المقيّمة</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {submissions.map(s => {
          const key = s.submission_type === 'writing_task2' ? 'task2'
            : s.test_variant === 'general_training' ? 'task1-gt' : 'task1-academic'
          const meta = CATEGORY_META[key]
          return (
            <div
              key={s.id}
              onClick={() => navigate(`/student/ielts/writing/feedback/${s.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon || '📝'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {meta?.label_ar || 'كتابة'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                  {formatRelative(s.submitted_at)}{s.word_count ? ` · ${s.word_count} كلمة` : ''}
                </p>
              </div>
              {s.band_score != null && (
                <span style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', fontFamily: 'Tajawal', flexShrink: 0 }}>
                  {Number(s.band_score).toFixed(1)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}

export default function WritingLab() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const tasksQ = useWritingTasks()
  const submissionsQ = useWritingSubmissions(studentId, 20)
  const quotaQ = useWritingQuota(studentId, studentData)

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  if (!studentId) return null
  if (!hasAccess) return <NoAccessPanel onBack={() => navigate('/student/ielts')} />

  const tasks = tasksQ.data || { task1_academic: [], task1_gt: [], task2: [] }
  const submissions = submissionsQ.data || []
  const stats = computeStats(submissions)

  const evaluated = submissions.filter(s => s.band_score != null)
  const overallBand = evaluated.length
    ? Math.round((evaluated.reduce((sum, s) => sum + Number(s.band_score), 0) / evaluated.length) * 2) / 2
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        لوحة IELTS
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(167,139,250,0.25)', flexShrink: 0 }}>
            <PenLine size={24} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              معمل الكتابة
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {evaluated.length > 0
                ? `${evaluated.length} إجابة مقيّمة · band ${overallBand?.toFixed(1) || '—'}`
                : 'ابدأ بكتابة إجابتك الأولى للحصول على تقييم فوري'
              }
            </p>
          </div>
          {overallBand && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#a78bfa', fontFamily: 'Tajawal', lineHeight: 1 }}>{overallBand.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band متوسط</div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Quota widget */}
      {quotaQ.data && <QuotaWidget quota={quotaQ.data} />}

      {/* Category grid */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
        اختر نوع المهمة
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {['task1-academic', 'task1-gt', 'task2'].map(key => (
          <CategoryCard
            key={key}
            categoryKey={key}
            tasks={key === 'task1-academic' ? tasks.task1_academic : key === 'task1-gt' ? tasks.task1_gt : tasks.task2}
            stats={stats}
            onClick={() => navigate(`/student/ielts/writing/${key}`)}
          />
        ))}
      </div>

      {/* History CTA */}
      <button
        onClick={() => navigate('/student/ielts/writing/history')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', marginBottom: 4, fontFamily: 'Tajawal', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}
      >
        <History size={15} />
        سجلي الكامل
      </button>

      <RecentList submissions={submissions.slice(0, 5)} navigate={navigate} />
    </motion.div>
  )
}
