import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, CheckCircle, XCircle, ChevronDown, AlertTriangle, Lightbulb, ArrowLeftRight, RotateCcw, History } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { validateAnswer } from '../../../../utils/answerValidator'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { safeCelebrate } from '../../../../lib/celebrations'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'

const EXERCISE_TYPE_LABELS = {
  fill_blank: 'أكمل الفراغ',
  choose: 'اختر الإجابة',
  error_correction: 'صحّح الخطأ',
  reorder: 'رتّب الكلمات',
  transform: 'حوّل الجملة',
  make_question: 'كوّن سؤالاً',
}

// ─── Main Component ─────────────────────────────────
export default function GrammarTab({ unitId }) {
  const { user } = useAuthStore()

  const { data: topics, isLoading } = useQuery({
    queryKey: ['unit-grammar', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_grammar')
        .select('*, exercises:curriculum_grammar_exercises(*)')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      // Sort exercises within each topic
      data?.forEach(t => {
        if (t.exercises) t.exercises.sort((a, b) => a.sort_order - b.sort_order)
      })
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <GrammarSkeleton />

  if (!topics?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <PenLine size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد قواعد لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {topics.map((topic, idx) => (
        <GrammarTopic key={topic.id} topic={topic} index={idx} defaultOpen={idx === 0} studentId={user?.id} unitId={unitId} />
      ))}
    </div>
  )
}

// ─── Grammar Topic Card ──────────────────────────────
function GrammarTopic({ topic, index, defaultOpen, studentId, unitId }) {
  const [open, setOpen] = useState(defaultOpen)
  const [showExercises, setShowExercises] = useState(false)

  const sections = topic.explanation_content?.sections || []

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <PenLine size={18} />
          </div>
          <div className="text-start">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-['Inter']">
              {topic.topic_name_en}
            </h3>
            {topic.topic_name_ar && topic.topic_name_ar !== topic.topic_name_en && (
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{topic.topic_name_ar}</p>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-4 space-y-5">
                {/* Render sections in order */}
                {sections.map((section, i) => (
                  <SectionRenderer key={i} section={section} />
                ))}
              </div>

              {/* Exercise toggle */}
              {topic.exercises?.length > 0 && (
                <div className="pt-2">
                  {!showExercises ? (
                    <button
                      onClick={() => setShowExercises(true)}
                      className="flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-['Tajawal']"
                    >
                      <PenLine size={15} />
                      تمارين ({topic.exercises.length})
                    </button>
                  ) : (
                    <ExerciseSection exercises={topic.exercises} studentId={studentId} unitId={unitId} grammarId={topic.id} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section Renderer ────────────────────────────────
function SectionRenderer({ section }) {
  switch (section.type) {
    case 'explanation':
      return <ExplanationSection section={section} />
    case 'formula':
      return <FormulaSection section={section} />
    case 'examples':
      return <ExamplesSection section={section} />
    case 'common_mistakes':
      return <CommonMistakesSection section={section} />
    default:
      return null
  }
}

// ─── Explanation Section ─────────────────────────────
function ExplanationSection({ section }) {
  return (
    <div className="space-y-3">
      {section.content_en && (
        <div
          dir="ltr"
          className="text-sm sm:text-[15px] leading-[1.8] text-[var(--text-primary)] font-['Inter'] grammar-html"
          dangerouslySetInnerHTML={{ __html: section.content_en }}
        />
      )}
      {section.content_ar && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed"
          style={{ background: 'var(--surface-base)', borderRight: '3px solid rgba(56,189,248,0.4)' }}
          dir="rtl"
        >
          {section.content_ar}
        </div>
      )}
    </div>
  )
}

// ─── Formula Section ─────────────────────────────────
function FormulaSection({ section }) {
  return (
    <div
      className="rounded-xl px-5 py-4 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(168,85,247,0.08))',
        border: '1px solid rgba(56,189,248,0.2)',
      }}
    >
      <p className="text-sm font-bold text-sky-400 font-['Inter'] tracking-wide" dir="ltr">
        {section.content}
      </p>
    </div>
  )
}

// ─── Examples Section ────────────────────────────────
function ExamplesSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-emerald-400 font-['Tajawal'] flex items-center gap-1.5">
        <Lightbulb size={13} />
        أمثلة
      </h4>
      <div className="space-y-2">
        {section.items?.map((ex, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
            style={{ background: 'var(--surface-base)' }}
          >
            <p className="text-sm text-[var(--text-primary)] font-['Inter']" dir="ltr">
              {highlightWord(ex.sentence, ex.highlight)}
            </p>
            {ex.translation_ar && (
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] sm:text-end flex-shrink-0" dir="rtl">
                {ex.translation_ar}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function highlightWord(sentence, word) {
  if (!word) return sentence
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = sentence.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} className="text-sky-400 font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  )
}

// ─── Common Mistakes Section ─────────────────────────
function CommonMistakesSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-red-400 font-['Tajawal'] flex items-center gap-1.5">
        <AlertTriangle size={13} />
        أخطاء شائعة
      </h4>
      <div className="space-y-2">
        {section.items?.map((m, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-3 space-y-1.5"
            style={{ background: 'var(--surface-base)' }}
          >
            <div className="flex items-center gap-3" dir="ltr">
              <span className="text-sm text-red-400 line-through font-['Inter']">{m.wrong}</span>
              <ArrowLeftRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
              <span className="text-sm text-emerald-400 font-semibold font-['Inter']">{m.correct}</span>
            </div>
            {m.explanation_ar && (
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal']" dir="rtl">{m.explanation_ar}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Exercise Section ────────────────────────────────
function ExerciseSection({ exercises, studentId, unitId, grammarId }) {
  const [answers, setAnswers] = useState({})
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [allAttempts, setAllAttempts] = useState([]) // all DB rows
  const [retrying, setRetrying] = useState(false)
  const [currentRowId, setCurrentRowId] = useState(null) // DB row id for current attempt
  const [retryKey, setRetryKey] = useState(0) // forces exercise remount
  const [bestScore, setBestScore] = useState(null)
  const hasSaved = useRef(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const prevAnsweredRef = useRef(0)

  const total = exercises.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load saved progress — get latest attempt + all attempts for history
  useEffect(() => {
    if (!studentId || !grammarId) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      // Fetch ALL attempts for this grammar topic
      const { data: rows } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('grammar_id', grammarId)
        .order('attempt_number', { ascending: false })

      if (!isMounted) return

      if (rows && rows.length > 0) {
        setAllAttempts(rows)

        // Find the latest row (is_latest=true, or fallback to highest attempt_number)
        const latest = rows.find(r => r.is_latest) || rows[0]
        setCurrentRowId(latest.id)
        setAttemptNumber(latest.attempt_number || 1)

        // Find best score
        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)

        // Restore answers from latest attempt
        if (latest.answers?.exercises) {
          const restored = {}
          latest.answers.exercises.forEach(ex => {
            restored[ex.id] = { selected: ex.studentAnswer, correct: ex.isCorrect }
          })
          setAnswers(restored)
          prevAnsweredRef.current = Object.keys(restored).length
        }

        setIsCompleted(latest.status === 'completed')
        if (latest.time_spent_seconds) timeRef.current = latest.time_spent_seconds
        if (latest.status === 'completed') hasSaved.current = true
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, grammarId])

  // Retry handler — create a new attempt row immediately
  const handleRetry = async () => {
    const nextAttempt = attemptNumber + 1

    // 1. Flip all existing rows to is_latest=false
    await supabase
      .from('student_curriculum_progress')
      .update({ is_latest: false })
      .eq('student_id', studentId)
      .eq('grammar_id', grammarId)

    // 2. Insert new in-progress row
    const { data: newRow, error } = await supabase
      .from('student_curriculum_progress')
      .insert({
        student_id: studentId,
        unit_id: unitId,
        grammar_id: grammarId,
        section_type: 'grammar',
        status: 'in_progress',
        score: 0,
        answers: null,
        time_spent_seconds: 0,
        completed_at: null,
        attempt_number: nextAttempt,
        is_latest: true,
        is_best: false,
      })
      .select()
      .single()

    if (!error && newRow) {
      setCurrentRowId(newRow.id)
      setAttemptNumber(nextAttempt)
      setRetrying(true)
      setIsCompleted(false)
      setAnswers({})
      prevAnsweredRef.current = 0
      hasSaved.current = false
      timeRef.current = 0
      setRetryKey(k => k + 1) // force exercise components to remount
    }
  }

  // Build exercise results for saving
  const buildResults = useCallback((currentAnswers) => {
    return exercises.map(ex => {
      const ans = currentAnswers[ex.id]
      const item = ex.items?.[0]
      return {
        id: ex.id,
        type: ex.exercise_type,
        studentAnswer: ans?.selected || null,
        correctAnswer: item?.correct_answer || null,
        isCorrect: ans?.correct || false,
      }
    })
  }, [exercises])

  // Save progress — UPDATE current row by id (or INSERT if no row yet)
  const saveProgress = useCallback(async (currentAnswers, isComplete) => {
    if (!studentId || !grammarId) return
    const results = buildResults(currentAnswers)
    const answeredCount = Object.keys(currentAnswers).length
    const correct = Object.values(currentAnswers).filter(a => a.correct).length
    const score = answeredCount > 0 ? Math.round((correct / total) * 100) : 0

    if (currentRowId) {
      // Update existing row
      const { error } = await supabase
        .from('student_curriculum_progress')
        .update({
          status: isComplete ? 'completed' : 'in_progress',
          score,
          answers: { exercises: results },
          time_spent_seconds: timeRef.current,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('id', currentRowId)

      if (!error && isComplete) {
        await recomputeBest(score)
        setRetrying(false)
        setIsCompleted(true)
        toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
        try { safeCelebrate('grammar_complete') } catch {}
        awardCurriculumXP(studentId, 'grammar', score, unitId)
        // Reload all attempts
        const { data: rows } = await supabase
          .from('student_curriculum_progress')
          .select('*')
          .eq('student_id', studentId)
          .eq('grammar_id', grammarId)
          .order('attempt_number', { ascending: false })
        if (rows) setAllAttempts(rows)
      }
    } else {
      // First ever attempt — insert
      const { data: newRow, error } = await supabase
        .from('student_curriculum_progress')
        .insert({
          student_id: studentId,
          unit_id: unitId,
          grammar_id: grammarId,
          section_type: 'grammar',
          status: isComplete ? 'completed' : 'in_progress',
          score,
          answers: { exercises: results },
          time_spent_seconds: timeRef.current,
          completed_at: isComplete ? new Date().toISOString() : null,
          attempt_number: 1,
          is_latest: true,
          is_best: true,
        })
        .select()
        .single()

      if (!error && newRow) {
        setCurrentRowId(newRow.id)
        if (isComplete) {
          setBestScore(score)
          setIsCompleted(true)
          setAllAttempts([newRow])
          toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
          try { safeCelebrate('grammar_complete') } catch {}
          awardCurriculumXP(studentId, 'grammar', score, unitId)
        }
      }
    }
  }, [studentId, unitId, grammarId, total, buildResults, currentRowId])

  // Recompute is_best across all attempts for this grammar topic
  const recomputeBest = async (newScore) => {
    const { data: rows } = await supabase
      .from('student_curriculum_progress')
      .select('id, score, attempt_number')
      .eq('student_id', studentId)
      .eq('grammar_id', grammarId)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .order('attempt_number', { ascending: false })

    if (rows && rows.length > 0) {
      const bestId = rows[0].id
      // Set all to not best
      await supabase
        .from('student_curriculum_progress')
        .update({ is_best: false })
        .eq('student_id', studentId)
        .eq('grammar_id', grammarId)
      // Set the best one
      await supabase
        .from('student_curriculum_progress')
        .update({ is_best: true })
        .eq('id', bestId)
      setBestScore(rows[0].score)
    }
  }

  // Auto-save after each new answer
  useEffect(() => {
    if (progressLoading) return
    if (answered === 0 || answered <= prevAnsweredRef.current) return
    prevAnsweredRef.current = answered
    const isComplete = answered === total
    if (isComplete && hasSaved.current) return
    if (isComplete) hasSaved.current = true
    saveProgress(answers, isComplete)
  }, [answered, total, answers, progressLoading, saveProgress])

  if (progressLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-20 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[rgba(255,255,255,0.06)] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">التمارين</h3>
        <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          {answered > 0 ? `${correctCount}/${answered} صحيحة` : ''}{answered > 0 && ' · '}أكملت {answered} من {total} تمارين
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[var(--surface-base)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${total > 0 ? (answered / total) * 100 : 0}%`,
            background: answered === total && total > 0 ? '#10b981' : '#0ea5e9',
          }}
        />
      </div>

      {/* Completed banner with retry */}
      {isCompleted && !retrying && (
        <CompletedBanner
          attemptNumber={attemptNumber}
          allAttempts={allAttempts}
          bestScore={bestScore}
          currentScore={allAttempts.find(a => a.is_latest)?.score ?? null}
          onRetry={handleRetry}
          exercises={exercises}
        />
      )}

      {/* Retrying indicator */}
      {retrying && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
          <RotateCcw size={16} className="text-sky-400" />
          <span className="text-sm font-medium text-sky-400 font-['Tajawal']">
            محاولة {attemptNumber} — أجب على التمارين من جديد
          </span>
        </div>
      )}

      <div className="space-y-3">
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={`${ex.id}-${retryKey}`}
            exercise={ex}
            index={idx}
            answer={answers[ex.id]}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [ex.id]: ans }))}
          />
        ))}
      </div>

      {answered === total && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: correctCount === total ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${correctCount === total ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={correctCount === total ? 'text-emerald-400' : 'text-sky-400'} />
          <div>
            <p className="text-sm font-medium font-['Tajawal']" style={{ color: correctCount === total ? '#34d399' : '#38bdf8' }}>
              {correctCount === total ? 'ممتاز! أجبت على جميع التمارين بشكل صحيح' : `أجبت على ${correctCount} من ${total} بشكل صحيح`}
            </p>
            {bestScore != null && bestScore > 0 && (
              <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] mt-0.5">
                محاولة رقم {attemptNumber} {bestScore != null && ` · أفضل درجة: ${bestScore}%`}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* After completion: retry button */}
      {isCompleted && !retrying && answered === total && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-sky-500/10 text-sky-400 border border-sky-500/25 hover:bg-sky-500/20 transition-colors font-['Tajawal']"
          >
            <RotateCcw size={14} />
            محاولة جديدة
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Single Exercise Card ────────────────────────────
function ExerciseCard({ exercise, index, answer, onAnswer }) {
  const item = exercise.items?.[0]
  if (!item) return null

  const typeLabel = EXERCISE_TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {index + 1}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-['Tajawal']">
          {typeLabel}
        </span>
      </div>

      <p className="text-sm font-medium text-[var(--text-primary)] font-['Inter']" dir="ltr">
        {item.question}
      </p>

      {exercise.exercise_type === 'choose' && (
        <ChooseExercise item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'fill_blank' && (
        <FillBlankExercise item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'error_correction' && (
        <ErrorCorrectionExercise item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {exercise.exercise_type === 'reorder' && (
        <ReorderExercise item={item} answer={answer} onAnswer={onAnswer} />
      )}
      {(exercise.exercise_type === 'transform' || exercise.exercise_type === 'make_question') && (
        <TextInputExercise item={item} answer={answer} onAnswer={onAnswer} exerciseType={exercise.exercise_type} />
      )}

      {/* Explanation */}
      <AnimatePresence>
        {answer && item.explanation_ar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="p-3 rounded-lg text-xs font-['Tajawal']"
              dir="rtl"
              style={{
                background: answer.correct ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.06)',
                border: `1px solid ${answer.correct ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)'}`,
                color: 'var(--text-secondary)',
              }}
            >
              {item.explanation_ar}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Choose Exercise (MCQ) ───────────────────────────
function ChooseExercise({ item, answer, onAnswer }) {
  const acceptedAnswers = item.accepted_answers || [item.correct_answer]

  const handleSelect = (opt) => {
    if (answer) return
    onAnswer({ selected: opt, correct: validateAnswer(opt, acceptedAnswers) })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.options?.map((opt, i) => {
        const isSelected = answer?.selected === opt
        const isCorrect = validateAnswer(opt, acceptedAnswers)
        const showCorrect = answer && isCorrect
        const showWrong = answer && isSelected && !answer.correct

        return (
          <button
            key={i}
            onClick={() => handleSelect(opt)}
            disabled={!!answer}
            dir="ltr"
            className={`px-5 h-10 rounded-xl text-sm font-medium font-['Inter'] border transition-all ${
              showCorrect
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : showWrong
                  ? 'bg-red-500/15 border-red-500/40 text-red-400'
                  : answer
                    ? 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50'
                    : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer'
            }`}
          >
            {showCorrect && <CheckCircle size={13} className="inline mr-1.5" />}
            {showWrong && <XCircle size={13} className="inline mr-1.5" />}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Fill Blank Exercise ─────────────────────────────
function FillBlankExercise({ item, answer, onAnswer }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const acceptedAnswers = item.accepted_answers || [item.correct_answer]
  const expectedWordCount = (acceptedAnswers[0] || '').split(/\s+/).filter(Boolean).length
  const placeholder = expectedWordCount <= 1
    ? '____ (one word)'
    : `____ (${expectedWordCount} words)`

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      fullSentence: item.question,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" dir="ltr">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={answer ? answer.selected : input}
          onChange={e => setInput(e.target.value)}
          disabled={!!answer}
          placeholder={placeholder}
          className={`flex-1 h-10 px-4 rounded-xl text-sm font-['Inter'] border outline-none transition-colors ${
            answer?.correct
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : answer && !answer.correct
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-emerald-500/50'
          }`}
        />
        {!answer && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-10 px-4 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 font-['Tajawal']"
          >
            تحقق
          </button>
        )}
      </div>
      {!answer && (
        <p className="text-[10px] text-[var(--text-muted)] font-['Tajawal']" dir="rtl">
          اكتب الكلمة الناقصة فقط — لا تعيد كتابة الجملة كاملة
        </p>
      )}
      {answer && !answer.correct && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <span className="text-[var(--text-muted)] font-['Tajawal']">الإجابة الصحيحة:</span>
          <span className="text-emerald-400 font-semibold font-['Inter']">{item.correct_answer}</span>
        </div>
      )}
    </form>
  )
}

// ─── Error Correction Exercise ───────────────────────
function ErrorCorrectionExercise({ item, answer, onAnswer }) {
  const [input, setInput] = useState('')

  const acceptedAnswers = item.accepted_answers || [item.correct_answer]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      originalSentence: item.question,
      allowPartial: true,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" dir="ltr">
      <p className="text-xs text-[var(--text-muted)] font-['Tajawal']" dir="rtl">اكتب الجملة الصحيحة:</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={answer ? answer.selected : input}
          onChange={e => setInput(e.target.value)}
          disabled={!!answer}
          placeholder="Type the corrected sentence..."
          className={`flex-1 h-10 px-4 rounded-xl text-sm font-['Inter'] border outline-none transition-colors ${
            answer?.correct
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : answer && !answer.correct
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-emerald-500/50'
          }`}
        />
        {!answer && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="h-10 px-4 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 font-['Tajawal']"
          >
            تحقق
          </button>
        )}
      </div>
      {answer && !answer.correct && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <span className="text-[var(--text-muted)] font-['Tajawal']">الإجابة الصحيحة:</span>
          <span className="text-emerald-400 font-semibold font-['Inter']">{item.correct_answer}</span>
        </div>
      )}
    </form>
  )
}

// ─── Reorder Exercise ────────────────────────────────
function ReorderExercise({ item, answer, onAnswer }) {
  const [selected, setSelected] = useState([])
  const [available, setAvailable] = useState(item.options || [])

  const handleWordClick = (word) => {
    if (answer) return
    setSelected(prev => [...prev, word])
    setAvailable(prev => {
      const idx = prev.indexOf(word)
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  const handleSelectedClick = (idx) => {
    if (answer) return
    const word = selected[idx]
    setAvailable(prev => [...prev, word])
    setSelected(prev => [...prev.slice(0, idx), ...prev.slice(idx + 1)])
  }

  const handleCheck = () => {
    if (answer || selected.length === 0) return
    const builtSentence = selected.join(' ')
    const acceptedAnswers = item.accepted_answers || [item.correct_answer]
    const correct = validateAnswer(builtSentence, acceptedAnswers)
    onAnswer({ selected: builtSentence, correct })
  }

  return (
    <div className="space-y-3" dir="ltr">
      {/* Selected words (answer area) */}
      <div
        className={`min-h-[44px] rounded-xl px-3 py-2 flex flex-wrap gap-1.5 border ${
          answer?.correct
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : answer && !answer.correct
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-[var(--surface-raised)] border-[var(--border-subtle)]'
        }`}
      >
        {selected.length === 0 && !answer && (
          <span className="text-xs text-[var(--text-muted)] py-1.5">اضغط على الكلمات لترتيبها...</span>
        )}
        {selected.map((w, i) => (
          <button
            key={i}
            onClick={() => handleSelectedClick(i)}
            disabled={!!answer}
            className={`px-3 py-1.5 rounded-lg text-sm font-['Inter'] transition-colors ${
              answer?.correct ? 'bg-emerald-500/20 text-emerald-400' : answer ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/15 text-sky-400 cursor-pointer hover:bg-sky-500/25'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Available words */}
      {!answer && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((w, i) => (
            <button
              key={i}
              onClick={() => handleWordClick(w)}
              className="px-3 py-1.5 rounded-lg text-sm font-['Inter'] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer transition-colors"
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {/* Check button */}
      {!answer && selected.length > 0 && (
        <button
          onClick={handleCheck}
          className="h-9 px-4 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-['Tajawal']"
        >
          تحقق
        </button>
      )}

      {answer && !answer.correct && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <span className="text-[var(--text-muted)] font-['Tajawal']">الإجابة الصحيحة:</span>
          <span className="text-emerald-400 font-semibold font-['Inter']">{item.correct_answer}</span>
        </div>
      )}
    </div>
  )
}

// ─── Text Input Exercise (transform / make_question) ─
function TextInputExercise({ item, answer, onAnswer, exerciseType }) {
  const [input, setInput] = useState('')

  const acceptedAnswers = item.accepted_answers || [item.correct_answer]
  const placeholder = exerciseType === 'make_question'
    ? 'Type your question here...'
    : 'Type the transformed sentence...'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer || !input.trim()) return
    const correct = validateAnswer(input.trim(), acceptedAnswers, {
      originalSentence: item.question,
      allowPartial: true,
    })
    onAnswer({ selected: input.trim(), correct })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" dir="ltr">
      <textarea
        value={answer ? answer.selected : input}
        onChange={e => setInput(e.target.value)}
        disabled={!!answer}
        placeholder={placeholder}
        rows={2}
        className={`w-full px-4 py-3 rounded-xl text-sm font-['Inter'] border outline-none transition-colors resize-none leading-relaxed ${
          answer?.correct
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            : answer && !answer.correct
              ? 'bg-red-500/10 border-red-500/40 text-red-400'
              : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-emerald-500/50'
        }`}
      />
      {!answer && (
        <button
          type="submit"
          disabled={!input.trim()}
          className="h-9 px-4 rounded-xl text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 font-['Tajawal']"
        >
          تحقق
        </button>
      )}
      {answer && !answer.correct && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <span className="text-[var(--text-muted)] font-['Tajawal']">الإجابة الصحيحة:</span>
          <span className="text-emerald-400 font-semibold font-['Inter']">{item.correct_answer}</span>
        </div>
      )}
    </form>
  )
}

// ─── Completed Banner with Retry + Full Attempt History ──
function CompletedBanner({ attemptNumber, allAttempts, bestScore, currentScore, onRetry, exercises }) {
  const [showHistory, setShowHistory] = useState(false)
  const [viewingAttempt, setViewingAttempt] = useState(null) // attempt row to view read-only
  const hasMultiple = allAttempts.length > 1
  const completedAttempts = allAttempts.filter(a => a.status === 'completed')

  return (
    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400 font-['Tajawal']">
            تم إكمال هذا القسم
          </span>
          {attemptNumber > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-['Tajawal']">
              محاولة {attemptNumber}
            </span>
          )}
          {currentScore != null && (
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">— {currentScore}%</span>
          )}
          {bestScore != null && bestScore !== currentScore && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-['Tajawal']">
              أفضل درجة: {bestScore}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasMultiple && (
            <button
              onClick={() => { setShowHistory(!showHistory); setViewingAttempt(null) }}
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
            >
              <History size={12} />
              جميع المحاولات ({completedAttempts.length})
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-colors font-['Tajawal'] border border-[var(--border-subtle)]"
          >
            <RotateCcw size={12} />
            محاولة جديدة
          </button>
        </div>
      </div>

      {/* Attempt history panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="pt-2.5 space-y-1.5">
                {completedAttempts.map((row) => {
                  const isBest = row.is_best
                  const isLatest = row.is_latest
                  return (
                    <button
                      key={row.id}
                      onClick={() => setViewingAttempt(viewingAttempt?.id === row.id ? null : row)}
                      className={`w-full flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg transition-colors hover:bg-white/5 ${
                        isLatest ? 'text-emerald-400 font-medium' : 'text-[var(--text-muted)]'
                      } font-['Tajawal']`}
                    >
                      <span className="font-medium">محاولة {row.attempt_number || 1}</span>
                      <span>{row.score != null ? `${Math.round(row.score)}%` : '—'}</span>
                      {isBest && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">الأفضل</span>
                      )}
                      {isLatest && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">الأحدث</span>
                      )}
                      {row.completed_at && (
                        <span className="text-[var(--text-muted)]" dir="ltr">
                          {new Date(row.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <ChevronDown size={12} className={`mr-auto transition-transform ${viewingAttempt?.id === row.id ? 'rotate-180' : ''}`} />
                    </button>
                  )
                })}
              </div>

              {/* Read-only view of a past attempt */}
              <AnimatePresence>
                {viewingAttempt && viewingAttempt.answers?.exercises && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-lg space-y-2" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] font-['Tajawal']">
                        إجابات المحاولة {viewingAttempt.attempt_number}
                      </p>
                      {viewingAttempt.answers.exercises.map((ex, i) => {
                        const exerciseDef = exercises?.find(e => e.id === ex.id)
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={`mt-0.5 ${ex.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                              {ex.isCorrect ? '✅' : '❌'}
                            </span>
                            <div className="flex-1">
                              <span className="text-[var(--text-muted)] font-['Tajawal']">{EXERCISE_TYPE_LABELS[ex.type] || ex.type} — </span>
                              <span className="text-[var(--text-secondary)] font-['Inter']" dir="ltr">
                                {typeof ex.studentAnswer === 'string' ? ex.studentAnswer : JSON.stringify(ex.studentAnswer)}
                              </span>
                              {!ex.isCorrect && ex.correctAnswer && (
                                <span className="text-emerald-400/70 font-['Inter'] mr-2" dir="ltr"> → {ex.correctAnswer}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function GrammarSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface-raised)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.06)] animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
              <div className="h-3 w-28 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
