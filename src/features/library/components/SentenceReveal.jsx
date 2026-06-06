// The signature "veil-lift": tap an English sentence and its Arabic translation
// grows softly from underneath it — a whisper of meaning, never a popup.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SentenceReveal({ en, ar, isDialogue }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((o) => !o)
  return (
    <>
      <span
        className="lib-sentence"
        data-open={open || undefined}
        data-dialogue={isDialogue || undefined}
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
        }}
      >
        {en}{' '}
      </span>
      <AnimatePresence initial={false}>
        {open && ar && (
          <motion.span
            className="lib-reveal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span className="lib-reveal-inner" dir="rtl">{ar}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  )
}
