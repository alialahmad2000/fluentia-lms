import React, { useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import UnitCompass from './components/UnitCompass'
import MovementPanel from './components/MovementPanel'
import ExamGatePanel from './components/ExamGatePanel'
import EmptyMovementGuard from './components/EmptyMovementGuard'
import RecommendedPath from './components/RecommendedPath'
import { useMovementGrouping } from './hooks/useMovementGrouping'
import { useRecommendedNextActivity } from './hooks/useRecommendedNextActivity'
import { useCompassData } from './hooks/useCompassData'
import { useExamGate } from './hooks/useExamGate'
import { V3_MOTION } from './_v3Tokens'
import './styles/unitMovementsV3.css'

// Movements layout — pure presentational shell.
// The wrapping component (Phase D's UnitContentRouter / V3Wrapper) owns data
// fetching, Brief, Debrief, particles, FAB, etc., and passes props in here.
//
// Props:
//   unitData         — { id, theme_ar, theme_en, unit_number, level: { level_number, name_ar } }
//   activities       — flat activity array from useUnitData().activities
//   onActivitySelect — (activityKey | null) => void  (null means "go back to grid")
//   onTrophyClick    — () => void  (opens the V2 TrophyModal)
//   activeActivity   — null or the currently-selected activityKey
//   ActivityContent  — element to render when activeActivity != null. The
//                      wrapper passes the same ContextRibbon-wrapped TabComponent
//                      that V2 mounts, so V3 never imports activity tabs itself.
//   theme            — 'dark' | 'light'
//   levelLabelAr     — convenience label for the subtitle row
export default function UnitContentV3({
  unitData,
  activities,
  studentId,                    // V3.1: needed by useExamGate
  onActivitySelect,
  onTrophyClick,
  activeActivity,
  ActivityContent,
  theme = 'dark',
  levelLabelAr,
  extraTopSlot = null,
  extraBottomSlot = null,
}) {
  // ─── Hooks at top, unconditional ───
  const reduce = useReducedMotion()
  const groupedMovements = useMovementGrouping(activities)
  const compassData = useCompassData(groupedMovements)
  const examGate = useExamGate(unitData?.id, studentId)
  const recommendedNextKey = useRecommendedNextActivity(groupedMovements, examGate)

  const handleSectorClick = useCallback((movementId) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(`v3-movement-${movementId}`)
    if (el) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }, [reduce])

  // ─── Conditional rendering AFTER hooks ───
  if (!unitData) return null

  // An activity is active — render the ActivityContent the wrapper passed.
  if (activeActivity) {
    return (
      <div className="unit-v3-active-activity" dir="rtl">
        <button
          type="button"
          onClick={() => onActivitySelect && onActivitySelect(null)}
          className="unit-v3-back-button"
          aria-label="العودة إلى مراحل الوحدة"
        >
          <ArrowRight size={14} />
          العودة إلى الوحدة
        </button>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeActivity}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={reduce ? V3_MOTION.reducedMotionFallback : V3_MOTION.panelFadeIn}
            style={{ marginTop: '14px' }}
          >
            {ActivityContent}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // No active activity — render the Movements layout
  const unitTitle = unitData.theme_ar || unitData.theme_en || 'الوحدة'
  const unitNumber = unitData.unit_number ?? ''
  const levelNumber = unitData.level?.level_number ?? unitData.level_number ?? ''

  return (
    <div className="unit-v3-shell" dir="rtl">
      <header className="unit-v3-header">
        <h1 className="unit-v3-title">
          الوحدة {unitNumber}: {unitTitle}
        </h1>
        <p className="unit-v3-subtitle">
          المستوى {levelNumber}
          {levelLabelAr ? ` — ${levelLabelAr}` : ''}
          {unitData.level?.name_ar ? ` · ${unitData.level.name_ar}` : ''}
        </p>
      </header>

      {extraTopSlot}

      <div className="unit-v3-compass-row">
        <UnitCompass
          compassData={compassData}
          examGate={examGate}
          onTrophyClick={onTrophyClick}
          onSectorClick={handleSectorClick}
          theme={theme}
        />
        <div className="unit-v3-compass-overall-label">
          {compassData.totalAll > 0
            ? `${compassData.completedAll}/${compassData.totalAll} أنشطة`
            : 'لا أنشطة في هذه الوحدة بعد'}
        </div>
      </div>

      <div className="unit-v3-movements">
        <RecommendedPath
          groupedMovements={groupedMovements}
          recommendedNextKey={recommendedNextKey}
          theme={theme}
        />
        {groupedMovements.map((group, index) => (
          <div key={group.movement.id} id={`v3-movement-${group.movement.id}`}>
            {group.movement.isExamGate ? (
              <ExamGatePanel
                movement={group.movement}
                examGate={examGate}
                theme={theme}
                index={index}
              />
            ) : (
              <EmptyMovementGuard activities={group.activities}>
                <MovementPanel
                  movement={group.movement}
                  activities={group.activities}
                  recommendedNextKey={recommendedNextKey}
                  onActivitySelect={onActivitySelect}
                  theme={theme}
                  index={index}
                />
              </EmptyMovementGuard>
            )}
          </div>
        ))}
      </div>

      {extraBottomSlot}
    </div>
  )
}
