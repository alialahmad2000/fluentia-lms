import { useState } from 'react'
import { Reply, Pin, Edit2, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import MessageBubbleText from './MessageBubbleText'
import MessageBubbleVoice from './MessageBubbleVoice'
import MessageBubbleImage from './MessageBubbleImage'
import MessageBubbleFile from './MessageBubbleFile'
import MessageBubbleLink from './MessageBubbleLink'
import MessageBubbleAnnouncement from './MessageBubbleAnnouncement'
import ReactionInlineBar from './premium/ReactionInlineBar'
import ReactionSummary from './premium/ReactionSummary'
import { useReact } from '../mutations/useReact'
import { useDeleteMessage } from '../mutations/useDeleteMessage'
import { useTogglePin } from '../mutations/useTogglePin'
import MessageBubbleSystem from './MessageBubbleSystem'

export default function MessageBubble({
  message,
  isGrouped,
  channelId,
  groupId,
  onReply,
  onEdit,
}) {
  const { profile } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionBar, setShowReactionBar] = useState(false)

  const react = useReact(channelId)
  const deleteMsg = useDeleteMessage(channelId)
  const togglePin = useTogglePin(channelId)

  const isOwn = message.sender_id === profile?.id
  const isTrainerOrAdmin = ['trainer', 'admin'].includes(profile?.role)
  const isDeleted = !!message.deleted_at

  // System messages: always centered, no bubble
  if (message.type === 'system') {
    return <MessageBubbleSystem body={message.body || message.content} />
  }

  if (isDeleted) {
    return (
      <div className="flex justify-center py-1">
        <span
          className="text-xs italic px-3 py-1 rounded-full"
          style={{
            fontFamily: 'Tajawal, sans-serif',
            color: 'var(--ds-text-muted)',
            background: 'var(--ds-surface-1)',
            border: '1px solid var(--ds-border-subtle)',
          }}
        >
          تم حذف الرسالة
        </span>
      </div>
    )
  }

  const sender = message.sender
  const displayName = sender
    ? (sender.display_name || sender.full_name || sender.first_name_ar || '').trim()
    : 'مستخدم'

  const bodyText = message.body || message.content

  // Bubble background: own = accent tint, other = glass surface
  const bubbleBg = isOwn
    ? 'color-mix(in srgb, var(--ds-accent-primary) 10%, transparent)'
    : 'var(--ds-surface-1)'
  const bubbleBorder = isOwn
    ? '1px solid color-mix(in srgb, var(--ds-accent-primary) 20%, transparent)'
    : '1px solid var(--ds-border-subtle)'

  return (
    <div
      className={`relative group px-4 ${isGrouped ? 'pt-1 pb-1' : 'pt-3 pb-1'}`}
      style={{ direction: 'rtl' }}
    >
      {/* Bubble aligned: own=left (near), other=right (far) in RTL */}
      <div
        className="inline-block max-w-[78%] relative"
        style={{ float: isOwn ? 'left' : 'right' }}
      >
        <div
          className="px-3 py-2.5 rounded-2xl"
          style={{
            background: bubbleBg,
            border: bubbleBorder,
            backdropFilter: 'blur(8px)',
            lineHeight: 1.7,
          }}
        >
      <div className="min-w-0">
        {/* Name + time */}
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="text-sm font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'Tajawal, sans-serif' }}
            >
              {displayName}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.is_edited && (
              <span className="text-[11px] text-[var(--text-muted)]">(معدل)</span>
            )}
          </div>
        )}

        {/* Reply preview */}
        {message.reply_message && (
          <div className="mb-1 px-2 py-1 border-r-2 border-sky-400 bg-sky-400/5 rounded text-xs text-[var(--text-muted)]" style={{ borderInlineStart: '2px solid', borderInlineEnd: 'none' }}>
            {message.reply_message.sender?.first_name_ar}: {message.reply_message.body || message.reply_message.content || '🎙️'}
          </div>
        )}

        {/* Message content */}
        {message.type === 'text' && <MessageBubbleText body={bodyText} mentions={message.mentions} />}
        {message.type === 'voice' && <MessageBubbleVoice message={message} />}
        {message.type === 'image' && <MessageBubbleImage message={message} />}
        {message.type === 'file' && <MessageBubbleFile message={message} />}
        {message.type === 'link' && <MessageBubbleLink message={message} />}
        {message.type === 'announcement' && <MessageBubbleAnnouncement message={message} body={bodyText} />}

        {/* Premium reaction summary */}
        <ReactionSummary
          reactions={message.reactions}
          myId={profile?.id}
          messageId={message.id}
          onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
        />
        </div>{/* close min-w-0 */}
        </div>{/* close bubble rounded-2xl */}
      </div>{/* close inline-block */}
      <div style={{ clear: 'both' }} />

      {/* Hover action buttons */}
      <div
        className="absolute top-1 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg shadow-md px-1.5 py-1"
        style={{
          background: 'color-mix(in srgb, var(--ds-bg-elevated) 90%, transparent)',
          border: '1px solid var(--ds-border-subtle)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Premium reaction inline bar */}
        <div className="relative">
          <button
            onClick={() => setShowReactionBar((p) => !p)}
            onMouseEnter={() => setShowReactionBar(true)}
            className="p-1.5 rounded hover:bg-[var(--ds-surface-1)] text-base transition-colors"
            style={{ minWidth: 32, minHeight: 32, color: 'var(--ds-text-secondary)' }}
            title="تفاعل"
          >
            😊
          </button>
          <ReactionInlineBar
            visible={showReactionBar}
            onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
            onDismiss={() => setShowReactionBar(false)}
          />
        </div>

        <button
          onClick={() => onReply?.(message)}
          className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-sky-400 transition-colors"
          style={{ minWidth: 32, minHeight: 32 }}
          title="رد"
        >
          <Reply size={15} />
        </button>

        {(isOwn || isTrainerOrAdmin) && (
          <>
            {isTrainerOrAdmin && (
              <button
                onClick={() => { togglePin.mutate({ messageId: message.id, isPinned: message.is_pinned }); setShowMenu(false) }}
                className={`p-1.5 rounded hover:bg-[var(--surface)] transition-colors ${message.is_pinned ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-amber-400'}`}
                style={{ minWidth: 32, minHeight: 32 }}
                title={message.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              >
                <Pin size={15} />
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => { onEdit?.(message); setShowMenu(false) }}
                className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-sky-400 transition-colors"
                style={{ minWidth: 32, minHeight: 32 }}
                title="تعديل"
              >
                <Edit2 size={15} />
              </button>
            )}
            <button
              onClick={() => { if (window.confirm('هل تريد حذف هذه الرسالة؟')) deleteMsg.mutate({ messageId: message.id }) }}
              className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-red-400 transition-colors"
              style={{ minWidth: 32, minHeight: 32 }}
              title="حذف"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
