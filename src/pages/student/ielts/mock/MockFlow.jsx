import { useCallback, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useMockAttempt, useMockContent, useAdvanceMockSection, useSubmitMock } from '@/hooks/ielts/useMockCenter'
import DiagnosticListening from '@/pages/student/ielts/diagnostic/DiagnosticListening'
import DiagnosticReading from '@/pages/student/ielts/diagnostic/DiagnosticReading'
import MockWritingTabs from '@/components/ielts/mock/MockWritingTabs'
import MockSpeaking from '@/components/ielts/mock/MockSpeaking'
import SectionLockedNotice from '@/components/ielts/mock/SectionLockedNotice'

function MockSkeleton() {
  return (
    <div style={{ maxWidth: 700, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
      <GlassPanel style={{ padding: 48 }}>
        <Loader size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل الاختبار…</p>
      </GlassPanel>
    </div>
  )
}

function MockSubmitting({ attemptId }) {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const submitMut = useSubmitMock()

  useEffect(() => {
    if (!attemptId) return
    submitMut.mutateAsync({ attemptId })
      .then(result => {
        navigate(`/student/ielts/mock/result/${result.result_id}`, { replace: true })
      })
      .catch(() => {
        // Error shown inline
      })
  }, [attemptId])

  if (submitMut.isError) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 8 }}>
            فشل التقييم
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 20 }}>
            {submitMut.error?.message || 'حدث خطأ أثناء التقييم'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
            اختبارك محفوظ — يمكنك إعادة المحاولة
          </p>
          <button
            onClick={() => submitMut.mutateAsync({ attemptId })}
            style={{ padding: '12px 28px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '80px auto', padding: 16, textAlign: 'center' }} dir="rtl">
      <GlassPanel style={{ padding: 52 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(56,189,248,0.1)', border: '2px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Loader size={32} style={{ color: '#38bdf8', animation: 'spin 1s linear infinite' }} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
          جاري التقييم…
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
          نقيّم الاستماع والقراءة والكتابة والمحادثة — قد يستغرق الأمر حتى 4 دقائق. لا تغلق الصفحة.
        </p>
      </GlassPanel>
    </div>
  )
}

export default function MockFlow() {
  const navigate = useNavigate()
  const { attemptId } = useParams()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id
  const qc = useQueryClient()

  const attemptQ = useMockAttempt(attemptId)
  const attempt = attemptQ.data
  const contentQ = useMockContent(attempt)
  const advanceMut = useAdvanceMockSection()

  const handleAdvance = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['mock-attempt', attemptId] })
  }, [qc, attemptId])

  const handleListeningExpire = useCallback(async () => {
    if (!attempt?.id) return
    try {
      await advanceMut.mutateAsync({ attemptId: attempt.id, nextSection: 'reading' })
    } catch { /* silent — timer already expired */ }
  }, [attempt?.id, advanceMut])

  const handleReadingExpire = useCallback(async () => {
    if (!attempt?.id) return
    try {
      await advanceMut.mutateAsync({ attemptId: attempt.id, nextSection: 'writing' })
    } catch { /* silent */ }
  }, [attempt?.id, advanceMut])

  // Guards (all hooks declared above)
  if (!studentId) return null

  if (attemptQ.isLoading || contentQ.isLoading) return <MockSkeleton />

  if (!attempt) return <Navigate to="/student/ielts/mock" replace />

  if (attempt.student_id !== studentId) return <Navigate to="/student/ielts/mock" replace />

  const section = attempt.current_section
  const content = contentQ.data || {}

  // Render current section
  switch (section) {
    case 'listening':
      return (
        <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DiagnosticListening
            attempt={attempt}
            content={content}
            onExpire={handleListeningExpire}
            onAdvance={handleAdvance}
          />
        </motion.div>
      )

    case 'reading':
      return (
        <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DiagnosticReading
            attempt={attempt}
            content={content}
            onExpire={handleReadingExpire}
            onAdvance={handleAdvance}
          />
        </motion.div>
      )

    case 'writing':
      return (
        <motion.div key="writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <MockWritingTabs
            attempt={attempt}
            content={content}
            onAdvance={handleAdvance}
          />
        </motion.div>
      )

    case 'speaking':
      return (
        <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <MockSpeaking
            attempt={attempt}
            content={content}
            onAdvance={handleAdvance}
          />
        </motion.div>
      )

    case 'submitting':
      return <MockSubmitting attemptId={attemptId} />

    default:
      return (
        <div style={{ maxWidth: 700, margin: '60px auto', padding: 16 }} dir="rtl">
          <GlassPanel style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle size={28} style={{ color: '#fb923c', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
              حالة غير معروفة للاختبار
            </p>
            <button onClick={() => navigate('/student/ielts/mock')} style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
              العودة
            </button>
          </GlassPanel>
        </div>
      )
  }
}
