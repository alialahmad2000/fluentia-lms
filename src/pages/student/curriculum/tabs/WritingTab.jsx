import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileEdit, Lightbulb, Save, Send, ChevronDown, CheckCircle2, BookOpen, Target, GraduationCap, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { safeCelebrate } from '../../../../lib/celebrations'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import WritingFeedback from '../../../../components/curriculum/WritingFeedback'
import ShareAchievementCard from '../../../../components/ShareAchievementCard'
import ActivityLeaderboard from '../../../../components/ActivityLeaderboard'
import { useActivityLeaderboard } from '../../../../hooks/useActivityLeaderboard'

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
  const { profile, studentData } = useAuthStore()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['unit-writing', unitId],
    placeholderData: (prev) => prev,
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
        <WritingTask key={task.id} task={task} number={idx + 1} total={tasks.length} studentId={profile?.id} unitId={unitId} studentName={profile?.full_name || profile?.display_name} groupId={studentData?.group_id} />
      ))}
    </div>
  )
}

// ─── Writing Task ────────────────────────────────────
function WritingTask({ task, number, total, studentId, unitId, studentName, groupId }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [trainerFeedback, setTrainerFeedback] = useState(null)
  const { data: leaderboard } = useActivityLeaderboard('writing', unitId, studentId, groupId)
  const [trainerGrade, setTrainerGrade] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const dbSaveTimer = useRef(null)

  const wordCount = countWords(text)
  const inRange = wordCount >= task.word_count_min && wordCount <= task.word_count_max
  const underMin = wordCount > 0 && wordCount < task.word_count_min

  // Time tracker
  useEffect(() => {
    timerRef.current = setInterval(() => { timeRef.current += 1 }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Load progress from DB first, fall back to localStorage
  useEffect(() => {
    if (!studentId || !task.id) {
      setText(loadDraft(task.id))
      setProgressLoading(false)
      return
    }
    let isMounted = true
    const load = async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('writing_id', task.id)
        .maybeSingle()
      if (!isMounted) return
      if (data?.answers?.draft) {
        setText(data.answers.draft)
        setSubmitted(data.status === 'completed')
        if (data.time_spent_seconds) timeRef.current = data.time_spent_seconds
        if (data.answers?.lastSavedAt) setLastSavedAt(new Date(data.answers.lastSavedAt))
        if (data.attempt_number) setAttemptNumber(data.attempt_number)
        if (data.trainer_feedback) setTrainerFeedback(data.trainer_feedback)
        if (data.trainer_grade) setTrainerGrade(data.trainer_grade)
        if (data.ai_feedback) setAiFeedback(data.ai_feedback)
      } else {
        // Fall back to localStorage
        setText(loadDraft(task.id))
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, task.id])

  // Save to DB
  const saveToDb = useCallback(async (currentText, isSubmit = false) => {
    if (!studentId || !task.id) return
    const wc = countWords(currentText)
    const meetsMin = wc >= task.word_count_min
    const now = new Date().toISOString()

    const newAttemptNumber = isSubmit && meetsMin && submitted ? attemptNumber + 1 : attemptNumber

    const { error } = await supabase
      .from('student_curriculum_progress')
      .upsert({
        student_id: studentId,
        unit_id: unitId,
        writing_id: task.id,
        section_type: 'writing',
        status: isSubmit && meetsMin ? 'completed' : 'in_progress',
        score: null,
        answers: { draft: currentText, wordCount: wc, lastSavedAt: now },
        time_spent_seconds: timeRef.current,
        completed_at: isSubmit && meetsMin ? now : null,
        attempt_number: newAttemptNumber,
      }, { onConflict: 'student_id,writing_id' })

    if (!error) {
      setLastSavedAt(new Date(now))
      if (isSubmit && meetsMin) setAttemptNumber(newAttemptNumber)
    }
    return error
  }, [studentId, unitId, task.id, task.word_count_min, attemptNumber, submitted])

  // Auto-save to localStorage on change (debounced 500ms)
  useEffect(() => {
    if (progressLoading) return
    const t = setTimeout(() => saveDraft(task.id, text), 500)
    return () => clearTimeout(t)
  }, [text, task.id, progressLoading])

  // Auto-save to DB every 30 seconds while typing
  useEffect(() => {
    if (progressLoading || submitted) return
    clearTimeout(dbSaveTimer.current)
    dbSaveTimer.current = setTimeout(() => {
      if (text.trim()) saveToDb(text)
    }, 30000)
    return () => clearTimeout(dbSaveTimer.current)
  }, [text, progressLoading, submitted, saveToDb])

  // Save to DB on unmount
  useEffect(() => {
    return () => {
      clearTimeout(dbSaveTimer.current)
    }
  }, [])

  const handleSave = useCallback(async () => {
    saveDraft(task.id, text)
    await saveToDb(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
  }, [task.id, text, saveToDb])

  // Shared function to fetch AI feedback (used by submit and retry)
  const fetchFeedback = useCallback(async (writingText) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-writing-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            writing_text: writingText,
            writing_prompt: task.prompt_en || '',
            assignment_type: task.task_type || 'paragraph',
          }),
        }
      )

      const result = await res.json()

      if (result.feedback) {
        setAiFeedback(result.feedback)
        // Save feedback to DB
        const { error } = await supabase
          .from('student_curriculum_progress')
          .update({
            ai_feedback: result.feedback,
            score: result.feedback.fluency_score ? result.feedback.fluency_score * 10 : null,
          })
          .eq('student_id', studentId)
          .eq('writing_id', task.id)
        if (error) console.error('[WritingTab] Feedback save error:', error)
        return true
      } else if (result.limit_reached || result.budget_reached) {
        toast({ type: 'info', title: result.error })
      }
      return false
    } catch (err) {
      console.error('[WritingTab] Feedback call failed:', err)
      return false
    }
  }, [task.id, task.task_type, studentId])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    saveDraft(task.id, text)

    // 1. Save writing to DB first (never block on AI)
    await saveToDb(text, true)
    setSubmitted(true)
    toast({ type: 'success', title: 'تم إرسال كتابتك — جاري التصحيح...' })
    try { safeCelebrate('writing_submitted') } catch {}
    awardCurriculumXP(profile?.id, 'writing', null, unitId)

    // 2. Call AI feedback
    const success = await fetchFeedback(text)
    if (!success) {
      toast({ type: 'warning', title: 'التقييم لم يتم — اضغط "إعادة التصحيح" للمحاولة مرة أخرى' })
    }
    setSubmitting(false)
  }, [task.id, text, studentId, saveToDb, submitting, fetchFeedback])

  const handleRetryFeedback = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    toast({ type: 'info', title: 'جاري إعادة التصحيح...' })
    const success = await fetchFeedback(text)
    if (!success) {
      toast({ type: 'warning', title: 'فشل التصحيح — حاول مرة أخرى لاحقاً' })
    }
    setSubmitting(false)
  }, [text, submitting, fetchFeedback])

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

      {/* Target vocabulary + grammar hints */}
      <WritingHints task={task} text={text} />

      {/* Last saved timestamp */}
      {lastSavedAt && !submitted && (
        <p className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">
          آخر حفظ: <RelativeTime date={lastSavedAt} />
        </p>
      )}

      {/* Text area */}
      {progressLoading ? (
        <div className="h-48 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      ) : !submitted ? (
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
                disabled={wordCount < task.word_count_min || submitting}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors font-['Tajawal'] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {submitting ? 'جاري التصحيح...' : 'تسليم للتصحيح'}
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

      {/* Trainer feedback */}
      {(trainerFeedback || trainerGrade) && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-sky-400" />
            <span className="text-sm font-bold text-sky-400 font-['Tajawal']">ملاحظات المدرب</span>
          </div>
          {trainerGrade && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">التقدير:</span>
              <span className="px-3 py-0.5 rounded-full text-sm font-bold font-['Inter'] bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {trainerGrade}
              </span>
            </div>
          )}
          {trainerFeedback && (
            <p className="text-sm text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
              {trainerFeedback}
            </p>
          )}
        </div>
      )}

      {/* Correction loading */}
      {submitting && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)' }}
        >
          <Loader2 size={18} className="text-sky-400 animate-spin flex-shrink-0" />
          <span className="text-sm font-bold text-sky-400 font-['Tajawal']">جاري التصحيح...</span>
        </div>
      )}

      {/* Feedback display */}
      {aiFeedback && <WritingFeedback feedback={aiFeedback} />}

      {/* Retry button when submitted but no feedback available */}
      {submitted && !aiFeedback && !submitting && (
        <div
          className="rounded-xl p-4 flex flex-col items-center gap-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <p className="text-sm text-amber-400 font-['Tajawal']">لم يتم التصحيح بعد</p>
          <button
            onClick={handleRetryFeedback}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors font-['Tajawal']"
          >
            <RefreshCw size={13} />
            إعادة التصحيح
          </button>
        </div>
      )}

      {/* Leaderboard */}
      {aiFeedback && leaderboard && leaderboard.rankings?.length > 1 && (
        <ActivityLeaderboard
          rankings={leaderboard.rankings}
          currentStudentId={studentId}
          totalInGroup={leaderboard.totalInGroup}
        />
      )}

      {/* Share achievement card */}
      {aiFeedback && (
        <ShareAchievementCard
          type="writing"
          studentName={studentName}
          studentText={text}
          feedback={aiFeedback}
          scores={{
            ...(aiFeedback.grammar_score != null && { grammar: aiFeedback.grammar_score }),
            ...(aiFeedback.vocabulary_score != null && { vocabulary: aiFeedback.vocabulary_score }),
            ...(aiFeedback.structure_score != null && { structure: aiFeedback.structure_score }),
            ...(aiFeedback.fluency_score != null && { fluency: aiFeedback.fluency_score }),
          }}
          leaderboard={leaderboard}
          currentStudentId={studentId}
        />
      )}
    </div>
  )
}


