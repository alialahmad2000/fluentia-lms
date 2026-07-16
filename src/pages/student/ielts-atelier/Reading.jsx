import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, ChevronLeft, CheckCircle, XCircle, RotateCcw, AlignLeft, FileText, Lock, Play, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useSubmitReadingSession, useRecentReadingSessions, useCompletedReadingSessions } from '@/hooks/ielts/useReadingLab'
import { gradeQuestions } from '@/lib/ielts/grading'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { Card, SectionHeader, Icon as UI, GalleryCard, MetaChip, LabHeader } from './_ui/primitives'
import QuestionTypesSection from './_ui/QuestionTypesSection'
import { ExamShell, QuestionPalette } from './_ui/ExamShell'
import { ExamQuestion } from './_ui/ExamQuestions'

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NARRATIVE_LINES = [
  'غرفة الدراسة.',
  'كل نص — رحلة.',
  'كل إجابة — خارطة.',
]

const DIFF_LABEL = {
  band_5_6: 'Band 5–6',
  band_6_7: 'Band 6–7',
  band_7_8: 'Band 7–8',
  band_8_9: 'Band 8–9',
}
const DIFF_COLOR = {
  band_5_6: '#4ade80',
  band_6_7: 'var(--sunset-amber)',
  band_7_8: 'var(--sunset-orange)',
  band_8_9: '#c084fc',
}

const FILTER_OPTIONS = [
  { key: null, label: 'الكل' },
  { key: 'band_5_6', label: 'Band 5–6' },
  { key: 'band_6_7', label: 'Band 6–7' },
  { key: 'band_7_8', label: 'Band 7–8' },
]

