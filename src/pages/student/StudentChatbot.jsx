import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, Loader2, Sparkles, Trash2, Brain, Crosshair, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { tracker } from '../../services/activityTracker'
import { PACKAGES } from '../../lib/constants'
import SubTabs from '../../components/common/SubTabs'

// Lazy-load sub-tab content
const StudentVocabulary = lazy(() => import('./StudentVocabulary'))
const StudentExercises = lazy(() => import('./StudentExercises'))
const StudentErrorPatterns = lazy(() => import('./StudentErrorPatterns'))

const TABS = [
  { key: 'chat', label: 'المساعد الذكي', icon: Bot },
  { key: 'vocabulary', label: 'بنك المفردات', icon: Brain },
  { key: 'exercises', label: 'تمارين مخصصة', icon: Crosshair },
  { key: 'patterns', label: 'أنماط الأخطاء', icon: AlertTriangle },
]

const STORAGE_KEY = 'fluentia_chatbot_history'

const SUGGESTIONS = [
  'وش الفرق بين whose و whom؟',
  'كيف أستخدم present perfect؟',
  'متى أستخدم a و an و the؟',
  'وش الفرق بين make و do؟',
  'كيف أحسّن نطقي بالإنجليزي؟',
  'شرح لي conditional sentences',
]

const TabFallback = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>

export default function StudentChatbot() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="space-y-6">
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'chat' && <ChatContent />}
        {activeTab === 'vocabulary' && <StudentVocabulary />}
        {activeTab === 'exercises' && <StudentExercises />}
        {activeTab === 'patterns' && <StudentErrorPatterns />}
      </Suspense>
    </div>
  )
}

function ChatContent() {
  const { profile, studentData } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState(null)
  const scrollRef = useRef(null)
  const abortRef = useRef(null)

  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const dailyLimit = pkg.chatbot_limit || 10

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${profile?.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const today = new Date().toDateString()
        const todayMsgs = parsed.filter(m => new Date(m.timestamp).toDateString() === today)
        setMessages(todayMsgs)
      } catch {}
    }
  }, [profile?.id])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${profile?.id}`, JSON.stringify(messages))
    }
  }, [messages, profile?.id])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || sending) return
    tracker.track('ai_chat_message', { message_length: msg.length })

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

      const res = await invokeWithRetry('ai-chatbot', {
        body: { message: msg, conversation_history: history },
        
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
    } catch {
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
    <div className="flex flex-col h-[calc(100dvh-280px)] lg:h-[calc(100dvh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Bot size={20} strokeWidth={1.5} className="text-violet-400" />
            </div>
            المساعد الذكي
          </h1>
          <p className="text-muted text-sm mt-1">اسأل أي سؤال عن اللغة الإنجليزية</p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && <span className="badge-muted">متبقي {remaining} رسالة اليوم</span>}
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-icon text-muted hover:text-red-400 transition-all duration-200" title="مسح المحادثة">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 fl-card-static overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={28} strokeWidth={1.5} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>أهلاً! كيف أقدر أساعدك؟</h2>
                <p className="text-sm text-muted">اسألني عن القواعد، المفردات، النطق، أو أي شيء يخص الإنجليزي</p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="text-xs text-right fl-card px-3 py-2.5 text-muted hover:translate-y-[-2px] transition-all duration-200" style={{ color: 'var(--text-tertiary)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user' ? 'bg-sky-500/20' : msg.isError ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'border border-border-subtle'
                }`} style={msg.role === 'user' ? { color: 'var(--text-primary)' } : msg.isError ? undefined : { color: 'var(--text-primary)', background: 'var(--surface-raised)' }}>
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bot size={14} className="text-violet-400" />
                      <span className="text-xs text-violet-400 font-medium">المساعد</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </motion.div>
            ))
          )}
          {sending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: 'var(--surface-raised)' }}>
                <Loader2 size={14} className="animate-spin text-violet-400" />
                <span className="text-xs text-muted">يفكر...</span>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-border-subtle p-3">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex items-center gap-2">
            <input className="input-field flex-1 text-sm py-2.5" value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك..." disabled={sending} />
            <button type="submit" disabled={!input.trim() || sending || remaining === 0} className="btn-primary p-2.5 rounded-xl">
              <Send size={18} />
            </button>
          </form>
          <p className="text-xs text-muted mt-2 text-center">
            {dailyLimit >= 999 ? 'رسائل غير محدودة' : `${dailyLimit} رسالة يومياً — باقة ${pkg.name_ar}`}
          </p>
        </div>
      </div>
    </div>
  )
}
