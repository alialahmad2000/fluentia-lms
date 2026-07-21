// IELTS V3 Phase 3.3 — Writing Lab (self-contained)
// Three-act: Studio (gallery) → Session (editor) → Results (feedback)

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, ChevronLeft, ChevronRight, RotateCcw, Loader2, CheckCircle, XCircle, AlertTriangle, Clock, BookOpen, GraduationCap, Dumbbell, Check, ArrowLeft } from 'lucide-react'
import { GalleryCard, MetaChip, LabHeader, SectionHeader, Card, Icon } from './_ui/primitives'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useG } from '@/i18n/gender'
import { ExamShell } from './_ui/ExamShell'
import Task1Figure from './_ui/Task1Figure'
import writingCurriculum from '@/data/ielts/writing-curriculum.json'

const WSANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

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
    <GalleryCard onClick={() => onSelect(task)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--iel-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isTask1 ? 'Task 1' : 'Task 2'}
          </span>
          {task.difficulty_band && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', color: 'var(--iel-ink-2)', fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              Band {task.difficulty_band}
            </span>
          )}
        </div>
        <MetaChip icon={Clock}>{task.time_limit_minutes || (isTask1 ? 20 : 40)} دق</MetaChip>
      </div>
      <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.45, textAlign: 'start', letterSpacing: '-.01em' }}>
        {task.title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--iel-ink-3)', lineHeight: 1.7, textAlign: 'start', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.prompt?.split('\n')[0]}
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
        <MetaChip icon={PenLine}>{task.word_count_target || (isTask1 ? 150 : 250)}+ كلمة</MetaChip>
      </div>
    </GalleryCard>
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

// ─── Teach-first: lesson reader ────────────────────────────────────────────────

const EN = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

