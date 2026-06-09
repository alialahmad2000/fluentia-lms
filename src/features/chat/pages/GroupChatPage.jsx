// المحادثة — Immersive Aurora chat (unified stream per group).
// Rendered as a fixed app-panel (.chat-shell) anchored to the layout CSS vars
// so it can never overlap the header / sidebar / mobile-nav on any device.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthProfile } from '../../../stores/authStore'
import { useGroupChannels } from '../queries/useGroupChannels'
import { usePresence } from '../realtime/usePresence'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import StreamHeader from '../components/premium/StreamHeader'
import PresenceCircle from '../components/premium/PresenceCircle'
import MajlisDigest from '../components/premium/MajlisDigest'
import MajlisCard from '../components/premium/MajlisCard'
import ChatSearchPanel from '../components/ChatSearchPanel'
import UnifiedMessageStream from '../components/premium/UnifiedMessageStream'
import ErrorBoundary from '../../../components/ErrorBoundary'
import FilterLensBar from '../components/premium/FilterLensBar'
import PinnedStrip from '../components/premium/PinnedStrip'
import PremiumComposer from '../components/premium/PremiumComposer'
import SharedMediaGallery from '../components/premium/SharedMediaGallery'
import '../premium.css'

export default function GroupChatPage() {
  // All hooks at top — before any conditional logic
  const { groupId, messageId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthProfile()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [activeLens, setActiveLens] = useState('all')
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const lastScrollY = useRef(0)
  const auroraRef = useRef(null)

  // Gently pulse the aurora on each message send (Telegram "the room breathed")
  useEffect(() => {
    const el = auroraRef.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let t
    const onSend = () => {
      el.setAttribute('data-pulsing', 'true')
      clearTimeout(t)
      t = setTimeout(() => el.removeAttribute('data-pulsing'), 1100)
    }
    window.addEventListener('fluentia:chat-send', onSend)
    return () => { window.removeEventListener('fluentia:chat-send', onSend); clearTimeout(t) }
  }, [])

  const startReply = useCallback((m) => { setEditing(null); setReplyTo(m) }, [])
  const startEdit = useCallback((m) => { setReplyTo(null); setEditing(m) }, [])

  // Channel list needed to resolve general channel id (used by composer)
  const { data: channels = [] } = useGroupChannels(groupId)

  const { data: group } = useQuery({
    queryKey: ['group-meta', groupId],
    enabled: !!groupId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, level').eq('id', groupId).maybeSingle()
      return data
    },
  })

  const generalChannel = channels.find((c) => c.slug === 'general')
  const { onlineUserIds } = usePresence(generalChannel?.id)

  const isTrainer = ['trainer', 'admin'].includes(profile?.role)

  // Aurora boost hook (optional global styling)
  useEffect(() => {
    document.body.classList.add('chat-page')
    return () => document.body.classList.remove('chat-page')
  }, [])

  // Collapse header on scroll-down, expand on scroll-up
  const handleStreamScroll = useCallback((scrollTop) => {
    const going = scrollTop - lastScrollY.current
    lastScrollY.current = scrollTop
    if (going > 8 && scrollTop > 80) setHeaderCollapsed(true)
    else if (going < -8) setHeaderCollapsed(false)
  }, [])

  const scrollToMessage = useCallback((id) => {
    const el = document.getElementById(`msg-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el) { el.classList.add('chat-highlight'); setTimeout(() => el.classList.remove('chat-highlight'), 2400) }
  }, [])

  return (
    <div className="chat-shell">
      {/* Immersive multi-hue aurora backdrop (pulses on send) */}
      <div className="chat-aurora" aria-hidden="true" ref={auroraRef}>
        <i className="ca-blob ca-sky" /><i className="ca-blob ca-violet" /><i className="ca-blob ca-emerald" />
        <i className="ca-blob ca-rose" /><i className="ca-blob ca-amber" />
      </div>
      <div className="chat-aurora-scrim" aria-hidden="true" />

      {/* Search overlay (fixed full-screen sheet) */}
      {searchOpen && (
        <ChatSearchPanel groupId={groupId} onClose={() => setSearchOpen(false)} />
      )}

      {/* Shared-media gallery overlay */}
      {mediaOpen && (
        <SharedMediaGallery groupId={groupId} onClose={() => setMediaOpen(false)} />
      )}

      {/* Header */}
      <div className="chat-row">
        <StreamHeader
          groupName={group?.name}
          groupLevel={group?.level}
          groupId={groupId}
          onlineUserIds={onlineUserIds}
          onSearchOpen={() => setSearchOpen(true)}
          onOpenMedia={() => setMediaOpen(true)}
          onBack={() => navigate('/chat')}
          isTrainer={isTrainer}
          collapsed={headerCollapsed}
        />
      </div>

      {/* المجلس — the presence circle (the gathering) */}
      <div className="chat-row">
        <PresenceCircle groupId={groupId} onlineUserIds={onlineUserIds} />
      </div>

      {/* المجلس AI add-ons (خلاصة + بطاقة) hidden 2026-06-09 per owner — keep a clean premium chat; components + RPCs intact for re-enable. */}

      {/* Pinned strip (renders nothing when empty) */}
      <div className="chat-row">
        <PinnedStrip groupId={groupId} onScrollToMessage={scrollToMessage} />
      </div>

      {/* Filter lenses — hidden for the Majlis calm (the prototype has no chips bar). */}

      {/* Unified message stream */}
      <div className="chat-stream">
        <ErrorBoundary fallback={(
          <div dir="rtl" className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p style={{ color: 'var(--ds-text-secondary)', fontFamily: 'Tajawal, sans-serif' }}>تعذّر عرض المحادثة مؤقتًا</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>إعادة التحميل</button>
          </div>
        )}>
          <UnifiedMessageStream
            groupId={groupId}
            lens={activeLens}
            deepLinkMessageId={messageId}
            onScroll={handleStreamScroll}
            generalChannelId={generalChannel?.id}
            onReply={startReply}
            onEdit={startEdit}
          />
        </ErrorBoundary>
      </div>

      {/* Composer */}
      <div className="chat-row">
        <PremiumComposer
          groupId={groupId}
          generalChannelId={generalChannel?.id}
          isTrainer={isTrainer}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          editing={editing}
          onClearEdit={() => setEditing(null)}
        />
      </div>
    </div>
  )
}
