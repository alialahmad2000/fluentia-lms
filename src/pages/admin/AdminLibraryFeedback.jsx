// Admin triage for the Library guestbook (دفتر زوّار المكتبة) — ratings, thoughts,
// and student suggestions from /library. Mirrors the AdminBugReports patterns.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BookMarked, RefreshCw, Loader2, Lightbulb, MessageSquareQuote } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'

const STATUS = {
  new:  { label: 'جديد',      color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  seen: { label: 'تمت القراءة', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  done: { label: 'نُفِّذ',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}
const FILTERS = [['all', 'الكل'], ['new', 'جديد'], ['seen', 'تمت القراءة'], ['done', 'نُفِّذ']]

function Seals({ n }) {
  if (!n) return null
  return (
    <span style={{ color: '#fbbf24', fontSize: 15, letterSpacing: 2 }} aria-label={`التقييم ${n} من 5`}>
      {'✦'.repeat(n)}<span style={{ color: 'rgba(251,191,36,0.25)' }}>{'✦'.repeat(5 - n)}</span>
    </span>
  )
}

export default function AdminLibraryFeedback() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('library_feedback').select('*').order('created_at', { ascending: false }).limit(500)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    setLoading(false)
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل آراء المكتبة', description: error.message }); return }
    setRows(data || [])
  }, [filter])

  useEffect(() => { load() }, [load])

  const setStatus = async (id, status) => {
    const { data, error } = await supabase.from('library_feedback').update({ status }).eq('id', id).select()
    if (error || !data?.length) { toast({ type: 'error', title: 'تعذّر التحديث', description: error?.message || 'لم يتم العثور على السجل' }); return }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)))
    toast({ type: 'success', title: 'تم تحديث الحالة' })
  }

  const fmt = (ts) => { try { return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return ts } }
  const avg = rows.filter((r) => r.rating).length
    ? (rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.filter((r) => r.rating).length).toFixed(1)
    : null

  return (
    <div dir="rtl" className="space-y-6" style={{ fontFamily: "'Tajawal',sans-serif" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
            <BookMarked size={22} />
          </div>
          <div>
            <h1 className="text-page-title" style={{ color: 'var(--text-primary,#f8fafc)', fontWeight: 800 }}>آراء المكتبة</h1>
            <p style={{ color: 'var(--text-tertiary,#64748b)', fontSize: 13 }}>
              دفتر زوّار مكتبة طلاقة — تقييمات الطلاب واقتراحاتهم
              {avg && <span style={{ color: '#fbbf24', marginInlineStart: 8 }}>متوسط التقييم {avg} / 5</span>}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm"
          style={{ background: 'var(--surface-raised,rgba(255,255,255,0.04))', color: 'var(--text-secondary,#cbd5e1)', border: '1px solid var(--border-default,rgba(255,255,255,0.08))' }}>
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
            style={{
              background: filter === id ? 'rgba(251,191,36,0.16)' : 'var(--surface-raised,rgba(255,255,255,0.04))',
              color: filter === id ? '#fbbf24' : 'var(--text-tertiary,#94a3b8)',
              border: `1px solid ${filter === id ? 'rgba(251,191,36,0.4)' : 'transparent'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin" style={{ color: '#fbbf24' }} /></div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center" style={{ color: 'var(--text-tertiary,#64748b)' }}>
          <BookMarked size={40} className="mx-auto mb-3 opacity-40" />
          لا توجد آراء {filter !== 'all' ? 'بهذه الحالة' : 'بعد'}.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.new
            return (
              <div key={r.id} className="rounded-2xl p-4"
                style={{ background: 'var(--surface-raised,rgba(255,255,255,0.03))', border: '1px solid var(--border-default,rgba(255,255,255,0.08))' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                    <span style={{ color: 'var(--text-secondary,#cbd5e1)', fontWeight: 700 }}>{r.student_name || 'طالب'}</span>
                    <span>·</span><span>{fmt(r.created_at)}</span>
                    {r.rating && (<><span>·</span><Seals n={r.rating} /></>)}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>

                {r.thoughts && (
                  <div className="mt-3 flex items-start gap-2">
                    <MessageSquareQuote size={15} style={{ color: '#7dd3fc', marginTop: 4, flexShrink: 0 }} />
                    <p style={{ color: 'var(--text-primary,#f8fafc)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{r.thoughts}</p>
                  </div>
                )}
                {r.suggestion && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.16)' }}>
                    <Lightbulb size={15} style={{ color: '#fbbf24', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>اقتراح</div>
                      <p style={{ color: 'var(--text-primary,#f8fafc)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{r.suggestion}</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {Object.keys(STATUS).map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(r.id, s)} disabled={r.status === s}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors"
                      style={{
                        background: r.status === s ? STATUS[s].bg : 'transparent',
                        color: r.status === s ? STATUS[s].color : 'var(--text-tertiary,#64748b)',
                        border: `1px solid ${r.status === s ? 'transparent' : 'var(--border-default,rgba(255,255,255,0.08))'}`,
                        cursor: r.status === s ? 'default' : 'pointer',
                      }}>
                      {STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
