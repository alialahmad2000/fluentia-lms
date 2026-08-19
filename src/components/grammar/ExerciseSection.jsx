import { useState, useEffect, useRef, useCallback } from 'react'
import { Target, RotateCcw } from 'lucide-react'
import XPBadgeInline from '../xp/XPBadgeInline'
import { supabase } from '../../lib/supabase'
import { pickLatestAttempt } from '../../lib/activitySave'
import { useActivitySave } from '../../hooks/useActivitySave'
import SaveStatus from '../ui/SaveStatus'
import { toast } from '../ui/FluentiaToast'
import { safeCelebrate } from '../../lib/celebrations'
import { awardCurriculumXP } from '../../utils/curriculumXP'
import { useG } from '@/i18n/gender'
import ExerciseCard from './ExerciseCard'
import ExerciseSummary from './ExerciseSummary'
import AttemptsHistory from './AttemptsHistory'

// Exciting completion messages based on score. Gender-aware via the passed g().
function getCompletionMessage(score, g) {
  const COMPLETION_MESSAGES = [
    { min: 90, messages: [g('ممتاز! أداء رائع 🌟', 'ممتازة! أداء رائع 🌟'), g('مبدع! نتيجة مذهلة 🏆', 'مبدعة! نتيجة مذهلة 🏆'), 'واو! إنجاز استثنائي 🚀'] },
    { min: 70, messages: [g('أحسنت! عمل جيد جداً 💪', 'أحسنتِ! عمل جيد جداً 💪'), 'رائع! تقدم ملحوظ ✨', g('ممتاز! استمر 🔥', 'ممتاز! استمري 🔥')] },
    { min: 50, messages: [g('جيد! واصِل المحاولة 💫', 'جيد! واصلي المحاولة 💫'), g('لا بأس! أنت تتحسّن 🌱', 'لا بأس! أنتِ تتحسنين 🌱'), g('حاول مرة أخرى للأفضل 🎯', 'حاولي مرة أخرى للأفضل 🎯')] },
    { min: 0, messages: [g('لا تقلق! التعلم يحتاج تكرار 📚', 'لا تقلقي! التعلم يحتاج تكرار 📚'), g('حاول مرة أخرى — ستتحسّن! 💪', 'حاولي مرة أخرى — ستتحسنين! 💪'), 'كل محاولة تقربك من الهدف 🌟'] },
  ]
  const tier = COMPLETION_MESSAGES.find(t => score >= t.min)
  const msgs = tier?.messages || COMPLETION_MESSAGES[3].messages
  return msgs[Math.floor(Math.random() * msgs.length)]
}

