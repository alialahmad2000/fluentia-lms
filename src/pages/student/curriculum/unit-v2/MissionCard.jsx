import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Sparkles, Lock } from 'lucide-react'
import {
  BookOpen, PenLine, Languages, Headphones, FileEdit,
  Mic, Volume2, ClipboardCheck, Video,
} from 'lucide-react'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'
import {
  ACTIVITY_XP, ACTIVITY_MINUTES, ACTIVITY_WHY_GENERIC, SUGGESTED_ORDER,
} from './missions/missionConstants'

const ICON_MAP = {
  BookOpen, PenLine, Sparkles, Headphones, FileEdit, Mic, Volume2, ClipboardCheck, Video, Languages,
}

function StatusChip({ status }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '12px', fontWeight: 600,
    fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap',
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
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--cinematic-accent-cyan)',
          animation: 'missionPulse 1.4s ease-in-out infinite', flexShrink: 0,
        }} />
        قيد التعلّم
      </span>
    )
  }
  return (
    <span style={{ ...base, background: 'rgba(255,255,255,0.07)', color: V1.textDim }}>لم يبدأ</span>
  )
}

function MiniProgress({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div style={{ width: '60px', height: '5px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: 'var(--cinematic-accent-gold)', transition: 'width 0.4s ease' }} />
    </div>
  )
}

export default function MissionCard({ activity, index, onSelect, unit, completedSet }) {
  const { reduced } = useCinematicMotion()
  const [hovered, setHovered] = useState(false)

  const IconComp = ICON_MAP[activity.icon] ?? BookOpen
  const isLocked = !!activity.locked
  const isCompleted = activity.status === 'completed'
  const isInProgress = activity.status === 'in_progress'

  const xp = ACTIVITY_XP[activity.key] ?? 20
  const minutes = ACTIVITY_MINUTES[activity.key] ?? activity.estimatedMinutes ?? 15

  const whyText = useMemo(() => {
    return unit?.activity_ribbons?.[activity.key] || ACTIVITY_WHY_GENERIC[activity.key] || ''
  }, [unit, activity.key])

  const isSuggestedNext = useMemo(() => {
    if (isCompleted || isLocked) return false
    const set = completedSet ?? new Set()
    const firstPending = SUGGESTED_ORDER.find(k => !set.has(k))
    return firstPending === activity.key
  }, [activity.key, completedSet, isCompleted, isLocked])

  function handleClick() {
    if (!isLocked) onSelect(activity.key)
  }

  const borderColor = hovered && !isLocked ? activity.color : V1.border
  const boxShadow = hovered && !isLocked
    ? `0 12px 40px ${activity.color}26, 0 4px 16px rgba(0,0,0,0.4)`
    : '0 4px 20px rgba(0,0,0,0.35)'
  const translateY = hovered && !isLocked && !reduced ? -6 : 0

  return (
    <>
      <style>{`
        @keyframes missionPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={isSuggestedNext ? {
          opacity: isLocked ? 0.4 : 1, y: 0,
          boxShadow: [
            '0 0 0 0 rgba(251,191,36,0.4)',
            '0 0 0 10px rgba(251,191,36,0)',
            '0 0 0 0 rgba(251,191,36,0)',
          ],
        } : { opacity: isLocked ? 0.4 : 1, y: 0 }}
        transition={isSuggestedNext
          ? { duration: 2, repeat: Infinity, delay: index * 0.08 }
          : { duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
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
          border: `1px solid ${isSuggestedNext ? 'rgba(251,191,36,0.4)' : borderColor}`,
          padding: '20px',
          boxSizing: 'border-box',
          boxShadow,
          cursor: isLocked ? 'not-allowed' : 'pointer',
          transition: reduced ? 'none' : 'border-color 0.25s ease, box-shadow 0.25s ease',
          transform: `translateY(${translateY}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          userSelect: 'none',
        }}
      >
        {/* Suggested-next chip */}
        {isSuggestedNext && (
          <div style={{
            position: 'absolute',
            top: '-11px',
            right: '14px',
            background: 'var(--cinematic-accent-gold, #fbbf24)',
            color: '#060e1c',
            fontSize: '11px', fontWeight: 800,
            padding: '3px 10px', borderRadius: '100px',
            fontFamily: 'Tajawal, sans-serif',
          }}>
            ابدئي من هنا ←
          </div>
        )}

        {/* TOP ROW — icon + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: `radial-gradient(circle, ${activity.color}26 0%, transparent 70%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconComp size={28} style={{ color: activity.color, filter: `drop-shadow(0 0 6px ${activity.color}66)` }} />
          </div>
          <StatusChip status={activity.status} />
        </div>

        {/* Title */}
        <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, fontFamily: 'Tajawal, sans-serif', color: V1.textPrimary, lineHeight: 1.3 }}>
          {activity.label}
        </p>

        {/* Stats row — XP + Time */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: V1.textDim, fontSize: '13px', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={13} color="var(--cinematic-accent-gold, #fbbf24)" />
            +{xp} XP
          </span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} />
            ~{minutes} د
          </span>
          {isCompleted && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <span style={{ color: 'var(--cinematic-accent-gold-strong)', fontWeight: 700 }}>✓ منجز</span>
            </>
          )}
          {isInProgress && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <MiniProgress value={activity.progress} />
            </>
          )}
        </div>

        {/* Why ribbon text */}
        {whyText && (
          <div style={{
            marginTop: 'auto',
            fontSize: '12px',
            color: V1.textFaint,
            lineHeight: 1.55,
            borderTop: `1px dashed ${V1.border}`,
            paddingTop: '10px',
          }}>
            {whyText}
          </div>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)',
          }}>
            <Lock size={32} style={{ color: V1.textDim, opacity: 0.7 }} />
          </div>
        )}
      </motion.div>
    </>
  )
}
