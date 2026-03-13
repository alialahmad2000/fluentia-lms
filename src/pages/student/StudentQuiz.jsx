import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, Clock, Trophy, ChevronRight, ChevronLeft,
  Flag, Check, X, Zap, BarChart3, Loader2, AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// ─── Constants ──────────────────────────────────────────────
const TYPE_LABELS = {
  quick_quiz: { label: 'كويز سريع', color: 'sky' },
  full_assessment: { label: 'اختبار', color: 'violet' },
}

const SKILL_COLORS = {
  grammar: '#6366f1',
  vocabulary: '#06b6d4',
  reading: '#10b981',
  writing: '#f59e0b',
  listening: '#ec4899',
  speaking: '#8b5cf6',
}

// ─── Main Component ─────────────────────────────────────────
export default function StudentQuiz() {
  const [view, setView] = useState('list') // list | quiz | results
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [attemptId, setAttemptId] = useState(null)
  const [resultsData, setResultsData] = useState(null)

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz)
    setView('quiz')
  }

  const finishQuiz = (data) => {
    setResultsData(data)
    setView('results')
  }

  const backToList = () => {
    setView('list')
    setSelectedQuiz(null)
    setAttemptId(null)
    setResultsData(null)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuizList onStart={startQuiz} onViewResults={(quiz, attempt) => {
              setSelectedQuiz(quiz)
              setResultsData(attempt)
              setView('results')
            }} />
          </motion.div>
        )}
        {view === 'quiz' && selectedQuiz && (
          <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuizTaker quiz={selectedQuiz} onFinish={finishQuiz} onBack={backToList} />
          </motion.div>
        )}
        {view === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <QuizResults quiz={selectedQuiz} data={resultsData} onBack={backToList} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIEW 1: Quiz List
// ═══════════════════════════════════════════════════════════
function QuizList({ onStart, onViewResults }) {
  const { profile, studentData } = useAuthStore()
  const groupId = studentData?.group_id

  // Fetch published quizzes for student's group
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['student-quizzes', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!groupId,
  })

  // Fetch student's attempts for all quizzes
  const { data: attempts } = useQuery({
    queryKey: ['student-quiz-attempts', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', profile?.id)
      const map = {}
      ;(data || []).forEach(a => {
        if (!map[a.quiz_id] || a.created_at > map[a.quiz_id].created_at) {
          map[a.quiz_id] = a
        }
      })
      return map
    },
    enabled: !!profile?.id,
  })

  const getQuizStatus = (quiz) => {
    const attempt = attempts?.[quiz.id]
    if (!attempt) return { status: 'new', label: 'ابدأ', color: 'emerald' }
    if (attempt.status === 'completed') return { status: 'completed', label: `مكتمل ✅ (${attempt.percentage}%)`, color: 'sky' }
    if (attempt.status === 'in_progress') return { status: 'in_progress', label: 'مستمر', color: 'amber' }
    return { status: 'new', label: 'ابدأ', color: 'emerald' }
  }

  const formatDeadline = (deadline) => {
    if (!deadline) return null
    const d = new Date(deadline)
    const now = new Date()
    const diff = d - now
    if (diff < 0) return 'انتهى الموعد'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'اليوم آخر موعد'
    if (days === 1) return 'غداً آخر موعد'
    return `باقي ${days} يوم`
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">الاختبارات</h1>
          <p className="text-sm text-white/50">اختبر مستواك واكسب XP</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : !quizzes?.length ? (
        <div className="glass-card p-8 text-center">
          <ClipboardCheck className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">لا توجد اختبارات متاحة حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz, i) => {
            const qs = getQuizStatus(quiz)
            const type = TYPE_LABELS[quiz.type] || TYPE_LABELS.quick_quiz
            const deadlineText = formatDeadline(quiz.deadline)

            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 hover:border-violet-500/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (qs.status === 'completed') {
                    onViewResults(quiz, attempts[quiz.id])
                  } else {
                    onStart(quiz)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-white text-sm">{quiz.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${type.color}-500/20 text-${type.color}-400`}>
                        {type.label}
                      </span>
                    </div>
                    {quiz.description && (
                      <p className="text-xs text-white/40 mb-2 line-clamp-1">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        {quiz.total_questions} سؤال
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {quiz.total_points} نقطة
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        +{quiz.xp_reward} XP
                      </span>
                      {quiz.time_limit_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {quiz.time_limit_minutes} دقيقة
                        </span>
                      )}
                    </div>
                    {deadlineText && (
                      <p className="text-xs text-amber-400/70 mt-1">{deadlineText}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs px-3 py-1.5 rounded-lg font-medium bg-${qs.color}-500/20 text-${qs.color}-400`}>
                      {qs.label}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-white/30" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// VIEW 2: Quiz Taker
// ═══════════════════════════════════════════════════════════
function QuizTaker({ quiz, onFinish, onBack }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null)
  const [attemptId, setAttemptId] = useState(null)
  const timerRef = useRef(null)

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['quiz-questions', quiz.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_number', { ascending: true })
      if (error) throw error
      let qs = data || []
      if (quiz.shuffle_questions) qs = shuffleArray([...qs])
      return qs
    },
  })

  // Create attempt on mount
  useEffect(() => {
    const createAttempt = async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          student_id: profile?.id,
          started_at: new Date().toISOString(),
          status: 'in_progress',
          total_score: 0,
          max_score: quiz.total_points || 0,
          percentage: 0,
        })
        .select()
        .single()
      if (data) setAttemptId(data.id)
    }
    createAttempt()
  }, [quiz.id, profile?.id])

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null])

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (submitting || !questions || !attemptId) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    try {
      // Grade each question
      const graded = questions.map(q => {
        const studentAnswer = answers[q.id]
        const isCorrect = gradeQuestion(q, studentAnswer)
        return {
          attempt_id: attemptId,
          question_id: q.id,
          student_answer: typeof studentAnswer === 'object' ? JSON.stringify(studentAnswer) : (studentAnswer || ''),
          is_correct: isCorrect,
          points_earned: isCorrect ? (q.points || 1) : 0,
        }
      })

      // Insert quiz_answers
      await supabase.from('quiz_answers').insert(graded)

      // Calculate scores
      const totalScore = graded.reduce((sum, a) => sum + a.points_earned, 0)
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0)
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

      // Skill breakdown
      const skillMap = {}
      questions.forEach((q, i) => {
        const tag = q.skill_tag || 'general'
        if (!skillMap[tag]) skillMap[tag] = { correct: 0, total: 0 }
        skillMap[tag].total++
        if (graded[i].is_correct) skillMap[tag].correct++
      })
      const skillBreakdown = {}
      Object.entries(skillMap).forEach(([k, v]) => {
        skillBreakdown[k] = Math.round((v.correct / v.total) * 100)
      })

      // Calculate XP
      let xpAwarded = quiz.xp_reward || 0
      if (percentage === 100 && quiz.xp_bonus_perfect) {
        xpAwarded += quiz.xp_bonus_perfect
      }

      // Calculate time spent
      const timeSpent = quiz.time_limit_minutes
        ? (quiz.time_limit_minutes * 60) - (timeLeft || 0)
        : null

      // Update attempt
      const { data: updatedAttempt } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          total_score: totalScore,
          max_score: maxScore,
          percentage,
          skill_breakdown: skillBreakdown,
          xp_awarded: xpAwarded,
          status: timedOut ? 'timed_out' : 'completed',
        })
        .eq('id', attemptId)
        .select()
        .single()

      // Award XP
      if (xpAwarded > 0) {
        await supabase.from('xp_transactions').insert({
          student_id: profile?.id,
          amount: xpAwarded,
          source: 'quiz',
          source_id: quiz.id,
          description: `اختبار: ${quiz.title}`,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['student-quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['student-quiz-attempts'] })

      onFinish({
        ...updatedAttempt,
        totalScore,
        maxScore,
        percentage,
        xpAwarded,
        skillBreakdown,
        graded,
        questions,
      })
    } catch (err) {
      console.error('Quiz submit error:', err)
      setSubmitting(false)
    }
  }, [submitting, questions, answers, attemptId, timeLeft, quiz, profile, queryClient, onFinish])

  if (isLoading || !questions) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  const question = questions[currentIndex]
  const totalQ = questions.length
  const progress = ((currentIndex + 1) / totalQ) * 100

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar: progress + timer */}
      <div className="glass-card p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">سؤال {currentIndex + 1} من {totalQ}</span>
          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <span className={`text-sm font-mono font-bold flex items-center gap-1 ${timeLeft < 120 ? 'text-red-400 animate-pulse' : 'text-white/70'}`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </span>
            )}
            <button
              onClick={() => {
                setFlagged(prev => {
                  const next = new Set(prev)
                  next.has(question.id) ? next.delete(question.id) : next.add(question.id)
                  return next
                })
              }}
              className={`p-1.5 rounded-lg transition-colors ${flagged.has(question.id) ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:text-white/60'}`}
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-sky-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {/* Question dots */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-6 h-6 rounded-md text-[10px] font-bold transition-colors ${
                i === currentIndex
                  ? 'bg-violet-500 text-white'
                  : answers[q.id] !== undefined
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : flagged.has(q.id)
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/5 text-white/30'
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
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="glass-card p-5 mb-4"
        >
          <p className="text-white font-medium mb-4 text-base leading-relaxed">{question.question_text}</p>

          <QuestionRenderer
            question={question}
            answer={answers[question.id]}
            onChange={(val) => setAnswers(prev => ({ ...prev, [question.id]: val }))}
            shuffleOptions={quiz.shuffle_options}
          />
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
          السؤال السابق
        </button>

        {currentIndex < totalQ - 1 ? (
          <button
            onClick={() => setCurrentIndex(i => Math.min(totalQ - 1, i + 1))}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            السؤال التالي
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

      {/* Unanswered warning + confirm modal */}
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
              className="glass-card p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-center mb-2">إنهاء الاختبار؟</h3>
              {(() => {
                const unanswered = questions.filter(q => answers[q.id] === undefined).length
                return unanswered > 0 ? (
                  <p className="text-amber-400/80 text-sm text-center mb-4">
                    لديك {unanswered} سؤال بدون إجابة
                  </p>
                ) : (
                  <p className="text-white/50 text-sm text-center mb-4">هل أنت متأكد من إرسال إجاباتك؟</p>
                )
              })()}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10"
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

// ─── Question Renderer ──────────────────────────────────────
function QuestionRenderer({ question, answer, onChange, shuffleOptions }) {
  const type = question.type

  if (type === 'multiple_choice') {
    let options = question.options || []
    if (typeof options === 'string') options = JSON.parse(options)
    const [shuffled] = useState(() => shuffleOptions ? shuffleArray([...options]) : options)

    return (
      <div className="space-y-2">
        {shuffled.map((opt, i) => (
          <button
            key={i}
            onClick={() => onChange(opt)}
            className={`w-full text-right p-3 rounded-xl border transition-all text-sm ${
              answer === opt
                ? 'border-violet-500 bg-violet-500/20 text-white'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            }`}
          >
            <span className="ml-2 text-xs text-white/30">{String.fromCharCode(1571 + i)}</span>
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (type === 'true_false') {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'true', label: 'صح', icon: Check },
          { value: 'false', label: 'خطأ', icon: X },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`p-6 rounded-xl border text-center transition-all ${
              answer === value
                ? value === 'true'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                  : 'border-red-500 bg-red-500/20 text-red-400'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
            }`}
          >
            <Icon className="w-8 h-8 mx-auto mb-2" />
            <span className="font-bold text-lg">{label}</span>
          </button>
        ))}
      </div>
    )
  }

  if (type === 'fill_blank') {
    return (
      <input
        type="text"
        value={answer || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="اكتب إجابتك هنا..."
        className="input-field w-full text-right"
        dir="rtl"
      />
    )
  }

  if (type === 'reorder') {
    const [items, setItems] = useState(() => {
      const opts = question.options || []
      return typeof opts === 'string' ? JSON.parse(opts) : [...opts]
    })

    const moveItem = (index, dir) => {
      const newItems = [...items]
      const target = index + dir
      if (target < 0 || target >= newItems.length) return
      ;[newItems[index], newItems[target]] = [newItems[target], newItems[index]]
      setItems(newItems)
      onChange(newItems)
    }

    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/30 text-xs w-5">{i + 1}</span>
            <span className="flex-1 text-white text-sm">{item}</span>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="p-0.5 text-white/30 hover:text-white disabled:opacity-20">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
              <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="p-0.5 text-white/30 hover:text-white disabled:opacity-20">
                <ChevronLeft className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'matching') {
    const pairs = question.matching_pairs || []
    const [selected, setSelected] = useState(null) // { side: 'left'|'right', index }
    const [matches, setMatches] = useState({}) // leftIndex -> rightIndex

    const rightItems = useState(() => shuffleArray(pairs.map((p, i) => ({ text: p.right || p.answer, origIndex: i }))))[0]

    const handleClick = (side, index) => {
      if (!selected) {
        setSelected({ side, index })
      } else if (selected.side === side) {
        setSelected({ side, index })
      } else {
        const leftIdx = side === 'left' ? index : selected.index
        const rightIdx = side === 'right' ? index : selected.index
        const newMatches = { ...matches, [leftIdx]: rightIdx }
        setMatches(newMatches)
        setSelected(null)
        // Convert to answer format
        const ans = {}
        Object.entries(newMatches).forEach(([l, r]) => {
          ans[pairs[l].left || pairs[l].question] = rightItems[r].text
        })
        onChange(ans)
      }
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p, i) => {
            const isMatched = matches[i] !== undefined
            const isSelected = selected?.side === 'left' && selected?.index === i
            return (
              <button
                key={i}
                onClick={() => handleClick('left', i)}
                className={`w-full p-3 rounded-xl border text-sm text-right transition-all ${
                  isSelected ? 'border-violet-500 bg-violet-500/20 text-white'
                    : isMatched ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                {p.left || p.question}
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map((item, i) => {
            const isMatched = Object.values(matches).includes(i)
            const isSelected = selected?.side === 'right' && selected?.index === i
            return (
              <button
                key={i}
                onClick={() => handleClick('right', i)}
                className={`w-full p-3 rounded-xl border text-sm text-right transition-all ${
                  isSelected ? 'border-violet-500 bg-violet-500/20 text-white'
                    : isMatched ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'short_answer') {
    return (
      <textarea
        value={answer || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="اكتب إجابتك هنا..."
        rows={4}
        className="input-field w-full text-right resize-none"
        dir="rtl"
      />
    )
  }

  return <p className="text-white/50 text-sm">نوع السؤال غير مدعوم</p>
}

// ═══════════════════════════════════════════════════════════
// VIEW 3: Results
// ═══════════════════════════════════════════════════════════
function QuizResults({ quiz, data, onBack }) {
  const { profile } = useAuthStore()

  // If data came from the list (already completed), fetch full details
  const { data: fullResults } = useQuery({
    queryKey: ['quiz-results', data?.id],
    queryFn: async () => {
      // Fetch attempt
      const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', data.id)
        .single()

      // Fetch answers with questions
      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('*, quiz_questions(*)')
        .eq('attempt_id', data.id)

      // Fetch questions
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_number')

      return {
        ...attempt,
        graded: answersData || [],
        questions: questions || [],
        totalScore: attempt?.total_score,
        maxScore: attempt?.max_score,
        percentage: attempt?.percentage,
        xpAwarded: attempt?.xp_awarded,
        skillBreakdown: attempt?.skill_breakdown,
      }
    },
    enabled: !!data?.id && !data?.graded,
  })

  const results = data?.graded ? data : fullResults
  if (!results) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  const { totalScore, maxScore, percentage, xpAwarded, skillBreakdown, graded, questions } = results
  const total = totalScore ?? 0
  const max = maxScore ?? 1
  const pct = percentage ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Score card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="glass-card p-8 text-center"
      >
        <h2 className="text-white/50 text-sm mb-2">نتيجتك</h2>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-6xl font-bold text-white mb-2"
        >
          {pct}<span className="text-2xl text-white/50">%</span>
        </motion.div>
        <p className="text-white/60 text-sm mb-4">
          حصلت على {total} من {max}
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20"
        >
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-bold">+{xpAwarded || 0} XP</span>
        </motion.div>
      </motion.div>

      {/* Skill Breakdown */}
      {skillBreakdown && Object.keys(skillBreakdown).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h3 className="text-white font-semibold text-sm">تحليل المهارات</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(skillBreakdown).map(([skill, pctVal]) => (
              <div key={skill}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70 capitalize">{skill}</span>
                  <span className="text-xs text-white/50">{pctVal}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctVal}%` }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: SKILL_COLORS[skill] || '#6366f1' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Per-question review */}
      {quiz?.show_answers_after && questions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-5"
        >
          <h3 className="text-white font-semibold text-sm mb-4">مراجعة الإجابات</h3>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const ans = graded?.find(a => (a.question_id || a.quiz_questions?.id) === q.id) || graded?.[i]
              const isCorrect = ans?.is_correct
              const studentAnswer = ans?.student_answer || ''

              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                    </span>
                    <p className="text-white text-sm font-medium">{q.question_text}</p>
                  </div>
                  <div className="mr-8 space-y-1 text-sm">
                    <p className={isCorrect ? 'text-emerald-400/80' : 'text-red-400/80'}>
                      إجابتك: {typeof studentAnswer === 'object' ? JSON.stringify(studentAnswer) : studentAnswer || '—'}
                    </p>
                    {!isCorrect && (
                      <p className="text-emerald-400/60">
                        الإجابة الصحيحة: {q.correct_answer}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-white/40 text-xs mt-1">{q.explanation}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
          <ChevronRight className="w-4 h-4" />
          العودة للاختبارات
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `نتيجتي في ${quiz?.title}`, text: `حصلت على ${pct}% في اختبار ${quiz?.title}!` })
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
        >
          شارك نتيجتك
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function gradeQuestion(question, answer) {
  if (answer === undefined || answer === null || answer === '') return false

  const type = question.type

  if (type === 'multiple_choice' || type === 'true_false') {
    return String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()
  }

  if (type === 'fill_blank') {
    const accepted = question.accepted_answers || []
    const correct = question.correct_answer || ''
    const normalizedAnswer = String(answer).trim().toLowerCase()
    if (normalizedAnswer === correct.trim().toLowerCase()) return true
    return accepted.some(a => String(a).trim().toLowerCase() === normalizedAnswer)
  }

  if (type === 'reorder') {
    const correct = question.reorder_correct || []
    if (!Array.isArray(answer) || answer.length !== correct.length) return false
    return answer.every((item, i) => item === correct[i])
  }

  if (type === 'matching') {
    const pairs = question.matching_pairs || []
    if (typeof answer !== 'object') return false
    return pairs.every(p => {
      const key = p.left || p.question
      const expected = p.right || p.answer
      return String(answer[key] || '').trim().toLowerCase() === String(expected).trim().toLowerCase()
    })
  }

  if (type === 'short_answer') {
    // Short answer can't be auto-graded reliably, mark as needs review
    // For now, check against correct_answer if provided
    if (question.correct_answer) {
      return String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()
    }
    return false
  }

  return false
}
