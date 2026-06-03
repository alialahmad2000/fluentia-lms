// Renders text with auto-linked URLs and per-identity coloured @mention chips.
// Arabic-aware mention regex (\p{L}\p{M}) + NBSP so multi-word names chip whole.
import { senderColor } from '../lib/senderColors'

const URL_RE = /https?:\/\/[^\s]+/g
const MENTION_RE = /@([\p{L}\p{M} ]+)/gu

export default function MessageBubbleText({ body, mentions = [], myId }) {
  if (!body) return null

  const combined = []
  URL_RE.lastIndex = 0
  MENTION_RE.lastIndex = 0
  let m
  while ((m = URL_RE.exec(body)) !== null) combined.push({ type: 'url', value: m[0], index: m.index, end: m.index + m[0].length })
  while ((m = MENTION_RE.exec(body)) !== null) combined.push({ type: 'mention', value: m[0], name: m[1], index: m.index, end: m.index + m[0].length })
  combined.sort((a, b) => a.index - b.index)

  const tokens = []
  let last = 0
  for (const part of combined) {
    if (part.index < last) continue // skip overlaps
    if (part.index > last) tokens.push({ type: 'text', value: body.slice(last, part.index) })
    tokens.push(part)
    last = part.end
  }
  if (last < body.length) tokens.push({ type: 'text', value: body.slice(last) })

  return (
    <p
      className="text-sm leading-relaxed whitespace-pre-wrap break-words"
      style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-primary)', direction: 'auto' }}
    >
      {tokens.map((token, i) => {
        if (token.type === 'url') {
          return (
            <a key={i} href={token.value} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 break-all" style={{ color: 'var(--ds-accent-primary)' }}>
              {token.value}
            </a>
          )
        }
        if (token.type === 'mention') {
          const shown = token.name.replace(/ /g, ' ').trim()
          const c = senderColor(shown) // stable per-name colour (no schema dependency)
          return (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md font-medium text-[13px]"
              style={{
                color: c.soft,
                background: `color-mix(in srgb, ${c.base} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.base} 30%, transparent)`,
              }}>
              @{shown}
            </span>
          )
        }
        return <span key={i}>{token.value}</span>
      })}
    </p>
  )
}
