import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

// In-app replacement for window.confirm — matches the app's glass tokens.
export default function ConfirmModal({ title, body, confirmLabel = 'تأكيد', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <div dir="rtl" className="fixed inset-0 z-[90] flex items-center justify-center p-6"
      style={{ background: 'rgba(2, 8, 18, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: 'var(--ds-bg-elevated, var(--ds-surface-1))', border: '1px solid var(--ds-border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start gap-3 mb-4">
          <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
            style={{
              background: danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--ds-surface-2)',
              color: danger ? 'var(--ds-accent-danger, #ef4444)' : 'var(--ds-accent-warning, #f59e0b)',
            }}>
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--ds-text-primary)' }}>{title}</h3>
            {body && <p className="text-xs leading-relaxed" style={{ color: 'var(--ds-text-tertiary)' }}>{body}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
            style={{
              background: danger ? 'var(--ds-accent-danger, #ef4444)' : 'var(--ds-accent-primary)',
              color: danger ? '#fff' : '#06121f',
              opacity: busy ? 0.6 : 1,
            }}>
            {busy ? 'لحظة…' : confirmLabel}
          </button>
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
            style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
            رجوع
          </button>
        </div>
      </motion.div>
    </div>
  )
}
