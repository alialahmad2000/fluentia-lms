import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUnitBriefData } from './hooks/useUnitBriefData'
import { useAuthStore } from '../../../../stores/authStore'
import BriefHero from './components/brief/BriefHero'
import BriefPromise from './components/brief/BriefPromise'
import BriefGainsGrid from './components/brief/BriefGainsGrid'
import BriefWhyMatters from './components/brief/BriefWhyMatters'
import BriefJourneyMap from './components/brief/BriefJourneyMap'
import BriefNextPreview from './components/brief/BriefNextPreview'
import BriefActions from './components/brief/BriefActions'

export default function UnitBrief({ unitId, onStart, onSkip, mode = 'first-visit' }) {
  // ALL hooks first — before any guard
  const { data, isLoading, error } = useUnitBriefData(unitId)
  const profile = useAuthStore(s => s.profile)
  const isImpersonating = useAuthStore(s => s.isImpersonating)
  const containerRef = useRef(null)
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Mark as seen (first-visit only)
  useEffect(() => {
    if (mode === 'first-visit' && unitId && profile?.id) {
      localStorage.setItem(`fluentia.unitBrief.seen.${profile.id}.${unitId}`, new Date().toISOString())
    }
  }, [mode, unitId, profile?.id])

  // Impersonation: auto-skip
  useEffect(() => {
    if (isImpersonating && onSkip) onSkip()
  }, [isImpersonating, onSkip])

  // Scroll to top on open
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [unitId])

  // ESC to skip
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && onSkip) onSkip() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSkip])

  // Guards (AFTER all hooks)
  if (isImpersonating) return null
  if (isLoading) return <BriefSkeleton />
  if (error || !data) return null

  const { unit, level, levelUnits, visitedUnitIds, stats, nextUnit } = data
  const hasContent = !!(unit.why_matters && unit.outcomes?.length > 0)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflowY: 'auto',
        background: 'var(--ds-bg-base, #060e1c)',
        color: 'var(--ds-text-primary, #f8fafc)',
        fontFamily: "'Tajawal', sans-serif",
      }}
      dir="rtl"
    >
      {/* Ambient backdrop */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(233, 185, 73, 0.06), transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(233,185,73,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* Content */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: 'clamp(20px, 5vw, 56px) clamp(16px, 4vw, 32px) 48px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(20px, 4vw, 36px)',
        }}
      >
        <Fade delay={0} reduced={prefersReducedMotion}>
          <BriefHero unit={unit} level={level} prefersReducedMotion={prefersReducedMotion} />
        </Fade>

        <Fade delay={0.15} reduced={prefersReducedMotion}>
          <BriefGainsGrid stats={stats} unit={unit} prefersReducedMotion={prefersReducedMotion} />
        </Fade>

        {hasContent && (
          <Fade delay={0.25} reduced={prefersReducedMotion}>
            <BriefPromise outcomes={unit.outcomes} />
          </Fade>
        )}

        {unit.why_matters && (
          <Fade delay={0.35} reduced={prefersReducedMotion}>
            <BriefWhyMatters text={unit.why_matters} />
          </Fade>
        )}

        <Fade delay={0.45} reduced={prefersReducedMotion}>
          <BriefJourneyMap
            units={levelUnits}
            currentUnitId={unitId}
            visitedUnitIds={visitedUnitIds}
            level={level}
          />
        </Fade>

        {nextUnit && (
          <Fade delay={0.55} reduced={prefersReducedMotion}>
            <BriefNextPreview nextUnit={nextUnit} />
          </Fade>
        )}

        <Fade delay={0.65} reduced={prefersReducedMotion}>
          <BriefActions onStart={onStart} onSkip={onSkip} mode={mode} />
        </Fade>
      </motion.div>
    </div>
  )
}

function Fade({ children, delay, reduced }) {
  if (reduced) return children
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}

function BriefSkeleton() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--ds-bg-base, #060e1c)',
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{ color: 'var(--ds-text-tertiary)', fontFamily: "'Tajawal', sans-serif", fontSize: '16px' }}>
        جاري تجهيز إيجاز الوحدة...
      </div>
    </div>
  )
}
