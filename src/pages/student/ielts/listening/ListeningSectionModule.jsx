import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Clock, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useListeningSections, useListeningProgress, useRecentListeningSessions } from '@/hooks/ielts/useListeningLab'

const SECTION_META = {
  1: {
    icon: '🗣️', label_ar: 'القسم ١', subtitle_ar: 'محادثة اجتماعية', en: 'Conversation — social context',
    desc_ar: 'محادثة بين شخصين في سياق اجتماعي (مثل: استفسار عن شقة، حجز مطعم، نقاش في مكتب). التركيز على استخراج معلومات محددة كالأسماء والأرقام والتواريخ.',
  },
  2: {
    icon: '🎤', label_ar: 'القسم ٢', subtitle_ar: 'مناجاة اجتماعية', en: 'Monologue — social context',
    desc_ar: 'متحدث واحد يعطي معلومات لجمهور (مثلاً: مرشد سياحي، مسؤول يشرح خدمة عامة). تحتاج تركيزاً على التفاصيل والأرقام والتسلسل الزمني.',
  },
  3: {
    icon: '🎓', label_ar: 'القسم ٣', subtitle_ar: 'نقاش أكاديمي', en: 'Discussion — academic',
    desc_ar: 'حوار بين طلاب أو بين طالب وأستاذ في سياق أكاديمي (مناقشة مشروع، عرض تقديمي). الأفكار أكثر تعقيداً والمفردات أكاديمية.',
  },
  4: {
    icon: '📚', label_ar: 'القسم ٤', subtitle_ar: 'محاضرة أكاديمية', en: 'Lecture — academic',
    desc_ar: 'محاضرة أكاديمية من متحدث واحد. الأصعب في الاختبار — مفردات متخصصة، أفكار مجردة، حجج معقدة. تدريب أخذ الملاحظات ضروري هنا.',
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

export default function ListeningSectionModule() {
  const { sectionNumber: sectionNumberStr } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id
  const sectionNumber = parseInt(sectionNumberStr, 10)

  const sectionsQ = useListeningSections()
  const progressQ = useListeningProgress(studentId)
  const sessionsQ = useRecentListeningSessions(studentId, 20)

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  if (!studentId) return null
  if (!hasAccess) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Tajawal', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>هذه الخدمة متاحة لباقة IELTS</p>
          <button onClick={() => navigate('/student/ielts')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>العودة</button>
        </GlassPanel>
      </div>
    )
  }

  const meta = SECTION_META[sectionNumber]
  if (!meta) return null

  const sections = sectionsQ.data || { 1: [], 2: [], 3: [], 4: [] }
  const availableSections = sections[sectionNumber] || []
  const progress = progressQ.data || {}
  const sectionProg = progress[sectionNumber]

  // Recent sessions for this section only
  const sectionSessions = (sessionsQ.data || []).filter(s => s.question_type === `section_${sectionNumber}`)

  const handleStart = () => {
    if (availableSections.length === 0) return
    // Prefer unseen sections
    const unseenPreferred = availableSections.filter(s =>
      !sectionSessions.some(sess => sess.source_id === s.id)
    )
    const pickFrom = unseenPreferred.length ? unseenPreferred : availableSections
    const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)]
    navigate(`/student/ielts/listening/section/${sectionNumber}/practice/${pick.id}`)
  }

  const bandColor = sectionProg?.estimated_band
    ? (Number(sectionProg.estimated_band) >= 7 ? '#4ade80' : Number(sectionProg.estimated_band) >= 5.5 ? '#38bdf8' : '#fb923c')
    : '#38bdf8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/listening')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل الاستماع
      </button>

      {/* Section header */}
      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span style={{ fontSize: 36, flexShrink: 0 }}>{meta.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{meta.label_ar}</h1>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>— {meta.subtitle_ar}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', marginBottom: 12 }}>{meta.en}</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.8 }}>{meta.desc_ar}</p>
          </div>
          {sectionProg?.estimated_band && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal', lineHeight: 1 }}>
                {Number(sectionProg.estimated_band).toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band</div>
            </div>
          )}
        </div>

        {sectionProg && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              🎯 {sectionProg.attempts_count} جلسة
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
              ✓ {sectionProg.correct_count} إجابة صحيحة
            </span>
            {sectionProg.last_attempt_at && (
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                آخر جلسة: {formatRelative(sectionProg.last_attempt_at)}
              </span>
            )}
          </div>
        )}
      </GlassPanel>

      {/* Start button or empty state */}
      {availableSections.length > 0 ? (
        <button
          onClick={handleStart}
          style={{
            width: '100%', padding: '16px 24px', borderRadius: 14, marginBottom: 20,
            fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16, cursor: 'pointer',
            background: 'rgba(56,189,248,0.15)', color: '#38bdf8',
            border: '1.5px solid rgba(56,189,248,0.4)',
          }}
        >
          ابدأ تدريب جديد ←
        </button>
      ) : (
        <GlassPanel style={{ padding: 20, marginBottom: 20, textAlign: 'center', border: '1px solid rgba(251,146,60,0.2)', background: 'rgba(251,146,60,0.04)' }}>
          <AlertTriangle size={20} style={{ color: '#fb923c', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14, fontFamily: 'Tajawal', color: '#fb923c', fontWeight: 600 }}>
            لا يوجد محتوى منشور لهذا القسم بعد
          </p>
        </GlassPanel>
      )}

      {/* Recent sessions for this section */}
      {sectionSessions.length > 0 && (
        <GlassPanel style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>جلسات سابقة في هذا القسم</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sectionSessions.slice(0, 6).map(s => {
              const correct = s.correct_count || 0
              const total = correct + (s.incorrect_count || 0)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                      {formatRelative(s.started_at)}{total > 0 ? ` · ${correct}/${total} صح` : ''}
                    </p>
                  </div>
                  {s.band_score != null && (
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', fontFamily: 'Tajawal' }}>
                      Band {Number(s.band_score).toFixed(1)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </GlassPanel>
      )}
    </motion.div>
  )
}
