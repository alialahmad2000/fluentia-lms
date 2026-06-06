import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, Check, Send, CalendarClock, Save } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import { timeAgo } from '../../utils/dateHelpers'
import { buildWhatsAppUrl, normalizeWhatsApp, isValidWhatsApp } from '../../lib/whatsapp'
import {
  useLeadActivities, useLeadMutations,
  LEAD_STATUSES, LOST_REASONS, INTERESTS, PACKAGES, SOURCES, ACTIVITY_LABELS,
} from '../../lib/cs/leads'

const fieldStyle = {
  background: 'var(--ds-surface-2)',
  border: '1px solid var(--ds-border-subtle)',
  color: 'var(--ds-text-primary)',
  borderRadius: 10,
  padding: '10px 12px',
  width: '100%',
  fontFamily: 'Tajawal, sans-serif',
}

export default function LeadDrawer({ lead, onClose }) {
  const m = useLeadMutations()
  const { data: activities = [] } = useLeadActivities(lead?.id)
  const [form, setForm] = useState({})
  const [note, setNote] = useState('')
  const [followAt, setFollowAt] = useState('')
  const [lostPick, setLostPick] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name || '',
        whatsapp: lead.whatsapp || '',
        interest: lead.interest || '',
        package_interest: lead.package_interest || '',
        notes: lead.notes || '',
      })
      setNote('')
      setLostPick(false)
      setFollowAt('')
    }
  }, [lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lead) return null

  const run = async (fn, okMsg) => {
    try {
      setBusy(true)
      await fn()
      if (okMsg) toast({ type: 'success', title: okMsg })
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر التنفيذ', description: e?.message || 'حدث خطأ' })
    } finally {
      setBusy(false)
    }
  }

  const openWhatsApp = () => {
    const text = `أهلاً ${lead.name}! معك فريق أكاديمية طلاقة 🌿`
    window.open(buildWhatsAppUrl(lead.whatsapp, text), '_blank', 'noopener,noreferrer')
    m.logActivity(lead.id, 'whatsapp_opened').catch(() => {}) // always log the signal
  }

  const saveFields = () => run(async () => {
    if (form.whatsapp && !isValidWhatsApp(form.whatsapp)) throw new Error('رقم واتساب غير صالح')
    await m.updateLead(lead.id, {
      name: form.name.trim(),
      whatsapp: normalizeWhatsApp(form.whatsapp),
      interest: form.interest || null,
      package_interest: form.package_interest || null,
      notes: form.notes || null,
    })
  }, 'تم حفظ التعديلات')

  const changeStatus = (status) => {
    if (status === 'lost') { setLostPick(true); return }
    run(() => m.setStatus(lead.id, status), 'تم تحديث الحالة')
  }
  const confirmLost = (reason) => run(async () => {
    await m.setStatus(lead.id, 'lost', reason)
    setLostPick(false)
  }, 'تم إغلاق العميل')

  const markContacted = () => run(async () => {
    await m.logActivity(lead.id, 'contacted')
    if (lead.status === 'new') await m.setStatus(lead.id, 'contacted')
  }, 'سُجّل التواصل')
  const markSentLink = () => run(() => m.logActivity(lead.id, 'sent_link'), 'سُجّل إرسال الرابط')

  const addNote = () => {
    const t = note.trim()
    if (!t) return
    run(async () => { await m.logActivity(lead.id, 'note', t); setNote('') }, 'أُضيفت الملاحظة')
  }
  const saveFollowup = () => {
    if (!followAt) return
    run(async () => { await m.setFollowup(lead.id, new Date(followAt).toISOString()); setFollowAt('') }, 'ضُبطت المتابعة')
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'var(--ds-bg-overlay, rgba(0,0,0,0.55))', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      >
        <motion.aside
          key="panel"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          style={{
            position: 'fixed', top: 0, bottom: 0, insetInlineStart: 0,
            width: 'min(460px, 100vw)', background: 'var(--ds-bg-elevated)',
            borderInlineEnd: '1px solid var(--ds-border-subtle)', boxShadow: 'var(--ds-shadow-lg)',
            overflowY: 'auto', padding: 20, fontFamily: 'Tajawal, sans-serif',
          }}
        >
          {/* header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>{lead.name}</div>
              <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                {(SOURCES.find((s) => s.key === lead.source) || {}).label || lead.source} · {timeAgo(lead.last_activity_at)}
              </div>
            </div>
            <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-lg" style={{ color: 'var(--ds-text-tertiary)' }}>
              <X size={18} />
            </button>
          </div>

          {/* one-tap WhatsApp */}
          <button
            onClick={openWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold mb-4"
            style={{ background: 'var(--ds-accent-success)', color: '#04210f' }}
          >
            <MessageCircle size={18} /> مراسلة واتساب
          </button>

          {/* quick actions */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button disabled={busy} onClick={markContacted} className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
              <Check size={15} /> تم التواصل
            </button>
            <button disabled={busy} onClick={markSentLink} className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
              <Send size={15} /> أرسلت الرابط
            </button>
          </div>

          {/* status changer */}
          <div className="mb-5">
            <div className="text-xs mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>الحالة</div>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STATUSES.map((s) => (
                <button key={s.key} disabled={busy} onClick={() => changeStatus(s.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: lead.status === s.key ? s.accent : 'var(--ds-surface-2)',
                    color: lead.status === s.key ? '#06121f' : 'var(--ds-text-secondary)',
                    border: '1px solid var(--ds-border-subtle)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
            {lostPick && (
              <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
                <div className="text-xs mb-2" style={{ color: 'var(--ds-text-secondary)' }}>سبب الإغلاق:</div>
                <div className="flex flex-wrap gap-1.5">
                  {LOST_REASONS.map((r) => (
                    <button key={r} disabled={busy} onClick={() => confirmLost(r)}
                      className="px-3 py-1.5 rounded-full text-xs"
                      style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* editable fields */}
          <div className="space-y-3 mb-5">
            <input style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم" />
            <input style={fieldStyle} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="واتساب" inputMode="tel" />
            <div className="grid grid-cols-2 gap-2">
              <select style={fieldStyle} value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
                <option value="">الاهتمام</option>
                {INTERESTS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
              <select style={fieldStyle} value={form.package_interest} onChange={(e) => setForm({ ...form, package_interest: e.target.value })}>
                <option value="">الباقة</option>
                {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <textarea style={{ ...fieldStyle, minHeight: 64 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" />
            <button disabled={busy} onClick={saveFields} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
              <Save size={15} /> حفظ التعديلات
            </button>
          </div>

          {/* follow-up */}
          <div className="mb-5">
            <div className="text-xs mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>متابعة قادمة</div>
            <div className="flex gap-2">
              <input type="datetime-local" style={fieldStyle} value={followAt} onChange={(e) => setFollowAt(e.target.value)} />
              <button disabled={busy || !followAt} onClick={saveFollowup} className="px-3 rounded-lg" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
                <CalendarClock size={16} />
              </button>
            </div>
            {lead.next_followup_at && (
              <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>الحالية: {timeAgo(lead.next_followup_at)}</div>
            )}
          </div>

          {/* add note */}
          <div className="mb-5">
            <textarea style={{ ...fieldStyle, minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="أضف ملاحظة…" />
            <button disabled={busy || !note.trim()} onClick={addNote} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
              إضافة ملاحظة
            </button>
          </div>

          {/* activity timeline */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>السجل</div>
            <div className="space-y-2">
              {activities.length === 0 && <div className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>لا يوجد نشاط بعد</div>}
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--ds-accent-primary)', marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--ds-text-primary)' }}>{ACTIVITY_LABELS[a.type] || a.type}</span>
                    {a.detail && <span> — {a.detail}</span>}
                    <div className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{timeAgo(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
