// "New message" → pick a contact (trainer/admin or same-level colleague) → open a DM.
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Star, Loader2 } from 'lucide-react'
import { useDMContacts, getOrCreateDMThread } from '../../queries/useDM'
import SenderAvatar from './SenderAvatar'
import { senderColor } from '../../lib/senderColors'
import { ease } from '../../lib/motion'

export default function ContactPicker({ open, onClose, onPicked }) {
  const { data: contacts = [], isLoading } = useDMContacts()
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!open) { setQ(''); setBusyId(null); return }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    const match = (c) => !term || (c.name || '').toLowerCase().includes(term)
    const staff = contacts.filter((c) => c.role !== 'student' && match(c))
    const peers = contacts.filter((c) => c.role === 'student' && match(c))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
    return { staff, peers }
  }, [contacts, q])

  async function pick(c) {
    if (busyId) return
    setBusyId(c.id)
    try {
      const threadId = await getOrCreateDMThread(c.id)
      onPicked(threadId)
    } catch (e) {
      setBusyId(null)
      // eslint-disable-next-line no-alert
      alert('تعذّر فتح المحادثة. تأكد من أنك تستطيع مراسلة هذا الشخص.')
    }
  }

  const Row = (c) => (
    <button
      key={c.id}
      onClick={() => pick(c)}
      disabled={!!busyId}
      className="w-full flex items-center gap-3 px-3 rounded-xl transition-colors hover:bg-[var(--ds-surface-1)]"
      style={{ minHeight: 58, direction: 'rtl' }}
    >
      <SenderAvatar sender={{ full_name: c.name, avatar_url: c.avatar }} senderId={c.id} size={42} />
      <div className="flex-1 min-w-0 text-right">
        <div className="font-bold truncate" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, color: senderColor(c.id).soft }}>{c.name}</div>
        <div className="flex items-center gap-1 mt-0.5 text-[12px]" style={{ fontFamily: 'Tajawal', color: c.role === 'student' ? 'var(--ds-text-tertiary)' : 'var(--ds-accent-gold)' }}>
          {c.role === 'student' ? <span>زميل · المستوى {c.level}</span> : (<><Star size={11} fill="currentColor" strokeWidth={0} /><span>{c.role === 'admin' ? 'الإدارة' : 'المدرب'}</span></>)}
        </div>
      </div>
      {busyId === c.id && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ds-accent-primary)' }} />}
    </button>
  )

  const Section = (title, items) => items.length ? (
    <div className="mb-2">
      <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-tertiary)', letterSpacing: '0.04em' }}>{title}</div>
      {items.map(Row)}
    </div>
  ) : null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0" style={{ zIndex: 78, background: 'rgba(3,7,15,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.24, ease }}
            className="fixed rounded-3xl flex flex-col"
            style={{
              zIndex: 79, direction: 'rtl',
              insetInlineStart: '50%', transform: 'translateX(50%)',
              top: 'calc(var(--sat,0px) + 56px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)',
              width: 'min(440px, calc(100vw - 24px))',
              background: 'color-mix(in srgb, var(--ds-bg-elevated) 96%, transparent)',
              backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)',
              border: '1px solid var(--ds-border-subtle)', boxShadow: '0 32px 80px -20px rgba(0,0,0,0.7)',
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
              <h3 className="flex-1 font-bold" style={{ fontFamily: 'Tajawal', fontSize: 17, color: 'var(--ds-text-primary)' }}>رسالة جديدة</h3>
              <button onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-1)]" style={{ color: 'var(--ds-text-muted)' }}><X size={18} /></button>
            </div>
            <div className="px-3 pt-3">
              <div className="flex items-center gap-2 px-3 rounded-xl" style={{ height: 44, background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
                <Search size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن شخص…" autoFocus
                  className="flex-1 bg-transparent outline-none" style={{ fontFamily: 'Tajawal', fontSize: 16, color: 'var(--ds-text-primary)' }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3" style={{ overscrollBehavior: 'contain' }}>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--ds-accent-primary)' }} /></div>
              ) : (!groups.staff.length && !groups.peers.length) ? (
                <p className="text-center py-8 text-sm" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)' }}>لا يوجد جهات اتصال متاحة</p>
              ) : (
                <>
                  {Section('المدربون والإدارة', groups.staff)}
                  {Section('زملاء نفس المستوى', groups.peers)}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
