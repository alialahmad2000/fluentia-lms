import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, CheckCircle2, Clock, Zap, ArrowLeft, AlertCircle,
  Loader2, BookOpen, RefreshCw, Trophy,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const SKILL_LABELS = {
  grammar: 'القرامر',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}

const SKILL_COLORS = {
  grammar: 'sky',
  vocabulary: 'emerald',
  speaking: 'violet',
  listening: 'gold',
  reading: 'rose',
  writing: 'amber',
}

const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

const SKILL_COLOR_CLASSES = {
  sky: { iconBox: 'bg-sky-500/10 text-sky-400', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  emerald: { iconBox: 'bg-emerald-500/10 text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  violet: { iconBox: 'bg-violet-500/10 text-violet-400', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  gold: { iconBox: 'bg-gold-500/10 text-gold-400', badge: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  rose: { iconBox: 'bg-rose-500/10 text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  amber: { iconBox: 'bg-amber-500/10 text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

export default function StudentExercises() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeExercise, setActiveExercise] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['student-exercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('targeted_exercises')
        .select('*, error_patterns(pattern_type, description, skill)')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  const { data: stats } = useQuery({
    queryKey: ['exercise-stats'],
    queryFn: async () => {
      const all = exercises || []
      return {
        total: all.length,
        completed: all.filter(e => e.status === 'completed').length,
        pending: all.filter(e => e.status === 'pending').length,
        avgScore: all.filter(e => e.score).reduce((acc, e) => acc + Number(e.score), 0) / (all.filter(e => e.score).length || 1),
        totalXp: all.reduce((acc, e) => acc + (e.xp_awarded || 0), 0),
      }
    },
    enabled: !!exercises,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // First analyze patterns
      await supabase.functions.invoke('analyze-error-patterns', {
        body: { student_id: profile?.id, analyze_all: true },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      // Then generate exercises
      const res = await supabase.functions.invoke('generate-targeted-exercises', {
        body: { student_id: profile?.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-exercises'] })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: studentAnswers }) => {
      const exercise = exercises.find(e => e.id === exerciseId)
      if (!exercise) throw new Error('Exercise not found')

      const questions = exercise.content?.questions || []
      let correct = 0
      for (const q of questions) {
        if (studentAnswers[q.id] === q.correct_answer) correct++
      }
      const score = Math.round((correct / questions.length) * 100)
      const xp = score >= 80 ? 15 : score >= 60 ? 10 : 5

      await supabase
        .from('targeted_exercises')
        .update({
          status: 'completed',
          score,
          student_answers: studentAnswers,
          xp_awarded: xp,
          completed_at: new Date().toISOString(),
        })
        .eq('id', exerciseId)

      // Award XP
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: `إكمال تمرين مخصص: ${exercise.title}`,
      })

      // Update student XP
      const { error: rpcErr } = await supabase.rpc('increment_xp', { student_id: profile?.id, amount: xp })
      if (rpcErr) {
        // Fallback if RPC doesn't exist
        const { error: fallbackErr } = await supabase
          .from('students')
          .update({ xp_total: (studentData?.xp_total || 0) + xp })
          .eq('id', profile?.id)
        if (fallbackErr) console.error('[StudentExercises] XP fallback error:', fallbackErr)
      }

      // If score >= 80, mark pattern as potentially resolved
      if (score >= 80 && exercise.pattern_id) {
        const { data: patternExercises } = await supabase
          .from('targeted_exercises')
          .select('score')
          .eq('pattern_id', exercise.pattern_id)
          .eq('status', 'completed')

        const avgScore = patternExercises?.reduce((acc, e) => acc + Number(e.score), 0) / (patternExercises?.length || 1)
        if (avgScore >= 85 && (patternExercises?.length || 0) >= 2) {
          await supabase
            .from('error_patterns')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', exercise.pattern_id)
        }
      }

      return { score, xp, correct, total: questions.length }
    },
    onSuccess: (data) => {
      setResult(data)
      setSubmitted(true)
      queryClient.invalidateQueries({ queryKey: ['student-exercises'] })
    },
  })

  function handleSubmit() {
    if (!activeExercise) return
    submitMutation.mutate({ exerciseId: activeExercise.id, answers })
  }

  function resetExercise() {
    setActiveExercise(null)
    setAnswers({})
    setSubmitted(false)
    setResult(null)
  }

  const pendingExercises = exercises?.filter(e => e.status === 'pending') || []
  const completedExercises = exercises?.filter(e => e.status === 'completed') || []

  if (activeExercise) {
    return (
      <ExerciseView
        exercise={activeExercise}
        answers={answers}
        setAnswers={setAnswers}
        submitted={submitted}
        result={result}
        onSubmit={handleSubmit}
        onBack={resetExercise}
        submitting={submitMutation.isPending}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={24} className="text-violet-400" />
            تمارين مخصصة
          </h1>
          <p className="text-muted text-sm mt-1">تمارين ذكية مصممة لتحسين نقاط ضعفك</p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {generateMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التحليل...</>
          ) : (
            <><RefreshCw size={14} /> تحليل وإنشاء تمارين</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'متاحة', value: pendingExercises.length, icon: Clock, color: 'sky' },
          { label: 'مكتملة', value: stats?.completed || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'متوسط الدرجة', value: `${Math.round(stats?.avgScore || 0)}%`, icon: Trophy, color: 'gold' },
          { label: 'XP مكتسبة', value: stats?.totalXp || 0, icon: Zap, color: 'violet' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${SKILL_COLOR_CLASSES[card.color]?.iconBox || 'bg-sky-500/10 text-sky-400'}`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : pendingExercises.length === 0 && completedExercises.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد تمارين بعد</h3>
          <p className="text-muted text-sm mb-4">اضغط "تحليل وإنشاء تمارين" لتحليل أدائك وإنشاء تمارين مخصصة</p>
        </div>
      ) : (
        <>
          {/* Pending exercises */}
          {pendingExercises.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Clock size={18} className="text-sky-400" />
                تمارين متاحة ({pendingExercises.length})
              </h2>
              <div className="grid gap-3">
                {pendingExercises.map((exercise, i) => {
                  const color = SKILL_COLORS[exercise.skill] || 'sky'
                  return (
                    <motion.div
                      key={exercise.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-4 hover:border-sky-500/30 transition-all cursor-pointer"
                      onClick={() => { setActiveExercise(exercise); setAnswers({}); setSubmitted(false); setResult(null) }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SKILL_COLOR_CLASSES[color]?.badge || 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                              {SKILL_LABELS[exercise.skill]}
                            </span>
                            <span className="text-[10px] text-muted">
                              {DIFFICULTY_LABELS[exercise.difficulty]}
                            </span>
                          </div>
                          <h3 className="font-medium text-white text-sm">{exercise.title}</h3>
                          {exercise.error_patterns && (
                            <p className="text-xs text-muted mt-1">{exercise.error_patterns.description}</p>
                          )}
                        </div>
                        <ArrowLeft size={16} className="text-muted" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed exercises */}
          {completedExercises.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                مكتملة ({completedExercises.length})
              </h2>
              <div className="grid gap-2">
                {completedExercises.slice(0, 10).map((exercise) => (
                  <div key={exercise.id} className="glass-card p-3 opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-sm text-white">{exercise.title}</span>
                        <span className="text-[10px] text-muted">{SKILL_LABELS[exercise.skill]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${exercise.score >= 80 ? 'text-emerald-400' : exercise.score >= 60 ? 'text-gold-400' : 'text-red-400'}`}>
                          {exercise.score}%
                        </span>
                        <span className="text-[10px] text-violet-400">+{exercise.xp_awarded} XP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Exercise View ──────────────────────────────────────

function ExerciseView({ exercise, answers, setAnswers, submitted, result, onSubmit, onBack, submitting }) {
  const questions = exercise.content?.questions || []
  const type = exercise.content?.type || 'multiple_choice'
  const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== '')

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{exercise.title}</h1>
          <p className="text-muted text-sm">{exercise.instructions}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${SKILL_COLOR_CLASSES[SKILL_COLORS[exercise.skill]]?.iconBox || 'bg-sky-500/10 text-sky-400'}`}>
          {SKILL_LABELS[exercise.skill]}
        </span>
      </div>

      {/* Result banner */}
      {submitted && result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass-card p-6 text-center ${result.score >= 80 ? 'border-emerald-500/30' : result.score >= 60 ? 'border-gold-500/30' : 'border-red-500/30'}`}
        >
          <div className={`text-4xl font-bold mb-2 ${result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-gold-400' : 'text-red-400'}`}>
            {result.score}%
          </div>
          <p className="text-white font-medium">
            {result.correct} من {result.total} صحيحة
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-violet-400">
            <Zap size={14} />
            <span className="text-sm font-bold">+{result.xp} XP</span>
          </div>
          <button onClick={onBack} className="btn-primary mt-4 text-sm">
            العودة للتمارين
          </button>
        </motion.div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => {
          const userAnswer = answers[q.id]
          const isCorrect = submitted && userAnswer === q.correct_answer
          const isWrong = submitted && userAnswer && userAnswer !== q.correct_answer

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-4 ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs bg-white/10 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-white font-medium">{q.question}</p>
              </div>

              {type === 'multiple_choice' || q.options ? (
                <div className="grid gap-2 mr-8">
                  {(q.options || []).map((opt, oi) => {
                    const selected = userAnswer === opt
                    const correctOpt = submitted && opt === q.correct_answer
                    return (
                      <button
                        key={oi}
                        onClick={() => !submitted && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        disabled={submitted}
                        className={`text-right text-sm px-3 py-2 rounded-xl border transition-all ${
                          correctOpt
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : selected && isWrong
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : selected
                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                : 'bg-white/5 border-border-subtle text-muted hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mr-8">
                  <input
                    type="text"
                    value={userAnswer || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    disabled={submitted}
                    className={`input-field text-sm w-full ${isCorrect ? 'border-emerald-500/30' : isWrong ? 'border-red-500/30' : ''}`}
                    placeholder="اكتب إجابتك..."
                  />
                </div>
              )}

              {/* Explanation after submit */}
              {submitted && q.explanation && (
                <div className={`mt-2 mr-8 text-xs p-2 rounded-lg ${isCorrect ? 'bg-emerald-500/5 text-emerald-400' : 'bg-red-500/5 text-red-400'}`}>
                  {isWrong && <p className="mb-1">الإجابة الصحيحة: <strong>{q.correct_answer}</strong></p>}
                  <p>{q.explanation}</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={onSubmit}
          disabled={!allAnswered || submitting}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التقييم...</>
          ) : (
            <><CheckCircle2 size={14} /> تسليم الإجابات</>
          )}
        </button>
      )}
    </div>
  )
}
