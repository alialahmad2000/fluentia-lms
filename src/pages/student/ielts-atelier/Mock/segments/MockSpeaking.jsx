// Mock Speaking Segment — strict mode (Parts 1→2→3 sequential, no rerecord, no prep skip)
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'

const LIMIT  = SKILL_LIMITS.speaking
const BUCKET = 'ielts-speaking-submissions'
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']
const RETRY_DELAYS = [2000, 4000, 8000, 16000, 32000]

function formatTime(s) { const v = Math.max(0, Math.floor(s)); return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}` }
function getExt(m) { return m?.includes('mp4') ? 'mp4' : m?.includes('wav') ? 'wav' : 'webm' }

async function uploadBlob(blob, path, mimeType) {
  for (let i = 0; i < 3; i++) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mimeType, upsert: false })
    if (!error) return path
    if (i < 2) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
  }
  return null
}

async function evalWithRetry(payload, onAttempt) {
  for (let i = 0; i < 5; i++) {
    onAttempt(i + 1)
    try {
      const { data, error } = await invokeWithRetry('evaluate-ielts-speaking', { body: payload }, { timeoutMs: 180000, retries: 0 })
      if (error) throw new Error(error)
      if (!data?.overall_band) throw new Error('No band score')
      return { ok: true, data }
    } catch (e) {
      if (i < 4) await new Promise(r => setTimeout(r, RETRY_DELAYS[i]))
      else return { ok: false, error: e.message }
    }
  }
}

// Per-part configs
const PART_META = {
  1: { label: 'الجزء الأول', maxRecSec: 40,  prepSec: 0 },
  2: { label: 'الجزء الثاني', maxRecSec: 120, prepSec: 60 },
  3: { label: 'الجزء الثالث', maxRecSec: 60,  prepSec: 0 },
}

export default function MockSpeaking({ attemptId, answers, content, startedAt, onComplete }) {
  const [rows, setRows] = useState({ part1: null, part2: null, part3: null })
  const [partIdx, setPartIdx] = useState(0)  // 0=part1, 1=part2, 2=part3
  const [qIdx, setQIdx] = useState(0)
  const [recordings, setRecordings] = useState({})  // `${partIdx}_${qIdx}` → { blob, mimeType, ext }
  const [recState, setRecState] = useState('idle')   // idle | prep | recording | done-q
  const [prepLeft, setPrepLeft] = useState(0)
  const [recElapsed, setRecElapsed] = useState(0)
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [mimeType, setMimeType] = useState(null)
  const [micError, setMicError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [evalAttempt, setEvalAttempt] = useState(0)
  const recorderRef = useRef(null)
  const streamRef   = useRef(null)
  const chunksRef   = useRef([])
  const recTimer    = useRef(null)
  const prepTimer   = useRef(null)
  const globalTimer = useRef(null)

  const PARTS = [1, 2, 3]
  const currentPart = PARTS[partIdx]
  const meta = PART_META[currentPart]
  const currentRow = rows[`part${currentPart}`]
  const questions = currentRow?.questions || []
  const cueCard = currentRow?.cue_card || null
  const currentQ = questions[qIdx] || ''

  // Load speaking question rows
  useEffect(() => {
    const spk = content.speaking || {}
    const load = async () => {
      const ids = [spk.part1Id, spk.part2Id, spk.part3Id].filter(Boolean)
      if (!ids.length) return
      const { data } = await supabase.from('ielts_speaking_questions')
        .select('id, part, topic, questions, cue_card').in('id', ids)
      if (!data) return
      const map = {}
      for (const r of data) map[`part${r.part}`] = r
      setRows(map)
    }
    load()
  }, [content.speaking])

  // Global timer
  useEffect(() => {
    if (secsLeft <= 0) { handleFinalSubmit(); return }
    globalTimer.current = setInterval(() => setSecsLeft(s => { if (s <= 1) { handleFinalSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(globalTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recording timer
  useEffect(() => {
    if (recState !== 'recording') { clearInterval(recTimer.current); setRecElapsed(0); return }
    recTimer.current = setInterval(() => setRecElapsed(e => {
      if (e + 1 >= meta.maxRecSec) { stopRecording(); return meta.maxRecSec }
      return e + 1
    }), 1000)
    return () => clearInterval(recTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState])

  // Prep timer (Part 2 only)
  useEffect(() => {
    if (recState !== 'prep') { clearInterval(prepTimer.current); return }
    setPrepLeft(meta.prepSec)
    prepTimer.current = setInterval(() => setPrepLeft(p => {
      if (p <= 1) { clearInterval(prepTimer.current); setRecState('idle'); return 0 }
      return p - 1
    }), 1000)
    return () => clearInterval(prepTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState])

  function stopStream() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }

  const startRecording = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MIME_CANDIDATES.find(m => { try { return MediaRecorder.isTypeSupported(m) } catch { return false } }) || 'audio/webm'
      setMimeType(mime)
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime })
        const key = `${partIdx}_${qIdx}`
        setRecordings(prev => ({ ...prev, [key]: { blob, mimeType: mime, ext: getExt(mime) } }))
        stopStream()
        setRecState('done-q')
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setRecState('recording')
    } catch (e) {
      setMicError(e.name === 'NotAllowedError' ? 'لم يتم السماح بالوصول للميكروفون.' : e.name === 'NotFoundError' ? 'لم نجد ميكروفوناً.' : `خطأ: ${e.message}`)
    }
  }, [partIdx, qIdx, stopStream])

  function stopRecording() { recorderRef.current?.stop(); clearInterval(recTimer.current) }

  function handleStartQuestion() {
    if (currentPart === 2 && meta.prepSec > 0) {
      setRecState('prep') // Start prep timer first
    } else {
      startRecording()
    }
  }

  function handleNextQuestion() {
    setRecState('idle')
    setRecElapsed(0)
    if (qIdx < questions.length - 1) {
      setQIdx(q => q + 1)
    } else if (partIdx < 2) {
      setPartIdx(p => p + 1)
      setQIdx(0)
    } else {
      handleFinalSubmit()
    }
  }

  async function handleFinalSubmit() {
    if (processing) return
    clearInterval(globalTimer.current)
    setProcessing(true)
    setEvalAttempt(0)

    // Upload all recordings
    const ts = Date.now()
    const allPaths = {}
    for (const [key, rec] of Object.entries(recordings)) {
      if (!rec?.blob) continue
      const [pi, qi] = key.split('_')
      const partNum = PARTS[Number(pi)]
      const path = `mock_${ts}_p${partNum}_q${qi}.${rec.ext}`
      const uploaded = await uploadBlob(rec.blob, path, rec.mimeType)
      if (uploaded) allPaths[key] = uploaded
    }

    // Evaluate each part
    let overallBand = null, feedback = {}
    for (let pi = 0; pi < 3; pi++) {
      const partNum = PARTS[pi]
      const partRow = rows[`part${partNum}`]
      if (!partRow) continue
      const partPaths = Object.entries(allPaths).filter(([k]) => k.startsWith(`${pi}_`)).map(([,v]) => v)
      if (!partPaths.length) continue
      const qs = partRow.questions || []
      const res = await evalWithRetry({
        audio_paths: partPaths,
        part_num: partNum,
        questions: qs,
        cue_card: partRow.cue_card || null,
      }, setEvalAttempt)
      if (res?.ok) {
        const band = Number(res.data.overall_band)
        overallBand = overallBand == null ? band : (overallBand + band) / 2
        feedback = res.data  // Use last part's feedback for summary
      }
    }

    const band = overallBand != null ? Math.round(overallBand * 2) / 2 : null
    onComplete({ audio_paths: Object.values(allPaths), feedback, band, queued: !band, started_at: startedAt })
  }

  const recordedCount = Object.keys(recordings).length
  const totalQ = PARTS.reduce((sum, p) => sum + ((rows[`part${p}`]?.questions?.length) || 0), 0)
  const isUrgent = secsLeft < 180, isCritical = secsLeft < 60

  if (processing) {
    return (
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--sunset-orange)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>جاري تحليل المحادثة…</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{evalAttempt > 1 ? `المحاولة ${evalAttempt}/5` : '~٢ دقيقة'}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px', borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif" }}>🎤 {meta.label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: isCritical ? '#f87171' : isUrgent ? 'var(--sunset-amber)' : 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(secsLeft)}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>سؤال {qIdx + 1}/{questions.length}</span>
      </div>

      {/* Part progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
        {PARTS.map((p, i) => (
          <span key={p} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: i === partIdx ? 700 : 500, background: i < partIdx ? 'color-mix(in srgb, #4ade80 12%, transparent)' : i === partIdx ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'transparent', border: `1px solid ${i < partIdx ? 'rgba(74,222,128,0.3)' : i === partIdx ? 'color-mix(in srgb, var(--sunset-orange) 35%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, color: i < partIdx ? '#4ade80' : i === partIdx ? 'var(--ds-text)' : 'var(--ds-text-muted)' }}>
            {i < partIdx ? '✓' : ''} Part {p}
          </span>
        ))}
      </div>

      {/* Question / cue card */}
      <div style={{ padding: '18px 20px', borderRadius: 16, marginBottom: 20, background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)' }}>
        {currentPart === 2 && cueCard ? (
          <>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>Cue Card</p>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", direction: 'ltr', textAlign: 'left', lineHeight: 1.7 }}>{cueCard.prompt}</p>
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {(cueCard.bullet_points || []).map((b, i) => <li key={i} style={{ fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", direction: 'ltr', textAlign: 'left', lineHeight: 1.7 }}>{b}</li>)}
            </ul>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", direction: 'ltr', textAlign: 'left', lineHeight: 1.8 }}>{currentQ}</p>
        )}
      </div>

      {/* Prep timer (Part 2) */}
      {recState === 'prep' && (
        <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 16, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>وقت التحضير</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--sunset-amber)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(prepLeft)}</span>
        </div>
      )}

      {micError && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#f87171', fontFamily: "'Tajawal', sans-serif", textAlign: 'right' }}>{micError}</p>}

      {/* Recording controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {recState === 'idle' && (
          <motion.button onClick={handleStartQuestion} whileHover={{ scale: 1.02 }} style={{ padding: '14px 32px', borderRadius: 16, border: '1px solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 16, fontWeight: 900, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mic size={20} /> {currentPart === 2 ? 'ابدأ التحضير' : 'سجّل الإجابة'}
          </motion.button>
        )}

        {recState === 'recording' && (
          <>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(recElapsed)}</p>
            <motion.button onClick={stopRecording} animate={{ boxShadow: ['0 0 0 0px rgba(239,68,68,0.4)', '0 0 0 14px rgba(239,68,68,0)'] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid #f87171', background: 'color-mix(in srgb, #f87171 18%, transparent)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Square size={26} />
            </motion.button>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>الحد الأقصى: {formatTime(meta.maxRecSec)}</p>
          </>
        )}

        {recState === 'done-q' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#4ade80', fontFamily: "'Tajawal', sans-serif" }}>✓ تم التسجيل</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", textAlign: 'center' }}>
              {qIdx < questions.length - 1 ? 'انتقلي للسؤال التالي' : partIdx < 2 ? 'انتقلي للجزء التالي' : 'أرسلي للتقييم'}
            </p>
            <button onClick={handleNextQuestion} style={{ padding: '12px 28px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange) 38%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
              {qIdx < questions.length - 1 ? 'السؤال التالي ›' : partIdx < 2 ? 'الجزء التالي ›' : 'إرسال للتقييم'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
