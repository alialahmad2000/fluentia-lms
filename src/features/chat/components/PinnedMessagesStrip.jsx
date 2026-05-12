import { useState } from 'react'
import { Pin, ChevronDown } from 'lucide-react'
import { usePinnedMessages } from '../queries/usePinnedMessages'

export default function PinnedMessagesStrip({ channelId }) {
  const [expanded, setExpanded] = useState(false)
  const { data: pinned = [] } = usePinnedMessages(channelId)

  if (!pinned.length) return null

  const latest = pinned[0]

  return (
    <div
      className="border-b border-[var(--border)] bg-amber-500/5"
      style={{ direction: 'rtl' }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-amber-500/5 transition-colors"
      >
        <Pin size={14} className="text-amber-400 shrink-0" />
        <span className="flex-1 text-right text-[var(--text-muted)] truncate">
          {latest.body || latest.content || '🎙️'}
        </span>
        {pinned.length > 1 && (
          <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">{pinned.length}</span>
        )}
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-2 space-y-1">
          {pinned.map((p) => (
            <div key={p.id} className="text-xs text-[var(--text-muted)] py-1 border-t border-[var(--border)]">
              <span className="font-medium text-[var(--text-secondary)] ml-1">{p.sender?.first_name_ar}:</span>
              {p.body || p.content || '🎙️'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
