import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { useAuthProfile } from '../../../../stores/authStore'
import { useUnifiedMessages } from '../../queries/useUnifiedMessages'
import { useDMMessages, useDMMarkRead } from '../../queries/useDM'
import { useMarkRead } from '../../mutations/useMarkRead'
import DaySeparator from './DaySeparator'
import MessageGroupPremium from './MessageGroupPremium'
import PremiumEmptyState from './PremiumEmptyState'
import ScrollToBottomPill from './ScrollToBottomPill'
import SystemMessageCluster from './SystemMessageCluster'
import UnreadDivider from './UnreadDivider'

const GROUP_WINDOW_MS = 4 * 60 * 1000

function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameGroup(a, b) {
  if (!a || !b) return false
  if (a.sender_id !== b.sender_id) return false
  return Math.abs(new Date(a.created_at) - new Date(b.created_at)) < GROUP_WINDOW_MS
}

// Build flat item list: {type: 'separator'|'group'|'system-cluster'|'unread'}
function buildItems(messages, { unreadAfter, myId } = {}) {
  const items = []
  let systemBuf = []
  let currentGroup = null
  let lastRealDay = null
  let unreadPlaced = false
  const unreadTs = unreadAfter ? new Date(unreadAfter).getTime() : null

  function flushSystem() {
    if (!systemBuf.length) return
    items.push({ type: 'system-cluster', messages: systemBuf.splice(0), tight: true })
  }
  function flushGroup() {
    if (!currentGroup?.length) return
    items.push({ type: 'group', messages: currentGroup.splice(0) })
    currentGroup = null
  }

  for (const msg of messages) {
    if (msg.type === 'system') {
      flushGroup()
      systemBuf.push(msg)
      continue
    }
    const day = dayKey(msg.created_at)
    const dayChanged = lastRealDay !== null && lastRealDay !== day

    flushGroup()
    flushSystem()

    if (lastRealDay === null || dayChanged) {
      items.push({ type: 'separator', date: msg.created_at })
      lastRealDay = day
    }

    // "New messages" divider — before the first unread message not sent by me
    if (
      !unreadPlaced && unreadTs &&
      new Date(msg.created_at).getTime() > unreadTs &&
      msg.sender_id !== myId
    ) {
      items.push({ type: 'unread' })
      unreadPlaced = true
    }

    if (currentGroup && isSameGroup(currentGroup[currentGroup.length - 1], msg)) {
      currentGroup.push(msg)
    } else {
      flushGroup()
      currentGroup = [msg]
    }
  }

  flushGroup()
  flushSystem()
  return items
}

