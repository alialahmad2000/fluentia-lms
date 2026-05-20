import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Decorative breathing ring used by ActivityStation when it's the recommended-next.
// Sits absolute behind the station card so it doesn't displace anything.
export default function NextSuggestionPulse({ accent, glow }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: '20px',
          border: `1.5px solid ${accent}`,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
    )
  }
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0.35, scale: 0.985 }}
      animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.985, 1.01, 0.985] }}
      transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      style={{
        position: 'absolute',
        inset: '-3px',
        borderRadius: '20px',
        border: `1.5px solid ${accent}`,
        boxShadow: `0 0 24px ${glow}`,
        pointerEvents: 'none',
      }}
    />
  )
}
