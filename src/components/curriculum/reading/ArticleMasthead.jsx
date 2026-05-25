import { Settings2 } from 'lucide-react'

// Reading editorial rebuild — the "you opened a piece" moment.
// Cormorant Garamond is NOT loaded in this app; per the prompt's no-new-deps /
// no-global-CSS rules we use the already-loaded Playfair Display (italic) for the
// editorial English title, Amiri for the Arabic title, Space Grotesk for the
// eyebrow + meta numerals, Readex Pro for the deck.
function firstSentence(paragraphs) {
  const first = Array.isArray(paragraphs) ? paragraphs[0] : ''
  if (!first) return ''
  const m = first.match(/^.*?[.!?](\s|$)/)
  const s = (m ? m[0] : first).trim()
  return s.length > 120 ? s.slice(0, 117).trimEnd() + '…' : s
}

const GOLD = 'var(--ds-accent-primary, #e9b949)'

export default function ArticleMasthead({
  reading,
  levelNumber,
  unitNumber,
  vocabCount = 0,
  readingTime,
  cefr,
  onOpenTools,
}) {
  const deck = firstSentence(reading?.passage_content?.paragraphs)
  const eyebrowParts = [
    reading?.reading_label ? reading.reading_label : null,
    Number.isFinite(levelNumber) ? `LEVEL ${levelNumber}` : null,
    Number.isFinite(unitNumber) ? `UNIT ${unitNumber}` : null,
  ].filter(Boolean)

  const Dot = () => <span style={{ color: GOLD, opacity: 0.7, margin: '0 8px' }}>·</span>

  return (
    <header className="relative" dir="rtl">
      {/* Eyebrow + tools button */}
      <div className="flex items-center justify-between gap-3">
        <div
          dir="ltr"
          style={{
            fontFamily: "'Space Grotesk', monospace",
            fontSize: 11,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: GOLD,
            opacity: 0.85,
          }}
        >
          {eyebrowParts.length > 0 ? eyebrowParts.join('  ·  ') : 'READING'}
        </div>
        <button
          type="button"
          onClick={onOpenTools}
          aria-label="أدوات القراءة"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-['Tajawal'] transition-colors"
          style={{ color: 'var(--ds-text-tertiary, #64748b)', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}
        >
          <Settings2 size={14} />
          أدوات
        </button>
      </div>

      {/* Titles */}
      <h1
        dir="ltr"
        className="mt-4"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 'clamp(32px, 7vw, 44px)',
          lineHeight: 1.02,
          color: 'var(--ds-text-primary, #f8fafc)',
        }}
      >
        {reading?.title_en}
      </h1>
      {reading?.title_ar && (
        <h2
          className="mt-1.5"
          style={{
            fontFamily: "'Amiri', serif",
            fontWeight: 700,
            fontSize: 'clamp(24px, 5.5vw, 34px)',
            lineHeight: 1.15,
            color: GOLD,
          }}
        >
          {reading.title_ar}
        </h2>
      )}

      {/* Deck / standfirst */}
      {deck && (
        <p
          dir="ltr"
          className="mt-4"
          style={{
            fontFamily: "'Readex Pro', sans-serif",
            fontStyle: 'italic',
            fontSize: 'clamp(15px, 3.6vw, 17px)',
            lineHeight: 1.5,
            color: 'var(--ds-text-secondary, #94a3b8)',
            maxWidth: '34rem',
          }}
        >
          {deck}
        </p>
      )}

      {/* Meta strip */}
      <div
        dir="ltr"
        className="mt-5 flex items-center flex-wrap"
        style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: 11,
          letterSpacing: '0.4px',
          color: 'var(--ds-text-tertiary, #64748b)',
        }}
      >
        {readingTime ? <span>{readingTime} min read</span> : null}
        {readingTime && vocabCount ? <Dot /> : null}
        {vocabCount ? <span>{vocabCount} vocabulary words</span> : null}
        {cefr ? <Dot /> : null}
        {cefr ? <span style={{ color: GOLD }}>★ {cefr}</span> : null}
      </div>

      <div className="mt-6 h-px w-full" style={{ background: 'var(--ds-border-subtle, rgba(255,255,255,0.08))' }} />
    </header>
  )
}
