import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Play, Video, Check, Clock } from 'lucide-react'
import { ACTIVITY_SHORT_DESCRIPTIONS_AR } from '../_v3Mappings'
import { resolvePalette } from '../_v3Tokens'
import { useG } from '@/i18n/gender'
import NextSuggestionPulse from './NextSuggestionPulse'

// V3.1 — RecordingStation
// Media-aware variant of ActivityStation for the class recording.
// Shows: 16:9 thumbnail (or Play placeholder), duration badge, watch-progress
// overlay, status badge (not_watched / partial / watched), resume affordance.
//
// activity prop is the activity object from useUnitData (key='recording').
// recordingData prop is the merged shape from useRecordingDataEnrichment:
//   { id, google_drive_url, thumbnail_url, duration_seconds, title,
//     recorded_date, part, watched_percent, position_seconds, completed_at }

function formatMMSS(seconds) {
  if (!seconds || seconds < 0) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function partLabel(part) {
  if (part === 'a') return 'الجزء A'
  if (part === 'b') return 'الجزء B'
  return part ? `الجزء ${part.toUpperCase()}` : null
}

export default function RecordingStation({
  activity,
  movement,
  recordingData,
  isRecommendedNext,
  onSelect,
  theme = 'dark',
}) {
  // ─── ALL HOOKS AT TOP ───
  const g = useG()
  const reduce = useReducedMotion()
  const palette = useMemo(() => resolvePalette(movement, theme), [movement, theme])

  const watchState = useMemo(() => {
    const watched = recordingData?.watched_percent ?? 0
    if (watched >= 95 || recordingData?.completed_at) return 'watched'
    if (watched > 0) return 'partial'
    return 'not_watched'
  }, [recordingData])

  const total = recordingData?.duration_seconds ?? 0
  const watchedFraction = total > 0 ? Math.min(1, (recordingData?.position_seconds ?? 0) / total) : 0
  const durationLabel = formatMMSS(total)
  const resumeLabel = recordingData?.position_seconds > 0 ? formatMMSS(recordingData.position_seconds) : null
  const partTag = partLabel(recordingData?.part)

  const short = ACTIVITY_SHORT_DESCRIPTIONS_AR[activity.key] || ''
  const ariaLabel = `${activity.label}${partTag ? ' — ' + partTag : ''} — ${
    watchState === 'watched' ? 'شوهدت' : watchState === 'partial' ? `${g('تابع من', 'تابعي من')} ${resumeLabel}` : 'لم تُشاهد'
  }${durationLabel ? `، المدة ${durationLabel}` : ''}`

  const hoverable = reduce
    ? {}
    : {
        whileHover: { y: -2, transition: { duration: 0.15 } },
        whileTap: { y: 0, transition: { duration: 0.08 } },
      }

  return (
    <div style={{ position: 'relative' }}>
      {isRecommendedNext && <NextSuggestionPulse accent={palette.accent} glow={palette.glow} />}
      <motion.button
        type="button"
        onClick={() => onSelect && onSelect(activity.key)}
        aria-label={ariaLabel}
        data-v3-station-id={activity.key}
        {...hoverable}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          padding: '0 0 14px 0',
          borderRadius: '18px',
          background: 'var(--ds-surface-1)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${isRecommendedNext ? palette.accentSoft : 'var(--ds-border-subtle)'}`,
          color: 'var(--ds-text-primary)',
          textAlign: 'start',
          cursor: 'pointer',
          overflow: 'hidden',
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
        {/* 16:9 thumbnail area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            background: recordingData?.thumbnail_url
              ? `linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%), url(${recordingData.thumbnail_url}) center/cover`
              : `linear-gradient(135deg, ${palette.accentSoft}, ${palette.gradientFrom})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!recordingData?.thumbnail_url && (
            <Play size={36} color={palette.accent} fill={palette.accent} strokeWidth={0} aria-hidden="true" />
          )}
          {recordingData?.thumbnail_url && (
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                border: '1.5px solid rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <Play size={20} color="#ffffff" fill="#ffffff" strokeWidth={0} style={{ marginInlineStart: '2px' }} />
            </div>
          )}

          {/* Duration badge — bottom-start (RTL: bottom-right) */}
          {durationLabel && (
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                insetInlineStart: '8px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                color: '#ffffff',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontVariantNumeric: 'tabular-nums',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {durationLabel}
            </span>
          )}

          {/* Part tag — bottom-end */}
          {partTag && (
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                insetInlineEnd: '8px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                color: '#ffffff',
                fontFamily: "'Tajawal', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {partTag}
            </span>
          )}

          {/* Watch-progress bar at bottom of thumbnail (partial only) */}
          {watchState === 'partial' && watchedFraction > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '3px',
                background: 'rgba(255,255,255,0.16)',
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  height: '100%',
                  width: `${watchedFraction * 100}%`,
                  background: '#fb923c', // amber — Vimeo/YouTube convention
                }}
              />
            </div>
          )}
        </div>

        {/* Body row */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Title row — activity label + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
            <WatchStatusBadge watchState={watchState} resumeLabel={resumeLabel} g={g} />
          </div>

          {/* Short description / recording title */}
          {(recordingData?.title || short) && (
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: 'var(--ds-text-tertiary)',
                lineHeight: 1.4,
              }}
            >
              {recordingData?.title || short}
            </p>
          )}
        </div>
      </motion.button>
    </div>
  )
}

function WatchStatusBadge({ watchState, resumeLabel, g }) {
  if (watchState === 'watched') {
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
        شوهدت
      </span>
    )
  }
  if (watchState === 'partial') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: '11px',
          fontWeight: 600,
          color: '#fbbf24',
          background: 'rgba(251,191,36,0.10)',
          border: '1px solid rgba(251,191,36,0.30)',
          borderRadius: '999px',
          padding: '3px 8px',
        }}
      >
        <Clock size={11} strokeWidth={2.4} />
        {resumeLabel ? `${g('تابع من', 'تابعي من')} ${resumeLabel}` : g('تابع', 'تابعي')}
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
      <Video size={11} strokeWidth={2.4} />
      لم تُشاهد
    </span>
  )
}
