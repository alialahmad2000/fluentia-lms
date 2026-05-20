import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import {
  useDiagnosticContent,
  useDiagnosticAttempt,
  useStartDiagnostic,
} from '@/hooks/ielts/useDiagnostic'
import DiagnosticSkeleton from './DiagnosticSkeleton'
import DiagnosticError from './DiagnosticError'
import DiagnosticWelcome from './DiagnosticWelcome'
import DiagnosticListening from './DiagnosticListening'
import DiagnosticReading from './DiagnosticReading'
import DiagnosticWriting from './DiagnosticWriting'
import DiagnosticSpeaking from './DiagnosticSpeaking'
import DiagnosticSubmitting from './DiagnosticSubmitting'
import DiagnosticResults from './DiagnosticResults'

// Access gate panel — inline to keep imports tidy
function NoAccessPanel({ onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
      <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(251,191,36,0.2)' }}>
          <Lock size={26} style={{ color: '#fbbf24' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, fontFamily: 'Tajawal' }}>
          هذه الخدمة متاحة لباقة IELTS
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.8, fontFamily: 'Tajawal' }}>
          تواصل مع المدرب لترقية باقتك والوصول لمحتوى IELTS الكامل
        </p>
        <button
          onClick={onBack}
          style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          العودة للرئيسية
        </button>
      </GlassPanel>
    </div>
  )
}

export default function DiagnosticFlow() {
  // ── All hooks at top ──────────────────────────────────────
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const contentQ = useDiagnosticContent()
  const attemptQ = useDiagnosticAttempt(studentId)
  const startMut = useStartDiagnostic()

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  // ── Guards ────────────────────────────────────────────────
  if (!studentId) return null

  if (contentQ.isLoading || attemptQ.isLoading) return <DiagnosticSkeleton />

  if (!hasAccess) return <NoAccessPanel onBack={() => navigate('/student/ielts')} />

  if (contentQ.isError || !contentQ.data) {
    return <DiagnosticError message="لم نستطع تحميل محتوى الاختبار. حاول مرة أخرى." />
  }
  if (attemptQ.isError) {
    return <DiagnosticError message="حدث خطأ أثناء تحميل حالة الاختبار." />
  }

  const attempt = attemptQ.data?.attempt
  const mockTestId = attemptQ.data?.mockTestId

  // ── Render states ─────────────────────────────────────────
  if (attempt?.status === 'completed') {
    return (
      <DiagnosticResults
        attempt={attempt}
        onBackToHub={() => navigate('/student/ielts')}
      />
    )
  }

  if (!attempt) {
    return (
      <DiagnosticWelcome
        content={contentQ.data}
        onStart={async (testVariant) => {
          await startMut.mutateAsync({ studentId, mockTestId, testVariant })
        }}
        isStarting={startMut.isPending}
      />
    )
  }

  switch (attempt.current_section) {
    case 'listening':
      return <DiagnosticListening attempt={attempt} content={contentQ.data} />
    case 'reading':
      return <DiagnosticReading attempt={attempt} content={contentQ.data} />
    case 'writing':
      return <DiagnosticWriting attempt={attempt} content={contentQ.data} />
    case 'speaking':
      return <DiagnosticSpeaking attempt={attempt} content={contentQ.data} />
    case 'submitting':
      return <DiagnosticSubmitting attemptId={attempt.id} />
    default:
      return <DiagnosticError message={`حالة غير متوقعة: ${attempt.current_section}`} />
  }
}
