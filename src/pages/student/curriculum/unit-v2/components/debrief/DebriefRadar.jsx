import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const SKILLS = [
  { key: 'reading_score',      label: 'القراءة' },
  { key: 'vocabulary_score',   label: 'المفردات' },
  { key: 'grammar_score',      label: 'القواعد' },
  { key: 'listening_score',    label: 'الاستماع' },
  { key: 'writing_score',      label: 'الكتابة' },
  { key: 'speaking_score',     label: 'التحدث' },
  { key: 'pronunciation_score',label: 'النطق' },
]

const SIZE = 220
const CENTER = SIZE / 2
const R = 85

function polarPoint(angle, r) {
  const rad = (angle - 90) * (Math.PI / 180)
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)]
}

function buildPath(scores) {
  const n = SKILLS.length
  return SKILLS.map((s, i) => {
    const angle = (360 / n) * i
    const r = R * ((scores[s.key] || 0) / 100)
    return polarPoint(angle, r)
  }).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z'
}

function GridPolygon({ r, opacity = 0.12 }) {
  const n = SKILLS.length
  const pts = SKILLS.map((_, i) => polarPoint((360 / n) * i, r)).map(p => p.join(',')).join(' ')
  return <polygon points={pts} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" opacity={opacity} />
}

export default function DebriefRadar({ data }) {
  const { snapshot, current } = data
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const before = snapshot || {}
  const after = current || {}

  const improvements = SKILLS
    .filter(s => (after[s.key] || 0) > (before[s.key] || 0))
    .sort((a, b) => (after[b.key] - before[b.key]) - (after[a.key] - before[a.key]))
    .slice(0, 3)
    .map(s => s.label)

  const beforePath = buildPath(before)
  const afterPath = buildPath(after)

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
      <h2 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, textAlign: 'center' }}>
        مهاراتكِ قبل وبعد
      </h2>

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} overflow="visible">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <GridPolygon key={f} r={R * f} />
        ))}

        {/* Axis lines */}
        {SKILLS.map((s, i) => {
          const [x, y] = polarPoint((360 / SKILLS.length) * i, R)
          return <line key={s.key} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        })}

        {/* Axis labels */}
        {SKILLS.map((s, i) => {
          const [x, y] = polarPoint((360 / SKILLS.length) * i, R + 20)
          return (
            <text key={s.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(248,250,252,0.55)" fontSize="9" fontFamily="Tajawal, sans-serif">
              {s.label}
            </text>
          )
        })}

        {/* Before polygon (ghost) */}
        <path
          d={beforePath}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* After polygon (animated from before → after) */}
        <motion.path
          d={prefersReduced ? afterPath : beforePath}
          animate={{ d: afterPath }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          fill="rgba(251,191,36,0.2)"
          stroke="var(--cinematic-accent-gold, #fbbf24)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}
        />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'rgba(248,250,252,0.6)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '20px', height: '1.5px', background: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' }} />
          قبل الوحدة
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#fbbf24', borderRadius: '2px' }} />
          بعد الوحدة
        </span>
      </div>

      {improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          style={{
            padding: '10px 18px', borderRadius: '12px',
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
            fontSize: '13px', color: 'rgba(248,250,252,0.85)', textAlign: 'center',
          }}
        >
          تحسّنتِ في: <strong style={{ color: '#fbbf24' }}>{improvements.join('، ')}</strong>
        </motion.div>
      )}
    </div>
  )
}
