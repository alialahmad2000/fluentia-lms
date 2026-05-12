import { Pin, X } from 'lucide-react'
import { useAuthStore } from '../../../../stores/authStore'
import { useTogglePin } from '../../mutations/useTogglePin'

function timeAgoAr(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'أمس'
  if (days < 7) return `منذ ${days} أيام`
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
}

export default function PinnedCard({ message, channelId, onScrollTo }) {
  const { profile } = useAuthStore()
  const togglePin = useTogglePin(channelId ?? message?.channel_id)
  const isStaff = ['trainer', 'admin'].includes(profile?.role)

  const sender = message?.sender
  const name = (sender?.display_name || sender?.full_name || '').trim()
  const preview = (message?.body || message?.content || '').slice(0, 60) +
    ((message?.body || message?.content || '').length > 60 ? '…' : '')
  const isVoice = message?.type === 'voice'

  return (
    <button
      onClick={() => onScrollTo?.(message?.id)}
      className="group flex items-start gap-2 px-3 py-2 rounded-xl shrink-0 transition-all hover:bg-[var(--ds-surface-2)] text-right"
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)',
        minWidth: 200,
        maxWidth: 260,
        direction: 'rtl',
      }}
    >
      <Pin size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-gold)' }} />
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold truncate"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-accent-gold)' }}
        >
          {name}
        </p>
        <p
          className="text-xs truncate leading-snug"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-secondary)' }}
        >
          {isVoice ? '🎙️ رسالة صوتية' : preview}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal' }}>
          {timeAgoAr(message?.pinned_at || message?.created_at)}
        </p>
      </div>
      {isStaff && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm('إلغاء تثبيت هذه الرسالة؟')) {
              togglePin.mutate({ messageId: message.id })
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
          style={{ color: 'var(--ds-text-muted)' }}
          title="إلغاء التثبيت"
        >
          <X size={12} />
        </button>
      )}
    </button>
  )
}
