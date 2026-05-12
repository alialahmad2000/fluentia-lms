import { X } from 'lucide-react'

export default function ReplyPreviewBar({ replyTo, onCancel }) {
  if (!replyTo) return null
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-t border-[var(--border)] bg-sky-500/5"
      style={{ direction: 'rtl' }}
    >
      <div className="flex-1 min-w-0 border-r-2 border-sky-400 pr-2" style={{ borderInlineStart: '2px solid #38bdf8', borderInlineEnd: 'none', paddingInlineStart: 8 }}>
        <p className="text-xs text-sky-400 font-medium">{replyTo.sender?.first_name_ar}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">{replyTo.body || replyTo.content || '🎙️'}</p>
      </div>
      <button onClick={onCancel} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <X size={16} />
      </button>
    </div>
  )
}
