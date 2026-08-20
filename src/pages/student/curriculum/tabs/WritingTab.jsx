import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import AICoachPanel from '../../../../components/coach/AICoachPanel'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  FileEdit, Lightbulb, Save, Send, ChevronDown, CheckCircle2, BookOpen, Target,
  GraduationCap, Loader2, AlertCircle, Clock, Sparkles, PenLine, ScrollText, Scale,
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { useG, genderizeText } from '@/i18n/gender'
import { toast } from '../../../../components/ui/FluentiaToast'
import { safeCelebrate } from '../../../../lib/celebrations'
import { awardCurriculumXP } from '../../../../utils/curriculumXP'
import { useActivitySave } from '../../../../hooks/useActivitySave'
import SaveStatus from '../../../../components/ui/SaveStatus'
import { invokeWithRetry } from '../../../../lib/invokeWithRetry'
import XPBadgeInline from '../../../../components/xp/XPBadgeInline'
import WritingFeedback from '../../../../components/curriculum/WritingFeedback'
import ShareAchievementCard from '../../../../components/ShareAchievementCard'
import ActivityLeaderboard from '../../../../components/ActivityLeaderboard'
import { useActivityLeaderboard } from '../../../../hooks/useActivityLeaderboard'

/* ══════════════════════════════════════════════════════════════════════
   The Writing Studio.

   One brief, one sheet, one coach — instead of six stacked cards with the
   textarea buried under all of them. Everything that belongs to the ACT of
   writing (target words, starters, word meter, save state, actions) lives
   inside the sheet's own chrome, so the student never scrolls away from the
   page she is writing on.

   Palette: warm parchment on the cool navy base. Writing is the only
   section in the unit with a warm accent — that's its identity.
   ══════════════════════════════════════════════════════════════════════ */

const INK = {
  accent:      '#e8b07a',
  accentStrong:'#f5c99a',
  accentDim:   'rgba(232,176,122,0.14)',
  accentLine:  'rgba(232,176,122,0.30)',
  glow:        'rgba(232,176,122,0.18)',
  ok:          '#34d399',
  okDim:       'rgba(52,211,153,0.13)',
  okLine:      'rgba(52,211,153,0.32)',
  warn:        '#fbbf24',
  warnDim:     'rgba(251,191,36,0.11)',
  warnLine:    'rgba(251,191,36,0.28)',
  panel:       'rgba(255,255,255,0.028)',
  panelSolid:  '#0b1626',
  hair:        'rgba(255,255,255,0.07)',
  hairSoft:    'rgba(255,255,255,0.045)',
  dim:         '#7d8aa6',
  faint:       '#5f6b85',
}

const TASK_TYPE_AR = {
  paragraph: 'فقرة',
  essay: 'مقال',
  letter: 'رسالة',
  email: 'بريد إلكتروني',
  story: 'قصة',
  summary: 'ملخص',
  report: 'تقرير',
  review: 'مراجعة',
  argument: 'مقال حجاجي',
  analysis: 'تحليل',
  description: 'وصف',
  opinion: 'رأي',
}

// Rubric keys arrive from the generator in several shapes ("content",
// "Content and Task Completion", …). Match on the first meaningful word so a
// student never reads a raw English database key.
const RUBRIC_AR = [
  [/grammar|sentence|accuracy/i,       'القواعد وبناء الجملة'],
  [/vocab|lexical|language use/i,      'المفردات واللغة'],
  [/content|task/i,                    'المحتوى والالتزام بالمطلوب'],
  [/organi[sz]ation|coheren|structure/i,'التنظيم والترابط'],
  [/fluen/i,                           'الطلاقة'],
  [/spelling|punctuation|mechanic/i,   'الإملاء والترقيم'],
  [/creativ|idea/i,                    'الأفكار والإبداع'],
]

function rubricLabelAr(key) {
  const hit = RUBRIC_AR.find(([re]) => re.test(key))
  return hit ? hit[1] : key
}

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
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))

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
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: INK.accentDim, border: `1px solid ${INK.accentLine}` }}
        >
          <PenLine size={26} style={{ color: INK.accent }} />
        </div>
        <p className="text-sm font-['Tajawal']" style={{ color: INK.dim }}>لا توجد مهمة كتابة لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {tasks.map((task, idx) => (
        <WritingTask
          key={task.id}
          task={task}
          number={idx + 1}
          total={tasks.length}
          studentId={profile?.id}
          unitId={unitId}
          studentName={profile?.full_name || profile?.display_name}
          groupId={studentData?.group_id}
        />
      ))}
    </div>
  )
}

