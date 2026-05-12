import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactionDetailsSheet from '../ReactionDetailsSheet'

export default function ReactionSummary({ reactions, myId, messageId, onReact }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!reactions?.length) return null

  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] ?? { emoji: r.emoji, count: 0, users: [] }
    acc[r.emoji].count++
    acc[r.emoji].users.push(r.user_id)
    return acc
  }, {})

  const chips = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 5)
  const extra = Object.values(grouped).length - 5

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {chips.map(({ emoji, count, users }) => {
          const isOwn = users.includes(myId)
          return (
            <motion.button
              key={emoji}
              onClick={() => onReact(emoji)}
              onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true) }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
              style={{
                background: isOwn
                  ? 'color-mix(in srgb, var(--ds-accent-gold) 12%, transparent)'
                  : 'color-mix(in srgb, var(--ds-bg-elevated) 85%, transparent)',
                border: isOwn
                  ? '1px solid color-mix(in srgb, var(--ds-accent-gold) 40%, transparent)'
                  : '1px solid color-mix(in srgb, var(--ds-border-subtle) 70%, transparent)',
                color: isOwn ? 'var(--ds-accent-gold)' : 'var(--ds-text-secondary)',
                backdropFilter: 'blur(8px)',
                minHeight: 26,
                boxShadow: isOwn
                  ? '0 0 8px -2px color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)'
                  : 'none',
              }}
            >
              <span style={{ display: 'inline-block', transform: 'scale(1.1)', transformOrigin: 'center' }}>
                {emoji}
              </span>
              <span
                className="tabular-nums"
                onClick={(e) => { e.stopPropagation(); setSheetOpen(true) }}
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {count}
              </span>
            </motion.button>
          )
        })}
        {extra > 0 && (
          <button
            onClick={() => setSheetOpen(true)}
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              background: 'var(--ds-surface-1)',
              border: '1px solid var(--ds-border-subtle)',
              color: 'var(--ds-text-muted)',
              minHeight: 26,
            }}
          >
            +{extra}
          </button>
        )}
      </div>

      {sheetOpen && (
        <ReactionDetailsSheet messageId={messageId} onClose={() => setSheetOpen(false)} />
      )}
    </>
  )
}
