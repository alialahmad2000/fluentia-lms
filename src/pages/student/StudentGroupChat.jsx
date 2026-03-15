import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Hash, Megaphone, BookOpen, Mic, Headphones,
  PenLine, BookA, Loader2, Pin, Smile, Reply, MoreVertical, Mail,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'
import InlineMediaPreview from '../../components/InlineMediaPreview'
import SubTabs from '../../components/common/SubTabs'

// Lazy-load messages sub-tab
const StudentMessages = lazy(() => import('./StudentMessages'))

const TABS = [
  { key: 'chat', label: 'محادثة المجموعة', icon: MessageSquare },
  { key: 'messages', label: 'الرسائل', icon: Mail },
]

const CHANNELS = [
  { id: 'general', label: 'عام', icon: Hash },
  { id: 'announcements', label: 'إعلانات', icon: Megaphone },
  { id: 'reading', label: 'قراءة', icon: BookOpen },
  { id: 'speaking', label: 'محادثة', icon: Mic },
  { id: 'listening', label: 'استماع', icon: Headphones },
  { id: 'writing', label: 'كتابة', icon: PenLine },
  { id: 'vocabulary', label: 'مفردات', icon: BookA },
]

const TabFallback = () => <div className="skeleton h-96 w-full" />

export default function StudentGroupChat() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="space-y-6">
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'chat' && <GroupChatContent />}
        {activeTab === 'messages' && <StudentMessages />}
      </Suspense>
    </div>
  )
}

function GroupChatContent() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const groupId = studentData?.group_id
  const [channel, setChannel] = useState('general')
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  const { data: messages, isLoading } = useQuery({
    queryKey: ['group-chat', groupId, channel],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, content, channel, is_pinned, reply_to, created_at, user_id, profiles(full_name, display_name, role)')
        .eq('group_id', groupId)
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(100)
      return data || []
    },
    enabled: !!groupId,
    refetchInterval: 10000,
  })

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const { error } = await supabase.from('chat_messages').insert({
        group_id: groupId,
        user_id: profile?.id,
        channel,
        content,
      }).select()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-chat'] })
      setInput('')
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return
    const sub = supabase
      .channel(`chat-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ['group-chat'] })
      )
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [groupId, queryClient])

  if (!groupId) {
    return (
      <div className="glass-card p-8 text-center">
        <MessageSquare size={32} className="text-muted mx-auto mb-2" />
        <p className="text-muted">لا توجد مجموعة مسجلة</p>
      </div>
    )
  }

  function handleSend(e) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg) return
    sendMutation.mutate(msg)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <h1 className="text-page-title mb-4">محادثة المجموعة</h1>

      {/* Channel selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setChannel(ch.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              channel === ch.id ? 'bg-sky-500/10 text-sky-400' : 'text-muted hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            <ch.icon size={14} />
            {ch.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" size={20} /></div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">لا توجد رسائل — ابدأ المحادثة!</div>
          ) : (
            messages?.map((msg) => {
              const isMe = msg.user_id === profile?.id
              const name = msg.profiles?.display_name || msg.profiles?.full_name || 'مجهول'
              const isTrainer = msg.profiles?.role === 'trainer' || msg.profiles?.role === 'admin'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe ? 'bg-sky-500/20' : ''
                  }`} style={isMe ? undefined : { background: 'var(--color-bg-surface-raised)' }}>
                    {!isMe && (
                      <p className={`text-xs font-medium mb-1 ${isTrainer ? 'text-emerald-400' : 'text-sky-400'}`}>
                        {name} {isTrainer && '(المدرب)'}
                      </p>
                    )}
                    <p style={{ color: 'var(--color-text-primary)' }}>{msg.content}</p>
                    <p className="text-xs text-muted mt-1">{timeAgo(msg.created_at)}</p>
                    {msg.is_pinned && <Pin size={10} className="text-gold-400 inline ml-1" />}
                  </div>
                </div>
              )
            })
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-border-subtle p-3 flex items-center gap-2">
          <input
            className="input-field flex-1 text-sm py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            disabled={sendMutation.isPending}
          />
          <button type="submit" disabled={!input.trim() || sendMutation.isPending} className="btn-primary p-2.5 rounded-xl">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
