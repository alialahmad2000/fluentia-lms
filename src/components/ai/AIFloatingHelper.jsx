import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, Loader2, Sparkles, Minimize2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// Context hints based on current page
const PAGE_CONTEXT = {
  '/student': { hint: 'هذا الطالب في الرئيسية — يمكنك السؤال عن درجاتك، واجباتك، أو XP', role: 'student' },
  '/student/assignments': { hint: 'صفحة الواجبات — اسأل عن واجب معين أو كيف تحل', role: 'student' },
  '/student/grades': { hint: 'صفحة الدرجات — اسأل عن تحسين درجاتك', role: 'student' },
  '/student/ai-chat': { hint: 'أنت في المساعد الذكي بالفعل', skip: true },
  '/trainer/ai-assistant': { hint: 'أنت في مركز التحكم بالفعل', skip: true },
  '/trainer/assignments': { hint: 'صفحة إدارة الواجبات — يمكنني إنشاء واجب أو تقييم سريع', role: 'trainer' },
  '/trainer/writing': { hint: 'صفحة التقييم — يمكنني المساعدة في تقييم الواجبات بالذكاء الاصطناعي', role: 'trainer' },
  '/trainer/students': { hint: 'صفحة الطلاب — اسأل عن أي طالب', role: 'trainer' },
  '/admin': { hint: 'لوحة التحكم — اسأل عن حالة النظام أو نفّذ أي عملية', role: 'admin' },
  '/admin/users': { hint: 'صفحة إدارة الطلاب — يمكنني إضافة طالب أو تعديل بياناته', role: 'admin' },
  '/admin/packages': { hint: 'صفحة المدفوعات — يمكنني تسجيل دفعة أو عرض المتأخرات', role: 'admin' },
}

function getPageContext(pathname) {
  // Exact match first
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname]
  // Prefix match
  const match = Object.entries(PAGE_CONTEXT).find(([path]) => pathname.startsWith(path) && path !== '/')
  return match ? match[1] : null
}

export default function AIFloatingHelper() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const role = profile?.role
  const pageCtx = getPageContext(location.pathname)
  const isAdminOrTrainer = role === 'admin' || role === 'trainer'

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset chat when navigating + cleanup abort
  useEffect(() => {
    setMessages([])
    return () => { abortRef.current?.abort() }
  }, [location.pathname])

  // Don't show on pages that already have AI chat, or for unauthenticated users
  // IMPORTANT: These checks must be AFTER all hooks to avoid violating Rules of Hooks
  if (pageCtx?.skip || !profile) return null

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || sending) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setSending(true)

    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const invokeConfig = { timeoutMs: 30000, retries: 1, signal: controller.signal }

      if (isAdminOrTrainer) {
        const history = messages.map(m => ({ role: m.role, content: m.content }))
        const res = await invokeWithRetry('ai-trainer-assistant', {
          body: { message: msg, history },
          
        }, invokeConfig)

        if (controller.signal.aborted) return

        if (res.error) {
          const errMsg = typeof res.error === 'object' ? res.error.message : String(res.error)
          setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }])
        } else {
          const result = res.data
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result?.reply || result?.error || 'لم أفهم — حاول مرة أخرى',
            isError: !!result?.error,
          }])
        }
      } else {
        const res = await invokeWithRetry('ai-student-chatbot', {
          body: { message: msg },
          
        }, invokeConfig)

        if (controller.signal.aborted) return

        if (res.error) {
          const errMsg = typeof res.error === 'object' ? res.error.message : String(res.error)
          setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: res.data?.reply || 'لم أفهم — حاول مرة أخرى',
            isError: !!res.data?.error,
          }])
        }
      }
    } catch (err) {
      console.error('[AIFloatingHelper]', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'المساعد غير متاح حالياً',
        isError: true,
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { setIsOpen(true); setMinimized(false) }}
            className="fixed bottom-20 lg:bottom-6 left-4 lg:left-6 z-[45] w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 flex items-center justify-center transition-shadow duration-300"
          >
            <Bot size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-[45] ${
              minimized
                ? 'bottom-20 lg:bottom-6 left-4 lg:left-6 w-64'
                : 'bottom-20 lg:bottom-6 left-4 lg:left-6 w-80 sm:w-96'
            }`}
          >
            <div className="glass-card-raised rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-violet-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Sparkles size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">المساعد الذكي</p>
                    <p className="text-xs text-muted">اسأل أي شيء</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMinimized(!minimized)}
                    className="btn-ghost p-1.5 text-muted hover:text-white transition-all duration-200 rounded-lg hover:bg-white/5"
                  >
                    <Minimize2 size={14} />
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); setMessages([]) }}
                    className="btn-ghost p-1.5 text-muted hover:text-white transition-all duration-200 rounded-lg hover:bg-white/5"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              {!minimized && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
                  {messages.length === 0 && (
                    <div className="text-center py-6">
                      <Bot size={28} className="text-violet-400/30 mx-auto mb-2" />
                      <p className="text-xs text-muted">
                        {pageCtx?.hint || 'اسأل أي شيء أو اطلب مساعدة'}
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] ${
                        msg.role === 'user'
                          ? 'bg-violet-500/20 text-white'
                          : msg.isError
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-white/[0.06] text-white/90 border border-border-subtle'
                      }`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-white/[0.06] border border-border-subtle rounded-xl px-3 py-2 flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-violet-400" />
                        <span className="text-xs text-muted">يفكر...</span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}

              {/* Input */}
              {!minimized && (
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                  className="flex items-center gap-2 p-4 border-t border-white/10"
                >
                  <input
                    ref={inputRef}
                    className="input-field flex-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="اكتب سؤالك..."
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="btn-primary p-2 rounded-xl disabled:opacity-30"
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
