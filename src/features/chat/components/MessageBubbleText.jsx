// Auto-links URLs in plain text messages
const URL_RE = /https?:\/\/[^\s]+/g

export default function MessageBubbleText({ body }) {
  if (!body) return null

  const parts = []
  let last = 0
  let match

  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(body)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: body.slice(last, match.index) })
    parts.push({ type: 'link', value: match[0] })
    last = match.index + match[0].length
  }
  if (last < body.length) parts.push({ type: 'text', value: body.slice(last) })

  return (
    <p
      className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto' }}
    >
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline underline-offset-2 hover:text-sky-300 break-all"
          >
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </p>
  )
}
