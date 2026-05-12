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

  if (isDeleted) {
    return (
      <div className="px-4 py-1 text-sm text-[var(--text-muted)] italic" style={{ direction: 'rtl' }}>
        تم حذف الرسالة
      </div>
    )
  }

  const sender = message.sender
  const displayName = sender
    ? `${sender.first_name_ar ?? ''} ${sender.last_name_ar ?? ''}`.trim()
    : 'مستخدم'

  const bodyText = message.body || message.content

  return (
    <div
      className={`relative group flex gap-2 px-4 ${isGrouped ? 'pt-0.5 pb-0.5' : 'pt-3 pb-0.5'}`}
      style={{ direction: 'rtl' }}
    >
      {/* Avatar — hidden in grouped messages */}
      {!isGrouped ? (
        <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-sm font-bold shrink-0 mt-0.5">
          {sender?.avatar_url
            ? <img src={sender.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            : (sender?.first_name_ar?.[0] ?? '?')
          }
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
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
        {message.type === 'system' && (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-1">{bodyText}</p>
        )}

        {/* Premium reaction summary */}
        <ReactionSummary
          reactions={message.reactions}
          myId={profile?.id}
          messageId={message.id}
          onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
        />
      </div>

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
