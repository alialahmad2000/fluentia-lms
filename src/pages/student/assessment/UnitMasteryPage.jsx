import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { AuroraBackground } from '../../../design-system/components'
import { GlassPanel } from '../../../design-system/components'
import { X, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Question Renderers ──
function MCQRenderer({ question, answer, onAnswer }) {
  return (
    <div className="space-y-3">
      {(question.options || []).map((opt) => (
        <motion.button
          key={opt.id}
          onClick={() => onAnswer(opt.id)}
          className="w-full text-left rounded-xl px-5 transition-all"
          style={{
            minHeight: '68px', display: 'flex', alignItems: 'center', gap: '12px',
            background: answer === opt.id ? 'var(--ds-accent-primary, rgba(56,189,248,0.15))' : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
            border: `1.5px solid ${answer === opt.id ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-border-subtle, rgba(255,255,255,0.08))'}`,
            color: 'var(--ds-text-primary, #f8fafc)',
          }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        >
          <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background: answer === opt.id ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-surface-2, rgba(255,255,255,0.08))',
              color: answer === opt.id ? '#060e1c' : 'var(--ds-text-secondary, #cbd5e1)',
            }}>
            {opt.id.toUpperCase()}
          </span>
          <span className="text-base leading-snug">{opt.text}</span>
        </motion.button>
      ))}
    </div>
  )
}

function TrueFalseRenderer({ answer, onAnswer }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[{ val: true, label: 'صح' }, { val: false, label: 'خطأ' }].map(({ val, label }) => (
        <motion.button
          key={String(val)}
          onClick={() => onAnswer(val)}
          className="rounded-xl py-6 text-center text-lg font-bold transition-all"
          style={{
            background: answer === val ? 'var(--ds-accent-primary, rgba(56,189,248,0.15))' : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
            border: `1.5px solid ${answer === val ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-border-subtle, rgba(255,255,255,0.08))'}`,
            color: 'var(--ds-text-primary, #f8fafc)',
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          {label}
        </motion.button>
      ))}
    </div>
  )
}

function FillBlankRenderer({ answer, onAnswer }) {
  return (
    <input
      type="text"
      dir="ltr"
      value={answer || ''}
      onChange={(e) => onAnswer(e.target.value)}
      placeholder="Type your answer..."
      className="w-full px-5 py-4 rounded-xl text-lg"
      style={{
        background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
        border: '1.5px solid var(--ds-border-subtle, rgba(255,255,255,0.12))',
        color: 'var(--ds-text-primary, #f8fafc)',
        outline: 'none',
      }}
      onFocus={(e) => e.target.style.borderColor = 'var(--ds-accent-primary, #38bdf8)'}
      onBlur={(e) => e.target.style.borderColor = 'var(--ds-border-subtle, rgba(255,255,255,0.12))'}
    />
  )
}

