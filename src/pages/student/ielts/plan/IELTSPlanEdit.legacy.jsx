import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useAdaptivePlan, useUpdatePlanMeta, useRegeneratePlan } from '@/hooks/ielts/useAdaptivePlan'

const BAND_OPTIONS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0]

export default function IELTSPlanEdit() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const planQ = useAdaptivePlan(studentId)
  const updateMut = useUpdatePlanMeta()
  const regenMut = useRegeneratePlan()

  const [targetBand, setTargetBand] = useState(6.5)
  const [examDate, setExamDate] = useState('')
  const [variant, setVariant] = useState('academic')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (planQ.data) {
      if (planQ.data.target_band) setTargetBand(Number(planQ.data.target_band))
      if (planQ.data.target_exam_date) setExamDate(planQ.data.target_exam_date.split('T')[0])
      if (planQ.data.test_variant) setVariant(planQ.data.test_variant)
    }
  }, [planQ.data])

  if (!studentId) return null

  const handleSave = async () => {
    setSaved(false)
    await updateMut.mutateAsync({
      studentId,
      patch: {
        target_band: targetBand,
        target_exam_date: examDate ? new Date(examDate).toISOString() : null,
        test_variant: variant,
      },
    })
    setSaved(true)
  }

  const handleSaveAndRegen = async () => {
    setSaved(false)
    await updateMut.mutateAsync({
      studentId,
      patch: {
        target_band: targetBand,
        target_exam_date: examDate ? new Date(examDate).toISOString() : null,
        test_variant: variant,
      },
    })
    await regenMut.mutateAsync({ studentId })
    navigate('/student/ielts/plan')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/plan')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        ← خطتي
      </button>

      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
          تعديل الأهداف
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          حدّث معلوماتك لتحسين خطتك المخصصة
        </p>
      </GlassPanel>

      {/* Target band */}
      <GlassPanel style={{ padding: 20, marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
          Band المستهدف
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BAND_OPTIONS.map(b => (
            <button
              key={b}
              onClick={() => setTargetBand(b)}
              style={{
                width: 52, height: 40, borderRadius: 10, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
                background: targetBand === b ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
                color: targetBand === b ? '#38bdf8' : 'var(--text-tertiary)',
                border: targetBand === b ? '1.5px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              {b.toFixed(1)}
            </button>
          ))}
        </div>
        {planQ.data?.current_band_estimate != null && targetBand <= Number(planQ.data.current_band_estimate) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <AlertCircle size={13} style={{ color: '#fb923c', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#fb923c', fontFamily: 'Tajawal' }}>
              الهدف أقل من أو يساوي مستواك الحالي — حاول رفعه
            </p>
          </div>
        )}
      </GlassPanel>

      {/* Exam date */}
      <GlassPanel style={{ padding: 20, marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 10 }}>
          تاريخ الامتحان (اختياري)
        </p>
        <input
          type="date"
          value={examDate}
          onChange={e => setExamDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)', fontFamily: 'Tajawal', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {examDate && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 6 }}>
            تبقّى {Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))} يوم
          </p>
        )}
      </GlassPanel>

      {/* Test variant */}
      <GlassPanel style={{ padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 10 }}>نوع الاختبار</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'academic', label: 'Academic', desc: 'للدراسة الجامعية' },
            { key: 'general_training', label: 'General Training', desc: 'للعمل والإقامة' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setVariant(v.key)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, textAlign: 'right',
                background: variant === v.key ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                border: variant === v.key ? '1.5px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: variant === v.key ? '#38bdf8' : 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 2 }}>{v.label}</p>
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{v.desc}</p>
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* Error states */}
      {(updateMut.isError || regenMut.isError) && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal' }}>
            {updateMut.error?.message || regenMut.error?.message || 'حدث خطأ'}
          </p>
        </div>
      )}

      {saved && !regenMut.isPending && (
        <p style={{ fontSize: 12, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 10 }}>تم الحفظ ✓</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleSaveAndRegen}
          disabled={updateMut.isPending || regenMut.isPending}
          style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
        >
          {regenMut.isPending ? 'جاري تحديث الخطة…' : updateMut.isPending ? 'جاري الحفظ…' : 'احفظ وحدّث خطتي'}
        </button>
        <button
          onClick={handleSave}
          disabled={updateMut.isPending || regenMut.isPending}
          style={{ padding: '11px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          حفظ فقط
        </button>
      </div>
    </motion.div>
  )
}
