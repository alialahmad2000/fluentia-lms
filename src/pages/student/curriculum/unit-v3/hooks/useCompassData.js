import { useMemo } from 'react'

// Per-movement progress + overall ratio for the Unit Compass.
export function useCompassData(groupedMovements) {
  return useMemo(() => {
    const sectors = (groupedMovements || []).map(g => {
      const total = g.activities.length
      const completed = g.activities.filter(a => a.status === 'completed').length
      return {
        movementId: g.movement.id,
        movement: g.movement,
        total,
        completed,
        fillRatio: total > 0 ? completed / total : 0,
      }
    })
    const totalAll = sectors.reduce((s, x) => s + x.total, 0)
    const completedAll = sectors.reduce((s, x) => s + x.completed, 0)
    return {
      sectors,
      overallRatio: totalAll > 0 ? completedAll / totalAll : 0,
      totalAll,
      completedAll,
    }
  }, [groupedMovements])
}
