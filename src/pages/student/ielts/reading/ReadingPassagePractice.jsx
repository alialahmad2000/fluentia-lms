import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { supabase } from '@/lib/supabase'
import { gradeQuestions } from '@/lib/ielts/grading'
import { useSubmitReadingSession } from '@/hooks/ielts/useReadingLab'

function usePassage(passageId) {
  return useQuery({
    queryKey: ['ielts-passage', passageId],
    enabled: !!passageId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_passages')
        .select('*')
        .eq('id', passageId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export default function ReadingPassagePractice() {
  const { passageId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const passageQ = usePassage(passageId)
  const submitSession = useSubmitReadingSession()

  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!submitted) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [submitted])

  if (!studentId) return null

  if (passageQ.isLoading) {
    const pulse = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <div style={{ ...pulse, height: 56, marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ ...pulse, flex: 1, height: 400 }} />
          <div style={{ ...pulse, flex: 1, height: 400 }} />
        </div>
      </div>
    )
  }

  if (!passageQ.data) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>النص غير موجود</p>
          <button onClick={() => navigate('/student/ielts/reading')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
            العودة
          </button>
        </GlassPanel>
      </div>
    )
  }

  const passage = passageQ.data
  const qs = Array.isArray(passage.questions) ? passage.questions : []

  const handleSubmit = async () => {
    clearInterval(timerRef.current)
    const result = gradeQuestions({ questions: qs, answerKey: passage.answer_key, studentAnswers: answers })
    setGradeResult(result)
    setSubmitted(true)
    try {
      await submitSession.mutateAsync({
        studentId,
        questionType: null,
        passageId: passage.id,
        gradeResult: result,
        durationSeconds: elapsed,
      })
    } catch (e) {
      console.warn('Session submit failed:', e)
    }
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const band = gradeResult?.band
  const bandColor = band ? (band >= 7 ? '#4ade80' : band >= 5.5 ? '#38bdf8' : '#fb923c') : '#38bdf8'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => navigate('/student/ielts/reading')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer' }}>
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          معمل القراءة
        </button>
        {!submitted && (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontVariantNumeric: 'tabular-nums' }}>
            ⏱ {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </span>
        )}
        {submitted && band != null && (
          <span style={{ fontSize: 20, fontWeight: 900, color: bandColor, fontFamily: 'Tajawal' }}>
            Band {band.toFixed(1)} · {gradeResult.correct}/{gradeResult.total}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Passage */}
        <GlassPanel style={{ flex: 1, padding: 20, maxHeight: '75vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
            {passage.title}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 2, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {passage.content}
          </p>
        </GlassPanel>

        {/* Questions */}
        <div style={{ flex: 1, maxHeight: '75vh', overflowY: 'auto' }}>
          <GlassPanel style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
              {qs.length} سؤال
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {qs.map((q, i) => {
                const qNum = String(q.question_number ?? i + 1)
                const given = answers[qNum]
                const feedback = submitted ? gradeResult?.perQuestion?.find(r => String(r.qNum) === qNum) : null
                return (
                  <div key={qNum}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'flex-start' }}>
                      {submitted && feedback && (
                        feedback.isCorrect
                          ? <CheckCircle size={15} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
                          : <XCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                      )}
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, direction: 'ltr', textAlign: 'left' }}>
                        {i + 1}. {q.question_text || q.statement || ''}
                      </p>
                    </div>
                    {q.options ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {Object.entries(q.options).map(([k, v]) => {
                          const isSel = given === k
                          const isRight = submitted && feedback?.expected === k
                          const isWrong = submitted && isSel && !feedback?.isCorrect
                          return (
                            <button key={k} onClick={!submitted ? () => setAnswers(a => ({ ...a, [qNum]: k })) : undefined}
                              style={{
                                padding: '8px 12px', borderRadius: 9, textAlign: 'left', fontSize: 13, cursor: submitted ? 'default' : 'pointer',
                                background: isRight ? 'rgba(74,222,128,0.15)' : isWrong ? 'rgba(239,68,68,0.1)' : isSel ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                                color: isRight ? '#4ade80' : isWrong ? '#ef4444' : isSel ? '#38bdf8' : 'var(--text-secondary)',
                                border: isRight ? '1.5px solid rgba(74,222,128,0.4)' : isWrong ? '1.5px solid rgba(239,68,68,0.3)' : isSel ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
                              }}>
                              <strong>{k}.</strong> {v}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <input value={given || ''} onChange={e => !submitted && setAnswers(a => ({ ...a, [qNum]: e.target.value }))} disabled={submitted}
                        placeholder="Answer..." style={{ width: '100%', padding: '8px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', direction: 'ltr', boxSizing: 'border-box' }} />
                    )}
                    {submitted && feedback && !feedback.isCorrect && feedback.explanation && (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, direction: 'ltr', fontStyle: 'italic' }}>💡 {feedback.explanation}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {!submitted ? (
              <button onClick={handleSubmit} disabled={Object.keys(answers).length < qs.length} style={{
                width: '100%', marginTop: 20, padding: '12px 20px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                background: Object.keys(answers).length >= qs.length ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
                color: Object.keys(answers).length >= qs.length ? '#38bdf8' : 'var(--text-tertiary)',
                border: `1.5px solid ${Object.keys(answers).length >= qs.length ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                تحقق من الإجابات ←
              </button>
            ) : (
              <button onClick={() => navigate('/student/ielts/reading')} style={{ width: '100%', marginTop: 20, padding: '12px 20px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: 'pointer', background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.35)' }}>
                العودة للمعمل ✓
              </button>
            )}
          </GlassPanel>
        </div>
      </div>
    </motion.div>
  )
}
