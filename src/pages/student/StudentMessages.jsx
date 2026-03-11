import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, Loader2, Check, CheckCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

export default function StudentMessages() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  const isStudent = profile?.role === 'student'

  // For students: get their group's trainer
  // For trainers: get list of students who have DM'd them
  const { data: conversations } = useQuery({
    queryKey: ['dm-conversations', profile?.id, profile?.role],
    queryFn: async () => {
      if (isStudent) {
        // Get trainer from student's group
        const { data: group } = await supabase
          .from('groups')
          .select('trainer_id, trainers:trainer_id(id, profiles(full_name, display_name))')
          .eq('id', studentData?.group_id)
          .single()

        if (!group?.trainers) return []

        const trainer = group.trainers
        const trainerName = trainer.profiles?.display_name || trainer.profiles?.full_name || 'المدرب'

        // Count unread
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('from_id', trainer.id)
          .eq('to_id', profile?.id)
          .is('read_at', null)

        return [{
          id: trainer.id,
          name: trainerName,
          role: 'trainer',
          unread: count || 0,
        }]
      } else {
        // Trainer: get all students who have DMs with me
        const { data: sentToMe } = await supabase
          .from('direct_messages')
          .select('from_id')
          .eq('to_id', profile?.id)

        const { data: sentByMe } = await supabase
          .from('direct_messages')
          .select('to_id')
          .eq('from_id', profile?.id)

        const contactIds = new Set([
          ...(sentToMe || []).map(m => m.from_id),
          ...(sentByMe || []).map(m => m.to_id),
        ])

        if (contactIds.size === 0) return []

        const contacts = []
        for (const contactId of contactIds) {
          const { data: contactProfile } = await supabase
            .from('profiles')
            .select('id, full_name, display_name, role')
            .eq('id', contactId)
            .single()

          if (contactProfile && contactProfile.role === 'student') {
            const { count } = await supabase
              .from('direct_messages')
              .select('*', { count: 'exact', head: true })
              .eq('from_id', contactId)
              .eq('to_id', profile?.id)
              .is('read_at', null)

            contacts.push({
              id: contactId,
              name: contactProfile.display_name || contactProfile.full_name || 'طالب',
              role: 'student',
              unread: count || 0,
            })
          }
        }

        return contacts
      }
    },
    enabled: !!profile?.id,
  })

  const [selectedContact, setSelectedContact] = useState(null)

  // Auto-select first contact (for students, their trainer)
  useEffect(() => {
    if (conversations?.length > 0 && !selectedContact) {
      setSelectedContact(conversations[0])
    }
  }, [conversations, selectedContact])

  // Fetch messages with selected contact
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['dm-messages', profile?.id, selectedContact?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(from_id.eq.${profile?.id},to_id.eq.${selectedContact?.id}),and(from_id.eq.${selectedContact?.id},to_id.eq.${profile?.id})`)
        .order('created_at', { ascending: true })
        .limit(100)

      // Mark unread messages from contact as read
      const unreadIds = (data || [])
        .filter(m => m.from_id === selectedContact?.id && !m.read_at)
        .map(m => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
        queryClient.invalidateQueries({ queryKey: ['dm-conversations'] })
      }

      return data || []
    },
    enabled: !!selectedContact?.id,
    refetchInterval: 10000,
  })

  // Real-time subscription
  useEffect(() => {
    if (!profile?.id || !selectedContact?.id) return

    const channel = supabase
      .channel(`dm-${profile.id}-${selectedContact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const msg = payload.new
          if (
            (msg.from_id === profile.id && msg.to_id === selectedContact.id) ||
            (msg.from_id === selectedContact.id && msg.to_id === profile.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ['dm-messages'] })
            queryClient.invalidateQueries({ queryKey: ['dm-conversations'] })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, selectedContact?.id, queryClient])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const sendDM = useMutation({
    mutationFn: async () => {
      const trimmed = message.trim()
      if (!trimmed || !selectedContact) return

      const { error } = await supabase.from('direct_messages').insert({
        from_id: profile?.id,
        to_id: selectedContact.id,
        content: trimmed,
      })
      if (error) throw error

      // Send notification to recipient
      const senderName = profile?.display_name || profile?.full_name || 'مستخدم'
      await supabase.from('notifications').insert({
        user_id: selectedContact.id,
        type: 'trainer_note',
        title: `رسالة من ${senderName}`,
        body: trimmed.substring(0, 100),
        data: { link: isStudent ? '/student/messages' : '/trainer/messages' },
      })
    },
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['dm-messages'] })
    },
  })

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendDM.mutate()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-2 mb-3">
        <Mail size={22} className="text-sky-400" />
        <h1 className="text-xl font-bold text-white">الرسائل الخاصة</h1>
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Contact list (for trainers with multiple students) */}
        {!isStudent && conversations?.length > 0 && (
          <div className="w-48 shrink-0 overflow-y-auto space-y-1">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`w-full text-right px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                  selectedContact?.id === c.id
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'bg-white/5 text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <span className="truncate">{c.name}</span>
                {c.unread > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted text-center py-4">لا توجد محادثات</p>
            )}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedContact ? (
            <>
              {/* Contact header */}
              <div className="glass-card px-4 py-2.5 mb-2 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedContact.role === 'trainer'
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {selectedContact.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedContact.name}</p>
                  <p className="text-[10px] text-muted">
                    {selectedContact.role === 'trainer' ? 'المدرب' : 'طالب'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-2 px-1">
                {messagesLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-muted" size={24} />
                  </div>
                )}

                {!messagesLoading && messages?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Mail size={40} className="text-muted opacity-30 mb-3" />
                    <p className="text-muted text-sm">لا توجد رسائل</p>
                    <p className="text-xs text-muted mt-1">ابدأ المحادثة مع {selectedContact.name}</p>
                  </div>
                )}

                {messages?.map((msg) => {
                  const isMe = msg.from_id === profile?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        <div className={`rounded-2xl px-3.5 py-2 text-sm ${
                          isMe
                            ? 'bg-sky-500/10 border border-sky-500/20 text-white'
                            : 'bg-white/5 border border-border-subtle text-white'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                          <span className="text-[10px] text-muted">{timeAgo(msg.created_at)}</span>
                          {isMe && (
                            msg.read_at
                              ? <CheckCheck size={10} className="text-sky-400" />
                              : <Check size={10} className="text-muted" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-end gap-2 mt-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالة..."
                  className="input-field text-sm resize-none py-2.5 min-h-[42px] max-h-32 flex-1"
                  rows={1}
                />
                <button
                  onClick={() => sendDM.mutate()}
                  disabled={!message.trim() || sendDM.isPending}
                  className="btn-primary p-2.5 rounded-xl shrink-0"
                >
                  {sendDM.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail size={48} className="text-muted mx-auto mb-3 opacity-30" />
                <p className="text-muted">
                  {isStudent ? 'جاري تحميل...' : 'اختر محادثة'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
