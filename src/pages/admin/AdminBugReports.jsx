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
  const [latestMsg, setLatestMsg] = useState({})      // report_id → newest message {sender_role}
  const [studentCount, setStudentCount] = useState({}) // report_id → # of student messages
  const [refreshTick, setRefreshTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    let q = supabase.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(500)
    if (filter !== 'all') q = q.eq('status', filter)
    // Load reports AND all messages together so we can sort/flag by conversation activity.
    const [{ data, error }, { data: msgs }] = await Promise.all([
      q,
      supabase.from('bug_report_messages').select('report_id, sender_role, created_at').order('created_at', { ascending: false }),
    ])
    setLoading(false)
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل البلاغات', description: error.message }); return }
    const latest = {}, counts = {}
    for (const m of msgs || []) {
      if (!latest[m.report_id]) latest[m.report_id] = m // newest-first list → first seen = latest
      if (m.sender_role !== 'admin' && m.sender_role !== 'trainer') counts[m.report_id] = (counts[m.report_id] || 0) + 1
    }
    setLatestMsg(latest)
    setStudentCount(counts)
    setRows(data || [])
    setRefreshTick((t) => t + 1)
  }, [filter])

  useEffect(() => { load() }, [load])

  // Force EVERY device to wipe its cache + re-download the latest build on its
  // next app-open (covers "we fixed it but their phone still runs old code").
  const [forcing, setForcing] = useState(false)
  const handleForceRefresh = useCallback(async () => {
    if (!window.confirm('إجبار جميع الأجهزة على مسح الكاش وتحميل أحدث نسخة عند فتح التطبيق القادم؟ (يُنصح به بعد إصلاح مهم)')) return
    setForcing(true)
    const { error } = await supabase.rpc('bump_force_refresh')
    setForcing(false)
    if (error) { toast({ type: 'error', title: 'تعذّر التنفيذ', description: error.message }); return }
    toast({ type: 'success', title: 'تم ✅ كل جهاز سيُحدّث نفسه عند فتح التطبيق القادم' })
  }, [])
  // Poll every 12s so a new student message surfaces without a manual refresh.
  useEffect(() => {
    const id = setInterval(load, 12000)
    return () => clearInterval(id)
  }, [load])

  // A report "needs you" when the student spoke last, or marked it still-broken.
  const awaiting = useCallback((r) => {
    if (r.reporter_status === 'still_broken') return true
    const m = latestMsg[r.id]
    return !!(m && m.sender_role !== 'admin' && m.sender_role !== 'trainer')
  }, [latestMsg])
  const activityTs = (r) => new Date(r.last_reply_at || r.created_at).getTime()

  // Problem-type filter (client-side) + sort: still-broken → awaiting your reply → newest activity.
  const visibleRows = useMemo(() => {
    const base = typeFilter === 'all' ? rows : rows.filter((r) => r.device_info?.context?.problem_type === typeFilter)
    return [...base].sort((a, b) => {
      const ab = a.reporter_status === 'still_broken' ? 1 : 0, bb = b.reporter_status === 'still_broken' ? 1 : 0
      if (ab !== bb) return bb - ab
      const aw = awaiting(a) ? 1 : 0, bw = awaiting(b) ? 1 : 0
      if (aw !== bw) return bw - aw
      return activityTs(b) - activityTs(a)
    })
  }, [rows, typeFilter, awaiting])

  const awaitingCount = useMemo(() => rows.filter(awaiting).length, [rows, awaiting])

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
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handleForceRefresh} disabled={forcing}
            title="يجبر كل أجهزة الطلاب على مسح الكاش وتنزيل أحدث نسخة عند فتح التطبيق القادم"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm disabled:opacity-50"
            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.32)' }}>
            {forcing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} إجبار تحديث الأجهزة
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm"
            style={{ background: 'var(--surface-raised,rgba(255,255,255,0.04))', color: 'var(--text-secondary,#cbd5e1)', border: '1px solid var(--border-default,rgba(255,255,255,0.08))' }}>
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
      </div>

      {awaitingCount > 0 && (
        <div className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.32)' }}>
          💬 {awaitingCount} بلاغ بانتظار ردّك — مرتّبة في الأعلى
        </div>
      )}

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
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {r.reporter_status === 'still_broken' && (
                      <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ color: '#f87171', background: 'rgba(248,113,113,0.16)' }}>🔴 الطالب: لا تزال المشكلة</span>
                    )}
                    {r.reporter_status !== 'still_broken' && latestMsg[r.id] && latestMsg[r.id].sender_role !== 'admin' && latestMsg[r.id].sender_role !== 'trainer' && (
                      <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.16)' }}>💬 ردّ جديد من الطالب</span>
                    )}
                    {studentCount[r.id] > 0 && (
                      <span className="px-2 py-1 rounded-full text-[11px] font-bold" style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }}>💬 {studentCount[r.id]}</span>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                  </div>
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

                <BugReplyPanel reportId={r.id} refreshTick={refreshTick} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
