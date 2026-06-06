import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { UserPlus, Shield, GraduationCap, Headset, X, Copy, Check, Power, KeyRound, BarChart3 } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { timeAgo } from '../../utils/dateHelpers'

const ROLES = [
  { key: 'admin',   label: 'مدير',         group: 'المدراء',        icon: Shield },
  { key: 'trainer', label: 'مدرب',         group: 'المدربون',       icon: GraduationCap },
  { key: 'agent',   label: 'خدمة عملاء',   group: 'خدمة العملاء',   icon: Headset },
]
const roleMeta = (k) => ROLES.find((r) => r.key === k) || ROLES[2]
const genPassword = () => 'Fluentia' + Math.floor(1000 + Math.random() * 9000) + '!'

const field = { background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-primary)', borderRadius: 10, padding: '10px 12px', width: '100%', fontFamily: 'Tajawal, sans-serif' }
const card = { background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', borderRadius: 14 }

async function callStaff(body) {
  const res = await invokeWithRetry('admin-staff', { body })
  if (res.error) throw new Error(res.error)
  return res.data
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      className="p-1.5 rounded" style={{ color: done ? 'var(--ds-accent-success)' : 'var(--ds-text-tertiary)' }} aria-label="نسخ">
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function AddStaffModal({ onClose, onDone }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [password, setPassword] = useState(genPassword())
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  const submit = async () => {
    if (!name.trim() || !email.trim()) { toast({ type: 'warning', title: 'الاسم والبريد مطلوبان' }); return }
    try {
      setBusy(true)
      await callStaff({ action: 'create', name: name.trim(), email: email.trim(), password, role })
      setCreated({ email: email.trim(), password })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الإنشاء', description: e?.message })
    } finally { setBusy(false) }
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(440px,100%)', marginTop: 50, padding: 20, fontFamily: 'Tajawal, sans-serif', background: 'var(--ds-bg-elevated)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>{created ? 'تم إنشاء الحساب' : 'إضافة موظف'}</div>
          <button onClick={onClose} style={{ color: 'var(--ds-text-tertiary)' }}><X size={18} /></button>
        </div>
        {created ? (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--ds-text-secondary)' }}>شارك هذه البيانات مع الموظف. سيُطلب منه تغيير كلمة المرور عند أول دخول.</p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between rounded-lg p-2" style={{ background: 'var(--ds-surface-2)' }}>
                <span className="text-sm" style={{ color: 'var(--ds-text-primary)', direction: 'ltr' }}>{created.email}</span><CopyBtn text={created.email} />
              </div>
              <div className="flex items-center justify-between rounded-lg p-2" style={{ background: 'var(--ds-surface-2)' }}>
                <span className="text-sm" style={{ color: 'var(--ds-text-primary)', direction: 'ltr' }}>{created.password}</span><CopyBtn text={created.password} />
              </div>
            </div>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>تم</button>
          </div>
        ) : (
          <div className="space-y-3">
            <input style={field} placeholder="الاسم الكامل *" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={field} placeholder="البريد الإلكتروني *" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select style={field} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input style={field} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={() => setPassword(genPassword())} className="px-3 py-2 rounded-lg text-xs whitespace-nowrap" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-tertiary)' }}>توليد</button>
            </div>
            <button disabled={busy} onClick={submit} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-success)', color: '#04210f' }}>
              {busy ? '...' : 'إنشاء الحساب'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function StaffRow({ s, onChanged }) {
  const [busy, setBusy] = useState(false)
  const meta = roleMeta(s.role)
  const run = async (fn, ok) => {
    try { setBusy(true); await fn(); toast({ type: 'success', title: ok }); onChanged() }
    catch (e) { toast({ type: 'error', title: 'تعذّر', description: e?.message }) }
    finally { setBusy(false) }
  }
  const changeRole = (e) => { const r = e.target.value; if (r !== s.role) run(async () => { const { error } = await supabase.rpc('admin_set_role', { p_user: s.id, p_role: r }); if (error) throw error }, 'تم تغيير الدور') }
  const toggleActive = () => run(() => callStaff({ action: 'set_active', user_id: s.id, active: s.is_banned }), s.is_banned ? 'تمت إعادة التفعيل' : 'تم التعطيل')
  const resetPw = () => { const p = genPassword(); run(async () => { await callStaff({ action: 'reset_password', user_id: s.id, password: p }); navigator.clipboard?.writeText(p) }, 'كلمة مرور جديدة نُسخت: ' + p) }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>{s.name}</span>
          {s.is_banned && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-accent-danger)' }}>معطّل</span>}
        </div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)', direction: 'ltr', textAlign: 'right' }}>{s.email}</div>
        <div className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>{s.last_active_at ? 'آخر نشاط ' + timeAgo(s.last_active_at) : 'لم يدخل بعد'}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {s.role === 'agent' && <Link to="/admin/cs-performance" className="p-1.5 rounded" style={{ color: 'var(--ds-text-tertiary)' }} title="أداء خدمة العملاء"><BarChart3 size={15} /></Link>}
        <select disabled={busy} value={s.role} onChange={changeRole} className="text-xs rounded-lg px-2 py-1.5" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
          {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button disabled={busy} onClick={resetPw} className="p-1.5 rounded" style={{ color: 'var(--ds-text-tertiary)' }} title="إعادة تعيين كلمة المرور"><KeyRound size={15} /></button>
        <button disabled={busy} onClick={toggleActive} className="p-1.5 rounded" style={{ color: s.is_banned ? 'var(--ds-accent-success)' : 'var(--ds-accent-danger)' }} title={s.is_banned ? 'تفعيل' : 'تعطيل'}><Power size={15} /></button>
      </div>
    </div>
  )
}

export default function AdminTeam() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => { const { data, error } = await supabase.rpc('admin_list_staff'); if (error) throw error; return data || [] },
    staleTime: 20_000,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-staff'] })

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>الموظفون</h1>
          <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>المدراء · المدربون · خدمة العملاء</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
          <UserPlus size={16} /> إضافة موظف
        </button>
      </div>

      {isLoading && <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}

      {!isLoading && ROLES.map((r) => {
        const members = staff.filter((s) => s.role === r.key)
        return (
          <div key={r.key} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <r.icon size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>{r.group}</span>
              <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{members.length}</span>
            </div>
            <div style={card}>
              {members.length === 0
                ? <div className="text-xs text-center py-5" style={{ color: 'var(--ds-text-muted)' }}>لا يوجد</div>
                : members.map((s) => <StaffRow key={s.id} s={s} onChanged={refresh} />)}
            </div>
          </div>
        )
      })}

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onDone={refresh} />}
    </div>
  )
}
