import { memo, useMemo } from 'react'

// Reading editorial rebuild — single-column magazine body.
// Readex Pro 18px / line-height 1.85 / max-width 38rem / drop cap / paragraph
// rhythm. EVERY word is a tappable button (styled as inline text); punctuation
// and whitespace render as plain text. Vocab words (in vocabIndex) get a subtle
// 1px gold dotted underline — no badges, no color, no icons.
const TOKEN_RE = /([\p{L}\p{M}'-]+)|([^\p{L}\p{M}'-]+)/gu

// Normalize a tapped token to its glossary key: lowercase + strip leading/trailing
// non-letters (quotes, hyphens, stray punctuation) while keeping internal ' and -.
// MUST stay identical to the seed pipeline + useArticleVocabIndex so lookups hit.
const normWord = (w) => (w || '').toLowerCase().replace(/^[^\p{L}]+/u, '').replace(/[^\p{L}]+$/u, '')

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

  // A target word is marked on its FIRST appearance only. Measured on the live
  // L0 article, marking every occurrence produced 27 gold runs for 16 target
  // words ("people" four times, "day" three) — repetition that adds noise
  // without adding information, and contradicts the masthead's count. Later
  // occurrences stay fully tappable, just unmarked.
  const seenVocab = new Set()

  const handleTap = (e, word) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onWordTap(word, rect, vocabMap.get(normWord(word)) || null)
  }

  return (
    // lang="en" matters: the document is lang="ar", so without this VoiceOver and
    // iOS Speak Screen read the English article with Arabic phonemes — inside an
    // English-learning product. It also unlocks English hyphenation.
    <div dir="ltr" lang="en" className="article-body mx-auto" style={{ maxWidth: '37rem' }}>
      <style>{`
        /* NO horizontal padding here. The card already provides the gutter; the
           old 1.5rem nested inside it and collapsed the mobile column to 228px
           (~25 characters per line, against a 45–75 target). */
        .article-body { font-family: 'Readex Pro', sans-serif; hyphens: auto; -webkit-hyphens: auto; }
        .article-body p {
          /* 350 is a dead value — Readex Pro ships static weights only, so this
             snapped to 400 (or 200) depending on the engine. Declare it. */
          font-weight: 400;
          font-size: 19px;
          line-height: 1.7;          /* 32.3px */
          letter-spacing: .002em;
          color: var(--ds-text-primary, #ece7dd);
          /* The gap BETWEEN paragraphs must beat the gap INSIDE them. It was
             28.8px against a 33.3px line gap, so paragraphs never separated. */
          margin: 0 0 2em 0;
          text-wrap: pretty;
        }
        .article-body p:last-child { margin-bottom: 0; }
        @media (max-width: 640px) {
          .article-body p { font-size: 18px; line-height: 1.72; margin-bottom: 1.9em; }
        }

        .article-body .aw {
          display: inline; padding: 0 1px; margin: 0; border: 0; background: transparent;
          font: inherit; color: inherit; cursor: pointer; border-radius: 3px;
          -webkit-tap-highlight-color: transparent;
          transition: background-color 120ms ease, color 120ms ease;
        }
        /* :hover latches after tap on iOS — gate it to real pointers. */
        @media (hover: hover) {
          .article-body .aw:hover { background: rgba(255,255,255,.05); }
        }
        .article-body .aw:active { background: rgba(255,255,255,.08); }
        .article-body .aw:focus-visible { outline: 2px solid var(--ds-accent-primary, #e9b949); outline-offset: 2px; }

        /* Key vocabulary: the student must be able to SEE, at a glance, which
           words this passage is teaching — so they carry the accent colour at
           rest, not only on contact.
           The earlier version was full accent on 59 of 164 words (36%), which
           read as a link farm. That was a DATA bug (a global vocabulary query),
           not a colour bug: with the query scoped to this reading the real
           density is ~9–17 words per passage (5–10%), where full colour is
           exactly the right weight of signal. */
        .article-body .aw-vocab {
          color: var(--ds-accent-primary, #e9b949);
          font-weight: 500;
          text-decoration: underline;
          text-decoration-color: var(--ds-accent-rule, rgba(233,185,73,.42));
          text-decoration-thickness: 1.5px;
          text-underline-offset: 5px;
          text-decoration-skip-ink: auto;
        }
        @media (hover: hover) {
          .article-body .aw-vocab:hover {
            background: var(--ds-accent-wash, rgba(233,185,73,.08));
            text-decoration-color: var(--ds-accent-primary, #e9b949);
          }
        }
        .article-body .aw-vocab:active,
        .article-body .aw-vocab[aria-expanded="true"] {
          background: var(--ds-accent-wash, rgba(233,185,73,.08));
          text-decoration-color: var(--ds-accent-primary, #e9b949);
        }

        /* Drop cap. ::first-letter needs a block-ish box, and the first letter
           lives inside a <button> — so promote that one button to inline-block
           instead of extracting the character (which would cost its tappability). */
        .article-body p.aw-first > .aw:first-of-type { display: inline-block; }
        .article-body p.aw-first > .aw:first-of-type::first-letter {
          font-family: 'Cormorant Garamond', 'Playfair Display', serif;
          font-style: italic;
          font-size: 58px; line-height: .82;
          float: left; padding: 6px 8px 0 0;
          color: var(--ds-accent-primary, #e9b949);
        }
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
            // Mark ONLY this reading's target vocabulary. Glossary-fallback rows
            // (is_vocab !== true) are tappable for a meaning but not marked.
            const key = normWord(word)
            const isVocab = vocabMap.get(key)?.is_vocab === true && !seenVocab.has(key)
            if (isVocab) seenVocab.add(key)
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
          // data-paragraph-index is what focus mode + the progress reader query.
          // The old build emitted it only from PassageDisplay — a fallback branch
          // that never renders — so both features were silently inert.
          <p key={pi} data-paragraph-index={pi} className={pi === 0 ? 'aw-first' : undefined}>
            {segments}
          </p>
        )
      })}
    </div>
  )
}

export default memo(ArticleBody)