function LessonReader({ lesson, onClose, onNext }) {
  const [checked, setChecked] = useState({}) // sectionIdx → chosen option idx
  if (!lesson) return null
  return (
    <div dir="rtl" style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 90, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button onClick={onClose} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, color: 'var(--iel-ink-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
        <ArrowLeft size={15} /> رجوع
      </button>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.08em', marginBottom: 6 }}>درس · {lesson.minutes} دقائق</div>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, lineHeight: 1.35 }}>{lesson.title}</h1>
        {lesson.goal_ar && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>{lesson.goal_ar}</p>}
      </div>

      {lesson.sections.map((s, i) => {
        if (s.kind === 'concept') return (
          <Card key={i} style={{ padding: '18px 20px' }}>
            {s.heading && <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 10 }}>{s.heading}</div>}
            {String(s.body_ar || '').split(/\n{2,}/).map((para, j) => (
              <p key={j} style={{ margin: j === 0 ? 0 : '10px 0 0', fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.95 }}>{para}</p>
            ))}
          </Card>
        )
        if (s.kind === 'example') return (
          <Card key={i} style={{ padding: '18px 20px' }}>
            {s.heading && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 10 }}>{s.heading}</div>}
            <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14.5, color: 'var(--iel-ink)', lineHeight: 1.75, padding: '13px 15px', borderRadius: 10, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)' }}>{s.body_en}</div>
            {s.note_ar && <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--iel-ink-3)', lineHeight: 1.85 }}>{s.note_ar}</p>}
          </Card>
        )
        if (s.kind === 'contrast') return (
          <Card key={i} style={{ padding: '18px 20px' }}>
            {s.heading && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 12 }}>{s.heading}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.7, padding: '11px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--iel-bad) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-bad) 26%, transparent)' }}>
                <span style={{ display: 'block', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", fontSize: 11, fontWeight: 800, color: 'var(--iel-bad)', marginBottom: 5 }}>ضعيف · Band 5</span>{s.bad_en}
              </div>
              <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14, color: 'var(--iel-ink)', lineHeight: 1.7, padding: '11px 14px', borderRadius: 10, background: 'color-mix(in srgb, var(--iel-good) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-good) 26%, transparent)' }}>
                <span style={{ display: 'block', direction: 'rtl', fontFamily: "'Tajawal', sans-serif", fontSize: 11, fontWeight: 800, color: 'var(--iel-good)', marginBottom: 5 }}>قوي · Band 7+</span>{s.good_en}
              </div>
            </div>
            {s.note_ar && <p style={{ margin: '11px 0 0', fontSize: 13.5, color: 'var(--iel-ink-3)', lineHeight: 1.85 }}>{s.note_ar}</p>}
          </Card>
        )
        if (s.kind === 'tip') return (
          <div key={i} style={{ padding: '13px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--iel-gold, #e6ba68) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-gold, #e6ba68) 28%, transparent)', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{ flex: 'none', color: 'var(--iel-gold-ink, var(--iel-gold, #e6ba68))', marginTop: 1 }}>✦</span>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--iel-ink)', lineHeight: 1.8, fontWeight: 600 }}>{s.body_ar}</p>
          </div>
        )
        if (s.kind === 'check') {
          const picked = checked[i]
          return (
            <Card key={i} focus style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 8 }}>تحقّقي من فهمك</div>
              <p style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1.7 }}>{s.question_ar}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.options.map((opt, oi) => {
                  const isPicked = picked === oi
                  const reveal = picked != null
                  const correct = oi === s.correct
                  const bg = reveal ? (correct ? 'color-mix(in srgb, var(--iel-good) 12%, transparent)' : (isPicked ? 'color-mix(in srgb, var(--iel-bad) 10%, transparent)' : 'transparent')) : (isPicked ? 'var(--iel-accent-soft)' : 'transparent')
                  const bd = reveal ? (correct ? 'var(--iel-good)' : (isPicked ? 'var(--iel-bad)' : 'var(--iel-border)')) : 'var(--iel-border)'
                  return (
                    <button key={oi} onClick={() => picked == null && setChecked((c) => ({ ...c, [i]: oi }))} disabled={picked != null}
                      style={{ textAlign: 'start', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${bd}`, background: bg, cursor: picked == null ? 'pointer' : 'default', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, color: 'var(--iel-ink)', fontWeight: correct && reveal ? 700 : 500 }}>
                      {opt}{reveal && correct ? ' ✓' : ''}
                    </button>
                  )
                })}
              </div>
              {picked != null && s.why_ar && <p style={{ margin: '11px 0 0', fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>{s.why_ar}</p>}
            </Card>
          )
        }
        return null
      })}

      <button onClick={onNext} className="iel-primary" style={{ marginTop: 6, padding: '13px', borderRadius: 12, border: 0, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", background: 'linear-gradient(140deg, color-mix(in srgb, var(--iel-accent) 82%, var(--iel-accent-ink)), color-mix(in srgb, var(--iel-accent) 78%, #063a31))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        أنهيت الدرس — التالي <ChevronLeft size={17} />
      </button>
    </div>
  )
}

// ─── Teach-first: micro-drill runner (self-check vs a band-8 model) ─────────────

function DrillRunner({ drill, onClose }) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [ticks, setTicks] = useState({})
  if (!drill) return null
  const wc = countWords(text)
  const inRange = wc >= (drill.minWords || 0)
  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 90, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onClose} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, color: 'var(--iel-ink-3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
        <ArrowLeft size={15} /> رجوع
      </button>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.08em', marginBottom: 6 }}>تدريب · {drill.minutes} دقائق</div>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--iel-ink)', margin: 0, lineHeight: 1.4 }}>{drill.title}</h1>
        {drill.brief_ar && <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>{drill.brief_ar}</p>}
      </div>

      {/* Stimulus: chart (Task 1) / prompt / weak-sample-to-improve */}
      {drill.taskRef && <Task1Figure taskId={drill.taskRef} />}
      {drill.prompt_en && (
        <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14.5, color: 'var(--iel-ink)', lineHeight: 1.75, padding: '14px 16px', borderRadius: 12, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', whiteSpace: 'pre-line' }}>{drill.prompt_en}</div>
      )}
      {drill.given_en && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-bad)', marginBottom: 6 }}>الفقرة الضعيفة — حسّنيها</div>
          <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.7, padding: '12px 15px', borderRadius: 10, background: 'color-mix(in srgb, var(--iel-bad) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-bad) 24%, transparent)' }}>{drill.given_en}</div>
        </div>
      )}

      {/* Write */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--iel-ink-2)' }}>اكتبي هنا</span>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace", color: inRange ? 'var(--iel-good)' : 'var(--iel-ink-3)' }}>{wc} / {drill.minWords}+ كلمة</span>
        </div>
        <textarea dir="ltr" value={text} onChange={(e) => setText(e.target.value)} placeholder="Start writing here…"
          style={{ width: '100%', minHeight: 150, padding: '14px 16px', borderRadius: 12, resize: 'vertical', boxSizing: 'border-box', border: `1px solid ${text.length > 8 ? 'color-mix(in srgb, var(--iel-accent) 30%, var(--iel-border))' : 'var(--iel-border)'}`, background: 'var(--iel-surface)', color: 'var(--iel-ink)', fontSize: 15, fontFamily: EN, lineHeight: 1.7, outline: 'none' }} />
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)} disabled={wc < 3} className={wc < 3 ? undefined : 'iel-primary'}
          style={{ padding: '13px', borderRadius: 12, border: 0, color: wc < 3 ? 'var(--iel-ink-3)' : '#fff', fontSize: 15, fontWeight: 800, cursor: wc < 3 ? 'not-allowed' : 'pointer', fontFamily: "'Tajawal', sans-serif", background: wc < 3 ? 'var(--iel-surface-2)' : 'linear-gradient(140deg, color-mix(in srgb, var(--iel-accent) 82%, var(--iel-accent-ink)), color-mix(in srgb, var(--iel-accent) 78%, #063a31))' }}>
          قارني بالنموذج
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-good)', marginBottom: 10 }}>النموذج (Band 8)</div>
            <div style={{ direction: 'ltr', textAlign: 'left', fontFamily: EN, fontSize: 14.5, color: 'var(--iel-ink)', lineHeight: 1.8 }}>{drill.model_en}</div>
            {drill.model_note_ar && <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>{drill.model_note_ar}</p>}
          </Card>
          {Array.isArray(drill.checklist_ar) && drill.checklist_ar.length > 0 && (
            <Card style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 12 }}>راجعي كتابتك — هل حقّقتِ هذه؟</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {drill.checklist_ar.map((item, ci) => {
                  const on = !!ticks[ci]
                  return (
                    <button key={ci} onClick={() => setTicks((t) => ({ ...t, [ci]: !t[ci] }))}
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'start', padding: '9px 11px', borderRadius: 10, border: `1px solid ${on ? 'color-mix(in srgb, var(--iel-good) 40%, var(--iel-border))' : 'var(--iel-border)'}`, background: on ? 'color-mix(in srgb, var(--iel-good) 8%, transparent)' : 'transparent', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
                      <span style={{ flex: 'none', width: 20, height: 20, borderRadius: 6, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${on ? 'var(--iel-good)' : 'var(--iel-ink-3)'}`, background: on ? 'var(--iel-good)' : 'transparent', color: '#fff' }}>{on && <Check size={13} strokeWidth={3} />}</span>
                      <span style={{ fontSize: 13.5, color: 'var(--iel-ink)', lineHeight: 1.6 }}>{item}</span>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}
          <button onClick={onClose} style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)', color: 'var(--iel-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
            أنهيت التدريب
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Writing() {
  const g = useG()
  const studentId = useStudentId()
  const isWide = useIsWide()
  const qc = useQueryClient()
  const { pathname } = useLocation()
  // Sidebar sub-item routes the landing task: /writing → Task 1, /writing/task2 → Task 2.
  const routedTask = pathname.endsWith('/writing/task2') ? 'task2' : 'task1'

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [act, setAct]                     = useState('hub')
  const [hubTask, setHubTask]             = useState(routedTask)     // teach-first tab
  const [activeLesson, setActiveLesson]   = useState(null)
  const [activeDrill, setActiveDrill]     = useState(null)
  const [mode, setMode]                   = useState(routedTask)
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
  const [mobilePane, setMobilePane] = useState('prompt')
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
  const tasksQ   = usePublishedTasks(hubTask)
  const allTasksQ = usePublishedTasks('full') // no filter → both types (for the combined session)
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
    if (!task._full && task.task_type) setMode(task.task_type)
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
    setMode('full')
    handleSelectTask({ task1: t1, task2: t2, _full: true })
    setFullTab('task1')
  }

  function handleBackToStudio() {
    clearInterval(elapsedTimer.current)
    clearInterval(autoSaveTimer.current)
    setAct('hub')
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
  // ── ACT 1: LESSON READER ────────────────────────────────────────────────────
  if (act === 'lesson' && activeLesson) {
    const list = writingCurriculum[hubTask]?.lessons || []
    const idx = list.findIndex((l) => l.id === activeLesson.id)
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
    return <LessonReader lesson={activeLesson} onClose={() => { setActiveLesson(null); setAct('hub') }} onNext={() => { if (next) setActiveLesson(next); else { setActiveLesson(null); setAct('hub') } }} />
  }

  // ── ACT 1: DRILL RUNNER ─────────────────────────────────────────────────────
  if (act === 'drill' && activeDrill) {
    return <DrillRunner drill={activeDrill} onClose={() => { setActiveDrill(null); setAct('hub') }} />
  }

  // ── ACT 1: HUB (teach-first) ────────────────────────────────────────────────
  if (act === 'hub') {
    const tasks  = (tasksQ.data || [])
    const allTasks = allTasksQ.data || []
    const recent = recentQ.data || []
    const bestBand = recent.length > 0
      ? Math.max(...recent.map(s => Number(s.band_score || 0)).filter(Boolean))
      : null
    const cur = writingCurriculum[hubTask] || { lessons: [], drills: [] }
    const doneBy = {}
    for (const s of recent) if (s.source_id) doneBy[s.source_id] = doneBy[s.source_id] || s

    return (
      <div dir="rtl" style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <LabHeader eyebrow="التدريب · الكتابة" title="الكتابة">
          نتعلّم خطوة بخطوة قبل الاختبار: دروس قصيرة تشرح كل ما تحتاجينه، ثم تدريبات مصغّرة تتقنين فيها جزءاً واحداً، وأخيراً مهمة كاملة في بيئة الاختبار. هكذا تصلين إلى المهمة الكاملة وأنتِ واثقة.
        </LabHeader>

        {recent.length > 0 && (
          <div style={{ display: 'flex', gap: 12 }}>
            <StatCard label="مهام مكتملة" value={recent.length} />
            {bestBand != null && <StatCard label="أفضل Band" value={bestBand.toFixed(1)} accent="var(--iel-accent)" />}
          </div>
        )}

        {/* Task-type tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 12, padding: 4 }}>
          {[['task1', 'المهمة الأولى', 'رسم بياني / عملية / خريطة'], ['task2', 'المهمة الثانية', 'مقال رأي / نقاش']].map(([k, l, sub]) => (
            <button key={k} onClick={() => setHubTask(k)} style={{ flex: 1, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", border: 0, background: hubTask === k ? 'var(--iel-accent)' : 'transparent', color: hubTask === k ? '#fff' : 'var(--iel-ink-2)', transition: 'all .15s' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>{l}</div>
              <div style={{ fontSize: 10.5, opacity: .85, marginTop: 2 }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* PHASE 1 — تعلّم */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none' }}><GraduationCap size={16} /></span>
            <div><div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>١ · تعلّمي</div><div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 500 }}>دروس قصيرة تبني الأساس</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {cur.lessons.map((l, i) => (
              <button key={l.id} onClick={() => { setActiveLesson(l); setAct('lesson') }} className="iel-gcard" style={{ textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.04em' }}>درس {i + 1}</span>
                  <MetaChip icon={Clock}>{l.minutes} د</MetaChip>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.4 }}>{l.title}</div>
                {l.goal_ar && <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.goal_ar}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* PHASE 2 — تدرّب */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none' }}><Dumbbell size={16} /></span>
            <div><div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>٢ · تدرّبي على أجزاء صغيرة</div><div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 500 }}>تمرين واحد قصير، ثم قارني بنموذج Band 8</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {cur.drills.map((d) => (
              <button key={d.id} onClick={() => { setActiveDrill(d); setAct('drill') }} className="iel-gcard" style={{ textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--iel-gold-ink, var(--iel-gold, #e6ba68))', letterSpacing: '.04em' }}>تدريب</span>
                  <MetaChip icon={Clock}>{d.minutes} د</MetaChip>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.4 }}>{d.title}</div>
                {d.brief_ar && <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.brief_ar}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* PHASE 3 — المهمة الكاملة */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span style={{ display: 'flex', width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none' }}><PenLine size={16} /></span>
            <div><div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>٣ · اكتبي مهمة كاملة</div><div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 500 }}>في بيئة الاختبار، بتقييم مفصّل بالباند</div></div>
          </div>
          {tasksQ.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 150, borderRadius: 16, background: 'color-mix(in srgb, var(--iel-surface-2) 60%, transparent)', border: '1px solid var(--iel-border)' }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {tasks.map(t => (
                <div key={t.id} style={{ position: 'relative' }}>
                  <TaskCard task={t} onSelect={handleSelectTask} />
                  {doneBy[t.id] && (
                    <span style={{ position: 'absolute', top: 12, insetInlineStart: 14, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: 'var(--iel-good)', background: 'color-mix(in srgb, var(--iel-good) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-good) 32%, transparent)', padding: '2px 8px', borderRadius: 7 }}>
                      <Check size={11} strokeWidth={3} /> {Number(doneBy[t.id].band_score).toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Full 60-min combined session */}
          {allTasks.filter(t => t.task_type === 'task1').length > 0 && allTasks.filter(t => t.task_type === 'task2').length > 0 && (
            <button onClick={() => handleSelectFull(allTasks)} style={{ marginTop: 12, width: '100%', padding: '13px', borderRadius: 12, border: '1px dashed var(--iel-border-strong, var(--iel-border))', background: 'var(--iel-surface-2)', color: 'var(--iel-ink)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
              أو جرّبي الجلسة الكاملة (٦٠ دقيقة): المهمة الأولى + الثانية معاً
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── ACT 2: EVALUATING ──────────────────────────────────────────────────────
  if (act === 'evaluating') {
    return (
      <div className="iel-root iel-exam-clinical" dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'var(--iel-ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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
    const secsLeft = Math.max(0, timeLimit * 60 - sessionElapsed)
    const wcColor = activeWc >= activeMin ? 'var(--iel-good)' : 'var(--iel-ink-3)'

    const footer = (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
        {mode === 'full' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {[['task1', 'المهمة 1'], ['task2', 'المهمة 2']].map(([k, l]) => (
              <button key={k} onClick={() => { triggerAutoSave(); setFullTab(k) }} style={{ padding: '7px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${fullTab === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: fullTab === k ? 'var(--iel-accent-soft)' : 'transparent', color: fullTab === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
            ))}
          </div>
        ) : <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 700 }}>{activeTask?.task_type === 'task1' ? 'Task 1' : 'Task 2'}</span>}
        <span style={{ fontSize: 13, fontWeight: 800, color: wcColor, fontFamily: "'IBM Plex Mono', monospace" }}>{activeWc} / {activeMin}+ كلمة</span>
      </div>
    )

    const PromptPane = (
      <div style={{ padding: isWide ? '24px 28px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.05em', marginBottom: 10, fontFamily: WSANS }}>{activeTask?.task_type === 'task1' ? 'WRITING TASK 1' : 'WRITING TASK 2'} · {activeMin}+ words</div>
        {activeTask?.image_url ? (
          <img src={activeTask.image_url} alt="task" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 240, marginBottom: 16, background: 'var(--iel-surface-2)' }} />
        ) : activeTask?.task_type === 'task1' ? (
          <div style={{ marginBottom: 16, padding: '11px 14px', borderRadius: 10, border: '1px dashed var(--iel-border-strong)', background: 'var(--iel-surface-2)', fontSize: 12.5, color: 'var(--iel-ink-3)', fontFamily: WSANS, lineHeight: 1.6, direction: 'ltr', textAlign: 'left' }}>The visual data for this task is described in the prompt below.</div>
        ) : null}
        <p style={{ margin: 0, fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: WSANS, lineHeight: 1.75, textAlign: 'left', whiteSpace: 'pre-line' }}>{activeTask?.prompt || 'Loading…'}</p>
      </div>
    )
    const EditorPane = (
      <div style={{ padding: isWide ? '20px 22px' : '16px 16px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <textarea ref={textareaRef} dir="ltr" value={activeDraft} onChange={e => activeDraftChange(e.target.value)} onBlur={() => triggerAutoSave()} placeholder="Start writing your answer here…"
          style={{ flex: 1, width: '100%', minHeight: 0, padding: '16px 18px', borderRadius: 12, resize: 'none', boxSizing: 'border-box', border: `1px solid ${activeDraft.length > 10 ? 'color-mix(in srgb, var(--iel-accent) 30%, var(--iel-border))' : 'var(--iel-border)'}`, background: 'var(--iel-surface)', color: 'var(--iel-ink)', fontSize: 15.5, fontFamily: WSANS, lineHeight: 1.7, outline: 'none' }} />
      </div>
    )

    return (
      <ExamShell sectionLabel="الكتابة" partLabel={activeTask?.title || ''} secsLeft={secsLeft} onSubmit={handleSubmit} submitting={false} submitLabel="تسليم للتقييم" onExit={handleBackToStudio} footer={footer}>
        {isWide ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', height: '100%', minHeight: 0 }}>
            <div style={{ minHeight: 0, borderInlineEnd: '1px solid var(--iel-border)' }}>{PromptPane}</div>
            <div style={{ minHeight: 0 }}>{EditorPane}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
              {[['prompt', 'المهمة'], ['editor', 'الكتابة']].map(([k, l]) => (
                <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'prompt' ? PromptPane : EditorPane}</div>
          </div>
        )}
      </ExamShell>
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
                تعذّر التقييم الآن، لكن مقالتك محفوظة وستصلكِ نتيجتك قريباً.
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
            onClick={() => { setAct('hub'); setSelectedTask(null) }}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
          >
            الكتابة
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
