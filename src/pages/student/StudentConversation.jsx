import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, Loader2, RefreshCw, Bot, User, Lock,
  Coffee, ShoppingBag, Plane, Briefcase, Stethoscope, BookOpen,
  Clock, MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// ─── Scenario config with rich metadata ─────────────────────
const SCENARIOS = [
  {
    id: 'coffee',
    label: 'طلب قهوة',
    labelEn: 'Order Coffee',
    icon: Coffee,
    description: 'اطلب مشروبك المفضل في مقهى أمريكي',
    difficulty: 'beginner',
    duration: '~5 دقائق',
    turns: '8-12 رسالة',
    gradient: 'from-amber-900/60 via-amber-800/40 to-orange-900/30',
    iconBg: 'from-amber-500/30 to-orange-500/20',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/15 border-amber-500/25 text-amber-300',
    btnColor: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300',
    preview: [
      { role: 'ai', text: 'Hi! Welcome to Starbucks. What can I get for you?' },
      { role: 'student', text: 'Can I have a...' },
    ],
    prompt: 'You are a friendly barista at a coffee shop. The customer is an Arabic-speaking English learner. Start by greeting them and asking what they would like to order. Keep responses short (1-2 sentences). Correct any major English mistakes gently inline.',
  },
  {
    id: 'shopping',
    label: 'تسوق',
    labelEn: 'Shopping',
    icon: ShoppingBag,
    description: 'اشترِ ملابس وتحدث مع البائع',
    difficulty: 'beginner',
    duration: '~5 دقائق',
    turns: '8-12 رسالة',
    gradient: 'from-violet-900/60 via-purple-800/40 to-pink-900/30',
    iconBg: 'from-violet-500/30 to-pink-500/20',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/15 border-violet-500/25 text-violet-300',
    btnColor: 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-300',
    preview: [
      { role: 'ai', text: 'Hello! Are you looking for anything specific?' },
      { role: 'student', text: "I'm looking for..." },
    ],
    prompt: 'You are a helpful clothing store assistant. The customer is an Arabic-speaking English learner looking to buy clothes. Ask them what they are looking for, suggest items, discuss sizes and colors. Keep responses short. Correct major mistakes gently.',
  },
  {
    id: 'travel',
    label: 'سفر',
    labelEn: 'Travel',
    icon: Plane,
    description: 'احجز رحلة واستعلم عن المواعيد',
    difficulty: 'intermediate',
    duration: '~7 دقائق',
    turns: '10-15 رسالة',
    gradient: 'from-sky-900/60 via-cyan-800/40 to-blue-900/30',
    iconBg: 'from-sky-500/30 to-cyan-500/20',
    accent: 'text-sky-400',
    accentBg: 'bg-sky-500/15 border-sky-500/25 text-sky-300',
    btnColor: 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300',
    preview: [
      { role: 'ai', text: 'Good morning! Where would you like to fly?' },
      { role: 'student', text: "I'd like to book..." },
    ],
    prompt: 'You are a travel agent. The customer is an Arabic-speaking English learner wanting to book a trip. Ask about destination, dates, budget. Keep responses short (1-2 sentences). Correct major mistakes gently.',
  },
  {
    id: 'interview',
    label: 'مقابلة عمل',
    labelEn: 'Job Interview',
    icon: Briefcase,
    description: 'تدرب على أسئلة المقابلات الوظيفية',
    difficulty: 'advanced',
    duration: '~10 دقائق',
    turns: '12-18 رسالة',
    gradient: 'from-emerald-900/60 via-green-800/40 to-teal-900/30',
    iconBg: 'from-emerald-500/30 to-teal-500/20',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',
    btnColor: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300',
    preview: [
      { role: 'ai', text: 'Tell me about yourself.' },
      { role: 'student', text: "Sure, I'm..." },
    ],
    prompt: 'You are a job interviewer for a general office position. The candidate is an Arabic-speaking English learner. Ask common interview questions one at a time. Give brief feedback on their answers. Keep it encouraging and professional.',
  },
  {
    id: 'doctor',
    label: 'عيادة',
    labelEn: 'At the Clinic',
    icon: Stethoscope,
    description: 'صف أعراضك وتحدث مع الطبيب',
    difficulty: 'intermediate',
    duration: '~7 دقائق',
    turns: '10-14 رسالة',
    gradient: 'from-rose-900/60 via-red-800/40 to-pink-900/30',
    iconBg: 'from-rose-500/30 to-red-500/20',
    accent: 'text-rose-400',
    accentBg: 'bg-rose-500/15 border-rose-500/25 text-rose-300',
    btnColor: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300',
    preview: [
      { role: 'ai', text: 'What seems to be the problem?' },
      { role: 'student', text: "I've been having..." },
    ],
    prompt: 'You are a doctor. The patient is an Arabic-speaking English learner describing their symptoms. Ask follow-up questions about how they feel, give simple advice. Keep responses short and use simple English.',
  },
  {
    id: 'school',
    label: 'مدرسة',
    labelEn: 'At School',
    icon: BookOpen,
    description: 'تحدث مع معلمك عن يومك',
    difficulty: 'beginner',
    duration: '~5 دقائق',
    turns: '8-12 رسالة',
    gradient: 'from-indigo-900/60 via-blue-800/40 to-violet-900/30',
    iconBg: 'from-indigo-500/30 to-blue-500/20',
    accent: 'text-indigo-400',
    accentBg: 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300',
    btnColor: 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300',
    preview: [
      { role: 'ai', text: 'How was your weekend?' },
      { role: 'student', text: 'It was great! I...' },
    ],
    prompt: 'You are a friendly English teacher. The student is an Arabic-speaking English learner. Have a casual conversation about school, hobbies, or weekend plans. Keep it light and encouraging. Correct mistakes naturally.',
  },
]

