import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Loader2, Lightbulb, ListTree, Play, ArrowRightCircle,
  BookText, CheckCheck, Maximize2, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

const HINT_CAP = 3

const ACTIONS = [
  { key: 'ideas',       label: 'اقترح أفكار',     icon: Lightbulb,        needsText: false },
  { key: 'outline',     label: 'ابن مخطط',        icon: ListTree,         needsText: false },
  { key: 'starters',    label: 'جملة افتتاحية',   icon: Play,             needsText: false },
  { key: 'vocab_help',  label: 'كلمات مفيدة',     icon: BookText,         needsText: false },
  { key: 'continue',    label: 'كيف أكمل',        icon: ArrowRightCircle, needsText: true  },
  { key: 'expand',      label: 'وسّع كتابتي',      icon: Maximize2,        needsText: true  },
  { key: 'fix_grammar', label: 'صحح لغتي',        icon: CheckCheck,       needsText: true  },
]

/**
 * Inline AI writing assistant. Opens above the textarea.
 *
 * Props:
 *   task          — the curriculum_writing row
 *   text          — current draft text
 *   open          — boolean
 *   onClose       — () => void
 *   onInsertText  — (newText, replaceOriginal?) => void
 *   studentLevel  — optional numeric level
 *   studentId     — student's profile UUID (for hint cap tracking)
 */
