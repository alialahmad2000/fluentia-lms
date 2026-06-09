import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

// خلاصة المجلس — a warm 10-second AI catch-up of what you missed. A quiet pill in
// the room opens a sheet; د. علي summarises the recent chat (via the majlis-digest
// edge fn) in gender-aware Saudi Arabic.
export default function MajlisDigest({ groupId }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  async function openDigest() {
    setOpen(true)
    if (data || loading) return
    setLoading(true)
    try {
      const { data: res } = await supabase.functions.invoke('majlis-digest', { body: { group_id: groupId } })
      setData(res || { summary_ar: 'تعذّر التلخيص الآن.', points: [] })
    } catch {
      setData({ summary_ar: 'تعذّر التلخيص الآن.', points: [] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 12px' }}>
        <button type="button" onClick={openDigest}
          className="inline-flex items-center gap-1.5 transition-[filter] hover:brightness-110"
          style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, color: 'var(--ds-accent-gold)', padding: '5px 14px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 22%, transparent)', background: 'color-mix(in srgb, var(--ds-accent-gold) 6%, transparent)' }}>
          <Sparkles size={13} /> خلّص لي ما فاتني
        </button>
      </div>

      {open && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} dir="rtl"
            style={{ width: '100%', maxWidth: 468, background: 'linear-gradient(180deg, var(--ds-bg-elevated), var(--ds-bg-base))', borderTop: '1px solid color-mix(in srgb, var(--ds-accent-gold) 14%, var(--ds-border-subtle))', borderRadius: '24px 24px 0 0', padding: '14px 18px max(env(safe-area-inset-bottom), 20px)', boxShadow: '0 -24px 60px -20px rgba(0,0,0,0.85)', maxHeight: '78vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, background: 'var(--ds-border-subtle)', margin: '2px auto 16px' }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2" style={{ color: 'var(--ds-accent-gold)', fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 15 }}>
                <Sparkles size={16} /> خلاصة المجلس
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ color: 'var(--ds-text-muted)' }}><X size={18} /></button>
            </div>

            {loading ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--ds-text-muted)', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
                <Sparkles size={20} className="animate-pulse" style={{ color: 'var(--ds-accent-gold)' }} />
                <div style={{ marginTop: 10 }}>د. علي يلخّص لك ما دار في المجلس…</div>
              </div>
            ) : data ? (
              <>
                <p style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 14.5, lineHeight: 1.85, color: 'var(--ds-text-primary)', marginBottom: (data.points && data.points.length) ? 16 : 0 }}>{data.summary_ar}</p>
                {(data.points || []).map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5 mb-3">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ds-accent-gold)', marginTop: 9, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13.5, lineHeight: 1.75, color: 'var(--ds-text-secondary)' }}>{pt}</span>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
