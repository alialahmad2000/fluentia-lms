// V3.1 — Exam gate adapter over useUnitMasteryState.
//
// The existing useUnitMasteryState (src/pages/student/assessment/) returns a
// rich state object covering 8 cases (locked / cooldown / locked_out / ready /
// passed_cooling / retake_available / complete / loading). V3.1's ExamGatePanel
// only needs to render 3 visual states (locked / ready / passed), so this hook
// collapses the 8 cases into 3 + carries enough metadata for the rich label
// underneath.

import { useMemo } from 'react'
import { useUnitMasteryState } from '../../../assessment/useUnitMasteryState'

/**
 * Returns:
 *   {
 *     assessment,           // raw assessment row (null if no exam configured)
 *     gateState,            // 'locked' | 'ready' | 'passed' | 'absent' | 'loading'
 *     subState,             // original rich state.type from useUnitMasteryState
 *     progress,             // { current_pct, required_pct } when locked
 *     bestScore,            // number 0-100 when passed
 *     cooldownEndsAt,       // ISO when in cooldown
 *     lockoutEndsAt,        // ISO when in locked_out
 *     attemptNumber,        // current attempt index when ready
 *     maxAttempts,
 *     totalQuestions,
 *     timeLimitSeconds,
 *     openExam,             // () => navigate to exam (only valid when ready/passed/retake)
 *     loading,
 *   }
 */
export function useExamGate(unitId, studentId) {
  const { assessment, state, loading } = useUnitMasteryState(unitId, studentId)

  return useMemo(() => {
    if (loading) {
      return { assessment, gateState: 'loading', subState: 'loading', loading: true }
    }
    if (!assessment) {
      return { assessment: null, gateState: 'absent', subState: 'absent', loading: false }
    }
    const t = state?.type
    let gateState = 'locked'

    if (t === 'ready') gateState = 'ready'
    else if (t === 'passed_cooling' || t === 'retake_available' || t === 'complete') gateState = 'passed'
    // locked | cooldown | locked_out all roll up to 'locked' visual
    // (the rich sub-state drives the label underneath)

    return {
      assessment,
      gateState,
      subState: t,
      progress: t === 'locked' ? { current_pct: state.currentPct ?? 0, required_pct: state.requiredPct ?? 70 } : null,
      bestScore: (t === 'complete' || t === 'retake_available') ? state.bestScore : (t === 'passed_cooling' ? state.score : null),
      cooldownEndsAt: t === 'cooldown' ? state.cooldownEndsAt : null,
      lockoutEndsAt: t === 'locked_out' ? state.lockoutEndsAt : null,
      attemptNumber: t === 'ready' ? state.attemptNumber : null,
      maxAttempts: state?.maxAttempts ?? null,
      totalQuestions: t === 'ready' ? state.totalQuestions : assessment.total_questions,
      timeLimitSeconds: t === 'ready' ? state.timeLimitSeconds : assessment.time_limit_seconds,
      loading: false,
    }
  }, [assessment, state, loading])
}