// ─── Writing Task ────────────────────────────────────
function WritingTask({ task, number, total, studentId, unitId, studentName, groupId }) {
  const {
    state: saveState, saveNow, adoptAttempt,
  } = useActivitySave({ studentId, unitId, sectionType: 'writing', activityId: task.id })
  const g = useG()
  const reduce = useReducedMotion()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [trainerFeedback, setTrainerFeedback] = useState(null)
  const { data: leaderboard } = useActivityLeaderboard('writing', unitId, studentId, groupId)
  const [trainerGrade, setTrainerGrade] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitShake, setSubmitShake] = useState(false)
  const [evalStatus, setEvalStatus] = useState(null) // pending|evaluating|completed|failed|escalated
  const [progressRowId, setProgressRowId] = useState(null)
  const [coachOpen, setCoachOpen] = useState(false)
  const timeRef = useRef(0)
  const timerRef = useRef(null)
  const dbSaveTimer = useRef(null)

  const wordCount = countWords(text)
  const inRange = wordCount >= task.word_count_min && wordCount <= task.word_count_max
  const underMin = wordCount > 0 && wordCount < task.word_count_min
  const overMax = wordCount > task.word_count_max
  const wordsNeeded = Math.max(0, task.word_count_min - wordCount)
  const progressPct = task.word_count_min > 0
    ? Math.min(100, Math.round((wordCount / task.word_count_min) * 100))
    : 0
  const meetsMin = wordCount >= task.word_count_min

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
        if (data.evaluation_status) setEvalStatus(data.evaluation_status)
        if (data.id) setProgressRowId(data.id)
        adoptAttempt(data)
      } else {
        // Fall back to localStorage
        setText(loadDraft(task.id))
      }
      setProgressLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [studentId, task.id])

  // Save to DB. One call — see hooks/useActivitySave.js.
  //
  // The specific hazard here is the inverse of the MCQ sections: not a lost
  // answer but an ERASED essay. A stale autosave carrying an empty or shorter
  // draft used to overwrite a finished one. `save_activity_attempt` refuses to
  // shrink a payload, so an empty draft can no longer replace real writing.
  const saveToDb = useCallback(async (currentText, isSubmit = false) => {
    const wc = countWords(currentText)
    const meets = wc >= task.word_count_min
    const now = new Date().toISOString()
    const isComplete = isSubmit && meets
    const newAttemptNumber = isComplete && submitted ? attemptNumber + 1 : attemptNumber

    const res = await saveNow(
      { draft: currentText, wordCount: wc, lastSavedAt: now },
      {
        submit: isComplete,
        attemptNumber: newAttemptNumber,
        timeSpent: timeRef.current,
        extra: isComplete
          ? { evaluation_status: 'pending', evaluation_attempts: 0, evaluation_last_error: null }
          : null,
      }
    )

    if (res?.ok) {
      setLastSavedAt(new Date(now))
      if (isComplete) setAttemptNumber(res.row.attempt_number)
      if (res.row?.id) setProgressRowId(res.row.id)
      return null
    }
    return res?.error || { message: 'save failed' }
  }, [task.id, task.word_count_min, attemptNumber, submitted, saveNow])

  // Auto-save to localStorage on change (debounced 500ms)
  useEffect(() => {
    if (progressLoading) return
    const t = setTimeout(() => saveDraft(task.id, text), 500)
    return () => clearTimeout(t)
  }, [text, task.id, progressLoading])

  // Auto-save to DB while typing
  useEffect(() => {
    if (progressLoading || submitted) return
    clearTimeout(dbSaveTimer.current)
    dbSaveTimer.current = setTimeout(() => {
      if (text.trim()) saveToDb(text)
    }, 1500)
    return () => clearTimeout(dbSaveTimer.current)
  }, [text, progressLoading, submitted, saveToDb])

  // Save to DB on unmount
  useEffect(() => {
    return () => {
      clearTimeout(dbSaveTimer.current)
    }
  }, [])

  // Ref guard: prevents double-applying feedback if channel fires more than once
  const feedbackApplied = useRef(false)

  // Realtime subscription — stable channel; aiFeedback excluded from deps intentionally
  // (feedbackApplied ref replaces the !aiFeedback closure check to avoid channel recreation)
  useEffect(() => {
    if (!studentId || !task.id) return
    feedbackApplied.current = false
    const channel = supabase
      .channel(`writing-eval-${task.id}-${studentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'student_curriculum_progress',
        filter: `writing_id=eq.${task.id}`,
      }, (payload) => {
        if (payload.new.student_id !== studentId) return
        if (payload.new.ai_feedback && payload.new.evaluation_status === 'completed' && !feedbackApplied.current) {
          feedbackApplied.current = true
          setAiFeedback(payload.new.ai_feedback)
          setEvalStatus('completed')
          toast({ type: 'success', title: 'وصل تصحيحك! ✨' })
        } else if (payload.new.evaluation_status === 'escalated') {
          setEvalStatus('escalated')
        } else if (payload.new.evaluation_status) {
          setEvalStatus(payload.new.evaluation_status)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [studentId, task.id])

  const handleSave = useCallback(async () => {
    saveDraft(task.id, text)
    await saveToDb(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast({ type: 'success', title: 'تم حفظ تقدمك ✅' })
  }, [task.id, text, saveToDb])

  // Shared function to fetch AI feedback with retry
  const fetchFeedback = useCallback(async (writingText) => {
    setEvalStatus('evaluating')
    try {
      const { data: result, error } = await invokeWithRetry(
        'ai-writing-feedback',
        {
          body: {
            writing_text: writingText,
            writing_prompt: task.prompt_en || '',
            assignment_type: task.task_type || 'paragraph',
            _writing_id: task.id,
          },
        },
        { timeoutMs: 60000, retries: 2 }
      )

      if (error) {
        console.error('[WritingTab] Feedback error:', error)
        // Don't panic — sweeper will handle it
        setEvalStatus('pending')
        return false
      }

      if (result?.feedback) {
        setAiFeedback(result.feedback)
        setEvalStatus('completed')
        // Save feedback to DB
        await supabase
          .from('student_curriculum_progress')
          .update({
            ai_feedback: result.feedback,
            score: result.feedback.fluency_score ? result.feedback.fluency_score * 10 : null,
            evaluation_status: 'completed',
            evaluation_completed_at: new Date().toISOString(),
          })
          .eq('student_id', studentId)
          .eq('writing_id', task.id)
        return true
      } else if (result?.limit_reached || result?.budget_reached) {
        toast({ type: 'info', title: result.error })
        setEvalStatus(null)
      }
      return false
    } catch (err) {
      console.error('[WritingTab] Feedback call failed:', err)
      setEvalStatus('pending')
      return false
    }
  }, [task.id, task.task_type, studentId])

  const handleSubmit = useCallback(async () => {
    if (submitting) return

    // Word count validation — give clear feedback, never fail silently
    const currentCount = countWords(text)
    if (currentCount === 0) {
      toast({
        type: 'warning',
        title: 'ما كتبت شي بعد',
        description: `ابدأ الكتابة — تحتاج ${task.word_count_min} كلمة على الأقل. المدرّب في الجانب جاهز يساعدك.`,
      })
      setSubmitShake(true)
      setTimeout(() => setSubmitShake(false), 600)
      return
    }
    if (currentCount < task.word_count_min) {
      const needed = task.word_count_min - currentCount
      toast({
        type: 'warning',
        title: `تحتاج ${needed} كلمة إضافية قبل التسليم`,
        description: `كتبت ${currentCount} كلمة — المطلوب ${task.word_count_min} كلمة على الأقل. المدرّب في الجانب يقدر يساعدك توسّع كتابتك.`,
      })
      setSubmitShake(true)
      setTimeout(() => setSubmitShake(false), 600)
      return
    }

    setSubmitting(true)
    saveDraft(task.id, text)

    try {
      // 1. Save writing to DB first (never block on AI)
      const saveError = await saveToDb(text, true)
      if (saveError) {
        toast({ type: 'error', title: g('فشل حفظ الكتابة — أعِد المحاولة', 'فشل حفظ الكتابة — أعيدي المحاولة') })
        return
      }

      setSubmitted(true)
      toast({ type: 'success', title: 'تم إرسال كتابتك — جاري التصحيح...' })
      try { safeCelebrate('writing_submitted') } catch {}
      awardCurriculumXP(studentId, 'writing', null, unitId)
      window.dispatchEvent(new CustomEvent('fluentia:activity:complete', { detail: { activityKey: 'writing' } }))
    } finally {
      // Release the submit button in all cases — DB save is done, AI is fire-and-forget
      setSubmitting(false)
    }

    // 2. Call AI feedback (with built-in retries) — button already released above
    const success = await fetchFeedback(text)
    if (!success) {
      toast({ type: 'info', title: 'جاري التصحيح في الخلفية — سيظهر تلقائياً خلال دقائق' })
    }
  }, [task.id, task.word_count_min, text, studentId, saveToDb, submitting, fetchFeedback, unitId])

  const taskTypeLabel = TASK_TYPE_AR[task.task_type] || task.task_type

  return (
    <section dir="rtl" className="relative">
      {/* Ambient warmth behind the studio — the writing surface never sits on flat black */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 h-[420px] -z-10"
        style={{
          background: `radial-gradient(60% 70% at 62% 0%, ${INK.glow} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          opacity: 0.7,
        }}
      />

      <div className={`space-y-4 lg:space-y-0 ${submitted ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-5 lg:items-start'}`}>
        {/* ── Main column ─────────────────────────────── */}
        <div className="space-y-4 min-w-0">

          <BriefCard
            task={task}
            number={number}
            total={total}
            taskTypeLabel={taskTypeLabel}
            reduce={reduce}
          />

          {progressLoading ? (
            <div className="h-[420px] rounded-3xl animate-pulse" style={{ background: INK.panel, border: `1px solid ${INK.hairSoft}` }} />
          ) : !submitted ? (
            <WritingSheet
              task={task}
              text={text}
              setText={setText}
              wordCount={wordCount}
              progressPct={progressPct}
              meetsMin={meetsMin}
              inRange={inRange}
              underMin={underMin}
              overMax={overMax}
              wordsNeeded={wordsNeeded}
              saveState={saveState}
              lastSavedAt={lastSavedAt}
              saved={saved}
              onSave={handleSave}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitShake={submitShake}
              onAskCoach={() => setCoachOpen(true)}
              reduce={reduce}
            />
          ) : (
            <SubmittedSheet
              text={text}
              wordCount={wordCount}
              attemptNumber={attemptNumber}
              onEdit={() => setSubmitted(false)}
              reduce={reduce}
            />
          )}

          {/* Trainer feedback */}
          {(trainerFeedback || trainerGrade) && (
            <Panel accent="rgba(56,189,248,0.5)">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={16} className="text-sky-400" />
                <span className="text-sm font-bold text-sky-300 font-['Tajawal']">ملاحظات المدرب</span>
                {trainerGrade && (
                  <span className="mr-auto px-3 py-0.5 rounded-full text-xs font-bold font-en bg-sky-500/15 text-sky-300 border border-sky-500/25">
                    {trainerGrade}
                  </span>
                )}
              </div>
              {trainerFeedback && (
                <p className="text-sm font-['Tajawal'] leading-[1.9]" style={{ color: 'var(--text-secondary)' }} dir="rtl">
                  {trainerFeedback}
                </p>
              )}
            </Panel>
          )}

          {/* Correction in flight */}
          {submitting && <EvalStrip tone="info" icon={Loader2} spin text="جاري التصحيح..." />}

          {/* Feedback display */}
          {aiFeedback && <WritingFeedback feedback={aiFeedback} />}

          {/* Status-aware evaluation messages */}
          {submitted && !aiFeedback && !submitting && evalStatus && evalStatus !== 'completed' && (
            evalStatus === 'escalated'
              ? <EvalStrip tone="warn" icon={GraduationCap} text="كتابتك مُرسلة للمعلم لمراجعتها شخصياً" />
              : <EvalStrip tone="info" icon={Clock} pulse text="جاري التصحيح في الخلفية — سيظهر هنا تلقائياً خلال دقائق" />
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

        {/* ── Coach rail ──────────────────────────────── */}
        {!submitted && studentId && task.id && (
          <AICoachPanel
            studentId={studentId}
            taskId={task.id}
            taskType="writing"
            draftText={text}
            fill
            hideMobileFab
            mobileOpen={coachOpen}
            onMobileOpenChange={setCoachOpen}
          />
        )}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════
   1 — THE BRIEF
   ══════════════════════════════════════════════════════ */
function BriefCard({ task, number, total, taskTypeLabel, reduce }) {
  const [openCell, setOpenCell] = useState(null) // 'grammar' | 'rubric' | null
  const grammar = task.grammar_to_use && typeof task.grammar_to_use === 'object' ? task.grammar_to_use : null
  const rubric = task.rubric && typeof task.rubric === 'object' ? task.rubric : null
  const rubricEntries = rubric ? Object.entries(rubric) : []

  const toggle = (cell) => setOpenCell((c) => (c === cell ? null : cell))

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(180deg, rgba(232,176,122,0.05) 0%, rgba(255,255,255,0.022) 34%, rgba(255,255,255,0.018) 100%)`,
        border: `1px solid ${INK.hair}`,
        boxShadow: '0 24px 60px -32px rgba(0,0,0,0.9)',
      }}
    >
      {/* top hairline of light */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${INK.accentLine} 32%, ${INK.accentLine} 68%, transparent)` }}
      />

      <div className="p-5 sm:p-7">
        {/* Kicker */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-bold font-['Tajawal']"
            style={{ background: INK.accentDim, color: INK.accentStrong, border: `1px solid ${INK.accentLine}` }}
          >
            <ScrollText size={11} />
            {taskTypeLabel}
          </span>
          {total > 1 && (
            <span className="text-[11px] font-['Tajawal'] tracking-wide" style={{ color: INK.faint }}>
              المهمة {number} من {total}
            </span>
          )}
          <span className="text-[11px] font-['Tajawal'] tracking-wide mr-auto" style={{ color: INK.faint }}>
            التعليمات
          </span>
        </div>

        <h3
          className="mt-2.5 text-[22px] sm:text-[26px] font-bold font-['Tajawal'] leading-tight"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          مهمة الكتابة
        </h3>

        {/* English brief — framed so the direction switch reads as intentional */}
        <div
          dir="ltr"
          className="mt-4 ps-4 sm:ps-5"
          style={{ borderInlineStart: `2px solid ${INK.accentLine}` }}
        >
          <p
            className="font-en text-[15.5px] sm:text-[17px] leading-[1.75] text-left"
            style={{ color: 'rgba(240,244,248,0.93)', maxWidth: '62ch', letterSpacing: '-0.003em' }}
          >
            {task.prompt_en}
          </p>
        </div>

        {/* Arabic reading of the same brief */}
        {task.prompt_ar && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${INK.hairSoft}` }}>
            <p className="text-[11px] font-['Tajawal'] mb-1.5" style={{ color: INK.faint }}>بالعربية</p>
            <p
              className="text-[14px] font-['Tajawal'] leading-[1.95]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {genderizeText(task.prompt_ar)}
            </p>
          </div>
        )}
      </div>

      {/* Meta strip — word target · grammar · rubric, one row, hairline-divided */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3"
        style={{ borderTop: `1px solid ${INK.hairSoft}`, background: 'rgba(0,0,0,0.18)' }}
      >
        <MetaCell
          icon={Target}
          label="عدد الكلمات"
          value={`${task.word_count_min} – ${task.word_count_max}`}
          en
        />
        {grammar?.topic_name_en ? (
          <MetaCell
            icon={BookOpen}
            label="القاعدة المستهدفة"
            value={grammar.topic_name_en}
            en
            onClick={() => toggle('grammar')}
            open={openCell === 'grammar'}
            className="border-r sm:border-r"
          />
        ) : <span className="hidden sm:block" />}
        {rubricEntries.length > 0 ? (
          <MetaCell
            icon={Scale}
            label="كيف تُقيَّم كتابتك"
            value={`${rubricEntries.length} معايير`}
            onClick={() => toggle('rubric')}
            open={openCell === 'rubric'}
            className="col-span-2 sm:col-span-1"
          />
        ) : <span className="hidden sm:block" />}
      </div>

      {/* Expanded detail for the meta strip */}
      <AnimatePresence initial={false}>
        {openCell === 'grammar' && grammar && (
          <Expand key="g">
            <div className="px-5 sm:px-7 py-4 space-y-2" style={{ background: 'rgba(0,0,0,0.28)' }}>
              {grammar.topic_name_ar && grammar.topic_name_ar !== grammar.topic_name_en && (
                <p className="text-[13px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                  {grammar.topic_name_ar}
                </p>
              )}
              {grammar.explanation_summary && (
                <p className="text-[13px] font-['Tajawal'] leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
                  {grammar.explanation_summary}
                </p>
              )}
              {grammar.example_sentence && (
                <p className="font-en text-[13.5px] italic pt-1" dir="ltr" style={{ color: INK.accentStrong }}>
                  “{grammar.example_sentence}”
                </p>
              )}
            </div>
          </Expand>
        )}
        {openCell === 'rubric' && rubricEntries.length > 0 && (
          <Expand key="r">
            <div className="px-5 sm:px-7 py-4 space-y-2.5" style={{ background: 'rgba(0,0,0,0.28)' }}>
              {rubricEntries.map(([k, weight]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-[12.5px] font-['Tajawal'] w-44 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {rubricLabelAr(k)}
                  </span>
                  <span className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${INK.accent}, ${INK.accentStrong})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Number(weight) || 0}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </span>
                  <span className="text-[11.5px] font-bold tabular-nums font-en w-9 text-left" style={{ color: INK.accentStrong }}>
                    {weight}%
                  </span>
                </div>
              ))}
            </div>
          </Expand>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function MetaCell({ icon: Icon, label, value, en, onClick, open, className = '' }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 text-right w-full transition-colors ${onClick ? 'hover:bg-white/[0.03]' : ''} ${className}`}
      style={{ borderInlineStart: `1px solid ${INK.hairSoft}` }}
    >
      <Icon size={14} style={{ color: INK.accent, flexShrink: 0 }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-['Tajawal']" style={{ color: INK.faint }}>{label}</span>
        <span
          className={`block text-[13px] font-bold leading-snug ${en ? 'font-en' : "font-['Tajawal']"}`}
          style={{
            color: 'var(--text-primary)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
          dir={en ? 'ltr' : 'rtl'}
        >
          {value}
        </span>
      </span>
      {onClick && (
        <ChevronDown
          size={13}
          style={{ color: INK.faint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .22s' }}
        />
      )}
    </Tag>
  )
}

function Expand({ children }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   2 — THE SHEET  (meter + word dock + paper + actions)
   ══════════════════════════════════════════════════════ */
function WritingSheet({
  task, text, setText, wordCount, progressPct, meetsMin, inRange, underMin, overMax,
  wordsNeeded, saveState, lastSavedAt, saved, onSave, onSubmit, submitting, submitShake,
  onAskCoach, reduce,
}) {
  const g = useG()
  const [hintsOpen, setHintsOpen] = useState(false)
  const [expandedWord, setExpandedWord] = useState(null)
  const [focused, setFocused] = useState(false)
  const areaRef = useRef(null)

  // Target words, de-duplicated (the generator sometimes emits the same word twice)
  const vocabItems = useMemo(() => {
    const seen = new Set()
    return (task.vocabulary_to_use || []).filter((v) => {
      const w = (typeof v === 'string' ? v : v?.word || '').trim().toLowerCase()
      if (!w || seen.has(w)) return false
      seen.add(w)
      return true
    })
  }, [task.vocabulary_to_use])

  const lowerText = (text || '').toLowerCase()
  const usedCount = vocabItems.filter((v) => {
    const w = typeof v === 'string' ? v : v.word
    return w && lowerText.includes(w.toLowerCase())
  }).length
  const vocabTarget = Math.min(6, vocabItems.length)
  const hints = task.hints || []

  // Auto-grow the paper with the writing. It re-measures on resize too — the same
  // text needs more lines on a phone than on a laptop, and a stale height clips
  // the last sentence.
  //
  // Measuring DURING a resize burst is what makes this fragile: mid-relayout the
  // textarea can report a near-zero width, every word wraps to its own line, and
  // scrollHeight comes back in the thousands. So the resize path is debounced
  // until the layout settles and a nonsense width is ignored outright.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    let t
    const fit = () => {
      if (!el.isConnected || el.clientWidth < 120) return
      const floor = window.matchMedia('(max-width: 640px)').matches ? 280 : 360
      el.style.height = floor + 'px'
      const next = Math.max(floor, el.scrollHeight)
      if (next !== floor) el.style.height = next + 'px'
    }
    fit()
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(fit, 180)
    }
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [text])

  const tone = overMax ? 'warn' : meetsMin ? 'ok' : underMin ? 'warn' : 'idle'
  const toneColor = tone === 'ok' ? INK.ok : tone === 'warn' ? INK.warn : INK.accent

  const status = wordCount === 0
    ? {
        title: g('ابدأ الكتابة', 'ابدئي الكتابة'),
        sub: g(`تحتاج ${task.word_count_min} كلمة على الأقل للتسليم`, `تحتاجين ${task.word_count_min} كلمة على الأقل للتسليم`),
      }
    : underMin
      ? {
          title: `ناقص ${wordsNeeded} كلمة`,
          sub: g(`كتبت ${wordCount} من ${task.word_count_min} — أكمل واستمر`, `كتبتِ ${wordCount} من ${task.word_count_min} — أكملي واستمري`),
        }
      : overMax
        ? {
            title: `تجاوزت الحد بـ ${wordCount - task.word_count_max} كلمة`,
            sub: g('قد تحتاج تختصر قليلاً قبل التسليم', 'قد تحتاجين تختصرين قليلاً قبل التسليم'),
          }
        : {
            title: g('جاهز للتسليم', 'جاهزة للتسليم'),
            sub: g(
              `${wordCount} كلمة — تقدر تسلّم الآن أو توسّع حتى ${task.word_count_max}`,
              `${wordCount} كلمة — تقدرين تسلّمين الآن أو توسّعين حتى ${task.word_count_max}`
            ),
          }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 18%, rgba(255,255,255,0.008) 100%), ${INK.panelSolid}`,
        border: `1px solid ${meetsMin ? INK.okLine : focused ? INK.accentLine : INK.hair}`,
        boxShadow: meetsMin
          ? `0 0 0 1px ${INK.okDim}, 0 30px 70px -40px rgba(0,0,0,0.95)`
          : focused
            ? `0 0 0 3px rgba(232,176,122,0.09), 0 30px 70px -40px rgba(0,0,0,0.95)`
            : '0 30px 70px -40px rgba(0,0,0,0.95)',
        transition: 'border-color .35s ease, box-shadow .35s ease',
      }}
    >
      {/* ── Sheet header: meter + status + save state ── */}
      <div
        className="flex items-center gap-3.5 px-4 sm:px-5 py-3.5"
        style={{ borderBottom: `1px solid ${INK.hairSoft}`, background: 'rgba(255,255,255,0.018)' }}
      >
        <WordRing count={wordCount} pct={progressPct} color={toneColor} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold font-['Tajawal'] leading-tight" style={{ color: tone === 'idle' ? 'var(--text-primary)' : toneColor }}>
            {status.title}
          </p>
          <p className="text-[11.5px] font-['Tajawal'] mt-0.5 leading-snug" style={{ color: INK.dim }}>
            {status.sub}
          </p>
        </div>
        <div className="hidden sm:flex items-center shrink-0">
          {saveState !== 'idle'
            ? <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
            : lastSavedAt && (
              <span className="text-[11px] font-['Tajawal']" style={{ color: INK.faint }}>
                آخر حفظ: <RelativeTime date={lastSavedAt} />
              </span>
            )}
        </div>
        <button
          onClick={onAskCoach}
          aria-label="افتح مدرّبك الشخصي"
          className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-bold font-['Tajawal'] shrink-0 transition-colors"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}
        >
          <Sparkles size={13} />
          مدرّبك
        </button>
      </div>

      {/* ── Word dock: the target vocabulary, always in sight ── */}
      {vocabItems.length > 0 && (
        <div className="px-4 sm:px-5 pt-3.5 pb-3" style={{ borderBottom: `1px solid ${INK.hairSoft}` }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Target size={12} style={{ color: INK.accent }} />
            <span className="text-[11.5px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
              كلمات مستهدفة
            </span>
            <span className="text-[11px] font-['Tajawal'] hidden sm:inline" style={{ color: INK.faint }}>
              {g(`استخدم ${vocabTarget} على الأقل`, `استخدمي ${vocabTarget} على الأقل`)}
            </span>
            <span className="mr-auto flex items-center gap-2">
              <span className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <span
                  className="block h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${vocabItems.length ? (usedCount / vocabItems.length) * 100 : 0}%`,
                    background: usedCount >= vocabTarget ? INK.ok : `linear-gradient(90deg, ${INK.accent}, ${INK.accentStrong})`,
                  }}
                />
              </span>
              <span
                className="text-[11px] font-bold tabular-nums font-en"
                style={{ color: usedCount >= vocabTarget ? INK.ok : INK.dim }}
              >
                {usedCount}/{vocabItems.length}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {vocabItems.map((v, i) => {
              const word = typeof v === 'string' ? v : v.word
              const rich = typeof v === 'object' && (v.definition_ar || v.definition_en || v.example)
              const isUsed = word && lowerText.includes(word.toLowerCase())
              const isOpen = expandedWord === i
              return (
                <button
                  key={i}
                  onClick={() => rich && setExpandedWord(isOpen ? null : i)}
                  className="group inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] font-medium font-en transition-all"
                  style={{
                    background: isUsed ? INK.okDim : 'rgba(255,255,255,0.045)',
                    border: `1px solid ${isUsed ? INK.okLine : 'rgba(255,255,255,0.07)'}`,
                    color: isUsed ? INK.ok : 'rgba(240,244,248,0.78)',
                    cursor: rich ? 'pointer' : 'default',
                  }}
                  dir="ltr"
                >
                  {isUsed && <CheckCircle2 size={11} strokeWidth={2.5} />}
                  {word}
                </button>
              )
            })}
          </div>

          <AnimatePresence initial={false}>
            {expandedWord !== null && vocabItems[expandedWord] && typeof vocabItems[expandedWord] === 'object' && (
              <Expand>
                <div
                  className="mt-2.5 rounded-xl px-3 py-2.5 space-y-1"
                  style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${INK.hairSoft}` }}
                >
                  {vocabItems[expandedWord].definition_ar && (
                    <p className="text-[12.5px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }} dir="rtl">
                      {vocabItems[expandedWord].definition_ar}
                    </p>
                  )}
                  {vocabItems[expandedWord].definition_en && (
                    <p className="text-[12px] font-en" style={{ color: INK.dim }} dir="ltr">
                      {vocabItems[expandedWord].definition_en}
                    </p>
                  )}
                  {vocabItems[expandedWord].example && (
                    <p className="text-[12px] font-en italic" style={{ color: INK.accentStrong }} dir="ltr">
                      “{vocabItems[expandedWord].example}”
                    </p>
                  )}
                </div>
              </Expand>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Starters ── */}
      {hints.length > 0 && (
        <div style={{ borderBottom: `1px solid ${INK.hairSoft}` }}>
          <button
            onClick={() => setHintsOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 sm:px-5 py-2.5 transition-colors hover:bg-white/[0.025]"
          >
            <Lightbulb size={12} style={{ color: INK.warn }} />
            <span className="text-[11.5px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
              أفكار للبداية
            </span>
            <span className="text-[11px] font-['Tajawal']" style={{ color: INK.faint }}>({hints.length})</span>
            <ChevronDown
              size={13}
              className="mr-auto"
              style={{ color: INK.faint, transform: hintsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .22s' }}
            />
          </button>
          <AnimatePresence initial={false}>
            {hintsOpen && (
              <Expand>
                <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-1.5">
                  {hints.map((hint, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-en"
                      style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.14)', color: 'rgba(240,244,248,0.8)' }}
                      dir="ltr"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </Expand>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── The paper ── */}
      <div className="relative">
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Start writing here…"
          dir="ltr"
          spellCheck={false}
          className="wt-paper w-full block resize-none outline-none font-en"
          style={{
            minHeight: 280,
            padding: '26px 26px 30px',
            lineHeight: '34px',
            fontSize: 16.5,
            color: 'rgba(240,244,248,0.95)',
            background: `
              repeating-linear-gradient(to bottom,
                transparent 0px, transparent 33px,
                rgba(255,255,255,0.052) 33px, rgba(255,255,255,0.052) 34px)
            `,
            backgroundAttachment: 'local',
            backgroundPosition: '0 26px',
            border: 'none',
            caretColor: INK.accentStrong,
          }}
        />
        {/* warm pool of light under the caret area */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: `linear-gradient(180deg, rgba(232,176,122,0.045), transparent)` }}
        />
      </div>

      {/* ── Actions ── */}
      <div
        className="px-4 sm:px-5 py-3.5"
        style={{ borderTop: `1px solid ${INK.hairSoft}`, background: 'rgba(255,255,255,0.018)' }}
      >
        <div className="sm:hidden mb-2.5">
          {saveState !== 'idle' && <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          <button
            onClick={onSave}
            className="inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 rounded-xl text-[12.5px] font-bold font-['Tajawal'] whitespace-nowrap transition-colors"
            style={{
              background: saved ? INK.okDim : 'rgba(255,255,255,0.045)',
              color: saved ? INK.ok : 'rgba(240,244,248,0.75)',
              border: `1px solid ${saved ? INK.okLine : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saved ? 'تم الحفظ' : 'حفظ مسودة'}
          </button>

          <motion.button
            animate={submitShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            whileHover={inRange ? { scale: 1.015 } : undefined}
            whileTap={{ scale: 0.985 }}
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 sm:px-5 rounded-xl text-[12.5px] sm:text-[13px] font-bold font-['Tajawal'] whitespace-nowrap disabled:cursor-not-allowed"
            style={inRange ? {
              background: `linear-gradient(135deg, ${INK.accentStrong}, ${INK.accent})`,
              color: '#231404',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: `0 10px 26px -10px ${INK.glow}, 0 0 0 1px ${INK.accentDim}`,
              '--ds-xp-gold-bg': 'rgba(35,20,4,0.12)',
              '--ds-xp-gold-border': 'rgba(35,20,4,0.30)',
              '--ds-xp-gold-fg': '#3a2205',
            } : {
              background: 'rgba(255,255,255,0.045)',
              color: 'rgba(240,244,248,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'جاري التصحيح...' : <><span>تسليم للتصحيح</span><XPBadgeInline amount={5} /></>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Word ring: the one number that matters, always visible ── */
function WordRing({ count, pct, color }) {
  const R = 18
  const C = 2 * Math.PI * R
  return (
    <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <motion.circle
          cx="22" cy="22" r={R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C - (C * Math.min(100, pct)) / 100 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums font-en"
        style={{ color }}
      >
        {count}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   3 — SUBMITTED
   ══════════════════════════════════════════════════════ */
function SubmittedSheet({ text, wordCount, attemptNumber, onEdit, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: INK.panelSolid, border: `1px solid ${INK.okLine}`, boxShadow: '0 30px 70px -40px rgba(0,0,0,0.95)' }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: `1px solid ${INK.hairSoft}`, background: INK.okDim }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.16)' }}>
          <CheckCircle2 size={18} style={{ color: INK.ok }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold font-['Tajawal']" style={{ color: INK.ok }}>تم تسليم كتابتك</p>
          <p className="text-[11.5px] font-['Tajawal']" style={{ color: INK.dim }}>
            {wordCount} كلمة{attemptNumber > 1 ? ` · المحاولة ${attemptNumber}` : ''}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-bold font-['Tajawal'] transition-colors hover:bg-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,244,248,0.8)' }}
        >
          <PenLine size={13} />
          تعديل وإعادة الإرسال
        </button>
      </div>

      <div
        className="font-en text-left"
        dir="ltr"
        style={{
          padding: '26px 26px 30px',
          lineHeight: '34px',
          fontSize: 16.5,
          color: 'rgba(240,244,248,0.9)',
          background: `repeating-linear-gradient(to bottom, transparent 0px, transparent 33px, rgba(255,255,255,0.045) 33px, rgba(255,255,255,0.045) 34px)`,
          backgroundPosition: '0 26px',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════
   Small shared pieces
   ══════════════════════════════════════════════════════ */
function Panel({ children, accent }) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.028)', border: `1px solid ${INK.hairSoft}` }}
    >
      {accent && <span aria-hidden className="absolute inset-y-0 right-0 w-[2px]" style={{ background: accent }} />}
      {children}
    </div>
  )
}

function EvalStrip({ tone, icon: Icon, text, spin, pulse }) {
  const c = tone === 'warn'
    ? { fg: INK.warn, bg: INK.warnDim, bd: INK.warnLine }
    : { fg: '#7dd3fc', bg: 'rgba(56,189,248,0.07)', bd: 'rgba(56,189,248,0.2)' }
  return (
    <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
      <Icon size={17} className={spin ? 'animate-spin' : pulse ? 'animate-pulse' : ''} style={{ color: c.fg, flexShrink: 0 }} />
      <span className="text-[13px] font-bold font-['Tajawal']" style={{ color: c.fg }}>{text}</span>
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

// ─── Skeleton ────────────────────────────────────────
function WritingSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
      <div className="space-y-4">
        <div className="h-56 rounded-3xl animate-pulse" style={{ background: INK.panel, border: `1px solid ${INK.hairSoft}` }} />
        <div className="h-[420px] rounded-3xl animate-pulse" style={{ background: INK.panel, border: `1px solid ${INK.hairSoft}` }} />
      </div>
      <div className="hidden lg:block h-[520px] rounded-3xl animate-pulse" style={{ background: INK.panel, border: `1px solid ${INK.hairSoft}` }} />
    </div>
  )
}
