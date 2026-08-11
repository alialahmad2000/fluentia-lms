import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import './submit-reminder.css'

/**
 * "You answered everything — hand it in" bar.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Completion is deliberately NOT automatic: auto-completing on reload is what
 * produced the phantom 0% submissions the `block_phantom_submission` trigger now
 * guards against. So a section only counts once the student presses تسليم.
 *
 * The submit button, however, lives inline BELOW the last question — on a phone
 * that is several screens down past every question and the audio player. A
 * student could answer all of them, never reach the button, and leave. The row
 * stays `in_progress` forever, the engine cannot count it, and NOTHING tells her
 * or the trainer. The 2026-08-11 audit found four active students in exactly that
 * state, each with a fully answered section that had never counted — ملاك 5/5,
 * سارة 7/7, نادية 7/7, أنوار 2/2.
 *
 * ── THREE THINGS THIS GETS RIGHT (each was wrong in the first draft) ────────
 * 1. PORTALLED TO body. The tabs render inside framer-motion wrappers, and an
 *    ancestor with a `transform` becomes the containing block for `position:
 *    fixed` children — the bar resolved against that box and hung off the right
 *    edge of the screen. A portal is the only reliable escape.
 * 2. CLEARS THE NAV *AND* THE FABs. The mobile nav occupies
 *    --bottom-nav-height + --sab from the bottom, and the a11y / bug-report FABs
 *    sit in the band just above it at z-997/998. Sitting in that band means being
 *    covered by a button the student cannot see past, so we clear it entirely.
 * 3. ONLY WHEN THE INLINE BUTTON IS OFF SCREEN. Mirrors the proven
 *    `.grammar-sticky-cta` behaviour — no duplicate CTAs competing on screen.
 */
export default function SubmitReminderBar({
  show, answered, total, onSubmit, submitting, accent = '#38bdf8', anchorRef,
}) {
  // Hide while the real inline submit button is visible — one CTA at a time.
  const [anchorVisible, setAnchorVisible] = useState(false)
  useEffect(() => {
    const el = anchorRef?.current
    if (!show || !el) { setAnchorVisible(false); return }
    const obs = new IntersectionObserver(
      ([e]) => setAnchorVisible(e.isIntersecting),
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [show, anchorRef])

  const hostRef = useRef(null)
  if (typeof document === 'undefined') return null
  if (!hostRef.current) hostRef.current = document.body

  return createPortal(
    <AnimatePresence>
      {show && !anchorVisible && (
        <motion.div
          className="submit-reminder-bar"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          dir="rtl"
          role="status"
        >
          <span className="submit-reminder-text">
            أجبتِ على كل الأسئلة ({answered}/{total}) — سلّمي ليُحتسب تقدّمكِ
          </span>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="submit-reminder-btn font-['Tajawal']"
            style={{ background: accent }}
          >
            <Send size={15} />
            {submitting ? 'جاري التسليم…' : 'تسليم الآن'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    hostRef.current
  )
}
