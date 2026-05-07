import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, X, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

const MESSAGE_CAP = 20
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// ── Quick-prompt templates per action + task type ─────
const QUICK_PROMPTS = {
  writing: [
    { key: 'ideas',      emoji: '💡', label: 'أفكار',   template: 'أحتاج أفكار للبدء — وش الأفكار اللي ممكن أكتب عنها؟' },
    { key: 'outline',    emoji: '📋', label: 'خطة',    template: 'ساعدني أرتب خطة فقرتي — وش الترتيب المنطقي؟' },
    { key: 'starters',   emoji: '✏️', label: 'بدايات', template: 'اقترح علي 3 طرق مختلفة لبدء فقرتي' },
    { key: 'continue',   emoji: '➡️', label: 'كمّل',   template: 'أنا كاتب لين هنا — كيف ممكن أكمل بشكل طبيعي؟' },
    { key: 'vocab',      emoji: '📚', label: 'مفردات', template: 'أبي مفردات أقوى لهذا الموضوع — اقترح علي' },
    { key: 'grammar',    emoji: '✅', label: 'تصحيح',  template: 'صحح القواعد في فقرتي وفسر الأخطاء' },
    { key: 'expand',     emoji: '🔍', label: 'توسيع',  template: 'كيف أوسّع فقرتي وأضيف تفاصيل أكثر؟' },
  ],
  speaking: [
    { key: 'ideas',      emoji: '💡', label: 'أفكار',   template: 'أحتاج أفكار للتحدث — وش الأفكار اللي ممكن أذكرها؟' },
    { key: 'structure',  emoji: '📋', label: 'ترتيب',  template: 'ساعدني أرتب كلامي — من وين أبدأ؟' },
    { key: 'starters',   emoji: '🎤', label: 'بدايات', template: 'اقترح 3 طرق مختلفة لبدء حديثي عن هذا الموضوع' },
    { key: 'vocab',      emoji: '📚', label: 'مفردات', template: 'أبي مفردات مفيدة لأتحدث عن هذا الموضوع' },
    { key: 'phrases',    emoji: '💬', label: 'عبارات', template: 'اقترح عبارات ربط تساعدني أتكلم بسلاسة' },
    { key: 'tips',       emoji: '🎯', label: 'نصائح',  template: 'وش أهم نصيحة لتحسين طلاقتي في هذا التسجيل؟' },
    { key: 'self',       emoji: '🔍', label: 'تقييم',  template: 'كيف أقيّم نفسي بعد التسجيل؟ وش أبحث عنه؟' },
  ],
}

