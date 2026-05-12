import { Megaphone } from 'lucide-react'

export default function MessageBubbleAnnouncement({ body }) {
  return (
    <div
      className="flex gap-2 items-start rounded-xl p-3 my-1"
      style={{ background: 'color-mix(in srgb, #fbbf24 10%, transparent)', border: '1px solid color-mix(in srgb, #fbbf24 20%, transparent)' }}
    >
      <Megaphone size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <p
        className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap"
        style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 500 }}
      >
        {body}
      </p>
    </div>
  )
}
