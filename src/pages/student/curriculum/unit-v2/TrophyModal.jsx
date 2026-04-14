import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Flame, Zap, BookOpen, Award, Star } from 'lucide-react'
import { CINEMATIC_TOKENS as V1, useCinematicMotion, AnimatedCounter } from '../_premiumPrimitives'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function GoldDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${V1.accentGoldStrong})` }} />
      <span style={{ color: V1.accentGold, fontSize: 12 }}>◆</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${V1.accentGoldStrong}, transparent)` }} />
    </div>
  )
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: V1.bgElevated,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
        style={{
          height: '100%',
          borderRadius: 2,
          background: V1.goldGradient,
        }}
      />
    </div>
  )
}

const STAT_DEFS = [
  { key: 'completion', label: 'الإكمال',   icon: Award,    max: 40 },
  { key: 'quality',    label: 'الجودة',    icon: Star,     max: 30 },
  { key: 'vocabulary', label: 'المفردات',  icon: BookOpen, max: 15 },
  { key: 'speed',      label: 'السرعة',    icon: Zap,      max: 10 },
  { key: 'effort',     label: 'الجهد',     icon: Flame,    max: 5  },
]

function getMotivation(gap) {
  if (gap <= 0)  return 'أنت النجم/ة! 👑'
  if (gap < 20)  return 'أنت قريب جداً! نشاط واحد بتفوّق.'
  if (gap <= 50) return 'أنت على الطريق — أكمل نشاطاً واحداً وشوف الفرق.'
  return 'كل نجم كان مبتدئاً. ابدأ اليوم.'
}

