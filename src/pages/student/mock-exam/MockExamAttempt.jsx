import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Clock, ChevronRight, ChevronLeft, Send, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { countWords } from '@/lib/mockExam'
import SubmitConfirmModal from './SubmitConfirmModal'

const SECTION_LABEL_AR = {
  reading: 'القراءة',
  vocabulary: 'المفردات',
  grammar: 'القواعد',
  spelling: 'الإملاء',
  writing: 'الكتابة',
}

/**
 * MockExamAttempt — the bulletproof exam page.
 *
 * Critical guarantees:
 *  - All hooks at the top of the component (above any conditional return)
 *  - Server-authoritative timer (expires_at from RPC)
 *  - Debounced autosave on every answer change (800ms)
 *  - Idempotent submit via mock_exam_submit RPC
 *  - Auto-submit when timer hits 0
 *  - On refresh: mock_exam_start RPC re-fetches existing attempt + saved_answers
 */
export default function MockExamAttempt() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  const [examData, setExamData] = useState(null)
  const [answers, setAnswers] = useState({}) // { qid: { selected_index, text_answer } }
  const [writingText, setWritingText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const submittedRef = useRef(false)

  // Resolve exam code from student level
  const examCode = useMemo(() => {
    if (!studentData) return null
    if (studentData.academic_level === 1) return 'midterm-mock-a1'
    if (studentData.academic_level === 3) return 'midterm-mock-b1'
    // Staff fallback (admin/trainer testing): pick A1 by default; the dropdown could be added later
    if (profile?.role === 'admin' || profile?.role === 'trainer') return 'midterm-mock-a1'
    return null
  }, [studentData, profile?.role])

  // -----------------------------------------------------------------
  // Load attempt once on mount
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!examCode || !profile?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('mock_exam_start', { p_exam_code: examCode })
        if (cancelled) return
        if (error) throw error
        setExamData(data)
        const initialAnswers = {}
        for (const sa of data.saved_answers || []) {
          initialAnswers[sa.question_id] = {
            selected_index: sa.selected_index,
            text_answer: sa.text_answer,
          }
        }
        setAnswers(initialAnswers)
        setWritingText(data.writing_response || '')
        const ms = new Date(data.expires_at).getTime() - new Date(data.server_now).getTime()
        setTimeLeft(Math.max(0, Math.floor(ms / 1000)))
      } catch (e) {
        if (cancelled) return
        const msg = e?.message || String(e)
        if (msg.includes('already_submitted')) {
          // Bounce to result page
          const { data: a } = await supabase
            .from('mock_exam_attempts')
            .select('id')
            .eq('student_id', profile.id)
            .eq('is_submitted', true)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (a?.id) navigate(`/student/mock-exam/result?attempt_id=${a.id}`, { replace: true })
          else navigate('/student/mock-exam', { replace: true })
        } else if (msg.includes('exam_not_open_yet') || msg.includes('exam_closed') ||
                   msg.includes('exam_in_preview_mode') || msg.includes('student_level_mismatch') ||
                   msg.includes('exam_not_found_or_inactive')) {
          navigate('/student/mock-exam', { replace: true })
        } else {
          setLoadError(msg)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [examCode, profile?.id, navigate])

  // -----------------------------------------------------------------
  // Tick the timer
  // -----------------------------------------------------------------
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      handleSubmit(true)
      return
    }
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, (t ?? 0) - 1))
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // -----------------------------------------------------------------
  // Resume-to-last-viewed-question on refresh.
  // localStorage is UX-only (answers stay DB-authoritative).
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!examData?.attempt_id || !examData?.questions?.length) return
    try {
      const saved = localStorage.getItem(`mock-exam-pos-${examData.attempt_id}`)
      if (saved !== null) {
        const idx = parseInt(saved, 10)
        if (Number.isFinite(idx) && idx >= 0 && idx < examData.questions.length) {
          setCurrentIndex(idx)
        }
      }
    } catch { /* private browsing or storage disabled — fall back to Q1 silently */ }
    // intentionally only restore once when examData arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData?.attempt_id])

  useEffect(() => {
    if (!examData?.attempt_id) return
    try {
      localStorage.setItem(`mock-exam-pos-${examData.attempt_id}`, String(currentIndex))
    } catch { /* noop */ }
  }, [currentIndex, examData?.attempt_id])

  // -----------------------------------------------------------------
  // Debounced answer save — manual implementation w/ refs to avoid deps churn
  // -----------------------------------------------------------------
  const saveTimers = useRef({}) // { qid: timeoutId }
  const writingTimer = useRef(null)
  const pendingWritingText = useRef('')

  // Note: supabase.rpc() returns a PostgrestBuilder (thenable, not a real Promise).
  // .catch() does NOT exist on it — wrap in try/catch and destructure { error } instead.
  const flushAllSaves = useCallback(async () => {
    const ids = Object.keys(saveTimers.current)
    for (const qid of ids) {
      const t = saveTimers.current[qid]
      if (t) {
        clearTimeout(t.timeout)
        const { selected_index, text_answer, attempt_id } = t.payload
        try {
          const { error } = await supabase.rpc('mock_exam_save_answer', {
            p_attempt_id: attempt_id,
            p_question_id: qid,
            p_selected_index: selected_index ?? null,
            p_text_answer: text_answer ?? null,
          })
          if (error) console.error('[mock-exam] flush save_answer error:', error.message)
        } catch (e) {
          console.error('[mock-exam] flush save_answer threw:', e)
        }
      }
      delete saveTimers.current[qid]
    }
    if (writingTimer.current) {
      clearTimeout(writingTimer.current)
      writingTimer.current = null
      if (examData?.attempt_id) {
        try {
          const { error } = await supabase.rpc('mock_exam_save_writing', {
            p_attempt_id: examData.attempt_id,
            p_writing_text: pendingWritingText.current,
          })
          if (error) console.error('[mock-exam] flush save_writing error:', error.message)
        } catch (e) {
          console.error('[mock-exam] flush save_writing threw:', e)
        }
      }
    }
  }, [examData?.attempt_id])

  function scheduleAnswerSave(qid, selected_index, text_answer) {
    if (!examData?.attempt_id) return
    if (saveTimers.current[qid]?.timeout) clearTimeout(saveTimers.current[qid].timeout)
    const attempt_id = examData.attempt_id
    saveTimers.current[qid] = {
      payload: { selected_index, text_answer, attempt_id },
      timeout: setTimeout(async () => {
        try {
          const { error } = await supabase.rpc('mock_exam_save_answer', {
            p_attempt_id: attempt_id,
            p_question_id: qid,
            p_selected_index: selected_index ?? null,
            p_text_answer: text_answer ?? null,
          })
          if (error) console.error('[mock-exam] save_answer error:', error.message)
        } catch (e) {
          console.error('[mock-exam] save_answer threw:', e)
        }
        delete saveTimers.current[qid]
      }, 800),
    }
  }

  function scheduleWritingSave(text) {
    if (!examData?.attempt_id) return
    pendingWritingText.current = text
    if (writingTimer.current) clearTimeout(writingTimer.current)
    const attempt_id = examData.attempt_id
    writingTimer.current = setTimeout(async () => {
      try {
        const { error } = await supabase.rpc('mock_exam_save_writing', {
          p_attempt_id: attempt_id,
          p_writing_text: text,
        })
        if (error) console.error('[mock-exam] save_writing error:', error.message)
      } catch (e) {
        console.error('[mock-exam] save_writing threw:', e)
      }
      writingTimer.current = null
    }, 1500)
  }

  function onSelectOption(qid, idx) {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: { ...(prev[qid] || {}), selected_index: idx } }
      scheduleAnswerSave(qid, idx, next[qid]?.text_answer ?? null)
      return next
    })
  }

  function onFillBlank(qid, text) {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: { ...(prev[qid] || {}), text_answer: text } }
      scheduleAnswerSave(qid, next[qid]?.selected_index ?? null, text)
      return next
    })
  }

  function onWritingChange(text) {
    setWritingText(text)
    scheduleWritingSave(text)
  }

  // -----------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current || submitting) return
    submittedRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      await flushAllSaves()
      const { data, error } = await supabase.rpc('mock_exam_submit', {
        p_attempt_id: examData.attempt_id,
        p_auto: auto,
      })
      if (error) throw error
      navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true })
    } catch (e) {
      console.error('submit failed', e)
      submittedRef.current = false
      setSubmitError(
        `فشل الإرسال: ${e?.message || 'تعذّر الاتصال'}. اضغطي مرة ثانية، أو تواصلي مع المدرب على WhatsApp +966558669974`
      )
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData?.attempt_id, flushAllSaves, navigate, submitting])

  // Flush any pending saves before unload (best effort — keeps DB fresh on accidental close)
  useEffect(() => {
    function beforeUnload() {
      // Use sendBeacon-like best-effort sync: synchronously trigger our debounce flushes
      try {
        flushAllSaves()
      } catch (e) {
        /* noop */
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [flushAllSaves])

  // -----------------------------------------------------------------
  // Conditional render comes AFTER all hooks
  // -----------------------------------------------------------------
  if (!examCode) {
    return (
      <ErrorPane title="مستواك غير مؤهل لهذا الاختبار">
        لا يوجد اختبار تجريبي مرتبط بمستواك حالياً.
      </ErrorPane>
    )
  }
  if (loadError) {
    return <ErrorPane title="تعذّر تحميل الاختبار">{loadError}</ErrorPane>
  }
  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>...جاري تحميل الاختبار</div>
      </div>
    )
  }

  const questions = examData.questions || []
  const totalQ = questions.length
  const q = questions[currentIndex]
  const sectionLabel = SECTION_LABEL_AR[q?.section] || q?.section
  const isWriting = q?.section === 'writing'
  const writingMin = examData.exam?.min_writing_words || 50
  const writingWordCount = countWords(writingText)
  const isLast = currentIndex === totalQ - 1

  // Number of answered questions for the chip strip
  const isAnswered = (qq) => {
    if (qq.question_type === 'writing_prompt') return writingWordCount >= writingMin
    const a = answers[qq.id]
    if (!a) return false
    if (qq.question_type === 'fill_blank') return !!(a.text_answer && a.text_answer.trim())
    return Number.isInteger(a.selected_index)
  }
  // Writing in-progress = words > 0 but under min. Distinct from "not started".
  const isWritingInProgress = (qq) =>
    qq.question_type === 'writing_prompt' && writingWordCount > 0 && writingWordCount < writingMin

  // Submit modal: detect issues and route the student
  const writingIdxInList = questions.findIndex((qq) => qq.question_type === 'writing_prompt')
  const unansweredList = questions
    .map((qq, idx) => ({ qq, idx }))
    .filter(({ qq }) => qq.question_type !== 'writing_prompt' && !isAnswered(qq))
  const computedIssues = []
  if (unansweredList.length > 0) {
    computedIssues.push({
      type: 'unanswered',
      severity: 'warn',
      title: `${unansweredList.length} سؤال بدون إجابة`,
      detail: 'الأسئلة غير المجاوَبة ستحتسب صفراً.',
      jumpToIndex: unansweredList[0].idx,
      jumpLabel: 'الذهاب إلى أول سؤال غير مجاوَب',
    })
  }
  if (writingIdxInList >= 0 && writingWordCount < writingMin) {
    computedIssues.push({
      type: 'writing_short',
      severity: writingWordCount === 0 ? 'critical' : 'warn',
      title: writingWordCount === 0
        ? 'لم تكتبي شيئاً في قسم الكتابة'
        : `نص الكتابة قصير: ${writingWordCount}/${writingMin} كلمة`,
      detail: writingWordCount === 0
        ? 'ستحصلين على ٠ من ١٠ في الكتابة لو سلّمتِ الآن.'
        : `الحد الأدنى ${writingMin} كلمة. ستحصلين على ٠ من ١٠ لو سلّمتِ الآن.`,
      jumpToIndex: writingIdxInList,
      jumpLabel: 'الذهاب إلى سؤال الكتابة',
    })
  }
  const answeredCount = questions.filter((qq) => isAnswered(qq)).length

  // Visual cues for timer
  const lowTime = timeLeft !== null && timeLeft <= 300
  const criticalTime = timeLeft !== null && timeLeft <= 60
  const mm = Math.floor((timeLeft ?? 0) / 60)
  const ss = (timeLeft ?? 0) % 60

  return (
    <div
      className="min-h-screen flex flex-col"
      dir="rtl"
      style={{ background: 'var(--ds-background, #0a0d14)' }}
    >
      {/* Sticky top bar — timer + section + question chips */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: 'rgba(10,13,20,0.92)',
          borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--ds-accent-info, #38bdf8)' }}
            >
              {sectionLabel}
            </span>
            <span className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
              السؤال {currentIndex + 1} من {totalQ}
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono tabular-nums text-sm"
            style={{
              background: criticalTime
                ? 'rgba(239,68,68,0.18)'
                : lowTime
                ? 'rgba(245,158,11,0.18)'
                : 'rgba(255,255,255,0.06)',
              color: criticalTime ? '#fca5a5' : lowTime ? '#fcd34d' : 'var(--ds-text-primary)',
              border: criticalTime
                ? '1px solid rgba(239,68,68,0.4)'
                : lowTime
                ? '1px solid rgba(245,158,11,0.4)'
                : '1px solid rgba(255,255,255,0.10)',
              transform: criticalTime ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 200ms ease-out',
            }}
          >
            <Clock size={14} />
            <span>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Question chip strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {questions.map((qq, i) => {
              const ans = isAnswered(qq)
              const inProgress = isWritingInProgress(qq)
              const isCurrent = i === currentIndex
              // Visual states: answered (green), in-progress writing (amber), current (gold ring), unanswered (neutral)
              let background = 'rgba(255,255,255,0.03)'
              let color = 'var(--ds-text-secondary)'
              let border = '1px solid rgba(255,255,255,0.10)'
              if (ans) {
                background = 'rgba(34,197,94,0.18)'
                color = '#86efac'
              } else if (inProgress) {
                background = 'rgba(245,158,11,0.14)'
                color = '#fcd34d'
                border = '1px dashed rgba(245,158,11,0.55)'
              }
              if (isCurrent) {
                border = '1px solid var(--ds-accent-primary, #e9b949)'
                if (!ans && !inProgress) {
                  background = 'rgba(233,185,73,0.14)'
                  color = 'var(--ds-accent-primary, #e9b949)'
                }
              }
              return (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className="text-xs rounded-md transition-colors"
                  style={{ minWidth: 32, height: 28, background, color, border }}
                  title={inProgress ? `الكتابة جارية (${writingWordCount}/${writingMin})` : undefined}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Question body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        <QuestionRenderer
          q={q}
          answer={answers[q?.id]}
          writingText={writingText}
          writingMin={writingMin}
          writingWordCount={writingWordCount}
          onSelectOption={onSelectOption}
          onFillBlank={onFillBlank}
          onWritingChange={onWritingChange}
        />
      </main>

      {/* Sticky bottom action bar — always visible, submit always clickable. */}
      <footer
        className="sticky bottom-0 z-30"
        style={{
          background: 'var(--ds-background, #0a0d14)',
          borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* LEFT: Previous */}
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0 || submitting}
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-30 order-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--ds-text-secondary)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <ChevronRight size={16} />
            السابق
          </button>

          {/* CENTER: progress indicator */}
          <div
            className="text-xs sm:text-sm flex items-center gap-3 order-3 sm:order-2 basis-full sm:basis-auto sm:flex-1 sm:justify-center"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            <span>
              <span className="tabular-nums font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                {answeredCount}
              </span>
              {' / '}
              <span className="tabular-nums">{totalQ}</span>
              {' مجاوَب'}
            </span>
            {writingMin > 0 && (
              <span style={{
                color: writingWordCount >= writingMin
                  ? '#86efac'
                  : (writingWordCount > 0 ? '#fcd34d' : 'var(--ds-text-tertiary)'),
              }}>
                · الكتابة: <span className="tabular-nums">{writingWordCount}</span>/{writingMin}
              </span>
            )}
          </div>

          {/* RIGHT: Next (only on non-final) + Submit always present */}
          <div className="flex items-center gap-2 order-2 sm:order-3">
            {!isLast && (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(totalQ - 1, i + 1))}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--ds-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            )}
            {/* CRITICAL: submit button is always rendered + always clickable.
                All gating happens inside SubmitConfirmModal. */}
            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
              style={{
                background: 'var(--ds-accent-success, #22c55e)',
                color: '#0a0d14',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? '...جاري الإرسال' : 'تسليم الاختبار'}
            </button>
          </div>
        </div>
        {submitError && (
          <div
            className="max-w-5xl mx-auto px-4 sm:px-6 pb-3 text-xs flex items-start gap-2"
            style={{ color: '#fca5a5' }}
          >
            <AlertTriangle size={14} className="mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}
      </footer>

      <SubmitConfirmModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={async () => { await handleSubmit(false) }}
        onJumpTo={(idx) => {
          if (Number.isFinite(idx)) setCurrentIndex(idx)
          setSubmitModalOpen(false)
        }}
        issues={computedIssues}
        submitting={submitting}
        submitError={submitError}
      />
    </div>
  )
}

function getInstructionAr(question) {
  const { question_type, section } = question
  if (question_type === 'mcq') {
    if (section === 'spelling')    return 'اختاري الإملاء الصحيح للكلمة'
    if (section === 'vocabulary')  return 'اختاري الإجابة الصحيحة'
    if (section === 'reading')     return 'اختاري الإجابة الصحيحة بناءً على القطعة'
    return 'اختاري الإجابة الصحيحة'
  }
  if (question_type === 'fill_blank') {
    if (section === 'spelling') return 'اكتبي الكلمة الصحيحة (انتبهي للإملاء)'
    return 'املئي الفراغ بالكلمة المناسبة'
  }
  if (question_type === 'error_detection') {
    return 'في الجملة التالية أربعة أجزاء مرقّمة. اختاري الجزء الذي يحتوي على خطأ.'
  }
  if (question_type === 'true_false') {
    if (section === 'reading') return 'اقرئي العبارة واختاري True أو False بناءً على القطعة'
    return 'اقرئي العبارة واختاري True أو False'
  }
  if (question_type === 'true_false_ng') {
    return 'بناءً على القطعة، اختاري True (صحيح) أو False (خاطئ) أو Not Given (غير مذكور)'
  }
  return null
}

function QuestionRenderer({ q, answer, writingText, writingMin, writingWordCount,
                            onSelectOption, onFillBlank, onWritingChange }) {
  if (!q) return null

  // Reading: show passage on top
  const hasPassage = q.section === 'reading' && q.passage_text
  const instructionAr = getInstructionAr(q)

  return (
    <div className="space-y-5">
      {hasPassage && (
        <div
          className="p-5 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          dir="ltr"
        >
          {q.passage_title && (
            <h3
              className="text-base font-bold mb-3"
              style={{ color: 'var(--ds-text-primary)', fontFamily: "'Playfair Display', serif" }}
            >
              {q.passage_title}
            </h3>
          )}
          <div
            className="text-[15px] leading-7 whitespace-pre-line"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            {q.passage_text}
          </div>
        </div>
      )}

      <div
        className="p-5 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {instructionAr && (
          <div
            className="text-sm mb-3"
            dir="rtl"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            {instructionAr}
          </div>
        )}
        <div
          className="text-base sm:text-lg leading-relaxed mb-4"
          dir={q.question_type === 'fill_blank' ? 'auto' : (/[؀-ۿ]/.test(q.stem) ? 'rtl' : 'ltr')}
          style={{ color: 'var(--ds-text-primary)', fontFamily: q.section === 'reading' || q.section === 'grammar' || q.section === 'vocabulary' || q.section === 'spelling' || q.section === 'writing' ? 'inherit' : undefined }}
        >
          {q.stem}
        </div>

        {q.question_type === 'mcq' || q.question_type === 'true_false' ||
         q.question_type === 'true_false_ng' || q.question_type === 'error_detection' ? (
          <div className="space-y-2">
            {(q.options || []).map((opt, i) => {
              const selected = answer?.selected_index === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectOption(q.id, i)}
                  className="w-full text-right px-4 py-3 rounded-lg transition-all flex items-center gap-3"
                  style={{
                    background: selected ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)',
                    border: selected ? '1px solid var(--ds-accent-info, #38bdf8)' : '1px solid rgba(255,255,255,0.08)',
                    color: selected ? 'var(--ds-accent-info, #38bdf8)' : 'var(--ds-text-primary)',
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center shrink-0 text-xs"
                    style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: selected ? 'var(--ds-accent-info, #38bdf8)' : 'rgba(255,255,255,0.08)',
                      color: selected ? '#0a0d14' : 'var(--ds-text-tertiary)',
                    }}
                  >
                    {q.question_type === 'error_detection'
                      ? String(i + 1)
                      : (['A','B','C','D'][i] || String(i + 1))}
                  </span>
                  <span className="text-sm" dir={/[؀-ۿ]/.test(opt) ? 'rtl' : 'ltr'}>{opt}</span>
                </button>
              )
            })}
          </div>
        ) : q.question_type === 'fill_blank' ? (
          <input
            type="text"
            value={answer?.text_answer || ''}
            onChange={(e) => onFillBlank(q.id, e.target.value)}
            placeholder="اكتبي إجابتك هنا"
            dir="auto"
            className="w-full px-4 py-3 rounded-lg outline-none text-base"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--ds-text-primary)',
            }}
          />
        ) : q.question_type === 'writing_prompt' ? (
          <div className="space-y-2">
            <textarea
              value={writingText}
              onChange={(e) => onWritingChange(e.target.value)}
              placeholder="Write your answer here in English…"
              rows={12}
              dir="ltr"
              className="w-full px-4 py-3 rounded-lg outline-none text-base resize-y leading-relaxed"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'var(--ds-text-primary)',
                minHeight: 240,
              }}
            />
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--ds-text-tertiary)' }}>
                الحد الأدنى: {writingMin} كلمة
              </span>
              <span
                style={{
                  color: writingWordCount >= writingMin
                    ? 'var(--ds-accent-success, #22c55e)'
                    : 'var(--ds-text-secondary)',
                }}
              >
                {writingWordCount} / {writingMin} {writingWordCount >= writingMin ? '✓' : ''}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ErrorPane({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <div
        className="max-w-md w-full p-6 rounded-2xl text-center space-y-3"
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.30)',
        }}
      >
        <AlertTriangle size={32} className="mx-auto" style={{ color: '#fca5a5' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>{title}</h2>
        <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{children}</p>
      </div>
    </div>
  )
}
