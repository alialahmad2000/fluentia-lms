// Renders text with auto-linked URLs, per-identity coloured @mention chips, inline
// formatting (**bold** _italic_ ~~strike~~ `code` ||spoiler||), and — the Majlis
// touch — TAP ANY ENGLISH WORD to get its Arabic meaning + audio (reading the chat
// becomes vocabulary practice). XSS-safe: values are React children, never HTML.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Volume2 } from 'lucide-react'
import { senderColor } from '../lib/senderColors'
import { supabase } from '../../../lib/supabase'
import { pronounceWord } from '../../../lib/audio/pronounceWord'

const URL_RE = /https?:\/\/[^\s]+/g
const MENTION_RE = /@([\p{L}\p{M} ]+)/gu
// 1=bold 2=italic 3=strike 4=code 5=spoiler
const INLINE_RE = /\*\*(.+?)\*\*|_(.+?)_|~~(.+?)~~|`([^`]+)`|\|\|(.+?)\|\|/g
const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g

function Spoiler({ children }) {
  const [shown, setShown] = useState(false)
  return (
    <span role="button" onClick={() => setShown(true)} title={shown ? undefined : 'اضغط للكشف'}
      style={{ cursor: shown ? 'auto' : 'pointer', filter: shown ? 'none' : 'blur(5px)', background: shown ? 'transparent' : 'var(--ds-surface-2)', borderRadius: 4, padding: '0 3px', transition: 'filter .15s ease', userSelect: shown ? 'auto' : 'none' }}>
      {children}
    </span>
  )
}

// Wrap English words (>= 2 letters) in tappable spans → meaning lens.
function wrapWords(str, keyBase, onWord) {
  if (!onWord) return [str]
  const nodes = []
  let last = 0, m, i = 0
  WORD_RE.lastIndex = 0
  while ((m = WORD_RE.exec(str)) !== null) {
    if (m.index > last) nodes.push(str.slice(last, m.index))
    const w = m[0]
    if (w.length >= 2) {
      nodes.push(
        <span key={`${keyBase}-w${i++}`} role="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onWord(w, e.currentTarget) }}
          style={{ cursor: 'pointer', borderBottom: '1px dotted color-mix(in srgb, var(--ds-accent-gold) 28%, transparent)' }}>
          {w}
        </span>
      )
    } else nodes.push(w)
    last = m.index + w.length
  }
  if (last < str.length) nodes.push(str.slice(last))
  return nodes
}

// Inline formatting + word-tapping in one pass.
function renderRich(text, keyPrefix, onWord) {
  const out = []
  let last = 0, m
  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(...wrapWords(text.slice(last, m.index), `${keyPrefix}-${last}`, onWord))
    const k = `${keyPrefix}-${m.index}`
    if (m[1] != null) out.push(<strong key={k} style={{ fontWeight: 700 }}>{m[1]}</strong>)
    else if (m[2] != null) out.push(<em key={k} style={{ fontStyle: 'italic' }}>{m[2]}</em>)
    else if (m[3] != null) out.push(<span key={k} style={{ textDecoration: 'line-through', opacity: 0.7 }}>{m[3]}</span>)
    else if (m[4] != null) out.push(<code key={k} style={{ fontFamily: 'monospace', fontSize: '0.86em', background: 'var(--ds-surface-2)', padding: '1px 5px', borderRadius: 5 }}>{m[4]}</code>)
    else if (m[5] != null) out.push(<Spoiler key={k}>{m[5]}</Spoiler>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(...wrapWords(text.slice(last), `${keyPrefix}-e`, onWord))
  return out
}

// The meaning lens — tap an English word, get its Arabic meaning + audio.
function WordLens({ word, rect, onClose }) {
  const [meaning, setMeaning] = useState(undefined) // undefined=loading, null=none, string=found
  useEffect(() => {
    let alive = true
    const norm = word.toLowerCase().replace(/^[^a-z'-]+|[^a-z'-]+$/g, '')
    ;(async () => {
      let found = null
      try {
        const { data: g } = await supabase.from('reading_glossary').select('meaning_ar').eq('word', norm).maybeSingle()
        if (g?.meaning_ar) found = g.meaning_ar
        if (!found) {
          const { data: v } = await supabase.from('curriculum_vocabulary').select('definition_ar').ilike('word', norm).limit(1)
          if (v && v[0]?.definition_ar) found = v[0].definition_ar
        }
      } catch { /* ignore */ }
      if (alive) setMeaning(found)
    })()
    return () => { alive = false }
  }, [word])

  const top = rect ? Math.min(rect.bottom + 8, window.innerHeight - 130) : 120
  const left = rect ? Math.min(Math.max(12, rect.left + rect.width / 2 - 115), window.innerWidth - 242) : 12
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl"
        style={{ position: 'fixed', top, left, width: 230, maxWidth: 'calc(100vw - 24px)',
          background: 'color-mix(in srgb, var(--ds-bg-elevated) 97%, transparent)',
          backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, var(--ds-border-subtle))',
          borderRadius: 14, padding: '12px 14px', boxShadow: '0 22px 54px -18px rgba(0,0,0,0.75)' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span dir="ltr" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: 16, color: 'var(--ds-text-primary)' }}>{word}</span>
          <button type="button" onClick={() => pronounceWord(word)} aria-label="استماع للنطق"
            className="rounded-full flex items-center justify-center shrink-0"
            style={{ width: 30, height: 30, color: 'var(--ds-accent-gold)', background: 'color-mix(in srgb, var(--ds-accent-gold) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, transparent)' }}>
            <Volume2 size={15} />
          </button>
        </div>
        <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14, lineHeight: 1.7, color: meaning ? 'var(--ds-text-secondary)' : 'var(--ds-text-muted)' }}>
          {meaning === undefined ? '…' : meaning || 'اضغط 🔊 للاستماع — لا يوجد تعريف محفوظ لهذه الكلمة'}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function MessageBubbleText({ body, mentions = [], myId }) {
  const [lens, setLens] = useState(null)
  const onWord = (word, el) => setLens({ word, rect: el.getBoundingClientRect() })
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
    if (part.index < last) continue
    if (part.index > last) tokens.push({ type: 'text', value: body.slice(last, part.index) })
    tokens.push(part)
    last = part.end
  }
  if (last < body.length) tokens.push({ type: 'text', value: body.slice(last) })

  return (
    <>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-primary)', direction: 'auto' }}>
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
            const c = senderColor(shown)
            return (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md font-medium text-[13px]"
                style={{ color: c.soft, background: `color-mix(in srgb, ${c.base} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.base} 30%, transparent)` }}>
                @{shown}
              </span>
            )
          }
          return <span key={i}>{renderRich(token.value, i, null)}</span>
        })}
      </p>
      {lens && <WordLens word={lens.word} rect={lens.rect} onClose={() => setLens(null)} />}
    </>
  )
}
