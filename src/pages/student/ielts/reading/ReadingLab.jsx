import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, Lock, AlertTriangle, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import {
  useReadingSkills, useReadingProgress, useRecentReadingSessions, useQuestionTypeAvailability,
} from '@/hooks/ielts/useReadingLab'

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

// ─── NoAccess ────────────────────────────────────────────────
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

// ─── Skeleton ────────────────────────────────────────────────
function LabSkeleton() {
  const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }} dir="rtl">
      <div style={{ ...pulse, height: 56, width: 240, marginBottom: 20 }} />
      <div style={{ ...pulse, height: 80, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ ...pulse, height: 100 }} />)}
      </div>
    </div>
  )
}

// ─── WeakAreasSpotlight ──────────────────────────────────────
function WeakAreasSpotlight({ weakTypes, onSelect }) {
  if (weakTypes.length === 0) return null
  return (
    <GlassPanel style={{ padding: 16, marginBottom: 20, border: '1px solid rgba(251,146,60,0.2)', background: 'rgba(251,146,60,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={16} style={{ color: '#fb923c', flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal' }}>
          نقاط ضعف — ركّز هنا لرفع bandك بسرعة
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {weakTypes.map(({ skill, prog }) => (
          <button
            key={skill.question_type}
            onClick={() => onSelect(skill.question_type)}
            style={{
              padding: '8px 16px', borderRadius: 20, fontFamily: 'Tajawal', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: 'rgba(251,146,60,0.12)', color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.3)',
            }}
          >
            {skill.name_ar} — {prog.estimated_band?.toFixed(1) || '—'}
          </button>
        ))}
      </div>
    </GlassPanel>
  )
}

// ─── SkillCard ───────────────────────────────────────────────
function SkillCard({ skill, prog, passageCount, onClick }) {
  const band = prog?.estimated_band
  const attempts = prog?.attempts_count || 0
  const pct = band ? Math.min(100, Math.round((Number(band) / 9) * 100)) : 0
  const bandColor = band ? (band >= 7 ? '#4ade80' : band >= 5.5 ? '#38bdf8' : '#fb923c') : 'var(--text-tertiary)'
  const hasContent = passageCount > 0

  return (
    <GlassPanel
      hover={hasContent}
      style={{
        padding: 16, cursor: hasContent ? 'pointer' : 'default',
        border: band ? `1px solid ${bandColor}22` : '1px solid rgba(255,255,255,0.06)',
        opacity: hasContent ? 1 : 0.55,
      }}
      onClick={hasContent ? onClick : undefined}
    >
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 2 }}>
          {skill.name_ar}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>
          {skill.name_en}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal' }}>
          {band ? Number(band).toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {attempts > 0 ? `${attempts} جلسة` : 'لم تبدأ بعد'}
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: bandColor, borderRadius: 99, opacity: pct > 0 ? 1 : 0, transition: 'width 0.5s ease' }} />
      </div>
      <p style={{ fontSize: 10, color: hasContent ? 'rgba(56,189,248,0.6)' : 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
        {hasContent ? `${passageCount} نص متاح` : 'لا يوجد محتوى بعد'}
      </p>
    </GlassPanel>
  )
}

// ─── RecentSessionsFeed ──────────────────────────────────────
function RecentSessionsFeed({ sessions, skills }) {
  if (sessions.length === 0) {
    return (
      <GlassPanel style={{ padding: 24, textAlign: 'center', marginTop: 20 }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>📖</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
          ما بدأت أي تمرين بعد
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          اختر نوع سؤال من القائمة وابدأ!
        </p>
      </GlassPanel>
    )
  }

  const skillMap = Object.fromEntries(skills.map(s => [s.question_type, s]))

  return (
    <GlassPanel style={{ padding: 20, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>النشاط الأخير</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.slice(0, 8).map(s => {
          const sk = skillMap[s.question_type]
          const correct = s.correct_count || 0
          const total = correct + (s.incorrect_count || 0)
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <BookOpen size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {sk?.name_ar || s.question_type || 'قراءة عامة'}
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

// ─── Main Component ──────────────────────────────────────────
export default function ReadingLab() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const skillsQ = useReadingSkills()
  const progressQ = useReadingProgress(studentId)
  const sessionsQ = useRecentReadingSessions(studentId, 10)
  const availabilityQ = useQuestionTypeAvailability()

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  const skills = skillsQ.data || []
  const progress = progressQ.data || {}
  const availability = availabilityQ.data || {}

  const overallBand = useMemo(() => {
    const bands = Object.values(progress).map(p => p.estimated_band).filter(b => b != null)
    if (!bands.length) return null
    return Math.round((bands.reduce((a, b) => a + Number(b), 0) / bands.length) * 2) / 2
  }, [progress])

  const totalSessions = useMemo(
    () => Object.values(progress).reduce((s, p) => s + (p.attempts_count || 0), 0),
    [progress]
  )

  const weakTypes = useMemo(() => {
    return skills
      .map(s => ({ skill: s, prog: progress[s.question_type] }))
      .filter(x => x.prog?.attempts_count >= 2 && (Number(x.prog?.estimated_band) ?? 9) < 6.0)
      .sort((a, b) => Number(a.prog.estimated_band) - Number(b.prog.estimated_band))
      .slice(0, 3)
  }, [skills, progress])

  // ── Guards ──────────────────────────────────────────────────
  if (!studentId) return null
  if (!hasAccess) return <NoAccessPanel onBack={() => navigate('/student/ielts')} />
  if (skillsQ.isLoading) return <LabSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Back */}
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
            <BookOpen size={24} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              معمل القراءة
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

      {/* Weak areas */}
      <WeakAreasSpotlight
        weakTypes={weakTypes}
        onSelect={qt => navigate(`/student/ielts/reading/skill/${qt}`)}
      />

      {/* Skills library */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
          مكتبة الاستراتيجيات — {skills.length} نوع سؤال
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {skills.map(skill => (
            <SkillCard
              key={skill.question_type}
              skill={skill}
              prog={progress[skill.question_type]}
              passageCount={availability[skill.question_type] || 0}
              onClick={() => navigate(`/student/ielts/reading/skill/${skill.question_type}`)}
            />
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <RecentSessionsFeed sessions={sessionsQ.data || []} skills={skills} />
    </motion.div>
  )
}
