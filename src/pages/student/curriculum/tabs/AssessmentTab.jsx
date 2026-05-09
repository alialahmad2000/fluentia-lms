import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, CheckCircle, XCircle, RotateCcw, Play,
  Star, Clock, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { useActivityAttempts } from '../../../../hooks/useActivityAttempts'
import { startNewAttempt, abandonAndStartNew, autosaveAnswers, submitAttempt } from '../../../../lib/attempts'

// ─── Main Component ─────────────────────────────────
export default function AssessmentTab({ unitId }) {
  const { data: assessment, isLoading } = useQuery({
    queryKey: ['unit-assessment', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_assessments')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_published', true)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!unitId,
  })

  if (isLoading) return <AssessmentSkeleton />

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <ClipboardCheck size={28} className="text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">التقييم</h3>
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">قريباً إن شاء الله</p>
      </div>
    )
  }

  return <AssessmentActivity assessment={assessment} />
}

// ─── Activity orchestrator — branches A / B / C ──────
function AssessmentActivity({ assessment }) {
  const { profile } = useAuthStore()
  const studentId = profile?.id
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [resultAttemptId, setResultAttemptId] = useState(null)

  const {
    inProgress, submittedHistory, bestScore, loading, refresh,
  } = useActivityAttempts(assessment.id)

  const handleStart = useCallback(async () => {
    const id = await startNewAttempt(assessment.id, studentId)
    if (id) { refresh(); setActiveAttemptId(id) }
  }, [assessment.id, studentId, refresh])

  const handleResume = useCallback((attemptId) => {
    setActiveAttemptId(attemptId)
  }, [])

  const handleRestart = useCallback(async (currentId) => {
    const id = await abandonAndStartNew(currentId, assessment.id, studentId)
    if (id) { refresh(); setActiveAttemptId(id) }
  }, [assessment.id, studentId, refresh])

  const handleSubmitted = useCallback((attemptId) => {
    setActiveAttemptId(null)
    setResultAttemptId(attemptId)
    refresh()
  }, [refresh])

  if (loading) return <AssessmentSkeleton />

  // Playing an active attempt
  if (activeAttemptId) {
    return (
      <QuizPlayer
        attemptId={activeAttemptId}
        assessment={assessment}
        onSubmitted={handleSubmitted}
        onAbort={() => setActiveAttemptId(null)}
      />
    )
  }

  // Showing result of just-submitted attempt
  if (resultAttemptId) {
    return (
      <ResultView
        attemptId={resultAttemptId}
        assessment={assessment}
        submittedHistory={submittedHistory}
        bestScore={bestScore}
        onNewAttempt={handleStart}
      />
    )
  }

  // Branch A: unfinished in-progress attempt
  if (inProgress) {
    return (
      <ResumeOrRestart
        attempt={inProgress}
        assessment={assessment}
        onResume={() => handleResume(inProgress.id)}
        onRestart={() => handleRestart(inProgress.id)}
      />
    )
  }

  // Branch B: has previous submissions → show history + retry
  if (submittedHistory.length > 0) {
    return (
      <AttemptHistoryView
        assessment={assessment}
        history={submittedHistory}
        bestScore={bestScore}
        onNewAttempt={handleStart}
      />
    )
  }

  // Branch C: never attempted
  return <StartAttemptView assessment={assessment} onStart={handleStart} />
}

// ─── Branch A: Resume or Restart ────────────────────
function ResumeOrRestart({ attempt, assessment, onResume, onRestart }) {
  const answeredCount = Object.keys(attempt.answers ?? {}).length
  const total = (assessment.questions ?? []).length

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      dir="rtl"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-amber-400" />
        </div>
        <div>
          <p className="font-bold text-[var(--text-primary)] font-['Tajawal']">لديكِ محاولة غير مكتملة</p>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
            أجبتِ على {answeredCount} من {total} سؤال
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onResume}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold font-['Tajawal'] text-sm"
          style={{ background: 'var(--accent-sky)', color: '#0a1225' }}
        >
          <Play size={16} />
          استكملي المحاولة
        </button>
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold font-['Tajawal'] text-sm"
          style={{ background: 'var(--surface-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
        >
          <RotateCcw size={16} />
          ابدئي من جديد
        </button>
      </div>
    </div>
  )
}

