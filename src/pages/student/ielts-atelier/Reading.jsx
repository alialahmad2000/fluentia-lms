import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, ChevronLeft, CheckCircle, XCircle, RotateCcw, AlignLeft, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useSubmitReadingSession, useRecentReadingSessions } from '@/hooks/ielts/useReadingLab'
import { gradeQuestions } from '@/lib/ielts/grading'
import { supabase } from '@/lib/supabase'

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
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(passage)}
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
        <DiffBadge band={passage.difficulty_band} />
        <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          {passage.topic_category}
        </span>
      </div>

      <h3 style={{
        margin: 0,
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--ds-text)',
        fontFamily: "'Tajawal', sans-serif",
        lineHeight: 1.5,
        textAlign: 'right',
      }}>
        {passage.title}
      </h3>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          <Clock size={11} />
          {passage.time_limit_minutes} دق
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          <AlignLeft size={11} />
          {passage.word_count} كلمة
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          <FileText size={11} />
          {qCount} سؤال
        </span>
      </div>
    </motion.button>
  )
}

function QuestionItem({ q, answer, onChange }) {
  const isTFNG = q.type === 'True/False/Not Given' || q.type === 'Yes/No/Not Given'
  const tfOptions = q.type === 'Yes/No/Not Given'
    ? ['Yes', 'No', 'Not Given']
    : ['True', 'False', 'Not Given']
  const hasMCQ = !isTFNG && Array.isArray(q.options) && q.options.length > 0
  const text = q.question_text || q.statement || `السؤال ${q.question_number}`
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
  const studentId = useStudentId()
  const submitSession = useSubmitReadingSession()
  const recentQ = useRecentReadingSessions(studentId, 10)
  const isWide = useIsWide()

  const [act, setAct] = useState('library')
  const [diffFilter, setDiffFilter] = useState(null)
  const [passage, setPassage] = useState(null)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [gradeResult, setGradeResult] = useState(null)
  const [showReview, setShowReview] = useState(false)

  const passagesQ = usePublishedPassages(diffFilter)
  const timerRef = useRef(null)
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
    setAct('session')
  }

  function handleAnswerChange(qNum, val) {
    setAnswers(prev => ({ ...prev, [String(qNum)]: val }))
  }

  const answeredCount = Object.keys(answers).length
  const totalQ = passage?.questions?.length || 0

  // ── ACT 1: LIBRARY ──────────────────────────────────────────────────────────
  if (act === 'library') {
    const recentSessions = recentQ.data || []
    const bestBand = recentSessions.length > 0
      ? Math.max(...recentSessions.map(s => Number(s.band_score || 0)))
      : null
    const passages = passagesQ.data || []

    return (
      <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* Narrative opening — only first mount */}
        {!narrativeDoneRef.current && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{ paddingTop: 32 }}
          >
            <NarrativeReveal
              lines={NARRATIVE_LINES}
              delayBetweenLines={700}
              pauseAfterLast={400}
              onComplete={() => { narrativeDoneRef.current = true }}
            />
          </motion.section>
        )}

        {/* Stats strip — only if sessions exist */}
        {recentSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            style={{ display: 'flex', gap: 12 }}
          >
            <StatCard label="جلسات مكتملة" value={recentSessions.length} />
            {bestBand != null && (
              <StatCard label="أفضل Band" value={bestBand.toFixed(1)} accent="var(--sunset-orange)" />
            )}
          </motion.section>
        )}

        {/* Filter pills + count */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {FILTER_OPTIONS.map(o => {
            const active = diffFilter === o.key
            return (
              <button
                key={String(o.key)}
                onClick={() => setDiffFilter(o.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 55%, transparent)'}`,
                  background: active ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 50%, transparent)',
                  color: active ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "'Tajawal', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {o.label}
              </button>
            )
          })}
          {!passagesQ.isLoading && (
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", marginRight: 'auto' }}>
              {passages.length} نص متاح
            </span>
          )}
        </motion.section>

        {/* Passage grid */}
        {passagesQ.isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{
                height: 130,
                borderRadius: 18,
                background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : passages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              padding: '40px 24px',
              borderRadius: 20,
              background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)',
              textAlign: 'center',
            }}
          >
            <BookOpen size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
              لا توجد نصوص لهذا المستوى حالياً
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}
          >
            {passages.map(p => (
              <PassageCard key={p.id} passage={p} onSelect={handleSelectPassage} />
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  // ── ACT 2: SESSION ──────────────────────────────────────────────────────────
  if (act === 'session' && passage) {
    const urgent = timeLeft > 0 && timeLeft < 120

    return (
      <div dir="rtl" style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: 60 }}>

        {/* Session header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0 16px',
          marginBottom: 20,
          borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => { clearInterval(timerRef.current); setAct('library') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
              fontSize: 13,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={13} />
            المكتبة
          </button>

          <h2 style={{
            margin: 0,
            flex: 1,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--ds-text)',
            fontFamily: "'Tajawal', sans-serif",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {passage.title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {answeredCount}/{totalQ}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 20,
              background: urgent
                ? 'color-mix(in srgb, #f87171 11%, transparent)'
                : 'color-mix(in srgb, var(--ds-surface) 55%, transparent)',
              border: `1px solid ${urgent ? 'rgba(248,113,113,0.3)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`,
              transition: 'all 0.3s',
            }}>
              <Clock size={13} color={urgent ? '#f87171' : 'var(--ds-text-muted)'} />
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                color: urgent ? '#f87171' : 'var(--ds-text)',
                minWidth: 40,
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isWide ? 'minmax(0, 1.1fr) minmax(0, 0.9fr)' : '1fr',
          gap: 20,
          alignItems: 'start',
        }}>
          {/* ── Passage panel ── */}
          <div style={{
            borderRadius: 20,
            background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-amber) 16%, transparent)',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 28%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <DiffBadge band={passage.difficulty_band} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                  {passage.topic_category}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                  {passage.word_count} كلمة
                </span>
              </div>
            </div>
            <div style={{
              padding: '22px 26px',
              maxHeight: isWide ? '68vh' : '40vh',
              overflowY: 'auto',
              lineHeight: 2.1,
              fontSize: 14.5,
              color: 'var(--ds-text)',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Georgia', serif",
              direction: 'ltr',
              textAlign: 'left',
              letterSpacing: '0.01em',
            }}>
              {passage.content}
            </div>
          </div>

          {/* ── Questions panel ── */}
          <div style={{
            position: isWide ? 'sticky' : 'static',
            top: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              maxHeight: isWide ? '72vh' : 'none',
              overflowY: isWide ? 'auto' : 'visible',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingLeft: 2,
              paddingBottom: 4,
            }}>
              {(passage.questions || []).map(q => (
                <QuestionItem
                  key={q.question_number}
                  q={q}
                  answer={answers[String(q.question_number)]}
                  onChange={handleAnswerChange}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div style={{
              height: 3,
              borderRadius: 99,
              background: 'color-mix(in srgb, var(--ds-border) 35%, transparent)',
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
                style={{ height: '100%', borderRadius: 99, background: 'var(--sunset-orange)' }}
              />
            </div>

            {/* Submit button */}
            <motion.button
              onClick={() => submitRef.current()}
              disabled={answeredCount === 0}
              whileHover={answeredCount > 0 ? { scale: 1.01 } : undefined}
              whileTap={answeredCount > 0 ? { scale: 0.99 } : undefined}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: `1px solid color-mix(in srgb, var(--sunset-orange) ${answeredCount > 0 ? 45 : 18}%, transparent)`,
                background: answeredCount > 0
                  ? 'color-mix(in srgb, var(--sunset-orange) 18%, var(--sunset-base-mid))'
                  : 'color-mix(in srgb, var(--ds-surface) 35%, transparent)',
                color: answeredCount > 0 ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                fontSize: 16,
                fontWeight: 900,
                fontFamily: "'Tajawal', sans-serif",
                cursor: answeredCount > 0 ? 'pointer' : 'not-allowed',
                opacity: answeredCount > 0 ? 1 : 0.5,
                transition: 'all 0.2s',
              }}
            >
              تسليم الإجابات ({answeredCount}/{totalQ})
            </motion.button>
          </div>
        </div>
      </div>
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
            Reading Result
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
            onClick={() => setAct('library')}
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
            المكتبة
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
            حاولي مرة أخرى
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
