// Long-press / right-click message menu — a premium reaction strip + actions.
// Bottom sheet on phone, anchored popover on desktop. Portaled to body.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Reply, Copy, Pin, Edit2, Trash2, Forward } from 'lucide-react'
import { ease } from '../../lib/motion'
import ForwardSheet from './ForwardSheet'

const EMOJIS = ['👍', '🔥', '❤️', '😂', '👏', '🙏']

export default function MessageActionSheet({
  open, onClose, message, isOwn, isTrainer, anchor,
  onReact, onReply, onEdit, onPin, onDelete,
}) {
  const [forwardOpen, setForwardOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const run = (fn) => () => { fn?.(); onClose() }

  async function copy() {
    try { await navigator.clipboard?.writeText(message?.body || message?.content || '') } catch { /* noop */ }
    onClose()
  }

  const actions = [
    { key: 'reply', label: 'رد', icon: Reply, onClick: run(() => onReply?.(message)) },
    (message?.body || message?.content) && { key: 'copy', label: 'نسخ', icon: Copy, onClick: copy },
    { key: 'forward', label: 'إعادة توجيه', icon: Forward, onClick: () => { setForwardOpen(true); onClose() } },
    isTrainer && { key: 'pin', label: message?.is_pinned ? 'إلغاء التثبيت' : 'تثبيت', icon: Pin, onClick: run(onPin), gold: true },
    isOwn && { key: 'edit', label: 'تعديل', icon: Edit2, onClick: run(() => onEdit?.(message)) },
    (isOwn || isTrainer) && { key: 'delete', label: 'حذف', icon: Trash2, onClick: run(onDelete), danger: true },
  ].filter(Boolean)

  const panel = {
    background: 'color-mix(in srgb, var(--ds-bg-elevated) 96%, transparent)',
    backdropFilter: 'blur(24px) saturate(150%)',
    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
    border: '1px solid var(--ds-border-subtle)',
    boxShadow: '0 24px 60px -16px rgba(0,0,0,0.6)',
    direction: 'rtl',
  }

  const ReactionStrip = (
    <div className="flex items-center justify-between gap-1 px-1 pb-2 mb-2" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
      {EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.12, y: -2 }}
          transition={{ duration: 0.16, ease }}
          onClick={run(() => onReact?.(emoji))}
          className="flex items-center justify-center rounded-full"
          style={{ width: 44, height: 44, fontSize: 24 }}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  )

  const ActionList = (
    <div className="flex flex-col">
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <button
            key={a.key}
            onMouseDown={(e) => e.preventDefault()}
            onClick={a.onClick}
            className="flex items-center gap-3 px-3 rounded-xl transition-colors hover:bg-[var(--ds-surface-1)]"
            style={{
              height: 46,
              color: a.danger ? 'var(--ds-accent-danger)' : a.gold ? 'var(--ds-accent-gold)' : 'var(--ds-text-primary)',
              fontFamily: 'Tajawal, sans-serif', fontSize: 15,
            }}
          >
            <Icon size={18} />
            <span className="font-medium">{a.label}</span>
          </button>
        )
      })}
    </div>
  )

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0" style={{ zIndex: 78, background: 'rgba(3,7,15,0.45)' }}
            onClick={onClose}
          />
          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 rounded-t-3xl p-4"
              style={{ ...panel, zIndex: 79, paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="mx-auto mb-3 rounded-full" style={{ width: 40, height: 4, background: 'var(--ds-border-subtle)' }} />
              {ReactionStrip}
              {ActionList}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease }}
              className="fixed rounded-2xl p-2.5"
              style={{
                ...panel, zIndex: 79, width: 240,
                top: Math.min(anchor?.y ?? 120, (typeof window !== 'undefined' ? window.innerHeight : 800) - 360),
                left: Math.max(12, Math.min((anchor?.x ?? 200) - 120, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 252)),
                transformOrigin: 'top center',
              }}
            >
              {ReactionStrip}
              {ActionList}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
    {forwardOpen && <ForwardSheet message={message} onClose={() => setForwardOpen(false)} />}
    </>,
    document.body
  )
}