// ─── Branch B: Attempt History + Retry CTA ──────────
function AttemptHistoryView({ assessment, history, bestScore, onNewAttempt }) {
  const [showAll, setShowAll] = useState(false)
  const latest = history[0]
  const passingScore = assessment.passing_score ?? 70

  return (
    <div className="space-y-5" dir="rtl">
      {/* Best score banner */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{
          background: bestScore >= passingScore ? 'rgba(34,197,94,0.06)' : 'rgba(56,189,248,0.06)',
          border: `1px solid ${bestScore >= passingScore ? 'rgba(34,197,94,0.2)' : 'rgba(56,189,248,0.2)'}`,
        }}
      >
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">أفضل درجة</p>
          <p className="text-3xl font-black font-['Inter']" style={{ color: bestScore >= passingScore ? '#4ade80' : '#38bdf8' }}>
            {bestScore}%
          </p>
          <p className="text-xs font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
            {bestScore >= passingScore ? '✅ اجتزتِ الاختبار' : `الحد الأدنى للنجاح: ${passingScore}%`}
          </p>
        </div>
        <Star size={36} className="text-amber-400/60" />
      </div>

      {/* Attempt list */}
      <div
        className="rounded-xl overflow-hidden divide-y"
        style={{ border: '1px solid var(--border-subtle)', '--tw-divide-opacity': 1 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            المحاولات السابقة ({history.length})
          </span>
          {history.length > 3 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-['Tajawal']"
            >
              {showAll ? 'عرض أقل' : 'عرض الكل'}
              <ChevronDown size={12} style={{ transform: showAll ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </div>
        {(showAll ? history : history.slice(0, 3)).map(a => (
          <div
            key={a.id}
            className="flex items-center justify-between px-4 py-3"
            style={{ background: a.id === latest?.id ? 'rgba(255,255,255,0.01)' : 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                محاولة {a.attempt_number}
              </span>
              {a.score === bestScore && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  الأفضل ⭐
                </span>
              )}
              {a.id === latest?.id && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                  الأحدث
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold font-['Inter']"
                style={{ color: (a.score ?? 0) >= passingScore ? '#4ade80' : '#94a3b8' }}
              >
                {a.score ?? '—'}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']" dir="ltr">
                {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNewAttempt}
        className="w-full py-3.5 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95"
        style={{ background: 'var(--accent-sky)', color: '#0a1225' }}
      >
        <RotateCcw size={15} className="inline ml-2" />
        محاولة جديدة
      </button>
    </div>
  )
}

// ─── Branch C: First attempt CTA ────────────────────
function StartAttemptView({ assessment, onStart }) {
  const questions = assessment.questions ?? []
  const limit = assessment.time_limit_minutes

  return (
    <div
      className="rounded-2xl p-6 space-y-5 text-right"
      dir="rtl"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck size={24} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text-primary)] font-['Tajawal']">
            {assessment.title_ar || assessment.title_en}
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {questions.length} سؤال
            {limit && <span> · {limit} دقيقة</span>}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <p className="text-xs font-bold text-indigo-300 font-['Tajawal']">قبل أن تبدئي</p>
        <ul className="space-y-1 text-xs text-[var(--text-muted)] font-['Tajawal'] list-disc list-inside">
          <li>أجيبي على كل الأسئلة قبل التسليم</li>
          <li>يمكنكِ إعادة المحاولة بعد التسليم</li>
          <li>أعلى درجة هي المحتسبة</li>
          {assessment.passing_score && <li>درجة النجاح: {assessment.passing_score}%</li>}
        </ul>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent-sky)', color: '#0a1225' }}
      >
        <Play size={16} />
        ابدئي الاختبار
      </button>
    </div>
  )
}

// ─── Quiz Player ─────────────────────────────────────
function QuizPlayer({ attemptId, assessment, onSubmitted, onAbort }) {
  const questions = assessment.questions ?? []
  const [answers, setAnswers] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const saveTimer = useRef(null)

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length && questions.length > 0

  // Load any partial answers if resuming
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('activity_attempts')
        .select('answers')
        .eq('id', attemptId)
        .single()
      if (data?.answers && Object.keys(data.answers).length > 0) {
        setAnswers(data.answers)
      }
    }
    load()
  }, [attemptId])

  // Debounced autosave — 800ms after each answer change
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      autosaveAnswers(attemptId, answers).catch(() => {})
    }, 800)
    return () => clearTimeout(saveTimer.current)
  }, [answers, attemptId])

  const handleSubmit = useCallback(async () => {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    setConfirmOpen(false)

    // Final save before submitting
    await autosaveAnswers(attemptId, answers)
    const result = await submitAttempt(attemptId)

    setSubmitting(false)
    if (result) {
      toast({ type: 'success', title: `تم التسليم — درجتك: ${result.score}%` })
      onSubmitted(attemptId)
    }
  }, [allAnswered, submitting, attemptId, answers, onSubmitted])

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">
          {assessment.title_ar || assessment.title_en}
        </h3>
        <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          {answeredCount}/{questions.length} مُجاب عليها
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-base)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
            background: allAnswered ? '#4ade80' : 'var(--accent-sky)',
          }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <AssessmentQuestion
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
          />
        ))}
      </div>

      {/* Submit button */}
      {answeredCount > 0 && (
        <button
          type="button"
          onClick={() => allAnswered && setConfirmOpen(true)}
          disabled={!allAnswered || submitting}
          className="w-full py-3.5 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: allAnswered ? 'var(--accent-sky)' : 'var(--surface-raised)',
            color: allAnswered ? '#0a1225' : 'var(--text-muted)',
            border: `1px solid ${allAnswered ? 'var(--accent-sky)' : 'var(--border-subtle)'}`,
          }}
        >
          {submitting ? 'جاري التسليم...' : allAnswered
            ? `تسليم الإجابات (${answeredCount}/${questions.length})`
            : `أجيبي على جميع الأسئلة (${answeredCount}/${questions.length})`}
        </button>
      )}

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
              dir="rtl"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">تأكيد التسليم</h3>
              <p className="text-sm text-[var(--text-secondary)] font-['Tajawal']">
                لن تتمكني من تعديل هذه المحاولة بعد التسليم.
                <br />
                <span className="text-[var(--text-muted)] text-xs">يمكنكِ إعادة المحاولة لاحقاً — أعلى درجة هي المحتسبة.</span>
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-slate-900"
                  style={{ background: 'var(--accent-sky)' }}
                >
                  تسليم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Single Assessment Question (MCQ) ───────────────