function LoadingSkeleton() {
  const rows = [
    { own: false, w: 220 }, { own: true, w: 140 }, { own: false, w: 280 },
    { own: false, w: 180 }, { own: true, w: 200 },
  ]
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" style={{ direction: 'rtl' }}>
      {rows.map((r, i) => (
        <div key={i} className="flex" style={{ justifyContent: r.own ? 'flex-start' : 'flex-end' }}>
          <div
            className="skeleton"
            style={{ width: r.w, maxWidth: '70%', height: 40, borderRadius: 18, opacity: 0.5 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function UnifiedMessageStream({
  groupId,
  lens = 'all',
  deepLinkMessageId,
  generalChannelId,
  dmThreadId,            // when set → DM mode (data from group_messages via dm_thread_id)
  readUpTo,             // DM: other member's last_read_at → drives ✓✓ receipts
  onScroll,
  onReply,
  onEdit,
}) {
  const isDM = !!dmThreadId
  const profile = useAuthProfile()
  const virtuosoRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const prevLenRef = useRef(0)
  const mountedAtRef = useRef(Date.now()) // only messages arriving AFTER this animate (no scroll strobe)

  // Both hooks run unconditionally (hooks rule); each is disabled when not its mode.
  const groupQuery = useUnifiedMessages(isDM ? undefined : groupId, lens)
  const dmQuery = useDMMessages(isDM ? dmThreadId : undefined)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = isDM ? dmQuery : groupQuery

  const { markMessageRead } = useMarkRead(isDM ? undefined : generalChannelId)
  const markDMRead = useDMMarkRead(isDM ? dmThreadId : undefined)

  // Capture the read cursor ONCE per visit → stable "new messages" divider.
  const { data: unreadAfter } = useQuery({
    queryKey: ['chat-read-cursor', generalChannelId, profile?.id],
    enabled: !!generalChannelId && !!profile?.id,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: row } = await supabase
        .from('channel_read_cursors')
        .select('last_read_at')
        .eq('channel_id', generalChannelId)
        .eq('user_id', profile.id)
        .maybeSingle()
      return row?.last_read_at ?? null
    },
  })

  const messages = useMemo(
    () => (data?.pages ?? []).flatMap((p) => [...p]).reverse(),
    [data]
  )
  const items = useMemo(
    () => (!isDM && lens === 'all' ? buildItems(messages, { unreadAfter, myId: profile?.id }) : buildItems(messages)),
    [messages, unreadAfter, profile?.id, lens, isDM]
  )

  // Track new-message count while scrolled up
  useEffect(() => {
    if (!atBottom && messages.length > prevLenRef.current) {
      setNewCount((c) => c + (messages.length - prevLenRef.current))
    }
    prevLenRef.current = messages.length
  }, [messages.length, atBottom])

  // Mark newest read when viewing the bottom of the stream
  useEffect(() => {
    if (!atBottom || !messages.length) return
    if (isDM) { markDMRead(); return }
    const newest = messages[messages.length - 1]
    if (newest && newest.sender_id !== profile?.id && !String(newest.id).startsWith('optimistic')) {
      markMessageRead(newest.id)
    }
  }, [atBottom, messages.length, profile?.id, markMessageRead, isDM, markDMRead])

  // Deep-link scroll
  useEffect(() => {
    if (!deepLinkMessageId || !virtuosoRef.current || !messages.length) return
    let itemIdx = -1
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'group' && items[i].messages.some((m) => m.id === deepLinkMessageId)) {
        itemIdx = i; break
      }
    }
    if (itemIdx === -1) return
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: itemIdx, behavior: 'smooth', align: 'center' })
      const el = document.getElementById(`msg-${deepLinkMessageId}`)
      if (el) { el.classList.add('chat-highlight'); setTimeout(() => el.classList.remove('chat-highlight'), 2400) }
    }, 320)
  }, [deepLinkMessageId, messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Jump-to-message (tappable reply quotes fire fluentia:jump-to-message)
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id
      if (!id || !virtuosoRef.current) return
      let itemIdx = -1
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'group' && items[i].messages.some((m) => m.id === id)) { itemIdx = i; break }
      }
      const flash = () => {
        const el = document.getElementById(`msg-${id}`)
        if (el) { el.classList.add('chat-highlight'); setTimeout(() => el.classList.remove('chat-highlight'), 2400) }
      }
      if (itemIdx !== -1) { virtuosoRef.current.scrollToIndex({ index: itemIdx, behavior: 'smooth', align: 'center' }); setTimeout(flash, 300) }
      else flash()
    }
    window.addEventListener('fluentia:jump-to-message', handler)
    return () => window.removeEventListener('fluentia:jump-to-message', handler)
  }, [items])

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: items.length - 1, behavior: 'smooth' })
    setNewCount(0)
    setAtBottom(true)
  }, [items.length])

  if (isLoading) return <LoadingSkeleton />
  if (!messages.length) return <PremiumEmptyState />

  return (
    <div className="relative h-full">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        totalCount={items.length}
        initialTopMostItemIndex={items.length - 1}
        followOutput="smooth"
        atBottomThreshold={120}
        atBottomStateChange={(bottom) => { setAtBottom(bottom); if (bottom) setNewCount(0) }}
        startReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
        onScroll={(e) => onScroll?.(e.target.scrollTop)}
        components={{
          Header: () => (
            <div style={{ height: isFetchingNextPage ? 36 : 12 }} className="flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'color-mix(in srgb, var(--ds-accent-primary) 35%, transparent)', borderTopColor: 'transparent' }} />
              )}
            </div>
          ),
          Footer: () => <div style={{ height: 10 }} />,
        }}
        itemContent={(index) => {
          const item = items[index]
          if (!item) return null
          if (item.type === 'separator') return <DaySeparator key={item.date} date={item.date} />
          if (item.type === 'unread') return <UnreadDivider key="unread" />
          if (item.type === 'system-cluster') return <SystemMessageCluster key={item.messages[0].id} messages={item.messages} />
          return (
            <MessageGroupPremium
              key={item.messages[0].id}
              messages={item.messages}
              channelId={generalChannelId}
              groupId={groupId}
              onReply={onReply}
              onEdit={onEdit}
              readUpTo={readUpTo}
              animateIn={new Date(item.messages[item.messages.length - 1].created_at).getTime() > mountedAtRef.current}
            />
          )
        }}
      />

      <ScrollToBottomPill count={newCount} onClick={scrollToBottom} />
    </div>
  )
}
