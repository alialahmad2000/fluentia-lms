import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Rocket } from 'lucide-react'

const STEPS = [
  {
    selector: '[data-tour="hero"]',
    title: 'هذا تقدّمك في الوحدة',
    body:
      'الدائرة تحت تشيك تقدّمك. اللي يلي تحته يخبرك وش تسوي اليوم. اضغط "ابدأ المراجعة" لما تكون جاهز.',
  },
  {
    selector: '[data-tour="journey"]',
    title: 'رحلة المفردات',
    body:
      'كلمات الوحدة مقسّمة على مجموعات صغيرة. ابدأ بالأولى، وكل ما تكمّل ٨٠٪ من مجموعة، اللي بعدها تفتح. تقدر تغيّر حجم المجموعة من الأعلى.',
  },
  {
    selector: '[data-tour="library"]',
    title: 'مكتبة الكلمات',
    body:
      'كل كلمات الوحدة هنا. اضغط أي كلمة لتشوف التفاصيل الكاملة — التعريف، المرادفات، عائلة الكلمة، وأكثر. استخدم الفلاتر فوق علشان تشوف الجديدة، اللي تتعلمها، أو الصعبة.',
  },
]

const SPOTLIGHT_PAD = 12 // px around the highlighted element

/**
 * 3-step spotlight onboarding tour for the unit vocabulary tab.
 *
 * Triggered when profile.vocab_onboarding_completed_at IS NULL.
 * Calls onComplete() on completion or skip — the parent persists.
 *
 * Props:
 *   onComplete: () => void
 */
export default function VocabOnboardingTour({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const overlayRef = useRef(null)
  const reduceMotion = useReducedMotion()

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  // Measure the current step's spotlight target
  const measure = useCallback(() => {
    if (!step) return
    const node = document.querySelector(step.selector)
    if (!node) {
      // Target not yet in the DOM (shouldn't happen given mount timing,
      // but be defensive — skip to next step or finish)
      setRect(null)
      return
    }
    const r = node.getBoundingClientRect()
    setRect({
      top: r.top - SPOTLIGHT_PAD,
      left: r.left - SPOTLIGHT_PAD,
      width: r.width + SPOTLIGHT_PAD * 2,
      height: r.height + SPOTLIGHT_PAD * 2,
    })
    // Scroll the target into view (centered) on first show
    try {
      node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    } catch {}
  }, [step, reduceMotion])

  useEffect(() => {
    measure()
    const handler = () => measure()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, { passive: true })
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [measure])

  // ESC dismisses (counts as skip)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onComplete?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onComplete])

  // Tooltip position: place near the spotlight; pick the side with more room
  const tooltipPos = computeTooltipPosition(rect)

  // Re-measure on the very first render after layout settles
  useEffect(() => {
    const id = setTimeout(measure, 80)
    return () => clearTimeout(id)
  }, [measure])

  const finish = () => onComplete?.()

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="fixed inset-0 z-[60]"
        style={{ pointerEvents: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vocab-tour-title"
      >
        {/* Spotlight cutout via box-shadow trick */}
        {rect ? (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 18,
              boxShadow: '0 0 0 9999px rgba(2,6,15,0.72)',
              transition: reduceMotion ? 'none' : 'all 280ms cubic-bezier(0.4,0,0.2,1)',
              pointerEvents: 'none',
            }}
          />
        ) : (
          // Fallback full-screen dim when no target found
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2,6,15,0.72)',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          dir="rtl"
          className="fixed font-['Tajawal']"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: tooltipPos.width,
            maxWidth: 380,
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))',
            color: 'var(--text-primary, #faf5e6)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16,
            padding: 16,
            boxShadow:
              '0 20px 50px rgba(0,0,0,0.50), 0 0 0 1px rgba(168,85,247,0.18) inset',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9999,
                  background:
                    'linear-gradient(135deg, rgba(56,189,248,0.20), rgba(168,85,247,0.20))',
                  color: 'rgb(168,85,247)',
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                {stepIndex + 1}
              </span>
              <h3
                id="vocab-tour-title"
                style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}
              >
                {step.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={finish}
              aria-label="تخطّي الجولة التعريفية"
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-tertiary)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <X size={13} />
            </button>
          </div>

          <p
            style={{
              color: 'var(--text-secondary, rgba(255,255,255,0.75))',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {step.body}
          </p>

          {/* Step dots + buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === stepIndex ? 18 : 6,
                    height: 6,
                    borderRadius: 9999,
                    background:
                      i === stepIndex
                        ? 'linear-gradient(90deg, rgb(56,189,248), rgb(168,85,247))'
                        : 'rgba(255,255,255,0.20)',
                    transition: reduceMotion ? 'none' : 'all 240ms ease',
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1 font-bold"
                  style={{
                    background: 'var(--surface, rgba(255,255,255,0.04))',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                    padding: '6px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                  }}
                >
                  <ChevronRight size={13} />
                  السابق
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? finish : () => setStepIndex((i) => i + 1)}
                className="inline-flex items-center gap-1 font-bold"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  color: '#0a1225',
                  padding: '7px 14px',
                  borderRadius: 9999,
                  fontSize: 13,
                  boxShadow: '0 8px 18px rgba(217,119,6,0.30)',
                }}
              >
                {isLast ? (
                  <>
                    <Rocket size={13} />
                    ابدأ التعلّم!
                  </>
                ) : (
                  <>
                    التالي
                    <ChevronLeft size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Choose tooltip placement based on available viewport space around the
 * spotlight. Returns { top, left, width }. RTL-safe.
 */
function computeTooltipPosition(rect) {
  const TOOLTIP_W = Math.min(380, (typeof window !== 'undefined' ? window.innerWidth : 380) - 24)
  const GAP = 16
  const vw = typeof window !== 'undefined' ? window.innerWidth : 380
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  // If no rect, center the tooltip
  if (!rect) {
    return {
      top: Math.max(40, (vh - 220) / 2),
      left: (vw - TOOLTIP_W) / 2,
      width: TOOLTIP_W,
    }
  }

  // Try below first
  const spaceBelow = vh - (rect.top + rect.height)
  const spaceAbove = rect.top

  let top
  if (spaceBelow > 220 || spaceBelow >= spaceAbove) {
    top = rect.top + rect.height + GAP
  } else {
    top = Math.max(GAP, rect.top - 220 - GAP)
  }

  // Clamp tooltip left to viewport so it doesn't overflow horizontally
  let left = rect.left + rect.width / 2 - TOOLTIP_W / 2
  if (left < 12) left = 12
  if (left + TOOLTIP_W > vw - 12) left = vw - TOOLTIP_W - 12

  return { top, left, width: TOOLTIP_W }
}