export default function ExerciseSection({ exercises, studentId, unitId, grammarId, onAttemptUpdate, grammarTopic, studentLevel, ruleSnippet, hintAr }) {
  const g = useG()
  // One hook owns persistence for this section: the row, the attempt number,
  // the queue, the outbox, the readOnly guard and the save state. What used to
  // be five refs and a 160-line saveProgress is now `saveNow` / `submitAttempt`.
  const {
    state: saveState, lastSavedAt, readOnly,
    saveNow, submit: submitAttempt, startNewAttempt, adoptAttempt,
  } = useActivitySave({ studentId, unitId, sectionType: 'grammar', activityId: grammarId })
  const sectionRef = useRef(null)
  const [answers, setAnswers] = useState({})
  const [progressLoading, setProgressLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [allAttempts, setAllAttempts] = useState([])
  const [retrying, setRetrying] = useState(false)
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
  // Signature of the answers last written to the server, and the answers that are
  // typed but not yet flushed. Both drive the autosave effect below.
  const savedSigRef = useRef(null)
  const pendingRef = useRef(null)

  const total = exercises.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length
  const allAnswered = answered === total && total > 0
  // Content signature, not just a count — see the autosave effect for why.
  const answersSig = JSON.stringify(answers)

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
        const _picked = pickLatestAttempt(rows)
        const latest = { ..._picked.row, answers: _picked.answers }
        setAttemptNumber(latest.attempt_number || 1)

        const best = rows.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, rows[0])
        setBestScore(best?.score ?? null)
        onAttemptUpdate?.(null, latest.attempt_number || 1, best?.score ?? null)

        if (latest.status === 'completed') {
          // Completed attempt: show the summary badge AND restore the student's own
          // graded answers so reopening the section shows what she actually solved
          // (with correct/wrong marks), instead of blank cards. Matches Reading/Listening.
          // A retry still starts fresh — handleRetry clears `answers`.
          setIsCompleted(true)
          setShowSummary(true)
          hasSaved.current = true
          adoptAttempt(latest)
          if (latest.answers?.exercises) {
            const restored = {}
            latest.answers.exercises.forEach(r => {
              if (r.studentAnswer != null) {
                restored[r.id] = { selected: r.studentAnswer, correct: r.isCorrect }
              }
            })
            if (Object.keys(restored).length > 0) {
              setAnswers(restored)
              // Block the autosave effect from firing on restored answers — this
              // attempt is closed; reopening must never INSERT a phantom in_progress row.
              prevAnsweredRef.current = Object.keys(restored).length
              // Seed the signature so restoring does not immediately re-save it.
              savedSigRef.current = JSON.stringify(restored)
            }
          }
          // A retry allocates a fresh attempt server-side (handleRetry).
        } else {
          // IMPORTANT: This hydrates in-progress answers so students don't lose work
          // when navigating between tabs. Do NOT revert this to a "fresh state" reset —
          // the student's data lives in DB and must be restored on mount.
          //
          // Restore `correct` too (2026-07-27 fix). An earlier version deliberately
          // omitted it "so the UI stays in in-progress mode", but the item is already
          // locked once `answer` exists (every question type does `disabled={!!answer}`),
          // so the student can never re-answer and `correct` was never recomputed. It
          // stayed undefined forever, which meant:
          //   1. buildResults() wrote `isCorrect: false` on the next autosave, silently
          //      turning already-correct answers into wrong ones in the DB,
          //   2. the submitted score counted them as wrong,
          //   3. MCQ rendered the student's correct pick with a red ✗.
          // This poisoned the curriculum-quality detector too — the same answer showed up
          // as both correct and wrong on the same day for the same item.
          if (latest.answers?.exercises) {
            const restored = {}
            latest.answers.exercises.forEach(r => {
              if (r.studentAnswer != null) {
                restored[r.id] = { selected: r.studentAnswer, correct: r.isCorrect }
              }
            })
            if (Object.keys(restored).length > 0) {
              setAnswers(restored)
              prevAnsweredRef.current = Object.keys(restored).length
              // Seed the signature so restoring does not immediately re-save it.
              savedSigRef.current = JSON.stringify(restored)
            }
          }
          adoptAttempt(latest)
        }
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, grammarId, adoptAttempt])

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
    startNewAttempt()
    setRetrying(true)
    setIsCompleted(false)
    setShowSummary(false)
    setAnswers({})
    prevAnsweredRef.current = 0
    hasSaved.current = false
    savedSigRef.current = null
    pendingRef.current = null
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

  // Persist this attempt. ONE call — the contract lives in the database.
  //
  // What used to be here: an if(rowId) UPDATE else INSERT branch, an is_latest
  // flip, a two-step is_best recompute whose ORDER mattered (get it wrong and a
  // real completion becomes invisible to compute_unit_progress), a hand-rolled
  // retry timer, and a row-vanished recovery path. Every one of those was a fix
  // for a real incident, and every one had to be written seven times, once per
  // section. `save_activity_attempt` now does all of it atomically.
  const saveProgress = useCallback(async (currentAnswers, isComplete) => {
    const results = buildResults(currentAnswers)
    const correct = Object.values(currentAnswers).filter(a => a.correct).length
    const score = isComplete ? (total > 0 ? Math.round((correct / total) * 100) : 0) : null
    const payload = { exercises: results }

    if (!isComplete) {
      // Autosave. The server refuses to shrink a payload or reopen a submitted
      // attempt, so a late or stale flush can no longer destroy newer work.
      await saveNow(payload, { timeSpent: timeRef.current })
      return
    }

    setIsSaving(true)
    const res = await submitAttempt(payload, { score, timeSpent: timeRef.current })
    setIsSaving(false)

    if (!res?.ok) {
      // Hand the attempt BACK. Showing a score for work that was never written
      // is the exact failure this whole pass exists to end — the student walks
      // away believing she finished. SaveStatus is already showing her why.
      hasSaved.current = false
      if (!res?.queued) {
        toast({ type: 'error', title: g('تعذّر حفظ تقدمك — حاول مرة أخرى', 'تعذّر حفظ تقدمك — حاولي مرة أخرى') })
      }
      return
    }

    const saved = res.row
    setRetrying(false)
    setIsCompleted(true)
    setShowSummary(true)
    setAttemptNumber(saved.attempt_number)
    toast({ type: 'success', title: getCompletionMessage(score, g) })
    try { safeCelebrate('grammar_complete') } catch {}
    awardCurriculumXP(studentId, 'grammar', score, unitId)

    const { data: allRows } = await supabase
      .from('student_curriculum_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('grammar_id', grammarId)
      .order('attempt_number', { ascending: false })

    const best = allRows?.reduce((b, r) => (r.score || 0) > (b?.score || 0) ? r : b, allRows[0])
    if (allRows) setAllAttempts(allRows)
    if (best?.score != null) setBestScore(best.score)
    onAttemptUpdate?.(score, saved.attempt_number, best?.score ?? score)
  }, [studentId, unitId, grammarId, total, buildResults, onAttemptUpdate, g, saveNow, submitAttempt])

  // Auto-save after each answer — NEVER auto-completes.
  // Students must click "إنهاء وحفظ المحاولة" (handleFinish) to submit.
  // This prevents the "last click silently graded all answers" bug where a
  // student answered the final question, navigated away without reviewing,
  // and came back to a completed row they never explicitly submitted.
  //
  // Gate on the answers' CONTENT, not on `answered` (their count). The old gate was
  // `answered <= prevAnsweredRef.current`, so a save fired only when the number of
  // answered questions went UP. Editing or finishing an answer already started never
  // persisted: a student who typed "T" and completed it to "They are meeting" left
  // "T" on the server, and every correction after the first was silently dropped.
  // Debounced so typing costs one write, not one per keystroke.
  useEffect(() => {
    if (progressLoading) return
    if (answered === 0) return
    if (answersSig === savedSigRef.current) return
    pendingRef.current = answers
    const t = setTimeout(() => {
      savedSigRef.current = answersSig
      prevAnsweredRef.current = answered
      pendingRef.current = null
      // Always save as in_progress. Completion is only via handleFinish.
      saveProgress(answers, false)
    }, 700)
    return () => clearTimeout(t)
  }, [answersSig, answered, answers, progressLoading, saveProgress])

  // Flush a pending edit when she leaves — switching section (unmount), backgrounding
  // the tab, or closing it. Without this, the last ~700ms of work dies with the page,
  // which is exactly the "I solved it and it wasn't there" complaint.
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current) return
      // Never write in_progress over an attempt she has already submitted.
      if (hasSaved.current) { pendingRef.current = null; return }
      const toSave = pendingRef.current
      pendingRef.current = null
      savedSigRef.current = JSON.stringify(toSave)
      saveProgress(toSave, false)
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [saveProgress])

  const handleFinish = async () => {
    if (allAnswered && !hasSaved.current) {
      hasSaved.current = true
      // Drop any debounced in_progress write so it cannot land after this one.
      pendingRef.current = null
      savedSigRef.current = answersSig
      // AWAITED. Fire-and-forget here is how a student ends up looking at a
      // score for an attempt that never reached the server.
      await saveProgress(answers, true)
    }
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
              hintAr={hintAr}
            />
          </div>
        ))}
      </div>

      {/* Save state — visible, honest, and never says "saved" unless the
          server returned the stored row. */}
      <SaveStatus
        floating
        state={saveState}
        lastSavedAt={lastSavedAt}
        onRetry={() => saveProgress(answers, false)}
      />

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
              ? <><span>تسليم الإجابات ({answered}/{total})</span><XPBadgeInline amount={5} /></>
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
