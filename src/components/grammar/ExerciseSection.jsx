import { useState, useEffect, useRef, useCallback } from 'react'
import { Target, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { awardCurriculumXP } from '../../utils/curriculumXP'
import ExerciseCard from './ExerciseCard'
import ExerciseSummary from './ExerciseSummary'
import AttemptsHistory from './AttemptsHistory'
import { useFadeIn } from './useFadeIn'

export default function ExerciseSection({ exercises, studentId, unitId, grammarId, onAttemptUpdate }) {
  const sectionRef = useFadeIn()
  const [answers, setAnswers] = useState({})
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [allAttempts, setAllAttempts] = useState([])
  const [retrying, setRetrying] = useState(false)
  const [currentRowId, setCurrentRowId] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [bestScore, setBestScore] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const hasSaved = useRef(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const prevAnsweredRef = useRef(0)
  const lastExerciseRef = useRef(null)

  const total = exercises.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length
  const allAnswered = answered === total && total > 0

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load saved progress
  useEffect(() => {
    if (!studentId || !grammarId) { setProgressLoading(false); return }
    let isMounted = true
    const load = async () => {
      const { data: rows } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('grammar_id', grammarId)
        .order('attempt_number', { ascending: false })

      if (!isMounted) return

      if (rows && rows.length > 0) {
        setAllAttempts(rows)
        const latest = rows.find(r => r.is_latest) || rows[0]
        setCurrentRowId(latest.id)
        setAttemptNumber(latest.attempt_number || 1)

        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)
        onAttemptUpdate?.(null, latest.attempt_number || 1, best?.score ?? null)

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
        if (latest.status === 'completed') {
          hasSaved.current = true
          setShowSummary(true)
        }
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, grammarId])

  // Sticky CTA visibility
  useEffect(() => {
    if (!allAnswered || isCompleted) { setShowStickyCta(false); return }
    const el = lastExerciseRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [allAnswered, isCompleted])

  // Retry handler
  const handleRetry = async () => {
    const nextAttempt = attemptNumber + 1

    await supabase
      .from('student_curriculum_progress')
      .update({ is_latest: false })
      .eq('student_id', studentId)
      .eq('grammar_id', grammarId)

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
      setShowSummary(false)
      setAnswers({})
      prevAnsweredRef.current = 0
      hasSaved.current = false
      timeRef.current = 0
      setRetryKey(k => k + 1)
      onAttemptUpdate?.(null, nextAttempt, null)
    }
  }

  // Build results
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

  // Save progress
  const saveProgress = useCallback(async (currentAnswers, isComplete) => {
    if (!studentId || !grammarId) return
    const results = buildResults(currentAnswers)
    const answeredCount = Object.keys(currentAnswers).length
    const correct = Object.values(currentAnswers).filter(a => a.correct).length
    const score = answeredCount > 0 ? Math.round((correct / total) * 100) : 0

    if (currentRowId) {
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
        // Recompute best
        const { data: rows } = await supabase
          .from('student_curriculum_progress')
          .select('id, score, attempt_number')
          .eq('student_id', studentId)
          .eq('grammar_id', grammarId)
          .eq('status', 'completed')
          .order('score', { ascending: false })
          .order('attempt_number', { ascending: false })

        if (rows?.length > 0) {
          await supabase.from('student_curriculum_progress').update({ is_best: false }).eq('student_id', studentId).eq('grammar_id', grammarId)
          await supabase.from('student_curriculum_progress').update({ is_best: true }).eq('id', rows[0].id)
          setBestScore(rows[0].score)
        }

        setRetrying(false)
        setIsCompleted(true)
        setShowSummary(true)
        toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
        try { safeCelebrate('grammar_complete') } catch {}
        awardCurriculumXP(studentId, 'grammar', score, unitId)

        // Reload attempts
        const { data: allRows } = await supabase
          .from('student_curriculum_progress')
          .select('*')
          .eq('student_id', studentId)
          .eq('grammar_id', grammarId)
          .order('attempt_number', { ascending: false })
        if (allRows) setAllAttempts(allRows)
        onAttemptUpdate?.(score, attemptNumber, rows?.[0]?.score ?? score)
      }
    } else {
      // First ever attempt
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
          setShowSummary(true)
          setAllAttempts([newRow])
          toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
          try { safeCelebrate('grammar_complete') } catch {}
          awardCurriculumXP(studentId, 'grammar', score, unitId)
          onAttemptUpdate?.(score, 1, score)
        }
      }
    }
  }, [studentId, unitId, grammarId, total, buildResults, currentRowId, onAttemptUpdate])

  // Auto-save after each answer
  useEffect(() => {
    if (progressLoading) return
    if (answered === 0 || answered <= prevAnsweredRef.current) return
    prevAnsweredRef.current = answered
    const isComplete = answered === total
    if (isComplete && hasSaved.current) return
    if (isComplete) hasSaved.current = true
    saveProgress(answers, isComplete)
  }, [answered, total, answers, progressLoading, saveProgress])

  const handleFinish = () => {
    if (allAnswered && !hasSaved.current) {
      hasSaved.current = true
      saveProgress(answers, true)
    }
    // Scroll to summary
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (progressLoading) {
    return (
      <div className="space-y-4 mt-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grammar-glass h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div ref={sectionRef} className="grammar-fade-in space-y-4 mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-sky-400/70" />
          <h2 className="text-sm font-bold text-white/70 font-['Tajawal']">تمارين · {total} أسئلة</h2>
        </div>
        {retrying && (
          <span className="flex items-center gap-1 text-xs text-sky-400 font-['Tajawal']">
            <RotateCcw size={12} />
            محاولة {attemptNumber}
          </span>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {exercises.map((ex, i) => {
          const a = answers[ex.id]
          let cls = 'grammar-dot'
          if (a?.correct) cls += ' grammar-dot--correct'
          else if (a && !a.correct) cls += ' grammar-dot--wrong'
          return <div key={ex.id} className={cls} />
        })}
      </div>

      {/* Summary (shown after completion) */}
      {showSummary && isCompleted && (
        <ExerciseSummary
          correctCount={correctCount}
          total={total}
          score={total > 0 ? Math.round((correctCount / total) * 100) : 0}
          bestScore={bestScore}
          attemptNumber={attemptNumber}
          onRetry={handleRetry}
        />
      )}

      {/* Exercise cards — always visible inline */}
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <div key={`${ex.id}-${retryKey}`} ref={idx === exercises.length - 1 ? lastExerciseRef : undefined}>
            <ExerciseCard
              exercise={ex}
              index={idx}
              total={total}
              answer={answers[ex.id]}
              onAnswer={(ans) => setAnswers(prev => ({ ...prev, [ex.id]: ans }))}
            />
          </div>
        ))}
      </div>

      {/* Sticky CTA */}
      {showStickyCta && allAnswered && !isCompleted && (
        <button onClick={handleFinish} className="grammar-sticky-cta font-['Tajawal'] text-sm">
          إنهاء وحفظ المحاولة ({correctCount}/{total} صحيحة)
        </button>
      )}

      {/* Attempts history */}
      <AttemptsHistory allAttempts={allAttempts} exercises={exercises} />
    </div>
  )
}
