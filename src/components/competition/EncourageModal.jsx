import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { useSendEncouragement, useCompetitionContext } from '../../hooks/useCompetition'

const PRESETS = [
  'أحسنت، واصل 👏',
  'فريقك يحتاجك 💪',
  'قدها، أنت قوي/ة 🔥',
  'كلنا ورائك ⚡',
  'فخور/ة بجهدك 💎',
  'محبوب/ة في فريقنا ❤️',
]

function Avatar({ name, size = 48 }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: 'rgba(245,200,66,0.15)',
        border: '2px solid rgba(245,200,66,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.45, fontWeight: 700,
        color: 'var(--ds-xp-gold-fg, #f5c842)',
        flexShrink: 0,
      }}
    >
      {(name || '?').charAt(0)}
    </div>
  )
}

export default function EncourageModal({ studentId, studentName, onClose }) {
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState('')
  const { data: ctx } = useCompetitionContext()
  const { mutate: sendEncouragement, isPending } = useSendEncouragement()

  const remaining = ctx?.encouragements_remaining_today ?? 5
  const message = selected ?? custom.trim()
  const canSubmit = message.length > 0 && remaining > 0 && !isPending

  function handleSubmit() {
    if (!canSubmit) return
    sendEncouragement(
      { toStudentId: studentId, message },
      { onSuccess: onClose, onError: () => {} },
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9900,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 420,
            fontFamily: 'Tajawal, sans-serif',
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <Avatar name={studentName} />
              <div>
                <div className="font-bold text-white text-base">شجّع {studentName}</div>
                <div className="text-xs text-slate-400">متبقي اليوم: {remaining}/5 تشجيعات</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
              <X size={18} />
            </button>
          </div>

          {/* Remaining bar */}
          {remaining === 0 && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 text-center">
              وصلت للحد اليومي — عد غداً لإرسال المزيد 🌙
            </div>
          )}

          {/* Preset messages */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESETS.map((msg) => (
              <button
                key={msg}
                onClick={() => { setSelected(selected === msg ? null : msg); setCustom('') }}
                className="text-xs text-right px-3 py-2.5 rounded-xl font-medium transition-all"
                style={{
                  background: selected === msg ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.04)',
                  border: selected === msg ? '1px solid rgba(245,200,66,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: selected === msg ? 'var(--ds-xp-gold-fg, #f5c842)' : 'rgba(255,255,255,0.7)',
                }}
              >
                {msg}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="mb-5">
            <div className="text-xs text-slate-500 mb-2">أو اكتب رسالتك</div>
            <textarea
              value={custom}
              onChange={(e) => { setCustom(e.target.value.slice(0, 200)); setSelected(null) }}
              placeholder="اكتب رسالة تشجيع هنا..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'Tajawal, sans-serif',
              }}
              dir="rtl"
            />
            <div className="text-xs text-slate-600 text-left mt-1">{custom.length}/200</div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--ds-xp-gold-border, rgba(245,200,66,0.35))',
              color: 'var(--ds-xp-gold-fg, #f5c842)',
            }}
          >
            <Send size={15} />
            {isPending ? 'جاري الإرسال...' : 'إرسال التشجيع (+2 XP لك)'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
