// 1:1 direct-message chat — reuses the premium aurora shell + stream + composer.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Images, Bell, BellOff } from 'lucide-react'
import { useDMThreadMeta, useDMOtherRead } from '../queries/useDM'
import { usePresence } from '../realtime/usePresence'
import SenderAvatar from '../components/premium/SenderAvatar'
import UnifiedMessageStream from '../components/premium/UnifiedMessageStream'
import ErrorBoundary from '../../../components/ErrorBoundary'
import PremiumComposer from '../components/premium/PremiumComposer'
import SharedMediaGallery from '../components/premium/SharedMediaGallery'
import { senderColor } from '../lib/senderColors'
import { useChatMutes, useToggleChatMute, muteActive } from '../queries/useChatMute'
import '../premium.css'

export default function DMChatPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [mediaOpen, setMediaOpen] = useState(false)
  const auroraRef = useRef(null)

  const { data: meta } = useDMThreadMeta(threadId)
  const other = meta?.profile
  const otherId = meta?.otherId
  const readUpTo = useDMOtherRead(threadId)
  const { onlineUserIds } = usePresence(`dm:${threadId}`)
  const isOnline = otherId && onlineUserIds.includes(otherId)
  const sc = otherId ? senderColor(otherId) : null
  const name = other?.full_name || other?.display_name || 'محادثة'
  const { data: mutes } = useChatMutes()
  const toggleMute = useToggleChatMute()
  const muted = muteActive(mutes, 'dm', threadId)

  useEffect(() => {
    document.body.classList.add('chat-page')
    return () => document.body.classList.remove('chat-page')
  }, [])

  useEffect(() => {
    const el = auroraRef.current
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let t
    const onSend = () => { el.setAttribute('data-pulsing', 'true'); clearTimeout(t); t = setTimeout(() => el.removeAttribute('data-pulsing'), 1100) }
    window.addEventListener('fluentia:chat-send', onSend)
    return () => { window.removeEventListener('fluentia:chat-send', onSend); clearTimeout(t) }
  }, [])

  const startReply = useCallback((m) => { setEditing(null); setReplyTo(m) }, [])
  const startEdit = useCallback((m) => { setReplyTo(null); setEditing(m) }, [])

  return (
    <div className="chat-shell">
      <div className="chat-aurora" aria-hidden="true" ref={auroraRef}>
        <i className="ca-blob ca-sky" /><i className="ca-blob ca-violet" /><i className="ca-blob ca-emerald" />
        <i className="ca-blob ca-rose" /><i className="ca-blob ca-amber" />
      </div>
      <div className="chat-aurora-scrim" aria-hidden="true" />

      {/* Shared-media gallery overlay */}
      {mediaOpen && (
        <SharedMediaGallery threadId={threadId} onClose={() => setMediaOpen(false)} />
      )}

      {/* DM header */}
      <div className="chat-row">
        <div
          className="flex items-center gap-2.5 px-3"
          style={{
            height: 60, direction: 'rtl',
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 62%, transparent)',
            backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)',
            borderBottom: '1px solid var(--ds-border-subtle)',
            boxShadow: '0 10px 30px -16px rgba(0,0,0,0.5)',
          }}
        >
          <button onClick={() => navigate('/chat')} aria-label="رجوع"
            className="rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--ds-surface-1)]"
            style={{ width: 38, height: 38, color: 'var(--ds-text-secondary)' }}>
            <ChevronRight size={22} />
          </button>
          {otherId && <SenderAvatar sender={other} senderId={otherId} size={38} />}
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16, color: sc ? sc.soft : 'var(--ds-text-primary)' }}>
              {name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <>
                  <span className="chat-online-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ds-accent-success)' }} />
                  <span className="text-[12px]" style={{ fontFamily: 'Tajawal', color: 'var(--ds-accent-success)' }}>متصل الآن</span>
                </>
              ) : (
                <span className="text-[12px]" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)' }}>
                  {other?.role === 'trainer' ? 'مدرب' : other?.role === 'admin' ? 'الإدارة' : 'محادثة خاصة'}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => threadId && toggleMute.mutate({ scope: 'dm', target: threadId, muted: !muted })}
            disabled={toggleMute.isPending}
            aria-label={muted ? 'تشغيل إشعارات المحادثة' : 'كتم إشعارات المحادثة'}
            title={muted ? 'الإشعارات مكتومة — اضغط للتشغيل' : 'كتم إشعارات هذه المحادثة'}
            className="rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--ds-surface-1)]"
            style={{ width: 38, height: 38, color: muted ? 'var(--ds-accent-gold, #e9b949)' : 'var(--ds-text-secondary)', opacity: toggleMute.isPending ? 0.5 : 1 }}
          >
            {muted ? <BellOff size={18} /> : <Bell size={18} />}
          </button>
          <button
            onClick={() => setMediaOpen(true)}
            aria-label="الوسائط المشتركة"
            className="rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--ds-surface-1)]"
            style={{ width: 38, height: 38, color: 'var(--ds-text-secondary)' }}
          >
            <Images size={18} />
          </button>
        </div>
      </div>

      {/* DM stream */}
      <div className="chat-stream">
        <ErrorBoundary fallback={(
          <div dir="rtl" className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p style={{ color: 'var(--ds-text-secondary)', fontFamily: 'Tajawal, sans-serif' }}>تعذّر عرض المحادثة مؤقتًا</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>إعادة التحميل</button>
          </div>
        )}>
          <UnifiedMessageStream
            dmThreadId={threadId}
            readUpTo={readUpTo}
            onReply={startReply}
            onEdit={startEdit}
          />
        </ErrorBoundary>
      </div>

      {/* DM composer */}
      <div className="chat-row">
        <PremiumComposer
          dmThreadId={threadId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          editing={editing}
          onClearEdit={() => setEditing(null)}
        />
      </div>
    </div>
  )
}
