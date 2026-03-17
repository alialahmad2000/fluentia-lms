import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Clock, ChevronLeft, Check, X, Loader2, BarChart3,
  Zap, Target, Trophy, ArrowRight, BookOpen, Headphones,
  PenLine, MessageSquare, AlertCircle, Play, Radar, TrendingUp,
  Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { ACADEMIC_LEVELS } from '../../lib/constants'

// ─── Constants ──────────────────────────────────────────────
const SKILL_INFO = {
  grammar: { label: 'القواعد', icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  vocabulary: { label: 'المفردات', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  reading: { label: 'القراءة', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  listening: { label: 'الاستماع', icon: Headphones, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  writing: { label: 'الكتابة', icon: PenLine, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  speaking: { label: 'المحادثة', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10' },
}

const TEST_TYPE_INFO = {
  placement: { label: 'اختبار تحديد المستوى', description: 'لتحديد مستواك الحالي في اللغة الإنجليزية', icon: Target, color: 'sky' },
  periodic: { label: 'اختبار دوري', description: 'لقياس تطورك ومقارنة أداءك', icon: TrendingUp, color: 'emerald' },
  diagnostic: { label: 'اختبار تشخيصي', description: 'لتحديد نقاط القوة والضعف بدقة', icon: Radar, color: 'violet' },
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Main Component ─────────────────────────────────────────
export default function StudentAdaptiveTest() {
  const [view, setView] = useState('menu') // menu | test | results
  const [sessionId, setSessionId] = useState(null)
  const [testType, setTestType] = useState(null)
  const [resultsData, setResultsData] = useState(null)

  const startTest = async (type) => {
    setTestType(type)
    setView('test')
  }

  const finishTest = (data) => {
    setResultsData(data)
    setView('results')
  }

  const backToMenu = () => {
    setView('menu')
    setSessionId(null)
    setTestType(null)
    setResultsData(null)
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
            <TestMenu onStart={startTest} />
          </motion.div>
        )}
        {view === 'test' && testType && (
          <motion.div key="test" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <TestTaker testType={testType} onFinish={finishTest} onBack={backToMenu} />
          </motion.div>
        )}
        {view === 'results' && resultsData && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <TestResults data={resultsData} testType={testType} onBack={backToMenu} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TEST MENU — Choose test type + view history
// ═══════════════════════════════════════════════════════════════
function TestMenu({ onStart }) {
  const { profile } = useAuthStore()
  const [showHistory, setShowHistory] = useState(false)

  // Fetch test history
  const { data: history } = useQuery({
    queryKey: ['test-history', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Check if there's an in-progress test
  const { data: activeSession } = useQuery({
    queryKey: ['active-test-session', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!profile?.id,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Brain size={20} className="text-sky-400" />
          </div>
          الاختبارات التكيفية
        </h1>
        <p className="text-muted text-sm mt-1">اختبارات ذكية تتكيف مع مستواك تلقائياً</p>
      </div>

      {/* Active session banner */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 border border-amber-500/20"
          style={{ background: 'var(--surface-raised)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>لديك اختبار غير مكتمل</p>
                <p className="text-xs text-muted">{TEST_TYPE_INFO[activeSession.test_type]?.label} — {activeSession.questions_answered} سؤال تم الإجابة عليه</p>
              </div>
            </div>
            <button
              onClick={() => onStart(activeSession.test_type)}
              className="fl-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Play size={14} /> متابعة
            </button>
          </div>
        </motion.div>
      )}

      {/* Test type cards */}
      <div className="grid gap-4">
        {Object.entries(TEST_TYPE_INFO).map(([type, info]) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fl-card p-6 cursor-pointer hover:border-sky-500/30 transition-all"
            onClick={() => onStart(type)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-${info.color}-500/10 flex items-center justify-center`}>
                  <info.icon size={22} className={`text-${info.color}-400`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{info.label}</h3>
                  <p className="text-xs text-muted mt-0.5">{info.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                    <span className="flex items-center gap-1"><Clock size={10} /> 15-25 دقيقة</span>
                    <span className="flex items-center gap-1"><Target size={10} /> 20-30 سؤال</span>
                    <span className="flex items-center gap-1"><Brain size={10} /> تكيفي</span>
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <div className="fl-card-static p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield size={16} className="text-sky-400" />
          كيف يعمل الاختبار التكيفي؟
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Target, title: 'أسئلة ذكية', desc: 'الأسئلة تتغير صعوبتها بناءً على إجاباتك' },
            { icon: Brain, title: 'تحليل فوري', desc: 'الذكاء الاصطناعي يحلل أداءك ويحدد مستواك' },
            { icon: BarChart3, title: 'نتائج دقيقة', desc: 'تقرير مفصل عن كل مهارة مع توصيات' },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 rounded-xl" style={{ background: 'var(--surface-base)' }}>
              <item.icon size={20} className="text-sky-400 mx-auto mb-2" />
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              <p className="text-[10px] text-muted mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history?.length > 0 && (
        <div className="fl-card-static overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-violet-400" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>سجل الاختبارات ({history.length})</span>
            </div>
            {showHistory ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {history.map((session) => (
                    <div key={session.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {TEST_TYPE_INFO[session.test_type]?.label || session.test_type}
                        </p>
                        <p className="text-[10px] text-muted mt-0.5">
                          {new Date(session.completed_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' — '}
                          {session.questions_answered} سؤال
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-sky-400">{session.overall_score ? `${Math.round(session.overall_score)}%` : '—'}</p>
                        {session.recommended_level && (
                          <p className="text-[10px] text-muted">المستوى: {ACADEMIC_LEVELS[session.recommended_level]?.cefr || session.recommended_level}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TEST TAKER — The actual test interface
// ═══════════════════════════════════════════════════════════════
function TestTaker({ testType, onFinish, onBack }) {
  const { profile } = useAuthStore()
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ answered: 0, correct: 0, total_estimated: 25 })
  const [feedback, setFeedback] = useState(null) // { is_correct, explanation }
  const [timer, setTimer] = useState(0)
  const [questionTimer, setQuestionTimer] = useState(0)
  const timerRef = useRef(null)
  const questionTimerRef = useRef(null)

  // Start the test
  useEffect(() => {
    startTest()
    return () => {
      clearInterval(timerRef.current)
      clearInterval(questionTimerRef.current)
    }
  }, [])

  // Global timer
  useEffect(() => {
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  async function startTest() {
    setIsLoading(true)
    setError('')
    try {
      const res = await invokeWithRetry('adaptive-test', {
        body: { action: 'start', test_type: testType, student_id: profile?.id },
      }, { timeoutMs: 15000 })

      if (res.error) throw new Error(typeof res.error === 'string' ? res.error : 'فشل بدء الاختبار')

      const data = res.data
      setSessionId(data.session_id)
      setCurrentQuestion(data.question)
      setStats(s => ({ ...s, total_estimated: data.total_estimated || 25 }))
      resetQuestionTimer()
    } catch (err) {
      setError(err.message || 'فشل بدء الاختبار')
    } finally {
      setIsLoading(false)
    }
  }

  function resetQuestionTimer() {
    setQuestionTimer(0)
    clearInterval(questionTimerRef.current)
    questionTimerRef.current = setInterval(() => setQuestionTimer(t => t + 1), 1000)
  }

  async function submitAnswer() {
    if (!selectedAnswer || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    clearInterval(questionTimerRef.current)

    try {
      const res = await invokeWithRetry('adaptive-test', {
        body: {
          action: 'answer',
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer: selectedAnswer,
          time_spent_seconds: questionTimer,
        },
      }, { timeoutMs: 15000 })

      if (res.error) throw new Error(typeof res.error === 'string' ? res.error : 'فشل إرسال الإجابة')

      const data = res.data

      // Show brief feedback
      setFeedback({
        is_correct: data.is_correct,
        explanation: data.explanation,
      })

      setStats({
        answered: data.questions_answered || stats.answered + 1,
        correct: data.correct_answers || (data.is_correct ? stats.correct + 1 : stats.correct),
        total_estimated: data.total_estimated || stats.total_estimated,
      })

      // Wait for feedback display then move to next question
      setTimeout(() => {
        setFeedback(null)
        setSelectedAnswer(null)

        if (data.test_complete || !data.next_question) {
          completeTest()
        } else {
          setCurrentQuestion(data.next_question)
          resetQuestionTimer()
        }
      }, 1500)
    } catch (err) {
      setError(err.message || 'فشل إرسال الإجابة')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function completeTest() {
    setIsLoading(true)
    setError('')
    clearInterval(timerRef.current)

    try {
      const res = await invokeWithRetry('adaptive-test', {
        body: { action: 'complete', session_id: sessionId },
      }, { timeoutMs: 60000 })

      if (res.error) throw new Error(typeof res.error === 'string' ? res.error : 'فشل إنهاء الاختبار')

      onFinish(res.data)
    } catch (err) {
      setError(err.message || 'فشل إنهاء الاختبار')
      setIsLoading(false)
    }
  }

  const progressPct = stats.total_estimated > 0 ? Math.round((stats.answered / stats.total_estimated) * 100) : 0
  const skillInfo = currentQuestion ? SKILL_INFO[currentQuestion.skill] || SKILL_INFO.grammar : SKILL_INFO.grammar

  if (isLoading && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="text-sky-400 animate-spin" />
        <p className="text-sm text-muted">
          {sessionId ? 'جاري تحليل النتائج بالذكاء الاصطناعي...' : 'جاري تحضير الاختبار...'}
        </p>
      </div>
    )
  }

  if (error && !currentQuestion) {
    return (
      <div className="fl-card-static p-8 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={startTest} className="fl-btn-primary text-sm py-2 px-6">إعادة المحاولة</button>
          <button onClick={onBack} className="btn-ghost text-sm py-2 px-6">رجوع</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Top bar: progress + timer */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="text-muted hover:text-[var(--text-primary)] transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span>سؤال {stats.answered + 1} من ~{stats.total_estimated}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(timer)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <motion.div
              className="h-full rounded-full bg-sky-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Check size={14} /> {stats.correct} صحيح
        </span>
        <span className="flex items-center gap-1.5 text-red-400">
          <X size={14} /> {stats.answered - stats.correct} خطأ
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <Clock size={14} /> {questionTimer}ث
        </span>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="fl-card-static p-6">
              {/* Skill badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${skillInfo.bg} ${skillInfo.color}`}>
                  {skillInfo.label}
                </span>
                {currentQuestion.grammar_topic && (
                  <span className="text-[10px] text-muted px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)' }}>
                    {currentQuestion.grammar_topic}
                  </span>
                )}
              </div>

              {/* Reading passage */}
              {currentQuestion.passage && (
                <div className="rounded-xl p-4 mb-4 text-sm leading-relaxed" dir="ltr"
                  style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {currentQuestion.passage}
                </div>
              )}

              {/* Question text */}
              <h3 className="text-base font-semibold mb-2" dir="ltr" style={{ color: 'var(--text-primary)' }}>
                {currentQuestion.question_text}
              </h3>
              {currentQuestion.question_text_ar && (
                <p className="text-xs text-muted mb-5">{currentQuestion.question_text_ar}</p>
              )}

              {/* Options (MCQ) */}
              {currentQuestion.options && (
                <div className="space-y-2.5">
                  {currentQuestion.options.map((option, i) => {
                    const letter = String.fromCharCode(65 + i)
                    const isSelected = selectedAnswer === option
                    const showCorrect = feedback && option === currentQuestion.correct_answer
                    const showWrong = feedback && isSelected && !feedback.is_correct

                    return (
                      <button
                        key={i}
                        onClick={() => !feedback && setSelectedAnswer(option)}
                        disabled={!!feedback || isSubmitting}
                        className={`w-full text-start p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                          showCorrect
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : showWrong
                            ? 'border-red-500/40 bg-red-500/10'
                            : isSelected
                            ? 'border-sky-500/40 bg-sky-500/10'
                            : 'border-border-subtle hover:border-sky-500/20 hover:bg-[var(--surface-raised)]'
                        }`}
                        dir="ltr"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          showCorrect
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : showWrong
                            ? 'bg-red-500/20 text-red-400'
                            : isSelected
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-[var(--surface-raised)] text-muted'
                        }`}>
                          {showCorrect ? <Check size={14} /> : showWrong ? <X size={14} /> : letter}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{option}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Fill in the blank */}
              {currentQuestion.question_type === 'fill_blank' && !currentQuestion.options && (
                <input
                  type="text"
                  value={selectedAnswer || ''}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="fl-input w-full text-sm py-3"
                  dir="ltr"
                  disabled={!!feedback}
                />
              )}

              {/* True/False */}
              {currentQuestion.question_type === 'true_false' && (
                <div className="flex gap-3">
                  {['True', 'False'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => !feedback && setSelectedAnswer(opt)}
                      disabled={!!feedback}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        selectedAnswer === opt
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                          : 'border-border-subtle text-muted hover:border-sky-500/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback banner */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-3 rounded-xl p-4 border ${
                    feedback.is_correct
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {feedback.is_correct ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <X size={16} className="text-red-400" />
                    )}
                    <span className={`text-sm font-semibold ${feedback.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                      {feedback.is_correct ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
                    </span>
                  </div>
                  {feedback.explanation && (
                    <p className="text-xs text-muted mt-1">{feedback.explanation}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Submit / Skip buttons */}
      {!feedback && currentQuestion && (
        <div className="flex gap-3">
          <button
            onClick={submitAnswer}
            disabled={!selectedAnswer || isSubmitting}
            className="fl-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> جاري الإرسال...</>
            ) : (
              <><Check size={16} /> تأكيد الإجابة</>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && currentQuestion && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Loading overlay for completion */}
      {isLoading && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="text-center">
            <Loader2 size={40} className="text-sky-400 animate-spin mx-auto mb-4" />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>جاري تحليل النتائج بالذكاء الاصطناعي...</p>
            <p className="text-xs text-muted mt-1">قد يستغرق هذا بضع ثوانٍ</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TEST RESULTS — Show detailed AI-analyzed results
// ═══════════════════════════════════════════════════════════════
function TestResults({ data, testType, onBack }) {
  if (!data) return null

  const skills = data.skill_scores || {}
  const level = data.recommended_level || data.estimated_level
  const levelInfo = level ? ACADEMIC_LEVELS[level] : null

  // Build radar chart data
  const radarSkills = ['grammar', 'vocabulary', 'reading', 'listening']

  // SVG Radar Chart
  const cx = 120, cy = 120, r = 90
  const angleStep = (2 * Math.PI) / radarSkills.length
  const startAngle = -Math.PI / 2

  const hexPoints = (fraction) =>
    radarSkills.map((_, i) => {
      const angle = startAngle + i * angleStep
      return `${cx + r * fraction * Math.cos(angle)},${cy + r * fraction * Math.sin(angle)}`
    }).join(' ')

  const skillPoints = radarSkills.map((sk, i) => {
    const val = (skills[sk] || 0) / 100
    const angle = startAngle + i * angleStep
    return `${cx + r * val * Math.cos(angle)},${cy + r * val * Math.sin(angle)}`
  }).join(' ')

  const overallScore = data.overall_score ? Math.round(data.overall_score) : null
  const scoreColor = overallScore >= 80 ? 'text-emerald-400' : overallScore >= 60 ? 'text-sky-400' : overallScore >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <Trophy size={28} className="text-sky-400" />
        </motion.div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>نتائج الاختبار</h2>
        <p className="text-xs text-muted mt-1">{TEST_TYPE_INFO[testType]?.label}</p>
      </div>

      {/* Score + Level hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-6 text-center"
      >
        <div className="card-top-line shimmer" />
        {overallScore !== null && (
          <div className={`text-5xl font-bold mb-2 ${scoreColor}`}>
            {overallScore}<span className="text-lg text-muted">%</span>
          </div>
        )}
        {levelInfo && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 mt-2">
            <span className="text-sm font-bold text-sky-400">{levelInfo.cefr}</span>
            <span className="text-xs text-muted">—</span>
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{levelInfo.name_ar}</span>
          </div>
        )}
        {data.confidence_score && (
          <p className="text-[10px] text-muted mt-2">دقة التقييم: {Math.round(data.confidence_score * 100)}%</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted">
          <span>{data.questions_answered || '—'} سؤال</span>
          <span>{data.correct_answers || '—'} صحيح</span>
        </div>
      </motion.div>

      {/* Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fl-card-static p-6"
      >
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Radar size={16} className="text-sky-400" />
          رادار المهارات
        </h3>
        <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
          {[0.33, 0.66, 1].map((lv) => (
            <polygon key={lv} points={hexPoints(lv)} fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
          ))}
          {radarSkills.map((_, i) => {
            const angle = startAngle + i * angleStep
            return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="var(--border-subtle)" strokeWidth="1" />
          })}
          <motion.polygon
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            points={skillPoints}
            fill="rgba(14,165,233,0.2)"
            stroke="rgb(14,165,233)"
            strokeWidth="2"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {radarSkills.map((sk, i) => {
            const angle = startAngle + i * angleStep
            const lx = cx + (r + 20) * Math.cos(angle)
            const ly = cy + (r + 20) * Math.sin(angle)
            return (
              <text key={sk} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[10px]">
                {SKILL_INFO[sk]?.label || sk}
              </text>
            )
          })}
        </svg>
      </motion.div>

      {/* Per-skill scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fl-card-static p-6"
      >
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={16} className="text-emerald-400" />
          تفاصيل المهارات
        </h3>
        <div className="space-y-3">
          {Object.entries(skills).map(([sk, score]) => {
            const info = SKILL_INFO[sk]
            if (!info) return null
            const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-sky-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'

            return (
              <div key={sk} className="flex items-center gap-3">
                <span className="text-xs text-muted w-16 text-left shrink-0">{info.label}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className={`h-full rounded-full ${barColor}`}
                  />
                </div>
                <span className="text-xs font-bold w-10 text-left" style={{ color: 'var(--text-primary)' }}>{Math.round(score)}%</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* AI Analysis */}
      {data.ai_analysis_ar && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fl-card-static p-6"
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Brain size={16} className="text-violet-400" />
            تحليل الذكاء الاصطناعي
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {data.ai_analysis_ar}
          </p>
        </motion.div>
      )}

      {/* Back button */}
      <div className="flex justify-center pt-2">
        <button onClick={onBack} className="btn-ghost text-sm py-2.5 px-8 flex items-center gap-2">
          <ChevronLeft size={16} /> العودة للقائمة
        </button>
      </div>
    </div>
  )
}
