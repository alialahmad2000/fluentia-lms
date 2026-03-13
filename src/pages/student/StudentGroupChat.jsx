import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Hash, Megaphone, BookOpen, Mic, Headphones,
  PenLine, BookA, Loader2, Pin, Smile, Reply, MoreVertical,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import InlineMediaPreview from '../../components/InlineMediaPreview'

const CHANNELS = [
  { id: 'general', label: 'عام', icon: Hash },
  { id: 'announcements', label: 'إعلانات', icon: Megaphone },
  { id: 'reading', label: 'قراءة', icon: BookOpen },
  { id: 'speaking', label: 'محادثة', icon: Mic },
  { id: 'listening', label: 'استماع', icon: Headphones },
  { id: 'writing', label: 'كتابة', icon: PenLine },
  { id: 'vocabulary', label: 'مفردات', icon: BookA },
  { id: 'class_summary', label: 'ملخصات', icon: MessageSquare },
]

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '🤔']

export default function StudentGroupChat() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState('general')
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showReactions, setShowReactions] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const groupId = studentData?.group_id
  const isTrainer = profile?.role === 'trainer' || profile?.role === 'admin'

  // Fetch messages for current channel
  const { data: messages, isLoading } = useQuery({
    queryKey: ['group-messages', groupId, channel],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_messages')
        .select(`
          id, content, type, is_pinned, file_url, voice_url, voice_duration,
          created_at, reply_to,
          sender:sender_id(id, full_name, display_name, role),
          reply_msg:reply_to(content, sender:sender_id(display_name, full_name))
        `)
        .eq('group_id', groupId)
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(100)
      return data || []
    },
    enabled: !!groupId,
  })

  // Fetch reactions for visible messages
  const messageIds = useMemo(() => (messages || []).map(m => m.id), [messages])
  const { data: reactions } = useQuery({
    queryKey: ['message-reactions', messageIds],
    queryFn: async () => {
      if (!messageIds.length) return {}
      const { data } = await supabase
        .from('message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds)

      const map = {}
      ;(data || []).forEach(r => {
        if (!map[r.message_id]) map[r.message_id] = []
        map[r.message_id].push(r)
      })
      return map
    },
    enabled: messageIds.length > 0,
  })

  // Pinned messages
  const { data: pinnedMessages } = useQuery({
    queryKey: ['pinned-messages', groupId, channel],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_messages')
        .select('id, content, sender:sender_id(display_name, full_name)')
        .eq('group_id', groupId)
        .eq('channel', channel)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(3)
      return data || []
    },
    enabled: !!groupId,
  })

  // Real-time subscription
  useEffect(() => {
    if (!groupId) return

    const ch = supabase
      .channel(`group-chat-${groupId}-${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (payload.new.channel === channel) {
            queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, channel] })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [groupId, channel, queryClient])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      const trimmed = message.trim()
      if (!trimmed) return

      // Check for @mentions
      const mentionRegex = /@(\S+)/g
      const mentions = []
      let match
      while ((match = mentionRegex.exec(trimmed)) !== null) {
        mentions.push(match[1])
      }

      const isAnnouncement = isTrainer && channel === 'announcements'

      const { data, error } = await supabase.from('group_messages').insert({
        group_id: groupId,
        sender_id: profile?.id,
        channel,
        type: isAnnouncement ? 'announcement' : 'text',
        content: trimmed,
        reply_to: replyTo?.id || null,
      }).select('id').single()

      if (error) throw error

      // Process @mentions — notify mentioned users
      if (mentions.length > 0) {
        const { data: groupStudents } = await supabase
          .from('students')
          .select('id, profiles(display_name, full_name)')
          .eq('group_id', groupId)
          .eq('status', 'active')
          .is('deleted_at', null)

        const senderName = profile?.display_name || profile?.full_name || 'زميلك'

        for (const student of (groupStudents || [])) {
          const name = student.profiles?.display_name || student.profiles?.full_name || ''
          if (mentions.some(m => name.includes(m))) {
            await supabase.from('notifications').insert({
              user_id: student.id,
              type: 'system',
              title: `${senderName} ذكرك في المحادثة`,
              body: trimmed.substring(0, 100),
              data: { link: '/student/chat', message_id: data.id },
            })
          }
        }
      }

      // If announcement, notify all group members
      if (isAnnouncement) {
        const { data: groupStudents } = await supabase
          .from('students')
          .select('id')
          .eq('group_id', groupId)
          .eq('status', 'active')
          .is('deleted_at', null)
          .neq('id', profile?.id)

        const senderName = profile?.display_name || profile?.full_name || 'المدرب'
        const notifs = (groupStudents || []).map(s => ({
          user_id: s.id,
          type: 'system',
          title: `إعلان من ${senderName}`,
          body: trimmed.substring(0, 100),
          data: { link: '/student/chat' },
        }))

        if (notifs.length > 0) {
          await supabase.from('notifications').insert(notifs)
        }
      }
    },
    onSuccess: () => {
      setMessage('')
      setReplyTo(null)
      queryClient.invalidateQueries({ queryKey: ['group-messages'] })
    },
    onError: (err) => {
      console.error('Failed to send message:', err)
    },
  })

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      // Check if already reacted with this emoji
      const existing = (reactions?.[messageId] || []).find(
        r => r.user_id === profile?.id && r.emoji === emoji
      )

      if (existing) {
        await supabase.from('message_reactions').delete()
          .eq('message_id', messageId)
          .eq('user_id', profile?.id)
          .eq('emoji', emoji)
      } else {
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: profile?.id,
          emoji,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-reactions'] })
      setShowReactions(null)
    },
  })

  // Pin/Unpin message (trainer only)
  const togglePin = useMutation({
    mutationFn: async ({ messageId, isPinned }) => {
      await supabase.from('group_messages')
        .update({ is_pinned: !isPinned })
        .eq('id', messageId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages'] })
      queryClient.invalidateQueries({ queryKey: ['pinned-messages'] })
    },
  })

  function getSenderName(sender) {
    return sender?.display_name || sender?.full_name || 'مجهول'
  }

  function groupReactions(msgReactions) {
    const groups = {}
    ;(msgReactions || []).forEach(r => {
      if (!groups[r.emoji]) groups[r.emoji] = { count: 0, hasMe: false }
      groups[r.emoji].count++
      if (r.user_id === profile?.id) groups[r.emoji].hasMe = true
    })
    return groups
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage.mutate()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Channel tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {CHANNELS.map(ch => {
          const Icon = ch.icon
          return (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                channel === ch.id
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'bg-white/5 text-muted hover:text-white border border-transparent'
              }`}
            >
              <Icon size={13} />
              {ch.label}
            </button>
          )
        })}
      </div>

      {/* Pinned messages */}
      {pinnedMessages?.length > 0 && (
        <div className="mb-2 space-y-1">
          {pinnedMessages.map(pm => (
            <div key={pm.id} className="flex items-center gap-2 bg-gold-500/5 border border-gold-500/10 rounded-lg px-3 py-1.5 text-xs">
              <Pin size={12} className="text-gold-400 shrink-0" />
              <span className="text-gold-400 font-medium shrink-0">{getSenderName(pm.sender)}:</span>
              <span className="text-muted truncate">{pm.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted" size={24} />
          </div>
        )}

        {!isLoading && messages?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare size={40} className="text-muted opacity-30 mb-3" />
            <p className="text-muted text-sm">لا توجد رسائل في هذه القناة</p>
            <p className="text-xs text-muted mt-1">ابدأ المحادثة!</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isMe = msg.sender?.id === profile?.id
          const isSenderTrainer = msg.sender?.role === 'trainer' || msg.sender?.role === 'admin'
          const isAnnouncement = msg.type === 'announcement'
          const isSystem = msg.type === 'system'
          const msgReactions = groupReactions(reactions?.[msg.id])

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center py-2">
                <span className="text-[11px] text-muted bg-white/5 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`group relative ${isAnnouncement ? 'my-2' : ''}`}
            >
              <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  isSenderTrainer
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {getSenderName(msg.sender)?.[0]}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender name */}
                  <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[11px] font-medium ${
                      isSenderTrainer ? 'text-gold-400' : 'text-sky-400'
                    }`}>
                      {getSenderName(msg.sender)}
                    </span>
                    {isSenderTrainer && (
                      <span className="text-[9px] bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded-full">مدرب</span>
                    )}
                  </div>

                  {/* Reply preview */}
                  {msg.reply_msg && (
                    <div className={`text-[10px] text-muted bg-white/5 rounded-lg px-2 py-1 mb-1 border-s-2 border-sky-500/30 ${isMe ? 'text-left' : ''}`}>
                      <span className="font-medium">{getSenderName(msg.reply_msg.sender)}: </span>
                      <span className="truncate">{msg.reply_msg.content?.substring(0, 60)}</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className={`rounded-2xl px-3 py-2 text-sm ${
                    isAnnouncement
                      ? 'bg-gold-500/10 border border-gold-500/20 text-white'
                      : isMe
                        ? 'bg-sky-500/10 border border-sky-500/20 text-white'
                        : 'bg-white/5 border border-border-subtle text-white'
                  }`}>
                    {isAnnouncement && (
                      <div className="flex items-center gap-1 mb-1">
                        <Megaphone size={12} className="text-gold-400" />
                        <span className="text-[10px] text-gold-400 font-medium">إعلان</span>
                      </div>
                    )}
                    {msg.is_pinned && (
                      <div className="flex items-center gap-1 mb-1">
                        <Pin size={10} className="text-gold-400" />
                        <span className="text-[10px] text-gold-400">مثبت</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.voice_url && (
                      <InlineMediaPreview url={msg.voice_url} title="رسالة صوتية" className="mt-2" />
                    )}
                    {msg.file_url && (
                      <InlineMediaPreview url={msg.file_url} className="mt-2" />
                    )}
                  </div>

                  {/* Reactions */}
                  {Object.keys(msgReactions).length > 0 && (
                    <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                      {Object.entries(msgReactions).map(([emoji, data]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                          className={`text-xs px-1.5 py-0.5 rounded-full transition-all ${
                            data.hasMe
                              ? 'bg-sky-500/20 border border-sky-500/30'
                              : 'bg-white/5 border border-border-subtle hover:bg-white/10'
                          }`}
                        >
                          {emoji} {data.count}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[10px] text-muted mt-0.5 block ${isMe ? 'text-left' : ''}`}>
                    {timeAgo(msg.created_at)}
                  </span>
                </div>

                {/* Actions (hover) */}
                <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                    className="p-1 text-muted hover:text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    <Smile size={14} />
                  </button>
                  <button
                    onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                    className="p-1 text-muted hover:text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    <Reply size={14} />
                  </button>
                  {isTrainer && (
                    <button
                      onClick={() => togglePin.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}
                      className={`p-1 rounded-lg hover:bg-white/10 transition-all ${
                        msg.is_pinned ? 'text-gold-400' : 'text-muted hover:text-white'
                      }`}
                    >
                      <Pin size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick reaction picker */}
              <AnimatePresence>
                {showReactions === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`absolute z-10 bg-navy-950 border border-border-subtle rounded-xl p-1 flex gap-0.5 shadow-xl ${
                      isMe ? 'left-12' : 'right-12'
                    } top-0`}
                  >
                    {QUICK_REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                        className="text-lg p-1 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 bg-white/5 rounded-t-xl px-3 py-2 border-s-2 border-sky-500"
          >
            <Reply size={14} className="text-sky-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-sky-400 font-medium">{getSenderName(replyTo.sender)}</p>
              <p className="text-xs text-muted truncate">{replyTo.content?.substring(0, 80)}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted hover:text-white shrink-0">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={`flex items-end gap-2 ${replyTo ? '' : 'mt-2'}`}>
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              channel === 'announcements' && isTrainer
                ? 'اكتب إعلان للمجموعة...'
                : 'اكتب رسالة... (استخدم @ للإشارة)'
            }
            className="input-field text-sm resize-none py-2.5 min-h-[42px] max-h-32"
            rows={1}
          />
        </div>
        <button
          onClick={() => sendMessage.mutate()}
          disabled={!message.trim() || sendMessage.isPending}
          className="btn-primary p-2.5 rounded-xl shrink-0"
        >
          {sendMessage.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  )
}
