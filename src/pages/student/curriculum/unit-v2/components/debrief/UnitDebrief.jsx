import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUnitDebriefData } from '../../hooks/useUnitDebriefData'
import DebriefIndicator from './DebriefIndicator'
import DebriefCelebration from './DebriefCelebration'
import DebriefStats from './DebriefStats'
import DebriefRadar from './DebriefRadar'
import DebriefOutcomes from './DebriefOutcomes'
import DebriefNext from './DebriefNext'

const STAGES = ['celebration', 'stats', 'radar', 'outcomes', 'next']
const AUTO_ADVANCE_MS = 3000

export default function UnitDebrief({ unitId, onClose }) {
  const [stage, setStage] = useState(0)
  const { data, isLoading } = useUnitDebriefData(unitId)

  const advance = useCallback(() => {
    setStage(s => Math.min(s + 1, STAGES.length - 1))
  }, [])

  // Auto-advance first stage
  useEffect(() => {
    if (stage !== 0) return
    const t = setTimeout(advance, AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [stage, advance])

  // ESC to close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (isLoading || !data) return null

  const stageProps = { data, onClose }

  const StageComponent = {
    celebration: DebriefCelebration,
    stats: DebriefStats,
    radar: DebriefRadar,
    outcomes: DebriefOutcomes,
    next: DebriefNext,
  }[STAGES[stage]]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(30,10,60,0.98) 0%, rgba(2,6,23,0.99) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <DebriefIndicator
        total={STAGES.length}
        current={stage}
        onJump={setStage}
      />

      {/* Scrollable stage content */}
      <div style={{
        width: '100%', maxWidth: '520px', maxHeight: '85vh',
        overflowY: 'auto', padding: '64px 24px 32px',
        scrollbarWidth: 'none',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <StageComponent {...stageProps} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      {stage < STAGES.length - 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={advance}
          style={{
            position: 'absolute', bottom: '32px',
            padding: '12px 32px', borderRadius: '100px',
            border: '1px solid rgba(251,191,36,0.3)',
            background: 'rgba(251,191,36,0.08)',
            color: 'rgba(251,191,36,0.9)', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}
        >
          التالي ←
        </motion.button>
      )}
    </div>
  )
}
