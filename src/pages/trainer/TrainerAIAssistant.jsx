import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bot, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const SUGGESTIONS = [
  'اقترح واجب لمجموعة مستوى A2',
  'اكتب ملاحظة تشجيعية لطالب أداءه ضعيف',
  'كيف أحفّز الطلاب على تسليم الواجبات بالوقت؟',
  'اقترح نشاط لتحسين المحادثة',
  'لخّص أداء المجموعة هذا الأسبوع',
]

export default function TrainerAIAssistant() {
  const { profile } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const scrollRef = useRef(null)

  // Get trainer's groups for context
  const isAdmin = profile?.role === 'admin'
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-ai'],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || sending) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const context = selectedGroup ? { group_id: selectedGroup } : {}

      const res = await supabase.functions.invoke('ai-trainer-assistant', {
        body: { message: msg, context },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.error) throw new Error(res.error.message)
      const result = res.data

      if (result.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.error, isError: true }])
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'المساعد غير متاح حالياً', isError: true }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot size={24} className="text-violet-400" />
            مساعد المدرب الذكي
          </h1>
          <p className="text-muted text-sm mt-1">اسأل عن الواجبات، أداء الطلاب، أو اطلب مساعدة</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field text-sm py-1.5 w-40"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">كل المجموعات</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-muted hover:text-red-400">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">كيف أقدر أساعدك؟</h2>
                <p className="text-sm text-muted">اسألني أي سؤال يخص التدريس أو الطلاب</p>
              </div>
              <div className="grid grid-cols-1 gap-2 max-w-md w-full">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-xs text-right bg-white/5 hover:bg-white/10 border border-border-subtle rounded-xl px-3 py-2.5 text-muted hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-sky-500/20 text-white'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-white/5 border border-border-subtle text-white/90'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bot size={14} className="text-violet-400" />
                      <span className="text-[10px] text-violet-400 font-medium">المساعد</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-400" />
                <span className="text-xs text-muted">يفكر...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-border-subtle p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex items-center gap-2"
          >
            <input
              className="input-field flex-1 text-sm py-2.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب طلبك..."
              disabled={sending}
            />
            <button type="submit" disabled={!input.trim() || sending} className="btn-primary p-2.5 rounded-xl">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
