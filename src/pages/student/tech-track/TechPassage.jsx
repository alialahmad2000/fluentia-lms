// Self-contained tech reading with tap-to-translate: the lesson's key vocab words are
// underlined; tapping one shows its meaning + speaks it (Web Speech). No external deps.
import { useMemo, useState, useCallback } from 'react'
import { Volume2, X } from 'lucide-react'

function norm(w) { return (w || '').toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '') }

function speak(word) {
  try {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'; u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch { /* ignore */ }
}

export default function TechPassage({ title_en, paragraphs = [], vocab = [], accent = '#38bdf8' }) {
  const [active, setActive] = useState(null) // {word, meaning_ar, meaning_en}

  const vmap = useMemo(() => {
    const m = new Map()
    for (const v of vocab) { const k = norm(v.word); if (k) m.set(k, v) }
    return m
  }, [vocab])

  const onTap = useCallback((v) => { setActive(v); speak(v.word) }, [])

  const renderPara = useCallback((text, pi) => {
    const chunks = text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g) || [text]
    return (
      <p key={pi}>
        {chunks.map((c, i) => {
          const v = /^[A-Za-z]/.test(c) ? vmap.get(norm(c)) : null
          if (v) return (
            <span key={i} className="tt-word" role="button" tabIndex={0}
              onClick={() => onTap(v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(v) } }}>
              {c}
            </span>
          )
          return <span key={i}>{c}</span>
        })}
      </p>
    )
  }, [vmap, onTap])

  return (
    <div>
      {title_en && <div className="tt-lp-titleen" style={{ marginBottom: 10, opacity: .85 }}>{title_en}</div>}
      <div className="tt-passage" style={{ '--tt-accent': accent }}>
        {paragraphs.map(renderPara)}
      </div>

      {active && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 79 }} onClick={() => setActive(null)} />
          <div className="tt-wordcard" role="dialog" aria-label={active.word}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="tt-listen" style={{ borderColor: `${accent}66`, color: accent, background: `${accent}1a` }}
                onClick={() => speak(active.word)} aria-label="listen">
                <Volume2 size={18} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span dir="ltr" style={{ fontSize: 19, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: "'Playfair Display', serif" }}>{active.word}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: accent }}>{active.meaning_ar}</span>
                </div>
                {active.meaning_en && <div dir="ltr" style={{ fontSize: 13, color: 'var(--ds-text-secondary)', textAlign: 'left', marginTop: 2 }}>{active.meaning_en}</div>}
              </div>
              <button onClick={() => setActive(null)} aria-label="close" style={{ background: 'transparent', border: 0, color: 'var(--ds-text-tertiary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { speak }