export default function WritingAssistant({ task, text, open, onClose, onInsertText, studentLevel, studentId }) {
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [result, setResult] = useState(null)
  const [hintsRemaining, setHintsRemaining] = useState(HINT_CAP)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Fetch current hint count from DB on open (to persist across refreshes)
  useEffect(() => {
    if (!open || !studentId || !task?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('hint_usage')
        .eq('student_id', studentId)
        .eq('writing_id', task.id)
        .eq('section_type', 'writing')
        .maybeSingle()
      if (cancelled || !isMounted.current) return
      if (data) {
        const used = Array.isArray(data.hint_usage) ? data.hint_usage.length : 0
        setHintsRemaining(Math.max(0, HINT_CAP - used))
      }
    })()
    return () => { cancelled = true }
  }, [open, studentId, task?.id])

  const runAction = useCallback(async (action) => {
    if (hintsRemaining <= 0) {
      toast({ type: 'warning', title: 'استنفدت اقتراحاتك لهذا التاسك (3 من 3)', body: 'أكمل بنفسك — أنت قادر!' })
      return
    }

    setLoading(true)
    setActiveAction(action)
    setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({ type: 'error', title: 'انتهت الجلسة — سجل دخول مرة أخرى' })
        return
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-writing-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action,
            task_id: task?.id || '',
            prompt: task?.prompt_en || '',
            current_text: text || '',
            task_type: task?.task_type || 'paragraph',
            word_count_min: task?.word_count_min || 0,
            word_count_max: task?.word_count_max || 0,
            target_vocab: (task?.vocabulary_to_use || [])
              .map(v => typeof v === 'string' ? v : v?.word)
              .filter(Boolean),
            grammar_topic: task?.grammar_to_use?.topic_name_en || null,
            level: studentLevel,
          }),
        }
      )

      const json = await res.json()

      // Server-side cap reached (429)
      if (res.status === 429 && json.error === 'hint_cap_reached') {
        if (isMounted.current) setHintsRemaining(0)
        toast({ type: 'warning', title: 'استنفدت اقتراحاتك لهذا التاسك (3 من 3)', body: 'أكمل بنفسك — أنت قادر!' })
        return
      }

      if (json.error) {
        toast({ type: 'info', title: json.error })
        return
      }

      // Update counter from server response
      if (isMounted.current && typeof json.hints_remaining === 'number') {
        setHintsRemaining(json.hints_remaining)
      }

      if (isMounted.current) setResult(json.result)
    } catch (err) {
      console.error('[WritingAssistant] runAction failed:', err)
      toast({ type: 'error', title: 'فشل الاتصال بالمساعد' })
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [task, text, studentLevel, hintsRemaining])

  if (!open) return null

  const capExhausted = hintsRemaining <= 0

  // Counter pill color
  const counterColor =
    hintsRemaining >= 3 ? 'rgba(255,255,255,0.1)' :
    hintsRemaining === 2 ? 'rgba(245,158,11,0.18)' :
    hintsRemaining === 1 ? 'rgba(245,158,11,0.28)' :
    'rgba(239,68,68,0.22)'
  const counterTextColor =
    hintsRemaining >= 3 ? 'var(--text-muted)' :
    hintsRemaining >= 1 ? '#f59e0b' :
    '#ef4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(139,92,246,0.06))',
        border: '1px solid rgba(56,189,248,0.22)',
      }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Sparkles size={17} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
              مساعد الكتابة الذكي
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">
              اختر نوع المساعدة اللي تحتاجها — لا تقلق، أنت اللي بتكتب
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Hint counter pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: counterColor }}
            title="عدد الاقتراحات المتبقية لهذا التاسك"
          >
            <span className="text-[10px] font-['Tajawal']" style={{ color: counterTextColor }}>
              💡 {hintsRemaining}/{HINT_CAP}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            aria-label="إغلاق المساعد"
          >
            <X size={15} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Cap exhausted message */}
      {capExhausted && (
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <p className="text-sm font-bold text-red-400 font-['Tajawal']">استنفدت اقتراحاتك لهذا التاسك</p>
          <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] mt-0.5">أكمل بنفسك — أنت قادر! 💪</p>
        </div>
      )}

      {/* Action chips */}
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => {
          const disabledByText = a.needsText && !text?.trim()
          const disabledByCap = capExhausted
          const isDisabled = disabledByText || disabledByCap || loading
          const isActive = activeAction === a.key
          const Icon = a.icon
          return (
            <button
              key={a.key}
              onClick={() => runAction(a.key)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-['Tajawal'] transition-all border ${
                isActive
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                  : 'bg-[rgba(255,255,255,0.04)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-sky-500/10 hover:border-sky-500/25'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={
                disabledByCap ? 'استنفدت اقتراحاتك لهذا التاسك' :
                disabledByText ? 'اكتب جملة على الأقل لاستخدام هذه المساعدة' :
                undefined
              }
            >
              <Icon size={13} />
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Result area */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8 gap-2"
          >
            <Loader2 size={18} className="text-sky-400 animate-spin" />
            <span className="text-sm text-sky-400 font-['Tajawal']">المساعد يفكر...</span>
          </motion.div>
        )}
        {!loading && result && activeAction && (
          <motion.div
            key={activeAction + '-result'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl p-4"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)' }}
          >
            {renderResult(activeAction, result, onInsertText)}
          </motion.div>
        )}
        {!loading && !result && !capExhausted && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-[11px] text-[var(--text-muted)] font-['Tajawal'] text-center py-4"
          >
            اضغط على أي زر فوق للبدء
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Result renderers ─────────────────────────────────

function renderResult(action, result, onInsertText) {
  if (action === 'ideas' && Array.isArray(result?.ideas)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>أفكار ممكن تكتب عنها</SectionLabel>
        {result.ideas.map((idea, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <p className="text-sm font-bold text-sky-300 font-['Tajawal']">{idea.title_ar}</p>
            {idea.title_en && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5" dir="ltr">
                {idea.title_en}
              </p>
            )}
            {idea.hint_ar && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-['Tajawal'] leading-relaxed">
                {idea.hint_ar}
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (action === 'outline' && Array.isArray(result?.outline)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>مخطط الكتابة</SectionLabel>
        {result.outline.map((s, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
                {s.section_ar}
              </span>
              {s.section_en && (
                <span className="text-[11px] text-[var(--text-muted)]" dir="ltr">
                  {s.section_en}
                </span>
              )}
            </div>
            {Array.isArray(s.points) && s.points.length > 0 && (
              <ul className="space-y-0.5 mr-6">
                {s.points.map((p, j) => (
                  <li key={j} className="text-xs text-[var(--text-secondary)] list-disc" dir="ltr">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (action === 'starters' && Array.isArray(result?.starters)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>جمل افتتاحية مقترحة</SectionLabel>
        {result.starters.map((s, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed" dir="ltr">
              "{s.sentence}"
            </p>
            {s.explanation_ar && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-['Tajawal'] leading-relaxed">
                {s.explanation_ar}
              </p>
            )}
            {onInsertText && (
              <button
                onClick={() => onInsertText(s.sentence)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/25 hover:bg-sky-500/25 transition-colors font-['Tajawal']"
              >
                استخدم هذه الجملة
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (action === 'continue' && Array.isArray(result?.suggestions)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>اقتراحات لما بعد</SectionLabel>
        {result.suggestions.map((s, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed" dir="ltr">
              {s.next_sentence}
            </p>
            {s.reason_ar && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-['Tajawal']">
                {s.reason_ar}
              </p>
            )}
            {onInsertText && (
              <button
                onClick={() => onInsertText(' ' + s.next_sentence)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors font-['Tajawal']"
              >
                أضف للنص
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (action === 'vocab_help' && Array.isArray(result?.vocabulary)) {
    return (
      <div className="space-y-2">
        <SectionLabel>كلمات مفيدة</SectionLabel>
        {result.vocabulary.map((v, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-indigo-300" dir="ltr">{v.word}</span>
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">— {v.meaning_ar}</span>
            </div>
            {v.example && (
              <p className="text-[11px] text-[var(--text-secondary)] italic mt-1 leading-relaxed" dir="ltr">
                "{v.example}"
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (action === 'fix_grammar' && Array.isArray(result?.corrections)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>تصحيحات</SectionLabel>
        {result.corrections.map((c, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <div className="flex items-start gap-2 text-xs flex-wrap" dir="ltr">
              <span className="text-rose-400 line-through">{c.original}</span>
              <span className="text-emerald-400 font-bold">→ {c.corrected}</span>
            </div>
            {c.explanation_ar && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-['Tajawal'] leading-relaxed">
                {c.explanation_ar}
              </p>
            )}
            {onInsertText && c.original && c.corrected && (
              <button
                onClick={() => onInsertText(c.corrected, c.original)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors font-['Tajawal']"
              >
                طبق التصحيح
              </button>
            )}
          </div>
        ))}
        {result.overall_comment_ar && (
          <p className="text-xs text-sky-300 font-['Tajawal'] pt-2 border-t border-white/5">
            {result.overall_comment_ar}
          </p>
        )}
      </div>
    )
  }

  if (action === 'expand' && Array.isArray(result?.expansions)) {
    return (
      <div className="space-y-2.5">
        <SectionLabel>اقتراحات للتوسيع</SectionLabel>
        {result.expansions.map((e, i) => (
          <div key={i} className="rounded-lg p-3" style={cardStyle}>
            <p className="text-[11px] text-[var(--text-muted)] mb-1" dir="ltr">الأصلي: {e.original}</p>
            <p className="text-sm text-emerald-300 leading-relaxed" dir="ltr">{e.expanded}</p>
            {e.explanation_ar && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-['Tajawal']">{e.explanation_ar}</p>
            )}
            {onInsertText && e.original && e.expanded && (
              <button
                onClick={() => onInsertText(e.expanded, e.original)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition-colors font-['Tajawal']"
              >
                استبدل بالنص الموسع
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <p className="text-sm text-[var(--text-secondary)] font-['Tajawal']">
      {result?.text || 'لم أتمكن من فهم الرد — حاول مرة أخرى'}
    </p>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold text-sky-400 font-['Tajawal'] uppercase tracking-wider">
      {children}
    </p>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
}
