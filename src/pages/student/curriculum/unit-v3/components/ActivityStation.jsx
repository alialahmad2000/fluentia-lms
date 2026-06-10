import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Check, Circle, CircleDashed,
  BookOpen, PenLine, Sparkles, Headphones, FileEdit, Mic, Video, Volume2,
} from 'lucide-react'
import { ACTIVITY_SHORT_DESCRIPTIONS_AR } from '../_v3Mappings'
import { resolvePalette } from '../_v3Tokens'
import NextSuggestionPulse from './NextSuggestionPulse'

// Single activity station nested inside a MovementPanel.
// Icon strings come from V2's ACTIVITY_MAP (useUnitData.js) — a closed set.
// A namespace import (`import * as LucideIcons`) defeats tree-shaking and
// bundled the ENTIRE icon library (~650 kB) into the unit chunk; keep this
// an explicit map.
const STATION_ICONS = { BookOpen, PenLine, Sparkles, Headphones, FileEdit, Mic, Video, Volume2 }

function ActivityIcon({ name, color }) {
  const Cmp = (name && STATION_ICONS[name]) || Sparkles
  return <Cmp size={22} strokeWidth={2} color={color} aria-hidden="true" />
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          color: '#4ade80',
          background: 'rgba(74,222,128,0.12)',
          border: '1px solid rgba(74,222,128,0.32)',
          borderRadius: '999px',
          padding: '3px 8px',
        }}
      >
        <Check size={12} strokeWidth={2.4} />
        مكتمل
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--ds-accent-gold)',
          background: 'rgba(251,191,36,0.10)',
          border: '1px solid rgba(251,191,36,0.30)',
          borderRadius: '999px',
          padding: '3px 8px',
        }}
      >
        <CircleDashed size={12} strokeWidth={2.4} />
        قيد التقدم
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: "'Tajawal', sans-serif",
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--ds-text-tertiary)',
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: '999px',
        padding: '3px 8px',
      }}
    >
      <Circle size={10} strokeWidth={2.4} />
      لم تبدأ
    </span>
  )
}

export default function ActivityStation({
  activity,
  movement,
  isRecommendedNext,
  onSelect,
  theme = 'dark',
}) {
  const reduce = useReducedMotion()
  const palette = useMemo(() => resolvePalette(movement, theme), [movement, theme])

  const status = activity.status || 'not_started'
  const short = ACTIVITY_SHORT_DESCRIPTIONS_AR[activity.key] || ''
  const minutes = activity.estimatedMinutes || 10

  const ariaLabel = `${activity.label} — ${
    status === 'completed' ? 'مكتمل' : status === 'in_progress' ? 'قيد التقدم' : 'لم تبدأ بعد'
  }${isRecommendedNext ? '، الخطوة المقترحة التالية' : ''}، تحتاج تقريباً ${minutes} دقيقة`

  const hoverable = reduce
    ? {}
    : {
        whileHover: { y: -2, transition: { duration: 0.15 } },
        whileTap: { y: 0, transition: { duration: 0.08 } },
      }

  return (
    <div style={{ position: 'relative' }}>
      {isRecommendedNext && (
        <NextSuggestionPulse accent={palette.accent} glow={palette.glow} />
      )}
      <motion.button
        type="button"
        onClick={() => onSelect && onSelect(activity.key)}
        aria-label={ariaLabel}
        data-v3-station-id={activity.key}
        {...hoverable}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '148px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          padding: '16px 18px',
          borderRadius: '18px',
          background: 'var(--ds-surface-1)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${isRecommendedNext ? palette.accentSoft : 'var(--ds-border-subtle)'}`,
          color: 'var(--ds-text-primary)',
          textAlign: 'start',
          cursor: 'pointer',
          transition: 'border-color 180ms var(--ease-out, ease-out), background-color 180ms var(--ease-out, ease-out)',
          fontFamily: "'Tajawal', sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = palette.accentSoft
          e.currentTarget.style.background = 'var(--ds-surface-2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isRecommendedNext ? palette.accentSoft : 'var(--ds-border-subtle)'
          e.currentTarget.style.background = 'var(--ds-surface-1)'
        }}
      >
        {/* Top row — icon + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: palette.accentSoft,
              border: `1px solid ${palette.accentSoft}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ActivityIcon name={activity.icon} color={palette.accent} />
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Title + short description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "'Readex Pro', 'Tajawal', sans-serif",
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--ds-text-primary)',
              letterSpacing: '-0.005em',
              lineHeight: 1.25,
            }}
          >
            {activity.label}
          </h3>
          {short && (
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--ds-text-tertiary)',
                lineHeight: 1.4,
              }}
            >
              {short}
            </p>
          )}
        </div>

        {/* Bottom — minutes estimate */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '6px',
            fontSize: '11.5px',
            color: 'var(--ds-text-tertiary)',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          <span aria-hidden="true">⌁</span>
          <span>~{minutes} دقيقة</span>
        </div>
      </motion.button>
    </div>
  )
}
