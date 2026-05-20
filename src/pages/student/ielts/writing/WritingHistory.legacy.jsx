import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useWritingSubmissions } from '@/hooks/ielts/useWritingLab'

const TYPE_LABELS = {
  writing_task1: 'Task 1',
  writing_task2: 'Task 2',
}

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function formatDate(str) {
  if (!str) return ''
  return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(str))
}

export default function WritingHistory() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const { data: submissions = [], isLoading } = useWritingSubmissions(studentId, 100)

  if (!studentId) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/writing')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل الكتابة
      </button>

      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          سجل الكتابة
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {submissions.length > 0 ? `${submissions.length} إجابة مقيّمة` : 'لا توجد إجابات بعد'}
        </p>
      </GlassPanel>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : submissions.length === 0 ? (
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 26, marginBottom: 12 }}>✍️</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
            ما كتبت أي إجابة بعد
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 20 }}>
            ابدأ من معمل الكتابة واحصل على تقييم فوري
          </p>
          <button
            onClick={() => navigate('/student/ielts/writing')}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
          >
            ابدأ الكتابة
          </button>
        </GlassPanel>
      ) : (
        <GlassPanel style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {submissions.map(s => {
              const b = s.band_score != null ? Number(s.band_score) : null
              const bColor = bandColor(b)
              const variant = s.test_variant === 'general_training' ? 'GT' : 'Academic'
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/student/ielts/writing/feedback/${s.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', fontFamily: 'sans-serif' }}>
                        {TYPE_LABELS[s.submission_type] || 'Writing'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>{variant}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                      {formatDate(s.submitted_at)}{s.word_count ? ` · ${s.word_count} كلمة` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: bColor, fontFamily: 'Tajawal', lineHeight: 1 }}>
                      {b != null ? b.toFixed(1) : '—'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>band</p>
                  </div>
                  <span style={{ fontSize: 12, color: '#38bdf8', fontFamily: 'Tajawal', fontWeight: 600, flexShrink: 0 }}>
                    عرض ←
                  </span>
                </div>
              )
            })}
          </div>
        </GlassPanel>
      )}
    </motion.div>
  )
}
