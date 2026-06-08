import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, PartyPopper, Check, Clock, X, MessageCircle } from 'lucide-react'
import { useInterventionQueue, useActOnIntervention } from '@/hooks/teacher/useInterventions'

const SEV = {
  urgent:    { label: 'عاجل',   icon: AlertTriangle, color: '#fb7185', order: 0 },
  attention: { label: 'متابعة', icon: Bell,          color: '#f59e0b', order: 1 },
  celebrate: { label: 'تهنئة',  icon: PartyPopper,   color: '#4ade80', order: 2 },
}

function Row({ it }) {
  const act = useActOnIntervention()
  const meta = SEV[it.severity] || SEV.attention
  const [copied, setCopied] = useState(false)
  const done = act.isSuccess
  if (done) return null

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: `${meta.color}1f`, color: meta.color }}>
        <meta.icon size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/trainer/students/${it.student_id}`} className="text-[13.5px] font-bold text-slate-100 hover:text-sky-300">{it.student_name || 'طالب'}</Link>
          <span className="text-[12px] text-slate-400">· {it.reason_ar}</span>
        </div>
        {it.suggested_action_ar && (
          <div className="text-[12px] text-slate-400 mt-0.5">{it.suggested_action_ar}</div>
        )}
        {it.suggested_message_ar && (
          <button type="button"
            onClick={() => { navigator.clipboard?.writeText(it.suggested_message_ar); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-sky-400 hover:text-sky-300">
            <MessageCircle size={12} /> {copied ? 'تم النسخ ✓' : 'انسخ رسالة جاهزة'}
          </button>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: it.id, action: 'acted' })}
            className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/15"><Check size={12} /> تم</button>
          <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: it.id, action: 'snoozed', snoozeHours: 48 })}
            className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"><Clock size={12} /> تأجيل</button>
          <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: it.id, action: 'dismissed' })}
            className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md text-slate-500 hover:text-slate-300"><X size={12} /> تجاهل</button>
        </div>
      </div>
    </div>
  )
}

export default function NeedsAttentionPanel() {
  const { data: items = [], isLoading } = useInterventionQueue(40)
  const [showCelebrate, setShowCelebrate] = useState(false)

  if (isLoading) return <div className="tea-skel h-40" />
  if (!items.length) return null

  const sorted = [...items].sort((a, b) => (SEV[a.severity]?.order ?? 1) - (SEV[b.severity]?.order ?? 1))
  const main = sorted.filter((i) => i.severity !== 'celebrate')
  const celebrate = sorted.filter((i) => i.severity === 'celebrate')
  const urgentCount = items.filter((i) => i.severity === 'urgent').length

  return (
    <section className="tea-card">
      <div className="flex items-center justify-between mb-2">
        <div className="tea-section-title !mb-0"><Bell size={15} /> متابعة الطلاب</div>
        <span className="text-[12px] text-slate-500">
          {urgentCount > 0 && <span className="text-rose-300 font-bold">{urgentCount} عاجل · </span>}
          {items.length} إشعار
        </span>
      </div>
      <div>
        {main.slice(0, 12).map((it) => <Row key={it.id} it={it} />)}
      </div>
      {celebrate.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowCelebrate((v) => !v)}
            className="text-[12px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
            <PartyPopper size={13} /> {celebrate.length} إنجاز يستحق التهنئة {showCelebrate ? '▲' : '▼'}
          </button>
          {showCelebrate && <div className="mt-1">{celebrate.slice(0, 8).map((it) => <Row key={it.id} it={it} />)}</div>}
        </div>
      )}
    </section>
  )
}
