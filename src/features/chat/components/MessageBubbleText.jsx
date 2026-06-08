// Renders text with auto-linked URLs, per-identity coloured @mention chips,
// and inline formatting: **bold**  _italic_  ~~strike~~  `code`  ||spoiler||.
// Formatting is render-only (users type the markers, Discord/WhatsApp-style) and
// XSS-safe — values are React children, never dangerouslySetInnerHTML.
import { useState } from 'react'
import { senderColor } from '../lib/senderColors'

const URL_RE = /https?:\/\/[^\s]+/g
const MENTION_RE = /@([\p{L}\p{M} ]+)/gu
// 1=bold 2=italic 3=strike 4=code 5=spoiler
const INLINE_RE = /\*\*(.+?)\*\*|_(.+?)_|~~(.+?)~~|`([^`]+)`|\|\|(.+?)\|\|/g

function Spoiler({ children }) {
  const [shown, setShown] = useState(false)
  return (
    <span
      role="button"
      onClick={() => setShown(true)}
      title={shown ? undefined : 'اضغط للكشف'}
      style={{
        cursor: shown ? 'auto' : 'pointer',
        filter: shown ? 'none' : 'blur(5px)',
        background: shown ? 'transparent' : 'var(--ds-surface-2)',
        borderRadius: 4,
        padding: '0 3px',
        transition: 'filter .15s ease',
        userSelect: shown ? 'auto' : 'none',
      }}
    >
      {children}
    </span>
  )
}

// Turn a plain-text segment into React nodes with inline formatting applied.
function formatInline(text, keyPrefix) {
  const out = []
  let last = 0
  let m
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${keyPrefix}-${m.index}`
    if (m[1] != null) out.push(<strong key={k} style={{ fontWeight: 700 }}>{m[1]}</strong>)
    else if (m[2] != null) out.push(<em key={k} style={{ fontStyle: 'italic' }}>{m[2]}</em>)
    else if (m[3] != null) out.push(<span key={k} style={{ textDecoration: 'line-through', opacity: 0.7 }}>{m[3]}</span>)
    else if (m[4] != null) out.push(
      <code key={k} style={{ fontFamily: 'monospace', fontSize: '0.86em', background: 'var(--ds-surface-2)', padding: '1px 5px', borderRadius: 5 }}>{m[4]}</code>
    )
    else if (m[5] != null) out.push(<Spoiler key={k}>{m[5]}</Spoiler>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : text
}

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
          const shown = token.name.replace(/ /g, ' ').trim()
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
        return <span key={i}>{formatInline(token.value, i)}</span>
      })}
    </p>
  )
}
