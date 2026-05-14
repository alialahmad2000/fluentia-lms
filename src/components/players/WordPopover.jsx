import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function WordPopover({
  word,
  rect,
  translation,
  onPlayAudio,
  onAddToVocab,
  onClose,
  isInVocab
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' })

  useEffect(() => {
    if (!rect) return
    const popoverHeight = 140
    const popoverWidth = 280
    const gap = 12
    const margin = 16

    let top = rect.top - popoverHeight - gap + window.scrollY
    let placement = 'top'

    if (top < window.scrollY + margin) {
      top = rect.bottom + gap + window.scrollY
      placement = 'bottom'
    }

    let left = rect.left + rect.width / 2 - popoverWidth / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - popoverWidth - margin))

    setPos({ top, left, placement })
  }, [rect])

  if (!rect) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: pos.placement === 'top' ? 8 : -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          width: 280,
          zIndex: 60
        }}
        className="rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-md"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3" dir="ltr">
            <span className="text-lg font-semibold text-[var(--text-primary)] font-['Inter']">{word}</span>
            <button
              onClick={onPlayAudio}
              aria-label="استمع للنطق"
              className="p-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/></svg>
            </button>
          </div>

          <div className="text-sm text-[var(--text-secondary)] min-h-[1.5rem] font-['Tajawal']">
            {translation.loading ? (
              <span className="opacity-60">جاري الترجمة...</span>
            ) : translation.ar ? (
              <span>{translation.ar}</span>
            ) : (
              <span className="opacity-60">لم يتم العثور على ترجمة</span>
            )}
          </div>

          <button
            onClick={onAddToVocab}
            disabled={isInVocab}
            className={`w-full py-2 rounded-lg text-sm font-medium transition font-['Tajawal'] ${
              isInVocab
                ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
            }`}
          >
            {isInVocab ? '✓ في مفرداتك' : '+ أضف لمفرداتي'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
