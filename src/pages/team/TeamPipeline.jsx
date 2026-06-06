import { useState } from 'react'
import { Plus, MessageCircle, AlertCircle, LayoutGrid, List, X } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import { timeAgo } from '../../utils/dateHelpers'
import { maskWhatsApp, buildWhatsAppUrl, normalizeWhatsApp, isValidWhatsApp } from '../../lib/whatsapp'
import { useAuthProfileId } from '../../stores/authStore'
import {
  useLeads, useLeadMutations, isOverdue,
  LEAD_STATUSES, SOURCES, INTERESTS, PACKAGES,
} from '../../lib/cs/leads'
import LeadDrawer from './LeadDrawer'

const inputStyle = {
  background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)',
  color: 'var(--ds-text-primary)', borderRadius: 10, padding: '10px 12px', width: '100%',
  fontFamily: 'Tajawal, sans-serif',
}

function interestColor(key) {
  return (INTERESTS.find((i) => i.key === key) || {}).color
}

function LeadCard({ lead, onOpen }) {
  const overdue = isOverdue(lead)
  const m = useLeadMutations()
  const openWa = (e) => {
    e.stopPropagation()
    const text = `أهلاً ${lead.name}! معك فريق أكاديمية طلاقة 🌿`
    window.open(buildWhatsAppUrl(lead.whatsapp, text), '_blank', 'noopener,noreferrer')
    m.logActivity(lead.id, 'whatsapp_opened').catch(() => {})
  }
  return (
    <div
      onClick={() => onOpen(lead.id)}
      className="rounded-xl p-3 mb-2 cursor-pointer transition-colors"
      style={{ background: 'var(--ds-surface-1)', border: `1px solid ${overdue ? 'var(--ds-accent-danger)' : 'var(--ds-border-subtle)'}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {lead.interest && <span style={{ width: 8, height: 8, borderRadius: 99, background: interestColor(lead.interest), flexShrink: 0 }} />}
            <span className="font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>{lead.name}</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)', direction: 'ltr', textAlign: 'right' }}>{maskWhatsApp(lead.whatsapp)}</div>
        </div>
        <button onClick={openWa} aria-label="واتساب" className="p-1.5 rounded-lg shrink-0" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-accent-success)' }}>
          <MessageCircle size={15} />
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-text-tertiary)' }}>
          {(SOURCES.find((s) => s.key === lead.source) || {}).label || lead.source}
        </span>
        <span className="text-[11px] flex items-center gap-1" style={{ color: overdue ? 'var(--ds-accent-danger)' : 'var(--ds-text-muted)' }}>
          {overdue && <AlertCircle size={11} />}
          {timeAgo(lead.last_activity_at)}
        </span>
      </div>
    </div>
  )
}

export default function TeamPipeline() {
  const myId = useAuthProfileId()
  const m = useLeadMutations()
  const { data: leads = [], isLoading } = useLeads()
  const [view, setView] = useState('kanban')
  const [selectedId, setSelectedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState({ name: '', whatsapp: '', source: 'tiktok_dm', interest: '', package_interest: '', notes: '' })

  const selected = leads.find((l) => l.id === selectedId) || null

  const submitAdd = async () => {
    if (!q.name.trim()) { toast({ type: 'warning', title: 'الاسم مطلوب' }); return }
    if (!isValidWhatsApp(q.whatsapp)) { toast({ type: 'warning', title: 'رقم واتساب غير صالح' }); return }
    try {
      setSaving(true)
      await m.createLead({
        name: q.name.trim(), whatsapp: normalizeWhatsApp(q.whatsapp), source: q.source,
        interest: q.interest || null, package_interest: q.package_interest || null, notes: q.notes || null,
        assigned_to: myId, created_by: myId, status: 'new',
      })
      toast({ type: 'success', title: 'أُضيف العميل' })
      setQ({ name: '', whatsapp: '', source: 'tiktok_dm', interest: '', package_interest: '', notes: '' })
      setShowAdd(false)
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الإضافة', description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div dir="rtl">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
          <Plus size={16} /> إضافة عميل
        </button>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
          {[['kanban', LayoutGrid], ['list', List]].map(([key, Icon]) => (
            <button key={key} onClick={() => setView(key)} className="p-1.5 rounded-md"
              style={{ background: view === key ? 'var(--ds-surface-3)' : 'transparent', color: view === key ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)' }}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* quick add */}
      {showAdd && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input style={inputStyle} placeholder="الاسم *" value={q.name} onChange={(e) => setQ({ ...q, name: e.target.value })} />
            <input style={inputStyle} placeholder="واتساب * (مثال 05xxxxxxxx)" inputMode="tel" value={q.whatsapp} onChange={(e) => setQ({ ...q, whatsapp: e.target.value })} />
            <select style={inputStyle} value={q.source} onChange={(e) => setQ({ ...q, source: e.target.value })}>
              {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select style={inputStyle} value={q.interest} onChange={(e) => setQ({ ...q, interest: e.target.value })}>
              <option value="">الاهتمام</option>
              {INTERESTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <select style={inputStyle} value={q.package_interest} onChange={(e) => setQ({ ...q, package_interest: e.target.value })}>
              <option value="">الباقة</option>
              {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input style={inputStyle} placeholder="ملاحظة" value={q.notes} onChange={(e) => setQ({ ...q, notes: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button disabled={saving} onClick={submitAdd} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-success)', color: '#04210f' }}>حفظ</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--ds-text-tertiary)' }}><X size={16} /></button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}

      {/* kanban */}
      {!isLoading && view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {LEAD_STATUSES.map((col) => {
            const items = leads.filter((l) => l.status === col.key)
            return (
              <div key={col.key} className="flex-shrink-0" style={{ width: 264 }}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: col.accent }} />{col.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{items.length}</span>
                </div>
                <div className="rounded-xl p-2 min-h-[120px]" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)' }}>
                  {items.map((lead) => <LeadCard key={lead.id} lead={lead} onOpen={setSelectedId} />)}
                  {items.length === 0 && <div className="text-xs text-center py-4" style={{ color: 'var(--ds-text-muted)' }}>—</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* list fallback */}
      {!isLoading && view === 'list' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ds-border-subtle)' }}>
          {leads.map((lead) => {
            const overdue = isOverdue(lead)
            const st = LEAD_STATUSES.find((s) => s.key === lead.status)
            return (
              <div key={lead.id} onClick={() => setSelectedId(lead.id)}
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
                style={{ borderBottom: '1px solid var(--ds-border-subtle)', background: 'var(--ds-surface-1)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  {lead.interest && <span style={{ width: 8, height: 8, borderRadius: 99, background: interestColor(lead.interest), flexShrink: 0 }} />}
                  <span className="font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>{lead.name}</span>
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', direction: 'ltr' }}>{maskWhatsApp(lead.whatsapp)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--ds-surface-2)', color: st?.accent }}>{st?.label}</span>
                  <span className="text-[11px]" style={{ color: overdue ? 'var(--ds-accent-danger)' : 'var(--ds-text-muted)' }}>{timeAgo(lead.last_activity_at)}</span>
                </div>
              </div>
            )
          })}
          {leads.length === 0 && <div className="text-sm text-center py-8" style={{ color: 'var(--ds-text-muted)', background: 'var(--ds-surface-1)' }}>لا يوجد عملاء بعد</div>}
        </div>
      )}

      <LeadDrawer lead={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
