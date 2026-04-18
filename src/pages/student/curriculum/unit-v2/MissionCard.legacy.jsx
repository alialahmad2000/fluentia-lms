import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, PenLine, Languages, Headphones, FileEdit,
  Mic, Volume2, ClipboardCheck, Video, Sparkles, Lock,
} from 'lucide-react'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'

const ICON_MAP = {
  BookOpen,
  PenLine,
  Sparkles,
  Headphones,
  FileEdit,
  Mic,
  Volume2,
  ClipboardCheck,
  Video,
  Languages,
}

/* ─── Status chip ─── */
function StatusChip({ status }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'Tajawal, sans-serif',
    whiteSpace: 'nowrap',
  }

  if (status === 'completed') {
    return (
      <span style={{ ...base, background: 'var(--cinematic-accent-gold-soft)', color: 'var(--cinematic-accent-gold-strong)' }}>
        مكتمل ✓
      </span>
    )
  }

  if (status === 'in_progress') {
    return (
      <span style={{ ...base, background: 'rgba(34,211,238,0.12)', color: 'var(--cinematic-accent-cyan)' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--cinematic-accent-cyan)',
            animation: 'missionPulse 1.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        قيد التعلّم
      </span>
    )
  }

  // not_started (default)
  return (
    <span style={{ ...base, background: 'rgba(255,255,255,0.07)', color: V1.textDim }}>
      لم يبدأ
    </span>
  )
}

/* ─── Progress bar (small) ─── */
function MiniProgress({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      style={{
        width: '60px',
        height: '5px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: '4px',
          background: 'var(--cinematic-accent-gold)',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

/* ─── Main card ─── */
export default function MissionCard({ activity, index, onSelect }) {
  const { reduced } = useCinematicMotion()
  const [hovered, setHovered] = useState(false)

  const IconComp = ICON_MAP[activity.icon] ?? BookOpen
  const isLocked = !!activity.locked
  const isCompleted = activity.status === 'completed'
  const isInProgress = activity.status === 'in_progress'

  function handleClick() {
    if (!isLocked) onSelect(activity.key)
  }

  /* Hover-dependent styles */
  const borderColor = hovered && !isLocked ? activity.color : V1.border
  const boxShadow =
    hovered && !isLocked
      ? `0 12px 40px ${activity.color}26, 0 4px 16px rgba(0,0,0,0.4)`
      : '0 4px 20px rgba(0,0,0,0.35)'
  const translateY = hovered && !isLocked && !reduced ? -6 : 0

  return (
    <>
      {/* Keyframe for status-chip pulse (injected once globally) */}
      <style>{`
        @keyframes missionPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: isLocked ? 0.4 : 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '220px',
          borderRadius: '20px',
          background: V1.bgElevated,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${borderColor}`,
          padding: '20px',
          boxSizing: 'border-box',
          boxShadow,
          cursor: isLocked ? 'not-allowed' : 'pointer',
          transition: reduced
            ? 'none'
            : 'border-color 0.25s ease, box-shadow 0.25s ease',
          transform: `translateY(${translateY}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          userSelect: 'none',
        }}
      >
        {/* ── TOP ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Icon with ambient glow circle */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${activity.color}26 0%, transparent 70%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconComp
              size={28}
              style={{ color: activity.color, filter: `drop-shadow(0 0 6px ${activity.color}66)` }}
            />
          </div>

          {/* Status chip */}
          <StatusChip status={activity.status} />
        </div>

        {/* ── MIDDLE ── */}
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              fontFamily: 'Tajawal, sans-serif',
              color: V1.textPrimary,
              lineHeight: 1.3,
            }}
          >
            {activity.label}
          </p>
          {activity.labelEn && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                color: V1.textDim,
              }}
            >
              {activity.labelEn}
            </p>
          )}
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Time estimate */}
          <span
            style={{
              fontSize: '13px',
              fontFamily: 'Tajawal, sans-serif',
              color: V1.textDim,
            }}
          >
            ⏱ ~{activity.estimatedMinutes} دقائق
          </span>

          {/* Right side: checkmark or progress bar */}
          {isCompleted ? (
            <span
              style={{
                fontSize: '18px',
                color: 'var(--cinematic-accent-gold)',
                fontWeight: 700,
              }}
            >
              ✓
            </span>
          ) : isInProgress ? (
            <MiniProgress value={activity.progress} />
          ) : null}
        </div>

        {/* ── LOCK OVERLAY ── */}
        {isLocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <Lock size={32} style={{ color: V1.textDim, opacity: 0.7 }} />
          </div>
        )}
      </motion.div>
    </>
  )
}