// ─── Relative Time Display ───────────────────────────
function RelativeTime({ date }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  return `قبل ${Math.floor(diff / 86400)} يوم`
}

// ─── Writing Hints (vocab chips + grammar + live tracker) ──
function WritingHints({ task, text }) {
  const vocabItems = task.vocabulary_to_use || []
  const grammar = task.grammar_to_use
  const [expandedWord, setExpandedWord] = useState(null)
  const [grammarOpen, setGrammarOpen] = useState(false)

  if (!vocabItems.length && !grammar) return null

  // Determine which words the student has used (case-insensitive)
  const lowerText = (text || '').toLowerCase()
  const usedWords = vocabItems.filter(v => {
    const w = typeof v === 'string' ? v : v.word
    return w && lowerText.includes(w.toLowerCase())
  })
  const usedCount = usedWords.length
  const totalCount = vocabItems.length

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}
    >
      {/* Target Vocabulary */}
      {vocabItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Target size={14} className="text-sky-400" />
            <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">
              كلمات مستهدفة — حاول استخدام {Math.min(6, totalCount)} منها على الأقل
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {vocabItems.map((v, i) => {
              const word = typeof v === 'string' ? v : v.word
              const defAr = typeof v === 'object' ? v.definition_ar : null
              const example = typeof v === 'object' ? v.example : null
              const isUsed = word && lowerText.includes(word.toLowerCase())
              const isExpanded = expandedWord === i

              return (
                <button
                  key={i}
                  onClick={() => setExpandedWord(isExpanded ? null : i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-['Inter'] transition-all border ${
                    isUsed
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-[rgba(255,255,255,0.04)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-sky-500/10 hover:border-sky-500/20'
                  }`}
                  dir="ltr"
                >
                  {isUsed && <span className="mr-1">✓</span>}
                  {word}
                </button>
              )
            })}
          </div>

          {/* Expanded word tooltip */}
          <AnimatePresence>
            {expandedWord !== null && vocabItems[expandedWord] && typeof vocabItems[expandedWord] === 'object' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 rounded-lg p-3 text-xs space-y-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }}
              >
                <p className="font-bold text-[var(--text-primary)] font-['Tajawal']" dir="rtl">
                  {vocabItems[expandedWord].definition_ar}
                </p>
                {vocabItems[expandedWord].definition_en && (
                  <p className="text-[var(--text-muted)] font-['Inter']" dir="ltr">
                    {vocabItems[expandedWord].definition_en}
                  </p>
                )}
                {vocabItems[expandedWord].example && (
                  <p className="text-[var(--text-muted)] font-['Inter'] italic" dir="ltr">
                    "{vocabItems[expandedWord].example}"
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Usage tracker */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalCount > 0 ? (usedCount / totalCount) * 100 : 0}%`,
                  background: usedCount >= Math.min(6, totalCount)
                    ? 'rgb(52,211,153)'
                    : 'linear-gradient(90deg, rgb(56,189,248), rgb(99,102,241))',
                }}
              />
            </div>
            <span className="text-[11px] font-bold font-['Tajawal'] shrink-0" style={{ color: usedCount >= Math.min(6, totalCount) ? 'rgb(52,211,153)' : 'var(--text-muted)' }}>
              استخدمت {usedCount} من {totalCount}
            </span>
          </div>
        </div>
      )}

      {/* Target Grammar */}
      {grammar && typeof grammar === 'object' && grammar.topic_name_en && (
        <div>
          <button
            onClick={() => setGrammarOpen(!grammarOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-violet-400" />
              <span className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">قاعدة نحوية مستهدفة</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform duration-200 ${grammarOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Inter'] bg-violet-500/10 text-violet-400" dir="ltr">
              {grammar.topic_name_en}
            </span>
            {grammar.topic_name_ar && grammar.topic_name_ar !== grammar.topic_name_en && (
              <span className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">
                {grammar.topic_name_ar}
              </span>
            )}
          </div>
          <AnimatePresence>
            {grammarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-lg p-3 text-xs space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {grammar.explanation_summary && (
                    <p className="text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed" dir="rtl">
                      {grammar.explanation_summary}
                    </p>
                  )}
                  {grammar.example_sentence && (
                    <p className="text-[var(--text-muted)] font-['Inter'] italic" dir="ltr">
                      {grammar.example_sentence}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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