function MatchingRenderer({ question, answer, onAnswer }) {
  const pairs = question.options || [] // [{left, right}] available items
  const current = answer || []

  const [selectedLeft, setSelectedLeft] = useState(null)
  const leftItems = pairs.map(p => p.left)
  const rightItems = pairs.map(p => p.right).sort(() => 0.5 - Math.random())

  const handleRightClick = (right) => {
    if (selectedLeft === null) return
    const updated = [...current.filter(p => p.left !== selectedLeft && p.right !== right), { left: selectedLeft, right }]
    setSelectedLeft(null)
    onAnswer(updated)
  }

  const pairedRights = new Set(current.map(p => p.right))
  const pairedLefts = new Set(current.map(p => p.left))

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        {leftItems.map((l) => (
          <button
            key={l}
            onClick={() => setSelectedLeft(l)}
            className="w-full px-4 py-3 rounded-lg text-sm text-left"
            style={{
              background: selectedLeft === l ? 'var(--ds-accent-primary, rgba(56,189,248,0.2))' : pairedLefts.has(l) ? 'rgba(34,197,94,0.1)' : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
              border: `1px solid ${selectedLeft === l ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-border-subtle, rgba(255,255,255,0.08))'}`,
              color: 'var(--ds-text-primary, #f8fafc)',
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rightItems.map((r) => (
          <button
            key={r}
            onClick={() => handleRightClick(r)}
            className="w-full px-4 py-3 rounded-lg text-sm text-left"
            style={{
              background: pairedRights.has(r) ? 'rgba(34,197,94,0.1)' : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
              border: `1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))`,
              color: 'var(--ds-text-primary, #f8fafc)',
              opacity: selectedLeft ? 1 : 0.6,
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Progress Ring ──
function ProgressRing({ current, total }) {
  const r = 22, c = 2 * Math.PI * r, p = total > 0 ? current / total : 0
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--ds-border-subtle, rgba(255,255,255,0.1))" strokeWidth="3" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--ds-accent-primary, #38bdf8)" strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      <text x="28" y="28" textAnchor="middle" dominantBaseline="central"
        fill="var(--ds-text-primary, #f8fafc)" fontSize="13" fontWeight="600">{current}/{total}</text>
    </svg>
  )
}

export default function UnitMasteryPage() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [attemptId, setAttemptId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const startTime = useRef(Date.now())
  const questionStartTimes = useRef({})

  // Start assessment
  useEffect(() => {
    if (!profile || !assessmentId) return
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co'}/functions/v1/unit-mastery-start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ assessment_id: assessmentId }),
          }
        )
        const data = await res.json()

        if (data.error) {
          setError(data)
          setLoading(false)
          return
        }

        setAttemptId(data.attempt_id)
        setQuestions(data.questions || [])
        startTime.current = Date.now()
        setLoading(false)
      } catch (err) {
        setError({ error: err.message })
        setLoading(false)
      }
    })()
  }, [profile, assessmentId])

  const handleAnswer = useCallback((value) => {
    setAnswers(prev => ({ ...prev, [questions[currentIdx]?.id]: value }))
  }, [currentIdx, questions])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const answerArray = questions.map(q => ({
        question_id: q.id,
        student_answer: answers[q.id] ?? null,
      }))

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co'}/functions/v1/unit-mastery-submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attempt_id: attemptId,
            answers: answerArray,
            time_spent_seconds: Math.floor((Date.now() - startTime.current) / 1000),
          }),
        }
      )
      const result = await res.json()
      navigate(`/student/unit-mastery-result/${attemptId}`, { state: { result } })
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }, [submitting, questions, answers, attemptId, navigate])

  if (!profile) return null

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
        <AuroraBackground />
        <div className="relative z-10 text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
          <p style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>جاري تحضير الاختبار...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
        <AuroraBackground />
        <div className="relative z-10 text-center px-6 max-w-md">
          <p className="text-lg font-medium mb-4" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
            {error.details?.reason === 'activities_incomplete' && 'أكملي أنشطة الوحدة أولاً'}
            {error.details?.reason === 'cooldown' && 'انتظري قبل إعادة المحاولة'}
            {error.details?.reason === 'already_passed' && 'سبق واجتزتِ هذا الاختبار'}
            {error.error === 'no_questions' && 'هذا الاختبار غير متوفر حالياً'}
            {!error.details && error.error !== 'no_questions' && (error.message || error.error)}
          </p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl"
            style={{ background: 'var(--ds-surface-2, rgba(255,255,255,0.08))', color: 'var(--ds-text-primary, #f8fafc)' }}>
            العودة
          </button>
        </div>
      </div>
    )
  }

  const question = questions[currentIdx]
  const isLast = currentIdx === questions.length - 1

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'var(--ds-bg-base, #060e1c)' }}>
      <AuroraBackground />

      {/* Exit confirm */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="rounded-2xl p-8 text-center max-w-sm mx-4"
              style={{ background: 'var(--ds-surface-2, rgba(15,23,42,0.95))', border: '1px solid var(--ds-border-subtle)' }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <p className="text-lg font-semibold mb-2" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>مغادرة الاختبار؟</p>
              <p className="text-sm mb-6" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>ستفقدين تقدمكِ الحالي</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowExitConfirm(false)} className="px-5 py-2.5 rounded-xl"
                  style={{ background: 'var(--ds-surface-1)', color: 'var(--ds-text-secondary)' }}>إكمال</button>
                <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>مغادرة</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button onClick={() => setShowExitConfirm(true)} className="p-2 rounded-lg" style={{ color: 'var(--ds-text-secondary)' }}>
          <X size={22} />
        </button>
        <ProgressRing current={currentIdx + 1} total={questions.length} />
        <div className="w-10" />
      </div>

      {/* Question — bottom padding respects mobile nav + iOS home indicator.
          Nav controls (Prev/Next/Submit) inside this block must clear the bottom nav.
          Uses 100dvh (dynamic viewport) not 100vh for iOS Safari URL bar. */}
      <div
        className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100dvh-80px)] px-4"
        style={{ paddingBottom: 'var(--mobile-bottom-clearance, 32px)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={question?.id} className="w-full max-w-[680px]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}>

            {question?.question_context && (
              <div className="rounded-xl p-5 mb-5" style={{
                background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                color: 'var(--ds-text-secondary, #cbd5e1)',
              }}>
                <p className="text-sm leading-relaxed italic">{question.question_context}</p>
              </div>
            )}

            <GlassPanel padding="lg" className="mb-6">
              <h2 className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                {question?.question_text}
              </h2>
            </GlassPanel>

            {question?.question_type === 'mcq' && <MCQRenderer question={question} answer={answers[question.id]} onAnswer={handleAnswer} />}
            {question?.question_type === 'true_false' && <TrueFalseRenderer answer={answers[question.id]} onAnswer={handleAnswer} />}
            {question?.question_type === 'fill_blank' && <FillBlankRenderer answer={answers[question.id]} onAnswer={handleAnswer} />}
            {question?.question_type === 'matching' && <MatchingRenderer question={question} answer={answers[question.id]} onAnswer={handleAnswer} />}

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
                  color: currentIdx === 0 ? 'var(--ds-text-tertiary, #475569)' : 'var(--ds-text-secondary, #cbd5e1)',
                  border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                }}
              >
                <ChevronRight size={16} />
                السابق
              </button>

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--ds-accent-primary, #38bdf8)', color: '#060e1c' }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'إنهاء الاختبار'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'var(--ds-accent-primary, rgba(56,189,248,0.1))',
                    color: 'var(--ds-accent-primary, #38bdf8)',
                    border: '1px solid var(--ds-accent-primary, rgba(56,189,248,0.3))',
                  }}
                >
                  التالي
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
