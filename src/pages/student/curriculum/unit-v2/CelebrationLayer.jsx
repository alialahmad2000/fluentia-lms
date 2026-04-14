import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeCelebrate } from '../../../../lib/celebrations'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'

/* ═══════════════════════════════════════════════
   Toast ID counter
   ═══════════════════════════════════════════════ */
let _id = 0
const nextId = () => ++_id

/* ═══════════════════════════════════════════════
   CelebrationLayer
   Listens for window 'fluentia:celebration' events.
   Event detail: { type, activity, xp, score, newRank }
   ═══════════════════════════════════════════════ */
export default function CelebrationLayer() {
  const { reduced } = useCinematicMotion()
  const [xpToasts, setXpToasts] = useState([])   // [{ id, xp }]
  const [rankToasts, setRankToasts] = useState([]) // [{ id, message }]

  const removeXp = useCallback((id) => {
    setXpToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const removeRank = useCallback((id) => {
    setRankToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    function handleCelebration(e) {
      const { type, xp = 0, newRank } = e.detail || {}

      if (type === 'activity_complete') {
        safeCelebrate('assignment_submitted')

        if (xp > 0) {
          const id = nextId()
          setXpToasts((prev) => [...prev, { id, xp }])
          setTimeout(() => removeXp(id), 2200)
        }

        if (newRank) {
          const id = nextId()
          setRankToasts((prev) => [...prev, { id, message: `صعدت للمرتبة #${newRank}!` }])
          setTimeout(() => removeRank(id), 3200)
        }
      } else if (type === 'unit_milestone') {
        safeCelebrate('unit_complete')
      } else if (type === 'rank_up') {
        if (newRank) {
          const id = nextId()
          setRankToasts((prev) => [...prev, { id, message: `صعدت للمرتبة #${newRank}!` }])
          setTimeout(() => removeRank(id), 3200)
        }
      }
    }

    window.addEventListener('fluentia:celebration', handleCelebration)
    return () => window.removeEventListener('fluentia:celebration', handleCelebration)
  }, [removeXp, removeRank])

  return (
    <>
      {/* ── XP Toasts — fixed top-right (top-left in RTL display) ── */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9500,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {xpToasts.map((toast) => (
            <XpToast key={toast.id} xp={toast.xp} reduced={reduced} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Rank Toasts — fixed top-center ── */}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          top: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9500,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {rankToasts.map((toast) => (
            <RankToast key={toast.id} message={toast.message} reduced={reduced} />
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   XpToast — floats upward and fades out
   ═══════════════════════════════════════════════ */
function XpToast({ xp, reduced }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 0, scale: 0.85 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: -40, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -80, scale: 0.9 }}
      transition={reduced
        ? { duration: 0.15 }
        : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 20px',
        background: 'rgba(10, 8, 0, 0.75)',
        border: `1px solid ${V1.accentGoldStrong}`,
        borderRadius: '14px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 20px rgba(245,200,66,0.3), 0 4px 16px rgba(0,0,0,0.5)`,
        direction: 'rtl',
        whiteSpace: 'nowrap',
      }}
      aria-label={`حصلت على ${xp} نقطة خبرة`}
    >
      <span style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: '32px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #f5c842 0%, #fde68a 50%, #f59e0b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}>
        +{xp}
      </span>
      <span style={{
        fontFamily: 'Tajawal, sans-serif',
        fontSize: '15px',
        fontWeight: 700,
        color: V1.accentGold,
        letterSpacing: '0.02em',
      }}>
        XP
      </span>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   RankToast — slides in from top
   ═══════════════════════════════════════════════ */
function RankToast({ message, reduced }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
      transition={reduced
        ? { duration: 0.15 }
        : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
      }
      style={{
        padding: '12px 28px',
        background: 'rgba(10, 8, 0, 0.8)',
        border: `1px solid ${V1.accentGoldStrong}`,
        borderRadius: '16px',
        backdropFilter: 'blur(14px)',
        boxShadow: `0 0 24px rgba(245,200,66,0.25), 0 6px 20px rgba(0,0,0,0.5)`,
        direction: 'rtl',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{
        fontFamily: 'Tajawal, sans-serif',
        fontSize: '17px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #f5c842 0%, #fde68a 60%, #f59e0b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {message}
      </span>
    </motion.div>
  )
}
