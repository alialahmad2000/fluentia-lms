// Renders plain text with auto-linked URLs and styled @mention chips
const URL_RE = /https?:\/\/[^\s]+/g
const MENTION_RE = /@(\S+)/g

export default function MessageBubbleText({ body, mentions = [] }) {
  if (!body) return null

  // Build a list of tokens: text | url | mention
  const tokens = []
  let last = 0
  const combined = []

  // Collect all matches with their positions
  URL_RE.lastIndex = 0
  MENTION_RE.lastIndex = 0

  let m
  while ((m = URL_RE.exec(body)) !== null) {
    combined.push({ type: 'url', value: m[0], index: m.index, end: m.index + m[0].length })
  }
  while ((m = MENTION_RE.exec(body)) !== null) {
    combined.push({ type: 'mention', value: m[0], name: m[1], index: m.index, end: m.index + m[0].length })
  }
  combined.sort((a, b) => a.index - b.index)

  // Build interleaved token list
  for (const part of combined) {
    if (part.index > last) {
      tokens.push({ type: 'text', value: body.slice(last, part.index) })
    }
    tokens.push(part)
    last = part.end
  }
  if (last < body.length) tokens.push({ type: 'text', value: body.slice(last) })

  return (
    <p
      className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'auto' }}
    >
      {tokens.map((token, i) => {
        if (token.type === 'url') {
          return (
            <a
              key={i}
              href={token.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline underline-offset-2 hover:text-sky-300 break-all"
            >
              {token.value}
            </a>
          )
        }
        if (token.type === 'mention') {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-400 font-medium text-[13px]"
            >
              {token.value}
            </span>
          )
        }
        return <span key={i}>{token.value}</span>
      })}
    </p>
  )
}
