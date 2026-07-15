// Mock/Diagnostic Speaking segment — authentic IELTS exam UI: full-screen shell,
// Parts 1→2→3 sequential recording (cue card + prep timer), AI evaluation preserved.
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'
import { useG } from '@/i18n/gender'
import { ExamShell } from '../../_ui/ExamShell'

const LIMIT = SKILL_LIMITS.speaking
const BUCKET = 'ielts-speaking-submissions'
const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav']
const RETRY_DELAYS = [2000, 4000, 8000, 16000, 32000]
function fmt(s) { const v = Math.max(0, Math.floor(s || 0)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }
function getExt(m) { return m?.includes('mp4') ? 'mp4' : m?.includes('wav') ? 'wav' : 'webm' }
// Speaking questions are stored as objects {q, sample} (Part 1/3) — extract the
// prompt text so React never tries to render a raw object as a child (crash).
function qText(x) { return typeof x === 'string' ? x : (x?.q || x?.question || x?.text || x?.prompt || '') }

async function uploadBlob(blob, path, mimeType) {
  for (let i = 0; i < 3; i++) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mimeType, upsert: false })
    if (!error) return path
    if (i < 2) await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
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
      if (i < 4) await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]))
      else return { ok: false, error: e.message }
    }
  }
}

const PART_META = {
  1: { label: 'الجزء الأول', maxRecSec: 40, prepSec: 0 },
  2: { label: 'الجزء الثاني', maxRecSec: 120, prepSec: 60 },
  3: { label: 'الجزء الثالث', maxRecSec: 60, prepSec: 0 },
}

