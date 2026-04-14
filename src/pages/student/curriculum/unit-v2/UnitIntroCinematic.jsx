import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'
import { useAuthStore } from '../../../../stores/authStore'

/* ═══════════════════════════════════════════════
   Themed quotes — matched by keyword in unit.theme_en
   ═══════════════════════════════════════════════ */
const QUOTES = {
  festival: 'حيث تلتقي الثقافات، تُولد الذكريات',
  ocean:    'في كل موجة، قصة جديدة',
  space:    'الكون واسع، وأنت جزء منه',
  history:  'من الماضي نتعلّم، وللمستقبل نستعد',
  sport:    'كل بطل بدأ بخطوة واحدة',
  art:      'الإبداع لغة لا تحتاج ترجمة',
  travel:   'السفر يفتح عوالم جديدة',
  default:  'اكتشف وتعلّم وارتقِ',
}

function getQuote(themeEn = '') {
  const lower = themeEn.toLowerCase()
  for (const key of Object.keys(QUOTES)) {
    if (key !== 'default' && lower.includes(key)) return QUOTES[key]
  }
  return QUOTES.default
}

function storageKey(unitId) {
  return `fluentia_unit_intro_${unitId}_seen`
}

/* ═══════════════════════════════════════════════
   UnitIntroCinematic
   Props: { unit, onDone }
   ═══════════════════════════════════════════════ */
export default function UnitIntroCinematic({ unit, onDone }) {
  const { reduced } = useCinematicMotion()
  const { profile, impersonation, _realProfile } = useAuthStore()

  const [visible, setVisible] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Determine whether to show on mount
  useEffect(() => {
    if (!unit?.id) { onDone(); return }

    // Skip if admin (impersonating or direct)
    const isAdmin = impersonation
      ? _realProfile?.role === 'admin'
      : profile?.role === 'admin'
    if (isAdmin) { onDone(); return }

    // Skip if already seen
    if (localStorage.getItem(storageKey(unit.id))) { onDone(); return }

    setVisible(true)
  }, [unit?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss timer & skip button reveal
  useEffect(() => {
    if (!visible) return

    const skipTimer = setTimeout(() => setShowSkip(true), 2000)
    const autoTimer = setTimeout(() => dismiss(), reduced ? 1000 : 3500)

    return () => {
      clearTimeout(skipTimer)
      clearTimeout(autoTimer)
    }
  }, [visible, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to skip
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    if (dismissed) return
    setDismissed(true)
    localStorage.setItem(storageKey(unit.id), '1')
    setVisible(false)
    // Allow exit animation to complete before calling onDone
    setTimeout(onDone, 220)
  }

  if (!visible && !dismissed) return null

  const quote = getQuote(unit?.theme_en)
  const title = unit?.unit_number && unit?.theme_ar
    ? `الوحدة ${unit.unit_number}: ${unit.theme_ar}`
    : unit?.theme_ar || ''

  /* ── Reduced-motion variant ── */
  if (reduced) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            key="intro-reduced"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={overlayStyle}
            role="dialog"
            aria-modal="true"
            aria-label="مقدمة الوحدة"
          >
            <div style={{ textAlign: 'center', padding: '32px 24px' }}>
              <p style={titleStyle}>{title}</p>
              <button onClick={dismiss} style={skipBtnStyle}>متابعة</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  /* ── Full cinematic variant ── */
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro-cinematic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4 }}
          style={overlayStyle}
          role="dialog"
          aria-modal="true"
          aria-label="مقدمة الوحدة"
        >
          {/* Cover image — ken burns */}
          {unit?.cover_image_url && (
            <motion.div
              initial={{ scale: 1.15, x: 10 }}
              animate={{ scale: 1.0, x: 0 }}
              transition={{ duration: 3.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${unit.cover_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                willChange: 'transform',
              }}
            />
          )}

          {/* Dark gradient overlay */}
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0.82 }}
            transition={{ duration: 2.5, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '0 24px',
            gap: '20px',
          }}>
            {/* Title */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={titleStyle}
            >
              {title}
            </motion.p>

            {/* Quote */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 0.75, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: 'Tajawal, sans-serif',
                fontSize: 'clamp(15px, 2vw, 20px)',
                color: '#e8d5a3',
                textAlign: 'center',
                maxWidth: '520px',
                lineHeight: 1.7,
                direction: 'rtl',
              }}
            >
              {quote}
            </motion.p>
          </div>

          {/* Skip button — appears at 2s */}
          <AnimatePresence>
            {showSkip && (
              <motion.button
                key="skip-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={dismiss}
                style={skipBtnStyle}
                aria-label="تخطي المقدمة"
              >
                <X size={14} strokeWidth={2.5} />
                تخطي
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Shared styles ─── */
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 8000,
  background: '#000',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  direction: 'rtl',
}

const titleStyle = {
  fontFamily: '"Playfair Display", "Noto Serif Arabic", serif',
  fontSize: 'clamp(28px, 5vw, 48px)',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #f5c842 0%, #fde68a 50%, #f59e0b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  textAlign: 'center',
  lineHeight: 1.4,
  direction: 'rtl',
  margin: 0,
}

const skipBtnStyle = {
  position: 'fixed',
  bottom: '32px',
  left: '32px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 18px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '20px',
  color: 'rgba(255,255,255,0.65)',
  fontFamily: 'Tajawal, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  zIndex: 1,
}
