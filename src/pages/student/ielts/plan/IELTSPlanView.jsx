import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Loader } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useAdaptivePlan, useRegeneratePlan } from '@/hooks/ielts/useAdaptivePlan'
import { useErrorBankSummary } from '@/hooks/ielts/useErrorBank'
import { selectMotivationalNote } from '@/lib/ielts/plan-generator'
import BandTargetCard from '@/components/ielts/plan/BandTargetCard'
import WeekScheduleGrid from '@/components/ielts/plan/WeekScheduleGrid'
import WeakAreasPanel from '@/components/ielts/plan/WeakAreasPanel'
import StrongAreasPanel from '@/components/ielts/plan/StrongAreasPanel'
import RegenerateButton from '@/components/ielts/plan/RegenerateButton'

export default function IELTSPlanView() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  const planQ = useAdaptivePlan(studentId)
  const errorSummaryQ = useErrorBankSummary(studentId)
  const regenMut = useRegeneratePlan()

  // Deterministic motivational note (frontend-only, not from DB)
  const motivationalNote = studentId ? selectMotivationalNote(studentId) : null

  if (!studentId) return null

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
            هذه الخدمة متاحة لباقة IELTS
          </p>
          <button onClick={() => navigate('/student/ielts')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            لوحة IELTS
          </button>
        </GlassPanel>
      </div>
    )
  }

  if (planQ.isLoading) {
    return (
      <div style={{ maxWidth: 860, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 48 }}>
          <Loader size={28} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>جاري تحميل خطتك…</p>
        </GlassPanel>
      </div>
    )
  }

  const plan = planQ.data
  const errorSummary = errorSummaryQ.data || {}

  if (!plan) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
            خطتك الذكية جاهزة للإنشاء
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 24 }}>
            {regenMut.isError
              ? (regenMut.error?.message || 'حدث خطأ أثناء إنشاء الخطة')
              : 'اضغط لإنشاء خطتك المخصصة بناءً على بياناتك الحالية'}
          </p>
          <button
            onClick={() => regenMut.mutate({ studentId })}
            disabled={regenMut.isPending}
            style={{ padding: '14px 28px', borderRadius: 14, background: regenMut.isPending ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.15)', color: regenMut.isPending ? 'var(--text-tertiary)' : '#38bdf8', border: '1.5px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
          >
            {regenMut.isPending ? 'جاري إنشاء الخطة…' : 'أنشئ خطتي'}
          </button>
        </GlassPanel>
      </div>
    )
  }

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
        ← لوحة IELTS
      </button>

      {/* Band target */}
      <BandTargetCard plan={plan} onEdit={() => navigate('/student/ielts/plan/edit')} />

      {/* Motivational note */}
      {motivationalNote && (
        <GlassPanel style={{ padding: '12px 20px', marginBottom: 20, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7, textAlign: 'center', fontStyle: 'italic' }}>
            "{motivationalNote}"
          </p>
        </GlassPanel>
      )}

      {/* Regenerate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', letterSpacing: '0.04em' }}>
          جدولك الأسبوعي
        </p>
        <RegenerateButton
          onRegenerate={() => regenMut.mutate({ studentId })}
          isPending={regenMut.isPending}
        />
      </div>

      {regenMut.isError && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
          <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal' }}>{regenMut.error?.message || 'فشل تحديث الخطة'}</p>
        </div>
      )}

      {regenMut.isSuccess && (
        <p style={{ fontSize: 12, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 12, textAlign: 'left' }}>
          خطتك محدّثة بناءً على بياناتك الحالية ✓
        </p>
      )}

      {/* Week schedule */}
      {plan.weekly_schedule && (
        <div style={{ marginBottom: 24 }}>
          <WeekScheduleGrid weeklySchedule={plan.weekly_schedule} studentId={studentId} />
        </div>
      )}

      {/* Weak / Strong areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
        <WeakAreasPanel weakAreas={plan.weak_areas || []} targetBand={plan.target_band} />
        <StrongAreasPanel strongAreas={plan.strong_areas || []} />
      </div>

      {/* Error bank CTA */}
      {(errorSummary.due || 0) > 0 && (
        <GlassPanel
          hover
          style={{ padding: '14px 18px', marginBottom: 20, cursor: 'pointer', border: '1px solid rgba(251,146,60,0.2)', background: 'rgba(251,146,60,0.05)' }}
          onClick={() => navigate('/student/ielts/errors/review')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📕</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                {errorSummary.due} أخطاء مستحقة المراجعة
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                مراجعة سريعة الآن ترفع مستواك
              </p>
            </div>
            <span style={{ fontSize: 12, color: '#fb923c', fontFamily: 'Tajawal', fontWeight: 700 }}>راجع →</span>
          </div>
        </GlassPanel>
      )}

      {/* Footer CTAs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/student/ielts/plan/edit')}
          style={{ padding: '11px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          تعديل الأهداف
        </button>
        <button
          onClick={() => navigate('/student/ielts/errors')}
          style={{ padding: '11px 20px', borderRadius: 12, background: 'rgba(251,146,60,0.08)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}
        >
          بنك الأخطاء
        </button>
      </div>
    </motion.div>
  )
}
