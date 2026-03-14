import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Send, Loader2, Sparkles, Trash2, CheckCircle2, AlertCircle,
  FileText, Zap, Users, ClipboardList, Bell, BarChart3,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const QUICK_ACTIONS_TRAINER = [
  { label: 'واجبات معلقة', icon: ClipboardList, message: 'وش الواجبات المعلقة للتقييم؟' },
  { label: 'تقييم سريع', icon: Sparkles, message: 'قيّم كل الواجبات المعلقة بالذكاء الاصطناعي' },
  { label: 'إحصائيات', icon: BarChart3, message: 'وش وضع النظام؟' },
  { label: 'تذكير', icon: Bell, message: 'ذكّر اللي ما سلّموا الواجبات' },
]

const QUICK_ACTIONS_ADMIN = [
  { label: 'حالة النظام', icon: BarChart3, message: 'أعطني حالة النظام الكاملة' },
  { label: 'واجبات معلقة', icon: ClipboardList, message: 'وش الواجبات المعلقة للتقييم؟' },
  { label: 'تقييم AI', icon: Sparkles, message: 'قيّم كل الواجبات المعلقة بالذكاء الاصطناعي' },
  { label: 'مخاطر انسحاب', icon: AlertCircle, message: 'وش الطلاب اللي معرضين للانسحاب؟' },
  { label: 'متأخرات الدفع', icon: Zap, message: 'وش وضع المدفوعات المتأخرة؟' },
  { label: 'تذكير الكل', icon: Bell, message: 'ذكّر اللي ما سلّموا الواجبات' },
]

const SUGGESTIONS_TRAINER = [
  'أعطني معلومات عن الطلاب اللي ما سلّموا واجباتهم',
  'أنشئ واجب كتابة لمجموعة 2A عن daily routine',
  'أعط كل مجموعة 2A ١٠ نقاط — أداء ممتاز',
  'وش نقاط ضعف الهنوف؟',
  'سجّل حضور مجموعة 2A — الكل حاضر',
  'أرسل ملاحظة تشجيعية للهنوف',
]

const SUGGESTIONS_ADMIN = [
  'أعطني حالة النظام الكاملة — طلاب، واجبات، مدفوعات',
  'وش الطلاب اللي معرضين للانسحاب؟',
  'أنشئ مجموعة جديدة اسمها 3A مستوى 3',
  'سجّل دفعة ٧٥٠ ريال للهنوف تحويل بنكي',
  'أضف طالب جديد: محمد أحمد — m@email.com — مستوى 1 — باقة أساس — مجموعة 2A',
  'شغّل تحليل الانسحاب لكل الطلاب',
  'أعط كل مجموعة 2A ١٠ نقاط — أداء ممتاز',
  'أرسل إعلان لكل الطلاب: الاختبارات الشهرية يوم الأحد',
]

// Action result styling
const ACTION_STYLES = {
  AWARD_XP: { icon: Zap, color: 'emerald' },
  DEDUCT_XP: { icon: Zap, color: 'red' },
  CREATE_ASSIGNMENT: { icon: FileText, color: 'sky' },
  GRADE_SUBMISSION: { icon: CheckCircle2, color: 'emerald' },
  AI_GRADE_ALL: { icon: Sparkles, color: 'violet' },
  SEND_NOTE: { icon: Bell, color: 'sky' },
  ANNOUNCE_ALL: { icon: Bell, color: 'gold' },
  PROMOTE_STUDENT: { icon: Zap, color: 'gold' },
  RECORD_ATTENDANCE: { icon: Users, color: 'emerald' },
  ADD_STUDENT: { icon: Users, color: 'sky' },
}

const ACTION_BG_CLASSES = {
  emerald: 'bg-emerald-500/5 border-emerald-500/20',
  red: 'bg-red-500/5 border-red-500/20',
  sky: 'bg-sky-500/5 border-sky-500/20',
  violet: 'bg-violet-500/5 border-violet-500/20',
  gold: 'bg-gold-500/5 border-gold-500/20',
}