// ── Message bubble ────────────────────────────────────
function MessageBubble({ role, content, isStreaming }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] font-['Tajawal'] leading-relaxed"
        style={role === 'user'
          ? { background: 'rgba(168,85,247,0.18)', color: 'var(--text-primary)', borderBottomRightRadius: 4 }
          : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', borderBottomLeftRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }
        }
        dir="rtl"
      >
        {content}
        {isStreaming && (
          <span className="inline-flex gap-0.5 mr-1 align-middle">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────
export default function AICoachPanel({ studentId, taskId, taskType, draftText }) {
  // All hooks at top — before any conditional logic
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [messagesRemaining, setMessagesRemaining] = useState(MESSAGE_CAP)
  const [briefing, setBriefing] = useState('')
  const [convId, setConvId]     = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  const chatEndRef  = useRef(null)
  const chatBodyRef = useRef(null)
  const isMounted   = useRef(true)
  const readerRef   = useRef(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      readerRef.current?.cancel().catch(() => {})
    }
  }, [])

  // Load existing conversation + messages on mount
  useEffect(() => {
    if (!studentId || !taskId || !taskType) return
    let cancelled = false
    ;(async () => {
      // Find conversation
      const { data: conv } = await supabase
        .from('coach_conversations')
        .select('id, message_count')
        .eq('student_id', studentId)
        .eq('task_id', taskId)
        .eq('task_type', taskType)
        .maybeSingle()

      if (cancelled || !isMounted.current) return

      if (conv) {
        setConvId(conv.id)
        setMessagesRemaining(Math.max(0, MESSAGE_CAP - (conv.message_count || 0)))

        // Load message history
        const { data: msgs } = await supabase
          .from('coach_messages')
          .select('role, content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true })
          .limit(20)

        if (!cancelled && isMounted.current && msgs) {
          setMessages(msgs.map(m => ({ role: m.role, content: m.content })))
        }
      }
    })()
    return () => { cancelled = true }
  }, [studentId, taskId, taskType])

  // Scroll management
  const scrollToBottom = useCallback((force = false) => {
    if (force || !userScrolledUp) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [userScrolledUp])

  useEffect(() => { scrollToBottom() }, [messages, streamingText])

  const handleScroll = useCallback(() => {
    const el = chatBodyRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setUserScrolledUp(!atBottom)
  }, [])

  const sendMessage = useCallback(async (messageText) => {
    const text = (messageText || input).trim()
    if (!text || sending || messagesRemaining <= 0) return

    setInput('')
    setSending(true)
    setStreamingText('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    scrollToBottom(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ type: 'error', title: 'انتهت الجلسة — سجل دخول مرة أخرى' })
        setSending(false)
        return
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/coach-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          task_id: taskId,
          task_type: taskType,
          message: text,
          draft_text: draftText || '',
        }),
      })

      // Handle 429 cap reached
      if (res.status === 429) {
        const json = await res.json().catch(() => ({}))
        if (json.error === 'message_cap_reached') {
          toast({ type: 'warning', title: json.message_ar || 'وصلت للحد الأقصى' })
          setMessagesRemaining(0)
          setSending(false)
          return
        }
      }

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      // SSE streaming
      const reader = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event = JSON.parse(data)
            if (event.token) {
              accumulated += event.token
              if (isMounted.current) setStreamingText(accumulated)
            } else if (event.done) {
              if (isMounted.current) {
                setMessagesRemaining(event.messages_remaining ?? 0)
                if (event.compact_briefing) setBriefing(event.compact_briefing)
              }
            } else if (event.error) {
              throw new Error(event.error)
            }
          } catch (parseErr) {
            // Ignore malformed events (non-JSON lines)
          }
        }
      }

      // Finalize assistant message
      if (isMounted.current) {
        const finalText = accumulated || 'تعذّر الرد — حاول مرة ثانية'
        setMessages(prev => [...prev, { role: 'assistant', content: finalText }])
        setStreamingText('')
        scrollToBottom(true)
      }
    } catch (e) {
      console.error('[AICoachPanel]', e.message)
      if (isMounted.current) {
        toast({ type: 'error', title: 'تعذّر الاتصال بالمدرّب — حاول مرة ثانية' })
        setMessages(prev => [...prev, { role: 'assistant', content: 'تعذّر الرد — حاول مرة ثانية' }])
        setStreamingText('')
      }
    } finally {
      if (isMounted.current) setSending(false)
    }
  }, [input, sending, messagesRemaining, taskId, taskType, draftText, studentId, scrollToBottom])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const handleQuickPrompt = useCallback((template) => {
    setInput(template)
  }, [])

  // ── Compact briefing: show last score + focus ─────
  const briefingLine = briefing || (draftText ? 'اكتب وأنا هنا إذا احتجت مساعدة' : 'أنا جاهز أساعدك — وش تحتاج؟')

  const prompts = QUICK_PROMPTS[taskType] || QUICK_PROMPTS.writing
  const capReached = messagesRemaining <= 0

  // ── Panel content ─────────────────────────────────
  const PanelContent = () => (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <Sparkles size={13} style={{ color: '#a855f7' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>مدرّبك الشخصي</p>
            <p className="text-[10px] font-['Tajawal'] truncate" style={{ color: 'var(--text-muted)' }}>{briefingLine}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-['Tajawal']" style={{ background: capReached ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', color: capReached ? '#ef4444' : 'var(--text-muted)' }}>
            {messagesRemaining}/{MESSAGE_CAP}
          </span>
          <button
            onClick={() => { setCollapsed(v => !v); setMobileOpen(false) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors lg:flex hidden"
          >
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: collapsed ? 'rotate(-90deg)' : 'none' }} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors lg:hidden">
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div
        ref={chatBodyRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0"
      >
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
              <MessageCircle size={18} style={{ color: '#a855f7' }} />
            </div>
            <p className="text-[12px] font-['Tajawal'] text-center" style={{ color: 'var(--text-muted)' }}>
              اسألني أي شيء عن التاسك<br />أو استخدم الاختصارات أدناه
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} isStreaming={false} />
        ))}
        {streamingText && (
          <MessageBubble role="assistant" content={streamingText} isStreaming={true} />
        )}
        {sending && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#a855f7' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-3 pb-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        {capReached ? (
          <div className="text-center py-3">
            <p className="text-[11px] font-['Tajawal']" style={{ color: '#ef4444' }}>
              وصلت للحد الأقصى ({MESSAGE_CAP}) — أكمل التاسك بنفسك! 💪
            </p>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك..."
              rows={1}
              dir="rtl"
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-[13px] font-['Tajawal'] outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                maxHeight: 80,
              }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
              style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        )}

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5">
          {prompts.map(p => (
            <button
              key={p.key}
              onClick={() => handleQuickPrompt(p.template)}
              disabled={capReached || sending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Tajawal'] transition-colors disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop: sidebar */}
      <div
        className="hidden lg:block rounded-2xl overflow-hidden flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          height: 'fit-content',
          position: 'sticky',
          top: 80,
        }}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center gap-2 py-3 hover:bg-white/4 transition-colors"
          >
            <Sparkles size={14} style={{ color: '#a855f7' }} />
            <span className="text-xs font-bold font-['Tajawal']" style={{ color: '#a855f7' }}>مدرّبك الشخصي</span>
          </button>
        ) : (
          <PanelContent />
        )}
      </div>

      {/* Mobile: FAB + drawer */}
      <div className="lg:hidden">
        {/* FAB */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-6 left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(168,85,247,0.9)', color: 'white' }}
          >
            <MessageCircle size={20} />
          </button>
        )}

        {/* Full-screen drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 flex flex-col"
              style={{ background: 'var(--bg-primary)' }}
            >
              <PanelContent />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
