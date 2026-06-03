import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Lock, Sparkles } from 'lucide-react'
import { V3_MOTION, resolvePalette } from '../_v3Tokens'
import { useG } from '@/i18n/gender'

// V3.1: gold ring inside the compass dedicated to the exam gate.
const EXAM_RING_GOLD_DARK  = '#F5C842'
const EXAM_RING_GOLD_LIGHT = '#D4A017'

function examRingColor(theme) {
  return theme === 'light' ? EXAM_RING_GOLD_LIGHT : EXAM_RING_GOLD_DARK
}

function examTooltip(gateState) {
  if (gateState === 'passed') return 'الاختبار — مُجتاز'
  if (gateState === 'ready') return 'الاختبار — جاهز'
  if (gateState === 'absent') return 'لا يوجد اختبار لهذه الوحدة'
  return 'الاختبار — مقفل'
}

// 4-sector circular meter. Each sector is one movement, colored with the
// movement's accent, and fills from 0 to fillRatio * 100% with a 1.2s draw.
// V3.1 adds an inner concentric exam-state ring.
// Center shows the overall %, plus a clickable Trophy icon.
export default function UnitCompass({ compassData, examGate, onTrophyClick, onSectorClick, theme = 'dark' }) {
  const g = useG()
  const reduce = useReducedMotion()
  const size = 196
  const center = size / 2
  const outerR = (size / 2) - 14
  const trackStroke = 10
  const fillStroke = 12
  const innerR = Math.round(outerR * 0.62) // exam ring sits inside the outer ring

  const sectors = compassData?.sectors || []
  const overallPct = Math.round((compassData?.overallRatio || 0) * 100)
  const overallLabel = compassData?.totalAll > 0
    ? `بوصلة الوحدة — ${g('أنجزت', 'أنجزتِ')} ${compassData.completedAll} من ${compassData.totalAll} أنشطة`
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

        {/* V3.1 inner exam ring — gray (locked) / pulsing gold (ready) / solid gold (passed) */}
        {examGate && examGate.gateState !== 'absent' && examGate.gateState !== 'loading' && (
          <ExamInnerRing
            center={center}
            radius={innerR}
            gateState={examGate.gateState}
            theme={theme}
            reduce={reduce}
          />
        )}
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
        {/* V3.1: exam-state pip under the percentage */}
        {examGate && examGate.gateState !== 'absent' && examGate.gateState !== 'loading' && (
          <ExamCenterPip gateState={examGate.gateState} theme={theme} />
        )}
        <button
          type="button"
          onClick={onTrophyClick}
          aria-label="افتح لوحة النجوم والترتيب"
          style={{
            marginTop: '4px',
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

// ─── V3.1 inner exam ring ──────────────────────────────────────────────────

function ExamInnerRing({ center, radius, gateState, theme, reduce }) {
  const gold = examRingColor(theme)
  const tooltip = examTooltip(gateState)

  if (gateState === 'locked') {
    return (
      <g>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--ds-border-strong)"
          strokeWidth="3"
          opacity={0.6}
          strokeDasharray="3 6"
        >
          <title>{tooltip}</title>
        </circle>
      </g>
    )
  }
  if (gateState === 'passed') {
    return (
      <g>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gold}
          strokeWidth="3.5"
          style={{ filter: `drop-shadow(0 0 6px ${gold}88)` }}
        >
          <title>{tooltip}</title>
        </circle>
      </g>
    )
  }
  // ready — pulsing
  if (reduce) {
    return (
      <g>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gold}
          strokeWidth="3.5"
          style={{ filter: `drop-shadow(0 0 6px ${gold}88)` }}
        >
          <title>{tooltip}</title>
        </circle>
      </g>
    )
  }
  return (
    <g>
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={gold}
        strokeWidth="3"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        style={{ filter: `drop-shadow(0 0 6px ${gold}88)` }}
      >
        <title>{tooltip}</title>
      </motion.circle>
    </g>
  )
}

function ExamCenterPip({ gateState, theme }) {
  const gold = examRingColor(theme)
  let icon, label, color
  if (gateState === 'locked') {
    icon = <Lock size={11} strokeWidth={2.4} />
    label = 'مقفل'
    color = 'var(--ds-text-tertiary)'
  } else if (gateState === 'passed') {
    icon = <Trophy size={11} strokeWidth={2.4} />
    label = 'مُجتاز'
    color = gold
  } else { // ready
    icon = <Sparkles size={11} strokeWidth={2.4} />
    label = 'جاهز'
    color = gold
  }
  return (
    <span
      style={{
        marginTop: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontFamily: "'Tajawal', sans-serif",
        fontSize: '10px',
        fontWeight: 600,
        color,
        letterSpacing: '0.03em',
      }}
      aria-label={`الاختبار — ${label}`}
    >
      {icon}
      {label}
    </span>
  )
}
