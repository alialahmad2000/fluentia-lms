// «دفتر زوّار المكتبة» — the Library guestbook. A warm in-room card at the foot of
// the shelves opens a small panel: brass-seal rating (1–5 ✦) + thoughts + suggestions.
// Writes library_feedback (RLS: student inserts as themselves; staff read all).
import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Feather, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore, useAuthProfileId } from '../../../stores/authStore'
import { useG } from '../../../i18n/gender'

const SEAL_WORDS = { 1: 'تحتاج شغل', 2: 'لا بأس', 3: 'حلوة', 4: 'ممتازة', 5: 'تحفة' }

export default function Guestbook() {
  const g = useG()
  const myId = useAuthProfileId()
  const myName = useAuthStore((s) => s.profile?.display_name || s.profile?.full_name || null)

  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [thoughts, setThoughts] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const openBook = () => {
    setRating(0); setThoughts(''); setSuggestion(''); setError(null); setDone(false)
    setOpen(true)
  }
  const close = useCallback(() => { if (!sending) setOpen(false) }, [sending])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const submit = async () => {
    if (!rating && !thoughts.trim() && !suggestion.trim()) {
      setError(g('اختر تقييمًا أو اكتب لنا شيئًا قبل الإرسال', 'اختاري تقييمًا أو اكتبي لنا شيئًا قبل الإرسال'))
      return
    }
    setSending(true); setError(null)
    const { error: err } = await supabase.from('library_feedback').insert({
      student_id: myId,
      student_name: myName,
      rating: rating || null,
      thoughts: thoughts.trim() || null,
      suggestion: suggestion.trim() || null,
    })
    setSending(false)
    if (err) { setError(g('تعذّر الإرسال الآن — حاول بعد قليل', 'تعذّر الإرسال الآن — حاولي بعد قليل')); return }
    setDone(true)
  }

  return (
    <>
      <div className="lib-gb-wrap">
        <button type="button" className="lib-gb-card" onClick={openBook}>
          <span className="lib-gb-icon"><Feather size={20} /></span>
          <span className="lib-gb-text">
            <span className="t">دفتر زوّار المكتبة</span>
            <span className="s">{g('شاركنا رأيك واقتراحاتك — نقرأ كل كلمة', 'شاركينا رأيك واقتراحاتك — نقرأ كل كلمة')}</span>
          </span>
          <span className="lib-gb-seal-hint" aria-hidden="true">✦</span>
        </button>
      </div>

      {open && createPortal(
        <div className="lib-gb-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="دفتر زوّار المكتبة" dir="rtl">
          <div className="lib-gb-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lib-gb-close" onClick={close} aria-label="إغلاق"><X size={18} /></button>

            {done ? (
              <div className="lib-gb-done">
                <span className="lib-gb-stamp" aria-hidden="true">✦</span>
                <h3>{g('وصلنا رأيك — شكرًا لك', 'وصلنا رأيك — شكرًا لكِ')}</h3>
                <p>كل اقتراح يُقرأ بعناية، وأفضل الأفكار تتحوّل إلى روايات وميزات في مكتبة طلاقة.</p>
                <button type="button" className="lib-gb-submit" onClick={close}>{g('ارجع للمكتبة', 'ارجعي للمكتبة')}</button>
              </div>
            ) : (
              <>
                <div className="lib-gb-head">
                  <h3>دفتر زوّار المكتبة</h3>
                  <p>{g('رأيك يرسم شكل المكتبة القادم', 'رأيكِ يرسم شكل المكتبة القادم')}</p>
                </div>

                <div className="lib-gb-field">
                  <label>وش تقييمك للمكتبة؟</label>
                  <div className="lib-gb-seals" role="radiogroup" aria-label="التقييم">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={rating === n}
                        className="lib-gb-seal" data-on={n <= rating || undefined}
                        onClick={() => setRating(n === rating ? 0 : n)} aria-label={`${n} من 5`}>
                        ✦
                      </button>
                    ))}
                    <span className="lib-gb-seal-word">{rating ? SEAL_WORDS[rating] : ''}</span>
                  </div>
                </div>

                <div className="lib-gb-field">
                  <label>{g('وش رأيك بالمكتبة؟', 'وش رأيكِ بالمكتبة؟')}</label>
                  <textarea rows={3} value={thoughts} onChange={(e) => setThoughts(e.target.value)} maxLength={2000}
                    placeholder={g('اكتب لنا اللي حبيته واللي تتمنى يتحسّن…', 'اكتبي لنا اللي حبيتيه واللي تتمنين يتحسّن…')} />
                </div>

                <div className="lib-gb-field">
                  <label>عندك اقتراح؟</label>
                  <textarea rows={3} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} maxLength={2000}
                    placeholder={g('روايات أو أفكار تبي تشوفها هنا…', 'روايات أو أفكار تبين تشوفينها هنا…')} />
                </div>

                {error && <div className="lib-gb-error">{error}</div>}

                <div className="lib-gb-actions">
                  <button type="button" className="lib-gb-submit" onClick={submit} disabled={sending}>
                    {sending ? 'جاري الإرسال…' : g('أرسل رأيك', 'أرسلي رأيك')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
