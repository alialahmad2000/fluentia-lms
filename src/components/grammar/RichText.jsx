import { useMemo } from 'react'

/**
 * RichText — renders grammar explanation copy that carries *structure*.
 *
 * Curriculum authors write these fields two ways, sometimes in the same row:
 *   1. light HTML  — <b>label</b><br><i>example</i><br><br>next group
 *   2. plain text  — blank lines between paragraphs, "- " bullet lines
 *
 * Before this component, `content_ar` was rendered as a bare {string} inside a
 * <p>, so every newline collapsed and every <br> printed as literal text — a
 * 1,200-character wall. `formula` had the same problem. This turns BOTH shapes
 * into real paragraphs, lines, and lists without dangerouslySetInnerHTML.
 *
 * It is also bidi-aware, which matters because this copy is bilingual:
 *   • a line that is mostly Latin renders LTR even inside an RTL block
 *   • multi-word Latin runs inside an Arabic line are isolated in <bdi>
 * Without that, "'We will finish next week' ← She said they would…" scrambles.
 */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&#39;': "'", '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…',
  '&mdash;': '—', '&ndash;': '–', '&rarr;': '→', '&larr;': '←',
  '&laquo;': '«', '&raquo;': '»',
}
const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#39|nbsp|middot|hellip|mdash|ndash|rarr|larr|laquo|raquo);/g

const ARABIC_CLASS = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF'
const ARABIC_RE = new RegExp(`[${ARABIC_CLASS}]`)
const ARABIC_G = new RegExp(`[${ARABIC_CLASS}]`, 'g')
const LATIN_G = /[A-Za-z]/g

// A Latin run = starts with a Latin letter, swallows anything that is not an
// Arabic letter, and must end on a word/closing character so trailing spaces
// and Arabic-side commas stay outside the isolate.
const LATIN_RUN_RE = new RegExp(
  `[A-Za-z][^${ARABIC_CLASS}]*[A-Za-z0-9'"’”)\\]!?.]|[A-Za-z]+`,
  'g'
)

const BULLET_RE = /^(?:[-–—*•·]|\d+[.)])\s+/
const ORDERED_RE = /^\d+[.)]\s+/
// Arabic-Indic numerals (١) ٢) …) are deliberately NOT list markers: turning
// them into an <ol> would renumber them with Latin digits.
const TAG_RE = /<\s*(\/?)\s*(b|strong|i|em|u|code)\s*\/?\s*>/gi

const decode = (s) => s.replace(ENTITY_RE, (m) => ENTITIES[m] ?? m)

/** Share of letters that are Latin — used to pick a line's direction. */
function latinRatio(text) {
  const latin = (text.match(LATIN_G) || []).length
  const arabic = (text.match(ARABIC_G) || []).length
  if (!latin && !arabic) return 0.5
  return latin / (latin + arabic)
}

// Closing → opening, so an isolate never splits a bracket or quote pair.
// "(Reported Speech)" must go inside the <bdi> whole; leaving the "(" outside
// puts it in RTL context where it mirrors, and the reader sees ")Reported…)".
const PAIRS = { ')': '(', ']': '[', '}': '{', '"': '"', "'": "'", '”': '“', '»': '«', '’': '‘' }

/** Wrap multi-word Latin runs so RTL bidi reordering can't scramble them.
 *  Exported because any Arabic teaching prose that quotes English needs it —
 *  «ورقة المذاكرة» renders its explanations as plain paragraphs, not RichText
 *  blocks, so it takes the isolate helper without the block/CSS machinery. */
export function isolateLatin(text, key) {
  if (!ARABIC_RE.test(text)) return text
  const out = []
  let last = 0
  let m
  LATIN_RUN_RE.lastIndex = 0
  while ((m = LATIN_RUN_RE.exec(text))) {
    let run = m[0]
    // Single words reorder correctly on their own; only isolate real phrases.
    if (!/\s/.test(run)) continue
    let start = m.index
    const opener = PAIRS[run[run.length - 1]]
    if (opener && start > last && text[start - 1] === opener) {
      start -= 1
      run = opener + run
    }
    if (start > last) out.push(text.slice(last, start))
    out.push(
      <bdi key={`${key}-bdi-${start}`} dir="ltr">
        {run}
      </bdi>
    )
    last = start + run.length
  }
  if (!out.length) return text
  if (last < text.length) out.push(text.slice(last))
  return out
}

function applyMarks(children, marks, key) {
  let node = children
  if (marks.includes('code')) {
    node = <code key={`${key}-code`} className="grammar-rt-code" dir="ltr">{node}</code>
  }
  if (marks.includes('u')) {
    node = <u key={`${key}-u`} className="grammar-rt-u">{node}</u>
  }
  if (marks.includes('i')) {
    node = <em key={`${key}-i`} className="grammar-rt-i">{node}</em>
  }
  if (marks.includes('b')) {
    node = <strong key={`${key}-b`} className="grammar-rt-b">{node}</strong>
  }
  return node
}