export default function TrainerAIAssistant() {
  const { profile } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const scrollRef = useRef(null)

  const isAdmin = profile?.role === 'admin'
  const QUICK_ACTIONS = isAdmin ? QUICK_ACTIONS_ADMIN : QUICK_ACTIONS_TRAINER
  const SUGGESTIONS = isAdmin ? SUGGESTIONS_ADMIN : SUGGESTIONS_TRAINER
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

  async function sendMessage(text, confirmedAction) {
    const msg = text || input.trim()
    if ((!msg && !confirmedAction) || sending) return

    if (msg) {
      setMessages(prev => [...prev, { role: 'user', content: msg }])
    }
    setInput('')
    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Build history from messages (exclude action metadata, just text)
      const history = messages
        .filter(m => m.content)
        .map(m => ({ role: m.role, content: m.content }))

      const body = confirmedAction
        ? { confirmed_action: confirmedAction, history, group_id: selectedGroup || undefined }
        : { message: msg, history, group_id: selectedGroup || undefined }

      const res = await invokeWithRetry('ai-trainer-assistant', {
        body,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.error) {
        const errMsg = typeof res.error === 'object' ? (res.error.message || 'خطأ في الاتصال') : String(res.error)
        throw new Error(errMsg)
      }

      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('Invalid response')

      if (result.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.error, isError: true }])
        return
      }

      // Build assistant message
      const assistantMsg = {
        role: 'assistant',
        content: result.reply || '',
        actionResult: result.action_result || null,
        needsConfirmation: result.needs_confirmation || false,
        pendingAction: result.pending_action || null,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('[AI Assistant]', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'المساعد غير متاح حالياً — حاول مرة أخرى',
        isError: true,
      }])
    } finally {
      setSending(false)
    }
  }

  function handleConfirm(pendingAction) {
    setMessages(prev => [...prev, { role: 'user', content: 'نعم، نفّذ' }])
    sendMessage(null, pendingAction)
  }

  function handleCancel() {
    setMessages(prev => [...prev, { role: 'assistant', content: 'تم الإلغاء ✓' }])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Bot size={20} className="text-violet-400" />
          </div>
          <div>
          <h1 className="text-page-title">
            مركز التحكم الذكي
          </h1>
          <p className="text-muted text-sm mt-1">نفّذ أي عملية بالكتابة — واجبات، نقاط، تقييم، إحصائيات</p>
          </div>
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
            <button onClick={() => setMessages([])} className="text-muted hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick action bar */}
      {messages.length === 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon
            return (
              <button
                key={i}
                onClick={() => sendMessage(qa.message)}
                className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs px-3 py-2 rounded-xl hover:bg-violet-500/20 transition-all whitespace-nowrap"
              >
                <Icon size={14} />
                {qa.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-section-title mb-1" style={{ color: 'var(--color-text-primary)' }}>مركز التحكم الذكي</h2>
                <p className="text-sm text-muted">اكتب أمر بالعربي وأنا أنفّذه — واجبات، نقاط، تقييم، تقارير</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
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
              <MessageBubble
                key={i}
                msg={msg}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-violet-400" />
                <span className="text-xs text-muted">ينفّذ...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border-subtle p-3">
          {/* Quick actions while chatting */}
          {messages.length > 0 && (
            <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
              {QUICK_ACTIONS.map((qa, i) => {
                const Icon = qa.icon
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(qa.message)}
                    disabled={sending}
                    className="flex items-center gap-1 text-[10px] bg-white/5 text-muted hover:text-white px-2 py-1 rounded-lg transition-all whitespace-nowrap"
                  >
                    <Icon size={10} />
                    {qa.label}
                  </button>
                )
              })}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage() }}
            className="flex items-center gap-2"
          >
            <input
              className="input-field flex-1 text-sm py-2.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أمر أو سؤال... مثلاً: أعط الهنوف ١٠ نقاط"
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

// ─── Message Bubble Component ──────────────────────────────

function MessageBubble({ msg, onConfirm, onCancel }) {
  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-sky-500/20 text-white">
          <div className="whitespace-pre-wrap">{msg.content}</div>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  const hasAction = msg.actionResult
  const isConfirm = msg.needsConfirmation
  const actionStyle = hasAction ? ACTION_STYLES[msg.actionResult.action] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
        msg.isError
          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
          : hasAction && msg.actionResult.success
            ? `${ACTION_BG_CLASSES[actionStyle?.color] || 'bg-emerald-500/5 border-emerald-500/20'} border text-white/90`
            : isConfirm
              ? 'bg-amber-500/5 border border-amber-500/20 text-white/90'
              : 'bg-white/5 border border-border-subtle text-white/90'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          {hasAction && msg.actionResult.success ? (
            <>
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium">تم التنفيذ</span>
            </>
          ) : hasAction && !msg.actionResult.success ? (
            <>
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">فشل</span>
            </>
          ) : isConfirm ? (
            <>
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-[10px] text-amber-400 font-medium">تأكيد مطلوب</span>
            </>
          ) : msg.isError ? (
            <>
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">خطأ</span>
            </>
          ) : (
            <>
              <Bot size={14} className="text-violet-400" />
              <span className="text-[10px] text-violet-400 font-medium">المساعد</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

        {/* Confirmation buttons */}
        {isConfirm && msg.pendingAction && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-500/10">
            <button
              onClick={() => onConfirm(msg.pendingAction)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-2 rounded-xl hover:bg-emerald-500/20 transition-all"
            >
              <CheckCircle2 size={12} />
              نعم، نفّذ
            </button>
            <button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 rounded-xl hover:bg-red-500/20 transition-all"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
