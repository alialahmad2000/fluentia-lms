import { memo } from 'react'

// Reading editorial rebuild — single-column magazine body.
// Readex Pro 18px / line-height 1.85 / max-width 38rem / drop cap / paragraph
// rhythm. EVERY word is a tappable button (styled as inline text); punctuation
// and whitespace render as plain text. Vocab words (in vocabIndex) get a subtle
// 1px gold dotted underline — no badges, no color, no icons.
const TOKEN_RE = /([\p{L}\p{M}'-]+)|([^\p{L}\p{M}'-]+)/gu

function ArticleBody({ paragraphs, vocabIndex, onWordTap }) {
  const paras = Array.isArray(paragraphs) ? paragraphs : []

  const handleTap = (e, word) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onWordTap(word, rect, vocabIndex?.get(word.toLowerCase()) || null)
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
            const isVocab = vocabIndex?.has(word.toLowerCase())
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