const DIFFICULTY_CONFIG = {
  beginner: { label: 'مبتدئ', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  intermediate: { label: 'متوسط', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  advanced: { label: 'متقدم', color: 'bg-red-500/20 text-red-300 border border-red-500/30' },
}

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
      const systemPrompt = `${scenario.prompt}\n\nThe student is at ${levelDesc} level. Adjust your vocabulary accordingly. Always respond in English only. Keep responses under 3 sentences. After every 4-5 exchanges, give a brief progress note in Arabic (1 sentence) about how they're doing.`

      const { data: { session } } = await supabase.auth.getSession()

      const chatRes = await invokeWithRetry('ai-student-chatbot', {
        body: {
          message: userMsg,
          system_override: systemPrompt,
          history: messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 30000, retries: 1 })

      if (chatRes.error) {
        throw new Error(String(chatRes.error))
      }

      return chatRes.data?.reply || chatRes.data?.message || 'Sorry, I could not respond.'
    },
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    },
    onError: (err) => {
      const errText = err?.message || 'عذرًا، حدث خطأ. حاول مرة أخرى.'
      setMessages(prev => [...prev, { role: 'assistant', content: errText }])
    },
  })

  function startScenario(s) {
    setScenario(s)
    setMessages([])
    const startMsg = { role: 'assistant', content: '...' }
    setMessages([startMsg])

    supabase.auth.getSession().then(({ data: { session } }) => {
      invokeWithRetry('ai-student-chatbot', {
        body: {
          message: 'ابدأ المحادثة',
          system_override: `${s.prompt}\n\nThe student is at ${levelDesc} level. Start the conversation with a greeting. Respond in English only. Keep it short.`,
          history: [],
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 30000, retries: 1 }).then(res => {
        setMessages([{ role: 'assistant', content: res.data?.reply || 'Hello! How can I help you today?' }])
      }).catch(() => {
        setMessages([{ role: 'assistant', content: 'Hello! How can I help you today?' }])
      })
    }).catch(() => {
      setMessages([{ role: 'assistant', content: 'Hello! How can I help you today?' }])
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
    const userMessages = messages.filter(m => m.role === 'user').length
    const xp = Math.min(25, userMessages * 3)
    if (xp > 0) {
      supabase.from('xp_transactions').insert({
        student_id: profile?.id,
        amount: xp,
        reason: 'custom',
        description: `محادثة تدريبية: ${scenario.label}`,
      }).then(() => {})
    }
    setScenario(null)
    setMessages([])
  }

  // ─── Scenario Selection Screen ─────────────────────────────
  if (!scenario) {
    return (
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center sm:text-right">
          <h1 className="text-page-title flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 flex items-center justify-center border border-sky-500/20">
              <MessageCircle size={22} className="text-sky-400" />
            </div>
            محاكي المحادثات
          </h1>
          <p className="text-muted text-sm mt-2 max-w-lg">
            اختر موقف واقعي وابدأ التدرب على المحادثة بالإنجليزية مع الذكاء الاصطناعي
          </p>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SCENARIOS.map((s, i) => {
            const Icon = s.icon
            const diff = DIFFICULTY_CONFIG[s.difficulty]

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
                className="group relative"
              >
                <button
                  onClick={() => startScenario(s)}
                  className={`w-full text-right rounded-2xl overflow-hidden bg-gradient-to-br ${s.gradient} border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
                >
                  {/* Top section: badge + duration */}
                  <div className="flex items-center justify-between px-5 pt-5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${diff.color}`}>
                      {diff.label}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {s.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {s.turns}
                      </span>
                    </div>
                  </div>

                  {/* Large icon area */}
                  <div className="relative flex items-center justify-center py-6">
                    {/* Glow behind icon */}
                    <div className={`absolute w-28 h-28 rounded-full bg-gradient-to-br ${s.iconBg} blur-2xl opacity-60`} />
                    <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${s.iconBg} border border-white/[0.08] flex items-center justify-center`}>
                      <Icon size={40} className={`${s.accent} opacity-90`} />
                    </div>
                  </div>

                  {/* Title + description */}
                  <div className="px-5 pb-3">
                    <h3 className="text-lg font-bold text-white mb-0.5">{s.label}</h3>
                    <p className="text-xs text-white/50 font-medium" dir="ltr">{s.labelEn}</p>
                    <p className="text-xs text-white/40 mt-1">{s.description}</p>
                  </div>

                  {/* Chat preview bubbles */}
                  <div className="px-5 pb-4 space-y-1.5">
                    {s.preview.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex ${line.role === 'ai' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                          line.role === 'ai'
                            ? 'bg-white/[0.06] text-white/50 border border-white/[0.06]'
                            : `${s.accentBg} text-xs`
                        }`}>
                          {line.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Start button */}
                  <div className="px-5 pb-5">
                    <div className={`w-full py-2.5 rounded-xl text-sm font-medium text-center transition-all ${s.btnColor} opacity-80 group-hover:opacity-100`}>
                      ابدأ المحادثة
                    </div>
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Active Conversation Screen ────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${scenario.iconBg} border border-white/[0.08] flex items-center justify-center`}>
            <scenario.icon size={20} className={scenario.accent} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{scenario.label}</h1>
            <p className="text-xs text-muted">{scenario.description}</p>
          </div>
        </div>
        <button onClick={endConversation} className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
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
                  ? 'bg-sky-500/20 border border-sky-500/20 text-white'
                  : 'bg-white/5 border border-border-subtle text-white/90'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.role === 'user' ? (
                    <User size={12} className="text-sky-400" />
                  ) : (
                    <Bot size={12} className={scenario.accent} />
                  )}
                  <span className="text-xs text-muted">
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
                <Loader2 size={14} className={`animate-spin ${scenario.accent}`} />
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
