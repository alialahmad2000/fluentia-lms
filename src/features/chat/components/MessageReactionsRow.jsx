import { useState } from 'react'
import ReactionDetailsSheet from './ReactionDetailsSheet'

export default function MessageReactionsRow({ reactions, myId, onReact, messageId }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetEmoji, setSheetEmoji] = useState(null)

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] ?? { emoji: r.emoji, count: 0, users: [] }
    acc[r.emoji].count++
    acc[r.emoji].users.push(r.user_id)
    return acc
  }, {})

  const chips = Object.values(grouped)
  if (!chips.length) return null

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1">
        {chips.map(({ emoji, count, users }) => {
          const reacted = users.includes(myId)
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              onContextMenu={(e) => { e.preventDefault(); setSheetEmoji(emoji); setSheetOpen(true) }}
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
                ${reacted
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-sky-500/40'
                }
              `}
              style={{ minHeight: 28 }}
              title="اضغطي مطولاً لعرض من تفاعل"
            >
              <span>{emoji}</span>
              <span
                className="underline-offset-1"
                onClick={(e) => { e.stopPropagation(); setSheetEmoji(emoji); setSheetOpen(true) }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {sheetOpen && messageId && (
        <ReactionDetailsSheet
          messageId={messageId}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
