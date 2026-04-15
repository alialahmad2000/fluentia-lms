import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { AuroraBackground } from '../../../design-system/components'
import { X, Loader2 } from 'lucide-react'

// ── Progress Ring SVG ──
function ProgressRing({ current, total }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? current / total : 0
  const offset = circumference * (1 - progress)

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--ds-border-subtle, rgba(255,255,255,0.1))" strokeWidth="3" />
      <circle
        cx="28" cy="28" r={radius} fill="none"
        stroke="var(--ds-accent-primary, #38bdf8)" strokeWidth="3"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="central"
        fill="var(--ds-text-primary, #f8fafc)" fontSize="13" fontWeight="600">
        {current}/{total}
      </text>
    </svg>
  )
}

// ── Cooldown Screen ──
function CooldownScreen({ retryAfterDays }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />
      <div className="text-center px-6 max-w-md relative z-10">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
          لم يحن موعد إعادة الاختبار بعد
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
          يمكنكِ إعادة الاختبار بعد <span className="font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>{retryAfterDays}</span> يوم
        </p>
        <button
          onClick={() => navigate('/student')}
          className="px-6 py-3 rounded-xl font-semibold transition-all"
          style={{
            background: 'var(--ds-surface-2, rgba(255,255,255,0.08))',
            color: 'var(--ds-text-primary, #f8fafc)',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
          }}
        >
          العودة للداشبورد
        </button>
      </div>
    </div>
  )
}

// ── Loading Reveal ──
function LoadingReveal() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />
      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Loader2 className="animate-spin mx-auto mb-4" size={40} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
        <p className="text-lg" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
          جاري تحضير الاختبار...
        </p>
      </motion.div>
    </div>
  )
}

// ── Main Test Page ──
export default function PlacementTestPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [sessionId, setSessionId] = useState(null)
  const [question, setQuestion] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 14 })
  const [selected, setSelected] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldownInfo, setCooldownInfo] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const questionStartTime = useRef(Date.now())
  const initialized = useRef(false)

  const fetchNext = useCallback(async (answer = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const body = {}
      if (sessionId) body.session_id = sessionId
      if (answer) body.answer = answer

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co'}/functions/v1/placement-next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        }
      )

      const data = await res.json()

      if (data.error === 'cooldown') {
        setCooldownInfo({ retryAfterDays: data.retry_after_days })
        return
      }

      if (data.error) {
        console.error('Placement error:', data.error)
        return
      }

      if (data.done) {
        navigate(`/student/placement-test/results/${data.result?.session_id || sessionId}`, {
          state: { result: data.result },
        })
        return
      }

      if (data.session_id) setSessionId(data.session_id)
      setQuestion(data.question)
      setProgress(data.progress)
      setSelected(null)
      setFeedback(null)
      questionStartTime.current = Date.now()
    } catch (err) {
      console.error('fetchNext error:', err)
    }
  }, [sessionId, navigate])

  useEffect(() => {
    if (!initialized.current && profile) {
      initialized.current = true
      fetchNext()
    }
  }, [profile, fetchNext])

  const handleSelect = useCallback(async (optionId) => {
    if (selected || isSubmitting) return
    setSelected(optionId)
    setIsSubmitting(true)

    // Brief feedback pulse (we don't reveal correct answer during test)
    setFeedback('submitted')

    setTimeout(async () => {
      await fetchNext({
        question_id: question.id,
        selected_option_id: optionId,
        response_time_ms: Date.now() - questionStartTime.current,
      })
      setIsSubmitting(false)
    }, 400)
  }, [selected, isSubmitting, fetchNext, question])

  // ── GUARDS ──
  if (!profile) return null
  if (cooldownInfo) return <CooldownScreen retryAfterDays={cooldownInfo.retryAfterDays} />
  if (!question) return <LoadingReveal />

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />

      {/* Exit confirm overlay */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-2xl p-8 text-center max-w-sm mx-4"
              style={{
                background: 'var(--ds-surface-2, rgba(15,23,42,0.95))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
              }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            >
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                هل تريدين مغادرة الاختبار؟
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
                يمكنكِ العودة وإكمال الاختبار لاحقاً
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="px-5 py-2.5 rounded-xl font-medium"
                  style={{
                    background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                    color: 'var(--ds-text-secondary, #cbd5e1)',
                  }}
                >
                  إكمال الاختبار
                </button>
                <button
                  onClick={() => navigate('/student')}
                  className="px-5 py-2.5 rounded-xl font-medium"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  مغادرة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}
        >
          <X size={22} />
        </button>
        <ProgressRing current={progress.current} total={progress.total} />
        <div className="w-10" />
      </div>

      {/* Question area */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            className="w-full max-w-[640px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Question context (for reading questions) */}
            {question.question_context && (
              <div
                className="rounded-xl p-5 mb-5"
                style={{
                  background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                  border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                  color: 'var(--ds-text-secondary, #cbd5e1)',
                }}
              >
                <p className="text-sm leading-relaxed italic">
                  {question.question_context}
                </p>
              </div>
            )}

            {/* Question text */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{
                background: 'var(--ds-surface-2, rgba(255,255,255,0.06))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h2 className="text-xl font-semibold leading-relaxed" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                {question.question_text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = selected === option.id
                let optionBg = 'var(--ds-surface-1, rgba(255,255,255,0.04))'
                let optionBorder = 'var(--ds-border-subtle, rgba(255,255,255,0.08))'

                if (isSelected && feedback === 'submitted') {
                  optionBg = 'var(--ds-accent-primary, rgba(56,189,248,0.15))'
                  optionBorder = 'var(--ds-accent-primary, #38bdf8)'
                }

                return (
                  <motion.button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    disabled={!!selected}
                    className="w-full text-left rounded-xl px-5 transition-all"
                    style={{
                      minHeight: '72px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: optionBg,
                      border: `1.5px solid ${optionBorder}`,
                      color: 'var(--ds-text-primary, #f8fafc)',
                      cursor: selected ? 'default' : 'pointer',
                      opacity: selected && !isSelected ? 0.5 : 1,
                    }}
                    whileHover={!selected ? { scale: 1.01 } : {}}
                    whileTap={!selected ? { scale: 0.99 } : {}}
                  >
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{
                        background: isSelected
                          ? 'var(--ds-accent-primary, #38bdf8)'
                          : 'var(--ds-surface-2, rgba(255,255,255,0.08))',
                        color: isSelected ? '#060e1c' : 'var(--ds-text-secondary, #cbd5e1)',
                      }}
                    >
                      {option.id.toUpperCase()}
                    </span>
                    <span className="text-base leading-snug">{option.text}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Helper microcopy */}
            <p className="text-center mt-5 text-sm" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              اختاري أفضل إجابة
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
