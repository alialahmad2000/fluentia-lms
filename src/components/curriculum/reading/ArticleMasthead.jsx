import { Settings2 } from 'lucide-react'

// Reading editorial masthead.
//
// Bidi contract: every element here except the tools button is ENGLISH, so the
// header itself is LTR. Previously it was dir="rtl" and the <h2> inherited it —
// which is why the English subtitle rendered right-aligned with its second line
// jammed against the right edge.
//
// Type contract: ONE display family (Cormorant Garamond italic) for the title
// and the deck, one step apart, the deck in secondary ink. The old masthead ran
// four families in one block, two of them synthesised (Cormorant italic 700 and
// Readex Pro italic are not loaded, so the browser was faking both).

const AR_RE = /[؀-ۿ]/

// Arabic counts agree with the noun, so «3 كلمة» is wrong in a way that reads as
// machine output to a native speaker. Same rule set used elsewhere in the app.
function targetWordsLabel(n) {
  if (n === 1) return 'كلمة واحدة مستهدفة'
  if (n === 2) return 'كلمتان مستهدفتان'
  if (n >= 3 && n <= 10) return `${n} كلمات مستهدفة`
  return `${n} كلمة مستهدفة`
}

function firstSentence(paragraphs) {
  const first = Array.isArray(paragraphs) ? paragraphs[0] : ''
  if (!first) return ''
  const m = first.match(/^.*?[.!?](\s|$)/)
  const s = (m ? m[0] : first).trim()
  return s.length > 120 ? s.slice(0, 117).trimEnd() + '…' : s
}

export default function ArticleMasthead({
  reading,
  levelNumber,
  unitNumber,
  readingTime,
  wordCount,
  targetWordCount = 0,
  cefr,
  onOpenTools,
}) {
  // 144 of 240 readings carry ENGLISH text in `title_ar` — it is a deck, not an
  // Arabic title. Route it by what the string actually contains rather than by
  // what the column is named.
  const rawSub = (reading?.title_ar || '').trim()
  const arabicSubtitle = rawSub && AR_RE.test(rawSub) ? rawSub : ''
  const englishDeck = rawSub && !AR_RE.test(rawSub) ? rawSub : ''
  // Only fall back to the passage's opening line when there is no deck at all —
  // otherwise the deck repeats the first sentence of the article verbatim.
  const deck = englishDeck || (arabicSubtitle ? '' : firstSentence(reading?.passage_content?.paragraphs))

  const eyebrow = [
    reading?.reading_label ? `القراءة ${reading.reading_label}` : null,
    Number.isFinite(levelNumber) ? `المستوى ${levelNumber}` : null,
    Number.isFinite(unitNumber) ? `الوحدة ${unitNumber}` : null,
  ].filter(Boolean).join(' · ')

  const meta = [
    Number.isFinite(wordCount) && wordCount > 0 ? `${wordCount} كلمة` : null,
    readingTime ? `${readingTime} دقيقة قراءة` : null,
    cefr || null,
  ].filter(Boolean).join(' · ')

  return (
    <header className="relative" dir="ltr">
      <div className="flex items-start justify-between gap-3">
        {eyebrow ? (
          <span
            dir="rtl"
            className="inline-flex items-center font-['Tajawal']"
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '.02em',
              color: 'var(--ds-text-secondary, #a8a396)',
              padding: '5px 13px',
              borderRadius: 999,
              border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {eyebrow}
          </span>
        ) : <span />}

        <button
          type="button"
          onClick={onOpenTools}
          aria-label="أدوات القراءة"
          dir="rtl"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full font-['Tajawal'] transition-colors"
          style={{
            minHeight: 44, minWidth: 44, padding: '0 14px', fontSize: 13,
            color: 'var(--ds-text-secondary, #a8a396)',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
          }}
        >
          <Settings2 size={15} />
          أدوات
        </button>
      </div>

      <h1
        className="mt-5"
        style={{
          // 600 is a loaded Cormorant italic weight; 700 was not, so the old
          // masthead rendered a synthesised bold.
          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 'clamp(34px, 6.2vw, 52px)',
          lineHeight: 1.04,
          letterSpacing: '-.01em',
          color: 'var(--ds-text-primary, #ece7dd)',
        }}
      >
        {reading?.title_en}
      </h1>

      {arabicSubtitle && (
        <h2
          dir="rtl"
          className="mt-2"
          style={{
            fontFamily: "'Amiri', serif",
            fontWeight: 700,
            fontSize: 'clamp(21px, 4.4vw, 28px)',
            lineHeight: 1.25,
            color: 'var(--ds-text-secondary, #a8a396)',
          }}
        >
          {arabicSubtitle}
        </h2>
      )}

      {deck && (
        <p
          className="mt-2"
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(19px, 3vw, 25px)',
            lineHeight: 1.32,
            color: 'var(--ds-text-secondary, #a8a396)',
            maxWidth: '30rem',
          }}
        >
          {deck}
        </p>
      )}

      {(meta || targetWordCount > 0) && (
        <div dir="rtl" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-['Tajawal']">
          {meta && (
            <span style={{ fontSize: 12.5, letterSpacing: '.02em', color: 'var(--ds-text-tertiary, #8b8578)' }}>
              {meta}
            </span>
          )}
          {/* The key that makes the gold in the body legible as meaning: the
              chip is styled EXACTLY like a marked word, so the student connects
              «هذه كلماتك» to what they see in the passage without being told. */}
          {targetWordCount > 0 && (
            <span
              className="inline-flex items-center"
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: 'var(--ds-accent-primary, #e9b949)',
                textDecoration: 'underline',
                textDecorationColor: 'var(--ds-accent-rule, rgba(233,185,73,.42))',
                textDecorationThickness: '1.5px',
                textUnderlineOffset: '5px',
              }}
            >
              {targetWordsLabel(targetWordCount)}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 h-px w-full" style={{ background: 'var(--ds-border-subtle, rgba(255,255,255,0.06))' }} />
    </header>
  )
}
