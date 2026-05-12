import { Pin, X } from 'lucide-react'
import { useAuthStore } from '../../../../stores/authStore'
import { useTogglePin } from '../../mutations/useTogglePin'

function timeAgoAr(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 2) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'أمس'
  if (days < 7) return `منذ ${days} أيام`
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
}

export default function PinnedCard({ message, onScrollTo }) {
  const { profile } = useAuthStore()
  const togglePin = useTogglePin(message?.channel_id)
  const isStaff = ['trainer', 'admin'].includes(profile?.role)

  const sender = message?.sender
  const name = (sender?.display_name || sender?.full_name || '').trim()
  const bodyText = message?.body || message?.content || ''
  const preview = bodyText.length > 64 ? bodyText.slice(0, 64) + '…' : bodyText
  const isVoice = message?.type === 'voice'

  return (
    <button
      onClick={() => onScrollTo?.(message?.id)}
      className="group flex items-start gap-2 py-2.5 rounded-xl shrink-0 transition-all text-right relative overflow-hidden"
      style={{
        // Glass background
        background: 'color-mix(in srgb, var(--ds-bg-elevated) 88%, transparent)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid color-mix(in srgb, var(--ds-border-subtle) 60%, transparent)',
        // 3px gold left border via box-shadow on inline-start
        borderInlineStart: '3px solid color-mix(in srgb, var(--ds-accent-gold) 50%, transparent)',
        boxShadow: '0 1px 4px 0 rgba(0,0,0,0.15), inset 0 1px 0 0 color-mix(in srgb, white 4%, transparent)',
        minWidth: 200,
        maxWidth: 260,
        direction: 'rtl',
        paddingRight: 12,
        paddingLeft: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderInlineStartColor = 'color-mix(in srgb, var(--ds-accent-gold) 80%, transparent)'
        e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.2), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent), 0 0 12px -4px color-mix(in srgb, var(--ds-accent-gold) 25%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderInlineStartColor = 'color-mix(in srgb, var(--ds-accent-gold) 50%, transparent)'
        e.currentTarget.style.boxShadow = '0 1px 4px 0 rgba(0,0,0,0.15), inset 0 1px 0 0 color-mix(in srgb, white 4%, transparent)'
      }}
    >
      <Pin size={12} className="shrink-0 mt-1" style={{ color: 'var(--ds-accent-gold)' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p
            className="text-[12px] font-semibold truncate flex-1"
            style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-primary)' }}
          >
            {name}
          </p>
          <span
            className="text-[10px] shrink-0 tabular-nums"
            style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-muted)' }}
          >
            {timeAgoAr(message?.pinned_at || message?.created_at)}
          </span>
        </div>
        <p
          className="text-[12px] truncate mt-0.5"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-secondary)', fontWeight: 500, lineHeight: 1.5 }}
        >
          {isVoice ? '🎙️ رسالة صوتية' : preview || '—'}
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
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
          style={{ color: 'var(--ds-text-muted)', minWidth: 28, minHeight: 28 }}
          title="إلغاء التثبيت"
        >
          <X size={11} />
        </button>
      )}
    </button>
  )
}
