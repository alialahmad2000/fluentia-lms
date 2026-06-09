import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Lock, Unlock, CalendarPlus, Infinity as InfinityIcon, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/FluentiaToast'

// Admin control for the subscription-access gate (students.access_expires_at).
// NULL = unlimited (never blocked). Past date = blocked (blurred renew screen).
// All writes go through the admin-only SECURITY DEFINER rpc admin_set_access_expiry.
export default function AdminSubscriptions() {
  const role = useAuthStore((s) => s.profile?.role)
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all') // all | blocked | active
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, access_expires_at, status, enrollment_date, package, custom_price')
      .is('deleted_at', null)
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل القائمة', description: error.message }); return }
    const ids = students.map((s) => s.id)
    const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
    const pMap = Object.fromEntries((profs || []).map((p) => [p.id, p]))
    const merged = students
      .filter((s) => !(pMap[s.id]?.email || '').includes('mock-test')) // hide internal test accounts
      .map((s) => ({ ...s, name: pMap[s.id]?.full_name || '—', email: pMap[s.id]?.email || '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    setRows(merged)
  }, [])

  useEffect(() => { load() }, [load])

  const isBlocked = (r) => r.access_expires_at && new Date(r.access_expires_at).getTime() < Date.now()

  const setExpiry = async (r, value, label) => {
    setBusyId(r.id)
    const { error } = await supabase.rpc('admin_set_access_expiry', { p_student_id: r.id, p_expires_at: value })
    setBusyId(null)
    if (error) { toast({ type: 'error', title: 'تعذّر التنفيذ', description: error.message }); return }
    toast({ type: 'success', title: `${label} — ${r.name} ✅` })
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, access_expires_at: value } : x)))
  }

  const blockNow = (r) => setExpiry(r, new Date().toISOString(), 'تم حظر الوصول')
  const unlimited = (r) => setExpiry(r, null, 'وصول غير محدود')
  const extendMonth = (r) => {
    const base = r.access_expires_at && new Date(r.access_expires_at) > new Date() ? new Date(r.access_expires_at) : new Date()
    base.setMonth(base.getMonth() + 1)
    setExpiry(r, base.toISOString(), 'تم التمديد شهراً')
  }

  const filtered = useMemo(() => {
    if (!rows) return null
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'blocked' && !isBlocked(r)) return false
      if (filter === 'active' && isBlocked(r)) return false
      if (!needle) return true
      return r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle)
    })
  }, [rows, q, filter])

  const counts = useMemo(() => {
    if (!rows) return { blocked: 0, active: 0 }
    const blocked = rows.filter(isBlocked).length
    return { blocked, active: rows.length - blocked }
  }, [rows])

  if (role !== 'admin') {
    return <div dir="rtl" className="p-8 text-center text-red-400" style={{ fontFamily: 'Tajawal' }}>هذه الصفحة للمشرفين فقط.</div>
  }

  const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—')

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>اشتراكات الطلاب</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}>
          تحكّم في وصول كل طالب للمنصّة. «غير محدود» = لا يُحظر أبداً · تاريخ في الماضي = يرى شاشة التجديد المموّهة.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[220px]"
          style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.04))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الإيميل…"
            className="bg-transparent outline-none w-full text-sm" style={{ color: 'var(--ds-text-primary, #f8fafc)' }} />
        </div>
        {[['all', `الكل`], ['blocked', `محظور (${counts.blocked})`], ['active', `مفعّل (${counts.active})`]].map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)}
            className="rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background: filter === k ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.04)',
              color: filter === k ? '#7dd3fc' : '#94a3b8',
              border: '1px solid ' + (filter === k ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'),
            }}>{lbl}</button>
        ))}
      </div>

      {filtered === null ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const blocked = isBlocked(r)
            const busy = busyId === r.id
            return (
              <div key={r.id} className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
                style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    {blocked ? <ShieldAlert className="h-4 w-4" style={{ color: '#f87171' }} /> : <ShieldCheck className="h-4 w-4" style={{ color: '#4ade80' }} />}
                    <span className="font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{r.name}</span>
                  </div>
                  <div className="text-xs mt-0.5" dir="ltr" style={{ color: '#94a3b8', textAlign: 'right' }}>{r.email}</div>
                </div>
                <div className="text-xs min-w-[140px]" style={{ color: '#94a3b8' }}>
                  <div>{r.package || '—'}{r.custom_price ? ` · ${r.custom_price} ر.س` : ''}</div>
                  <div>
                    {r.access_expires_at == null
                      ? <span style={{ color: '#4ade80' }}>وصول غير محدود</span>
                      : blocked
                        ? <span style={{ color: '#f87171' }}>محظور منذ {fmt(r.access_expires_at)}</span>
                        : <span style={{ color: '#fbbf24' }}>ينتهي {fmt(r.access_expires_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => extendMonth(r)} disabled={busy}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />} تمديد شهر
                  </button>
                  <button onClick={() => unlimited(r)} disabled={busy}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                    <InfinityIcon className="h-3.5 w-3.5" /> غير محدود
                  </button>
                  {blocked ? (
                    <button onClick={() => extendMonth(r)} disabled={busy}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                      style={{ background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.3)' }}>
                      <Unlock className="h-3.5 w-3.5" /> فك الحظر (شهر)
                    </button>
                  ) : (
                    <button onClick={() => blockNow(r)} disabled={busy}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                      <Lock className="h-3.5 w-3.5" /> حظر الآن
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="text-sm py-6 text-center" style={{ color: '#94a3b8' }}>لا نتائج.</div>}
        </div>
      )}
    </div>
  )
}