// The path ramps up in difficulty: easier passages first, hardest last.
const DIFF_ORDER = { band_5_6: 0, band_6_7: 1, band_7_8: 2, band_8_9: 3 }
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('ar', { day: 'numeric', month: 'short' })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(secs) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function parseOption(opt) {
  const m = String(opt).match(/^([A-Z]):\s*(.+)$/)
  return m ? { key: m[1], text: m[2] } : { key: opt, text: opt }
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

// ─── Data hook ───────────────────────────────────────────────────────────────

function usePublishedPassages(difficultyBand) {
  return useQuery({
    queryKey: ['v3-reading-passages', difficultyBand],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_reading_passages')
        .select('id, passage_number, title, content, word_count, topic_category, difficulty_band, test_variant, questions, answer_key, time_limit_minutes')
        .eq('is_published', true)
        .order('passage_number')
      if (difficultyBand) q = q.eq('difficulty_band', difficultyBand)
      const { data, error } = await q
      if (error) throw error
      return (data || []).filter(p => Array.isArray(p.questions) && p.questions.length > 0)
    },
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DiffBadge({ band }) {
  const color = DIFF_COLOR[band] || 'var(--ds-text-muted)'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'IBM Plex Sans', sans-serif",
      color,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {DIFF_LABEL[band] || band}
    </span>
  )
}

function PassageCard({ passage, onSelect }) {
  const qCount = passage.questions?.length || 0
  return (
    <GalleryCard onClick={() => onSelect(passage)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <DiffBadge band={passage.difficulty_band} />
        <span style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 700, letterSpacing: '.02em', textTransform: 'capitalize' }}>
          {passage.topic_category}
        </span>
      </div>
      <h3 style={{ margin: '2px 0 0', fontSize: 16.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.45, textAlign: 'start', letterSpacing: '-.01em' }}>
        {passage.title}
      </h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
        <MetaChip icon={Clock}>{passage.time_limit_minutes} دق</MetaChip>
        <MetaChip icon={AlignLeft}>{passage.word_count} كلمة</MetaChip>
        <MetaChip icon={FileText}>{qCount} سؤال</MetaChip>
      </div>
    </GalleryCard>
  )
}

function QuestionItem({ q, answer, onChange }) {
  const isTFNG = q.type === 'True/False/Not Given' || q.type === 'Yes/No/Not Given'
  const tfOptions = q.type === 'Yes/No/Not Given'
    ? ['Yes', 'No', 'Not Given']
    : ['True', 'False', 'Not Given']
  const hasMCQ = !isTFNG && Array.isArray(q.options) && q.options.length > 0
  const text = q.question_text || q.statement || q.incomplete_sentence || q.question || `السؤال ${q.question_number}`
  const answered = !!answer

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: 'color-mix(in srgb, var(--ds-surface) 60%, transparent)',
      border: `1px solid ${answered ? 'color-mix(in srgb, var(--sunset-orange) 28%, transparent)' : 'color-mix(in srgb, var(--ds-border) 55%, transparent)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'border-color 0.2s',
    }}>
      {/* Question number + text */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: answered ? 'color-mix(in srgb, var(--sunset-orange) 18%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 80%, transparent)',
          border: `1px solid ${answered ? 'var(--sunset-orange)' : 'var(--ds-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: answered ? 'var(--sunset-orange)' : 'var(--ds-text-muted)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          marginTop: 2,
          transition: 'all 0.2s',
        }}>
          {q.question_number}
        </span>
        <p style={{
          margin: 0,
          fontSize: 13.5,
          color: 'var(--ds-text)',
          fontFamily: "'Tajawal', sans-serif",
          lineHeight: 1.7,
          flex: 1,
          textAlign: 'right',
        }}>
          {text}
        </p>
      </div>

      {/* T/F/NG pills */}
      {isTFNG && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {tfOptions.map(opt => {
            const selected = answer?.toLowerCase() === opt.toLowerCase()
            return (
              <button
                key={opt}
                onClick={() => onChange(q.question_number, opt)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 70%, transparent)'}`,
                  background: selected ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'transparent',
                  color: selected ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  fontFamily: "'Tajawal', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {/* MCQ options */}
      {hasMCQ && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {q.options.map(raw => {
            const { key, text: optText } = parseOption(raw)
            const selected = answer === key
            return (
              <button
                key={key}
                onClick={() => onChange(q.question_number, key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: `1px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 60%, transparent)'}`,
                  background: selected ? 'color-mix(in srgb, var(--sunset-orange) 11%, transparent)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'right',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 80%, transparent)'}`,
                  background: selected ? 'var(--sunset-orange)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: selected ? 'var(--sunset-base-deep)' : 'var(--ds-text-muted)',
                  flexShrink: 0,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: 'all 0.15s',
                }}>
                  {key}
                </span>
                <span style={{ fontSize: 13, color: selected ? 'var(--ds-text)' : 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", flex: 1, textAlign: 'right' }}>
                  {optText}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Short answer / fill-in */}
      {!isTFNG && !hasMCQ && (
        <input
          type="text"
          value={answer || ''}
          onChange={e => onChange(q.question_number, e.target.value)}
          placeholder="اكتب إجابتك..."
          dir="ltr"
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${answer ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 60%, transparent)'}`,
            background: 'color-mix(in srgb, var(--ds-surface) 70%, transparent)',
            color: 'var(--ds-text)',
            fontSize: 14,
            fontFamily: "'IBM Plex Mono', monospace",
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />
      )}
    </div>
  )
}

// ─── Stat card helper ─────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '14px 18px',
      borderRadius: 14,
      background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)',
      border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        {label}
      </span>
      <span style={{
        fontSize: 22,
        fontWeight: 900,
        color: accent || 'var(--ds-text)',
        fontFamily: "'Playfair Display', Georgia, serif",
        lineHeight: 1,
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reading() {
  const g = useG()
  const studentId = useStudentId()
  const submitSession = useSubmitReadingSession()
  const recentQ = useRecentReadingSessions(studentId, 10)
  const doneQ = useCompletedReadingSessions(studentId)
  const isWide = useIsWide()

  const [act, setAct] = useState('library')
  const [diffFilter, setDiffFilter] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [passage, setPassage] = useState(null)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [gradeResult, setGradeResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [current, setCurrent] = useState(null)
  const [mobilePane, setMobilePane] = useState('passage')

  const passagesQ = usePublishedPassages(diffFilter)
  const timerRef = useRef(null)
  const qScrollRef = useRef(null)
  const narrativeDoneRef = useRef(false)

  // Keep submit logic in a ref so the timer can call it safely
  const submitRef = useRef(null)
  submitRef.current = function doSubmit() {
    clearInterval(timerRef.current)
    const result = gradeQuestions({
      questions: passage?.questions || [],
      answerKey: passage?.answer_key || [],
      studentAnswers: answers,
    })
    setGradeResult(result)
    if (studentId && passage) {
      const elapsed = Math.max(1, (passage.time_limit_minutes * 60) - timeLeft)
      submitSession.mutate({
        studentId,
        questionType: null,
        passageId: passage.id,
        gradeResult: result,
        durationSeconds: elapsed,
      })
    }
    setAct('results')
  }

  // Timer: starts when act becomes 'session', clears on teardown
  useEffect(() => {
    if (act !== 'session') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          submitRef.current()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [act]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectPassage(p) {
    setPassage(p)
    setAnswers({})
    setTimeLeft((p.time_limit_minutes || 20) * 60)
    setGradeResult(null)
    setShowReview(false)
    setReviewMode(false)
    setMobilePane('passage')
    const firstQ = p?.questions?.[0]?.question_number
    setCurrent(firstQ != null ? `0_${firstQ}` : null)
    setAct('session')
  }

  // Open a previously-completed passage as a read-only answer review.
  function openReview(p, session) {
    const result = session?.session_data && typeof session.session_data === 'object'
      ? session.session_data
      : { correct: session?.correct_count || 0, total: (session?.correct_count || 0) + (session?.incorrect_count || 0), band: session?.band_score, perQuestion: [] }
    setPassage(p)
    setGradeResult(result)
    setReviewMode(true)
    setShowReview(true)
    setAct('results')
  }

  function handleAnswerChange(qNum, val) {
    setAnswers(prev => ({ ...prev, [String(qNum)]: val }))
    setCurrent(`0_${qNum}`)
  }
  function jumpToQuestion(n) {
    setCurrent(`0_${n}`)
    setMobilePane('questions')
    setTimeout(() => {
      const el = (qScrollRef.current || document).querySelector(`[data-q="${n}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  const answeredCount = Object.keys(answers).length
  const totalQ = passage?.questions?.length || 0

  // ── ACT 1: PATH ─────────────────────────────────────────────────────────────
  if (act === 'library') {
    const doneMap = doneQ.data || {}
    // Ordered path — easier passages first, hardest last.
    const passages = [...(passagesQ.data || [])].sort((a, b) =>
      ((DIFF_ORDER[a.difficulty_band] ?? 9) - (DIFF_ORDER[b.difficulty_band] ?? 9)) || (a.passage_number - b.passage_number)
    )
    const doneCount = passages.filter(p => doneMap[p.id]).length
    const firstIncomplete = passages.findIndex(p => !doneMap[p.id])
    const pct = passages.length ? Math.round((doneCount / passages.length) * 100) : 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2, maxWidth: 780 }}>

        <LabHeader eyebrow="التدريب · القراءة" title="القراءة">
          نصوص أكاديمية حقيقية على مستوى الآيلتس، مرتّبة كمسار: أنهي نصّاً لينفتح التالي. تصحيح فوري وشرح لكل إجابة، وتُضاف أخطاؤك إلى بنك المراجعة.
        </LabHeader>

        <QuestionTypesSection />

        {/* Path header — progress */}
        <div>
          <SectionHeader title="مسار النصوص" />
          <Card style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--iel-ink)' }}>
                أنجزتِ <span className="iel-serif" style={{ fontSize: 20, color: 'var(--iel-accent)' }}>{doneCount}</span> من {passages.length} نص
              </div>
              {doneCount > 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>
                  أفضل Band: <span style={{ color: 'var(--iel-accent-ink)', fontWeight: 800 }}>{Math.max(...passages.map(p => Number(doneMap[p.id]?.band_score || 0))).toFixed(1)}</span>
                </div>
              )}
            </div>
            <div style={{ height: 7, borderRadius: 20, background: 'var(--iel-track)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 20, background: 'linear-gradient(90deg, var(--iel-good), var(--iel-accent))', transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
            </div>
          </Card>
        </div>

        {/* The path */}
        {passagesQ.isLoading || doneQ.isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} style={{ height: 78, borderRadius: 16, background: 'color-mix(in srgb, var(--iel-surface-2) 60%, transparent)', border: '1px solid var(--iel-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : passages.length === 0 ? (
          <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
            <BookOpen size={32} color="var(--iel-ink-3)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--iel-ink-2)', fontWeight: 600 }}>لا توجد نصوص متاحة حالياً</p>
          </Card>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {passages.map((p, i) => {
              const done = !!doneMap[p.id]
              const state = done ? 'done' : (i === firstIncomplete ? 'current' : 'locked')
              const session = doneMap[p.id]
              const qCount = p.questions?.length || 0
              const isLast = i === passages.length - 1
              const stopColor = state === 'done' ? 'var(--iel-good)' : state === 'current' ? 'var(--iel-accent)' : 'var(--iel-border-strong, var(--iel-ink-3))'
              const clickable = state !== 'locked'
              const onClick = () => { if (state === 'current') handleSelectPassage(p); else if (state === 'done') openReview(p, session) }
              return (
                <div key={p.id} style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'stretch' }}>
                  {/* rail + node */}
                  <div style={{ position: 'relative', flex: 'none', width: 34, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {!isLast && <div style={{ position: 'absolute', top: 34, bottom: -10, width: 2, background: done ? 'var(--iel-good)' : 'var(--iel-border)' }} />}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flex: 'none', zIndex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: state === 'current' ? 'var(--iel-accent)' : state === 'done' ? 'color-mix(in srgb, var(--iel-good) 18%, var(--iel-surface))' : 'var(--iel-surface-2)',
                      border: `2px solid ${stopColor}`,
                      color: state === 'current' ? '#fff' : state === 'done' ? 'var(--iel-good)' : 'var(--iel-ink-3)',
                      boxShadow: state === 'current' ? '0 0 0 4px color-mix(in srgb, var(--iel-accent) 18%, transparent)' : 'none',
                    }}>
                      {state === 'done' ? <Check size={17} strokeWidth={3} /> : state === 'locked' ? <Lock size={14} /> : <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "'IBM Plex Sans', sans-serif" }}>{i + 1}</span>}
                    </div>
                  </div>
                  {/* card */}
                  <button
                    type="button"
                    onClick={clickable ? onClick : undefined}
                    disabled={!clickable}
                    className={clickable ? 'iel-gcard' : undefined}
                    style={{
                      flex: 1, textAlign: 'start', fontFamily: "'Tajawal', sans-serif", padding: '13px 16px',
                      display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0,
                      cursor: clickable ? 'pointer' : 'default',
                      background: state === 'locked' ? 'color-mix(in srgb, var(--iel-surface) 55%, transparent)' : 'var(--iel-surface)',
                      border: `1px solid ${state === 'current' ? 'color-mix(in srgb, var(--iel-accent) 45%, var(--iel-border))' : 'var(--iel-border)'}`,
                      borderRadius: 14, opacity: state === 'locked' ? 0.62 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <DiffBadge band={p.difficulty_band} />
                      <span style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 700, textTransform: 'capitalize' }}>{p.topic_category}</span>
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.4, letterSpacing: '-.01em' }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 1 }}>
                      {state === 'done' ? (
                        <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: 'var(--iel-good)', background: 'color-mix(in srgb, var(--iel-good) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-good) 30%, transparent)', padding: '2px 9px', borderRadius: 7 }}>
                            <Check size={12} strokeWidth={3} /> Band {Number(session.band_score).toFixed(1)}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>{fmtDate(session.completed_at)} · اضغطي للمراجعة</span>
                        </>
                      ) : state === 'current' ? (
                        <>
                          <MetaChip icon={AlignLeft}>{p.word_count} كلمة</MetaChip>
                          <MetaChip icon={FileText}>{qCount} سؤال</MetaChip>
                          <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, color: 'var(--iel-accent-ink)' }}><Play size={12} fill="currentColor" /> ابدئي</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 600 }}>أنهي النص السابق ليُفتح</span>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── ACT 2: SESSION ──────────────────────────────────────────────────────────
  if (act === 'session' && passage) {
    const paras = splitParagraphs(passage.content)
    const paraLetters = paras.map((_, i) => String.fromCharCode(65 + i))
    const qs = Array.isArray(passage.questions) ? passage.questions : []
    const answeredSet = new Set(
      qs.filter(q => answers[String(q.question_number)] != null && answers[String(q.question_number)] !== '')
        .map(q => `0_${q.question_number}`)
    )
    const groups = [{ label: 'Passage 1', numbers: qs.map(q => q.question_number) }]

    const PassagePane = (
      <div style={{ padding: isWide ? '24px 30px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 18px', fontFamily: SANS, textAlign: 'left', lineHeight: 1.3 }}>{passage.title}</h2>
        {paras.map((para, i) => (
          <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 15px', fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
            <span style={{ flex: 'none', width: 16, fontWeight: 800, color: 'var(--iel-ink-2)', fontFamily: SANS, fontSize: 14 }}>{paraLetters[i]}</span>
            <span>{para}</span>
          </p>
        ))}
      </div>
    )

    const QuestionsPane = (
      <div ref={qScrollRef} style={{ padding: isWide ? '22px 24px' : '18px 16px', overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {qs.map(q => (
            <ExamQuestion key={q.question_number} q={q} value={answers[String(q.question_number)]} onChange={(v) => handleAnswerChange(q.question_number, v)} paragraphLetters={paraLetters} />
          ))}
        </div>
      </div>
    )

    return (
      <ExamShell
        sectionLabel="القراءة"
        partLabel={passage.title}
        secsLeft={timeLeft}
        onSubmit={() => submitRef.current()}
        submitting={submitSession.isPending}
        submitLabel="تسليم الإجابات"
        onExit={() => { clearInterval(timerRef.current); setAct('library') }}
        footer={<QuestionPalette groups={groups} answered={answeredSet} current={current} onJump={(gi, n) => jumpToQuestion(n)} />}
      >
        {isWide ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', minHeight: 0 }}>
            <div style={{ minHeight: 0, borderInlineStart: '1px solid var(--iel-border)', order: 2 }}>{PassagePane}</div>
            <div style={{ minHeight: 0, order: 1 }}>{QuestionsPane}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
              {[['passage', 'النص'], ['questions', 'الأسئلة']].map(([k, l]) => (
                <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'passage' ? PassagePane : QuestionsPane}</div>
          </div>
        )}
      </ExamShell>
    )
  }

  // ── ACT 3: RESULTS ──────────────────────────────────────────────────────────
  if (act === 'results' && gradeResult) {
    const { correct, total, band, perQuestion } = gradeResult

    return (
      <div dir="rtl" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            paddingTop: 32,
            padding: '40px 32px',
            borderRadius: 24,
            background: 'color-mix(in srgb, var(--sunset-base-mid) 48%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {reviewMode ? 'مراجعة · Reading' : 'Reading Result'}
          </p>
          <BandDisplay band={band} size="xl" animate />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            {correct} من {total} إجابة صحيحة
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", opacity: 0.7 }}>
            {passage.title}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ display: 'flex', gap: 12 }}
        >
          <button
            onClick={() => { setReviewMode(false); setAct('library') }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)',
              background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)',
              color: 'var(--ds-text-muted)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            المسار
          </button>
          <button
            onClick={() => handleSelectPassage(passage)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px',
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--sunset-orange) 38%, transparent)',
              background: 'color-mix(in srgb, var(--sunset-orange) 13%, transparent)',
              color: 'var(--ds-text)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            {g('حاول مرة أخرى', 'حاولي مرة أخرى')}
          </button>
        </motion.div>

        {/* Answer review toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <button
            onClick={() => setShowReview(r => !r)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, var(--ds-border) 45%, transparent)',
              background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)',
              color: 'var(--ds-text-muted)',
              fontSize: 14,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {showReview ? 'إخفاء المراجعة' : 'مراجعة الإجابات'}
          </button>

          <AnimatePresence>
            {showReview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {perQuestion.map(r => (
                  <div key={r.qNum} style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: r.isCorrect
                      ? 'color-mix(in srgb, #4ade80 7%, transparent)'
                      : 'color-mix(in srgb, #f87171 7%, transparent)',
                    border: `1px solid ${r.isCorrect ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'}`,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ flexShrink: 0, marginTop: 3 }}>
                      {r.isCorrect
                        ? <CheckCircle size={15} color="#4ade80" />
                        : <XCircle size={15} color="#f87171" />}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <p style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--ds-text)',
                        fontFamily: "'Tajawal', sans-serif",
                        lineHeight: 1.65,
                      }}>
                        {r.text}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                        إجابتك:{' '}
                        <span style={{ color: r.isCorrect ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                          {r.given || '—'}
                        </span>
                        {!r.isCorrect && (
                          <>
                            {' '}· الصحيح:{' '}
                            <span style={{ color: '#4ade80', fontWeight: 700 }}>{r.expected}</span>
                          </>
                        )}
                      </p>
                      {r.explanation && !r.isCorrect && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6 }}>
                          {r.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  return null
}
