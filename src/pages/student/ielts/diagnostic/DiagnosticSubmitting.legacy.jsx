import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCompleteDiagnostic } from '@/hooks/ielts/useDiagnostic'
import DiagnosticError from './DiagnosticError'

const STAGES = [
  { msg: 'نحلل إجاباتك في القراءة والاستماع...', duration: 4000 },
  { msg: 'نراجع كتابتك بعناية...', duration: 6000 },
  { msg: 'نقيّم محادثتك...', duration: 6000 },
  { msg: 'نبني خطتك الشخصية...', duration: 4000 },
  { msg: 'اللمسات الأخيرة...', duration: 99999 },
]

export default function DiagnosticSubmitting({ attemptId }) {
  const [stageIdx, setStageIdx] = useState(0)
  const [error, setError] = useState(null)
  const complete = useCompleteDiagnostic()

  useEffect(() => {
    complete.mutate(
      { attemptId },
      { onError: (err) => setError(err?.message || 'حدث خطأ أثناء التقييم') }
    )
  }, []) // intentionally empty — run once on mount

  // Cycle through stage messages
  useEffect(() => {
    if (stageIdx >= STAGES.length - 1) return
    const t = setTimeout(() => setStageIdx(i => i + 1), STAGES[stageIdx].duration)
    return () => clearTimeout(t)
  }, [stageIdx])

  if (error) return <DiagnosticError message={error} />

  return (
    <div
      style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}
      dir="rtl"
    >
      {/* Pulsing orb */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.35), rgba(129,140,248,0.1))',
          border: '2px solid rgba(56,189,248,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <span style={{ fontSize: 36 }}>🎓</span>
      </motion.div>

      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 12, textAlign: 'center' }}>
        جاري التقييم
      </h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={stageIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          style={{ fontSize: 16, color: '#38bdf8', fontFamily: 'Tajawal', textAlign: 'center', marginBottom: 32 }}
        >
          {STAGES[stageIdx].msg}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {STAGES.slice(0, -1).map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= stageIdx ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            transition: 'background 0.4s ease',
          }} />
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 24, textAlign: 'center', maxWidth: 340 }}>
        لا تغلق الصفحة — قد يستغرق التقييم حتى دقيقة واحدة
      </p>
    </div>
  )
}
