import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { V3_MOTION, V3_TYPOGRAPHY, resolvePalette } from '../_v3Tokens'
import { ACTIVITY_VARIANT } from '../_v3Mappings'
import MovementHeroNumeral from './MovementHeroNumeral'
import MovementProgressOrb from './MovementProgressOrb'
import ActivityStation from './ActivityStation'
import RecordingStation from './RecordingStation'
import { useRecordingDataEnrichment } from '../hooks/useRecordingDataEnrichment'

// Full-width cinematic panel containing one movement + its activity stations.
// V3.1: activities whose ACTIVITY_VARIANT === 'media' (currently only
// 'recording') are rendered via RecordingStation with enrichment data from
// the class_recordings + recording_progress tables.
export default function MovementPanel({
  movement,
  activities,
  recommendedNextKey,
  onActivitySelect,
  unitId,                    // V3.1: passed by UnitContentV3 for enrichment
  studentId,                 // V3.1: passed by UnitContentV3 for enrichment
  theme = 'dark',
  index = 0,
}) {
  const reduce = useReducedMotion()
  const palette = useMemo(() => resolvePalette(movement, theme), [movement, theme])

  // Only enrich if this movement actually contains a media activity
  const hasMedia = useMemo(() => activities.some(a => ACTIVITY_VARIANT[a.key] === 'media'), [activities])
  const recordingEnrichment = useRecordingDataEnrichment(hasMedia ? unitId : null, hasMedia ? studentId : null)

  const total = activities.length
  const completed = activities.filter(a => a.status === 'completed').length
  const fillRatio = total > 0 ? completed / total : 0

  const entry = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { ...V3_MOTION.panelFadeIn, delay: index * V3_MOTION.staggerDelay },
      }

  return (
    <motion.section
      {...entry}
      className="v3-movement-panel"
      aria-labelledby={`v3-movement-title-${movement.id}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        padding: '28px 24px 24px',
        background: `linear-gradient(135deg, ${palette.gradientFrom}, ${palette.gradientTo}), var(--ds-bg-elevated)`,
        border: `1px solid ${palette.accentSoft}`,
        boxShadow: `0 1px 0 var(--ds-border-subtle) inset, 0 12px 36px -16px ${palette.glow}`,
      }}
    >
      <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />

      <header
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <span
            style={{
              fontFamily: V3_TYPOGRAPHY.romanFont,
              fontSize: '11.5px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: palette.accent,
              fontWeight: 600,
            }}
          >
            {movement.titleEn}
          </span>
          <h2
            id={`v3-movement-title-${movement.id}`}
            style={{
              margin: 0,
              fontFamily: V3_TYPOGRAPHY.arabicHeadingFont,
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--ds-text-primary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {movement.titleAr}
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: V3_TYPOGRAPHY.arabicBodyFont,
              fontSize: '13px',
              color: 'var(--ds-text-secondary)',
              lineHeight: 1.45,
            }}
          >
            {movement.subtitleAr}
          </p>
        </div>
        <MovementProgressOrb
          fillRatio={fillRatio}
          accent={palette.accent}
          completed={completed}
          total={total}
        />
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        {activities.map((activity, i) => {
          const variant = ACTIVITY_VARIANT[activity.key]
          const isRecommended = activity.key === recommendedNextKey
          return (
            <motion.div
              key={activity.key}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? V3_MOTION.reducedMotionFallback : { ...V3_MOTION.panelFadeIn, delay: 0.15 + i * 0.05 }}
              data-activity-key={activity.key}
              style={variant === 'media' ? { gridColumn: '1 / -1' } : undefined}
            >
              {variant === 'media' ? (
                <RecordingStation
                  activity={activity}
                  movement={movement}
                  recordingData={recordingEnrichment.primary}
                  isRecommendedNext={isRecommended}
                  onSelect={onActivitySelect}
                  theme={theme}
                />
              ) : (
                <ActivityStation
                  activity={activity}
                  movement={movement}
                  isRecommendedNext={isRecommended}
                  onSelect={onActivitySelect}
                  theme={theme}
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
