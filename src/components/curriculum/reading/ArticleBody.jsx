import { memo, useMemo } from 'react'

// Reading editorial rebuild — single-column magazine body.
// Readex Pro 18px / line-height 1.85 / max-width 38rem / drop cap / paragraph
// rhythm. EVERY word is a tappable button (styled as inline text); punctuation
// and whitespace render as plain text. Vocab words (in vocabIndex) get a subtle
// 1px gold dotted underline — no badges, no color, no icons.
const TOKEN_RE = /([\p{L}\p{M}'-]+)|([^\p{L}\p{M}'-]+)/gu

function ArticleBody({ paragraphs, vocabIndex, onWordTap }) {
  const paras = Array.isArray(paragraphs) ? paragraphs : []

  // Type-safe vocab lookup. `vocabIndex` SHOULD be the Map from
  // useArticleVocabIndex, but the persisted React Query cache (main.jsx) serializes
  // a Map to a plain `{}` on reload, so on the rehydrated path it arrives as an
  // object/array/null with no `.has`/`.get` — which crashed reading with
  // "s?.has is not a function". Normalize ANY incoming shape to a real Map<string,row>
  // once, so both the underline check (.has) and the popup lookup (.get) are safe.
  const vocabMap = useMemo(() => {
    const s = vocabIndex
    if (s instanceof Map) return s
    const out = new Map()
    const put = (key, val) => {
      if (key == null) return
      const k = String(key).toLowerCase()
      if (k) out.set(k, val ?? null)
    }
    if (s instanceof Set) {
      s.forEach((w) => put(w, null))
    } else if (Array.isArray(s)) {
      s.forEach((w) =>
        typeof w === 'string' ? put(w, null) : put(w?.word ?? w?.word_en, w),
      )
    } else if (s && typeof s === 'object') {
      // `{data: ...}` query-wrapper, or a plain object keyed by word
      // (incl. the rehydrated-Map `{}` case — yields an empty Map, never crashes).
      const inner = s.data
      if (inner instanceof Map) return inner
      const src = inner && typeof inner === 'object' ? inner : s
      if (Array.isArray(src)) {
        src.forEach((w) =>
          typeof w === 'string' ? put(w, null) : put(w?.word ?? w?.word_en, w),
        )
      } else {
        Object.entries(src).forEach(([k, v]) =>
          put(k, v && typeof v === 'object' ? v : null),
        )
      }
    }
    return out
  }, [vocabIndex])

  const handleTap = (e, word) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onWordTap(word, rect, vocabMap.get(word.toLowerCase()) || null)
  }

  return (
    <div dir="ltr" className="article-body mx-auto" style={{ maxWidth: '38rem', padding: '0 1.5rem' }}>
      <style>{`
        .article-body { font-family: 'Readex Pro', sans-serif; }
        .article-body p {
          font-weight: 350; font-size: 18px; line-height: 1.85;
          color: var(--ds-ink-primary, var(--ds-text-primary, #e7ecf3));
          margin: 0 0 1.6em 0;
        }
        .article-body p.aw-first::first-letter {
          font-family: 'Cormorant Garamond', 'Playfair Display', serif;
          font-size: 56px; line-height: 1; float: left;
          padding: 4px 8px 0 0; color: var(--ds-accent-primary, #e9b949);
        }
        .article-body .aw {
          display: inline; padding: 0 1px; margin: 0; border: 0; background: transparent;
          font: inherit; color: inherit; cursor: pointer; border-radius: 3px;
          transition: background-color 120ms ease;
        }
        .article-body .aw:hover { background: color-mix(in oklab, var(--ds-accent-primary, #e9b949) 8%, transparent); }
        .article-body .aw:active { background: color-mix(in oklab, var(--ds-accent-primary, #e9b949) 18%, transparent); }
        .article-body .aw:focus-visible { outline: 2px solid var(--ds-accent-primary, #e9b949); outline-offset: 2px; }
        .article-body .aw-vocab { border-bottom: 1px dotted var(--ds-accent-primary, #e9b949); padding-bottom: 1px; }
      `}</style>

      {paras.map((para, pi) => {
        // Passage text uses *word* markers to emphasise vocab — strip the
        // asterisks (the dotted underline comes from vocabIndex instead).
        const clean = (para || '').replace(/\*/g, '')
        const segments = []
        let m
        TOKEN_RE.lastIndex = 0
        let key = 0
        while ((m = TOKEN_RE.exec(clean)) !== null) {
          if (m[1]) {
            const word = m[1]
            const isVocab = vocabMap.has(word.toLowerCase())
            segments.push(
              <button
                key={key++}
                type="button"
                className={isVocab ? 'aw aw-vocab' : 'aw'}
                data-w={word}
                aria-label={`${word}، اضغط لسماع النطق والترجمة`}
                onClick={(e) => handleTap(e, word)}
              >
                {word}
              </button>,
            )
          } else {
            segments.push(<span key={key++}>{m[2]}</span>)
          }
        }
        return (
          <p key={pi} className={pi === 0 ? 'aw-first' : undefined}>
            {segments}
          </p>
        )
      })}
    </div>
  )
}

export default memo(ArticleBody)
