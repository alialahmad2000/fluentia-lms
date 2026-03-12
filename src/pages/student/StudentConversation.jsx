import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, Loader2, Zap, RefreshCw, Bot, User,
  Coffee, ShoppingBag, Plane, Briefcase, BookOpen, Heart,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const SCENARIOS = [
  { id: 'coffee', label: 'طلب قهوة', icon: Coffee, description: 'اطلب مشروبك في مقهى', prompt: 'You are a friendly barista at a coffee shop. The customer is an Arabic-speaking English learner. Start by greeting them and asking what they would like to order. Keep responses short (1-2 sentences). Correct any major English mistakes gently inline.' },
  { id: 'shopping', label: 'تسوق', icon: ShoppingBag, description: 'اشترِ ملابس من متجر', prompt: 'You are a helpful clothing store assistant. The customer is an Arabic-speaking English learner looking to buy clothes. Ask them what they are looking for, suggest items, discuss sizes and colors. Keep responses short. Correct major mistakes gently.' },
  { id: 'travel', label: 'سفر', icon: Plane, description: 'استعلم عن رحلة', prompt: 'You are a travel agent. The customer is an Arabic-speaking English learner wanting to book a trip. Ask about destination, dates, budget. Keep responses short (1-2 sentences). Correct major mistakes gently.' },
  { id: 'interview', label: 'مقابلة عمل', icon: Briefcase, description: 'تدرب على مقابلة وظيفية', prompt: 'You are a job interviewer for a general office position. The candidate is an Arabic-speaking English learner. Ask common interview questions one at a time. Give brief feedback on their answers. Keep it encouraging and professional.' },
  { id: 'doctor', label: 'عيادة', icon: Heart, description: 'صف أعراضك للطبيب', prompt: 'You are a doctor. The patient is an Arabic-speaking English learner describing their symptoms. Ask follow-up questions about how they feel, give simple advice. Keep responses short and use simple English.' },
  { id: 'school', label: 'مدرسة', icon: BookOpen, description: 'تحدث مع معلمك', prompt: 'You are a friendly English teacher. The student is an Arabic-speaking English learner. Have a casual conversation about school, hobbies, or weekend plans. Keep it light and encouraging. Correct mistakes naturally.' },
]

export default function StudentConversation() {
  const { profile, studentData } = useAuthStore()
  const [scenario, setScenario] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  const level = studentData?.academic_level || 1
  const levelDesc = level <= 2 ? 'A1-A2 beginner' : level <= 4 ? 'B1-B2 intermediate' : 'C1-C2 advanced'

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: async (userMsg) => {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userMsg })

      const systemPrompt = `${scenario.prompt}\n\nThe student is at ${levelDesc} level. Adjust your vocabulary accordingly. Always respond in English only. Keep responses under 3 sentences. After every 4-5 exchanges, give a brief progress note in Arabic (1 sentence) about how they're doing.`

      const { data: { session } } = await supabase.auth.getSession()

      // Use the student chatbot edge function or call Claude directly
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': 'sk-ant-api03-placeholder', // Will use edge function instead
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: systemPrompt,
          messages: history,
        }),
      })

      // Fallback: use existing student chatbot edge function
      const chatRes = await supabase.functions.invoke('ai-student-chatbot', {
        body: {
          message: userMsg,
          system_override: systemPrompt,
          history: messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      return chatRes.data?.reply || chatRes.data?.message || 'Sorry, I could not respond.'
    },
    onSuccess: (reply, userMsg) => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    },
  })

  function startScenario(s) {
    setScenario(s)
    setMessages([])
    // AI starts the conversation
    const startMsg = { role: 'assistant', content: '...' }
    setMessages([startMsg])

    // Get initial message
    supabase.auth.getSession().then(({ data: { session } }) => {
      supabase.functions.invoke('ai-student-chatbot', {
        body: {
          message: 'ابدأ المحادثة',
          system_override: `${s.prompt}\n\nThe student is at ${levelDesc} level. Start the conversation with a greeting. Respond in English only. Keep it short.`,
          history: [],
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }).then(res => {
        setMessages([{ role: 'assistant', content: res.data?.reply || 'Hello! How can I help you today?' }])
      })
    })
  }

  function handleSend(e) {
    e.preventDefault()
    const msg = input.trim()
    if (!msg || sendMutation.isPending) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    sendMutation.mutate(msg)
  }

  function endConversation() {
    // Award XP based on conversation length
    const userMessages = messages.filter(m => m.role === 'user').length
    const xp = Math.min(25, userMessages * 3)
    if (xp > 0) {
      supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: `محادثة تدريبية: ${scenario.label}`,
      })
    }
    setScenario(null)
    setMessages([])
  }

  if (!scenario) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle size={24} className="text-emerald-400" />
            محاكي المحادثات
          </h1>
          <p className="text-muted text-sm mt-1">تدرب على محادثات واقعية مع الذكاء الاصطناعي</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCENARIOS.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => startScenario(s)}
                className="glass-card p-5 text-right hover:border-emerald-500/30 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <Icon size={24} className="text-emerald-400" />
                </div>
                <h3 className="font-bold text-white mb-1">{s.label}</h3>
                <p className="text-xs text-muted">{s.description}</p>
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <scenario.icon size={20} className="text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white">{scenario.label}</h1>
            <p className="text-xs text-muted">{scenario.description}</p>
          </div>
        </div>
        <button onClick={endConversation} className="text-sm text-red-400 hover:text-red-300 transition-colors">
          إنهاء المحادثة
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-sky-500/20 text-white'
                  : 'bg-white/5 border border-border-subtle text-white/90'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === 'user' ? (
                    <User size={12} className="text-sky-400" />
                  ) : (
                    <Bot size={12} className="text-emerald-400" />
                  )}
                  <span className="text-[10px] text-muted">
                    {msg.role === 'user' ? 'أنت' : scenario.label}
                  </span>
                </div>
                <div className="whitespace-pre-wrap" dir="auto">{msg.content}</div>
              </div>
            </motion.div>
          ))}
          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-emerald-400" />
                <span className="text-xs text-muted">يكتب...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-border-subtle p-3 flex items-center gap-2">
          <input
            className="input-field flex-1 text-sm py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب ردك بالإنجليزي..."
            dir="auto"
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
