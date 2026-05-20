import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { V3_MOTION, resolvePalette } from '../_v3Tokens'

// 4-sector circular meter. Each sector is one movement, colored with the
// movement's accent, and fills from 0 to fillRatio * 100% with a 1.2s draw.
// Center shows the overall %, plus a clickable Trophy icon.
export default function UnitCompass({ compassData, onTrophyClick, onSectorClick, theme = 'dark' }) {
  const reduce = useReducedMotion()
  const size = 196
  const center = size / 2
  const outerR = (size / 2) - 14
  const trackStroke = 10
  const fillStroke = 12

  const sectors = compassData?.sectors || []
  const overallPct = Math.round((compassData?.overallRatio || 0) * 100)
  const overallLabel = compassData?.totalAll > 0
    ? `بوصلة الوحدة — أنجزتِ ${compassData.completedAll} من ${compassData.totalAll} أنشطة`
    : 'بوصلة الوحدة'

  // Each sector is 90° (4 movements), starting at -90° (top). RTL reading is
  // still left-to-right around the circle since this is a clock-like meter.
  const sectorPaths = useMemo(() => {
    const totalSectors = Math.max(sectors.length, 1)
    const sweepDeg = 360 / totalSectors
    const pad = 4 // small visual gap between sectors
    return sectors.map((s, i) => {
      const startDeg = -90 + i * sweepDeg + pad / 2
      const endDeg = -90 + (i + 1) * sweepDeg - pad / 2
      const startRad = (startDeg * Math.PI) / 180
      const endRad = (endDeg * Math.PI) / 180
      const x1 = center + outerR * Math.cos(startRad)
      const y1 = center + outerR * Math.sin(startRad)
      const x2 = center + outerR * Math.cos(endRad)
      const y2 = center + outerR * Math.sin(endRad)
      const largeArc = (endDeg - startDeg) > 180 ? 1 : 0
      // Approximate arc length used for stroke-dasharray
      const arcLen = (2 * Math.PI * outerR) * ((endDeg - startDeg) / 360)
      const palette = resolvePalette(s.movement, theme)
      return {
        movementId: s.movementId,
        movement: s.movement,
        d: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
        accent: palette.accent,
        fillRatio: s.fillRatio,
        completed: s.completed,
        total: s.total,
        arcLen,
      }
    })
  }, [sectors, theme, center, outerR])

  return (
    <div
      role="group"
      aria-label={overallLabel}
      style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Anchor ring */}
        <circle
          cx={center}
          cy={center}
          r={outerR}
          stroke="var(--ds-border-subtle)"
          strokeWidth={trackStroke}
          fill="none"
          opacity={0.7}
        />
        {sectorPaths.map((s, i) => (
          <g key={s.movementId}>
            {/* Track for this sector — subtle, full arc */}
            <path
              d={s.d}
              stroke="var(--ds-border-subtle)"
              strokeWidth={trackStroke}
              fill="none"
              strokeLinecap="round"
              opacity={0.6}
            />
            {/* Fill — animated */}
            <motion.path
              d={s.d}
              stroke={s.accent}
              strokeWidth={fillStroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={s.arcLen}
              initial={{ strokeDashoffset: s.arcLen }}
              animate={{ strokeDashoffset: s.arcLen * (1 - Math.max(0, Math.min(1, s.fillRatio))) }}
              transition={reduce ? V3_MOTION.reducedMotionFallback : { ...V3_MOTION.compassDraw, delay: 0.15 + i * 0.08 }}
              style={{ filter: s.fillRatio > 0 ? `drop-shadow(0 0 6px ${s.accent})` : 'none' }}
            />
            {/* Click capture — invisible wider stroke for easier hit */}
            <path
              d={s.d}
              stroke="transparent"
              strokeWidth={trackStroke + 14}
              fill="none"
              style={{ cursor: onSectorClick ? 'pointer' : 'default' }}
              onClick={() => onSectorClick && onSectorClick(s.movementId)}
              role={onSectorClick ? 'button' : undefined}
              tabIndex={onSectorClick ? 0 : undefined}
            >
              <title>{`${s.movement.titleAr} — ${s.completed}/${s.total}`}</title>
            </path>
          </g>
        ))}
      </svg>

      {/* Center — overall % + Trophy button */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            fontSize: '28px',
            color: 'var(--ds-text-primary)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {overallPct}<span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--ds-text-tertiary)' }}>%</span>
        </div>
        <button
          type="button"
          onClick={onTrophyClick}
          aria-label="افتح لوحة النجوم والترتيب"
          style={{
            marginTop: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-accent-gold)',
            padding: '6px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            transition: 'transform 150ms var(--ease-out, ease-out), filter 150ms var(--ease-out, ease-out)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.filter = 'drop-shadow(0 0 8px var(--ds-accent-primary-glow))' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none' }}
        >
          <Trophy size={22} strokeWidth={2.1} />
        </button>
      </div>
    </div>
  )
}
