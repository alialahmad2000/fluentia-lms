// IELTS V3 Phase 3.4 — Speaking Lab (self-contained)
// Three-act: Booth (gallery) → Session (recording) → Results (feedback)

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, ChevronLeft, RotateCcw, Play, Square, AlertTriangle, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'

// ─── Constants ────────────────────────────────────────────────────────────────

const SUCCESS = '#4ade80'
const DANGER  = '#f87171'
const BUCKET  = 'ielts-speaking-submissions'

const NARRATIVE_LINES = [
  'كابينة التحدث.',
  'كل كلمة — حضور.',
  'كل جواب — خطوة.',
]

const PART_META = {
  1: { label: 'الجزء الأول', desc: 'مقدمة ومحادثة', icon: '🗣️', maxRecSec: 40, minRecSec: 8 },
  2: { label: 'الجزء الثاني', desc: 'بطاقة الموضوع — ١ دقيقة تحضير', icon: '🎤', maxRecSec: 120, minRecSec: 45, prepSec: 60 },
  3: { label: 'الجزء الثالث', desc: 'نقاش موسّع', icon: '🎓', maxRecSec: 60, minRecSec: 15 },
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']

const BAND_CRITERIA = [
  { key: 'fluency_coherence',  label: 'Fluency & Coherence' },
  { key: 'lexical_resource',   label: 'Lexical Resource' },
  { key: 'grammatical_range',  label: 'Grammatical Range & Accuracy' },
  { key: 'pronunciation',      label: 'Pronunciation' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function getExt(mimeType) {
  if (mimeType?.includes('mp4')) return 'mp4'
  if (mimeType?.includes('wav')) return 'wav'
  return 'webm'
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

// ─── Evaluation wrapper (upload × 3, eval × 5 retries) ───────────────────────

async function uploadWithRetry(blob, path, mimeType) {
  const delays = [2000, 4000]
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mimeType, upsert: false })
      if (error) throw error
      return path
    } catch (e) {
      if (attempt === 2) throw e
      await new Promise(r => setTimeout(r, delays[attempt]))
    }
  }
}

async function evaluateWithRetry(payload, onAttempt) {
  const delays = [2000, 4000, 8000, 16000, 32000]
  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    onAttempt(attempt + 1)
    try {
      const { data, error } = await invokeWithRetry(
        'evaluate-ielts-speaking',
        { body: payload },
        { timeoutMs: 180000, retries: 0 }
      )
      if (error) throw new Error(error)
      if (!data?.overall_band) throw new Error('Malformed response')
      return { ok: true, data }
    } catch (e) {
      lastError = e.message || String(e)
      console.warn(`[Speaking] eval attempt ${attempt + 1} failed:`, lastError)
      if (attempt < 4) await new Promise(r => setTimeout(r, delays[attempt]))
    }
  }
  return { ok: false, queued: true, error: lastError }
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function usePublishedQuestions(part) {
  return useQuery({
    queryKey: ['v3-speaking-questions', part],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_speaking_questions')
        .select('id, part, topic, questions, cue_card, useful_phrases')
        .eq('is_published', true)
        .eq('part', part)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

function useRecentSessions(studentId) {
  return useQuery({
    queryKey: ['v3-speaking-sessions', studentId],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('id, question_type, band_score, completed_at')
        .eq('student_id', studentId)
        .eq('skill_type', 'speaking')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(12)
      if (error) throw error
      return data || []
    },
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BoothCard({ row, onSelect }) {
  const meta = PART_META[row.part]
  const qCount = Array.isArray(row.questions) ? row.questions.length : 0
  return (
    <motion.button
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(row)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: '18px 20px', borderRadius: 18, width: '100%',
        border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)',
        background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)',
        backdropFilter: 'blur(8px)', cursor: 'pointer', textAlign: 'right', transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-orange) 40%, transparent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--sunset-amber) 18%, transparent)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {meta.label}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          🎙️ {qCount} سؤال
        </span>
      </div>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.5, textAlign: 'right' }}>
        {row.topic}
      </h3>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        {meta.desc}
      </p>
    </motion.button>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: accent || 'var(--ds-text)', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}>{value}</span>
    </div>
  )
}

