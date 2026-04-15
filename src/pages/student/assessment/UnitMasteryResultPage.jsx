import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { AuroraBackground } from '../../../design-system/components'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { Award, ArrowRight, RotateCcw, BookOpen } from 'lucide-react'

const SKILL_LABELS = { vocabulary: 'مفردات', grammar: 'قواعد', reading: 'قراءة', listening: 'استماع' }

export default function UnitMasteryResultPage() {
  const navigate = useNavigate()
  const { attemptId } = useParams()
  const location = useLocation()
  const { profile } = useAuthStore()
  const [result, setResult] = useState(location.state?.result || null)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!result && attemptId) {
      supabase
        .from('unit_mastery_attempts')
        .select('*, unit_mastery_assessments:assessment_id(unit_id)')
        .eq('id', attemptId)
        .single()
        .then(({ data }) => {
          if (data) setResult({
            passed: data.passed,
            percentage: data.percentage,
            score: data.score,
            total_possible: data.total_possible,
            skill_breakdown: data.skill_breakdown,
            xp_awarded: data.xp_awarded,
          })
        })
    }
  }, [result, attemptId])

  useEffect(() => {
    if (!result) return
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [result])

  if (!profile || !result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
        <AuroraBackground />
        <p style={{ color: 'var(--ds-text-secondary)' }}>جاري التحميل...</p>
      </div>
    )
  }

  const breakdown = result.skill_breakdown || {}
  const radarData = Object.entries(SKILL_LABELS).map(([key, label]) => ({
    skill: label,
    value: Math.round((breakdown[key] || 0) * 100),
  }))

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Phase 0: Analyzing */}
        <AnimatePresence>
          {phase === 0 && (
            <motion.p key="analyzing" className="text-xl"
              style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              جاري تحليل إجاباتكِ...
            </motion.p>
          )}
        </AnimatePresence>

        {/* Phase 1: Main result */}
        {phase >= 1 && (
          <motion.div className="text-center mb-8 max-w-md w-full"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}>

            {result.passed ? (
              <>
                <div className="mx-auto mb-6 w-28 h-28 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
                    border: '2px solid rgba(251,191,36,0.4)',
                    boxShadow: '0 0 40px rgba(251,191,36,0.2)',
                  }}>
                  <Award size={48} style={{ color: '#fbbf24' }} />
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                  أتقنتِ الوحدة!
                </h1>
              </>
            ) : (
              <>
                <div className="mx-auto mb-6 w-28 h-28 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, var(--ds-accent-primary, rgba(56,189,248,0.2)) 0%, transparent 70%)',
                    border: '2px solid var(--ds-accent-primary, rgba(56,189,248,0.3))',
                  }}>
                  <span className="text-3xl font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>
                    {Math.round(result.percentage)}%
                  </span>
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                  قريبة جداً!
                </h1>
              </>
            )}

            <p className="text-lg mb-2" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              نسبتكِ: <span className="font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>{Math.round(result.percentage)}%</span>
            </p>
            <p className="text-sm" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              {result.score} / {result.total_possible} نقطة
            </p>

            {/* XP float */}
            <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <span className="px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                +{result.xp_awarded} XP
              </span>
            </motion.div>

            {!result.passed && (
              <p className="text-sm mt-4" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                اختبار الإتقان يحتاج 70% — راجعي الوحدة ثم عودي بعد ساعة
              </p>
            )}
          </motion.div>
        )}

        {/* Phase 2: Radar */}
        {phase >= 2 && (
          <motion.div className="w-full max-w-xs mb-8"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--ds-border-subtle, rgba(255,255,255,0.1))" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--ds-text-secondary, #cbd5e1)', fontSize: 13 }} />
                <Radar dataKey="value"
                  stroke={result.passed ? '#fbbf24' : 'var(--ds-accent-primary, #38bdf8)'}
                  fill={result.passed ? 'rgba(251,191,36,0.2)' : 'var(--ds-accent-primary, rgba(56,189,248,0.2))'}
                  strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Phase 3: CTAs */}
        {phase >= 3 && (
          <motion.div className="w-full max-w-md space-y-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {result.passed ? (
              <button
                onClick={() => navigate('/student/curriculum')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold"
                style={{ background: 'var(--ds-accent-primary, #38bdf8)', color: '#060e1c' }}>
                <ArrowRight size={18} />
                انطلقي للوحدة التالية
              </button>
            ) : (
              <button
                onClick={() => navigate(-2)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold"
                style={{ background: 'var(--ds-accent-primary, #38bdf8)', color: '#060e1c' }}>
                <BookOpen size={18} />
                مراجعة الوحدة
              </button>
            )}

            <button
              onClick={() => navigate('/student/curriculum')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium"
              style={{
                background: 'var(--ds-surface-2, rgba(255,255,255,0.06))',
                color: 'var(--ds-text-secondary, #cbd5e1)',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
              }}>
              العودة للمنهج
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
