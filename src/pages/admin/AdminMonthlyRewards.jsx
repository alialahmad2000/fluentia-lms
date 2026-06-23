import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Gift, Loader2, ChevronRight, ChevronLeft, RefreshCw, CheckCircle2,
  Circle, Sparkles, Save, Calendar, Trophy, Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/FluentiaToast'

// Admin cockpit for the monthly engagement reward (silent to students).
// Qualify = (>= N active days in EVERY full week of the month) AND (>= min honest effort XP).
// "Active day" = a day with real study evidence (lesson / recording / submission / word mastered).
// Score is computed only from server-validated work — farm-proof. Reward (10% discount) is applied
// MANUALLY by the admin via the «تم تطبيق الخصم» toggle. Nothing is shown to students.
const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function monthStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function AdminMonthlyRewards() {
  const role = useAuthStore((s) => s.profile?.role)
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [cfg, setCfg] = useState(null)
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingCfg, setSavingCfg] = useState(false)
  // local editable config mirror
  const [draft, setDraft] = useState({ enabled: true, active_days_per_week: 5, min_effort_xp: 200 })

  const mStr = monthStr(month)

  const load = useCallback(async () => {
    const { data: config } = await supabase.from('monthly_reward_config').select('*').eq('id', 1).maybeSingle()
    if (config) { setCfg(config); setDraft({ enabled: config.enabled, active_days_per_week: config.active_days_per_week, min_effort_xp: config.min_effort_xp }) }
    const { data: status, error } = await supabase
      .from('monthly_reward_status').select('*').eq('month', mStr)
    if (error) { toast({ type: 'error', title: 'تعذّر تحميل النتائج', description: error.message }); return }
    const ids = (status || []).map((r) => r.student_id)
    let pMap = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, display_name').in('id', ids)
      pMap = Object.fromEntries((profs || []).map((p) => [p.id, p.display_name || p.full_name || '—']))
    }
    const merged = (status || []).map((r) => ({ ...r, name: pMap[r.student_id] || '—' }))
    merged.sort((a, b) =>
      (b.qualified - a.qualified) ||
      (b.weeks_passed - a.weeks_passed) ||
      (b.active_days_total - a.active_days_total) ||
      (b.effort_xp - a.effort_xp))
    setRows(merged)
  }, [mStr])

  useEffect(() => { setRows(null); load() }, [load])

  const recompute = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('admin_refresh_monthly_rewards', { p_month: mStr })
    setBusy(false)
    if (error) { toast({ type: 'error', title: 'تعذّر إعادة الحساب', description: error.message }); return }
    toast({ type: 'success', title: 'تمت إعادة الحساب ✅' })
    load()
  }

  const saveConfig = async () => {
    setSavingCfg(true)
    const { error } = await supabase.rpc('admin_set_monthly_reward_config', {
      p_enabled: draft.enabled,
      p_active_days_per_week: Number(draft.active_days_per_week),
      p_min_effort_xp: Number(draft.min_effort_xp),
    })
    if (!error) await supabase.rpc('admin_refresh_monthly_rewards', { p_month: mStr })
    setSavingCfg(false)
    if (error) { toast({ type: 'error', title: 'تعذّر الحفظ', description: error.message }); return }
    toast({ type: 'success', title: 'تم حفظ الشروط وإعادة الحساب ✅' })
    load()
  }

  const toggleGrant = async (r) => {
    const next = !r.granted
    setRows((prev) => prev.map((x) => (x.student_id === r.student_id ? { ...x, granted: next } : x)))
    const { error } = await supabase.rpc('admin_grant_monthly_reward', { p_student: r.student_id, p_month: mStr, p_granted: next })
    if (error) {
      setRows((prev) => prev.map((x) => (x.student_id === r.student_id ? { ...x, granted: !next } : x)))
      toast({ type: 'error', title: 'تعذّر التحديث', description: error.message })
      return
    }
    toast({ type: 'success', title: next ? `تم تعليم الخصم لـ ${r.name} ✅` : `أُلغي التعليم لـ ${r.name}` })
  }

  const shiftMonth = (delta) => { const d = new Date(month); d.setMonth(d.getMonth() + delta); d.setDate(1); setMonth(d) }

  const filtered = useMemo(() => {
    if (!rows) return null
    const needle = q.trim().toLowerCase()
    return needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows
  }, [rows, q])

  const stats = useMemo(() => {
    if (!rows) return { qualified: 0, close: 0, granted: 0 }
    const qualified = rows.filter((r) => r.qualified).length
    const close = rows.filter((r) => !r.qualified && r.weeks_total > 0 && r.weeks_total - r.weeks_passed === 1).length
    const granted = rows.filter((r) => r.granted).length
    return { qualified, close, granted }
  }, [rows])

  if (role !== 'admin') {
    return <div dir="rtl" className="p-8 text-center text-red-400" style={{ fontFamily: 'Tajawal' }}>هذه الصفحة للمشرفين فقط.</div>
  }

  const isFuture = mStr > monthStr(new Date())

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }} className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6" style={{ color: '#fbbf24' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>مكافآت الشهر</h1>
          </div>
          <p className="text-sm mt-1 max-w-2xl leading-6" style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}>
            يحسب النظام بصمت — دون أي إشعار للطلاب — مَن يستحق مكافأة هذا الشهر.
            الاستحقاق: <b style={{ color: '#7dd3fc' }}>{draft.active_days_per_week} أيام نشِطة في كل أسبوع كامل</b> من الشهر،
            مع <b style={{ color: '#7dd3fc' }}>{draft.min_effort_xp} نقطة جهد حقيقية</b> على الأقل. المكافأة (خصم 10٪) تطبّقها أنت يدوياً.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{cfg?.active_day_rule}</p>
        </div>
        {/* month nav */}
        <div className="flex items-center gap-2 rounded-xl px-2 py-1.5"
          style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.04))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-white/5"><ChevronRight className="h-4 w-4" style={{ color: '#94a3b8' }} /></button>
          <div className="flex items-center gap-1.5 px-2 min-w-[110px] justify-center">
            <Calendar className="h-3.5 w-3.5" style={{ color: '#64748b' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{MONTH_AR[month.getMonth()]} {month.getFullYear()}</span>
          </div>
          <button onClick={() => shiftMonth(1)} disabled={isFuture} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" style={{ color: '#94a3b8' }} /></button>
        </div>
      </div>

      {/* config panel */}
      <div className="rounded-2xl p-4 flex flex-wrap items-end gap-5"
        style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
        <Stepper label="أيام نشِطة لكل أسبوع" value={draft.active_days_per_week} min={1} max={7}
          onChange={(v) => setDraft((d) => ({ ...d, active_days_per_week: v }))} />
        <Stepper label="حد أدنى لنقاط الجهد/شهر" value={draft.min_effort_xp} min={0} max={2000} step={25}
          onChange={(v) => setDraft((d) => ({ ...d, min_effort_xp: v }))} />
        <label className="flex items-center gap-2 cursor-pointer select-none pb-1">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="h-4 w-4 accent-amber-400" />
          <span className="text-sm" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>النظام مُفعّل</span>
        </label>
        <div className="flex-1" />
        <button onClick={saveConfig} disabled={savingCfg}
          className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'rgba(251,191,36,0.16)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
          {savingCfg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الشروط
        </button>
        <button onClick={recompute} disabled={busy}
          className="rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} إعادة حساب الآن
        </button>
      </div>

      {/* headline stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Trophy} tint="#4ade80" label="مستحقّون" value={stats.qualified} />
        <StatCard icon={Sparkles} tint="#fbbf24" label="قريبون (ينقصهم أسبوع)" value={stats.close} />
        <StatCard icon={CheckCircle2} tint="#7dd3fc" label="طُبّق الخصم" value={stats.granted} />
      </div>

      {/* search */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 max-w-sm"
        style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.04))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
        <Search className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم…"
          className="bg-transparent outline-none w-full text-sm" style={{ color: 'var(--ds-text-primary, #f8fafc)' }} />
      </div>

      {/* rows */}
      {filtered === null ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: '#64748b' }}>لا توجد بيانات لهذا الشهر بعد.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => <RewardRow key={r.student_id} r={r} req={cfg?.active_days_per_week || 5} minXp={cfg?.min_effort_xp || 0} onToggle={() => toggleGrant(r)} />)}
        </div>
      )}
    </div>
  )
}

