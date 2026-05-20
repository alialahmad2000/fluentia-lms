import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sparkles, BookOpenCheck, PartyPopper } from 'lucide-react'

/**
 * ContinueArc — single dominant gold CTA below the orb.
 * Behavior depends on action.target:
 *   - 'srs_review'        → router.push(payload.route ?? '/student/srs')
 *   - 'next_word'         → onOpenWord(payload.vocabularyId)
 *   - 'celebrate'         → onScrollToLibrary()  (and looks like a softer green button)
 *   - 'start_exploration' → onScrollToLibrary()
 */
export default function ContinueArc({ action, onOpenWord, onScrollToLibrary }) {
  const navigate = useNavigate()
  if (!action) return null

  const target = action.target
  const word = action.payload?.word ?? null

  const handleClick = () => {
    if (target === 'srs_review') {
      navigate(action.payload?.route ?? '/student/srs')
      return
    }
    if (target === 'next_word' && action.payload?.vocabularyId) {
      onOpenWord?.(action.payload.vocabularyId)
      return
    }
    // celebrate / start_exploration
    onScrollToLibrary?.()
  }

  const isCelebrate = target === 'celebrate'

  const gradient = isCelebrate
    ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
    : 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'

  const textColor = isCelebrate ? '#022c22' : '#0a1225'

  // Pick an iconographic affordance per state
  let icon = null
  if (target === 'srs_review') icon = <BookOpenCheck size={18} />
  else if (target === 'celebrate') icon = <PartyPopper size={18} />
  else if (target === 'next_word') icon = <Sparkles size={18} />
  else icon = <Sparkles size={16} />

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="w-full md:w-[320px] rounded-2xl font-['Tajawal'] font-bold"
      style={{
        background: gradient,
        color: textColor,
        minHeight: 56,
        padding: word ? '10px 18px' : '14px 18px',
        boxShadow: isCelebrate
          ? '0 14px 32px rgba(16,185,129,0.32)'
          : '0 14px 32px rgba(217,119,6,0.32)',
        textAlign: 'start',
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2.5">
          <span style={{ display: 'inline-flex', opacity: 0.95 }}>{icon}</span>
          <div className="flex flex-col items-start leading-tight">
            <span style={{ fontSize: 16 }}>{action.label}</span>
            {word && target === 'next_word' && (
              <span
                dir="ltr"
                style={{
                  fontSize: 12,
                  opacity: 0.75,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  marginTop: 2,
                }}
              >
                {String(word).slice(0, 20)}
                {String(word).length > 20 ? '…' : ''}
              </span>
            )}
          </div>
        </div>
        <ChevronLeft size={18} style={{ opacity: 0.85 }} />
      </div>
    </motion.button>
  )
}
