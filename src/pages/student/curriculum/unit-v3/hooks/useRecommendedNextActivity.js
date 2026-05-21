import { useMemo } from 'react'

// First activity in canonical order whose status !== 'completed'.
// V3.1: if the exam gate is in 'ready' state and all other activities are
// done, the exam IS the next-recommended (returns 'assessment'). If the
// exam is 'locked'/'cooldown'/'locked_out', we never suggest it — we
// suggest the next incomplete activity from the other movements.
// Returns null if everything is done.
export function useRecommendedNextActivity(groupedMovements, examGate) {
  return useMemo(() => {
    if (!groupedMovements || groupedMovements.length === 0) return null

    // Find first incomplete activity in canonical order, skipping exam-gate
    // movements entirely (handled separately below).
    for (const group of groupedMovements) {
      if (group.movement.isExamGate) continue
      for (const activity of group.activities) {
        if (activity.status !== 'completed') return activity.key
      }
    }

    // All non-exam activities done. If exam is ready, point at it.
    if (examGate?.gateState === 'ready') return 'assessment'
    return null
  }, [groupedMovements, examGate])
}
