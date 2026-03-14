import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { PACKAGES } from '../../lib/constants'

const STORAGE_KEY = 'fluentia_chatbot_history'

const SUGGESTIONS = [
  'وش الفرق بين whose و whom؟',
  'كيف أستخدم present perfect؟',
  'متى أستخدم a و an و the؟',
  'وش الفرق بين make و do؟',
  'كيف أحسّن نطقي بالإنجليزي؟',
  'شرح لي conditional sentences',
]

export default function StudentChatbot() {
  const { profile, studentData } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState(null)
  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const dailyLimit = pkg.chatbot_limit || 10

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${profile?.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Only keep today's messages
        const today = new Date().toDateString()
        const todayMsgs = parsed.filter(m => new Date(m.timestamp).toDateString() === today)
        setMessages(todayMsgs)
      } catch {}
    }
  }, [profile?.id])

  // Save to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${profile?.id}`, JSON.stringify(messages))
    }
  }, [messages, profile?.id])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || sending) return

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const { data: { session } } = await supabase.auth.getSession()
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      const res = await invokeWithRetry('ai-chatbot', {
        body: { message: msg, conversation_history: history },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 30000, retries: 1, signal: controller.signal })

      if (controller.signal.aborted) return

      if (res.error) {
        const errMsg = typeof res.error === 'object' ? (res.error.message || 'خطأ في الاتصال') : String(res.error)
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true, timestamp: new Date().toISOString() }])
        return
      }

      const result = res.data
      if (result?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.error, isError: true, timestamp: new Date().toISOString() }])
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: result.reply, timestamp: new Date().toISOString() }])
      if (result.remaining !== undefined) setRemaining(result.remaining)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'المساعد غير متاح حالياً — حاول مرة أخرى', isError: true, timestamp: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem(`${STORAGE_KEY}_${profile?.id}`)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Bot size={20} className="text-violet-400" />
            </div>
            المساعد الذكي
          </h1>
          <p className="text-muted text-sm mt-1">اسأل أي سؤال عن اللغة الإنجليزية</p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="badge-muted">
              متبقي {remaining} رسالة اليوم
            </span>
          )}
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-icon text-muted hover:text-red-400 transition-all duration-200" title="مسح المحادثة">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">أهلاً! كيف أقدر أساعدك؟</h2>
                <p className="text-sm text-muted">اسألني عن القواعد، المفردات، النطق، أو أي شيء يخص الإنجليزي</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-xs text-right glass-card px-3 py-2.5 text-muted hover:text-white hover:translate-y-[-2px] transition-all duration-200"
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/5 border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-400" />
                <span className="text-xs text-muted">يفكر...</span>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border-subtle p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex items-center gap-2"
          >
            <input
              className="input-field flex-1 text-sm py-2.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || remaining === 0}
              className="btn-primary p-2.5 rounded-xl"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-[10px] text-muted mt-2 text-center">
            {dailyLimit >= 999 ? 'رسائل غير محدودة' : `${dailyLimit} رسالة يومياً — باقة ${pkg.name_ar}`}
          </p>
        </div>
      </div>
    </div>
  )
}
