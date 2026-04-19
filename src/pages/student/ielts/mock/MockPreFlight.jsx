import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useMockCatalog, useStartMockAttempt, useMockHistory } from '@/hooks/ielts/useMockCenter'
import { useSpeakingQuota } from '@/hooks/ielts/useSpeakingLab'
import PreFlightChecklist from '@/components/ielts/mock/PreFlightChecklist'

const RULES = [
  'المدة الكاملة: 2 ساعة 45 دقيقة',
  'كل قسم بوقت محدد — ينتهي تلقائياً',
  'الاستماع: مرة واحدة فقط لكل قسم صوتي',
  'ما تقدر ترجع للقسم بعد تسليمه',
  'التقييم يتم تلقائياً بعد الانتهاء',
  'يتم الحفظ التلقائي كل 15 ثانية',
]

export default function MockPreFlight() {
  const navigate = useNavigate()
  const { mockId } = useParams()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const [checklistReady, setChecklistReady] = useState(false)
  const [variant, setVariant] = useState('academic')

  const catalogQ = useMockCatalog()
  const quotaQ = useSpeakingQuota(studentId, studentData)
  const startMut = useStartMockAttempt()

  // Find this mock in catalog (or handle unknown id for direct navigation)
  const mock = useMemo(() => {
    const catalog = catalogQ.data || []
    return catalog.find(m => m.id === mockId) || null
  }, [catalogQ.data, mockId])

  const quotaRemaining = quotaQ.data?.remaining ?? 0

  const handleStart = useCallback(async () => {
    if (!studentId || !mockId) return
    try {
      const { attemptId, resumed } = await startMut.mutateAsync({
        studentId,
        mockTestId: mockId,
        testVariant: variant,
      })
      navigate(`/student/ielts/mock/attempt/${attemptId}`, { replace: true })
    } catch (err) {
      // error shown via mutation state
    }
  }, [studentId, mockId, variant, startMut, navigate])

  if (!studentId) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/mock')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← مركز الاختبارات
      </button>

      {/* Header */}
      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          {mock?.title_ar || 'اختبار IELTS تجريبي'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {mock?.title_en || 'IELTS Full Mock Test'}
        </p>
      </GlassPanel>

      {/* Exam rules */}
      <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>قواعد الاختبار</p>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RULES.map((rule, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: '#38bdf8', fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.6 }}>{rule}</p>
            </li>
          ))}
        </ul>
      </GlassPanel>

      {/* Variant selector */}
      <GlassPanel style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>نوع الاختبار</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'academic', label: 'Academic', desc: 'للدراسة الجامعية والهجرة' },
            { key: 'general_training', label: 'General Training', desc: 'للعمل والإقامة' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setVariant(v.key)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12, textAlign: 'right',
                background: variant === v.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                border: variant === v.key ? '1.5px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: variant === v.key ? '#38bdf8' : 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 2 }}>{v.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{v.desc}</p>
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Pre-flight checks */}
      <div style={{ marginBottom: 16 }}>
        <PreFlightChecklist quotaRemaining={quotaRemaining} onReady={setChecklistReady} />
      </div>

      {/* Error */}
      {startMut.isError && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Tajawal' }}>
            {startMut.error?.message || 'فشل بدء الاختبار'}
          </p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!checklistReady || startMut.isPending}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 14,
          background: checklistReady ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
          color: checklistReady ? '#38bdf8' : 'var(--text-tertiary)',
          border: `1.5px solid ${checklistReady ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.08)'}`,
          fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16,
          cursor: checklistReady ? 'pointer' : 'default',
          marginBottom: 12,
        }}
      >
        {startMut.isPending ? 'جاري البدء…' : 'ابدأ الاختبار الآن'}
      </button>

      {!checklistReady && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={14} style={{ color: '#fb923c' }} />
          <p style={{ fontSize: 12, color: '#fb923c', fontFamily: 'Tajawal' }}>أكمل فحص ما قبل الاختبار أولاً</p>
        </div>
      )}
    </motion.div>
  )
}
