// Floating 5-emoji bar that appears on hover / long-press
import { motion, AnimatePresence } from 'framer-motion'
import { popIn } from '../../lib/motion'

const EMOJIS = ['👍', '🔥', '❤️', '😂', '👏']

export default function ReactionInlineBar({ visible, onReact, onDismiss }) {
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
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 92%, transparent)',
            backdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid var(--ds-border-subtle)',
            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent)',
            marginBottom: 4,
          }}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(emoji); onDismiss() }}
              className="text-xl rounded-xl transition-all hover:scale-125 hover:bg-[var(--ds-surface-2)] p-1"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
