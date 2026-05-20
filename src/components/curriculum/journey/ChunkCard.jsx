import { motion } from 'framer-motion'
import { Lock, CheckCircle2 } from 'lucide-react'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * MiniRing — a small circular progress indicator for use inside ChunkCard.
 */
function MiniRing({ percent, size = 70, completed = false, locked = false }) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const target = Math.max(0, Math.min(100, Math.round(percent)))
  const offset = circ - (target / 100) * circ

  // Locked: dim everything. Completed: gold. Otherwise: brand gradient.
  const stops = completed
    ? ['#fbbf24', '#f59e0b']
    : locked
    ? ['#52525b', '#3f3f46']
    : ['#38bdf8', '#a78bfa']

  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={`mini-ring-${size}-${completed ? 'g' : locked ? 'l' : 'd'}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="100%" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#mini-ring-${size}-${completed ? 'g' : locked ? 'l' : 'd'})`}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}

/**
 * ChunkCard — one card in the Journey Lane.
 * Three visual states: locked, ready (in-progress), complete.
 *
 * Props:
 *   chunk: {
 *     title, rangeLabel, total, mastered, passingCount, masteryPct,
 *     isUnlocked, isCompleted, status, wasJustUnlocked?
 *   }
 *   onTap: () => void
 *   onLockedTap: () => void   // shown when locked
 */
export default function ChunkCard({ chunk, onTap, onLockedTap }) {
  const { title, rangeLabel, total, mastered, masteryPct, isUnlocked, isCompleted, wasJustUnlocked } = chunk

  const handleClick = () => {
    if (!isUnlocked) {
      onLockedTap?.()
      return
    }
    onTap?.()
  }

  // Base background per state — uses tokens
  const baseStyle = {
    width: 'clamp(160px, 50vw, 200px)',
    minWidth: 160,
    height: 'clamp(160px, 46vw, 180px)',
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    scrollSnapAlign: 'start',
    background: isCompleted
      ? 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(245,158,11,0.04))'
      : !isUnlocked
      ? 'linear-gradient(135deg, rgba(82,82,91,0.10), rgba(63,63,70,0.04))'
      : 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(168,85,247,0.08))',
    border: isCompleted
      ? '1px solid rgba(251,191,36,0.35)'
      : !isUnlocked
      ? '1px solid rgba(255,255,255,0.05)'
      : '1px solid rgba(255,255,255,0.08)',
    opacity: isUnlocked ? 1 : 0.55,
    filter: isUnlocked ? 'none' : 'grayscale(0.5)',
    cursor: 'pointer',
    transition: 'transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease',
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={isUnlocked ? { y: -3, boxShadow: '0 16px 28px rgba(99,102,241,0.18)' } : {}}
      whileTap={isUnlocked ? { scale: 0.97 } : {}}
      animate={wasJustUnlocked ? { scale: [1, 1.05, 1] } : {}}
      transition={wasJustUnlocked ? { duration: 1.4, ease: 'easeInOut' } : { duration: 0.2 }}
      style={baseStyle}
      dir="rtl"
      aria-label={
        isCompleted
          ? `${title} مكتملة`
          : !isUnlocked
          ? `${title} مقفلة`
          : `ابدأ ${title}`
      }
    >
      {/* Completed: gold check stamp top-right (in RTL = visually on the right side) */}
      {isCompleted && (
        <div
          className="absolute"
          style={{
            top: 10,
            insetInlineStart: 10, // visually on the right edge in RTL
            color: '#fbbf24',
            filter: 'drop-shadow(0 4px 8px rgba(251,191,36,0.4))',
          }}
        >
          <CheckCircle2 size={20} />
        </div>
      )}

      {/* Locked: lock overlay center */}
      {!isUnlocked && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <Lock size={28} />
        </div>
      )}

      {/* Title + range */}
      <div className="text-center" style={{ visibility: !isUnlocked ? 'hidden' : 'visible' }}>
        <h4
          className="font-['Tajawal'] font-bold"
          style={{
            color: 'var(--text-primary, #faf5e6)',
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h4>
        <p
          className="font-['Tajawal'] mt-0.5"
          style={{
            color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
            fontSize: 11,
          }}
        >
          {rangeLabel}
        </p>
      </div>

      {/* Mini ring */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 70, marginTop: 6, visibility: !isUnlocked ? 'hidden' : 'visible' }}
      >
        <MiniRing percent={masteryPct} size={70} completed={isCompleted} locked={!isUnlocked} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black"
            style={{
              color: isCompleted ? '#fbbf24' : 'var(--text-primary, #faf5e6)',
              fontSize: 16,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {toArabicNum(masteryPct)}
            <span style={{ fontSize: 11, opacity: 0.7, marginInlineStart: 1 }}>%</span>
          </span>
        </div>
      </div>

      {/* Stat row */}
      {isUnlocked && (
        <div
          className="font-['Tajawal'] text-center mt-2"
          style={{
            color: 'var(--text-secondary, rgba(255,255,255,0.75))',
            fontSize: 12,
            lineHeight: 1.2,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {toArabicNum(mastered)}
            <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
            {toArabicNum(total)}
          </span>{' '}
          <span style={{ color: 'var(--text-tertiary)' }}>أتقنت</span>
        </div>
      )}
    </motion.button>
  )
}
