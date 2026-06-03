import { useState } from 'react'
import { Reply, Pin, Edit2, Trash2, Smile } from 'lucide-react'
import { useAuthProfile } from '../../../stores/authStore'
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

// Tail-radius presets (CSS order: TL TR BR BL). Rounded 18px, tail/spine 5px.
//   Other-user → floats RIGHT, spine + tail on the right edge.
//   Own-user   → floats LEFT,  spine + tail on the left edge.
function getBubbleRadius(position, isOwn) {
  if (isOwn) {
    const r = {
      single: '18px 18px 18px 5px',
      first:  '18px 18px 18px 5px',
      middle: '5px 18px 18px 5px',
      last:   '5px 18px 18px 5px',
    }
    return r[position] ?? r.single
  }
  const r = {
    single: '18px 18px 5px 18px',
    first:  '18px 18px 5px 18px',
    middle: '18px 5px 5px 18px',
    last:   '18px 5px 5px 18px',
  }
  return r[position] ?? r.single
}

const SHADOW_OWN = [
  '0 1px 2px -1px rgba(0,0,0,0.20)',
  '0 6px 16px -6px rgba(0,0,0,0.30)',
  '0 14px 34px -12px color-mix(in srgb, var(--ds-accent-gold) 30%, transparent)',
  'inset 0 1px 0 0 color-mix(in srgb, white 11%, transparent)',
].join(',')

const SHADOW_OTHER = [
  '0 1px 2px -1px rgba(0,0,0,0.16)',
  '0 6px 16px -6px rgba(0,0,0,0.24)',
  '0 14px 34px -14px rgba(0,0,0,0.28)',
  'inset 0 1px 0 0 color-mix(in srgb, white 7%, transparent)',
].join(',')

export default function MessageBubble({
  message,
  isGrouped,
  position = 'single',
  channelId,
  groupId,
  onReply,
  onEdit,
}) {
  const profile = useAuthProfile()
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
  const time = new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  // Bubble surface — own = gold-tinted glass; other = cool glass over the aurora
  const bubbleStyle = isOwn
    ? {
        background: `linear-gradient(to left,
          color-mix(in srgb, var(--ds-accent-gold) 26%, var(--ds-bg-elevated)) 0%,
          color-mix(in srgb, var(--ds-accent-gold) 15%, var(--ds-bg-elevated)) 100%)`,
        border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 34%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: SHADOW_OWN,
      }
    : {
        background: 'color-mix(in srgb, var(--ds-bg-elevated) 76%, transparent)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        border: '1px solid color-mix(in srgb, var(--ds-border-subtle) 90%, transparent)',
        boxShadow: SHADOW_OTHER,
      }

  // Hover toolbar anchors to the screen-edge side of the bubble and extends
  // inward (toward centre) so it can never clip off-screen on narrow phones.
  const innerSide = isOwn ? { left: 4 } : { right: 4 }

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      data-sender-id={message.sender_id}
      className={`relative group ${isGrouped ? 'mt-1' : 'mt-3.5'}`}
      style={{ direction: 'rtl' }}
    >
      <div
        className="inline-block relative align-top"
        style={{ float: isOwn ? 'left' : 'right', maxWidth: '78%' }}
      >
        <div
          className="px-3.5 py-2.5 transition-transform duration-200"
          style={{ ...bubbleStyle, borderRadius, lineHeight: 1.75 }}
        >
          {/* Sender name + timestamp — first bubble of an other-user group */}
          {!isGrouped && !isOwn && (
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="text-[13px] font-semibold truncate"
                style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-secondary)', letterSpacing: '0.01em', maxWidth: 200 }}
              >
                {displayName}
              </span>
              <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {time}
              </span>
              {message.is_edited && (
                <span className="text-[11px] shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal' }}>· معدّل</span>
              )}
            </div>
          )}

          {/* Reply preview */}
          {message.reply_message && (
            <div
              className="mb-2 px-2.5 py-1.5 rounded-xl text-xs"
              style={{
                borderInlineStart: '2.5px solid color-mix(in srgb, var(--ds-accent-gold) 70%, transparent)',
                background: 'color-mix(in srgb, var(--ds-accent-gold) 9%, transparent)',
                fontFamily: 'Tajawal, sans-serif',
                color: 'var(--ds-text-secondary)',
              }}
            >
              <span className="font-semibold" style={{ color: 'color-mix(in srgb, var(--ds-accent-gold) 85%, white)' }}>
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

          {/* Own message timestamp — inline footer */}
          {isOwn && (
            <div className="flex justify-start mt-0.5">
              <span
                className="text-[10.5px] tabular-nums"
                style={{ color: 'color-mix(in srgb, var(--ds-accent-gold) 55%, var(--ds-text-tertiary))', fontVariantNumeric: 'tabular-nums' }}
              >
                {time}{message.is_edited && ' · معدّل'}
              </span>
            </div>
          )}
        </div>

        {/* Reaction summary below bubble */}
        <ReactionSummary
          reactions={message.reactions}
          myId={profile?.id}
          messageId={message.id}
          onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
        />

        {/* Hover action toolbar — inner side, fades in on group hover */}
        <div
          className="absolute flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-2xl px-1 py-0.5"
          style={{
            top: -14,
            ...innerSide,
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 92%, transparent)',
            border: '1px solid var(--ds-border-subtle)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 6px 20px -6px rgba(0,0,0,0.45)',
            zIndex: 12,
          }}
        >
          <div className="relative">
            <button
              onMouseEnter={() => setShowReactionBar(true)}
              onClick={() => setShowReactionBar((p) => !p)}
              className="rounded-xl transition-colors hover:bg-[var(--ds-surface-1)] flex items-center justify-center"
              style={{ width: 30, height: 30, color: 'var(--ds-text-secondary)' }}
              aria-label="تفاعل"
            >
              <Smile size={15} />
            </button>
            <ReactionInlineBar
              visible={showReactionBar}
              isOwn={isOwn}
              onReact={(emoji) => react.mutate({ messageId: message.id, emoji })}
              onDismiss={() => setShowReactionBar(false)}
            />
          </div>

          <ToolBtn label="رد" onClick={() => onReply?.(message)}><Reply size={14} /></ToolBtn>

          {isTrainerOrAdmin && (
            <ToolBtn
              label={message.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              onClick={() => togglePin.mutate({ messageId: message.id })}
              color={message.is_pinned ? 'var(--ds-accent-gold)' : undefined}
            >
              <Pin size={14} />
            </ToolBtn>
          )}
          {isOwn && (
            <ToolBtn label="تعديل" onClick={() => onEdit?.(message)}><Edit2 size={14} /></ToolBtn>
          )}
          {(isOwn || isTrainerOrAdmin) && (
            <ToolBtn
              label="حذف"
              onClick={() => { if (window.confirm('هل تريد حذف هذه الرسالة؟')) deleteMsg.mutate({ messageId: message.id }) }}
            >
              <Trash2 size={14} />
            </ToolBtn>
          )}
        </div>
      </div>
      <div style={{ clear: 'both' }} />
    </div>
  )
}

function ToolBtn({ children, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-xl hover:bg-[var(--ds-surface-1)] transition-colors flex items-center justify-center"
      style={{ width: 30, height: 30, color: color || 'var(--ds-text-secondary)' }}
    >
      {children}
    </button>
  )
}