export default function MockSpeaking({ attemptId, answers, content, startedAt, onComplete }) {
  const g = useG()
  const [rows, setRows] = useState({ part1: null, part2: null, part3: null })
  const [partIdx, setPartIdx] = useState(0)
  const [qIdx, setQIdx] = useState(0)
  const [recordings, setRecordings] = useState({})
  const [recState, setRecState] = useState('idle')
  const [prepLeft, setPrepLeft] = useState(0)
  const [recElapsed, setRecElapsed] = useState(0)
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [mimeType, setMimeType] = useState(null)
  const [micError, setMicError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [evalAttempt, setEvalAttempt] = useState(0)
  const recorderRef = useRef(null), streamRef = useRef(null), chunksRef = useRef([])
  const recTimer = useRef(null), prepTimer = useRef(null), globalTimer = useRef(null)

  const availableParts = [1, 2, 3].filter((p) => (content.speaking || {})[`part${p}Id`])
  const PARTS = availableParts.length ? availableParts : [1, 2, 3]
  const currentPart = PARTS[partIdx]
  const meta = PART_META[currentPart]
  const currentRow = rows[`part${currentPart}`]
  const questions = currentRow?.questions || []
  const cueCard = currentRow?.cue_card || null
  const currentQ = qText(questions[qIdx])

  useEffect(() => {
    const spk = content.speaking || {}
    const ids = [spk.part1Id, spk.part2Id, spk.part3Id].filter(Boolean)
    if (!ids.length) return
    supabase.from('ielts_speaking_questions').select('id, part, topic, questions, cue_card').in('id', ids).then(({ data }) => {
      if (!data) return
      const map = {}; for (const r of data) map[`part${r.part}`] = r; setRows(map)
    })
  }, [content.speaking])

  const handleFinalSubmit = useCallback(async () => {
    if (processing) return
    clearInterval(globalTimer.current)
    setProcessing(true); setEvalAttempt(0)
    const ts = Date.now(); const allPaths = {}
    for (const [key, rec] of Object.entries(recordings)) {
      if (!rec?.blob) continue
      const [pi, qi] = key.split('_'); const partNum = PARTS[Number(pi)]
      const uploaded = await uploadBlob(rec.blob, `mock_${ts}_p${partNum}_q${qi}.${rec.ext}`, rec.mimeType)
      if (uploaded) allPaths[key] = uploaded
    }
    let overallBand = null, feedback = {}
    for (let pi = 0; pi < PARTS.length; pi++) {
      const partNum = PARTS[pi]; const partRow = rows[`part${partNum}`]
      if (!partRow) continue
      const partPaths = Object.entries(allPaths).filter(([k]) => k.startsWith(`${pi}_`)).map(([, v]) => v)
      if (!partPaths.length) continue
      const res = await evalWithRetry({ audio_paths: partPaths, part_num: partNum, questions: partRow.questions || [], cue_card: partRow.cue_card || null }, setEvalAttempt)
      if (res?.ok) { const band = Number(res.data.overall_band); overallBand = overallBand == null ? band : (overallBand + band) / 2; feedback = res.data }
    }
    const band = overallBand != null ? Math.round(overallBand * 2) / 2 : null
    onComplete({ audio_paths: Object.values(allPaths), feedback, band, queued: !band, started_at: startedAt })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordings, rows, onComplete, startedAt, processing])

  // Keep a LIVE ref to the latest submit handler. The section-timer effect below
  // is mounted once with [] deps, so a direct `handleFinalSubmit()` call from it
  // would fire the FIRST-render closure — the one captured while `recordings`
  // was still empty — silently discarding every recorded answer on timer expiry.
  // Routing the timer through this ref makes it always submit the latest recordings.
  const finalSubmitRef = useRef(handleFinalSubmit)
  useEffect(() => { finalSubmitRef.current = handleFinalSubmit }, [handleFinalSubmit])

  useEffect(() => {
    if (secsLeft <= 0) { finalSubmitRef.current(); return }
    globalTimer.current = setInterval(() => setSecsLeft((s) => { if (s <= 1) { clearInterval(globalTimer.current); finalSubmitRef.current(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(globalTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (recState !== 'recording') { clearInterval(recTimer.current); setRecElapsed(0); return }
    recTimer.current = setInterval(() => setRecElapsed((e) => { if (e + 1 >= meta.maxRecSec) { stopRecording(); return meta.maxRecSec } return e + 1 }), 1000)
    return () => clearInterval(recTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState])

  useEffect(() => {
    if (recState !== 'prep') { clearInterval(prepTimer.current); return }
    setPrepLeft(meta.prepSec)
    prepTimer.current = setInterval(() => setPrepLeft((p) => { if (p <= 1) { clearInterval(prepTimer.current); setRecState('idle'); return 0 } return p - 1 }), 1000)
    return () => clearInterval(prepTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState])

  function stopStream() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  const startRecording = useCallback(async () => {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MIME_CANDIDATES.find((m) => { try { return MediaRecorder.isTypeSupported(m) } catch { return false } }) || 'audio/webm'
      setMimeType(mime)
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: mime }); setRecordings((prev) => ({ ...prev, [`${partIdx}_${qIdx}`]: { blob, mimeType: mime, ext: getExt(mime) } })); stopStream(); setRecState('done-q') }
      recorder.start(1000); recorderRef.current = recorder; setRecState('recording')
    } catch (e) {
      setMicError(e.name === 'NotAllowedError' ? 'لم يتم السماح بالوصول للميكروفون.' : e.name === 'NotFoundError' ? 'لم نجد ميكروفوناً.' : `خطأ: ${e.message}`)
    }
  }, [partIdx, qIdx])
  function stopRecording() { recorderRef.current?.stop(); clearInterval(recTimer.current) }
  function handleStartQuestion() { if (currentPart === 2 && meta.prepSec > 0) setRecState('prep'); else startRecording() }
  function handleNextQuestion() {
    setRecState('idle'); setRecElapsed(0)
    if (qIdx < questions.length - 1) setQIdx((q) => q + 1)
    else if (partIdx < PARTS.length - 1) { setPartIdx((p) => p + 1); setQIdx(0) }
    else handleFinalSubmit()
  }

  if (processing) {
    return (
      <div className="iel-root iel-exam-clinical" dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'var(--iel-ground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', animation: 'iel-spin .8s linear infinite' }} />
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif" }}>جارٍ تحليل محادثتك…</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif" }}>{evalAttempt > 1 ? `المحاولة ${evalAttempt}/5` : 'قد يستغرق نحو دقيقتين'}</p>
      </div>
    )
  }

  const footer = (
    <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
      {PARTS.map((p, i) => (
        <span key={p} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontFamily: SANS, fontWeight: i === partIdx ? 700 : 500,
          background: i < partIdx ? 'color-mix(in srgb, var(--iel-good) 12%, transparent)' : i === partIdx ? 'var(--iel-accent-soft)' : 'transparent',
          border: `1px solid ${i < partIdx ? 'color-mix(in srgb, var(--iel-good) 34%, transparent)' : i === partIdx ? 'color-mix(in srgb, var(--iel-accent) 35%, var(--iel-border))' : 'var(--iel-border)'}`,
          color: i < partIdx ? 'var(--iel-good)' : i === partIdx ? 'var(--iel-accent-ink)' : 'var(--iel-ink-3)' }}>{i < partIdx ? '✓ ' : ''}Part {p}</span>
      ))}
    </div>
  )

  return (
    <ExamShell sectionLabel="المحادثة" partLabel={`Speaking Part ${currentPart} · Q${qIdx + 1}/${questions.length || 1}`} secsLeft={secsLeft} onSubmit={handleFinalSubmit} submitting={processing} footer={footer} showSubmit={false}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', gap: 24 }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          {/* Question / cue card */}
          <div style={{ padding: '20px 24px', borderRadius: 16, background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', boxShadow: 'var(--iel-shadow-sm)', direction: 'ltr' }}>
            {currentPart === 2 && cueCard ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', fontFamily: SANS, letterSpacing: '.06em' }}>CUE CARD</p>
                <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--iel-ink)', fontFamily: SANS, textAlign: 'left', lineHeight: 1.6 }}>{cueCard.prompt}</p>
                <ul style={{ margin: 0, paddingInlineStart: 22 }}>
                  {(cueCard.bullet_points || []).map((b, i) => <li key={i} style={{ fontSize: 14.5, color: 'var(--iel-ink-2)', fontFamily: SANS, textAlign: 'left', lineHeight: 1.8 }}>{b}</li>)}
                </ul>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', fontFamily: SANS, letterSpacing: '.06em' }}>QUESTION {qIdx + 1}</p>
                <p style={{ margin: 0, fontSize: 17, color: 'var(--iel-ink)', fontFamily: SANS, textAlign: 'left', lineHeight: 1.7 }}>{currentQ}</p>
              </>
            )}
          </div>

          {recState === 'prep' && (
            <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 12, background: 'color-mix(in srgb, var(--iel-warn) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-warn) 26%, transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif" }}>وقت التحضير — دوّن أفكارك</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--iel-warn)', fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(prepLeft)}</span>
            </div>
          )}
          {micError && <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--iel-bad)', fontFamily: "'Tajawal', sans-serif", textAlign: 'center' }}>{micError}</p>}
        </div>

        {/* Recording controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {recState === 'idle' && (
            <button onClick={handleStartQuestion} style={{ padding: '14px 34px', borderRadius: 14, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mic size={19} /> {currentPart === 2 ? g('ابدأ التحضير', 'ابدئي التحضير') : g('سجّل إجابتك', 'سجّلي إجابتك')}
            </button>
          )}
          {recState === 'recording' && (
            <>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--iel-bad)', fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(recElapsed)}</p>
              <motion.button onClick={stopRecording} animate={{ boxShadow: ['0 0 0 0px rgba(224,106,88,0.4)', '0 0 0 16px rgba(224,106,88,0)'] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: 76, height: 76, borderRadius: '50%', border: '2px solid var(--iel-bad)', background: 'color-mix(in srgb, var(--iel-bad) 15%, transparent)', color: 'var(--iel-bad)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Square size={26} />
              </motion.button>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif" }}>الحد الأقصى {fmt(meta.maxRecSec)} — اضغط للإيقاف</p>
            </>
          )}
          {recState === 'done-q' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--iel-good)', fontFamily: "'Tajawal', sans-serif" }}>✓ تم تسجيل إجابتك</p>
              <button onClick={handleNextQuestion} style={{ padding: '12px 30px', borderRadius: 12, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 14.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
                {qIdx < questions.length - 1 ? g('السؤال التالي ›', 'السؤال التالي ›') : partIdx < PARTS.length - 1 ? 'الجزء التالي ›' : g('إرسال للتقييم', 'إرسال للتقييم')}
              </button>
            </div>
          )}
        </div>
      </div>
    </ExamShell>
  )
}
