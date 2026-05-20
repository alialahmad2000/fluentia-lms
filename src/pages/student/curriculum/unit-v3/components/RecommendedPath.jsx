import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { resolvePalette } from '../_v3Tokens'

// Simplified "Recommended Path" — instead of an animated SVG thread weaving
// through measured station positions (which is fragile on resize/scroll),
// this ships a vertical accent rail down the start edge of the movements
// column. The rail's color comes from the movement that owns the next
// suggested activity, so the visual signal still shifts as the student
// progresses. A subtle pulsing dot anchors the top.
//
// Phase B fallback documented in docs/UNIT-MOVEMENTS-V3-DISCOVERY.md §10/B11.
export default function RecommendedPath({ groupedMovements, recommendedNextKey, theme = 'dark' }) {
  const reduce = useReducedMotion()

  // Find the movement that owns the recommended-next activity
  const targetMovement = (groupedMovements || []).find(g =>
    g.activities.some(a => a.key === recommendedNextKey)
  )?.movement

  if (!targetMovement) {
    // Everything completed — no rail needed
    return null
  }

  const palette = resolvePalette(targetMovement, theme)

  return (
    <div
      aria-hidden="true"
      className="v3-recommended-path"
      style={{
        position: 'absolute',
        insetInlineStart: '6px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${palette.accent} 0%, ${palette.accentSoft} 35%, transparent 100%)`,
          borderRadius: '2px',
          opacity: 0.85,
        }}
      />
      <motion.div
        initial={reduce ? { opacity: 0.7 } : { opacity: 0.5, scale: 0.85 }}
        animate={reduce ? { opacity: 0.7 } : { opacity: [0.5, 1, 0.5], scale: [0.85, 1.05, 0.85] }}
        transition={reduce ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        style={{
          position: 'absolute',
          insetInlineStart: '-4px',
          top: '-2px',
          width: '10px',
          height: '10px',
          borderRadius: '999px',
          background: palette.accent,
          boxShadow: `0 0 14px ${palette.glow}`,
        }}
      />
    </div>
  )
}
