import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, BookOpen, Target, RefreshCcw,
  ChevronRight, ChevronLeft, Trophy, Loader2, Play, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { useShallow } from 'zustand/react/shallow'
import { startNewAttempt, abandonAndStartNew, autosaveAnswers, submitAttempt } from '../../../../lib/attempts'

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د']

// Stable key for a question — DB uses question_number, not id
const qKey = (q) => String(q.question_number ?? q.id ?? '')

// ─── CTA (first-time) ────────────────────────────────────────────────────────
function AssessmentCTA({ onStart, questionCount, passingScore, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      dir="rtl"
    >
      <div className="w-20 h-20 rounded-full bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.18)] flex items-center justify-center mb-6">
        <Trophy className="w-10 h-10 text-[#fbbf24]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">اختبار الوحدة</h2>
      <p className="text-[var(--text-muted)] mb-1">
        {questionCount} سؤال · درجة النجاح {passingScore}%
      </p>
      <p className="text-sm text-[var(--text-muted)] mb-8 max-w-sm leading-relaxed">
        اختبري فهمك لمحتوى الوحدة كاملاً. يمكنك إعادة الاختبار أكثر من مرة — أفضل درجة هي اللي تُحتسب.
      </p>
      <button
        onClick={onStart}
        disabled={loading}
        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#38bdf8] text-[#060e1c] font-bold text-base hover:bg-[#7dd3fc] active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
        ابدئي الاختبار
      </button>
    </motion.div>
  )
}

// ─── Resume screen ────────────────────────────────────────────────────────────
function AssessmentResume({ questionCount, answeredCount, onResume, onRestart, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      dir="rtl"
    >
      <div className="w-20 h-20 rounded-full bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.18)] flex items-center justify-center mb-6">
        <BookOpen className="w-10 h-10 text-[#38bdf8]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">محاولة غير مكتملة</h2>
      <p className="text-[var(--text-muted)] mb-8">
        أجبتِ على {answeredCount} من {questionCount} سؤال
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onResume}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#38bdf8] text-[#060e1c] font-bold hover:bg-[#7dd3fc] transition-all duration-150 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          تابعي من حيث توقفتِ
        </button>
        <button
          onClick={onRestart}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all duration-150 disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          ابدئي من جديد
        </button>
      </div>
    </motion.div>
  )
}

