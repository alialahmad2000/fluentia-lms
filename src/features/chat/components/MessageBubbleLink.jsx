import { ExternalLink } from 'lucide-react'

export default function MessageBubbleLink({ message }) {
  if (!message.link_url) return null

  return (
    <a
      href={message.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-1 rounded-xl border border-[var(--border)] overflow-hidden hover:border-sky-500/40 transition-colors"
      style={{ maxWidth: 360 }}
    >
      {message.link_image_url && (
        <img src={message.link_image_url} alt="" className="w-full h-32 object-cover" loading="lazy" />
      )}
      <div className="p-3">
        {message.link_domain && (
          <p className="text-[11px] text-sky-400 mb-0.5">{message.link_domain}</p>
        )}
        {message.link_title && (
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{message.link_title}</p>
        )}
        {message.link_description && (
          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{message.link_description}</p>
        )}
      </div>
    </a>
  )
}
