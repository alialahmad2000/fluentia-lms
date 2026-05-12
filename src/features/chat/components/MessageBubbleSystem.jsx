// System messages: centered, muted, no bubble, small icon
import { Pin } from 'lucide-react'

export default function MessageBubbleSystem({ body }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 py-2 px-4"
      style={{ direction: 'rtl' }}
    >
      <Pin size={11} style={{ color: 'var(--ds-text-muted)' }} />
      <span
        className="text-xs italic"
        style={{
          fontFamily: 'Tajawal, sans-serif',
          color: 'var(--ds-text-muted)',
          lineHeight: 1.7,
        }}
      >
        {body}
      </span>
    </div>
  )
}
