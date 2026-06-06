import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import { useLeads } from '../../lib/cs/leads'
import { normalizeWhatsApp } from '../../lib/whatsapp'
import {
  BOOKING_TYPES, RIYADH_OFFSET_MS, riyadhDayStr, riyadhToUtcIso, addMinutesIso,
  bookingErrorAr, useBookingMutations, searchStudents,
} from '../../lib/cs/scheduling'

const field = {
  background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)',
  color: 'var(--ds-text-primary)', borderRadius: 10, padding: '10px 12px', width: '100%',
  fontFamily: 'Tajawal, sans-serif',
}
const riyadhHHMM = (ms) => {
  const d = new Date(ms + RIYADH_OFFSET_MS)
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
}

export default function BookModal({ mode = 'create', booking = null, onClose }) {
  const m = useBookingMutations()
  const { data: leads = [] } = useLeads()
  const isReschedule = mode === 'reschedule'

  const [targetKind, setTargetKind] = useState('lead')
  const [leadTerm, setLeadTerm] = useState('')
  const [leadSel, setLeadSel] = useState(null)
  const [stuTerm, setStuTerm] = useState('')
  const [stuResults, setStuResults] = useState([])
  const [stuSel, setStuSel] = useState(null)
  const [manualName, setManualName] = useState('')
  const [manualWa, setManualWa] = useState('')

  const [type, setType] = useState(booking?.type || 'initial_meeting')
  const [date, setDate] = useState(booking ? riyadhDayStr(new Date(booking.start_at).getTime()) : riyadhDayStr(Date.now()))
  const [time, setTime] = useState(booking ? riyadhHHMM(new Date(booking.start_at).getTime()) : '16:00')
  const [override, setOverride] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  // debounced student search
  useEffect(() => {
    if (targetKind !== 'student') return
    const t = setTimeout(async () => {
      try { setStuResults(await searchStudents(stuTerm)) } catch { setStuResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [stuTerm, targetKind])

  const minutes = (BOOKING_TYPES.find((t) => t.key === type) || {}).minutes || 30
  const filteredLeads = leads.filter((l) => !leadTerm || l.name.includes(leadTerm))

  const submit = async () => {
    if (!date || !time) { toast({ type: 'warning', title: 'اختر التاريخ والوقت' }); return }
    if (override && !reason.trim()) { toast({ type: 'warning', title: 'سبب التجاوز مطلوب' }); return }
    const startIso = riyadhToUtcIso(date, time)
    const endIso = addMinutesIso(startIso, minutes)
    try {
      setBusy(true)
      if (isReschedule) {
        await m.reschedule({ p_booking: booking.id, p_start_at: startIso, p_end_at: endIso, p_is_override: override, p_override_reason: override ? reason.trim() : null })
        toast({ type: 'success', title: 'تم تغيير الموعد' })
      } else {
        let args = { p_type: type, p_start_at: startIso, p_end_at: endIso, p_is_override: override, p_override_reason: override ? reason.trim() : null, p_lead_id: null, p_student_id: null, p_contact_name: null, p_contact_whatsapp: null, p_notes: null }
        if (targetKind === 'lead') {
          if (!leadSel) { toast({ type: 'warning', title: 'اختر عميلاً' }); setBusy(false); return }
          args.p_lead_id = leadSel.id; args.p_contact_name = leadSel.name; args.p_contact_whatsapp = leadSel.whatsapp
        } else if (targetKind === 'student') {
          if (!stuSel) { toast({ type: 'warning', title: 'اختر طالباً' }); setBusy(false); return }
          args.p_student_id = stuSel.id; args.p_contact_name = stuSel.name; args.p_contact_whatsapp = stuSel.phone
        } else {
          if (!manualName.trim()) { toast({ type: 'warning', title: 'الاسم مطلوب' }); setBusy(false); return }
          args.p_contact_name = manualName.trim(); args.p_contact_whatsapp = manualWa ? normalizeWhatsApp(manualWa) : null
        }
        await m.book(args)
        toast({ type: 'success', title: 'تم الحجز' })
      }
      onClose()
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الحفظ', description: bookingErrorAr(e?.message) })
    } finally {
      setBusy(false)
    }
  }

  const pill = (active) => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
    background: active ? 'var(--ds-accent-primary)' : 'var(--ds-surface-2)',
    color: active ? '#06121f' : 'var(--ds-text-secondary)', border: '1px solid var(--ds-border-subtle)',
  })

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <motion.div dir="rtl" onClick={(e) => e.stopPropagation()} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{ width: 'min(480px,100%)', marginTop: 40, background: 'var(--ds-bg-elevated)', border: '1px solid var(--ds-border-subtle)', borderRadius: 16, padding: 20, fontFamily: 'Tajawal, sans-serif', boxShadow: 'var(--ds-shadow-lg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>{isReschedule ? 'تغيير الموعد' : 'حجز جديد'}</div>
          <button onClick={onClose} style={{ color: 'var(--ds-text-tertiary)' }}><X size={18} /></button>
        </div>

        {!isReschedule && (
          <>
            <div className="flex gap-1.5 mb-3">
              <button style={pill(targetKind === 'lead')} onClick={() => setTargetKind('lead')}>عميل محتمل</button>
              <button style={pill(targetKind === 'student')} onClick={() => setTargetKind('student')}>طالب</button>
              <button style={pill(targetKind === 'manual')} onClick={() => setTargetKind('manual')}>يدوي</button>
            </div>

            {targetKind === 'lead' && (
              <div className="mb-3">
                <input style={field} placeholder="ابحث عن عميل…" value={leadTerm} onChange={(e) => { setLeadTerm(e.target.value); setLeadSel(null) }} />
                {!leadSel && leadTerm && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--ds-border-subtle)' }}>
                    {filteredLeads.slice(0, 8).map((l) => (
                      <div key={l.id} onClick={() => { setLeadSel(l); setLeadTerm(l.name) }} className="px-3 py-2 cursor-pointer text-sm" style={{ color: 'var(--ds-text-secondary)', borderBottom: '1px solid var(--ds-border-subtle)' }}>{l.name}</div>
                    ))}
                    {filteredLeads.length === 0 && <div className="px-3 py-2 text-xs" style={{ color: 'var(--ds-text-muted)' }}>لا نتائج</div>}
                  </div>
                )}
                {leadSel && <div className="text-xs mt-1" style={{ color: 'var(--ds-accent-success)' }}>✓ {leadSel.name}</div>}
              </div>
            )}

            {targetKind === 'student' && (
              <div className="mb-3">
                <div className="flex items-center gap-2" style={field}><Search size={15} style={{ color: 'var(--ds-text-tertiary)' }} />
                  <input style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ds-text-primary)', width: '100%' }} placeholder="ابحث عن طالب…" value={stuTerm} onChange={(e) => { setStuTerm(e.target.value); setStuSel(null) }} />
                </div>
                {!stuSel && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg" style={{ border: stuResults.length ? '1px solid var(--ds-border-subtle)' : 'none' }}>
                    {stuResults.map((s) => (
                      <div key={s.id} onClick={() => { setStuSel(s); setStuTerm(s.name) }} className="px-3 py-2 cursor-pointer text-sm" style={{ color: 'var(--ds-text-secondary)', borderBottom: '1px solid var(--ds-border-subtle)' }}>{s.name}</div>
                    ))}
                  </div>
                )}
                {stuSel && <div className="text-xs mt-1" style={{ color: 'var(--ds-accent-success)' }}>✓ {stuSel.name}</div>}
              </div>
            )}

            {targetKind === 'manual' && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input style={field} placeholder="الاسم *" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <input style={field} placeholder="واتساب" inputMode="tel" value={manualWa} onChange={(e) => setManualWa(e.target.value)} />
              </div>
            )}

            <div className="flex gap-1.5 mb-3">
              {BOOKING_TYPES.map((t) => (
                <button key={t.key} style={pill(type === t.key)} onClick={() => setType(t.key)}>{t.label} · {t.minutes}د</button>
              ))}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="date" style={field} value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" style={field} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          تجاوز أوقات التوفر (طارئ)
        </label>
        {override && <input style={{ ...field, marginBottom: 12 }} placeholder="سبب التجاوز *" value={reason} onChange={(e) => setReason(e.target.value)} />}

        <div className="flex items-center gap-2 mt-2">
          <button disabled={busy} onClick={submit} className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-success)', color: '#04210f' }}>
            {isReschedule ? 'حفظ الموعد الجديد' : 'تأكيد الحجز'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>إلغاء</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
