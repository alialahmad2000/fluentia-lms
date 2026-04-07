import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Clock, ChevronRight, ChevronLeft, Check, X,
  Loader2, AlertTriangle, Shield, Lock, Zap, Flag,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

// ─── Main Component ─────────────────────────────────────────
export default function LevelExitTest() {
  const { levelId } = useParams()
  const { profile, studentData } = useAuthStore()
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading') // loading | blocked | ready | test | results

  // Fetch eligibility
  const { data: eligibility, isLoading: loadingEligibility } = useQuery({
    queryKey: ['exit-test-eligibility', profile?.id, levelId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_level_exit_eligibility', {
        p_student_id: profile.id,
        p_level_id: levelId,
      })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id && !!levelId,
  })

  // Fetch the assessment
  const { data: assessment } = useQuery({
    queryKey: ['level-exit-assessment', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_assessments')
        .select('*')
        .eq('level_id', levelId)
        .eq('assessment_type', 'level_cumulative')
        .single()
      if (error) throw error
      return data
    },
    enabled: !!levelId,
  })

  // Fetch level info
  const { data: level } = useQuery({
    queryKey: ['level-info', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('id', levelId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!levelId,
  })

  useEffect(() => {
    if (loadingEligibility) return
    if (!eligibility) { setPhase('blocked'); return }
    if (eligibility.can_take_test) setPhase('ready')
    else setPhase('blocked')
  }, [eligibility, loadingEligibility])

  const [resultsData, setResultsData] = useState(null)

  if (phase === 'loading' || loadingEligibility) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (phase === 'blocked') {
    return <BlockedView eligibility={eligibility} level={level} onBack={() => navigate('/student')} />
  }

  if (phase === 'test' && assessment) {
    return (
      <TestTaker
        assessment={assessment}
        level={level}
        studentId={profile?.id}
        onFinish={(data) => { setResultsData(data); setPhase('results') }}
        onBack={() => setPhase('ready')}
      />
    )
  }

  if (phase === 'results' && resultsData) {
    return <ResultsView data={resultsData} level={level} onBack={() => navigate('/student')} />
  }

  // Ready phase — show start screen
  return (
    <ReadyView
      level={level}
      assessment={assessment}
      eligibility={eligibility}
      onStart={() => setPhase('test')}
      onBack={() => navigate('/student')}
    />
  )
}

// ═══════════════════════════════════════════════════════════
// Blocked View
// ═══════════════════════════════════════════════════════════
function BlockedView({ eligibility, level, onBack }) {
  const levelName = level ? `L${level.level_number} (${level.cefr})` : ''

  const getCooldownText = () => {
    if (!eligibility?.cooldown_until) return null
    const until = new Date(eligibility.cooldown_until)
    const now = new Date()
    if (until <= now) return null
    const diffH = Math.ceil((until - now) / 3600000)
    if (diffH <= 1) return 'أقل من ساعة'
    return `${diffH} ساعة`
  }

  const cooldown = getCooldownText()

  return (
    <div className="max-w-lg mx-auto py-12" dir="rtl">
      <div className="fl-card-static p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
          <Lock size={32} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          اختبار نهاية المستوى — {levelName}
        </h1>

        {eligibility?.already_passed && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
            <p className="text-emerald-400 font-medium">اجتزت هذا الاختبار بالفعل!</p>
            {eligibility.best_score && (
              <p className="text-emerald-400/70 text-sm mt-1">أفضل نتيجة: {eligibility.best_score}%</p>
            )}
          </div>
        )}

        {!eligibility?.meets_completion_threshold && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
            <p className="text-amber-400 font-medium mb-1">لم تكمل الوحدات المطلوبة بعد</p>
            <p className="text-amber-400/70 text-sm">
              أنجزت {eligibility?.units_completed || 0} من {eligibility?.units_total || 12} وحدة
              — خلّص {Math.max(0, Math.ceil((eligibility?.units_total || 12) * 0.8) - (eligibility?.units_completed || 0))} وحدات عشان تفتح الاختبار
            </p>
          </div>
        )}

        {cooldown && !eligibility?.already_passed && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-4">
            <p className="text-sky-400 font-medium">فترة الانتظار</p>
            <p className="text-sky-400/70 text-sm mt-1">يمكنك إعادة المحاولة بعد {cooldown}</p>
          </div>
        )}

        <button onClick={onBack} className="btn-primary text-sm py-2.5 mt-4 flex items-center gap-2 mx-auto">
          <ChevronRight size={16} />
          العودة للرئيسية
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Ready View — Pre-test screen
// ═══════════════════════════════════════════════════════════
function ReadyView({ level, assessment, eligibility, onStart, onBack }) {
  const levelName = level ? `L${level.level_number} (${level.cefr})` : ''
  const questionCount = assessment?.questions?.length || 60
  const duration = assessment?.time_limit_minutes || 60
  const passingScore = assessment?.passing_score || 70

  return (
    <div className="max-w-lg mx-auto py-12" dir="rtl">
      <div className="fl-card-static p-8 text-center relative">
        <div className="card-top-line" style={{ opacity: 0.5 }} />
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
          <Shield size={32} className="text-violet-400" />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          اختبار نهاية المستوى — {levelName}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
          {questionCount} سؤال · {duration} دقيقة · درجة النجاح {passingScore}%
        </p>

        <div className="space-y-3 mb-6 text-right">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <Clock size={18} className="text-amber-400 shrink-0" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              المدة {duration} دقيقة — سيُرسل تلقائياً عند انتهاء الوقت
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              لا يمكنك الخروج من الاختبار بعد البدء
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-raised)' }}>
            <Trophy size={18} className="text-gold-400 shrink-0" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              +200 XP عند النجاح · +50 إذا حصلت على 90%+ · +100 إذا حصلت على 100%
            </p>
          </div>
        </div>

        {eligibility?.attempt_count > 0 && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
            المحاولة رقم {(eligibility.attempt_count || 0) + 1}
          </p>
        )}

        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-sky))' }}
        >
          ابدأ الاختبار
        </button>

        <button onClick={onBack} className="text-sm mt-4 block mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          العودة
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Test Taker
// ═══════════════════════════════════════════════════════════
function TestTaker({ assessment, level, studentId, onFinish, onBack }) {
  const queryClient = useQueryClient()
  const questions = assessment.questions || []
  const totalQ = questions.length
  const duration = (assessment.time_limit_minutes || 60) * 60

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [attemptId, setAttemptId] = useState(null)
  const timerRef = useRef(null)
  const autoSubmitRef = useRef(false)
  const startTimeRef = useRef(Date.now())

  // Create attempt on mount
  useEffect(() => {
    const createAttempt = async () => {
      // Get current attempt number
      const { count } = await supabase
        .from('student_level_assessment_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('assessment_id', assessment.id)

      const { data, error } = await supabase
        .from('student_level_assessment_attempts')
        .insert({
          student_id: studentId,
          assessment_id: assessment.id,
          level_id: level.id,
          attempt_number: (count || 0) + 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) setAttemptId(data.id)
      if (error) console.error('Create attempt error:', error)
    }
    createAttempt()
  }, [studentId, assessment.id, level.id])

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true
        handleSubmit(true)
      }
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === 0 ? 'done' : 'running'])

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (submitting || !attemptId) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    try {
      // Grade
      let correct = 0
      const gradedAnswers = questions.map((q, i) => {
        const studentAnswer = answers[i]
        const isCorrect = gradeQuestion(q, studentAnswer)
        if (isCorrect) correct++
        return { questionIndex: i, studentAnswer, isCorrect }
      })

      const scorePct = Math.round((correct / totalQ) * 100 * 100) / 100
      const passed = scorePct >= (assessment.passing_score || 70)
      const durationSecs = Math.round((Date.now() - startTimeRef.current) / 1000)

      // Update attempt
      await supabase
        .from('student_level_assessment_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score_percent: scorePct,
          total_questions: totalQ,
          correct_answers: correct,
          answers: gradedAnswers,
          passed,
          duration_seconds: durationSecs,
        })
        .eq('id', attemptId)

      // Award XP if passed
      if (passed) {
        let xpAmount = 200
        let description = `اجتياز اختبار نهاية المستوى ${level.level_number}`

        if (scorePct >= 100) {
          xpAmount += 100
          description += ' (درجة كاملة!)'
        } else if (scorePct >= 90) {
          xpAmount += 50
          description += ' (أداء متميز)'
        }

        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: xpAmount,
          reason: 'achievement',
          description,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['exit-test-eligibility'] })

      onFinish({
        scorePct,
        correct,
        totalQ,
        passed,
        gradedAnswers,
        questions,
        timedOut,
        xpAwarded: passed ? (scorePct >= 100 ? 300 : scorePct >= 90 ? 250 : 200) : 0,
      })
    } catch (err) {
      console.error('Submit error:', err)
      setSubmitting(false)
    }
  }, [submitting, attemptId, answers, questions, totalQ, assessment, level, studentId, queryClient, onFinish])

  const question = questions[currentIndex]
  const progress = ((currentIndex + 1) / totalQ) * 100

  const formatTimer = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Top bar */}
      <div className="fl-card-static p-3 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            سؤال {currentIndex + 1} من {totalQ}
          </span>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono font-bold flex items-center gap-1 ${timeLeft < 120 ? 'text-red-400 animate-pulse' : 'text-[var(--text-tertiary)]'}`}>
              <Clock className="w-4 h-4" />
              {formatTimer(timeLeft)}
            </span>
            <button
              onClick={() => {
                setFlagged(prev => {
                  const next = new Set(prev)
                  next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex)
                  return next
                })
              }}
              className={`p-1.5 rounded-lg transition-colors ${flagged.has(currentIndex) ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--text-tertiary)]'}`}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-sky-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {/* Question dots — scrollable for 60 questions */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-6 h-6 rounded-md text-[10px] font-bold transition-colors shrink-0 ${
                i === currentIndex
                  ? 'bg-violet-500 text-white'
                  : answers[i] !== undefined
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : flagged.has(i)
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-[var(--surface-base)] text-[var(--text-tertiary)]'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="fl-card-static p-7 mb-4"
        >
          {question?.skill && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 mb-3 inline-block">
              {question.skill}
            </span>
          )}
          <p className="font-medium mb-5 text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {question?.question_text}
          </p>

          {/* MCQ options */}
          <div className="space-y-2">
            {(question?.options || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers(prev => ({ ...prev, [currentIndex]: opt }))}
                className={`w-full text-right p-3 rounded-xl border transition-all text-sm ${
                  answers[currentIndex] === opt
                    ? 'border-violet-500 bg-violet-500/20 text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-tertiary)] hover:border-violet-500/30'
                }`}
              >
                <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{String.fromCharCode(1571 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </button>

        {currentIndex < totalQ - 1 ? (
          <button
            onClick={() => setCurrentIndex(i => Math.min(totalQ - 1, i + 1))}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            إنهاء الاختبار
          </button>
        )}
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="fl-card-static p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>إنهاء الاختبار؟</h3>
              {(() => {
                const unanswered = questions.filter((_, i) => answers[i] === undefined).length
                return unanswered > 0 ? (
                  <p className="text-amber-400/80 text-sm text-center mb-4">
                    لديك {unanswered} سؤال بدون إجابة
                  </p>
                ) : (
                  <p className="text-sm text-center mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    هل أنت متأكد من إرسال إجاباتك؟
                  </p>
                )
              })()}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--surface-base)', color: 'var(--text-tertiary)' }}
                >
                  تراجع
                </button>
                <button
                  onClick={() => { setShowConfirm(false); handleSubmit(false) }}
                  disabled={submitting}
                  className="flex-1 btn-primary text-sm bg-emerald-600 hover:bg-emerald-500"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'إرسال'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Results View
// ═══════════════════════════════════════════════════════════
function ResultsView({ data, level, onBack }) {
  const { scorePct, correct, totalQ, passed, gradedAnswers, questions, timedOut, xpAwarded } = data
  const levelName = level ? `L${level.level_number} (${level.cefr})` : ''

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6" dir="rtl">
      {/* Confetti on pass */}
      {passed && (
        <div className="confetti-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#38bdf8', '#a78bfa', '#f59e0b', '#10b981', '#ec4899'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      {/* Score card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="fl-card-static p-8 text-center"
      >
        {passed ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Trophy size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              مبروك! اجتزت اختبار نهاية المستوى
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
              {levelName}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              ما قدرت تعدي هذه المرة
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>
              حاول مرة ثانية بعد 24 ساعة
            </p>
          </>
        )}

        {timedOut && (
          <p className="text-amber-400 text-xs mb-3">انتهى الوقت — تم الإرسال تلقائياً</p>
        )}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-6xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {Math.round(scorePct)}<span className="text-2xl" style={{ color: 'var(--text-tertiary)' }}>%</span>
        </motion.div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
          {correct} صحيحة من {totalQ}
        </p>

        {xpAwarded > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20"
          >
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold">+{xpAwarded} XP</span>
          </motion.div>
        )}
      </motion.div>

      {/* Answer review */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="fl-card-static p-7"
      >
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>مراجعة الإجابات</h3>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {questions.map((q, i) => {
            const graded = gradedAnswers[i]
            const isCorrect = graded?.isCorrect
            return (
              <div key={i} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                  </span>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>{i + 1}.</span>
                    {q.question_text}
                  </p>
                </div>
                <div className="mr-8 space-y-1 text-sm">
                  <p className={isCorrect ? 'text-emerald-400/80' : 'text-red-400/80'}>
                    إجابتك: {graded?.studentAnswer || '—'}
                  </p>
                  {!isCorrect && (
                    <p className="text-emerald-400/60">
                      الإجابة الصحيحة: {q.correct_answer}
                    </p>
                  )}
                  {q.explanation_ar && !isCorrect && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{q.explanation_ar}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      <button onClick={onBack} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        <ChevronRight className="w-4 h-4" />
        العودة للرئيسية
      </button>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────
function gradeQuestion(question, answer) {
  if (answer === undefined || answer === null || answer === '') return false
  return String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()
}