// ─── History screen (after submit) ───────────────────────────────────────────
function AssessmentHistory({ latestAttempt, bestScore, passingScore, onRetry, onReview, loading }) {
  const passed = bestScore >= passingScore
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      dir="rtl"
    >
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
        passed
          ? 'bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)]'
          : 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.18)]'
      }`}>
        {passed
          ? <Trophy className="w-10 h-10 text-[#4ade80]" />
          : <Target className="w-10 h-10 text-[#ef4444]" />}
      </div>
      <p className={`text-5xl font-bold mb-1 ${passed ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
        {bestScore}%
      </p>
      <p className="text-sm text-[var(--text-muted)] mb-1">أفضل درجة</p>
      <p className={`text-sm font-semibold mb-8 ${passed ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
        {passed ? '✓ اجتزتِ الاختبار' : `× درجة النجاح ${passingScore}%`}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {latestAttempt?.graded_details?.length > 0 && (
          <button
            onClick={onReview}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white hover:border-[rgba(255,255,255,0.18)] transition-all duration-150"
          >
            <BookOpen className="w-4 h-4" />
            راجعي إجاباتك
          </button>
        )}
        <button
          onClick={onRetry}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[rgba(56,189,248,0.3)] text-[#38bdf8] hover:border-[#38bdf8] transition-all duration-150 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          أعيدي المحاولة
        </button>
      </div>
    </motion.div>
  )
}

// ─── Result review ────────────────────────────────────────────────────────────
function ResultReview({ attempt, questions, onBack }) {
  const details = attempt?.graded_details ?? []
  const detailMap = {}
  details.forEach((d) => {
    detailMap[String(d.question_id)] = d
  })

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">مراجعة الإجابات</h3>
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          رجوع
        </button>
      </div>
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const key = qKey(q) || String(idx + 1)
          const detail = detailMap[key]
          const isCorrect = detail?.is_correct
          const studentAnswer = detail?.student_answer
          const options = q.options ?? q.choices ?? []
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 ${
                isCorrect
                  ? 'border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.03)]'
                  : 'border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.03)]'
              }`}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs text-[var(--text-muted)] mt-0.5 shrink-0 font-mono">
                  {idx + 1}
                </span>
                <p className="text-sm text-white leading-relaxed flex-1">{q.question_text}</p>
                {detail && (
                  isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                )}
              </div>
              <div className="space-y-1.5 mb-3">
                {options.map((opt, i) => {
                  const isStudentPick = studentAnswer != null && String(studentAnswer) === String(opt)
                  const isCorrectOpt = String(opt) === String(q.correct_answer)
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                        isCorrectOpt
                          ? 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]'
                          : isStudentPick && !isCorrectOpt
                          ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] line-through opacity-70'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      <span className="font-mono text-xs opacity-60">{OPTION_LABELS[i]}</span>
                      <span>{opt}</span>
                    </div>
                  )
                })}
              </div>
              {q.explanation_ar && (
                <p className="text-xs text-[var(--text-muted)] bg-[rgba(255,255,255,0.03)] rounded-lg px-3 py-2 leading-relaxed">
                  {q.explanation_ar}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quiz Player ──────────────────────────────────────────────────────────────
function QuizPlayer({ questions, attemptId, existingAnswers, onComplete }) {
  const [answers, setAnswers] = useState(() => existingAnswers ?? {})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const autosaveTimer = useRef(null)

  const q = questions[currentIdx]
  const currentKey = qKey(q)
  const options = q?.options ?? q?.choices ?? []
  const selectedOption = answers[currentKey]
  const totalAnswered = questions.filter((qq) => answers[qKey(qq)] != null).length
  const allDone = totalAnswered === questions.length

  // Debounced autosave
  useEffect(() => {
    if (!attemptId) return
    clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      autosaveAnswers(attemptId, answers)
    }, 800)
    return () => clearTimeout(autosaveTimer.current)
  }, [answers, attemptId])

  const handleSelect = useCallback((optionText) => {
    setAnswers((prev) => ({ ...prev, [currentKey]: optionText }))
  }, [currentKey])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    await autosaveAnswers(attemptId, answers)
    const result = await submitAttempt(attemptId)
    setSubmitting(false)
    if (result) onComplete(result)
  }, [attemptId, answers, onComplete])

  return (
    <div dir="rtl" className="flex flex-col min-h-[60vh] max-w-2xl mx-auto px-4 py-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
          <span>السؤال {currentIdx + 1} من {questions.length}</span>
          <span>{totalAnswered} / {questions.length} أجبتِ</span>
        </div>
        <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#38bdf8] transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.12 }}
          className="flex-1"
        >
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5 mb-5">
            {q?.skill && (
              <span className="text-xs text-[var(--text-muted)] mb-2 inline-block">
                {q.skill}
              </span>
            )}
            <p className="text-base leading-relaxed text-white">{q?.question_text}</p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {options.map((opt, i) => {
              const chosen = selectedOption === opt
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-right transition-all duration-150 ${
                    chosen
                      ? 'border-[#38bdf8] bg-[rgba(56,189,248,0.1)] text-[#38bdf8]'
                      : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] text-white hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    chosen
                      ? 'border-[#38bdf8] bg-[#38bdf8] text-[#060e1c]'
                      : 'border-[rgba(255,255,255,0.15)] text-[var(--text-muted)]'
                  }`}>
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="text-sm leading-relaxed">{opt}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </button>

        {currentIdx < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx((p) => p + 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-white hover:border-[rgba(255,255,255,0.18)] transition-all text-sm"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!allDone || submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#38bdf8] text-[#060e1c] font-bold hover:bg-[#7dd3fc] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            تسليم الاختبار
          </button>
        )}
      </div>

      {/* Mini question map (skip for very long quizzes) */}
      {questions.length <= 40 && (
        <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
          {questions.map((qq, i) => {
            const k = qKey(qq)
            const answered = answers[k] != null
            return (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                title={`السؤال ${i + 1}`}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                  i === currentIdx
                    ? 'bg-[#38bdf8] text-[#060e1c]'
                    : answered
                    ? 'bg-[rgba(56,189,248,0.18)] text-[#38bdf8]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Submit confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4"
            onClick={() => !submitting && setShowConfirm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0a1225] p-6"
              dir="rtl"
            >
              <h3 className="text-lg font-bold text-white mb-2">تأكيد التسليم</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                أجبتِ على {totalAnswered} من {questions.length} سؤال. هل أنتِ متأكدة؟
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#38bdf8] text-[#060e1c] font-bold hover:bg-[#7dd3fc] transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  نعم، سلّمي
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:text-white transition-all disabled:opacity-50"
                >
                  راجعي أولاً
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssessmentTab({ unitId }) {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const studentId = profile?.id
  const queryClient = useQueryClient()

  const [mode, setMode] = useState(null)       // 'quiz' | 'review' | null
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Load assessment for this unit
  const { data: assessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ['unit-assessment', unitId],
    enabled: !!unitId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_assessments')
        .select('*')
        .eq('unit_id', unitId)
        .eq('assessment_type', 'unit_quiz')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Load attempts
  const { data: attempts, isLoading: loadingAttempts, refetch: refetchAttempts } = useQuery({
    queryKey: ['assessment-attempts', assessment?.id, studentId],
    enabled: !!assessment?.id && !!studentId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_attempts')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', assessment.id)
        .is('deleted_at', null)
        .order('attempt_number', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const inProgress = attempts?.find((a) => a.status === 'in_progress') ?? null
  const submittedHistory = attempts?.filter((a) => a.status === 'submitted') ?? []
  const bestScore = submittedHistory.reduce((max, a) => Math.max(max, a.score ?? 0), 0)
  const latestSubmitted = submittedHistory[0] ?? null

  const questions = assessment?.questions ?? []
  const passingScore = assessment?.passing_score ?? 60

  const refreshAll = useCallback(() => {
    refetchAttempts()
    queryClient.invalidateQueries({ queryKey: ['unit-progress', unitId] })
  }, [refetchAttempts, queryClient, unitId])

  const handleStart = useCallback(async () => {
    if (!assessment?.id || !studentId) return
    setActionLoading(true)
    const id = await startNewAttempt(assessment.id, studentId)
    setActionLoading(false)
    if (id) {
      setActiveAttemptId(id)
      setMode('quiz')
      refetchAttempts()
    }
  }, [assessment?.id, studentId, refetchAttempts])

  const handleResume = useCallback(() => {
    if (!inProgress?.id) return
    setActiveAttemptId(inProgress.id)
    setMode('quiz')
  }, [inProgress])

  const handleRestart = useCallback(async () => {
    if (!inProgress?.id || !assessment?.id || !studentId) return
    setActionLoading(true)
    const id = await abandonAndStartNew(inProgress.id, assessment.id, studentId)
    setActionLoading(false)
    if (id) {
      setActiveAttemptId(id)
      setMode('quiz')
      refetchAttempts()
    }
  }, [inProgress?.id, assessment?.id, studentId, refetchAttempts])

  const handleRetry = useCallback(async () => {
    if (!assessment?.id || !studentId) return
    setActionLoading(true)
    const id = await startNewAttempt(assessment.id, studentId)
    setActionLoading(false)
    if (id) {
      setActiveAttemptId(id)
      setMode('quiz')
      refetchAttempts()
    }
  }, [assessment?.id, studentId, refetchAttempts])

  const handleQuizComplete = useCallback(() => {
    setMode(null)
    setActiveAttemptId(null)
    refreshAll()
  }, [refreshAll])

  // Resolve the active attempt row for the quiz player
  const activeAttemptRow = attempts?.find((a) => a.id === activeAttemptId) ?? inProgress

  if (loadingAssessment) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6" dir="rtl">
        <BookOpen className="w-12 h-12 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-muted)]">لا يوجد اختبار لهذه الوحدة بعد</p>
      </div>
    )
  }

  // Review mode
  if (mode === 'review' && reviewTarget) {
    return (
      <ResultReview
        attempt={reviewTarget}
        questions={questions}
        onBack={() => { setMode(null); setReviewTarget(null) }}
      />
    )
  }

  // Quiz mode — need the attempt row for the answer restore
  if (mode === 'quiz' && activeAttemptId) {
    const attemptRow = activeAttemptRow
    if (!attemptRow || attemptRow.id !== activeAttemptId) {
      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      )
    }
    return (
      <QuizPlayer
        key={activeAttemptId}
        questions={questions}
        attemptId={activeAttemptId}
        existingAnswers={attemptRow.answers ?? {}}
        onComplete={handleQuizComplete}
      />
    )
  }

  if (loadingAttempts) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
      </div>
    )
  }

  if (inProgress) {
    const answeredCount = Object.keys(inProgress.answers ?? {}).length
    return (
      <AssessmentResume
        questionCount={questions.length}
        answeredCount={answeredCount}
        onResume={handleResume}
        onRestart={handleRestart}
        loading={actionLoading}
      />
    )
  }

  if (submittedHistory.length > 0) {
    return (
      <AssessmentHistory
        latestAttempt={latestSubmitted}
        bestScore={bestScore}
        passingScore={passingScore}
        onRetry={handleRetry}
        onReview={() => { setReviewTarget(latestSubmitted); setMode('review') }}
        loading={actionLoading}
      />
    )
  }

  return (
    <AssessmentCTA
      onStart={handleStart}
      questionCount={questions.length}
      passingScore={passingScore}
      loading={actionLoading}
    />
  )
}