/** Inline pass: light HTML tags + `code` + **bold**, then bidi isolation. */
function parseInline(raw, key) {
  const nodes = []
  const marks = []
  let buffer = ''

  const flush = () => {
    if (!buffer) return
    const k = `${key}-t${nodes.length}`
    let text = decode(buffer)
    // Markdown fallbacks so future authoring doesn't need HTML.
    const pieces = []
    let cursor = 0
    const md = /\*\*([^*\n]+)\*\*|`([^`\n]+)`/g
    let mm
    while ((mm = md.exec(text))) {
      if (mm.index > cursor) pieces.push(isolateLatin(text.slice(cursor, mm.index), `${k}-p${cursor}`))
      const inner = mm[1] ?? mm[2]
      pieces.push(
        applyMarks(isolateLatin(inner, `${k}-m${mm.index}`), [mm[1] ? 'b' : 'code'], `${k}-m${mm.index}`)
      )
      cursor = mm.index + mm[0].length
    }
    if (pieces.length) {
      if (cursor < text.length) pieces.push(isolateLatin(text.slice(cursor), `${k}-pz`))
      nodes.push(<span key={k}>{applyMarks(pieces, marks, k)}</span>)
    } else {
      nodes.push(<span key={k}>{applyMarks(isolateLatin(text, k), marks, k)}</span>)
    }
    buffer = ''
  }

  let last = 0
  let m
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(raw))) {
    buffer += raw.slice(last, m.index)
    last = TAG_RE.lastIndex
    flush()
    const tag = m[2].toLowerCase()
    const mark = tag === 'strong' ? 'b' : tag === 'em' ? 'i' : tag
    if (m[1]) {
      const at = marks.lastIndexOf(mark)
      if (at >= 0) marks.splice(at, 1)
    } else {
      marks.push(mark)
    }
  }
  buffer += raw.slice(last)
  flush()
  return nodes
}

/** Block pass: <br><br> / blank line = paragraph, <br> / newline = line. */
function toBlocks(raw) {
  return String(raw)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/?\s*(?:p|div|span)[^>]*>/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const groups = []
      for (const line of lines) {
        const isBullet = BULLET_RE.test(line)
        const ordered = ORDERED_RE.test(line)
        const text = isBullet ? line.replace(BULLET_RE, '') : line
        const prev = groups[groups.length - 1]
        if (isBullet && prev?.kind === 'list' && prev.ordered === ordered) prev.items.push(text)
        else if (isBullet) groups.push({ kind: 'list', ordered, items: [text] })
        else groups.push({ kind: 'line', text })
      }
      return groups
    })
}

export default function RichText({ text, dir = 'ltr', className = '', style, as: Tag = 'div' }) {
  const blocks = useMemo(() => (text ? toBlocks(text) : []), [text])
  if (!blocks.length) return null

  const rtl = dir === 'rtl'

  /** Flip a line's direction when its script disagrees with the block's. */
  const lineDir = (t) => {
    const ratio = latinRatio(t)
    if (rtl && ratio > 0.6) return 'ltr'
    if (!rtl && ratio < 0.4) return 'rtl'
    return null
  }

  return (
    <Tag className={`grammar-rt ${className}`} dir={dir} style={style}>
      {blocks.map((groups, bi) => (
        <div className="grammar-rt-block" key={`b${bi}`}>
          {groups.map((g, gi) => {
            const key = `b${bi}-g${gi}`
            if (g.kind === 'list') {
              const ListTag = g.ordered ? 'ol' : 'ul'
              return (
                <ListTag className={g.ordered ? 'grammar-rt-ol' : 'grammar-rt-ul'} key={key}>
                  {g.items.map((item, ii) => {
                    const d = lineDir(item)
                    const body = parseInline(item, `${key}-${ii}`)
                    // Direction goes on an inner isolate, not the <li>: flipping
                    // the li would move its bullet to the other side and leave
                    // the list with markers on both edges.
                    return (
                      <li className={g.ordered ? 'grammar-rt-oli' : 'grammar-rt-li'} key={`${key}-${ii}`}>
                        {d ? <bdi dir={d}>{body}</bdi> : body}
                      </li>
                    )
                  })}
                </ListTag>
              )
            }
            // A line that is nothing but italics is an example sentence —
            // authors use <i>…</i> for those. Give it its own quiet treatment.
            const isExample = /^(?:\s*<\s*i\s*>[\s\S]*?<\s*\/\s*i\s*>\s*[··,;/|]*\s*)+$/i.test(g.text)
            const d = lineDir(g.text)
            return (
              <div
                className={`grammar-rt-line${isExample ? ' grammar-rt-eg' : ''}`}
                key={key}
                dir={d || undefined}
              >
                {parseInline(g.text, key)}
              </div>
            )
          })}
        </div>
      ))}
    </Tag>
  )
}