/* ─────────────────────────────────────────────
   TrophyModal
   Props: { data, currentStudentId, onClose }
   data = { star, rankings }
───────────────────────────────────────────── */
export default function TrophyModal({ data, currentStudentId, onClose }) {
  const { reduced } = useCinematicMotion()
  const containerRef = useRef(null)

  /* ESC to close */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  /* Simple focus trap */
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab') return
    const el = containerRef.current
    if (!el) return
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable.length) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus() }
    }
  }, [])

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const star      = data?.star     ?? null
  const rankings  = data?.rankings ?? []

  /* Current student position in rankings */
  const myEntry   = rankings.find(r => r.studentId === currentStudentId) ?? null
  const myRank    = myEntry ? rankings.indexOf(myEntry) + 1 : null
  const myScore   = myEntry?.totalScore ?? 0
  const starScore = star?.totalScore ?? 0
  const gap       = starScore - myScore
  const isTheStar = currentStudentId === star?.studentId

  /* ── Animations ─────────────────────────── */
  const backdropVariants = reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } }, exit: { opacity: 0, transition: { duration: 0.25 } } }

  const contentVariants = reduced
    ? { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 1, scale: 1 } }
    : {
        hidden:  { opacity: 0, scale: 0.95, y: 16 },
        visible: { opacity: 1, scale: 1,    y: 0,   transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 } },
        exit:    { opacity: 0, scale: 0.97, y: 8,   transition: { duration: 0.2 } },
      }

  const heroVariants = reduced
    ? { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 } }
    : {
        hidden:  { opacity: 0, scale: 0 },
        visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 18, delay: 0.2 } },
      }

  const statItemVariants = reduced
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden:  { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0,  transition: { duration: 0.4, ease: 'easeOut' } },
      }

  const statContainerVariants = reduced
    ? {}
    : { visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }

  /* ── Styles ─────────────────────────────── */
  const S = {
    backdrop: {
      position: 'fixed',
      inset: 0,
      zIndex: 8000,
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    },
    container: {
      position: 'relative',
      width: '100%',
      maxWidth: 960,
      maxHeight: '90vh',
      overflowY: 'auto',
      background: V1.bgLayer,
      border: `1px solid ${V1.border}`,
      borderRadius: 20,
      padding: 32,
      fontFamily: "'Tajawal', sans-serif",
      direction: 'rtl',
      scrollbarWidth: 'thin',
    },
    closeBtn: {
      position: 'absolute',
      top: 16,
      left: 16,
      width: 36,
      height: 36,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: V1.bgElevated,
      border: `1px solid ${V1.border}`,
      color: V1.textDim,
      cursor: 'pointer',
      outline: 'none',
      transition: 'color 0.2s, border-color 0.2s',
      zIndex: 1,
    },
    trophyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: V1.goldGradient,
      boxShadow: V1.glowGold,
      margin: '0 auto 16px',
    },
    heroLabel: {
      fontFamily: "'Playfair Display', 'Amiri', serif",
      fontSize: 24,
      fontWeight: 700,
      color: V1.accentGold,
      textAlign: 'center',
      margin: 0,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: '50%',
      border: `3px solid ${V1.accentGold}`,
      boxShadow: V1.glowGold,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: V1.bgElevated,
      flexShrink: 0,
    },
    starName: {
      fontFamily: "'Playfair Display', 'Amiri', serif",
      fontSize: 32,
      fontWeight: 700,
      color: V1.textPrimary,
      margin: '0 0 4px',
      lineHeight: 1.2,
    },
    starScore: {
      fontSize: 18,
      color: V1.accentGold,
      margin: 0,
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
      marginTop: 24,
    },
    statCell: {
      background: V1.bgElevated,
      border: `1px solid ${V1.border}`,
      borderRadius: 12,
      padding: '14px 16px',
    },
    statIcon: {
      color: V1.accentGold,
      marginBottom: 6,
    },
    statLabel: {
      fontSize: 12,
      color: V1.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 700,
      color: V1.textPrimary,
      lineHeight: 1,
    },
    statMax: {
      fontSize: 12,
      color: V1.textDim,
    },
    bonusChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 20,
      background: V1.accentGoldSoft,
      border: `1px solid ${V1.accentGoldStrong}`,
      color: V1.accentGold,
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    },
    myPositionCard: {
      background: V1.bgElevated,
      border: `1px solid ${V1.accentGoldStrong}`,
      borderRadius: 14,
      padding: '18px 20px',
      textAlign: 'center',
    },
    ctaRow: {
      display: 'flex',
      gap: 12,
      marginTop: 28,
      flexWrap: 'wrap',
    },
    primaryBtn: {
      flex: 1,
      minWidth: 140,
      padding: '14px 24px',
      borderRadius: 12,
      background: V1.goldGradient,
      border: 'none',
      color: '#0a0a0f',
      fontSize: 16,
      fontWeight: 700,
      fontFamily: "'Tajawal', sans-serif",
      cursor: 'pointer',
      boxShadow: V1.glowGold,
      transition: 'opacity 0.2s',
    },
    ghostBtn: {
      flex: '0 0 auto',
      padding: '14px 24px',
      borderRadius: 12,
      background: 'transparent',
      border: `1px solid ${V1.border}`,
      color: V1.textSecondary,
      fontSize: 16,
      fontWeight: 600,
      fontFamily: "'Tajawal', sans-serif",
      cursor: 'pointer',
      transition: 'border-color 0.2s, color 0.2s',
    },
    footer: {
      textAlign: 'center',
      fontSize: 13,
      color: V1.textFaint,
      marginTop: 20,
      fontStyle: 'italic',
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 0',
    },
  }

  /* ── Empty state ──────────────────────────── */
  const isEmpty = !star

  return (
    <AnimatePresence>
      <motion.div
        key="trophy-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={S.backdrop}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        role="presentation"
      >
        <motion.div
          key="trophy-content"
          ref={containerRef}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={S.container}
          role="dialog"
          aria-modal="true"
          aria-label="نجم الوحدة والترتيب"
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={S.closeBtn}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = V1.textDim; e.currentTarget.style.borderColor = V1.border }}
          >
            <X size={18} />
          </button>

          {/* ── Empty state ─────────────────── */}
          {isEmpty && (
            <div style={S.emptyState}>
              <div style={{ ...S.trophyIconWrap, background: V1.bgElevated, boxShadow: 'none', border: `1px solid ${V1.border}` }}>
                <Star size={36} style={{ color: V1.textDim }} />
              </div>
              <h2 style={{ ...S.heroLabel, color: V1.textSecondary, marginBottom: 12 }}>
                لم يتم تحديد نجم/ة الوحدة بعد
              </h2>
              <p style={{ color: V1.textDim, fontSize: 15, maxWidth: 360, margin: '0 auto', lineHeight: 1.7 }}>
                أكمل 30% على الأقل من الوحدة لتأهيل نفسك
              </p>
            </div>
          )}

          {/* ── Star data ───────────────────── */}
          {!isEmpty && (
            <>
              {/* Hero section */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <motion.div
                  variants={heroVariants}
                  initial="hidden"
                  animate="visible"
                  style={S.trophyIconWrap}
                >
                  <Trophy size={40} style={{ color: '#0a0a0f' }} strokeWidth={2} />
                </motion.div>
                <h2 style={S.heroLabel}>نجم/ة الوحدة</h2>
                <GoldDivider />
              </div>

              {/* Star student card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={S.avatarCircle}>
                  {star.avatar
                    ? <img src={star.avatar} alt={star.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 32, fontWeight: 700, color: V1.accentGold, fontFamily: "'Tajawal', sans-serif" }}>
                        {(star.name ?? '؟').charAt(0)}
                      </span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={S.starName}>{star.name ?? '—'}</h3>
                  <p style={S.starScore}>بـ <AnimatedCounter value={starScore} duration={1.2} /> نقطة</p>
                </div>
              </div>

              {/* Stats breakdown */}
              <motion.div
                variants={statContainerVariants}
                initial="hidden"
                animate="visible"
                style={S.statsGrid}
              >
                {STAT_DEFS.map(({ key, label, icon: Icon, max }) => {
                  const val = star.scores?.[key] ?? 0
                  return (
                    <motion.div
                      key={key}
                      variants={statItemVariants}
                      style={S.statCell}
                    >
                      <Icon size={18} style={S.statIcon} strokeWidth={1.8} />
                      <div style={S.statLabel}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={S.statValue}>
                          <AnimatedCounter value={val} duration={1} />
                        </span>
                        <span style={S.statMax}>/{max}</span>
                      </div>
                      <ProgressBar value={val} max={max} />
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* Bonus chips */}
              {star.bonuses?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 4,
                      scrollbarWidth: 'none',
                    }}
                  >
                    {star.bonuses.map((bonus, i) => (
                      <span key={i} style={S.bonusChip}>
                        ✦ {bonus.label ?? bonus}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Your position section */}
              {!isTheStar && (
                <>
                  <GoldDivider />
                  <div style={S.myPositionCard}>
                    {myEntry ? (
                      <>
                        <div style={{ color: V1.textDim, fontSize: 13, marginBottom: 6 }}>موقعك في الترتيب</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: V1.textPrimary, fontFamily: "'Playfair Display', serif" }}>
                          #{myRank}
                        </div>
                        <div style={{ color: V1.accentGold, fontSize: 15, margin: '4px 0 10px' }}>
                          <AnimatedCounter value={myScore} duration={1} /> نقطة
                          {gap > 0 && (
                            <span style={{ color: V1.textDim, fontSize: 13, marginRight: 8 }}>
                              (يفصلك {gap} نقطة عن النجم/ة)
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 16px',
                          borderRadius: 20,
                          background: V1.accentGoldSoft,
                          border: `1px solid ${V1.accentGoldStrong}`,
                          color: V1.accentGold,
                          fontSize: 14,
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}>
                          {getMotivation(gap)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: V1.textDim, fontSize: 15, marginBottom: 8 }}>
                          لم تبدأ بعد — كل رحلة تبدأ بخطوة
                        </div>
                        <div style={{
                          display: 'inline-block',
                          padding: '6px 16px',
                          borderRadius: 20,
                          background: V1.accentGoldSoft,
                          border: `1px solid ${V1.accentGoldStrong}`,
                          color: V1.accentGold,
                          fontSize: 14,
                          fontWeight: 600,
                        }}>
                          {getMotivation(starScore + 1)}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* CTA */}
              <div style={S.ctaRow}>
                <motion.button
                  whileHover={reduced ? {} : { opacity: 0.88 }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  onClick={onClose}
                  style={S.primaryBtn}
                >
                  ابدأ الآن
                </motion.button>
                <button
                  onClick={onClose}
                  style={S.ghostBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = V1.accentGoldStrong; e.currentTarget.style.color = V1.accentGold }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = V1.border; e.currentTarget.style.color = V1.textSecondary }}
                >
                  أغلق
                </button>
              </div>

              {/* Footer microcopy */}
              <p style={S.footer}>
                كل محاولة = تقدّم. واصل/ي وشوف/ي الفرق.
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
