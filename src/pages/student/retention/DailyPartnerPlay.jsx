// /student/retention/daily-partner/play/:attemptId — dialogue play loop
// Linear progression for v1; branching deferred to a future content pass.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, RotateCcw, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { invokeWithRetry } from '../../../lib/invokeWithRetry'
import { useScenarioWithTurns } from '../../../lib/retention/useDialogue'
import { evaluateTurn } from '../../../lib/retention/dialogueEval'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionAudioPlayer from '../../../design-system/retention/RetentionAudioPlayer'
import { useG } from '../../../i18n/gender'

const getMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4'
  if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  return 'audio/mp4'
}

export default function DailyPartnerPlay() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const scenarioId = searchParams.get('scenario')
  const navigate = useNavigate()
  const g = useG()

  const swt = useScenarioWithTurns(scenarioId)
  const scenario = swt.data?.scenario
  const turns = swt.data?.turns || []

  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [lastError, setLastError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const recordingStartRef = useRef(0)

  const currentTurn = turns[currentTurnIndex]

  // SHIP-AUTONOMOUS §2.3: NO browser TTS fallback. Every retention audio asset
  // is an ElevenLabs file in Supabase Storage. Scenarios without `ai_audio_path`
  // on every turn are filtered out of selection by useTodayScenario, so this
  // surface is never reached with a turn lacking audio.

  const startRecord = async () => {
    setLastError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = getMimeType()
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mime })
        const durationSec = Math.round((Date.now() - recordingStartRef.current) / 1000)
        await handleTranscribe(blob, durationSec, mime)
      }
      rec.start()
      mediaRecorderRef.current = rec
      recordingStartRef.current = Date.now()
      setRecording(true)
    } catch (e) {
      setLastError(g('تعذّر الوصول للمايكروفون — تأكد من السماح للموقع', 'تعذّر الوصول للمايكروفون — تأكدي من السماح للموقع'))
    }
  }

  const stopRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleTranscribe = async (blob, durationSec, mime) => {
    if (!currentTurn) return
    setTranscribing(true)
    try {
      // Upload to a temp location is not strictly required if the whisper-transcribe
      // function accepts inline base64. We send base64 in body.
      const arrayBuffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      // Convert in chunks to avoid call-stack overflow
      let binary = ''
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
      }
      const base64 = btoa(binary)
      const ext = mime.includes('mp4') ? 'mp4' : 'webm'

      const result = await invokeWithRetry('whisper-transcribe', {
        body: { audio_base64: base64, format: ext, language: 'en' },
      })
      const text = (result?.text || result?.transcript || '').trim()
      if (!text) {
        setLastError(g('تعذّر تحويل صوتك لنص — حاول تتكلم بوضوح أكثر', 'تعذّر تحويل صوتكِ لنص — حاولي تتكلمين بوضوح أكثر'))
        setTranscribing(false)
        return
      }

      // Append to transcript
      const entry = {
        turn_id: currentTurn.id,
        student_text: text,
        duration_seconds: durationSec,
      }
      const newTranscript = [...transcript, entry]
      setTranscript(newTranscript)

      // Optionally compute instant feedback to show after each turn
      const localEval = evaluateTurn({ studentText: text, turn: currentTurn })
      void localEval // could be surfaced inline if desired

      setTranscribing(false)

      // Advance OR finalize
      if (currentTurn.is_terminal || currentTurnIndex >= turns.length - 1) {
        await finalizeAttempt(newTranscript)
      } else {
        setCurrentTurnIndex((i) => i + 1)
      }
    } catch (e) {
      setTranscribing(false)
      setLastError(e?.message || g('فشل تحويل الصوت — حاول مرة ثانية', 'فشل تحويل الصوت — حاولي مرة ثانية'))
    }
  }

  const finalizeAttempt = async (finalTranscript) => {
    try {
      const result = await invokeWithRetry('retention-dialogue-progress-eval', {
        body: { attempt_id: attemptId, scenario_id: scenarioId, transcript: finalTranscript },
      })
      if (!result?.ok) {
        setLastError(result?.error || 'تعذّر إنهاء التقييم')
        return
      }
      navigate(`/student/retention/daily-partner/result/${attemptId}`)
    } catch (e) {
      setLastError(e?.message || 'تعذّر إنهاء التقييم')
    }
  }

  const progressPct = turns.length > 0 ? Math.round(((currentTurnIndex + 1) / turns.length) * 100) : 0

  if (swt.isLoading) return <div className="p-8" dir="rtl"><div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} /></div>
  if (!scenario || !currentTurn) return <div className="p-8 text-center" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>المحادثة غير متوفرة.</div>

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm(g('متأكد من الخروج؟ سيتم فقد التقدّم الحالي.', 'متأكدة من الخروج؟ سيتم فقد التقدّم الحالي.'))) navigate('/student/retention/daily-partner')
            }}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            <ChevronLeft size={16} />
            خروج
          </button>
          <span className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
            {currentTurnIndex + 1} / {turns.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 overflow-hidden" style={{ background: 'var(--ds-surface-2)', borderRadius: 'var(--radius-full)' }}>
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
            style={{ background: 'var(--ds-accent-primary)', borderRadius: 'var(--radius-full)' }}
          />
        </div>

        {/* Persona name */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          مع {scenario.persona?.name_ar || ''}
        </div>

        {/* AI turn card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTurn.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <GlassPanel padding="lg">
              <p
                className="text-lg md:text-xl leading-relaxed"
                dir="ltr"
                style={{ color: 'var(--ds-text-primary)', textAlign: 'left' }}
              >
                {currentTurn.ai_text_en}
              </p>
              {currentTurn.ai_audio_path && (
                <div className="mt-3">
                  <RetentionAudioPlayer src={currentTurn.ai_audio_path} autoPlay size="sm" />
                </div>
              )}
            </GlassPanel>
          </motion.div>
        </AnimatePresence>

        {/* Student transcript so far */}
        {transcript.length > 0 && (
          <details className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
            <summary className="cursor-pointer">{g('عرض ما قلته', 'عرض ما قلتيه')} ({transcript.length})</summary>
            <ul className="mt-2 space-y-1">
              {transcript.map((t, i) => (
                <li key={i} dir="ltr" style={{ textAlign: 'left' }}>
                  <span className="font-mono">{i + 1}.</span> {t.student_text}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Recorder controls */}
        <GlassPanel padding="lg" className="text-center">
          {transcribing ? (
            <div className="flex items-center justify-center gap-2" style={{ color: 'var(--ds-text-secondary)' }}>
              <Loader2 size={20} className="animate-spin" />
              جاري التحويل…
            </div>
          ) : recording ? (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={stopRecord}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--ds-accent-danger)', color: 'var(--ds-text-inverse)' }}
            >
              <Square size={28} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startRecord}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)' }}
            >
              <Mic size={28} />
            </motion.button>
          )}
          <p className="mt-3 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
            {recording ? g('اضغط للإيقاف عند الانتهاء', 'اضغطي للإيقاف عند الانتهاء') : transcribing ? '' : g('اضغط وتكلم', 'اضغطي وتكلمي')}
          </p>
          {lastError && (
            <p className="mt-2 text-sm" style={{ color: 'var(--ds-accent-danger)' }}>{lastError}</p>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
