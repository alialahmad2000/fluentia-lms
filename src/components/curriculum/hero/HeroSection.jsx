import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useUnitVocabStatus } from '../../../hooks/useUnitVocabStatus'
import ProgressOrb from './ProgressOrb'
import SmartStatusPill from './SmartStatusPill'
import ContinueArc from './ContinueArc'

/**
 * HeroSection — sticky premium hero for the VocabularyTab (Prompt 05).
 *
 * Layout:
 *   Desktop (≥768px): orb on the right (RTL), pill + arc stacked on the left.
 *   Mobile  (<768px): orb on top, pill + arc stacked below, all centered.
 *
 * Sticky behavior:
 *   - position: sticky, top offset accounting for app header.
 *   - When stuck, gains a stronger glass background (detected via IntersectionObserver).
 *   - When idle (not stuck), shows a subtle gradient.
 *
 * Strictly additive — does NOT touch the existing VocabularyTab content below.
 */
export default function HeroSection({
  unitId,
  studentId,
  onOpenWord,
  onScrollToLibrary,
}) {
  const sentinelRef = useRef(null)
  const [isStuck, setIsStuck] = useState(false)
  const reduceMotion = useReducedMotion()

  // IntersectionObserver: sentinel sits at the very top of the section.
  // When the sentinel scrolls out of view, the hero is "stuck" below the header.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const status = useUnitVocabStatus(unitId, studentId)
  const isLoading = status.isLoading

  return (
    <>
      {/* Sticky-detection sentinel — invisible 1px element above the hero */}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
        aria-labelledby="vocab-hero-heading"
        className="vocab-hero relative rounded-2xl overflow-hidden premium-glass"
        style={{
          position: 'sticky',
          top: 'var(--app-header-height, 64px)',
          zIndex: 30,
          padding: 'clamp(16px, 4vw, 28px)',
          marginBottom: 24,
          background: isStuck
            ? 'rgba(10, 18, 37, 0.72)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))',
          backdropFilter: isStuck ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isStuck ? 'blur(20px) saturate(180%)' : 'none',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'background 220ms ease, backdrop-filter 220ms ease',
        }}
        dir="rtl"
      >
        {/* Decorative glow — only when not stuck */}
        {!isStuck && (
          <div
            aria-hidden="true"
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              right: '-80px',
              width: 360,
              height: 360,
              background:
                'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 65%)',
            }}
          />
        )}

        {isLoading ? (
          <HeroSkeleton />
        ) : (
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Orb (desktop = right, mobile = top) */}
            <div className="flex items-center justify-center order-1 md:order-2 shrink-0">
              <ProgressOrb
                percent={status.masteryPct}
                masteredCount={status.masteredWords}
                totalCount={status.totalWords}
              />
            </div>

            {/* Pill + Arc stack (desktop = left, mobile = below orb) */}
            <div className="flex flex-col items-center md:items-start gap-3 md:gap-4 order-2 md:order-1 md:flex-1">
              {/* Unit vocab heading — small, taquellable */}
              <div className="text-center md:text-start">
                <h2
                  id="vocab-hero-heading"
                  className="font-['Tajawal'] font-bold"
                  style={{
                    color: 'var(--text-primary, #faf5e6)',
                    fontSize: 18,
                    lineHeight: 1.2,
                  }}
                >
                  مفردات الوحدة
                </h2>
                {status.totalWords > 0 && (
                  <p
                    className="mt-0.5 font-['Tajawal']"
                    style={{
                      color: 'var(--text-tertiary, rgba(255,255,255,0.55))',
                      fontSize: 12,
                    }}
                  >
                    {status.totalWords} كلمة في الوحدة
                  </p>
                )}
              </div>

              <SmartStatusPill
                dueForReviewToday={status.dueForReviewToday}
                newCardsAvailableToday={status.newCardsAvailableToday}
              />

              <ContinueArc
                action={status.continueAction}
                onOpenWord={onOpenWord}
                onScrollToLibrary={onScrollToLibrary}
              />
            </div>
          </div>
        )}
      </motion.section>
    </>
  )
}

function HeroSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-6">
      <div
        className="rounded-full mx-auto md:order-2 animate-pulse"
        style={{
          width: 'clamp(140px, 22vw, 200px)',
          height: 'clamp(140px, 22vw, 200px)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />
      <div className="flex-1 flex flex-col items-center md:items-start gap-3 md:order-1">
        <div
          className="rounded animate-pulse"
          style={{
            width: 160,
            height: 22,
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          className="rounded-full animate-pulse"
          style={{
            width: 200,
            height: 32,
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          className="rounded-2xl animate-pulse"
          style={{
            width: '100%',
            maxWidth: 320,
            height: 56,
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </div>
    </div>
  )
}
