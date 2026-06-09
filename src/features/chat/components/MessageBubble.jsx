import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, useTransform } from 'framer-motion'
import { Reply, Pin, Edit2, Trash2, Smile, CornerUpLeft, Check, CheckCheck, Clock, AlertCircle, MoreHorizontal, Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthProfile } from '../../../stores/authStore'
import MessageBubbleText from './MessageBubbleText'
import MessageBubbleVoice from './MessageBubbleVoice'
import MessageBubbleImage from './MessageBubbleImage'
import MessageBubbleFile from './MessageBubbleFile'
import MessageBubbleVideo from './MessageBubbleVideo'
import MessageBubbleAlbum from './MessageBubbleAlbum'
import MessageBubbleLink from './MessageBubbleLink'
import MessageBubbleAnnouncement from './MessageBubbleAnnouncement'
import MessageBubbleSystem from './MessageBubbleSystem'
import ReactionInlineBar from './premium/ReactionInlineBar'
import ReactionSummary from './premium/ReactionSummary'
import ReactionBurst from './premium/ReactionBurst'
import MessageActionSheet from './premium/MessageActionSheet'
import { senderColor } from '../lib/senderColors'
import { useChatGestures } from '../lib/useChatGestures'
import { supabase } from '../../../lib/supabase'
import { useReact } from '../mutations/useReact'
import { useDeleteMessage } from '../mutations/useDeleteMessage'
import { useTogglePin } from '../mutations/useTogglePin'
import { resendMessage } from '../mutations/useSendMessage'

// Touch devices get a visible "⋯" action button (long-press alone is undiscoverable).
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches

// Tail-radius presets (CSS order: TL TR BR BL). Rounded 18px, tail/spine 5px.
function getBubbleRadius(position, isOwn) {
  if (isOwn) {
    const r = { single: '18px 18px 18px 5px', first: '18px 18px 18px 5px', middle: '5px 18px 18px 5px', last: '5px 18px 18px 5px' }
    return r[position] ?? r.single
  }
  const r = { single: '18px 18px 5px 18px', first: '18px 18px 5px 18px', middle: '18px 5px 5px 18px', last: '18px 5px 5px 18px' }
  return r[position] ?? r.single
}

const SHADOW_OWN = [
  '0 1px 2px -1px rgba(0,0,0,0.20)',
  '0 6px 16px -6px rgba(0,0,0,0.30)',
  '0 14px 34px -12px color-mix(in srgb, var(--ds-accent-primary) 32%, transparent)',
  'inset 0 1px 0 0 color-mix(in srgb, white 11%, transparent)',
].join(',')

const SHADOW_OTHER = [
  '0 1px 2px -1px rgba(0,0,0,0.16)',
  '0 6px 16px -6px rgba(0,0,0,0.24)',
  '0 14px 34px -14px rgba(0,0,0,0.28)',
  'inset 0 1px 0 0 color-mix(in srgb, white 7%, transparent)',
].join(',')

// المجلس — "the teacher's ear": tap ✦ on your own English message and د. علي gently
// recasts it (only when there's a real improvement). Computed on tap, private to you.
const hasEnglish = (t) => ((String(t || '').match(/[A-Za-z]/g) || []).length >= 3)

function TeacherEar({ text }) {
  const [state, setState] = useState('idle') // idle | loading | good | done
  const [data, setData] = useState(null)
  async function run(e) {
    e.stopPropagation()
    if (state === 'loading') return
    setState('loading')
    try {
      const { data: res } = await supabase.functions.invoke('majlis-recast', { body: { text } })
      if (res?.has_suggestion && res.better) { setData(res); setState('done') }
      else setState('good')
    } catch { setState('good') }
  }
  if (state === 'idle') {
    return (
      <button type="button" onClick={run} onPointerDown={(e) => e.stopPropagation()}
        className="mt-1.5 inline-flex items-center gap-1.5 transition-opacity hover:opacity-100"
        style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 11, color: 'var(--ds-accent-gold)', opacity: 0.72 }}>
        <Sparkles size={12} /> راجع صياغتي
      </button>
    )
  }
  if (state === 'loading') {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ds-text-muted)', fontFamily: 'Tajawal, sans-serif' }}>
        <Sparkles size={12} className="animate-pulse" /> د. علي يستمع…
      </div>
    )
  }
  if (state === 'good') {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ds-accent-gold)', fontFamily: 'Tajawal, sans-serif' }}>
        <Check size={12} /> صياغتك ممتازة
      </div>
    )
  }
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="mt-2 rounded-xl px-3 py-2.5"
      style={{ maxWidth: 320, background: 'color-mix(in srgb, var(--ds-accent-gold) 7%, var(--ds-bg-elevated))', border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)', borderInlineStart: '2.5px solid var(--ds-accent-gold)' }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 10.5, color: 'var(--ds-accent-gold)', fontWeight: 600, letterSpacing: '0.02em' }}>
        <Sparkles size={12} /> همسة من المجلس · د. علي
      </div>
      <div dir="ltr" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ds-text-primary)', lineHeight: 1.5, textAlign: 'left', marginBottom: 7 }}>“{data.better}”</div>
      <div style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 12.5, color: 'var(--ds-text-secondary)', lineHeight: 1.7 }}>{data.note_ar}</div>
    </motion.div>
  )
}

