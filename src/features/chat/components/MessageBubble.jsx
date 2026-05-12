import { useState } from 'react'
import { Reply, Pin, Edit2, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import MessageBubbleText from './MessageBubbleText'
import MessageBubbleVoice from './MessageBubbleVoice'
import MessageBubbleImage from './MessageBubbleImage'
import MessageBubbleFile from './MessageBubbleFile'
import MessageBubbleLink from './MessageBubbleLink'
import MessageBubbleAnnouncement from './MessageBubbleAnnouncement'
import MessageBubbleSystem from './MessageBubbleSystem'
import ReactionInlineBar from './premium/ReactionInlineBar'
import ReactionSummary from './premium/ReactionSummary'
import { useReact } from '../mutations/useReact'
import { useDeleteMessage } from '../mutations/useDeleteMessage'
import { useTogglePin } from '../mutations/useTogglePin'

// Tail-radius presets: CSS order is TL TR BR BL
// Other-user: avatar on RIGHT side → tail points right (BR corner)
// Own-user: aligned LEFT → tail points left (BL corner)
function getBubbleRadius(position, isOwn) {
  if (isOwn) {
    // Own: tail at BL (bottom-left)
    const r = { single: '16px 16px 16px 4px', first: '16px 16px 4px 16px', middle: '4px 16px 16px 4px', last: '4px 16px 16px 4px' }
    return r[position] ?? r.single
  }
  // Other: tail at BR (bottom-right)
  const r = { single: '16px 16px 4px 16px', first: '16px 16px 4px 16px', middle: '16px 4px 4px 16px', last: '16px 4px 4px 16px' }
  return r[position] ?? r.single
}

const BUBBLE_SHADOW = `
  0 1px 2px 0 rgba(0,0,0,0.18),
  0 4px 12px -4px rgba(0,0,0,0.22),
  inset 0 1px 0 0 color-mix(in srgb, white 4%, transparent)
`

export default function MessageBubble({
  message,
  isGrouped,
  position = 'single',
  channelId,
  groupId,
  onReply,
  onEdit,
}) {
  const { profile } = useAuthStore()
  const [showReactionBar, setShowReactionBar] = useState(false)

  const react = useReact(channelId)
  const deleteMsg = useDeleteMessage(channelId)
  const togglePin = useTogglePin(channelId)

  const isOwn = message.sender_id === profile?.id
  const isTrainerOrAdmin = ['trainer', 'admin'].includes(profile?.role)
  const isDeleted = !!message.deleted_at

  // System messages: always centered ghost text
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
  const borderRadius = getBubbleRadius(position, isOwn)

  // Bubble background
  const bubbleStyle = isOwn
    ? {
        background: `linear-gradient(135deg,
          color-mix(in srgb, var(--ds-accent-primary) 22%, var(--ds-bg-elevated)) 0%,
          color-mix(in srgb, var(--ds-accent-primary) 14%, var(--ds-bg-elevated)) 100%)`,
        border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 28%, transparent)',
      }
    : {
        background: 'color-mix(in srgb, var(--ds-bg-elevated) 92%, transparent)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        border: '1px solid color-mix(in srgb, var(--ds-border-subtle) 60%, transparent)',
      }

  return (
    <div
      className={`relative group ${isGrouped ? 'mt-1' : 'mt-3'}`}
      style={{ direction: 'rtl' }}
    >
      {/* Bubble — float for RTL alignment */}
      <div
        className="inline-block max-w-[560px] relative"
        style={{
          float: isOwn ? 'left' : 'right',
          maxWidth: '76%',
        }}
      >
        <div
          className="px-4 py-3 transition-colors"
          style={{
            ...bubbleStyle,
            borderRadius,
            boxShadow: BUBBLE_SHADOW,
            lineHeight: 1.7,
          }}
        >
          {/* Sender name + timestamp — first bubble in group only */}
          {!isGrouped && !isOwn && (
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="text-xs font-semibold"
                style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-accent-primary)' }}
              >
                {displayName}
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: 'var(--ds-text-muted)', fontFamily: 'monospace' }}
              >
                {new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.is_edited && (
                <span className="text-[10px]" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal' }}>(معدل)</span>
              )}
            </div>
          )}
          {/* Own message timestamp on first bubble */}
          {!isGrouped && isOwn && (
            <div className="flex justify-end mb-1">
              <span
                className="text-[10px] tabular-nums"
                style={{ color: 'color-mix(in srgb, var(--ds-accent-primary) 60%, transparent)', fontFamily: 'monospace' }}
              >
                {new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                {message.is_edited && ' · معدل'}
              </span>
            </div>
          )}

          {/* Reply preview */}
          {message.reply_message && (
            <div
              className="mb-2 px-2 py-1.5 rounded-lg text-xs"
              style={{
                borderInlineStart: '2px solid var(--ds-accent-primary)',
                paddingInlineStart: 8,
                background: 'color-mix(in srgb, var(--ds-accent-primary) 6%, transparent)',
                fontFamily: 'Tajawal, sans-serif',
                color: 'var(--ds-text-secondary)',
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>
                {message.reply_message.sender?.display_name || message.reply_message.sender?.full_name}:{' '}
              </span>
              {message.reply_message.body || message.reply_message.content || '🎙️'}
            </div>
          )}

          {/* Message content */}
          {message.type === 'text' && <MessageBubbleText body={bodyText} mentions={message.mentions} />}
          {message.type === 'voice' && <MessageBubbleVoice message={message} />}
          {message.type === 'image' && <MessageBubbleImage message={message} />}
          {message.type === 'file' && <MessageBubbleFile message={message} />}
          {message.type === 'link' && <MessageBubbleLink message={message} />}
          {message.type === 'announcement' && <MessageBubbleAnnouncement message={message} body={bodyText} />}
        </div>

        {/* Reaction summary below bubble */}
        <ReactionSummary
          reactions={message.reactions}
          myId={profile?.id}
          messageId={message.id}
          onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
        />
      </div>
      <div style={{ clear: 'both' }} />

      {/* Hover action bar */}
      <div
        className="absolute top-2 left-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl px-1 py-0.5"
        style={{
          background: 'color-mix(in srgb, var(--ds-bg-elevated) 94%, transparent)',
          border: '1px solid var(--ds-border-subtle)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 16px -4px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
      >
        <div className="relative">
          <button
            onMouseEnter={() => setShowReactionBar(true)}
            onClick={() => setShowReactionBar((p) => !p)}
            className="p-1.5 rounded-lg transition-colors text-base hover:bg-[var(--ds-surface-1)]"
            style={{ minWidth: 32, minHeight: 32, color: 'var(--ds-text-secondary)' }}
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
          className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-1)] transition-colors"
          style={{ minWidth: 32, minHeight: 32, color: 'var(--ds-text-secondary)' }}
          title="رد"
        >
          <Reply size={14} />
        </button>

        {(isOwn || isTrainerOrAdmin) && (
          <>
            {isTrainerOrAdmin && (
              <button
                onClick={() => togglePin.mutate({ messageId: message.id })}
                className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-1)] transition-colors"
                style={{
                  minWidth: 32, minHeight: 32,
                  color: message.is_pinned ? 'var(--ds-accent-gold)' : 'var(--ds-text-secondary)',
                }}
                title={message.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              >
                <Pin size={14} />
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onEdit?.(message)}
                className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-1)] transition-colors"
                style={{ minWidth: 32, minHeight: 32, color: 'var(--ds-text-secondary)' }}
                title="تعديل"
              >
                <Edit2 size={14} />
              </button>
            )}
            <button
              onClick={() => { if (window.confirm('هل تريد حذف هذه الرسالة؟')) deleteMsg.mutate({ messageId: message.id }) }}
              className="p-1.5 rounded-lg hover:bg-[var(--ds-surface-1)] transition-colors"
              style={{ minWidth: 32, minHeight: 32, color: 'var(--ds-text-secondary)' }}
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
