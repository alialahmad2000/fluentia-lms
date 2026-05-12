// IELTS V3 Phase 3.3 — Writing Lab (self-contained)
// Three-act: Studio (gallery) → Session (editor) → Results (feedback)

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, ChevronLeft, RotateCcw, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'

// Semantic feedback colors (consistent with Reading/Listening labs)
const SUCCESS = '#4ade80'
const DANGER  = '#f87171'

// ─── Constants ────────────────────────────────────────────────────────────────

const NARRATIVE_LINES = [
  'استوديو الكتابة.',
  'كل جملة — فكرة.',
  'كل مقال — خطوة.',
]

const MODE_CONFIG = {
  task1: { label: 'المهمة الأولى', timeMin: 20, minWords: 150, edgeType: 'ielts_task1', subType: 'writing_task1' },
  task2: { label: 'المهمة الثانية', timeMin: 40, minWords: 250, edgeType: 'ielts_task2', subType: 'writing_task2' },
  full:  { label: 'كاملاً (٦٠ دقيقة)', timeMin: 60, minWords: 400, edgeType: null,          subType: null },
}

const BAND_CRITERIA_TASK1 = [
  { key: 'task_achievement', label: 'Task Achievement' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion' },
  { key: 'lexical_resource', label: 'Lexical Resource' },
  { key: 'grammatical_range', label: 'Grammatical Range & Accuracy' },
]
const BAND_CRITERIA_TASK2 = [
  { key: 'task_response', label: 'Task Response' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion' },
  { key: 'lexical_resource', label: 'Lexical Resource' },
  { key: 'grammatical_range', label: 'Grammatical Range & Accuracy' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function formatTime(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function useIsWide(bp = 768) {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth > bp)
  useEffect(() => {
    const fn = () => setWide(window.innerWidth > bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return wide
}

// ─── Evaluation wrapper (5 retries, exponential backoff) ──────────────────────

async function evaluateWithRetry(task, draft, onAttempt) {
  const delays = [2000, 4000, 8000, 16000, 32000]
  const edgeType = task.task_type === 'task1' ? 'ielts_task1' : 'ielts_task2'
  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    onAttempt(attempt + 1)
    try {
      const { data, error } = await invokeWithRetry(
        'evaluate-writing',
        { body: { text: draft, task_type: edgeType } },
        { timeoutMs: 90000, retries: 0 }
      )
      if (error) throw new Error(error)
      if (!data?.feedback?.band_score) throw new Error('Malformed response')
      return { ok: true, feedback: data.feedback }
    } catch (e) {
      lastError = e.message || String(e)
      console.warn(`[Writing] eval attempt ${attempt + 1} failed:`, lastError)
      if (attempt < 4) await new Promise(r => setTimeout(r, delays[attempt]))
    }
  }
  return { ok: false, queued: true, error: lastError }
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function usePublishedTasks(mode) {
  return useQuery({
    queryKey: ['v3-writing-tasks', mode],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_writing_tasks')
        .select('id, task_type, test_variant, title, prompt, image_url, word_count_target, time_limit_minutes, difficulty_band')
        .eq('is_published', true)
        .order('difficulty_band')
      if (mode === 'task1') q = q.eq('task_type', 'task1')
      else if (mode === 'task2') q = q.eq('task_type', 'task2')
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

function useRecentSessions(studentId) {
  return useQuery({
    queryKey: ['v3-writing-sessions', studentId],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('id, submission_type, band_score, word_count, submitted_at')
        .eq('student_id', studentId)
        .in('submission_type', ['writing_task1', 'writing_task2'])
        .not('evaluated_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data || []
    },
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeButton({ mode, active, onClick }) {
  const cfg = MODE_CONFIG[mode]
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRadius: 12,
        border: `1px solid ${active ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 55%, transparent)'}`,
        background: active ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 45%, transparent)',
        color: active ? 'var(--ds-text)' : 'var(--ds-text-muted)',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: "'Tajawal', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'center',
      }}
    >
      {cfg.label}
    </button>
  )
}

function TaskCard({ task, onSelect }) {
  const isTask1 = task.task_type === 'task1'
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(task)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '18px 20px',
        borderRadius: 18,
        border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)',
        background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        textAlign: 'right',
        width: '100%',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-orange) 40%, transparent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-amber) 18%, transparent)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'var(--sunset-orange)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {isTask1 ? 'Task 1' : 'Task 2'}
          </span>
          {task.difficulty_band && (
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 5,
              background: 'color-mix(in srgb, var(--ds-surface) 60%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)',
              color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              Band {task.difficulty_band}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          🕐 {task.time_limit_minutes || (isTask1 ? 20 : 40)} دق
        </span>
      </div>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.5, textAlign: 'right' }}>
        {task.title}
      </h3>
      <p style={{
        margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif",
        lineHeight: 1.6, textAlign: 'right',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {task.prompt?.split('\n')[0]}
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          ✏️ {task.word_count_target || (isTask1 ? 150 : 250)}+ كلمة
        </span>
      </div>
    </motion.button>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      flex: 1, padding: '14px 18px', borderRadius: 14,
      background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)',
      border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)',
      backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: accent || 'var(--ds-text)', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

function WordCounter({ wordCount, target }) {
  const pct = Math.min(100, (wordCount / target) * 100)
  const color = wordCount >= target ? SUCCESS : wordCount >= target * 0.8 ? 'var(--sunset-amber)' : 'var(--ds-text-muted)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>عدد الكلمات</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>
          {wordCount} / {target}+
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: 'color-mix(in srgb, var(--ds-border) 35%, transparent)', overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
    </div>
  )
}

function AutoSaveIndicator({ state }) {
  const text = state === 'saving' ? 'جاري الحفظ...' : state === 'saved' ? 'تم الحفظ ✓' : state === 'error' ? 'خطأ في الحفظ' : ''
  const color = state === 'saved' ? SUCCESS : state === 'error' ? DANGER : 'var(--ds-text-muted)'
  if (!text) return null
  return (
    <span style={{ fontSize: 11, color, fontFamily: "'Tajawal', sans-serif", transition: 'color 0.2s' }}>
      {text}
    </span>
  )
}

function TimerDisplay({ elapsed, timeLimit }) {
  const remaining = Math.max(0, timeLimit * 60 - elapsed)
  const isUrgent = remaining < 300
  const isCritical = remaining < 60
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 14,
      fontWeight: 700,
      color: isCritical ? DANGER : isUrgent ? 'var(--sunset-amber)' : 'var(--ds-text-muted)',
      minWidth: 50,
      animation: isCritical ? 'none' : undefined,
    }}>
      {formatTime(remaining)}
    </span>
  )
}

function CriterionRow({ label, score, feedbackAr }) {
  const [open, setOpen] = useState(false)
  const color = score >= 7 ? SUCCESS : score >= 5.5 ? 'var(--sunset-amber)' : DANGER
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)',
      border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ fontSize: 13, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {score?.toFixed(1) ?? '—'}
        </span>
      </button>
      {feedbackAr && (
        <AnimatePresence>
          {open && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right', overflow: 'hidden' }}
            >
              {feedbackAr}
            </motion.p>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

function EvalSpinner({ attempt }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
      dir="rtl"
    >
      <Loader2 size={44} color="var(--sunset-orange)" style={{ animation: 'spin 1.2s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
        جاري التقييم…
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        {attempt > 1 ? `المحاولة ${attempt} / 5` : '~٣٠ ثانية'}
      </p>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Writing() {
  const studentId = useStudentId()
  const isWide = useIsWide()
  const qc = useQueryClient()

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [act, setAct]                     = useState('studio')
  const [mode, setMode]                   = useState('task2')
  const [selectedTask, setSelectedTask]   = useState(null)
  const [fullTab, setFullTab]             = useState('task1')
  const [draft, setDraft]                 = useState('')
  const [task2Draft, setTask2Draft]       = useState('')
  const [draftId, setDraftId]             = useState(null)
  const [task2DraftId, setTask2DraftId]   = useState(null)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [autoSaveState, setAutoSaveState] = useState('idle')
  const [evalAttempt, setEvalAttempt]     = useState(0)
  const [gradeResult, setGradeResult]     = useState(null)
  const [task2Result, setTask2Result]     = useState(null)
  const [evalQueued, setEvalQueued]       = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [narrativeDone, setNarrativeDone] = useState(false)

  // ── 2. useRef ──────────────────────────────────────────────────────────────
  const textareaRef      = useRef(null)
  const autoSaveTimer    = useRef(null)
  const debounceTimer    = useRef(null)
  const elapsedTimer     = useRef(null)
  const draftIdRef       = useRef(null)
  const task2DraftIdRef  = useRef(null)
  const currentDraftRef  = useRef('')
  const currentDraft2Ref = useRef('')

  // ── 3. useQuery ───────────────────────────────────────────────────────────
  const tasksQ   = usePublishedTasks(mode)
  const recentQ  = useRecentSessions(studentId)

  // ── 4. useEffect ───────────────────────────────────────────────────────────

  // Keep refs in sync with state for use in closures
  useEffect(() => { currentDraftRef.current = draft }, [draft])
  useEffect(() => { currentDraft2Ref.current = task2Draft }, [task2Draft])
  useEffect(() => { draftIdRef.current = draftId }, [draftId])
  useEffect(() => { task2DraftIdRef.current = task2DraftId }, [task2DraftId])

  // Session elapsed timer
  useEffect(() => {
    if (act !== 'session') { clearInterval(elapsedTimer.current); return }
    elapsedTimer.current = setInterval(() => setSessionElapsed(t => t + 1), 1000)
    return () => clearInterval(elapsedTimer.current)
  }, [act])

  // Auto-expiry when timer hits 0
  useEffect(() => {
    if (act !== 'session') return
    const timeLimit = mode === 'full' ? 60 : (selectedTask?.time_limit_minutes || MODE_CONFIG[mode].timeMin)
    if (sessionElapsed >= timeLimit * 60) handleSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionElapsed])

  // 30s auto-save interval
  useEffect(() => {
    if (act !== 'session') { clearInterval(autoSaveTimer.current); return }
    autoSaveTimer.current = setInterval(() => triggerAutoSave(), 30000)
    return () => clearInterval(autoSaveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, studentId, selectedTask])

  // Visibility-change auto-save
  useEffect(() => {
    if (act !== 'session') return
    const handler = () => { if (document.visibilityState === 'hidden') triggerAutoSave() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act])

  // ── 5. useCallback ─────────────────────────────────────────────────────────

  const saveOneDraft = useCallback(async ({ taskForSave, text, existingId }) => {
    if (!studentId || !taskForSave || !text.trim()) return null
    const wordCount = countWords(text)
    const payload = {
      student_id: studentId,
      submission_type: taskForSave.task_type === 'task1' ? 'writing_task1' : 'writing_task2',
      test_variant: taskForSave.test_variant || null,
      source_table: 'ielts_writing_tasks',
      source_id: taskForSave.id,
      text_content: text,
      word_count: wordCount,
      submitted_at: new Date().toISOString(),
    }
    try {
      if (existingId) {
        const { data, error } = await supabase.from('ielts_submissions').update(payload).eq('id', existingId).select('id').single()
        if (error) throw error
        return data?.id
      } else {
        const { data, error } = await supabase.from('ielts_submissions').insert(payload).select('id').single()
        if (error) throw error
        return data?.id
      }
    } catch (e) {
      console.warn('[Writing] draft save error:', e.message)
      return existingId || null
    }
  }, [studentId])

  const triggerAutoSave = useCallback(async () => {
    if (!studentId || !selectedTask) return
    setAutoSaveState('saving')
    try {
      const task1 = mode === 'full' ? selectedTask.task1 : selectedTask
      const id = await saveOneDraft({ taskForSave: task1, text: currentDraftRef.current, existingId: draftIdRef.current })
      if (id) { setDraftId(id); draftIdRef.current = id }
      if (mode === 'full' && selectedTask.task2) {
        const id2 = await saveOneDraft({ taskForSave: selectedTask.task2, text: currentDraft2Ref.current, existingId: task2DraftIdRef.current })
        if (id2) { setTask2DraftId(id2); task2DraftIdRef.current = id2 }
      }
      setAutoSaveState('saved')
      setTimeout(() => setAutoSaveState('idle'), 2000)
    } catch {
      setAutoSaveState('error')
    }
  }, [studentId, selectedTask, mode, saveOneDraft])

  // Debounced auto-save on typing
  const handleDraftChange = useCallback((val) => {
    setDraft(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => triggerAutoSave(), 1000)
  }, [triggerAutoSave])

  const handleTask2DraftChange = useCallback((val) => {
    setTask2Draft(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => triggerAutoSave(), 1000)
  }, [triggerAutoSave])

  async function handleSubmit() {
    clearInterval(elapsedTimer.current)
    clearInterval(autoSaveTimer.current)
    setAct('evaluating')
    setEvalAttempt(0)

    const task1 = mode === 'full' ? selectedTask.task1 : selectedTask
    const task2 = mode === 'full' ? selectedTask.task2 : null
    const d1 = currentDraftRef.current
    const d2 = currentDraft2Ref.current

    // Ensure draft is saved (immutable submission: freeze the row)
    let sid1 = draftIdRef.current
    let sid2 = task2DraftIdRef.current
    if (!sid1) {
      sid1 = await saveOneDraft({ taskForSave: task1, text: d1, existingId: null })
      if (sid1) setDraftId(sid1)
    }
    if (task2 && !sid2) {
      sid2 = await saveOneDraft({ taskForSave: task2, text: d2, existingId: null })
      if (sid2) setTask2DraftId(sid2)
    }

    // Evaluate task1
    const res1 = await evaluateWithRetry(task1, d1, setEvalAttempt)
    if (res1.ok && sid1) {
      await supabase.from('ielts_submissions').update({
        band_score: res1.feedback.band_score,
        ai_feedback: res1.feedback,
        evaluated_at: new Date().toISOString(),
      }).eq('id', sid1)
      qc.invalidateQueries({ queryKey: ['v3-writing-sessions', studentId] })
    } else if (!res1.ok) {
      setEvalQueued(true)
    }
    setGradeResult(res1.ok ? res1.feedback : null)

    // Evaluate task2 if full mode
    if (task2 && d2.trim().length > 0) {
      const res2 = await evaluateWithRetry(task2, d2, setEvalAttempt)
      if (res2.ok && sid2) {
        await supabase.from('ielts_submissions').update({
          band_score: res2.feedback.band_score,
          ai_feedback: res2.feedback,
          evaluated_at: new Date().toISOString(),
        }).eq('id', sid2)
      }
      setTask2Result(res2.ok ? res2.feedback : null)
    }

    setAct('results')
  }

  function handleSelectTask(task) {
    setSelectedTask(task)
    setDraft('')
    setTask2Draft('')
    setDraftId(null)
    setTask2DraftId(null)
    draftIdRef.current = null
    task2DraftIdRef.current = null
    setSessionElapsed(0)
    setGradeResult(null)
    setTask2Result(null)
    setEvalQueued(false)
    setConfirmSubmit(false)
    setAutoSaveState('idle')
    setAct('session')
  }

  function handleSelectFull(tasks) {
    const t1 = tasks.find(t => t.task_type === 'task1')
    const t2 = tasks.find(t => t.task_type === 'task2')
    if (!t1 || !t2) return
    handleSelectTask({ task1: t1, task2: t2, _full: true })
    setFullTab('task1')
  }

  function handleBackToStudio() {
    clearInterval(elapsedTimer.current)
    clearInterval(autoSaveTimer.current)
    setAct('studio')
    setSelectedTask(null)
  }

  // Derived
  const currentTask  = mode === 'full' ? selectedTask?.task1 : selectedTask
  const wordCount    = countWords(draft)
  const wordCount2   = countWords(task2Draft)
  const minWords     = mode === 'full' ? 150 : MODE_CONFIG[mode].minWords
  const timeLimit    = mode === 'full' ? 60 : (selectedTask?.time_limit_minutes || MODE_CONFIG[mode].timeMin)
  const totalWords   = mode === 'full' ? wordCount + wordCount2 : wordCount
  const answeredEnough = mode === 'full' ? (wordCount > 10 || wordCount2 > 10) : wordCount > 10

  // ── ACT 1: STUDIO ──────────────────────────────────────────────────────────
  if (act === 'studio') {
    const tasks  = tasksQ.data || []
    const recent = recentQ.data || []
    const bestBand = recent.length > 0
      ? Math.max(...recent.map(s => Number(s.band_score || 0)).filter(Boolean))
      : null

    return (
      <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Narrative */}
        {!narrativeDone && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} style={{ paddingTop: 32 }}>
            <NarrativeReveal
              lines={NARRATIVE_LINES}
              delayBetweenLines={700}
              pauseAfterLast={400}
              onComplete={() => setNarrativeDone(true)}
            />
          </motion.section>
        )}

        {/* Stats */}
        {recent.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'flex', gap: 12 }}>
            <StatCard label="جلسات مكتملة" value={recent.length} />
            {bestBand != null && <StatCard label="أفضل Band" value={bestBand.toFixed(1)} accent="var(--sunset-orange)" />}
          </motion.section>
        )}

        {/* Mode selector */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>
            اختاري الوضع
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['task1', 'task2', 'full'].map(m => (
              <ModeButton key={m} mode={m} active={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </motion.section>

        {/* Task grid / Full CTA */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {mode === 'full' ? (
            <div style={{
              padding: '24px 28px', borderRadius: 20,
              border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)',
              background: 'color-mix(in srgb, var(--sunset-base-mid) 42%, transparent)',
              backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'right',
            }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
                الجلسة الكاملة — ٦٠ دقيقة
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>
                المهمة الأولى (٢٠ دق، ١٥٠+ كلمة) + المهمة الثانية (٤٠ دق، ٢٥٠+ كلمة). كلا التقييمين يظهران في النهاية.
              </p>
              {tasksQ.isLoading ? (
                <Loader2 size={18} color="var(--ds-text-muted)" style={{ animation: 'spin 1.2s linear infinite' }} />
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectFull(tasks)}
                  disabled={tasks.filter(t => t.task_type === 'task1').length === 0 || tasks.filter(t => t.task_type === 'task2').length === 0}
                  style={{
                    padding: '14px 24px', borderRadius: 14,
                    border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)',
                    background: 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)',
                    color: 'var(--ds-text)', fontSize: 16, fontWeight: 900,
                    fontFamily: "'Tajawal', sans-serif", cursor: 'pointer',
                  }}
                >
                  ابدأ الجلسة الكاملة
                </motion.button>
              )}
            </div>
          ) : tasksQ.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 160, borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 30%, transparent)' }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: '40px 24px', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', textAlign: 'center' }}>
              <PenLine size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>لا توجد مهام لهذا الوضع حالياً</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {tasks.map(t => <TaskCard key={t.id} task={t} onSelect={handleSelectTask} />)}
            </div>
          )}
        </motion.section>
      </div>
    )
  }

  // ── ACT 2: EVALUATING ──────────────────────────────────────────────────────
  if (act === 'evaluating') {
    return (
      <div dir="rtl" style={{ padding: '20px 0' }}>
        <EvalSpinner attempt={evalAttempt} />
      </div>
    )
  }

  // ── ACT 2: SESSION ─────────────────────────────────────────────────────────
  if (act === 'session') {
    const activeTask = mode === 'full'
      ? (fullTab === 'task1' ? selectedTask?.task1 : selectedTask?.task2)
      : selectedTask
    const activeDraft = mode === 'full' && fullTab === 'task2' ? task2Draft : draft
    const activeDraftChange = mode === 'full' && fullTab === 'task2' ? handleTask2DraftChange : handleDraftChange
    const activeMin = mode === 'full' ? (fullTab === 'task1' ? 150 : 250) : minWords
    const activeWc = mode === 'full' && fullTab === 'task2' ? wordCount2 : wordCount

    return (
      <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0 16px', marginBottom: 20,
          borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)',
          gap: 12, flexWrap: 'wrap',
        }}>
          <button
            onClick={handleBackToStudio}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
          >
            <ChevronLeft size={13} />
            الاستوديو
          </button>

          <h2 style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'" }}>
            {activeTask?.title || '...'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AutoSaveIndicator state={autoSaveState} />
            <TimerDisplay elapsed={sessionElapsed} timeLimit={timeLimit} />
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {totalWords}w
            </span>
          </div>
        </div>

        {/* Full mode tab strip */}
        {mode === 'full' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['task1', 'المهمة الأولى'], ['task2', 'المهمة الثانية']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => { triggerAutoSave(); setFullTab(k) }}
                style={{
                  padding: '7px 18px', borderRadius: 10,
                  border: `1px solid ${fullTab === k ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`,
                  background: fullTab === k ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'transparent',
                  color: fullTab === k ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontSize: 13, fontWeight: fullTab === k ? 700 : 500,
                  fontFamily: "'Tajawal', sans-serif", cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr 1.2fr' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* Prompt panel */}
          <div style={{
            position: isWide ? 'sticky' : 'static', top: 20,
            padding: '20px 22px', borderRadius: 18,
            background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-amber) 16%, transparent)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeTask?.task_type === 'task1' ? 'Task 1' : 'Task 2'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                · {activeMin}+ كلمة · {mode === 'full' ? (fullTab === 'task1' ? 20 : 40) : timeLimit} دق
              </span>
            </div>
            {activeTask?.image_url && (
              <img src={activeTask.image_url} alt="task chart" style={{ width: '100%', borderRadius: 12, objectFit: 'contain', maxHeight: 200 }} />
            )}
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8, textAlign: 'right', whiteSpace: 'pre-line' }}>
              {activeTask?.prompt}
            </p>
          </div>

          {/* Editor panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              ref={textareaRef}
              dir="ltr"
              value={activeDraft}
              onChange={e => activeDraftChange(e.target.value)}
              onBlur={() => triggerAutoSave()}
              placeholder="Start writing here..."
              style={{
                width: '100%', minHeight: isWide ? '60vh' : '40vh',
                padding: '18px 20px', borderRadius: 16, resize: 'vertical',
                border: `1px solid color-mix(in srgb, var(--sunset-amber) ${activeDraft.length > 10 ? 22 : 14}%, transparent)`,
                background: 'color-mix(in srgb, var(--ds-surface) 55%, transparent)',
                color: 'var(--ds-text)', fontSize: 16, fontFamily: "'Georgia', serif",
                lineHeight: 1.8, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            <WordCounter wordCount={activeWc} target={activeMin} />

            {/* Submit area */}
            <AnimatePresence mode="wait">
              {confirmSubmit && totalWords < minWords ? (
                <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  style={{ padding: '14px 16px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-amber) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 28%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>
                    كتبت {totalWords} كلمة من أصل {minWords} المطلوبة. هل تريدين الإرسال الآن؟
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmSubmit(false)}
                      style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
                      تراجع
                    </button>
                    <button onClick={handleSubmit}
                      style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 15%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
                      إرسال
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => {
                    if (!answeredEnough) return
                    if (totalWords < minWords) { setConfirmSubmit(true); return }
                    handleSubmit()
                  }}
                  disabled={!answeredEnough}
                  whileHover={answeredEnough ? { scale: 1.01 } : undefined}
                  whileTap={answeredEnough ? { scale: 0.99 } : undefined}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14,
                    border: `1px solid color-mix(in srgb, var(--sunset-orange) ${answeredEnough ? 45 : 18}%, transparent)`,
                    background: answeredEnough ? 'color-mix(in srgb, var(--sunset-orange) 18%, var(--sunset-base-mid))' : 'color-mix(in srgb, var(--ds-surface) 35%, transparent)',
                    color: answeredEnough ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                    fontSize: 16, fontWeight: 900, fontFamily: "'Tajawal', sans-serif",
                    cursor: answeredEnough ? 'pointer' : 'not-allowed',
                    opacity: answeredEnough ? 1 : 0.5, transition: 'all 0.2s',
                  }}
                >
                  تسليم للتقييم ({totalWords} كلمة)
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // ── ACT 3: RESULTS ─────────────────────────────────────────────────────────
  if (act === 'results') {
    const renderFeedback = (fb, task) => {
      if (!fb) return null
      const isTask1 = task?.task_type === 'task1'
      const criteria = isTask1 ? BAND_CRITERIA_TASK1 : BAND_CRITERIA_TASK2
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Score card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: '36px 28px', borderRadius: 24, background: 'color-mix(in srgb, var(--sunset-base-mid) 48%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)', backdropFilter: 'blur(10px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {isTask1 ? 'Task 1 Result' : 'Task 2 Result'}
            </p>
            <BandDisplay band={fb.band_score} size="xl" animate />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
              {fb.word_count ? `${fb.word_count} كلمة` : ''}
            </p>
          </motion.div>

          {/* Criteria breakdown */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criteria.map(c => (
              <CriterionRow
                key={c.key}
                label={c.label}
                score={fb[c.key]?.score ?? fb[c.key]}
                feedbackAr={fb[c.key]?.feedback_ar}
              />
            ))}
          </motion.div>

          {/* Overall feedback */}
          {fb.overall_feedback_ar && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              style={{ padding: '16px 18px', borderRadius: 16, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8, textAlign: 'right' }}>
                {fb.overall_feedback_ar}
              </p>
            </motion.div>
          )}

          {/* Tips */}
          {Array.isArray(fb.improvement_tips_ar) && fb.improvement_tips_ar.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              style={{ padding: '16px 18px', borderRadius: 16, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)' }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-amber)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                نصائح للتحسين
              </p>
              {fb.improvement_tips_ar.map((tip, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0', fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right' }}>
                  • {tip}
                </p>
              ))}
            </motion.div>
          )}
        </div>
      )
    }

    const task1 = mode === 'full' ? selectedTask?.task1 : selectedTask
    const task2 = mode === 'full' ? selectedTask?.task2 : null

    return (
      <div dir="rtl" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Queued state */}
        {evalQueued && !gradeResult && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '24px 20px', borderRadius: 20, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--sunset-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>
                في طابور المراجعة
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right' }}>
                تعذّر التقييم التلقائي بعد ٥ محاولات. تمّت حفظ مقالتك وستصلك النتيجة قريباً.
              </p>
            </div>
          </motion.div>
        )}

        {/* Task1 results */}
        {gradeResult && renderFeedback(gradeResult, task1)}

        {/* Task2 results (full mode) */}
        {mode === 'full' && task2Result && (
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Task 2
            </p>
            {renderFeedback(task2Result, task2)}
          </div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => { setAct('studio'); setSelectedTask(null) }}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
          >
            الاستوديو
          </button>
          <button
            onClick={() => handleSelectTask(mode === 'full' ? selectedTask : selectedTask)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange) 38%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 13%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
          >
            <RotateCcw size={13} />
            محاولة أخرى
          </button>
        </motion.div>
      </div>
    )
  }

  return null
}