function QuestionNav({ questions, currentIdx, recordings }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {questions.map((_, i) => {
        const done = !!recordings[i]
        const active = i === currentIdx
        return (
          <div key={i} style={{
            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif",
            background: done ? `color-mix(in srgb, ${SUCCESS} 12%, transparent)` : active ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 50%, transparent)',
            border: `1.5px solid ${done ? SUCCESS : active ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`,
            color: done ? SUCCESS : active ? 'var(--sunset-orange)' : 'var(--ds-text-muted)',
          }}>
            {done ? '✓' : i + 1}
          </div>
        )
      })}
    </div>
  )
}

function MicButton({ state, onStart, onStop }) {
  const isRecording = state === 'recording'
  return (
    <motion.button
      onClick={isRecording ? onStop : onStart}
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      animate={isRecording ? { boxShadow: ['0 0 0 0px rgba(239,68,68,0.4)', '0 0 0 18px rgba(239,68,68,0)'] } : {}}
      transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
      style={{
        width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${isRecording ? DANGER : 'color-mix(in srgb, var(--sunset-orange) 50%, transparent)'}`,
        background: isRecording ? `color-mix(in srgb, ${DANGER} 18%, transparent)` : 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)',
        color: isRecording ? DANGER : 'var(--ds-text)', cursor: 'pointer',
      }}
    >
      {isRecording ? <Square size={28} /> : <Mic size={28} />}
    </motion.button>
  )
}

function ProcessingScreen({ stage, attempt }) {
  const stages = [
    { key: 'upload',   label: 'رفع التسجيلات...' },
    { key: 'evaluate', label: 'التقييم والتحليل...' },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
      dir="rtl"
    >
      <Loader2 size={44} color="var(--sunset-orange)" style={{ animation: 'spin 1.2s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
        جاري المعالجة…
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
        {stages.map(s => (
          <div key={s.key} style={{
            padding: '10px 16px', borderRadius: 10,
            background: stage === s.key ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 40%, transparent)',
            border: `1px solid ${stage === s.key ? 'color-mix(in srgb, var(--sunset-orange) 30%, transparent)' : 'color-mix(in srgb, var(--ds-border) 30%, transparent)'}`,
          }}>
            <span style={{ fontSize: 13, fontFamily: "'Tajawal', sans-serif", color: stage === s.key ? 'var(--ds-text)' : 'var(--ds-text-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {stage === 'evaluate' && attempt > 1 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          المحاولة {attempt} / 5
        </p>
      )}
    </motion.div>
  )
}

function CriterionCard({ label, score }) {
  const [open, setOpen] = useState(false)
  const color = score >= 7 ? SUCCESS : score >= 5.5 ? 'var(--sunset-amber)' : DANGER
  return (
    <div style={{ padding: '14px 16px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "'Playfair Display', Georgia, serif" }}>
        {score?.toFixed(1) ?? '—'}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Speaking() {
  const studentId = useStudentId()
  const isWide = useIsWide()
  const qc = useQueryClient()

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [act, setAct]                   = useState('booth')
  const [selectedPart, setSelectedPart] = useState(1)
  const [selectedRow, setSelectedRow]   = useState(null)
  const [currentQIdx, setCurrentQIdx]   = useState(0)
  const [recordings, setRecordings]     = useState({})      // { qIdx: { blob, url, mimeType, ext } }
  const [recState, setRecState]         = useState('idle')  // idle | recording | preview
  const [currentBlob, setCurrentBlob]   = useState(null)    // { blob, url, mimeType, ext }
  const [recElapsed, setRecElapsed]     = useState(0)
  const [prepElapsed, setPrepElapsed]   = useState(0)
  const [prepDone, setPrepDone]         = useState(false)
  const [mimeType, setMimeType]         = useState(null)
  const [micError, setMicError]         = useState(null)
  const [procStage, setProcStage]       = useState('upload')
  const [evalAttempt, setEvalAttempt]   = useState(0)
  const [gradeResult, setGradeResult]   = useState(null)
  const [playbackUrls, setPlaybackUrls] = useState([])
  const [evalQueued, setEvalQueued]     = useState(false)
  const [sessionId, setSessionId]       = useState(null)
  const [narrativeDone, setNarrativeDone] = useState(false)

  // ── 2. useRef ──────────────────────────────────────────────────────────────
  const recorderRef   = useRef(null)
  const streamRef     = useRef(null)
  const chunksRef     = useRef([])
  const recTimerRef   = useRef(null)
  const prepTimerRef  = useRef(null)
  const blobUrlsRef   = useRef([])       // for revokeObjectURL on unmount

  // ── 3. useQuery ───────────────────────────────────────────────────────────
  const questionsQ = usePublishedQuestions(selectedPart)
  const recentQ    = useRecentSessions(studentId)

  // ── 4. useEffect ───────────────────────────────────────────────────────────

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u))
      clearInterval(recTimerRef.current)
      clearInterval(prepTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-stop recording when max time reached
  useEffect(() => {
    if (recState !== 'recording') return
    const meta = PART_META[selectedRow?.part || 1]
    if (recElapsed >= meta.maxRecSec) stopRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recElapsed])

  // Recording timer
  useEffect(() => {
    if (recState !== 'recording') { clearInterval(recTimerRef.current); return }
    setRecElapsed(0)
    recTimerRef.current = setInterval(() => setRecElapsed(t => t + 1), 1000)
    return () => clearInterval(recTimerRef.current)
  }, [recState])

  // Prep timer (Part 2 only)
  useEffect(() => {
    if (act !== 'session' || selectedRow?.part !== 2 || prepDone) return
    setPrepElapsed(0)
    prepTimerRef.current = setInterval(() => setPrepElapsed(t => {
      if (t + 1 >= 60) { setPrepDone(true); clearInterval(prepTimerRef.current) }
      return t + 1
    }), 1000)
    return () => clearInterval(prepTimerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act])

  // ── 5. useCallback ─────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mime = MIME_CANDIDATES.find(m => {
        try { return MediaRecorder.isTypeSupported(m) } catch { return false }
      }) || 'audio/webm'
      setMimeType(mime)

      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime })
        if (blob.size > 25 * 1024 * 1024) {
          setMicError('التسجيل أكبر من ٢٥ ميجا. جرّب إجابة أقصر.')
          stopStream()
          setRecState('idle')
          return
        }
        const url = URL.createObjectURL(blob)
        blobUrlsRef.current.push(url)
        setCurrentBlob({ blob, url, mimeType: mime, ext: getExt(mime) })
        setRecState('preview')
        stopStream()
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setRecState('recording')
    } catch (e) {
      const msg = e.name === 'NotAllowedError'
        ? 'لم يتم السماح بالوصول للميكروفون. فعّله من إعدادات المتصفح.'
        : e.name === 'NotFoundError'
        ? 'لم نجد ميكروفوناً متصلاً.'
        : `خطأ في التسجيل: ${e.message}`
      setMicError(msg)
    }
  }, [stopStream])

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
    clearInterval(recTimerRef.current)
  }, [])

  const commitRecording = useCallback(() => {
    if (!currentBlob) return
    setRecordings(prev => ({ ...prev, [currentQIdx]: currentBlob }))
    setCurrentBlob(null)
    setRecState('idle')
    const qs = selectedRow?.questions || []
    if (currentQIdx < qs.length - 1) setCurrentQIdx(i => i + 1)
  }, [currentBlob, currentQIdx, selectedRow])

  const rerecord = useCallback(() => {
    if (currentBlob?.url) URL.revokeObjectURL(currentBlob.url)
    setCurrentBlob(null)
    setRecState('idle')
  }, [currentBlob])

  async function handleSubmit() {
    if (!selectedRow || !studentId) return
    setAct('processing')
    setProcStage('upload')

    const qs = selectedRow.questions || []
    const sessionTs = Date.now()
    const uploadedPaths = []

    // Upload each recording
    for (let i = 0; i < qs.length; i++) {
      const rec = recordings[i]
      if (!rec?.blob) { uploadedPaths.push(null); continue }
      const path = `${studentId}/${sessionTs}/q${i}.${rec.ext}`
      try {
        await uploadWithRetry(rec.blob, path, rec.mimeType)
        uploadedPaths.push(path)
      } catch (e) {
        console.warn(`[Speaking] upload q${i} failed:`, e.message)
        uploadedPaths.push(null)
      }
    }

    const validPaths = uploadedPaths.filter(Boolean)
    if (validPaths.length === 0) {
      setMicError('فشل رفع التسجيلات. تحقق من اتصالك وحاول مجدداً.')
      setAct('session')
      return
    }

    // Evaluate
    setProcStage('evaluate')
    const payload = {
      audio_paths: validPaths,
      part_num: selectedRow.part,
      questions: qs,
      cue_card: selectedRow.cue_card || null,
    }
    const evalRes = await evaluateWithRetry(payload, setEvalAttempt)

    if (evalRes.ok) {
      const d = evalRes.data
      const band = Number(d.overall_band)
      const now = new Date().toISOString()
      const startedAt = new Date(sessionTs).toISOString()

      // Insert session row
      const { data: sessRow } = await supabase.from('ielts_skill_sessions').insert({
        student_id: studentId,
        skill_type: 'speaking',
        question_type: `part_${selectedRow.part}`,
        source_id: selectedRow.id,
        band_score: band,
        duration_seconds: Object.values(recordings).reduce((s, r) => s, 0),
        started_at: startedAt,
        completed_at: now,
        session_data: {
          part_num: selectedRow.part,
          questions: qs,
          transcripts: d.transcripts || [],
          audio_paths: uploadedPaths,
          criteria: d.criteria || {},
          feedback_ar: d.feedback_ar || '',
          strengths: d.strengths || [],
          weaknesses: d.weaknesses || [],
          per_question_feedback: d.per_question_feedback || [],
        },
      }).select('id').single()
      if (sessRow?.id) setSessionId(sessRow.id)

      // Upsert progress
      const qKey = `part_${selectedRow.part}`
      const { data: existing } = await supabase.from('ielts_student_progress')
        .select('attempts_count, total_time_seconds, estimated_band')
        .eq('student_id', studentId).eq('skill_type', 'speaking').eq('question_type', qKey)
        .maybeSingle()
      const prevBand = existing?.estimated_band != null ? Number(existing.estimated_band) : null
      const newBand = prevBand != null ? Math.round(((0.4 * prevBand) + (0.6 * band)) * 2) / 2 : band
      await supabase.from('ielts_student_progress').upsert({
        student_id: studentId, skill_type: 'speaking', question_type: qKey,
        attempts_count: (existing?.attempts_count || 0) + 1,
        total_time_seconds: existing?.total_time_seconds || 0,
        estimated_band: newBand, last_attempt_at: now, updated_at: now,
      }, { onConflict: 'student_id,skill_type,question_type' })

      qc.invalidateQueries({ queryKey: ['v3-speaking-sessions', studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })

      // Generate signed URLs for playback
      const signedUrls = []
      for (const path of uploadedPaths) {
        if (!path) { signedUrls.push(null); continue }
        const { data: su } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
        signedUrls.push(su?.signedUrl || null)
      }
      setPlaybackUrls(signedUrls)
      setGradeResult(d)
    } else {
      setEvalQueued(true)
    }

    setAct('results')
  }

  function handleSelectRow(row) {
    setSelectedRow(row)
    setCurrentQIdx(0)
    setRecordings({})
    setCurrentBlob(null)
    setRecState('idle')
    setRecElapsed(0)
    setPrepElapsed(0)
    setPrepDone(row.part !== 2)  // skip prep for Part 1/3
    setMicError(null)
    setGradeResult(null)
    setPlaybackUrls([])
    setEvalQueued(false)
    setSessionId(null)
    setEvalAttempt(0)
    setAct('session')
  }

  function handleBackToBooth() {
    stopStream()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    clearInterval(recTimerRef.current)
    clearInterval(prepTimerRef.current)
    blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u))
    blobUrlsRef.current = []
    setAct('booth')
    setSelectedRow(null)
  }

  // Derived
  const questions   = selectedRow?.questions || []
  const qCount      = questions.length
  const doneCount   = Object.keys(recordings).length
  const allDone     = doneCount >= qCount && qCount > 0
  const meta        = PART_META[selectedRow?.part || 1]

  // ── ACT 1: BOOTH ───────────────────────────────────────────────────────────
  if (act === 'booth') {
    const rows   = questionsQ.data || []
    const recent = recentQ.data || []
    const bestBand = recent.length > 0
      ? Math.max(...recent.map(s => Number(s.band_score || 0)).filter(Boolean))
      : null

    return (
      <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 32 }}>
        {!narrativeDone && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} style={{ paddingTop: 32 }}>
            <NarrativeReveal lines={NARRATIVE_LINES} delayBetweenLines={700} pauseAfterLast={400} onComplete={() => setNarrativeDone(true)} />
          </motion.section>
        )}

        {recent.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 12 }}>
            <StatCard label="جلسات مكتملة" value={recent.length} />
            {bestBand != null && <StatCard label="أفضل Band" value={bestBand.toFixed(1)} accent="var(--sunset-orange)" />}
          </motion.section>
        )}

        {/* Part selector */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>اختاري الجزء</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(p => {
              const m = PART_META[p]
              const active = selectedPart === p
              return (
                <button key={p} onClick={() => setSelectedPart(p)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12,
                    border: `1px solid ${active ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 55%, transparent)'}`,
                    background: active ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 45%, transparent)',
                    color: active ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                    fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>
        </motion.section>

        {/* Cards grid */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {questionsQ.isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 130, borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 30%, transparent)' }} />)}
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '40px 24px', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', textAlign: 'center' }}>
              <Mic size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>لا توجد أسئلة منشورة لهذا الجزء</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {rows.map(r => <BoothCard key={r.id} row={r} onSelect={handleSelectRow} />)}
            </div>
          )}
        </motion.section>
      </div>
    )
  }

  // ── ACT 2: PROCESSING ──────────────────────────────────────────────────────
  if (act === 'processing') {
    return <div dir="rtl" style={{ padding: '20px 0' }}><ProcessingScreen stage={procStage} attempt={evalAttempt} /></div>
  }

  // ── ACT 2: SESSION ─────────────────────────────────────────────────────────
  if (act === 'session') {
    const isPart2 = selectedRow?.part === 2
    const currentQ = questions[currentQIdx] || ''
    const inPrep = isPart2 && !prepDone
    const prepRemaining = Math.max(0, 60 - prepElapsed)

    return (
      <div dir="rtl" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 16px', marginBottom: 20, borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleBackToBooth}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            <ChevronLeft size={13} /> الكابينة
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
              {selectedRow?.topic}
            </span>
          </div>
          <motion.button
            onClick={handleSubmit}
            disabled={!allDone}
            whileHover={allDone ? { scale: 1.02 } : undefined}
            style={{
              padding: '7px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: allDone ? 'pointer' : 'not-allowed',
              border: `1px solid ${allDone ? 'color-mix(in srgb, var(--sunset-orange) 40%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`,
              background: allDone ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'transparent',
              color: allDone ? 'var(--ds-text)' : 'var(--ds-text-muted)', opacity: allDone ? 1 : 0.5,
            }}>
            إنهاء ({doneCount}/{qCount})
          </motion.button>
        </div>

        {/* Question nav (Part 1/3) */}
        {!isPart2 && <div style={{ marginBottom: 16 }}><QuestionNav questions={questions} currentIdx={currentQIdx} recordings={recordings} /></div>}

        {/* Prep panel (Part 2 only) */}
        {isPart2 && inPrep && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '20px 24px', borderRadius: 18, marginBottom: 16, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
              وقت التحضير: {formatTime(prepRemaining)}
            </p>
            <button onClick={() => { clearInterval(prepTimerRef.current); setPrepDone(true) }}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 12, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
              تخطي التحضير
            </button>
          </motion.div>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: isWide && !isPart2 ? '1fr 1fr' : '1fr', gap: 20 }}>

          {/* Question / cue card panel */}
          <div style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 16%, transparent)', backdropFilter: 'blur(8px)' }}>
            {isPart2 && selectedRow?.cue_card ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cue Card</p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.7, direction: 'ltr', textAlign: 'left' }}>
                  {selectedRow.cue_card.prompt}
                </p>
                <ul style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(selectedRow.cue_card.bullet_points || []).map((b, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", direction: 'ltr', textAlign: 'left' }}>{b}</li>
                  ))}
                </ul>
                {selectedRow.cue_card.preparation_tips_ar && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right' }}>
                    💡 {selectedRow.cue_card.preparation_tips_ar}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  السؤال {qCount > 1 ? `${currentQIdx + 1} / ${qCount}` : ''}
                </p>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.8, direction: 'ltr', textAlign: 'left' }}>
                  {currentQ}
                </p>
              </div>
            )}
          </div>

          {/* Recording panel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px', borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>

            {micError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: `color-mix(in srgb, ${DANGER} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${DANGER} 22%, transparent)`, width: '100%' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>{micError}</p>
              </div>
            )}

            {/* State: idle / recording */}
            {recState !== 'preview' && (
              <>
                {recState === 'recording' && (
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: DANGER, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {formatTime(recElapsed)}
                  </p>
                )}
                <MicButton
                  state={inPrep ? 'disabled' : recState}
                  onStart={!inPrep ? startRecording : undefined}
                  onStop={stopRecording}
                />
                {recState === 'idle' && !inPrep && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                    {recordings[currentQIdx] ? 'سجّلت بالفعل — اضغطي للتسجيل مجدداً' : 'اضغطي للتسجيل'}
                  </p>
                )}
                {inPrep && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                    أكملي التحضير أو اضغطي "تخطي"
                  </p>
                )}
              </>
            )}

            {/* State: preview */}
            {recState === 'preview' && currentBlob && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', alignItems: 'center' }}>
                <audio controls src={currentBlob.url} style={{ width: '100%', borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button onClick={rerecord}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RotateCcw size={13} /> إعادة
                  </button>
                  <button onClick={commitRecording}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid color-mix(in srgb, ${SUCCESS} 35%, transparent)`, background: `color-mix(in srgb, ${SUCCESS} 12%, transparent)`, color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
                    موافق ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── ACT 3: RESULTS ─────────────────────────────────────────────────────────
  if (act === 'results') {
    const d = gradeResult
    return (
      <div dir="rtl" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Queued state */}
        {evalQueued && !d && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '24px 20px', borderRadius: 20, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--sunset-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>في طابور المراجعة</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>تعذّر التقييم بعد ٥ محاولات. تسجيلاتك محفوظة وستصلك النتيجة قريباً.</p>
            </div>
          </motion.div>
        )}

        {d && (
          <>
            {/* Score card */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '36px 28px', borderRadius: 24, background: 'color-mix(in srgb, var(--sunset-base-mid) 48%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)', backdropFilter: 'blur(10px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Speaking Result · {PART_META[selectedRow?.part]?.label}</p>
              <BandDisplay band={d.overall_band} size="xl" animate />
            </motion.div>

            {/* Criteria */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BAND_CRITERIA.map(c => (
                <CriterionCard key={c.key} label={c.label} score={d.criteria?.[c.key]} />
              ))}
            </motion.div>

            {/* Overall feedback */}
            {d.feedback_ar && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                style={{ padding: '16px 18px', borderRadius: 16, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8, textAlign: 'right' }}>{d.feedback_ar}</p>
              </motion.div>
            )}

            {/* Strengths + weaknesses */}
            {(d.strengths?.length > 0 || d.weaknesses?.length > 0) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {d.strengths?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200, padding: '14px 16px', borderRadius: 14, background: `color-mix(in srgb, ${SUCCESS} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${SUCCESS} 18%, transparent)` }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: SUCCESS, fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>نقاط القوة</p>
                    {d.strengths.map((s, i) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0', fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6, textAlign: 'right' }}>• {s}</p>)}
                  </div>
                )}
                {d.weaknesses?.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200, padding: '14px 16px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-amber) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--sunset-amber)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>للتحسين</p>
                    {d.weaknesses.map((w, i) => <p key={i} style={{ margin: i === 0 ? 0 : '5px 0 0', fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6, textAlign: 'right' }}>• {w}</p>)}
                  </div>
                )}
              </motion.div>
            )}

            {/* Per-question playback + transcript */}
            {questions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  مراجعة الإجابات
                </p>
                {questions.map((q, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 14, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", direction: 'ltr', textAlign: 'left', lineHeight: 1.6 }}>
                      <strong>Q{i + 1}:</strong> {q}
                    </p>
                    {playbackUrls[i] && <audio controls src={playbackUrls[i]} style={{ width: '100%', borderRadius: 8 }} />}
                    {d.transcripts?.[i] && (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Mono', monospace", direction: 'ltr', textAlign: 'left', lineHeight: 1.7, fontStyle: 'italic' }}>
                        "{d.transcripts[i]}"
                      </p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setAct('booth'); setSelectedRow(null) }}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            الكابينة
          </button>
          <button onClick={() => handleSelectRow(selectedRow)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange) 38%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 13%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            <RotateCcw size={13} /> محاولة أخرى
          </button>
        </motion.div>
      </div>
    )
  }

  return null
}
