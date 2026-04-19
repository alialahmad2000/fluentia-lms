import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, ChevronLeft, Clock, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useSpeakingProgress, useSpeakingHistory, useSpeakingQuota } from '@/hooks/ielts/useSpeakingLab'

const PART_META = {
  part_1: { icon: '🗣️', num: 1, label_ar: 'الجزء الأول', subtitle_ar: 'محادثة شخصية', en: 'Introduction & Interview', minSec: 8, maxSec: 40, desc_ar: 'أسئلة شخصية عن حياتك اليومية — المنزل، العمل، الهوايات والاهتمامات.' },
  part_2: { icon: '🎤', num: 2, label_ar: 'الجزء الثاني', subtitle_ar: 'حديث متواصل', en: 'Long Turn (Cue Card)', minSec: 45, maxSec: 120, desc_ar: 'بطاقة إرشادية — دقيقة للتحضير ثم حديث 1-2 دقيقة بشكل متواصل.' },
  part_3: { icon: '🎓', num: 3, label_ar: 'الجزء الثالث', subtitle_ar: 'نقاش متعمّق', en: 'Two-way Discussion', minSec: 15, maxSec: 60, desc_ar: 'أسئلة مجردة تتعلق بموضوع الجزء الثاني — تستدعي آراء ومقارنات.' },
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

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function QuotaWidget({ quota }) {
  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0
  const color = quota.remaining === 0 ? '#ef4444' : quota.remaining <= 3 ? '#fb923c' : '#4ade80'
  return (
    <GlassPanel style={{ padding: 16, marginBottom: 20, border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>تقييمات Speaking هذا الشهر</p>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'Tajawal' }}>{quota.used} / {quota.limit}</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 6, transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: 11, color: quota.remaining === 0 ? '#ef4444' : 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 6 }}>
        {quota.remaining === 0 ? 'استهلكت حصتك — تتجدد أول الشهر' : `${quota.remaining} تقييم متبقٍ`}
      </p>
    </GlassPanel>
  )
}

function PartCard({ partKey, prog, onStart }) {
  const meta = PART_META[partKey]
  const band = prog?.rolling_band
  const bColor = bandColor(band)
  return (
    <GlassPanel
      hover
      style={{ padding: 20, cursor: 'pointer', border: band ? `1px solid ${bColor}22` : '1px solid rgba(255,255,255,0.06)' }}
      onClick={onStart}
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
        <span style={{ fontSize: 26, fontWeight: 900, color: bColor, fontFamily: 'Tajawal', flexShrink: 0, lineHeight: 1 }}>
          {band ? band.toFixed(1) : '—'}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 12 }}>
        {meta.desc_ar}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {prog?.session_count > 0 ? `${prog.session_count} جلسة` : 'لم تبدأ بعد'}
        </span>
        <span style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'Tajawal', fontWeight: 700 }}>ابدأ →</span>
      </div>
    </GlassPanel>
  )
}

export default function SpeakingLab() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const progressQ = useSpeakingProgress(studentId)
  const historyQ = useSpeakingHistory(studentId, 5)
  const quotaQ = useSpeakingQuota(studentId, studentData)

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
          <Lock size={32} style={{ color: '#fbbf24', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
            هذه الخدمة متاحة لباقة IELTS
          </h2>
          <button onClick={() => navigate('/student/ielts')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة للوحة IELTS
          </button>
        </GlassPanel>
      </div>
    )
  }

  const prog = progressQ.data || {}
  const recentSessions = historyQ.data || []

  const allBands = Object.values(prog).filter(p => p?.rolling_band != null).map(p => p.rolling_band)
  const overallBand = allBands.length
    ? Math.round((allBands.reduce((a, b) => a + b, 0) / allBands.length) * 2) / 2
    : null

  const totalSessions = Object.values(prog).reduce((s, p) => s + (p?.session_count || 0), 0)

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
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
            <Mic size={24} style={{ color: '#f87171' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
              معمل المحادثة
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
              {totalSessions > 0
                ? `${totalSessions} جلسة مكتملة · band ${overallBand?.toFixed(1) || '—'}`
                : 'ابدأ جلسة تسجيل واحصل على تقييم IELTS فوري'
              }
            </p>
          </div>
          {overallBand && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#f87171', fontFamily: 'Tajawal', lineHeight: 1 }}>{overallBand.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band متوسط</div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Quota */}
      {quotaQ.data && <QuotaWidget quota={quotaQ.data} />}

      {/* Part cards */}
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 14, letterSpacing: '0.04em' }}>
        الأجزاء الثلاثة
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.keys(PART_META).map(key => (
          <PartCard
            key={key}
            partKey={key}
            prog={prog[key]}
            onStart={() => navigate(`/student/ielts/speaking/part/${PART_META[key].num}`)}
          />
        ))}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 ? (
        <GlassPanel style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>جلسات أخيرة</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.map(s => {
              const partKey = s.question_type
              const meta = PART_META[partKey]
              const b = s.band_score != null ? Number(s.band_score) : null
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/student/ielts/speaking/feedback/${s.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon || '🎤'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                      {meta?.label_ar || partKey}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                      {formatRelative(s.completed_at)}{s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} د` : ''}
                    </p>
                  </div>
                  {b != null && (
                    <span style={{ fontSize: 14, fontWeight: 800, color: bandColor(b), fontFamily: 'Tajawal', flexShrink: 0 }}>
                      {b.toFixed(1)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 26, marginBottom: 10 }}>🎤</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>ما بدأت أي جلسة بعد</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>اختر جزءاً من القائمة وابدأ!</p>
        </GlassPanel>
      )}
    </motion.div>
  )
}