export default function MessageBubble({ message, isGrouped, position = 'single', channelId, groupId, onReply, onEdit, readUpTo }) {
  const profile = useAuthProfile()
  const qc = useQueryClient()
  const [showReactionBar, setShowReactionBar] = useState(false)
  const [sheet, setSheet] = useState({ open: false, anchor: null })
  const [burst, setBurst] = useState(null)
  const bubbleRef = useRef(null)

  const react = useReact()
  const deleteMsg = useDeleteMessage()
  const togglePin = useTogglePin()

  const isOwn = message.sender_id === profile?.id
  const isTrainerOrAdmin = ['trainer', 'admin'].includes(profile?.role)

  function reactWith(emoji) {
    react.mutate({ messageId: message.id, emoji, message })
    const el = bubbleRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setBurst({ id: Date.now(), x: r.left + r.width / 2, y: r.top + 10, emoji })
    }
  }

  // Gestures (hook must run before any early return)
  const { bind, swipeX } = useChatGestures({
    onDoubleTap: (message.type === 'image' || message.type === 'album') ? undefined : () => reactWith('❤️'),
    onLongPress: (e) => setSheet({ open: true, anchor: { x: e.clientX, y: e.clientY } }),
    onSwipeReply: () => onReply?.(message),
  })
  const replyOpacity = useTransform(swipeX, [8, 56], [0, 1])
  const replyScale = useTransform(swipeX, [8, 56], [0.5, 1])

  // System messages: centered ghost text
  if (message.type === 'system') return <MessageBubbleSystem body={message.body || message.content} />

  if (message.deleted_at) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs italic px-3 py-1 rounded-full"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-muted)', background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
          تم حذف الرسالة
        </span>
      </div>
    )
  }

  const sender = message.sender
  const displayName = sender ? (sender.display_name || sender.full_name || sender.first_name_ar || '').trim() : 'مستخدم'
  const bodyText = message.body || message.content
  const borderRadius = getBubbleRadius(position, isOwn)
  const time = new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  const sc = isOwn ? null : senderColor(message.sender_id)
  const replyColor = message.reply_message?.sender?.id
    ? senderColor(message.reply_message.sender.id).base
    : (sc ? sc.base : 'var(--ds-accent-primary)')

  // المجلس — editorial bubbles: clean warm-glass surfaces, a single hairline, no
  // sender-coloured borders or glows. Identity comes from the brass name + avatar.
  const bubbleStyle = isOwn
    ? {
        background: `linear-gradient(135deg,
          color-mix(in srgb, var(--ds-accent-primary) 17%, var(--ds-bg-elevated)) 0%,
          color-mix(in srgb, var(--ds-accent-primary) 9%, var(--ds-bg-elevated)) 100%)`,
        border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 26%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: SHADOW_OWN,
      }
    : {
        background: 'color-mix(in srgb, var(--ds-bg-elevated) 78%, transparent)',
        backdropFilter: 'blur(22px) saturate(140%)', WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        border: '1px solid color-mix(in srgb, var(--ds-text-primary) 8%, transparent)',
        boxShadow: SHADOW_OTHER,
      }

  const innerSide = isOwn ? { left: 4 } : { right: 4 }
  const stop = (e) => e.stopPropagation()

  return (
    <div id={`msg-${message.id}`} data-message-id={message.id} data-sender-id={message.sender_id}
      className={`relative group ${isGrouped ? 'mt-1' : 'mt-3.5'}`} style={{ direction: 'rtl' }}>

      {/* Swipe-to-reply arrow (reveals as the bubble is pulled toward start) */}
      <motion.div className="absolute flex items-center justify-center rounded-full pointer-events-none"
        style={{
          insetInlineStart: 12, top: '50%', y: '-50%', zIndex: 4, width: 34, height: 34,
          opacity: replyOpacity, scale: replyScale,
          color: sc ? sc.base : 'var(--ds-accent-primary)',
          background: `color-mix(in srgb, ${sc ? sc.base : 'var(--ds-accent-primary)'} 16%, transparent)`,
        }}>
        <CornerUpLeft size={18} />
      </motion.div>

      <motion.div className="inline-block relative align-top" {...bind}
        style={{ float: isOwn ? 'left' : 'right', maxWidth: '78%', x: swipeX, touchAction: 'pan-y' }}>
        <div ref={bubbleRef} className="chat-bubble px-3.5 py-2.5" style={{ ...bubbleStyle, borderRadius, lineHeight: 1.75 }}>
          {!isGrouped && !isOwn && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[13px] font-bold truncate"
                style={{ fontFamily: 'Tajawal, sans-serif', color: sc.soft, letterSpacing: '0.01em', maxWidth: 200 }}>
                {displayName}
              </span>
              <span className="text-[11px] tabular-nums shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
              {message.is_edited && <span className="text-[11px] shrink-0" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal' }}>· معدّل</span>}
            </div>
          )}

          {message.reply_message && (
            <button type="button" onPointerDown={stop}
              onClick={(e) => { e.stopPropagation(); const tid = message.reply_message.id || message.reply_to; if (tid) window.dispatchEvent(new CustomEvent('fluentia:jump-to-message', { detail: { id: tid } })) }}
              className="mb-2 px-2.5 py-1.5 rounded-xl text-xs w-full flex items-start gap-1.5 transition-[filter] hover:brightness-110"
              style={{ borderInlineStart: `2.5px solid ${replyColor}`, background: `color-mix(in srgb, ${replyColor} 10%, transparent)`, fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-secondary)', textAlign: 'start' }}>
              <CornerUpLeft size={12} style={{ color: replyColor, marginTop: 2, flexShrink: 0 }} />
              <span>
                <span className="font-semibold" style={{ color: replyColor }}>
                  {message.reply_message.sender?.display_name || message.reply_message.sender?.full_name}:{' '}
                </span>
                {message.reply_message.body || message.reply_message.content || '🎙️'}
              </span>
            </button>
          )}

          {message.type === 'text' && <MessageBubbleText body={bodyText} mentions={message.mentions} myId={profile?.id} />}
          {message.type === 'text' && message.link_url && <MessageBubbleLink message={message} />}
          {message.type === 'voice' && <MessageBubbleVoice message={message} />}
          {message.type === 'image' && <MessageBubbleImage message={message} />}
          {message.type === 'file' && <MessageBubbleFile message={message} />}
          {message.type === 'video' && <MessageBubbleVideo message={message} />}
          {message.type === 'album' && <MessageBubbleAlbum message={message} />}
          {message.type === 'link' && <MessageBubbleLink message={message} />}
          {message.type === 'announcement' && <MessageBubbleAnnouncement message={message} body={bodyText} />}

          {isOwn && (
            <div className="flex items-center gap-1 justify-start mt-0.5">
              <span className="text-[10.5px] tabular-nums" style={{ color: 'color-mix(in srgb, var(--ds-accent-primary) 60%, var(--ds-text-tertiary))', fontVariantNumeric: 'tabular-nums' }}>
                {time}{message.is_edited && ' · معدّل'}
              </span>
              {message._status === 'failed' ? (
                <button onClick={(e) => { e.stopPropagation(); resendMessage(qc, message) }}
                  className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: 'var(--ds-accent-danger)', fontFamily: 'Tajawal, sans-serif' }}>
                  <AlertCircle size={12} /> فشل الإرسال · إعادة المحاولة
                </button>
              ) : message._status === 'sending' ? (
                <Clock size={12} style={{ color: 'var(--ds-text-tertiary)' }} aria-label="جارٍ الإرسال" />
              ) : (readUpTo !== undefined && !String(message.id).startsWith('optimistic') && (
                (readUpTo && new Date(message.created_at) <= new Date(readUpTo))
                  ? <CheckCheck size={13} style={{ color: 'var(--ds-accent-primary)' }} aria-label="تمت القراءة" />
                  : <Check size={13} style={{ color: 'var(--ds-text-tertiary)' }} aria-label="تم الإرسال" />
              ))}
            </div>
          )}
        </div>

        {isOwn && message.type === 'text' && !message.deleted_at && hasEnglish(bodyText) && (
          <div onPointerDown={stop}><TeacherEar text={bodyText} /></div>
        )}

        <div onPointerDown={stop}>
          <ReactionSummary reactions={message.reactions} myId={profile?.id} messageId={message.id} onReact={(emoji) => reactWith(emoji)} />
        </div>

        {/* Mobile: discoverable tap-to-reveal actions (long-press also still works) */}
        {IS_TOUCH && (
          <button onPointerDown={stop} onClick={(e) => { e.stopPropagation(); setSheet({ open: true, anchor: { x: e.clientX, y: e.clientY } }) }}
            aria-label="إجراءات الرسالة"
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: -10, insetInlineEnd: 0, width: 26, height: 26, background: 'color-mix(in srgb, var(--ds-bg-elevated) 92%, transparent)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-tertiary)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.4)', zIndex: 11 }}>
            <MoreHorizontal size={14} />
          </button>
        )}

        {/* Desktop hover toolbar */}
        <div onPointerDown={stop}
          className="absolute flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-2xl px-1 py-0.5"
          style={{ top: -14, ...innerSide, background: 'color-mix(in srgb, var(--ds-bg-elevated) 92%, transparent)', border: '1px solid var(--ds-border-subtle)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 6px 20px -6px rgba(0,0,0,0.45)', zIndex: 12 }}>
          <div className="relative">
            <button onMouseEnter={() => setShowReactionBar(true)} onClick={() => setShowReactionBar((p) => !p)}
              className="rounded-xl transition-colors hover:bg-[var(--ds-surface-1)] flex items-center justify-center"
              style={{ width: 30, height: 30, color: 'var(--ds-text-secondary)' }} aria-label="تفاعل"><Smile size={15} /></button>
            <ReactionInlineBar visible={showReactionBar} isOwn={isOwn} onReact={(emoji) => reactWith(emoji)} onDismiss={() => setShowReactionBar(false)} />
          </div>
          <ToolBtn label="رد" onClick={() => onReply?.(message)}><Reply size={14} /></ToolBtn>
          {isTrainerOrAdmin && (
            <ToolBtn label={message.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'} onClick={() => togglePin.mutate({ messageId: message.id, message })} color={message.is_pinned ? 'var(--ds-accent-gold)' : undefined}><Pin size={14} /></ToolBtn>
          )}
          {isOwn && <ToolBtn label="تعديل" onClick={() => onEdit?.(message)}><Edit2 size={14} /></ToolBtn>}
          {(isOwn || isTrainerOrAdmin) && (
            <ToolBtn label="حذف" onClick={() => { if (window.confirm('هل تريد حذف هذه الرسالة؟')) deleteMsg.mutate({ messageId: message.id, message }) }}><Trash2 size={14} /></ToolBtn>
          )}
        </div>
      </motion.div>
      <div style={{ clear: 'both' }} />

      {/* Reaction burst (portaled above everything) */}
      {burst && createPortal(
        <ReactionBurst key={burst.id} x={burst.x} y={burst.y} emoji={burst.emoji} onDone={() => setBurst(null)} />,
        document.body
      )}

      {/* Long-press / right-click action sheet */}
      <MessageActionSheet
        open={sheet.open} anchor={sheet.anchor} message={message} isOwn={isOwn} isTrainer={isTrainerOrAdmin}
        onClose={() => setSheet({ open: false, anchor: null })}
        onReact={reactWith}
        onReply={onReply}
        onEdit={onEdit}
        onPin={() => togglePin.mutate({ messageId: message.id, message })}
        onDelete={() => { if (window.confirm('هل تريد حذف هذه الرسالة؟')) deleteMsg.mutate({ messageId: message.id, message }) }}
      />
    </div>
  )
}

function ToolBtn({ children, label, onClick, color }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      className="rounded-xl hover:bg-[var(--ds-surface-1)] transition-colors flex items-center justify-center"
      style={{ width: 30, height: 30, color: color || 'var(--ds-text-secondary)' }}>
      {children}
    </button>
  )
}
