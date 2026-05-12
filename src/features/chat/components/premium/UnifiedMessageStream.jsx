import { useRef, useState, useEffect, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../../stores/authStore'
import { useUnifiedMessages } from '../../queries/useUnifiedMessages'
import { useMarkRead } from '../../mutations/useMarkRead'
import DaySeparator from './DaySeparator'
import MessageGroupPremium from './MessageGroupPremium'
import PremiumEmptyState from './PremiumEmptyState'
import ScrollToBottomPill from './ScrollToBottomPill'

const GROUP_WINDOW_MS = 4 * 60 * 1000

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate()
}

function isSameGroup(a, b) {
  if (!a || !b) return false
  if (a.sender_id !== b.sender_id) return false
  return Math.abs(new Date(a.created_at) - new Date(b.created_at)) < GROUP_WINDOW_MS
}

// Build flat item list: {type: 'separator'|'group', ...}
function buildItems(messages) {
  const items = []
  let currentGroup = null

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]

    // Day separator
    if (!prev || !isSameDay(prev.created_at, msg.created_at)) {
      if (currentGroup) { items.push({ type: 'group', messages: currentGroup }); currentGroup = null }
      items.push({ type: 'separator', date: msg.created_at })
    }

    // Group messages from same sender within 4min
    if (currentGroup && isSameGroup(currentGroup[currentGroup.length - 1], msg)) {
      currentGroup.push(msg)
    } else {
      if (currentGroup) items.push({ type: 'group', messages: currentGroup })
      currentGroup = [msg]
    }
  }
  if (currentGroup) items.push({ type: 'group', messages: currentGroup })

  return items
}

export default function UnifiedMessageStream({
  groupId,
  lens = 'all',
  deepLinkMessageId,
  generalChannelId,
  onScroll,
}) {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const virtuosoRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const prevLenRef = useRef(0)
  const observerRef = useRef(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUnifiedMessages(groupId, lens)

  // Effective channelId for mark-read: use generalChannelId (or null — hook handles gracefully)
  const { markMessageRead } = useMarkRead(generalChannelId)

  const messages = (data?.pages ?? []).flatMap((p) => [...p]).reverse()
  const items = buildItems(messages)

  // Track new-message count when scrolled up
  useEffect(() => {
    if (!atBottom && messages.length > prevLenRef.current) {
      setNewCount((c) => c + (messages.length - prevLenRef.current))
    }
    prevLenRef.current = messages.length
  }, [messages.length, atBottom])

  // Deep-link scroll
  useEffect(() => {
    if (!deepLinkMessageId || !virtuosoRef.current || !messages.length) return
    const idx = messages.findIndex((m) => m.id === deepLinkMessageId)
    if (idx === -1) return
    // Find which item index contains this message
    let itemIdx = 0
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'group' && items[i].messages.some((m) => m.id === deepLinkMessageId)) {
        itemIdx = i; break
      }
    }
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: itemIdx, behavior: 'smooth', align: 'center' })
      const el = document.getElementById(`msg-${deepLinkMessageId}`)
      if (el) {
        el.classList.add('chat-highlight')
        setTimeout(() => el.classList.remove('chat-highlight'), 2400)
      }
    }, 300)
  }, [deepLinkMessageId, messages.length])

  // IntersectionObserver for read state
  useEffect(() => {
    if (!profile?.id) return
    observerRef.current = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const msgId = e.target.dataset.messageId
        const senderId = e.target.dataset.senderId
        if (msgId && senderId !== profile.id) markMessageRead(msgId)
      }
    }, { threshold: 0.5 })
    return () => { observerRef.current?.disconnect(); observerRef.current = null }
  }, [profile?.id, markMessageRead])

  const scrollToBottom = useCallback(() => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: items.length - 1, behavior: 'smooth' })
    }
    setNewCount(0)
    setAtBottom(true)
  }, [items.length])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--ds-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!messages.length) {
    return <PremiumEmptyState />
  }

  return (
    <div className="relative flex-1 min-h-0 h-full">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        totalCount={items.length}
        initialTopMostItemIndex={items.length - 1}
        followOutput="smooth"
        atBottomThreshold={120}
        atBottomStateChange={(bottom) => {
          setAtBottom(bottom)
          if (bottom) setNewCount(0)
        }}
        startReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        onScroll={(e) => onScroll?.(e.target.scrollTop)}
        itemContent={(index) => {
          const item = items[index]
          if (!item) return null
          if (item.type === 'separator') {
            return <DaySeparator key={item.date} date={item.date} />
          }
          return (
            <div key={item.messages[0].id}>
              <MessageGroupPremium
                messages={item.messages}
                channelId={generalChannelId}
                groupId={groupId}
                onReply={() => {}}
                onEdit={() => {}}
              />
            </div>
          )
        }}
      />

      <ScrollToBottomPill count={newCount} onClick={scrollToBottom} />
    </div>
  )
}
