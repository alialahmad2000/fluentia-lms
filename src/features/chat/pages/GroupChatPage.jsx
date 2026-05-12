// GOD COMM — Premium Redesign (Phase 1.7)
// Single unified stream per group. No channel sidebar. Filter lenses in header.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { useGroupChannels } from '../queries/useGroupChannels'
import { usePresence } from '../realtime/usePresence'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import StreamHeader from '../components/premium/StreamHeader'
import ChatSearchPanel from '../components/ChatSearchPanel'

import UnifiedMessageStream from '../components/premium/UnifiedMessageStream'
import FilterLensBar from '../components/premium/FilterLensBar'
import PinnedStrip from '../components/premium/PinnedStrip'
import PremiumComposer from '../components/premium/PremiumComposer'

export default function GroupChatPage() {
  // All hooks at top — before any conditional logic
  const { groupId, channelSlug, messageId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [activeLens, setActiveLens] = useState('all')
  const lastScrollY = useRef(0)

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

  // Presence scoped to group (uses group:<id> key — no channel dependency)
  // usePresence adapted: pass a group-level channel key
  const generalChannel = channels.find((c) => c.slug === 'general')
  const { onlineUserIds } = usePresence(generalChannel?.id)

  const isTrainer = ['trainer', 'admin'].includes(profile?.role)

  // Boost aurora visibility specifically on chat page
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

  return (
    <div
      className="flex flex-col bg-[var(--ds-bg-base)]"
      style={{ height: '100dvh', maxHeight: '100dvh', direction: 'rtl', overflow: 'hidden' }}
    >
      {/* Search overlay */}
      {searchOpen && (
        <ChatSearchPanel groupId={groupId} onClose={() => setSearchOpen(false)} />
      )}

      {/* Sticky header */}
      <StreamHeader
        groupName={group?.name}
        groupLevel={group?.level}
        groupId={groupId}
        onlineUserIds={onlineUserIds}
        onSearchOpen={() => setSearchOpen(true)}
        isTrainer={isTrainer}
        collapsed={headerCollapsed}
      />

      {/* Pinned strip */}
      <PinnedStrip groupId={groupId} onScrollToMessage={(id) => {
        const el = document.getElementById(`msg-${id}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (el) { el.classList.add('chat-highlight'); setTimeout(() => el.classList.remove('chat-highlight'), 2400) }
      }} />

      {/* Filter lenses */}
      <FilterLensBar
        groupId={groupId}
        activeLens={activeLens}
        onLensChange={setActiveLens}
      />

      {/* Unified message stream (R2) */}
      <div className="flex-1 min-h-0 relative">
        <UnifiedMessageStream
          groupId={groupId}
          lens={activeLens}
          deepLinkMessageId={messageId}
          onScroll={handleStreamScroll}
          generalChannelId={generalChannel?.id}
        />
      </div>

      {/* Premium composer */}
      <PremiumComposer
        groupId={groupId}
        generalChannelId={generalChannel?.id}
        isTrainer={isTrainer}
      />
    </div>
  )
}
