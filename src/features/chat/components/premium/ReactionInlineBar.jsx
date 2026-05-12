import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { popIn } from '../../lib/motion'

const EMOJIS = ['👍', '🔥', '❤️', '😂', '👏']

export default function ReactionInlineBar({ visible, onReact, onDismiss }) {
  const [tapped, setTapped] = useState(null)

  function handleReact(emoji) {
    setTapped(emoji)
    setTimeout(() => {
      setTapped(null)
      onReact(emoji)
      onDismiss()
    }, 240)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          {...popIn}
          onMouseLeave={onDismiss}
          className="absolute z-30 flex items-center gap-1 px-2 py-1.5 rounded-2xl"
          style={{
            bottom: '100%',
            right: 0,
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 94%, transparent)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid var(--ds-border-subtle)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent)',
            marginBottom: 4,
          }}
        >
          {EMOJIS.map((emoji) => {
            const isTapped = tapped === emoji
            return (
              <motion.button
                key={emoji}
                onClick={() => handleReact(emoji)}
                animate={isTapped ? { scale: 1.2 } : { scale: 1 }}
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center rounded-xl transition-colors"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 20,
                  background: isTapped
                    ? 'var(--ds-surface-2)'
                    : 'transparent',
                }}
              >
                {emoji}
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
