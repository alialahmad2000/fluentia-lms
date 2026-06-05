import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Bug, RefreshCw, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import BugReplyPanel from '@/components/bug-report/BugReplyPanel'
import { PROBLEM_TYPES, problemTypeById, severityById } from '../../lib/bugReportTaxonomy'

const STATUS = {
  new:         { label: 'جديد',        color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  in_progress: { label: 'قيد العمل',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  resolved:    { label: 'تم الحل',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  wontfix:     { label: 'لن يُعالَج',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}
const FILTERS = [['all', 'الكل'], ['new', 'جديد'], ['in_progress', 'قيد العمل'], ['resolved', 'تم الحل']]

function Chip({ children, color = '#94a3b8', solid = false }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold"
      style={{
        color: solid ? '#06121f' : color,
        background: solid ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 36%, transparent)`,
        fontFamily: "'Tajawal',sans-serif",
      }}>
      {children}
    </span>
  )
}

// The structured "where + what + how bad" the student picked, rendered as chips.
function ContextChips({ ctx }) {
  if (!ctx) return null
  const pt = ctx.problem_type ? (problemTypeById(ctx.problem_type) || { label: ctx.problem_type_label, emoji: '' }) : null
  const sev = ctx.severity ? (severityById(ctx.severity) || null) : null
  const hasAny = ctx.area_label || pt || sev
  if (!hasAny) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-2">
      {ctx.area_label && (
        <Chip color="#38bdf8">📍 {ctx.area_label}{ctx.subsection_label ? ` › ${ctx.subsection_label}` : ''}</Chip>
      )}
      {pt && <Chip color="#fbbf24">{pt.emoji} {pt.label || ctx.problem_type_label}</Chip>}
      {sev && <Chip color={sev.color}>{sev.emoji} {sev.label}</Chip>}
    </div>
  )
}

function Screenshot({ path }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const view = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.storage.from('bug-screenshots').createSignedUrl(path, 3600)
    setLoading(false)
    if (data?.signedUrl) { setUrl(data.signedUrl); window.open(data.signedUrl, '_blank') }
    else toast({ type: 'error', title: 'تعذّر فتح الصورة' })
  }, [path])
  if (!path) return null
  return (
    <button type="button" onClick={view}
      className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-lg"
      style={{ color: '#7dd3fc', background: 'rgba(56,189,248,0.1)', fontFamily: "'Tajawal',sans-serif" }}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
      عرض الصورة
    </button>
  )
}

export default function AdminBugReports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(500)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data, error } = await q
    setLoading(false)
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل البلاغات', description: error.message }); return }
    setRows(data || [])
  }, [filter])

  useEffect(() => { load() }, [load])

  // Problem-type filter is applied client-side off device_info.context.
  const visibleRows = useMemo(() => {
    if (typeFilter === 'all') return rows
    return rows.filter((r) => r.device_info?.context?.problem_type === typeFilter)
  }, [rows, typeFilter])

  // Only show type chips that actually appear in the loaded set (keeps the bar tidy).
  const presentTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.device_info?.context?.problem_type).filter(Boolean))
    return PROBLEM_TYPES.filter((p) => set.has(p.id))
  }, [rows])

  const setStatus = async (id, status) => {
    const patch = { status }
    if (status === 'resolved' || status === 'wontfix') {
      const { data: { user } } = await supabase.auth.getUser()
      patch.resolved_at = new Date().toISOString()
      patch.resolved_by = user?.id || null
    }
    const { error } = await supabase.from('bug_reports').update(patch).eq('id', id)
    if (error) { toast({ type: 'error', title: 'تعذّر التحديث', description: error.message }); return }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    toast({ type: 'success', title: 'تم تحديث الحالة' })
  }

  const fmt = (ts) => { try { return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return ts } }

  return (
    <div dir="rtl" className="space-y-6" style={{ fontFamily: "'Tajawal',sans-serif" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.14)', color: '#38bdf8' }}>
            <Bug size={22} />
          </div>
          <div>
            <h1 className="text-page-title" style={{ color: 'var(--text-primary,#f8fafc)', fontWeight: 800 }}>بلاغات المشاكل</h1>
            <p style={{ color: 'var(--text-tertiary,#64748b)', fontSize: 13 }}>ما يرسله الطلاب من مشاكل ومقترحات</p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm"
          style={{ background: 'var(--surface-raised,rgba(255,255,255,0.04))', color: 'var(--text-secondary,#cbd5e1)', border: '1px solid var(--border-default,rgba(255,255,255,0.08))' }}>
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
            style={{
              background: filter === id ? 'rgba(56,189,248,0.16)' : 'var(--surface-raised,rgba(255,255,255,0.04))',
              color: filter === id ? '#38bdf8' : 'var(--text-tertiary,#94a3b8)',
              border: `1px solid ${filter === id ? 'rgba(56,189,248,0.4)' : 'transparent'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Problem-type filters (only types present in the loaded set) */}
      {presentTypes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setTypeFilter('all')}
            className="px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              background: typeFilter === 'all' ? 'rgba(251,191,36,0.16)' : 'transparent',
              color: typeFilter === 'all' ? '#fbbf24' : 'var(--text-tertiary,#94a3b8)',
              border: `1px solid ${typeFilter === 'all' ? 'rgba(251,191,36,0.4)' : 'var(--border-default,rgba(255,255,255,0.08))'}`,
            }}>
            كل الأنواع
          </button>
          {presentTypes.map((p) => (
            <button key={p.id} type="button" onClick={() => setTypeFilter(p.id)}
              className="px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
              style={{
                background: typeFilter === p.id ? 'rgba(251,191,36,0.16)' : 'transparent',
                color: typeFilter === p.id ? '#fbbf24' : 'var(--text-tertiary,#94a3b8)',
                border: `1px solid ${typeFilter === p.id ? 'rgba(251,191,36,0.4)' : 'var(--border-default,rgba(255,255,255,0.08))'}`,
              }}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin" style={{ color: '#38bdf8' }} /></div>
      ) : visibleRows.length === 0 ? (
        <div className="py-20 text-center" style={{ color: 'var(--text-tertiary,#64748b)' }}>
          <Bug size={40} className="mx-auto mb-3 opacity-40" />
          لا توجد بلاغات {filter !== 'all' || typeFilter !== 'all' ? 'بهذا الفلتر' : 'بعد'}.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((r) => {
            const st = STATUS[r.status] || STATUS.new
            const di = r.device_info || {}
            return (
              <div key={r.id} className="rounded-2xl p-4"
                style={{ background: 'var(--surface-raised,rgba(255,255,255,0.03))', border: '1px solid var(--border-default,rgba(255,255,255,0.08))' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                    <span style={{ color: 'var(--text-secondary,#cbd5e1)', fontWeight: 700 }}>{r.reporter_name || 'طالب'}</span>
                    <span>·</span><span>{r.reporter_role || ''}</span>
                    <span>·</span><span>{fmt(r.created_at)}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>

                {/* Structured context chips */}
                <div className="mt-2.5">
                  <ContextChips ctx={di.context} />
                </div>

                <p className="mt-1" style={{ color: 'var(--text-primary,#f8fafc)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {r.description}
                </p>

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {r.page_url && (
                    <a href={r.page_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-lg"
                      style={{ color: '#7dd3fc', background: 'rgba(56,189,248,0.1)', maxWidth: 360 }}>
                      <ExternalLink size={13} /><span className="truncate">{r.page_url.replace(/^https?:\/\/[^/]+/, '')}</span>
                    </a>
                  )}
                  <Screenshot path={r.screenshot_path} />
                  {(di.viewport || di.appVersion) && (
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary,#64748b)' }}>
                      {[
                        di.viewport,
                        (di.platform || '').slice(0, 24),
                        di.appVersion ? `v${di.appVersion}` : null,
                        di.standalone ? 'PWA' : 'متصفح',
                        di.online === false ? 'غير متصل' : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>

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

                <BugReplyPanel reportId={r.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
