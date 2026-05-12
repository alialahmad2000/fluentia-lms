import { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import MessageBubble from './MessageBubble'
import { useChannelMessages } from '../queries/useChannelMessages'
import { useChannelSubscription } from '../realtime/useChannelSubscription'
import { useMarkRead } from '../mutations/useMarkRead'

function isSameGroup(a, b) {
  if (!a || !b) return false
  if (a.sender_id !== b.sender_id) return false
  const diff = Math.abs(new Date(a.created_at) - new Date(b.created_at))
  return diff < 5 * 60 * 1000
}

export default function MessageList({ channelId, groupId, deepLinkMessageId, onReply, onEdit }) {
  const bottomRef = useRef(null)
  const listRef = useRef(null)
  const [newCount, setNewCount] = useState(0)
  const [atBottom, setAtBottom] = useState(true)
  const prevMessagesRef = useRef([])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useChannelMessages(channelId)
  const { markMessageRead } = useMarkRead(channelId)

  useChannelSubscription(channelId)

  const messages = (data?.pages ?? []).flatMap((p) => [...p]).reverse()

  // Detect new messages when NOT at bottom
  useEffect(() => {
    const prev = prevMessagesRef.current
    if (!atBottom && messages.length > prev.length) {
      setNewCount((c) => c + (messages.length - prev.length))
    }
    prevMessagesRef.current = messages
  }, [messages, atBottom])

  // Scroll to bottom on first load
  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [isLoading, channelId])

  // Scroll to bottom on new message if already at bottom
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewCount(0)
    }
  }, [messages.length, atBottom])

  // Deep-link scroll
  useEffect(() => {
    if (!deepLinkMessageId) return
    const el = document.getElementById(`msg-${deepLinkMessageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('chat-highlight')
      setTimeout(() => el.classList.remove('chat-highlight'), 2000)
    }
  }, [deepLinkMessageId])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAtBottom(isNearBottom)
    if (isNearBottom) setNewCount(0)
  }, [])

  // Infinite scroll trigger (top of list)
  const [topRef] = useInView({
    onChange: (inView) => { if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage() },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sky-400" />
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]" style={{ fontFamily: 'Tajawal, sans-serif' }}>
        <span className="text-4xl">💬</span>
        <p className="text-sm">لا توجد رسائل بعد. ابدأ المحادثة!</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto py-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Infinite scroll trigger at top */}
        <div ref={topRef} />
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 size={20} className="animate-spin text-sky-400" />
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const isGrouped = isSameGroup(prev, msg)
          return (
            <div key={msg.id} id={`msg-${msg.id}`}>
              <MessageBubble
                message={msg}
                isGrouped={isGrouped}
                channelId={channelId}
                groupId={groupId}
                onReply={onReply}
                onEdit={onEdit}
              />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* New messages pill */}
      {newCount > 0 && (
        <button
          onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setNewCount(0) }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500 text-white text-sm shadow-lg hover:bg-sky-400 transition-colors z-10"
          style={{ fontFamily: 'Tajawal, sans-serif' }}
        >
          <ChevronDown size={16} />
          {newCount} رسائل جديدة
        </button>
      )}
    </div>
  )
}
