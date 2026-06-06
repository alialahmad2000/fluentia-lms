import { useState } from 'react'
import { MessageCircle, AlertCircle, Clock } from 'lucide-react'
import { timeAgo } from '../../utils/dateHelpers'
import { maskWhatsApp, buildWhatsAppUrl } from '../../lib/whatsapp'
import { useLeads, useLeadMutations } from '../../lib/cs/leads'
import LeadDrawer from './LeadDrawer'

// YYYY-MM-DD in Asia/Riyadh — string compare gives correct day ordering.
const riyadhDay = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))
const riyadhTime = (d) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' }).format(new Date(d))

function Row({ lead, onOpen, mode }) {
  const m = useLeadMutations()
  const openWa = (e) => {
    e.stopPropagation()
    window.open(buildWhatsAppUrl(lead.whatsapp, `أهلاً ${lead.name}! معك فريق أكاديمية طلاقة 🌿`), '_blank', 'noopener,noreferrer')
    m.logActivity(lead.id, 'whatsapp_opened').catch(() => {})
  }
  return (
    <div onClick={() => onOpen(lead.id)} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
      style={{ borderBottom: '1px solid var(--ds-border-subtle)', background: 'var(--ds-surface-1)' }}>
      <div className="min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>{lead.name}</div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)', direction: 'ltr', textAlign: 'right' }}>{maskWhatsApp(lead.whatsapp)}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] flex items-center gap-1" style={{ color: mode === 'overdue' ? 'var(--ds-accent-danger)' : 'var(--ds-text-tertiary)' }}>
          {mode === 'overdue' ? <AlertCircle size={12} /> : <Clock size={12} />}
          {mode === 'overdue' ? timeAgo(lead.next_followup_at) : riyadhTime(lead.next_followup_at)}
        </span>
        <button onClick={openWa} aria-label="واتساب" className="p-1.5 rounded-lg" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-accent-success)' }}>
          <MessageCircle size={15} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onOpen(lead.id) }} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
          تم
        </button>
      </div>
    </div>
  )
}

function Section({ title, items, mode, onOpen, accent }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold" style={{ color: accent }}>{title}</span>
        <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs px-4 py-6 text-center rounded-xl" style={{ color: 'var(--ds-text-muted)', background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>لا يوجد</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ds-border-subtle)' }}>
          {items.map((l) => <Row key={l.id} lead={l} onOpen={onOpen} mode={mode} />)}
        </div>
      )}
    </div>
  )
}

export default function TeamFollowups() {
  const { data: leads = [], isLoading } = useLeads()
  const [selectedId, setSelectedId] = useState(null)
  const selected = leads.find((l) => l.id === selectedId) || null

  const today = riyadhDay(Date.now())
  const open = leads.filter((l) => l.next_followup_at && l.status !== 'won' && l.status !== 'lost')
  const overdue = open.filter((l) => riyadhDay(l.next_followup_at) < today).sort((a, b) => new Date(a.next_followup_at) - new Date(b.next_followup_at))
  const dueToday = open.filter((l) => riyadhDay(l.next_followup_at) === today).sort((a, b) => new Date(a.next_followup_at) - new Date(b.next_followup_at))

  return (
    <div dir="rtl">
      {isLoading ? (
        <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>
      ) : (
        <>
          <Section title="متأخرة" items={overdue} mode="overdue" onOpen={setSelectedId} accent="var(--ds-accent-danger)" />
          <Section title="اليوم" items={dueToday} mode="today" onOpen={setSelectedId} accent="var(--ds-text-secondary)" />
        </>
      )}
      <LeadDrawer lead={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
