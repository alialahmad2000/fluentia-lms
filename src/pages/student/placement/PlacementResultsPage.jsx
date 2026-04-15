import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { AuroraBackground } from '../../../design-system/components'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { ArrowRight, MessageCircle } from 'lucide-react'

const CEFR_LABELS = {
  0: { cefr: 'Pre-A1', ar: 'ما قبل المبتدئ', path: 'تأسيس' },
  1: { cefr: 'A1', ar: 'مبتدئ', path: 'تأسيس' },
  2: { cefr: 'A2', ar: 'أساسي', path: 'تأسيس' },
  3: { cefr: 'B1', ar: 'متوسط', path: 'تطوير' },
  4: { cefr: 'B2', ar: 'فوق المتوسط', path: 'تطوير' },
  5: { cefr: 'C1', ar: 'متقدم', path: 'متقدم' },
}

const SKILL_LABELS = {
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  reading: 'قراءة',
  context: 'سياق',
}

export default function PlacementResultsPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const location = useLocation()
  const { profile } = useAuthStore()
  const [result, setResult] = useState(location.state?.result || null)
  const [phase, setPhase] = useState(0)
  const [groupInfo, setGroupInfo] = useState(null)

  useEffect(() => {
    if (!result && sessionId) {
      supabase
        .from('placement_results')
        .select('*')
        .eq('session_id', sessionId)
        .single()
        .then(({ data }) => {
          if (data) setResult(data)
        })
    }
  }, [result, sessionId])

  // Reveal animation phases
  useEffect(() => {
    if (!result) return
    const timers = [
      setTimeout(() => setPhase(1), 1200),  // analyzing
      setTimeout(() => setPhase(2), 2400),  // level badge
      setTimeout(() => setPhase(3), 3200),  // skill chart
      setTimeout(() => setPhase(4), 4000),  // strengths + CTA
    ]
    return () => timers.forEach(clearTimeout)
  }, [result])

  // Load group info
  useEffect(() => {
    if (!result?.recommended_group_id) return
    supabase
      .from('groups')
      .select('id, name, level')
      .eq('id', result.recommended_group_id)
      .single()
      .then(({ data }) => {
        if (data) setGroupInfo(data)
      })
  }, [result?.recommended_group_id])

  if (!profile) return null

  if (!result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
        <AuroraBackground />
        <p style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>جاري تحميل النتائج...</p>
      </div>
    )
  }

  const level = CEFR_LABELS[result.recommended_level] || CEFR_LABELS[2]
  const altLevel = CEFR_LABELS[result.alternate_level] || CEFR_LABELS[1]
  const breakdown = result.skill_breakdown || {}

  const radarData = Object.entries(SKILL_LABELS).map(([key, label]) => ({
    skill: label,
    value: Math.round((breakdown[key] || 0) * 100),
  }))

  // WhatsApp message
  const whatsappMsg = encodeURIComponent(
    `مرحباً، أنا ${profile.full_name || 'طالبة'}. أكملت اختبار تحديد المستوى في فلونتيا والنتيجة: ${level.cefr} (${level.ar}). أرغب في التسجيل.`
  )

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <AnimatePresence>
          {/* Phase 0: Black with faint stars */}
          {phase === 0 && (
            <motion.div
              key="analyzing"
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-xl" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
                جاري تحليل نتائجكِ...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 1+: Level Badge */}
        {phase >= 1 && (
          <motion.div
            className="text-center mb-8 max-w-md w-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Level orb */}
            <div
              className="mx-auto mb-6 w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, var(--ds-accent-primary, rgba(56,189,248,0.3)) 0%, transparent 70%)',
                border: '2px solid var(--ds-accent-primary, rgba(56,189,248,0.4))',
                boxShadow: '0 0 40px var(--ds-accent-primary, rgba(56,189,248,0.2))',
              }}
            >
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>
                  L{result.recommended_level}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
                  {level.cefr}
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              {level.ar}
            </h1>
            <p className="text-base mb-6" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              المسار: {level.path}
            </p>

            {/* Alternate level */}
            <motion.div
              className="rounded-xl p-4 mx-auto max-w-xs"
              style={{
                background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                مستوى بديل إذا القروب الأساسي غير متوفر
              </p>
              <p className="font-semibold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                L{result.alternate_level} — {altLevel.cefr} ({altLevel.ar})
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Phase 2+: Skill Radar */}
        {phase >= 3 && (
          <motion.div
            className="w-full max-w-xs mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--ds-border-subtle, rgba(255,255,255,0.1))" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: 'var(--ds-text-secondary, #cbd5e1)', fontSize: 13 }}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--ds-accent-primary, #38bdf8)"
                  fill="var(--ds-accent-primary, rgba(56,189,248,0.2))"
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Phase 3+: Strengths/Weaknesses + CTA */}
        {phase >= 4 && (
          <motion.div
            className="w-full max-w-md space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Strengths */}
            {result.strengths?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  نقاط القوة
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {result.weaknesses?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  مجالات التطوير
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.weaknesses.map((w) => (
                    <span
                      key={w}
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        background: 'rgba(251,146,60,0.15)',
                        color: '#fb923c',
                        border: '1px solid rgba(251,146,60,0.25)',
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended group */}
            {groupInfo && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                  border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
                  في {groupInfo.name} — قروب المستوى {groupInfo.level}
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <a
                href={`https://wa.me/966500000000?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all"
                style={{
                  background: 'var(--ds-accent-primary, #38bdf8)',
                  color: '#060e1c',
                }}
              >
                <MessageCircle size={18} />
                تواصلي مع الإدارة لتفعيل التسجيل
              </a>
              <button
                onClick={() => navigate('/student')}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
                style={{
                  background: 'var(--ds-surface-2, rgba(255,255,255,0.06))',
                  color: 'var(--ds-text-secondary, #cbd5e1)',
                  border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
                }}
              >
                العودة للداشبورد
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
