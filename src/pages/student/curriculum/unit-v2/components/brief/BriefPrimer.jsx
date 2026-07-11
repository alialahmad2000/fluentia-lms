import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Headphones } from 'lucide-react'

/**
 * BriefPrimer — "دقيقة قبل ما تبدأ": a bilingual spoken primer that pre-teaches the
 * unit's core idea + key English terms (Arabic coach + English model voice) so a weak
 * learner walks in already understanding. Rendered ONLY when the unit has a primer,
 * so it is invisible on every other unit / student.
 *
 * Self-contained: one <audio> element, gesture-driven play (iOS-safe), gold progress.
 * Masculine Arabic (this surface currently ships to a male student).
 */
export default function BriefPrimer({ unit }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [pct, setPct] = useState(0)
  const [showText, setShowText] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setPct(a.duration ? (a.currentTime / a.duration) * 100 : 0)
    const onEnd = () => { setPlaying(false); setPct(0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    a.addEventListener('pause', () => setPlaying(false))
    a.addEventListener('play', () => setPlaying(true))
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play().catch(() => {}) } else { a.pause() }
  }

  const GOLD = 'var(--ds-accent-gold, #e9b949)'

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(233, 185, 73, 0.10), rgba(233, 185, 73, 0.02))',
      border: '1px solid rgba(233, 185, 73, 0.24)',
      borderRight: `4px solid ${GOLD}`,
      borderRadius: '18px',
      padding: 'clamp(18px, 4vw, 26px)',
      fontFamily: "'Tajawal', sans-serif",
    }} dir="rtl">
      <div style={{
        fontSize: '11px', fontWeight: 700, color: GOLD, letterSpacing: '1.5px',
        textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <Headphones size={14} /> استمع أوّلاً · دقيقة تجهّزك
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'إيقاف' : 'تشغيل'}
          style={{
            flexShrink: 0, width: '56px', height: '56px', borderRadius: '50%', border: 'none',
            cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#1a1204',
            background: `linear-gradient(160deg, #f7cf72, ${GOLD})`,
            boxShadow: `0 8px 22px -8px rgba(233,185,73,0.7), inset 0 1px 0 rgba(255,255,255,0.4)`,
          }}
        >
          {playing ? <Pause size={24} fill="#1a1204" /> : <Play size={24} fill="#1a1204" style={{ marginRight: '-3px' }} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(15px, 3vw, 18px)', fontWeight: 700, color: 'var(--ds-text-primary)', marginBottom: '4px' }}>
            قبل ما تبدأ — اسمع الكلمات المفتاحية
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ds-text-tertiary)' }}>
            بالعربي والإنجليزي، على مهلك — عشان الدرس يصير سهل.
          </div>
          <div style={{
            marginTop: '12px', height: '5px', borderRadius: '5px', overflow: 'hidden',
            background: 'rgba(233,185,73,0.14)',
          }}>
            <div style={{ height: '100%', width: `${pct}%`, background: GOLD, borderRadius: '5px', transition: 'width 0.15s linear' }} />
          </div>
        </div>
      </div>

      {unit.primer_text && (
        <>
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            style={{
              marginTop: '14px', background: 'none', border: 'none', cursor: 'pointer',
              color: GOLD, fontSize: '12.5px', fontWeight: 600, fontFamily: "'Tajawal', sans-serif", padding: 0,
            }}
          >
            {showText ? 'إخفاء النص' : 'اعرض النص'}
          </button>
          {showText && (
            <p style={{
              marginTop: '10px', marginBottom: 0, fontSize: '14px', lineHeight: 1.95,
              color: 'var(--ds-text-secondary)', unicodeBidi: 'plaintext',
              borderTop: '1px solid rgba(233,185,73,0.14)', paddingTop: '12px',
            }}>
              {unit.primer_text}
            </p>
          )}
        </>
      )}

      <audio ref={audioRef} src={unit.primer_audio_url} preload="none" playsInline style={{ display: 'none' }} />
    </div>
  )
}