function RewardRow({ r, req, minXp, onToggle }) {
  const weeks = (r.detail?.weeks || []).filter((w) => w.counts)
  const xpOk = r.effort_xp >= minXp
  return (
    <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
      style={{
        background: r.qualified ? 'rgba(74,222,128,0.06)' : 'var(--ds-bg-elevated, rgba(255,255,255,0.03))',
        border: '1px solid ' + (r.qualified ? 'rgba(74,222,128,0.35)' : 'var(--ds-border-subtle, rgba(255,255,255,0.08))'),
      }}>
      {/* name + status */}
      <div className="min-w-[160px] flex-1">
        <div className="flex items-center gap-2">
          {r.qualified
            ? <Trophy className="h-4 w-4" style={{ color: '#4ade80' }} />
            : <Circle className="h-4 w-4" style={{ color: '#475569' }} />}
          <span className="font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{r.name}</span>
          {r.qualified && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(74,222,128,0.16)', color: '#4ade80' }}>مستحقّ</span>}
        </div>
        <div className="text-xs mt-1" style={{ color: '#64748b' }}>
          {r.weeks_passed}/{r.weeks_total} أسابيع مكتملة · {r.active_days_total} يوم نشِط
        </div>
      </div>

      {/* per-week dots */}
      <div className="flex items-end gap-1.5">
        {weeks.map((w, i) => {
          const tone = w.passed ? '#4ade80' : w.active_days > 0 ? '#fbbf24' : '#334155'
          return (
            <div key={i} className="flex flex-col items-center gap-1" title={`أسبوع ${i + 1}: ${w.active_days}/${req} يوم`}>
              <div className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: tone + '22', color: tone, border: `1px solid ${tone}55` }}>{w.active_days}</div>
              <div className="h-1 w-6 rounded-full" style={{ background: tone, opacity: w.passed ? 1 : 0.4 }} />
            </div>
          )
        })}
      </div>

      {/* effort xp */}
      <div className="min-w-[92px] text-center">
        <div className="text-sm font-bold tabular-nums" style={{ color: xpOk ? '#7dd3fc' : '#94a3b8' }}>{r.effort_xp}</div>
        <div className="text-[10px]" style={{ color: '#64748b' }}>نقاط جهد {minXp > 0 ? `(الحد ${minXp})` : ''}</div>
      </div>

      {/* grant toggle */}
      <button onClick={onToggle}
        className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        style={{
          background: r.granted ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.04)',
          color: r.granted ? '#4ade80' : '#94a3b8',
          border: '1px solid ' + (r.granted ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'),
        }}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {r.granted ? 'طُبّق الخصم ✓' : 'علّم: طُبّق الخصم'}
      </button>
    </div>
  )
}

function Stepper({ label, value, onChange, min = 0, max = 99, step = 1 }) {
  return (
    <div>
      <div className="text-xs mb-1.5" style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}>{label}</div>
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => onChange(Math.max(min, value - step))} className="h-7 w-7 rounded-md text-base font-bold hover:bg-white/5" style={{ color: '#94a3b8' }}>−</button>
        <span className="min-w-[44px] text-center text-sm font-bold tabular-nums" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} className="h-7 w-7 rounded-md text-base font-bold hover:bg-white/5" style={{ color: '#94a3b8' }}>+</button>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, tint, label, value }) {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: 'var(--ds-bg-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: tint + '1a' }}>
        <Icon className="h-5 w-5" style={{ color: tint }} />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}>{label}</div>
      </div>
    </div>
  )
}
