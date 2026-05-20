import React from 'react'

// Defensive belt-and-braces — groupActivitiesByMovement already filters empties.
export default function EmptyMovementGuard({ activities, children }) {
  if (!activities || activities.length === 0) return null
  return children
}
