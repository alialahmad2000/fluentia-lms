import { useState, useEffect, useRef, useCallback } from 'react'
import { Target, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { awardCurriculumXP } from '../../utils/curriculumXP'
import ExerciseCard from './ExerciseCard'
import ExerciseSummary from './ExerciseSummary'
import AttemptsHistory from './AttemptsHistory'

// Exciting completion messages based on score
const COMPLETION_MESSAGES = [
  { min: 90, messages: ['ممتازة! أداء رائع 🌟', 'مبدعة! نتيجة مذهلة 🏆', 'واو! إنجاز استثنائي 🚀'] },
  { min: 70, messages: ['أحسنتِ! عمل جيد جداً 💪', 'رائع! تقدم ملحوظ ✨', 'ممتاز! استمري 🔥'] },
  { min: 50, messages: ['جيد! واصلي المحاولة 💫', 'لا بأس! أنتِ تتحسنين 🌱', 'حاولي مرة أخرى للأفضل 🎯'] },
  { min: 0, messages: ['لا تقلقي! التعلم يحتاج تكرار 📚', 'حاولي مرة أخرى — ستتحسنين! 💪', 'كل محاولة تقربك من الهدف 🌟'] },
]

function getCompletionMessage(score) {
  const tier = COMPLETION_MESSAGES.find(t => score >= t.min)
  const msgs = tier?.messages || COMPLETION_MESSAGES[3].messages
  return msgs[Math.floor(Math.random() * msgs.length)]
}

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
  const [isSaving, setIsSaving] = useState(false)
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

  // Save progress — with error handling, retry, and saving indicator.
  //
  // Save vs Submit separation (2026-04-16 bug fix):
  //   - Autosave path (isComplete=false) NEVER writes score, completed_at, or
  //     status='completed'. It ONLY persists the student's current answers as
  //     status='in_progress' so they can resume later. Unanswered questions
  //     stay unanswered — they are not auto-graded as wrong.
  //   - Submit path (isComplete=true) is only reachable from handleFinish
  //     (the "إنهاء وحفظ المحاولة" CTA). It computes score, sets status
  //     ='completed', awards XP, and updates best/is_latest flags.
  const saveProgress = useCallback(async (currentAnswers, isComplete, _retryCount = 0) => {
    if (!studentId || !grammarId) return
    const results = buildResults(currentAnswers)
    // Score only meaningful on submit; on autosave we write null.
    const correct = Object.values(currentAnswers).filter(a => a.correct).length
    const score = isComplete
      ? (total > 0 ? Math.round((correct / total) * 100) : 0)
      : null

    if (isComplete) setIsSaving(true)

    try {
      if (currentRowId) {
        const { error } = await supabase
          .from('student_curriculum_progress')
          .update({
            status: isComplete ? 'completed' : 'in_progress',
            // Keep score NULL on autosave so unanswered items aren't counted as wrong.
            ...(isComplete ? { score } : { score: null }),
            answers: { exercises: results },
            time_spent_seconds: timeRef.current,
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .eq('id', currentRowId)

        if (error) throw error

        if (isComplete) {
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
          toast({ type: 'success', title: getCompletionMessage(score) })
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
            // Null on autosave — only computed on submit (see top of saveProgress).
            score: isComplete ? score : null,
            answers: { exercises: results },
            time_spent_seconds: timeRef.current,
            completed_at: isComplete ? new Date().toISOString() : null,
            attempt_number: nextAttemptNum,
            is_latest: true,
            is_best: isComplete && !hasExisting,
          })
          .select()
          .single()

        if (error) throw error

        if (newRow) {
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
            toast({ type: 'success', title: getCompletionMessage(score) })
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
    } catch (err) {
      console.error('[ExerciseSection] Save failed:', err)
      if (_retryCount < 1) {
        // Auto-retry once after 1.5s
        setTimeout(() => saveProgress(currentAnswers, isComplete, _retryCount + 1), 1500)
        return
      }
      // Show error only after retry fails
      toast({ type: 'error', title: 'تعذّر حفظ تقدمك — حاولي مرة أخرى' })
      if (isComplete) hasSaved.current = false // allow re-attempt
    } finally {
      setIsSaving(false)
    }
  }, [studentId, unitId, grammarId, total, buildResults, currentRowId, onAttemptUpdate, allAttempts, attemptNumber])

  // Auto-save after each answer — NEVER auto-completes.
  // Students must click "إنهاء وحفظ المحاولة" (handleFinish) to submit.
  // This prevents the "last click silently graded all answers" bug where a
  // student answered the final question, navigated away without reviewing,
  // and came back to a completed row they never explicitly submitted.
  useEffect(() => {
    if (progressLoading) return
    if (answered === 0 || answered <= prevAnsweredRef.current) return
    prevAnsweredRef.current = answered
    // Always save as in_progress. Completion is only via handleFinish.
    saveProgress(answers, false)
  }, [answered, answers, progressLoading, saveProgress])

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

      {/* Saving indicator */}
      {isSaving && (
        <div className="flex items-center justify-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-sky)', borderTopColor: 'transparent' }} />
          <span className="text-sm font-['Tajawal'] font-medium" style={{ color: 'var(--accent-sky)' }}>جاري حفظ تقدمك...</span>
        </div>
      )}

      {/* Inline submit button — only path to completion since autosave no longer
          auto-submits. Shown whenever the student has answered at least one item
          but hasn't submitted yet. Disabled until all answered. */}
      {!isCompleted && !isSaving && answered > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleFinish}
            disabled={!allAnswered}
            className="px-6 py-3 rounded-xl font-bold font-['Tajawal'] text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: allAnswered ? 'var(--accent-sky, #38bdf8)' : 'var(--surface-raised, rgba(255,255,255,0.05))',
              color: allAnswered ? '#0a1225' : 'var(--text-muted)',
              border: '1px solid ' + (allAnswered ? 'var(--accent-sky, #38bdf8)' : 'var(--border-subtle, rgba(255,255,255,0.1))'),
            }}
          >
            {allAnswered
              ? `تسليم الإجابات (${answered}/${total})`
              : `أجب على جميع الأسئلة قبل التسليم (${answered}/${total})`}
          </button>
        </div>
      )}

      {/* Sticky CTA (mirrors the inline button, appears when scrolled above the list) */}
      {showStickyCta && allAnswered && !isCompleted && !isSaving && (
        <button onClick={handleFinish} className="grammar-sticky-cta font-['Tajawal'] text-sm active:scale-95 transition-transform">
          تسليم الإجابات ({answered}/{total})
        </button>
      )}

      {/* Attempts history */}
      <AttemptsHistory allAttempts={allAttempts} exercises={exercises} />
    </div>
  )
}
