import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileEdit, Lightbulb, Save, Send, Bot, ChevronDown, CheckCircle2, BookOpen, Target } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

// ─── Storage helpers ─────────────────────────────────
const draftKey = (taskId) => `fluentia_writing_draft_${taskId}`

function saveDraft(taskId, text) {
  try { localStorage.setItem(draftKey(taskId), text) } catch {}
}

function loadDraft(taskId) {
  try { return localStorage.getItem(draftKey(taskId)) || '' } catch { return '' }
}

// ─── Word counter ────────────────────────────────────
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ─── Main Component ──────────────────────────────────
export default function WritingTab({ unitId }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['unit-writing', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_writing')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <WritingSkeleton />

  if (!tasks?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <FileEdit size={28} className="text-rose-400" />
        </div>
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد مهمة كتابة لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tasks.map((task, idx) => (
        <WritingTask key={task.id} task={task} number={idx + 1} total={tasks.length} />
      ))}
    </div>
  )
}

// ─── Writing Task ────────────────────────────────────
function WritingTask({ task, number, total }) {
  const [text, setText] = useState(() => loadDraft(task.id))
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hintsOpen, setHintsOpen] = useState(false)

  const wordCount = countWords(text)
  const inRange = wordCount >= task.word_count_min && wordCount <= task.word_count_max
  const underMin = wordCount > 0 && wordCount < task.word_count_min

  // Auto-save draft on change (debounced)
  useEffect(() => {
    const t = setTimeout(() => saveDraft(task.id, text), 500)
    return () => clearTimeout(t)
  }, [text, task.id])

  const handleSave = useCallback(() => {
    saveDraft(task.id, text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [task.id, text])

  const handleSubmit = useCallback(() => {
    saveDraft(task.id, text)
    setSubmitted(true)
  }, [task.id, text])

  const taskTypeAr = {
    paragraph: 'فقرة',
    essay: 'مقال',
    letter: 'رسالة',
    email: 'بريد إلكتروني',
    story: 'قصة',
    summary: 'ملخص',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {total > 1 && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
          المهمة {number} من {total}
        </p>
      )}

      {/* Prompt card */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <FileEdit size={18} className="text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">مهمة الكتابة</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 font-['Tajawal']">
                {taskTypeAr[task.task_type] || task.task_type}
              </span>
            </div>
            {/* English prompt */}
            <p className="text-sm text-[var(--text-secondary)] font-['Inter'] mt-2 leading-relaxed" dir="ltr">
              {task.prompt_en}
            </p>
            {/* Arabic prompt */}
            {task.prompt_ar && (
              <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1.5 leading-relaxed">
                {task.prompt_ar}
              </p>
            )}
          </div>
        </div>

        {/* Word count target */}
        <div className="flex items-center gap-2">
          <Target size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            عدد الكلمات المطلوب: {task.word_count_min} – {task.word_count_max} كلمة
          </span>
        </div>

        {/* Rubric */}
        {task.rubric && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(task.rubric).map(([criterion, weight]) => (
              <span
                key={criterion}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold font-['Inter']"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
              >
                {criterion} {weight}%
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hints (collapsible) */}
      {task.hints?.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => setHintsOpen(!hintsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">أفكار للمساعدة</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform duration-200 ${hintsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {hintsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {task.hints.map((hint, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-xs font-['Inter'] text-[var(--text-secondary)]"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                      dir="ltr"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Vocabulary to use */}
      {task.vocabulary_to_use?.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={14} className="text-sky-400" />
            <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">مفردات مطلوبة</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.vocabulary_to_use.map((word, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg text-xs font-semibold font-['Inter'] bg-sky-500/10 text-sky-400"
                dir="ltr"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Text area */}
      {!submitted ? (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ابدأ الكتابة هنا..."
            dir="ltr"
            className="w-full min-h-[200px] rounded-xl p-4 text-base font-['Inter'] leading-[1.8] resize-y outline-none transition-colors placeholder:text-[var(--text-muted)] placeholder:font-['Tajawal'] placeholder:text-right"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(56,189,248,0.4)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          />

          {/* Word count + actions */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold font-['Tajawal'] transition-colors ${
                inRange ? 'text-emerald-400' : underMin ? 'text-red-400' : 'text-[var(--text-muted)]'
              }`}
            >
              {wordCount} / {task.word_count_min}–{task.word_count_max} كلمة
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold transition-colors font-['Tajawal']"
                style={{
                  background: saved ? 'rgba(52,211,153,0.15)' : 'var(--surface-raised)',
                  color: saved ? 'rgb(52,211,153)' : 'var(--text-muted)',
                  border: `1px solid ${saved ? 'rgba(52,211,153,0.3)' : 'var(--border-subtle)'}`,
                }}
              >
                {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
                {saved ? 'تم الحفظ' : 'حفظ مسودة'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={wordCount < task.word_count_min}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors font-['Tajawal'] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={13} />
                إرسال
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Submitted state */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 text-center space-y-3"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} className="text-emerald-400" />
          </div>
          <h4 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">تم إرسال كتابتك بنجاح</h4>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {wordCount} كلمة
          </p>

          {/* Show what was written */}
          <div
            className="rounded-lg p-3 text-sm font-['Inter'] text-[var(--text-secondary)] leading-relaxed text-left mt-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}
            dir="ltr"
          >
            {text}
          </div>

          <button
            onClick={() => setSubmitted(false)}
            className="text-xs text-sky-400 hover:text-sky-300 font-bold font-['Tajawal'] mt-2"
          >
            تعديل والإرسال مرة أخرى
          </button>
        </motion.div>
      )}

      {/* AI feedback placeholder */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
      >
        <Bot size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-violet-400 font-['Tajawal']">تقييم بالذكاء الاصطناعي</p>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">
            بعد الإرسال، سيتم تقييم كتابتك وتقديم ملاحظات فورية لتحسين مستواك — قريباً إن شاء الله
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function WritingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-48 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-10 w-40 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
    </div>
  )
}
