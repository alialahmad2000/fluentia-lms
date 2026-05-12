// Groups consecutive messages from the same sender within 4 minutes.
// Renders ONE avatar + ONE name/time header, then tight bubbles.
import { motion } from 'framer-motion'
import { fadeRise } from '../../lib/motion'
import MessageBubble from '../MessageBubble'
import { useAuthStore } from '../../../../stores/authStore'

export default function MessageGroupPremium({
  messages,
  channelId,
  groupId,
  onReply,
  onEdit,
}) {
  const { profile } = useAuthStore()
  if (!messages.length) return null

  const first = messages[0]
  const sender = first.sender
  const isOwn = first.sender_id === profile?.id
  const displayName = sender
    ? (sender.display_name || sender.full_name || '').trim()
    : ''
  const avatarLetter = displayName?.[0] ?? '?'

  return (
    <motion.div
      {...fadeRise}
      className="flex gap-2 px-4"
      style={{ direction: 'rtl', marginBottom: 16 }}
    >
      {/* Avatar — right side in RTL (far from left edge) */}
      {!isOwn && (
        <div className="shrink-0 self-end mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
            style={{
              background: 'var(--ds-accent-primary)',
              color: 'var(--ds-bg-base)',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {sender?.avatar_url
              ? <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
              : avatarLetter
            }
          </div>
        </div>
      )}

      <div
        className="flex flex-col"
        style={{
          maxWidth: '75%',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          marginRight: isOwn ? 'auto' : undefined,
          marginLeft: isOwn ? undefined : 'auto',
          // RTL: own = left side, other = right side
          ...(isOwn
            ? { marginRight: 0, marginLeft: 'auto' }
            : { marginRight: 'auto', marginLeft: 0 }
          ),
        }}
      >
        {/* Name + timestamp header */}
        {!isOwn && (
          <div
            className="flex items-baseline gap-2 mb-1 px-1"
            style={{ direction: 'rtl' }}
          >
            <span
              className="text-xs font-semibold text-[var(--ds-text-secondary)]"
              style={{ fontFamily: 'Tajawal, sans-serif' }}
            >
              {displayName}
            </span>
            <span
              className="text-[10px] text-[var(--ds-text-muted)] tabular-nums"
              style={{ fontFamily: 'monospace' }}
            >
              {new Date(first.created_at).toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Bubble stack — tight gaps within a group */}
        <div className="flex flex-col gap-1">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isGrouped={idx > 0}
              channelId={channelId || msg.channel_id}
              groupId={groupId}
              onReply={onReply}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>

      {/* Own-message avatar placeholder (no avatar for own) */}
      {isOwn && <div className="w-0 shrink-0" />}
    </motion.div>
  )
}
