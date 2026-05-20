import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, ChevronLeft, Play, Pause, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useListeningSection, useSubmitListeningSession, useRecentListeningSessions } from '@/hooks/ielts/useListeningLab'
import { gradeQuestions } from '@/lib/ielts/grading'
import { supabase } from '@/lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const NARRATIVE_LINES = [
  'قاعة الاستماع.',
  'كل صوت — قصة.',
  'كل كلمة — فرصة.',
]

const SECTION_ICONS = { 1: '🗣️', 2: '🎤', 3: '🎓', 4: '📚' }
const SECTION_LABELS = {
  1: 'القسم الأول',
  2: 'القسم الثاني',
  3: 'القسم الثالث',
  4: 'القسم الرابع',
}
const ACCENT_DISPLAY = {
  british: '🇬🇧 British',
  american: '🇺🇸 American',
  australian: '🇦🇺 Australian',
  mixed: 'Mixed',
}
const FILTER_OPTIONS = [
  { key: null, label: 'الكل' },
  { key: 1, label: 'القسم ١' },
  { key: 2, label: 'القسم ٢' },
  { key: 3, label: 'القسم ٣' },
  { key: 4, label: 'القسم ٤' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// Listening-specific band table (IELTS official approximate)
function getBandFromRaw(correct, total) {
  if (!total) return null
  const scaled = Math.round((correct / total) * 40)
  const table = [
    [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0],
    [26, 6.5], [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5],
    [10, 4.0], [8, 3.5], [6, 3.0], [0, 2.5],
  ]
  for (const [threshold, band] of table) {
    if (scaled >= threshold) return band
  }
  return 2.5
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

// ─── Data hook (flat list of published sections) ──────────────────────────────

function usePublishedSections(sectionNumFilter) {
  return useQuery({
    queryKey: ['v3-listening-sections', sectionNumFilter],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_listening_sections')
        .select('id, section_number, title, accent, audio_duration_seconds, context_description, speaker_count, questions')
        .eq('is_published', true)
        .order('section_number')
        .order('sort_order')
      if (sectionNumFilter) q = q.eq('section_number', sectionNumFilter)
      const { data, error } = await q
      if (error) throw error
      return (data || []).map(s => ({
        ...s,
        questionCount: Array.isArray(s.questions) ? s.questions.length : 0,
      }))
    },
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccentBadge({ accent }) {
  const label = ACCENT_DISPLAY[accent?.toLowerCase()] || accent || ''
  if (!label) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: 'var(--ds-text-muted)',
      background: 'color-mix(in srgb, var(--ds-surface) 80%, transparent)',
      border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)',
    }}>
      {label}
    </span>
  )
}

function SectionCard({ section, onSelect }) {
  const num = section.section_number
  const durationMins = section.audio_duration_seconds
    ? Math.ceil(section.audio_duration_seconds / 60)
    : null

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(section)}
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
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{SECTION_ICONS[num] || '🎧'}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'var(--sunset-orange)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {SECTION_LABELS[num] || `Section ${num}`}
          </span>
        </div>
        <AccentBadge accent={section.accent} />
      </div>

      {/* Title */}
      <h3 style={{
        margin: 0,
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--ds-text)',
        fontFamily: "'Tajawal', sans-serif",
        lineHeight: 1.5,
        textAlign: 'right',
      }}>
        {section.title}
      </h3>

      {/* Context */}
      {section.context_description && (
        <p style={{
          margin: 0,
          fontSize: 12,
          color: 'var(--ds-text-muted)',
          fontFamily: "'Tajawal', sans-serif",
          lineHeight: 1.6,
          textAlign: 'right',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {section.context_description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {durationMins && (
          <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            🕐 {durationMins} دق
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          📝 {section.questionCount} سؤال
        </span>
        {section.speaker_count > 1 && (
          <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            👥 {section.speaker_count} متحدثين
          </span>
        )}
      </div>
    </motion.button>
  )
}

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

function AudioPlayer({ audioRef, isPlaying, currentTime, duration, playbackSpeed, started, onStart, onPlayPause, onSeek, onReplay, onSpeedChange }) {
  if (!started) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: 16,
          border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)',
          background: 'color-mix(in srgb, var(--sunset-orange) 16%, var(--sunset-base-mid))',
          color: 'var(--ds-text)',
          fontSize: 17,
          fontWeight: 900,
          fontFamily: "'Tajawal', sans-serif",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <Headphones size={20} />
        ابدأ الاستماع
      </motion.button>
    )
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 18,
      background: 'color-mix(in srgb, var(--sunset-base-mid) 45%, transparent)',
      border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Scrub bar */}
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'color-mix(in srgb, var(--ds-border) 40%, transparent)', cursor: 'pointer' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--sunset-orange)',
          borderRadius: 99,
          transition: 'width 0.25s linear',
          pointerEvents: 'none',
        }} />
        <input
          type="range"
          min={0}
          max={Math.floor(duration) || 100}
          value={Math.floor(currentTime)}
          step={1}
          onChange={e => onSeek(Number(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Replay */}
        <button
          onClick={onReplay}
          title="إعادة من البداية"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)',
            background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)',
            color: 'var(--ds-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <RotateCcw size={14} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            border: '1px solid color-mix(in srgb, var(--sunset-orange) 45%, transparent)',
            background: 'color-mix(in srgb, var(--sunset-orange) 18%, transparent)',
            color: 'var(--ds-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {isPlaying ? <Pause size={19} /> : <Play size={19} />}
        </button>

        {/* Time */}
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: 'var(--ds-text-muted)',
          minWidth: 88,
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Speed */}
        <div style={{ marginRight: 'auto', display: 'flex', gap: 4 }}>
          {[0.75, 1, 1.25].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              style={{
                padding: '3px 7px',
                borderRadius: 6,
                border: `1px solid ${playbackSpeed === s ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`,
                background: playbackSpeed === s ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'transparent',
                color: playbackSpeed === s ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                fontSize: 11,
                fontWeight: playbackSpeed === s ? 700 : 500,
                fontFamily: "'IBM Plex Sans', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuestionItem({ q, answer, onChange }) {
  const isMCQ = q.type === 'mcq' || q.type === 'MCQ'
  const hasOptions = Array.isArray(q.options) && q.options.length > 0
  // MCQ options are letter-only ["A","B","C","D"]; matching options are text phrases
  const isLetterMCQ = isMCQ && hasOptions && q.options.every(o => /^[A-Z]$/.test(String(o)))
  const isMatching = !isMCQ && hasOptions
  const text = q.text || q.question_text || q.statement || `السؤال ${q.number}`
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
      {/* Number + text */}
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
          {q.number}
        </span>
        <div style={{ flex: 1 }}>
          {q.instruction && (
            <p style={{
              margin: '0 0 4px',
              fontSize: 11,
              color: 'var(--ds-text-muted)',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontStyle: 'italic',
              direction: 'ltr',
              textAlign: 'left',
            }}>
              {q.instruction}
            </p>
          )}
          <p style={{
            margin: 0,
            fontSize: 13.5,
            color: 'var(--ds-text)',
            fontFamily: "'Tajawal', sans-serif",
            lineHeight: 1.7,
            textAlign: 'right',
          }}>
            {text}
          </p>
        </div>
      </div>

      {/* MCQ: letter circles A B C D */}
      {isLetterMCQ && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {q.options.map(opt => {
            const selected = answer === opt
            return (
              <button
                key={opt}
                onClick={() => onChange(q.number, opt)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 70%, transparent)'}`,
                  background: selected ? 'color-mix(in srgb, var(--sunset-orange) 18%, transparent)' : 'transparent',
                  color: selected ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  fontFamily: "'IBM Plex Sans', sans-serif",
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

      {/* Matching / MCQ with text options: pill buttons */}
      {(isMatching || (isMCQ && hasOptions && !isLetterMCQ)) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {q.options.map(opt => {
            const selected = answer?.toLowerCase() === String(opt).toLowerCase()
            return (
              <button
                key={opt}
                onClick={() => onChange(q.number, opt)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: `1px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 60%, transparent)'}`,
                  background: selected ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'transparent',
                  color: selected ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  fontFamily: "'IBM Plex Sans', sans-serif",
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

      {/* Text input: all fill-in types */}
      {!isLetterMCQ && !isMatching && !(isMCQ && hasOptions) && (
        <input
          type="text"
          value={answer || ''}
          onChange={e => onChange(q.number, e.target.value)}
          placeholder="..."
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Listening() {
  const studentId = useStudentId()
  const isWide = useIsWide()

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [act, setAct] = useState('hall')
  const [selectedSection, setSelectedSection] = useState(null)
  const [sectionFilter, setSectionFilter] = useState(null)
  const [answers, setAnswers] = useState({})
  const [gradeResult, setGradeResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [audioStarted, setAudioStarted] = useState(false)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  // ── 2. useRef ──────────────────────────────────────────────────────────────
  const audioRef = useRef(null)
  const elapsedTimerRef = useRef(null)
  const narrativeDoneRef = useRef(false)
  const submitRef = useRef(null)

  // ── 3. useQuery / useMutation ──────────────────────────────────────────────
  const hallQ = usePublishedSections(sectionFilter)
  const sectionQ = useListeningSection(selectedSection?.id)
  const recentQ = useRecentListeningSessions(studentId, 10)
  const submitMut = useSubmitListeningSession()

  // ── 4. useEffect ───────────────────────────────────────────────────────────

  // Elapsed session timer
  useEffect(() => {
    if (act !== 'session') {
      clearInterval(elapsedTimerRef.current)
      return
    }
    elapsedTimerRef.current = setInterval(() => setSessionElapsed(t => t + 1), 1000)
    return () => clearInterval(elapsedTimerRef.current)
  }, [act])

  // Sync playback speed to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

  // Audio event listeners — re-attach whenever act or section data changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setAudioCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setAudioDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [act, sectionQ.data])

  // ── 5. submitRef (refreshed every render for stable closure) ───────────────
  submitRef.current = function doSubmit() {
    clearInterval(elapsedTimerRef.current)
    if (audioRef.current) { audioRef.current.pause() }
    setIsPlaying(false)

    const section = sectionQ.data
    if (!section) return

    const result = gradeQuestions({
      questions: section.questions || [],
      answerKey: section.answer_key || {},
      studentAnswers: answers,
    })
    result.band = getBandFromRaw(result.correct, result.total)

    setGradeResult(result)
    if (studentId) {
      submitMut.mutate({
        studentId,
        sectionId: section.id,
        sectionNumber: section.section_number,
        gradeResult: result,
        durationSeconds: Math.max(1, sessionElapsed),
      })
    }
    setAct('results')
  }

  // ── Audio handlers ─────────────────────────────────────────────────────────

  function handleStart() {
    setAudioStarted(true)
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})
  }

  function handlePlayPause() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  function handleSeek(val) {
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setAudioCurrentTime(val)
    }
  }

  function handleReplay() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      setAudioCurrentTime(0)
    }
  }

  function handleAnswerChange(qNum, val) {
    setAnswers(prev => ({ ...prev, [String(qNum)]: val }))
    setConfirmSubmit(false)
  }

  function handleSelectSection(s) {
    setSelectedSection(s)
    setAnswers({})
    setGradeResult(null)
    setShowReview(false)
    setIsPlaying(false)
    setAudioCurrentTime(0)
    setAudioDuration(0)
    setAudioStarted(false)
    setPlaybackSpeed(1)
    setSessionElapsed(0)
    setConfirmSubmit(false)
    setAct('session')
  }

  function handleBackToHall() {
    clearInterval(elapsedTimerRef.current)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    setIsPlaying(false)
    setAct('hall')
  }

  const section = sectionQ.data
  const questions = section?.questions || []
  const answeredCount = Object.keys(answers).length
  const totalQ = questions.length

  // ── ACT 1: HALL ────────────────────────────────────────────────────────────
  if (act === 'hall') {
    const sections = hallQ.data || []
    const recentSessions = recentQ.data || []
    const bestBand = recentSessions.length > 0
      ? Math.max(...recentSessions.map(s => Number(s.band_score || 0)))
      : null

    return (
      <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 36 }}>

        {/* Narrative — only on first mount */}
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

        {/* Stats strip */}
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

        {/* Section filter pills */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {FILTER_OPTIONS.map(o => {
            const active = sectionFilter === o.key
            return (
              <button
                key={String(o.key)}
                onClick={() => setSectionFilter(o.key)}
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
          {!hallQ.isLoading && (
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", marginRight: 'auto' }}>
              {sections.length} قسم متاح
            </span>
          )}
        </motion.section>

        {/* Section grid */}
        {hallQ.isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} style={{
                height: 180,
                borderRadius: 18,
                background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)',
              }} />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '40px 24px',
              borderRadius: 20,
              background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)',
              textAlign: 'center',
            }}
          >
            <Headphones size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
              لا توجد أقسام لهذا الفلتر حالياً
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}
          >
            {sections.map(s => (
              <SectionCard key={s.id} section={s} onSelect={handleSelectSection} />
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  // ── ACT 2: SESSION ─────────────────────────────────────────────────────────
  if (act === 'session') {
    return (
      <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>

        {/* Hidden audio element — rendered when section data is loaded */}
        {section?.audio_url && (
          <audio ref={audioRef} src={section.audio_url} preload="metadata" />
        )}

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
            onClick={handleBackToHall}
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
            القاعة
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
            {section?.title || selectedSection?.title || '...'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {answeredCount}/{totalQ}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatTime(sessionElapsed)}
            </span>
          </div>
        </div>

        {/* Loading skeleton */}
        {sectionQ.isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[200, 120, 180, 120].map((h, i) => (
              <div key={i} style={{
                height: h,
                borderRadius: 18,
                background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ds-border) 30%, transparent)',
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isWide ? '320px 1fr' : '1fr',
            gap: 20,
            alignItems: 'start',
          }}>
            {/* ── Left: Audio panel ── */}
            <div style={{
              position: isWide ? 'sticky' : 'static',
              top: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              {/* Section info card */}
              <div style={{
                padding: '16px 18px',
                borderRadius: 16,
                background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)',
                border: '1px solid color-mix(in srgb, var(--sunset-amber) 16%, transparent)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{SECTION_ICONS[section?.section_number] || '🎧'}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--sunset-orange)',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {SECTION_LABELS[section?.section_number]}
                  </span>
                  {section?.accent && <AccentBadge accent={section.accent} />}
                </div>
                {section?.context_description && (
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--ds-text-muted)',
                    fontFamily: "'Tajawal', sans-serif",
                    lineHeight: 1.6,
                    textAlign: 'right',
                  }}>
                    {section.context_description}
                  </p>
                )}
              </div>

              {/* Audio player */}
              <AudioPlayer
                audioRef={audioRef}
                isPlaying={isPlaying}
                currentTime={audioCurrentTime}
                duration={audioDuration}
                playbackSpeed={playbackSpeed}
                started={audioStarted}
                onStart={handleStart}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onReplay={handleReplay}
                onSpeedChange={speed => setPlaybackSpeed(speed)}
              />

              {/* Answer progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                    الإجابات
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    {answeredCount} / {totalQ}
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'color-mix(in srgb, var(--ds-border) 35%, transparent)', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%', borderRadius: 99, background: 'var(--sunset-orange)' }}
                  />
                </div>
              </div>

              {/* Submit — with inline confirmation when partial */}
              <AnimatePresence mode="wait">
                {confirmSubmit && answeredCount < totalQ ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: 'color-mix(in srgb, var(--sunset-amber) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--sunset-amber) 28%, transparent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>
                      {totalQ - answeredCount} سؤال بلا إجابة — هل تريدين الإرسال الآن؟
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setConfirmSubmit(false)}
                        style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
                      >
                        تراجع
                      </button>
                      <button
                        onClick={() => submitRef.current()}
                        style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 15%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}
                      >
                        إرسال
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="submit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      if (answeredCount === 0) return
                      if (answeredCount < totalQ) { setConfirmSubmit(true); return }
                      submitRef.current()
                    }}
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
                )}
              </AnimatePresence>
            </div>

            {/* ── Right: Questions panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map(q => (
                <QuestionItem
                  key={q.number}
                  q={q}
                  answer={answers[String(q.number)]}
                  onChange={handleAnswerChange}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ACT 3: RESULTS ─────────────────────────────────────────────────────────
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
            Listening Result
          </p>
          <BandDisplay band={band} size="xl" animate />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            {correct} من {total} إجابة صحيحة
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", opacity: 0.7 }}>
            {section?.title || selectedSection?.title}
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
            onClick={() => setAct('hall')}
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
            القاعة
          </button>
          <button
            onClick={() => handleSelectSection(selectedSection)}
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
            محاولة أخرى
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
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.65 }}>
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
