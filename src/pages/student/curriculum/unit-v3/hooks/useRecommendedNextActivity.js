import { useMemo } from 'react'

// First activity in canonical order whose status !== 'completed'.
// Returns null if everything's done.
export function useRecommendedNextActivity(groupedMovements) {
  return useMemo(() => {
    if (!groupedMovements || groupedMovements.length === 0) return null
    for (const group of groupedMovements) {
      for (const activity of group.activities) {
        if (activity.status !== 'completed') return activity.key
      }
    }
    return null
  }, [groupedMovements])
}
