// The signature "veil-lift": tap an English sentence and its Arabic translation
// grows softly from underneath it. Honors the reader's help level:
//   full  — tap any sentence → Arabic (default)
//   hints — long/hard words get a faint dotted underline; sentences still tap
//   off   — English only, no tap (pure immersion)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// render English text, optionally underlining long words as gentle hints
export function renderEN(text, help) {
  if (help !== 'hints') return text
  return String(text).split(/(\s+)/).map((tok, i) => {
    const w = tok.replace(/[^A-Za-z']/g, '')
    return w.length >= 8 ? <u key={i} className="lib-hint">{tok}</u> : tok
  })
}

export default function SentenceReveal({ en, ar, isDialogue, help = 'full' }) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((o) => !o)

  if (help === 'off') {
    return <span className="lib-sentence" data-static="" data-dialogue={isDialogue || undefined}>{en}{' '}</span>
  }

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
        {renderEN(en, help)}{' '}
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
