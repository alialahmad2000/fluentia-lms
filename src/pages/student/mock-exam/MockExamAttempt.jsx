import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Clock, ChevronRight, ChevronLeft, Send, AlertTriangle, RefreshCw, MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { countWords } from '@/lib/mockExam'
import { refreshAppSession } from '@/lib/refreshAppSession'
import SubmitConfirmModal from './SubmitConfirmModal'
import { useG, pickGender } from '@/i18n/gender'

const SECTION_LABEL_AR = {
  reading: 'القراءة',
  vocabulary: 'المفردات',
  grammar: 'القواعد',
  spelling: 'الإملاء',
  writing: 'الكتابة',
}

// Network ceilings for RPC calls. If the wire stalls beyond these, abort cleanly
// and surface a retryable error rather than hang silently. Background saves get
// a tighter budget than the final submit so silent data loss surfaces quickly.
const SUBMIT_TIMEOUT_MS = 25_000
const SUBMIT_TIMEOUT_TAG = 'submit_timeout_25s'
const SAVE_TIMEOUT_MS = 10_000
const SAVE_TIMEOUT_TAG = 'save_timeout_10s'
const WHATSAPP_INSTRUCTOR_URL = 'https://wa.me/966558669974'

/**
 * Race a thenable against a timeout. If the timeout fires, reject with a tagged Error.
 * The underlying RPC fetch will continue in the background — the server-side writes
 * remain idempotent thanks to the mock_exam_*_save_* RPCs' upsert design — but the
 * UI gets unstuck.
 */
function withTimeout(thenable, ms, tag) {
  let timer = null
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(tag)), ms)
  })
  return Promise.race([
    Promise.resolve(thenable).finally(() => { if (timer) clearTimeout(timer) }),
    timeout,
  ])
}