function AssessmentQuestion({ question, index, answer, onAnswer }) {
  const choices = question.choices ?? question.options ?? []
  const isAnswered = answer !== undefined && answer !== null

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 font-['Inter']"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
        >
          {index + 1}
        </span>
        <p className="text-sm font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
          {question.question_en || question.question}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 pr-10">
        {choices.map((choice, i) => {
          const val = typeof choice === 'object' ? choice.value ?? choice.text : choice
          const label = typeof choice === 'object' ? choice.text ?? choice.value : choice
          const isSelected = answer === val

          return (
            <button
              key={i}
              onClick={() => onAnswer(val)}
              dir="ltr"
              className="text-start px-4 py-3 rounded-xl text-sm font-['Inter'] border transition-all"
              style={{
                background: isSelected ? 'rgba(56,189,248,0.1)' : 'var(--surface-base)',
                border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border-subtle)'}`,
                color: isSelected ? '#38bdf8' : 'var(--text-primary)',
              }}
            >
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ml-3"
                style={{
                  background: isSelected ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
                  color: isSelected ? '#38bdf8' : 'var(--text-muted)',
                }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Result View ─────────────────────────────────────
function ResultView({ attemptId, assessment, submittedHistory, bestScore, onNewAttempt }) {
  const { data: attempt } = useQuery({
    queryKey: ['activity-attempt', attemptId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_attempts')
        .select('*')
        .eq('id', attemptId)
        .single()
      return data
    },
    enabled: !!attemptId,
  })

  if (!attempt) return <AssessmentSkeleton />

  const passingScore = assessment.passing_score ?? 70
  const passed = (attempt.score ?? 0) >= passingScore
  const isPersonalBest = attempt.score === bestScore && submittedHistory.length > 0

  return (
    <div className="space-y-5" dir="rtl">
      {/* Score card */}
      <div
        className="rounded-2xl p-6 text-center space-y-3"
        style={{
          background: passed ? 'rgba(34,197,94,0.06)' : 'rgba(56,189,248,0.06)',
          border: `1px solid ${passed ? 'rgba(34,197,94,0.2)' : 'rgba(56,189,248,0.2)'}`,
        }}
      >
        <p className="text-4xl">{passed ? '🏆' : '📝'}</p>
        <p className="text-5xl font-black font-['Inter']" style={{ color: passed ? '#4ade80' : '#38bdf8' }}>
          {attempt.score ?? 0}%
        </p>
        <p className="font-bold text-[var(--text-primary)] font-['Tajawal']">
          {attempt.correct_count ?? 0} من {attempt.total_questions ?? 0} إجابة صحيحة
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {passed
            ? <span className="text-sm text-emerald-400 font-['Tajawal']">✅ اجتزتِ الاختبار</span>
            : <span className="text-sm text-slate-400 font-['Tajawal']">حاولي مرة ثانية للوصول لـ {passingScore}%</span>}
          {isPersonalBest && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              أفضل درجة ⭐
            </span>
          )}
        </div>
      </div>

      {/* Per-question breakdown */}
      {attempt.graded_details?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">مراجعة الإجابات</p>
          {attempt.graded_details.map((d, i) => {
            const q = (assessment.questions ?? []).find(q => q.id === d.question_id) ?? {}
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl p-3"
                style={{
                  background: d.is_correct ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                  border: `1px solid ${d.is_correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}
              >
                {d.is_correct
                  ? <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  : <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 text-xs font-['Inter']" dir="ltr">
                  <p className="text-[var(--text-secondary)]">{q.question_en || q.question || `Q${i+1}`}</p>
                  {!d.is_correct && (
                    <p className="text-emerald-400/70 mt-0.5">
                      Correct: {String(d.correct_answer)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {submittedHistory.length > 1 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">محاولاتكِ السابقة</p>
          </div>
          <div className="divide-y" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {submittedHistory.map(a => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                  المحاولة {a.attempt_number}
                  {a.submitted_at && (
                    <span className="mr-2" dir="ltr">
                      · {new Date(a.submitted_at).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </span>
                <span
                  className="text-sm font-bold font-['Inter']"
                  style={{ color: a.score === bestScore ? '#d4af37' : 'var(--text-secondary)' }}
                >
                  {a.score}% {a.score === bestScore && '⭐'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNewAttempt}
        className="w-full py-3.5 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95"
        style={{ background: 'var(--accent-sky)', color: '#0a1225' }}
      >
        <RotateCcw size={15} className="inline ml-2" />
        حاولي مرة ثانية
      </button>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function AssessmentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface-raised)' }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface-raised)' }} />
      ))}
    </div>
  )
}
