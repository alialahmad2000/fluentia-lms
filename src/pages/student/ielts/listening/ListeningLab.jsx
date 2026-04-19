import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Headphones, ChevronLeft, Lock, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useListeningSections, useListeningProgress, useRecentListeningSessions } from '@/hooks/ielts/useListeningLab'

const SECTION_META = {
  1: { icon: '🗣️', label_ar: 'القسم ١', subtitle_ar: 'محادثة اجتماعية', en: 'Conversation' },
  2: { icon: '🎤', label_ar: 'القسم ٢', subtitle_ar: 'مناجاة اجتماعية', en: 'Monologue' },
  3: { icon: '🎓', label_ar: 'القسم ٣', subtitle_ar: 'نقاش أكاديمي', en: 'Discussion' },
  4: { icon: '📚', label_ar: 'القسم ٤', subtitle_ar: 'محاضرة أكاديمية', en: 'Lecture' },
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

function LabSkeleton() {
  const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }} dir="rtl">
      <div style={{ ...pulse, height: 56, width: 240, marginBottom: 20 }} />
      <div style={{ ...pulse, height: 80, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ ...pulse, height: 120 }} />)}
      </div>
    </div>
  )
}

function SectionCard({ sectionNum, availableCount, prog, onClick }) {
  const meta = SECTION_META[sectionNum]
  const band = prog?.estimated_band
  const attempts = prog?.attempts_count || 0
  const bandColor = band ? (Number(band) >= 7 ? '#4ade80' : Number(band) >= 5.5 ? '#38bdf8' : '#fb923c') : 'var(--text-tertiary)'
  const hasContent = availableCount > 0

  return (
    <GlassPanel
      hover={hasContent}
      style={{
        padding: 20, cursor: hasContent ? 'pointer' : 'default',
        border: band ? `1px solid ${bandColor}22` : '1px solid rgba(255,255,255,0.06)',
        opacity: hasContent ? 1 : 0.5,
      }}
      onClick={hasContent ? onClick : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{meta.label_ar}</p>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{meta.subtitle_ar}</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', marginTop: 2 }}>{meta.en}</p>
        </div>
        <span style={{ fontSize: 28, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal', flexShrink: 0 }}>
          {band ? Number(band).toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {attempts > 0 ? `${attempts} جلسة` : 'لم تبدأ بعد'}
        </span>
        <span style={{ fontSize: 11, color: hasContent ? 'rgba(56,189,248,0.7)' : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {hasContent ? `${availableCount} متاح` : 'قريباً'}
        </span>
      </div>
    </GlassPanel>
  )
}

function RecentFeed({ sessions }) {
  if (sessions.length === 0) {
    return (
      <GlassPanel style={{ padding: 24, textAlign: 'center', marginTop: 20 }}>
        <p style={{ fontSize: 26, marginBottom: 10 }}>🎧</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>ما بدأت أي تمرين بعد</p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>اختر قسماً من القائمة وابدأ!</p>
      </GlassPanel>
    )
  }
  return (
    <GlassPanel style={{ padding: 20, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>النشاط الأخير</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.slice(0, 8).map(s => {
          const sn = s.question_type?.replace('section_', '') || '?'
          const meta = SECTION_META[parseInt(sn)]
          const correct = s.correct_count || 0
          const total = correct + (s.incorrect_count || 0)
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon || '🎧'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {meta?.label_ar || `القسم ${sn}`}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                  {formatRelative(s.started_at)}{total > 0 ? ` · ${correct}/${total} صح` : ''}
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

export default function ListeningLab() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const sectionsQ = useListeningSections()
  const progressQ = useListeningProgress(studentId)
  const sessionsQ = useRecentListeningSessions(studentId, 10)

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  if (!studentId) return null
  if (!hasAccess) return <NoAccessPanel onBack={() => navigate('/student/ielts')} />
  if (sectionsQ.isLoading) return <LabSkeleton />

  const sections = sectionsQ.data || { 1: [], 2: [], 3: [], 4: [] }
  const progress = progressQ.data || { 1: null, 2: null, 3: null, 4: null }

  const sectionBands = [1,2,3,4].map(n => progress[n]?.estimated_band).filter(b => b != null).map(Number)
  const overallBand = sectionBands.length
    ? Math.round((sectionBands.reduce((a,b) => a+b, 0) / sectionBands.length) * 2) / 2
    : null

  const totalSessions = [1,2,3,4].reduce((s, n) => s + (progress[n]?.attempts_count || 0), 0)

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
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0 }}>
            <Headphones size={24} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              معمل الاستماع
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {totalSessions > 0
                ? `${totalSessions} جلسة مكتملة · band ${overallBand?.toFixed(1) || '—'}`
                : 'ابدأ أول تمرين لتحديد مستواك'
              }
            </p>
          </div>
          {overallBand && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#38bdf8', fontFamily: 'Tajawal', lineHeight: 1 }}>{overallBand.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band متوسط</div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Section grid */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
        الأقسام الأربعة
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[1,2,3,4].map(n => (
          <SectionCard
            key={n}
            sectionNum={n}
            availableCount={sections[n]?.length || 0}
            prog={progress[n]}
            onClick={() => navigate(`/student/ielts/listening/section/${n}`)}
          />
        ))}
      </div>

      <RecentFeed sessions={sessionsQ.data || []} />
    </motion.div>
  )
}
