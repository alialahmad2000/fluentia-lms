import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// V3.1 — Real Recommended Path
//
// Replaces V3 Phase B11 fallback (static vertical accent rail). This is the
// premium SVG thread weaving through every station's center, with a glowing
// dot animating along the path toward the next-recommended station.
//
// Implementation:
//   - Every station carries data-v3-station-id=<activityKey>. We use those
//     elements' getBoundingClientRect to find centers.
//   - A Catmull-Rom spline is converted to an SVG path "d" attribute for a
//     hand-drawn-feel curve.
//   - The path's foreground (bright stroke) animates pathLength from 0 to
//     the ratio (targetIdx / lastIdx). The background (dim dashed) is the
//     full trail.
//   - The glowing dot uses <animateMotion> along the path target.
//   - Resize + DOM mutations re-measure (rAF-throttled).
//
// Reduce-motion: foreground path renders fully drawn instantly, dot is
// positioned statically at the target station, no animation.

function buildSmoothPath(points) {
  if (!points || points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export default function RecommendedPath({ groupedMovements, recommendedNextKey, theme = 'dark' }) {
  const reduce = useReducedMotion()
  const containerRef = useRef(null)
  const [pathData, setPathData] = useState({ d: '', dotXY: null, targetIdx: -1, lastIdx: 0 })

  useLayoutEffect(() => {
    let rafId = 0
    let mutationTimer = 0

    const recompute = () => {
      const container = containerRef.current
      if (!container) return
      const stations = Array.from(document.querySelectorAll('[data-v3-station-id]'))
      if (stations.length < 1) {
        setPathData({ d: '', dotXY: null, targetIdx: -1, lastIdx: 0 })
        return
      }
      const containerRect = container.getBoundingClientRect()
      const points = stations.map(el => {
        const r = el.getBoundingClientRect()
        return {
          key: el.getAttribute('data-v3-station-id'),
          x: r.left - containerRect.left + r.width / 2,
          y: r.top - containerRect.top + r.height / 2,
        }
      })
      const d = buildSmoothPath(points)
      const targetIdx = points.findIndex(p => p.key === recommendedNextKey)
      const lastPoint = targetIdx >= 0 ? points[targetIdx] : points[points.length - 1]
      const dotXY = lastPoint ? { x: lastPoint.x, y: lastPoint.y } : null
      setPathData({ d, dotXY, targetIdx, lastIdx: points.length - 1 })
    }

    const schedule = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(recompute)
    }

    schedule()
    window.addEventListener('resize', schedule)
    const obs = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer)
      mutationTimer = setTimeout(schedule, 100)
    })
    obs.observe(document.body, { childList: true, subtree: true, attributes: false })

    return () => {
      window.removeEventListener('resize', schedule)
      obs.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
      if (mutationTimer) clearTimeout(mutationTimer)
    }
  }, [groupedMovements, recommendedNextKey])

  // Compute fraction of path to highlight as "completed up to target"
  const targetFraction = pathData.lastIdx > 0 && pathData.targetIdx >= 0
    ? Math.max(0, Math.min(1, pathData.targetIdx / pathData.lastIdx))
    : 0

  if (!pathData.d) {
    return <div ref={containerRef} className="unit-v3-recommended-path-layer" aria-hidden="true" />
  }

  const accentColor = theme === 'light' ? 'rgba(245,158,11,0.9)' : 'rgba(251,191,36,0.95)'
  const dimColor    = 'var(--ds-border-subtle)'
  const glowColor   = theme === 'light' ? 'rgba(245,158,11,0.5)' : 'rgba(251,191,36,0.55)'

  return (
    <div
      ref={containerRef}
      className="unit-v3-recommended-path-layer"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="v3-recpath-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Background dashed trail (full path) */}
        <path
          d={pathData.d}
          stroke={dimColor}
          strokeWidth="1.5"
          strokeDasharray="4 8"
          fill="none"
          opacity="0.55"
        />

        {/* Foreground bright path up to the recommended station */}
        {reduce ? (
          <path
            d={pathData.d}
            stroke={accentColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray={`${targetFraction} 1`}
            strokeDashoffset="0"
          />
        ) : (
          <motion.path
            d={pathData.d}
            stroke={accentColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1 1"
            initial={{ strokeDashoffset: 1 }}
            animate={{ strokeDashoffset: 1 - targetFraction }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Glow halo behind the dot */}
        {pathData.dotXY && (
          <circle
            cx={pathData.dotXY.x}
            cy={pathData.dotXY.y}
            r="10"
            fill={glowColor}
            filter="url(#v3-recpath-dot-glow)"
            opacity={reduce ? 0.6 : 0.85}
          />
        )}

        {/* Dot itself */}
        {pathData.dotXY && (
          reduce ? (
            <circle
              cx={pathData.dotXY.x}
              cy={pathData.dotXY.y}
              r="6"
              fill={accentColor}
            />
          ) : (
            <motion.circle
              cx={pathData.dotXY.x}
              cy={pathData.dotXY.y}
              r="6"
              fill={accentColor}
              initial={{ scale: 0.85, opacity: 0.7 }}
              animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
            />
          )
        )}
      </svg>
    </div>
  )
}