// Fire-and-forget telemetry — logs to mock_exam_audit_log via the new RPC.
// Never blocks UI; swallows all errors so a broken telemetry RPC can't break submit.
function logClientEvent(attemptId, event, details = {}) {
  if (!attemptId) return
  try {
    supabase.rpc('mock_exam_log_client_event', {
      p_attempt_id: attemptId,
      p_event: event,
      p_details: details,
    }).then(() => {}, (err) => {
      console.error('[mock-exam] telemetry failed (non-blocking):', event, err)
    })
  } catch (e) {
    console.error('[mock-exam] telemetry threw (non-blocking):', event, e)
  }
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
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  const [examData, setExamData] = useState(null)
  const [answers, setAnswers] = useState({}) // { qid: { selected_index, text_answer } }
  const [writingText, setWritingText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitErrorIsTimeout, setSubmitErrorIsTimeout] = useState(false)
  const [autoRetryUsed, setAutoRetryUsed] = useState(false)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  // Save heartbeat: surface silent autosave failures to the student. `lastSaveAt`
  // shows the timestamp of the most recent successful save_answer/save_writing
  // call. `saveFailures` is a monotonic counter that only goes up while there is
  // a pending error; it resets to 0 when a save succeeds. The chip stays red
  // until the next successful save lands.
  const [lastSaveAt, setLastSaveAt] = useState(null)
  const [saveFailures, setSaveFailures] = useState(0)
  // SAVE-CHAIN-FIX (2026-05-23): blocking modal after 3 consecutive save failures.
  // Defense-in-depth — if heartbeat + telemetry don't catch the silent-loss class,
  // the student is hard-stopped before they can "answer" more questions into a void.
  const [blockingNetworkModal, setBlockingNetworkModal] = useState(false)
  const consecutiveFailsRef = useRef(0)
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
  // SAVE-CHAIN-FIX (2026-05-23): startup save-health probe.
  //
  // After the attempt loads, immediately do a single round-trip that probes
  // the save chain end-to-end: SELECT … mock_exam_answers WHERE attempt_id=…
  // (idempotent, RLS-safe, takes <50ms on a healthy connection). If it
  // throws or times out at 5s, surface the blocking modal BEFORE the student
  // wastes 30 minutes "answering" into a black hole.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!examData?.attempt_id) return
    let cancelled = false
    ;(async () => {
      try {
        await withTimeout(
          supabase
            .from('mock_exam_answers')
            .select('attempt_id', { head: true, count: 'exact' })
            .eq('attempt_id', examData.attempt_id),
          5_000,
          'save_health_probe_timeout',
        )
        if (cancelled) return
        // Successful probe — mark health as fresh so the heartbeat shows green.
        setLastSaveAt(Date.now())
      } catch (e) {
        if (cancelled) return
        console.error('[mock-exam] startup save-health probe FAILED:', e)
        // Surface the blocking modal BEFORE any answers are clicked.
        consecutiveFailsRef.current = 3
        setSaveFailures((n) => n + 1)
        setBlockingNetworkModal(true)
        logClientEvent(examData.attempt_id, 'save_failed', {
          rpc: 'startup_health_probe',
          error: String(e?.message || e),
          ts: new Date().toISOString(),
        })
      }
    })()
    return () => { cancelled = true }
  }, [examData?.attempt_id])

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
  //
  // Save resilience contract (incident fix round 2):
  //   - Every save is wrapped in withTimeout(10s). Beyond that the wire is treated as hung.
  //   - On any save failure we log `save_failed` to the audit log so admins can see
  //     silent failures in real time (StuckAttemptsPanel surfaces them).
  //   - The save-heartbeat state (lastSaveAt / saveFailures) drives a visible chip
  //     in the header so the student can see whether their work is reaching the DB.
  //   - RPCs are idempotent (save_answer uses ON CONFLICT upsert; save_writing
  //     overwrites in place), so a retry — manual or via the next debounce — is safe.
  const recordSaveSuccess = useCallback(() => {
    setLastSaveAt(Date.now())
    setSaveFailures(0)
    consecutiveFailsRef.current = 0
  }, [])

  const recordSaveFailure = useCallback((rpc, qid, err) => {
    setSaveFailures((n) => n + 1)
    consecutiveFailsRef.current = consecutiveFailsRef.current + 1
    const msg = String(err?.message || err || 'unknown')
    console.error(`[mock-exam] ${rpc} failed:`, msg, 'consecutive_fails=', consecutiveFailsRef.current)
    if (examData?.attempt_id) {
      logClientEvent(examData.attempt_id, 'save_failed', {
        rpc, question_id: qid || null, error: msg, ts: new Date().toISOString(),
        consecutive_fails: consecutiveFailsRef.current,
      })
    }
    // SAVE-CHAIN-FIX: hard-stop after 3 consecutive failures so the student
    // can't keep "answering" into a black hole.
    if (consecutiveFailsRef.current >= 3) {
      setBlockingNetworkModal(true)
    }
  }, [examData?.attempt_id])

  async function runSaveAnswer(attempt_id, qid, selected_index, text_answer) {
    try {
      const promise = supabase.rpc('mock_exam_save_answer', {
        p_attempt_id: attempt_id,
        p_question_id: qid,
        p_selected_index: selected_index ?? null,
        p_text_answer: text_answer ?? null,
      })
      const { error } = await withTimeout(promise, SAVE_TIMEOUT_MS, SAVE_TIMEOUT_TAG)
      if (error) { recordSaveFailure('save_answer', qid, error); return false }
      recordSaveSuccess()
      return true
    } catch (e) {
      recordSaveFailure('save_answer', qid, e)
      return false
    }
  }

  async function runSaveWriting(attempt_id, text) {
    try {
      const promise = supabase.rpc('mock_exam_save_writing', {
        p_attempt_id: attempt_id,
        p_writing_text: text,
      })
      const { error } = await withTimeout(promise, SAVE_TIMEOUT_MS, SAVE_TIMEOUT_TAG)
      if (error) { recordSaveFailure('save_writing', null, error); return false }
      recordSaveSuccess()
      return true
    } catch (e) {
      recordSaveFailure('save_writing', null, e)
      return false
    }
  }

  const flushAllSaves = useCallback(async () => {
    if (examData?.attempt_id) logClientEvent(examData.attempt_id, 'flush_started', {})
    const ids = Object.keys(saveTimers.current)
    for (const qid of ids) {
      const t = saveTimers.current[qid]
      if (t) {
        clearTimeout(t.timeout)
        const { selected_index, text_answer, attempt_id } = t.payload
        await runSaveAnswer(attempt_id, qid, selected_index, text_answer)
      }
      delete saveTimers.current[qid]
    }
    if (writingTimer.current) {
      clearTimeout(writingTimer.current)
      writingTimer.current = null
      if (examData?.attempt_id) {
        await runSaveWriting(examData.attempt_id, pendingWritingText.current)
      }
    }
    if (examData?.attempt_id) logClientEvent(examData.attempt_id, 'flush_complete', {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData?.attempt_id])

  function scheduleAnswerSave(qid, selected_index, text_answer) {
    if (!examData?.attempt_id) return
    if (saveTimers.current[qid]?.timeout) clearTimeout(saveTimers.current[qid].timeout)
    const attempt_id = examData.attempt_id
    saveTimers.current[qid] = {
      payload: { selected_index, text_answer, attempt_id },
      timeout: setTimeout(async () => {
        await runSaveAnswer(attempt_id, qid, selected_index, text_answer)
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
      await runSaveWriting(attempt_id, text)
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
  // Submit (with 25s network timeout + auto-retry once after a stall).
  //
  // Resilience contract:
  //   1. `flushAllSaves()` itself is best-effort and bounded by individual save
  //      timeouts inside the per-save calls (still console-logged on failure).
  //   2. `mock_exam_submit` RPC is wrapped in a 25s timeout. The submit RPC is
  //      idempotent on the server, so a retry after a stall is safe — the
  //      DB-side submit is a no-op when already submitted.
  //   3. On timeout the user-facing error is gentle ("تأخّر الإرسال أكثر من
  //      المعتاد") and we expose a manual retry + WhatsApp escape hatch. A
  //      single silent auto-retry fires 2s later (see useEffect below) so the
  //      common-case "flaky network" recovers without user action.
  //   4. The grade-writing edge function call is wrapped in an unawaited IIFE
  //      so it can never block navigation. Always was — preserved here.
  // -----------------------------------------------------------------
  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current || submitting) return
    submittedRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    setSubmitErrorIsTimeout(false)

    // DevTools timing for the next student who hits this. Cheap, removes itself on tab close.
    // Group label encodes the attempt_id so multiple tabs / reloads can be distinguished.
    const tLabel = `mock-exam-submit:${examData?.attempt_id?.slice(0, 8) || 'unknown'}`
    console.time(tLabel)
    console.time(`${tLabel}:flush`)

    // Server-side audit: emit `submit_kickoff`. If this is the LAST audit row before
    // a missing `submit` row, we know the client hung between kickoff and the RPC reply.
    const kickoffAt = Date.now()
    logClientEvent(examData?.attempt_id, 'submit_kickoff', {
      auto, ts: new Date(kickoffAt).toISOString(),
    })

    try {
      await flushAllSaves()
      console.timeEnd(`${tLabel}:flush`)

      // SAVE-CHAIN-FIX (2026-05-23): pre-submit reconciliation.
      // Compare local React state vs server-side mock_exam_answers. If the
      // server is missing anything we have locally (silent save loss during
      // the exam), re-save every locally-known answer before the final submit.
      // The save_answer RPC is idempotent (ON CONFLICT upsert) so re-saving
      // already-present rows is harmless. This is the LOSSLESS guarantee at
      // the right layer — even if the heartbeat + telemetry didn't catch
      // silent drops earlier, the submit moment reconciles client and server.
      console.time(`${tLabel}:reconcile`)
      try {
        const { data: serverRows, error: reconErr } = await withTimeout(
          supabase
            .from('mock_exam_answers')
            .select('question_id, selected_index, text_answer')
            .eq('attempt_id', examData.attempt_id),
          SAVE_TIMEOUT_MS,
          SAVE_TIMEOUT_TAG,
        )
        if (reconErr) throw reconErr
        const serverByQid = {}
        for (const r of serverRows || []) serverByQid[r.question_id] = r

        const localPairs = Object.entries(answers || {}).filter(([, v]) => {
          if (!v) return false
          const hasIdx = Number.isInteger(v.selected_index)
          const hasText = v.text_answer != null && String(v.text_answer).trim().length > 0
          return hasIdx || hasText
        })

        const missing = []
        for (const [qid, v] of localPairs) {
          const s = serverByQid[qid]
          const sameIdx = (s?.selected_index ?? null) === (v.selected_index ?? null)
          const sameText = (s?.text_answer ?? null) === (v.text_answer ?? null)
          if (!s || !sameIdx || !sameText) missing.push({ qid, v })
        }

        if (missing.length > 0) {
          logClientEvent(examData.attempt_id, 'save_failed', {
            rpc: 'pre_submit_reconcile',
            error: 'local_ahead_of_server',
            local_count: localPairs.length,
            server_count: Object.keys(serverByQid).length,
            missing_count: missing.length,
          })
          // Re-save serially so order is deterministic; bounded to <=35 calls × <=10s each
          for (const { qid, v } of missing) {
            await runSaveAnswer(examData.attempt_id, qid, v.selected_index, v.text_answer)
          }
        }
      } catch (reconErr) {
        // Reconciliation is best-effort. If it itself fails (network/timeout),
        // continue with submit — the cron auto-submit will still close the attempt
        // and we don't want to block submit on a defense-in-depth probe.
        console.error('[mock-exam] pre-submit reconciliation failed (non-blocking):', reconErr)
      }
      console.timeEnd(`${tLabel}:reconcile`)
      console.time(`${tLabel}:rpc`)

      const submitPromise = supabase.rpc('mock_exam_submit', {
        p_attempt_id: examData.attempt_id,
        p_auto: auto,
      })

      const result = await withTimeout(submitPromise, SUBMIT_TIMEOUT_MS, SUBMIT_TIMEOUT_TAG)
      console.timeEnd(`${tLabel}:rpc`)
      const { error } = result || {}
      if (error) throw error

      logClientEvent(examData.attempt_id, 'submit_complete', {
        duration_ms: Date.now() - kickoffAt,
        ts: new Date().toISOString(),
      })

      // Fire-and-forget: trigger AI writing grading in the background.
      // Student must NOT wait for this. If it fails (network, edge fn down,
      // tab closed), the trainer can re-trigger from the dashboard.
      ;(async () => {
        try {
          const { error: invokeErr } = await supabase.functions.invoke(
            'mock-exam-grade-writing',
            { body: { attempt_id: examData.attempt_id } }
          )
          if (invokeErr) console.error('[mock-exam] grade-writing kickoff failed (non-blocking):', invokeErr)
        } catch (e) {
          console.error('[mock-exam] grade-writing kickoff threw (non-blocking):', e)
        }
      })()

      console.timeEnd(tLabel)
      navigate(`/student/mock-exam/result?attempt_id=${examData.attempt_id}`, { replace: true })
    } catch (e) {
      console.error('submit failed', e)
      try { console.timeEnd(tLabel) } catch { /* timer may have already ended */ }
      submittedRef.current = false
      const msg = String(e?.message || e || 'تعذّر الاتصال')
      const isTimeout = msg === SUBMIT_TIMEOUT_TAG
      setSubmitErrorIsTimeout(isTimeout)
      logClientEvent(examData?.attempt_id, 'submit_failed', {
        error: msg, is_timeout: isTimeout, duration_ms: Date.now() - kickoffAt,
      })
      setSubmitError(
        isTimeout
          ? g(
              'تأخّر الإرسال أكثر من المعتاد. إجاباتك محفوظة في النظام — اضغط «إعادة المحاولة» أو تواصل مع المدرب.',
              'تأخّر الإرسال أكثر من المعتاد. إجاباتك محفوظة في النظام — اضغطي «إعادة المحاولة» أو تواصلي مع المدرب.'
            )
          : `فشل الإرسال: ${msg}. ${g('إجاباتك محفوظة — اضغط مرة ثانية. لو تكرّرت المشكلة، تواصل مع المدرب.', 'إجاباتك محفوظة — اضغطي مرة ثانية. لو تكرّرت المشكلة، تواصلي مع المدرب.')}`
      )
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData?.attempt_id, flushAllSaves, navigate, submitting])

  // Auto-retry once after a stuck-submit timeout. Resets when the modal closes
  // or a fresh user-driven submit attempt begins.
  useEffect(() => {
    if (!submitErrorIsTimeout) return
    if (autoRetryUsed) return
    if (submitting) return
    setAutoRetryUsed(true)
    const t = setTimeout(() => {
      // Reuse the user-driven submit path; idempotent on the server.
      handleSubmit(false)
    }, 2000)
    return () => clearTimeout(t)
  }, [submitErrorIsTimeout, autoRetryUsed, submitting, handleSubmit])

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
        ? g('لم تكتب شيئاً في قسم الكتابة', 'لم تكتبي شيئاً في قسم الكتابة')
        : `نص الكتابة قصير: ${writingWordCount}/${writingMin} كلمة`,
      detail: writingWordCount === 0
        ? g('ستحصل على ٠ من ١٠ في الكتابة لو سلّمت الآن.', 'ستحصلين على ٠ من ١٠ في الكتابة لو سلّمتِ الآن.')
        : `الحد الأدنى ${writingMin} كلمة. ${g('ستحصل على ٠ من ١٠ لو سلّمت الآن.', 'ستحصلين على ٠ من ١٠ لو سلّمتِ الآن.')}`,
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
          <div className="flex items-center gap-2">
            <SaveHeartbeat lastSaveAt={lastSaveAt} saveFailures={saveFailures} />
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
            className="max-w-5xl mx-auto px-4 sm:px-6 pb-3 text-xs flex flex-col sm:flex-row sm:items-start gap-2"
            style={{ color: '#fca5a5' }}
          >
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
            <a
              href={WHATSAPP_INSTRUCTOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-md self-start whitespace-nowrap"
              style={{
                background: 'rgba(34,197,94,0.12)',
                color: '#86efac',
                border: '1px solid rgba(34,197,94,0.35)',
              }}
            >
              تواصل مع المدرب
            </a>
          </div>
        )}
      </footer>

      <SubmitConfirmModal
        open={submitModalOpen}
        onClose={() => {
          setSubmitModalOpen(false)
          // Reset retry budget for the next manual open
          setAutoRetryUsed(false)
          if (!submitting) {
            setSubmitError(null)
            setSubmitErrorIsTimeout(false)
          }
        }}
        onConfirm={async () => {
          // Fresh manual submit → reset auto-retry budget
          setAutoRetryUsed(false)
          await handleSubmit(false)
        }}
        onJumpTo={(idx) => {
          if (Number.isFinite(idx)) setCurrentIndex(idx)
          setSubmitModalOpen(false)
        }}
        issues={computedIssues}
        submitting={submitting}
        submitError={submitError}
        whatsappInstructorUrl={WHATSAPP_INSTRUCTOR_URL}
      />

      <BlockingNetworkModal
        open={blockingNetworkModal}
        attemptId={examData?.attempt_id}
        whatsappUrl={WHATSAPP_INSTRUCTOR_URL}
        onRetry={async () => {
          // Re-run the probe. If it passes, dismiss; otherwise leave the modal up.
          try {
            await withTimeout(
              supabase
                .from('mock_exam_answers')
                .select('attempt_id', { head: true, count: 'exact' })
                .eq('attempt_id', examData?.attempt_id),
              5_000,
              'save_health_retry_timeout',
            )
            // Probe succeeded → reset state, dismiss modal
            consecutiveFailsRef.current = 0
            setSaveFailures(0)
            setLastSaveAt(Date.now())
            setBlockingNetworkModal(false)
            if (examData?.attempt_id) {
              logClientEvent(examData.attempt_id, 'retry_attempt', {
                source: 'blocking_modal_retry',
                outcome: 'success',
                ts: new Date().toISOString(),
              })
            }
          } catch (e) {
            // Still failing — keep blocked. Log the retry attempt.
            if (examData?.attempt_id) {
              logClientEvent(examData.attempt_id, 'retry_attempt', {
                source: 'blocking_modal_retry',
                outcome: 'still_failing',
                error: String(e?.message || e),
              })
            }
          }
        }}
      />
    </div>
  )
}

/**
 * BlockingNetworkModal — hard stop when the save chain has been broken for
 * 3+ consecutive attempts (or when the startup probe fails). Prevents the
 * "phantom answering" failure mode where students keep clicking through
 * questions whose state is only in local React, never reaching the DB.
 */
function BlockingNetworkModal({ open, attemptId, whatsappUrl, onRetry }) {
  const g = useG()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)' }}
      dir="rtl"
    >
      <div
        className="max-w-md w-full p-6 rounded-2xl space-y-4"
        style={{
          background: 'var(--ds-bg-elevated, #11131c)',
          border: '2px solid rgba(239,68,68,0.40)',
          boxShadow: '0 12px 40px rgba(239,68,68,0.18)',
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={22} style={{ color: '#fca5a5' }} />
          <h2 className="text-lg font-bold" style={{ color: '#fca5a5' }}>
            ⚠ مشكلة في الاتصال
          </h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
          إجاباتك الأخيرة <strong>لم تصل إلى النظام</strong>. {g('لا تتابع الاختبار حتى يُستعاد الاتصال، وإلّا سيتم فقد إجاباتك.', 'لا تتابعي الاختبار حتى يُستعاد الاتصال، وإلّا سيتم فقد إجاباتك.')}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
          {g('تأكد من اتصال الإنترنت (واي فاي قوي إن أمكن)، ثم اضغط «إعادة المحاولة». إذا استمرّت المشكلة، تواصل معي على واتساب فوراً حتى أحتفظ لك بفرصتك.', 'تأكدي من اتصال الإنترنت (واي فاي قوي إن أمكن)، ثم اضغطي «إعادة المحاولة». إذا استمرّت المشكلة، تواصلي معي على واتساب فوراً حتى أحتفظ لكِ بفرصتك.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            style={{
              background: 'var(--ds-accent-success, #22c55e)',
              color: '#0a0d14',
            }}
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
            style={{
              background: 'rgba(56,189,248,0.16)',
              color: 'var(--ds-accent-info, #38bdf8)',
              border: '1px solid rgba(56,189,248,0.40)',
            }}
          >
            <MessageCircle size={14} />
            تواصل مع المدرب على واتساب
          </a>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ds-text-tertiary)' }}>
          {g('إذا تكرّر التحذير، اضغط هذا الزرّ لمسح البيانات المؤقتة وإعادة الدخول.', 'إذا تكرّر التحذير، اضغطي هذا الزرّ لمسح البيانات المؤقتة وإعادة الدخول.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const confirmed = window.confirm(
                g(
                  'سيتم تجديد جلستك كاملاً (تسجيل خروج + مسح البيانات المؤقتة). إجاباتك المحفوظة في النظام آمنة، لكن أي إجابة لم تصل للنظام بعد ستفقد. هل تريد المتابعة؟',
                  'سيتم تجديد جلستكِ كاملاً (تسجيل خروج + مسح البيانات المؤقتة). إجاباتكِ المحفوظة في النظام آمنة، لكن أي إجابة لم تصل للنظام بعد ستفقد. هل تريدين المتابعة؟'
                )
              )
              if (!confirmed) return
              await refreshAppSession({ redirectTo: '/login' })
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
            style={{
              background: 'rgba(251,191,36,0.16)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.40)',
            }}
          >
            <RefreshCw size={14} />
            🔄 تجديد الجلسة (إصلاح المشكلة)
          </button>
        </div>
        {attemptId && (
          <p className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>
            رقم المحاولة: <span className="font-mono">{attemptId.slice(0, 8)}…</span>
          </p>
        )}
      </div>
    </div>
  )
}

function getInstructionAr(question) {
  const { question_type, section } = question
  if (question_type === 'mcq') {
    if (section === 'spelling')    return pickGender('اختر الإملاء الصحيح للكلمة', 'اختاري الإملاء الصحيح للكلمة')
    if (section === 'vocabulary')  return pickGender('اختر الإجابة الصحيحة', 'اختاري الإجابة الصحيحة')
    if (section === 'reading')     return pickGender('اختر الإجابة الصحيحة بناءً على القطعة', 'اختاري الإجابة الصحيحة بناءً على القطعة')
    return pickGender('اختر الإجابة الصحيحة', 'اختاري الإجابة الصحيحة')
  }
  if (question_type === 'fill_blank') {
    if (section === 'spelling') return pickGender('اكتب الكلمة الصحيحة (انتبه للإملاء)', 'اكتبي الكلمة الصحيحة (انتبهي للإملاء)')
    return pickGender('املأ الفراغ بالكلمة المناسبة', 'املئي الفراغ بالكلمة المناسبة')
  }
  if (question_type === 'error_detection') {
    return pickGender('في الجملة التالية أربعة أجزاء مرقّمة. اختر الجزء الذي يحتوي على خطأ.', 'في الجملة التالية أربعة أجزاء مرقّمة. اختاري الجزء الذي يحتوي على خطأ.')
  }
  if (question_type === 'true_false') {
    if (section === 'reading') return pickGender('اقرأ العبارة واختر True أو False بناءً على القطعة', 'اقرئي العبارة واختاري True أو False بناءً على القطعة')
    return pickGender('اقرأ العبارة واختر True أو False', 'اقرئي العبارة واختاري True أو False')
  }
  if (question_type === 'true_false_ng') {
    return pickGender('بناءً على القطعة، اختر True (صحيح) أو False (خاطئ) أو Not Given (غير مذكور)', 'بناءً على القطعة، اختاري True (صحيح) أو False (خاطئ) أو Not Given (غير مذكور)')
  }
  return null
}

function QuestionRenderer({ q, answer, writingText, writingMin, writingWordCount,
                            onSelectOption, onFillBlank, onWritingChange }) {
  const g = useG()
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
            placeholder={g('اكتب إجابتك هنا', 'اكتبي إجابتك هنا')}
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

/**
 * SaveHeartbeat — small chip surfacing autosave health.
 *  - Green check + "تم الحفظ" when last save succeeded within the last 5s
 *  - Neutral "تم الحفظ قبل Ns" up to 60s
 *  - Amber dot + "تحقّقي من الاتصال" when failures > 0
 *  - Hidden entirely before the first save attempt
 */
function SaveHeartbeat({ lastSaveAt, saveFailures }) {
  const g = useG()
  // Re-render every 5s so the relative timestamp stays accurate.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!lastSaveAt && !saveFailures) return
    const id = setInterval(() => setTick((t) => t + 1), 5_000)
    return () => clearInterval(id)
  }, [lastSaveAt, saveFailures])

  if (!lastSaveAt && saveFailures === 0) return null

  const hasFailure = saveFailures > 0
  const secsAgo = lastSaveAt ? Math.floor((Date.now() - lastSaveAt) / 1000) : null
  const recent = secsAgo !== null && secsAgo <= 5

  let bg, color, border, label
  if (hasFailure) {
    bg = 'rgba(245,158,11,0.16)'
    color = '#fcd34d'
    border = '1px solid rgba(245,158,11,0.4)'
    label = `${g('تحقّق من الاتصال', 'تحقّقي من الاتصال')} (${saveFailures})`
  } else if (recent) {
    bg = 'rgba(34,197,94,0.16)'
    color = '#86efac'
    border = '1px solid rgba(34,197,94,0.35)'
    label = 'تم الحفظ ✓'
  } else {
    bg = 'rgba(255,255,255,0.05)'
    color = 'var(--ds-text-tertiary)'
    border = '1px solid rgba(255,255,255,0.10)'
    label = secsAgo !== null
      ? (secsAgo < 60 ? `تم الحفظ قبل ${secsAgo} ث` : `تم الحفظ قبل ${Math.floor(secsAgo / 60)} د`)
      : 'في الانتظار…'
  }

  return (
    <span
      className="text-[11px] px-2 py-1 rounded-full whitespace-nowrap"
      style={{ background: bg, color, border }}
      title={hasFailure
        ? g('تعذّر الاتصال ببعض الإجابات. الإجابات تُحفظ تلقائياً عند استعادة الاتصال — أو اضغط السؤال مرة ثانية لإعادة الحفظ.', 'تعذّر الاتصال ببعض الإجابات. الإجابات تُحفظ تلقائياً عند استعادة الاتصال — أو اضغطي السؤال مرة ثانية لإعادة الحفظ.')
        : (secsAgo !== null ? `آخر حفظ ناجح قبل ${secsAgo} ثانية` : null)}
    >
      {label}
    </span>
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
