import { useState, useEffect, useRef, useCallback } from 'react'
import { Target, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { awardCurriculumXP } from '../../utils/curriculumXP'
import ExerciseCard from './ExerciseCard'
import ExerciseSummary from './ExerciseSummary'
import AttemptsHistory from './AttemptsHistory'

export default function ExerciseSection({ exercises, studentId, unitId, grammarId, onAttemptUpdate, grammarTopic, studentLevel, ruleSnippet }) {
  const sectionRef = useRef(null)
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

  // Load saved progress — display-only for completed attempts, hydrate only in-progress
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
        setAttemptNumber(latest.attempt_number || 1)

        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)
        onAttemptUpdate?.(null, latest.attempt_number || 1, best?.score ?? null)

        if (latest.status === 'completed') {
          // Completed attempt: show summary badge but keep exercises FRESH
          // Do NOT hydrate answers — student sees empty cards ready for a new attempt
          setIsCompleted(true)
          setShowSummary(true)
          hasSaved.current = true
          // No currentRowId — next answer will create a fresh DB row
        } else {
          // IMPORTANT: This hydrates in-progress answers so students don't lose work
          // when navigating between tabs. Do NOT revert this to a "fresh state" reset —
          // the student's data lives in DB and must be restored on mount.
          // Grading state is tracked separately via `correct` — we only show correct/wrong
          // marks AFTER the student re-answers, not during restoration.
          if (latest.answers?.exercises) {
            const restored = {}
            latest.answers.exercises.forEach(r => {
              if (r.studentAnswer != null) {
                // Restore only the selected value — omit `correct` so UI stays in "in-progress" mode
                restored[r.id] = { selected: r.studentAnswer }
              }
            })
            if (Object.keys(restored).length > 0) {
              setAnswers(restored)
              prevAnsweredRef.current = Object.keys(restored).length
            }
          }
          if (latest.id) setCurrentRowId(latest.id)
        }
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, grammarId])

  // Regression guard: answers at mount=0 (hydration happens async via the load effect above)
  // If answers appear synchronously before the load effect, that's a real regression.
  useEffect(() => {
    const preAnswered = Object.keys(answers).length
    if (preAnswered > 0 && !isCompleted && !retrying && !progressLoading) {
      console.warn('[ExerciseSection] Answers present on initial render — expected if restoring in-progress work')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Retry handler — resets local state only; DB write happens on first answer via auto-save
  const handleRetry = () => {
    setCurrentRowId(null)
    setRetrying(true)
    setIsCompleted(false)
    setShowSummary(false)
    setAnswers({})
    prevAnsweredRef.current = 0
    hasSaved.current = false
    timeRef.current = 0
    setRetryKey(k => k + 1)
    // Keep bestScore and attemptNumber — header badge still shows best score
    // attemptNumber will be incremented when the new row is inserted by saveProgress
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
      // No currentRowId — either first-ever attempt or fresh start after completed
      const hasExisting = allAttempts.length > 0
      const nextAttemptNum = hasExisting ? attemptNumber + 1 : 1

      // If previous rows exist, flip their is_latest
      if (hasExisting) {
        await supabase
          .from('student_curriculum_progress')
          .update({ is_latest: false })
          .eq('student_id', studentId)
          .eq('grammar_id', grammarId)
      }

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
          attempt_number: nextAttemptNum,
          is_latest: true,
          is_best: !hasExisting,
        })
        .select()
        .single()

      if (!error && newRow) {
        setCurrentRowId(newRow.id)
        setAttemptNumber(nextAttemptNum)
        if (isComplete) {
          // Recompute best
          const { data: bestRows } = await supabase
            .from('student_curriculum_progress')
            .select('id, score')
            .eq('student_id', studentId)
            .eq('grammar_id', grammarId)
            .eq('status', 'completed')
            .order('score', { ascending: false })

          if (bestRows?.length > 0) {
            await supabase.from('student_curriculum_progress').update({ is_best: false }).eq('student_id', studentId).eq('grammar_id', grammarId)
            await supabase.from('student_curriculum_progress').update({ is_best: true }).eq('id', bestRows[0].id)
            setBestScore(bestRows[0].score)
          } else {
            setBestScore(score)
          }

          setIsCompleted(true)
          setShowSummary(true)
          toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
          try { safeCelebrate('grammar_complete') } catch {}
          awardCurriculumXP(studentId, 'grammar', score, unitId)

          // Reload all attempts
          const { data: allRows } = await supabase
            .from('student_curriculum_progress')
            .select('*')
            .eq('student_id', studentId)
            .eq('grammar_id', grammarId)
            .order('attempt_number', { ascending: false })
          if (allRows) setAllAttempts(allRows)
          onAttemptUpdate?.(score, nextAttemptNum, bestRows?.[0]?.score ?? score)
        }
      }
    }
  }, [studentId, unitId, grammarId, total, buildResults, currentRowId, onAttemptUpdate, allAttempts, attemptNumber])

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
    <div ref={sectionRef} className="space-y-4 mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={16} style={{ color: 'var(--accent-sky)' }} />
          <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>تمارين · {total} أسئلة</h2>
        </div>
        <div className="flex items-center gap-2">
          {bestScore != null && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md font-['Tajawal']" style={{ background: 'var(--success-bg, rgba(74,222,128,0.1))', color: 'var(--success)', border: '1px solid var(--success-border, rgba(74,222,128,0.2))' }}>
              أفضل درجة: {bestScore}%
            </span>
          )}
          {retrying && (
            <span className="flex items-center gap-1 text-xs font-['Tajawal']" style={{ color: 'var(--accent-sky)' }}>
              <RotateCcw size={12} />
              محاولة {attemptNumber}
            </span>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {exercises.map((ex, i) => {
          const a = answers[ex.id]
          let cls = 'grammar-dot'
          if (a?.correct === true) cls += ' grammar-dot--correct'
          else if (a && a.correct === false) cls += ' grammar-dot--wrong'
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
              grammarTopic={grammarTopic}
              studentLevel={studentLevel}
              ruleSnippet={ruleSnippet}
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
