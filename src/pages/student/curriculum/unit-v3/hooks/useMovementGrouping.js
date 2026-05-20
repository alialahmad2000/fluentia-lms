import { useMemo } from 'react'
import { groupActivitiesByMovement } from '../_v3Mappings'

// Pure transform — activities comes from useUnitData().activities.
// Returns groups in canonical order with empty movements filtered out.
export function useMovementGrouping(activities) {
  return useMemo(() => groupActivitiesByMovement(activities || []), [activities])
}
