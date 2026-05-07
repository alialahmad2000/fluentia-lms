import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2, ChevronDown, Volume2, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

const PRACTICE_CAP = 5
const MAX_DURATION_SEC = 30

// ── Audio helpers (same as VoiceRecorder) ─────────────
const getSupportedMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return 'audio/mp4'
  if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) return 'audio/mp4'
  if (window.navigator.standalone) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}
const getExtension = (mimeType) => {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'mp4'
}
const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const RECORD_STATE = { IDLE: 'idle', RECORDING: 'recording', PROCESSING: 'processing' }

// ── Score badge color ─────────────────────────────────
const scoreBg = (s) => {
  if (s == null) return 'rgba(255,255,255,0.08)'
  if (s >= 8) return 'rgba(34,197,94,0.18)'
  if (s >= 6) return 'rgba(56,189,248,0.18)'
  if (s >= 4) return 'rgba(245,158,11,0.18)'
  return 'rgba(239,68,68,0.18)'
}
const scoreColor = (s) => {
  if (s == null) return 'var(--text-muted)'
  if (s >= 8) return '#22c55e'
  if (s >= 6) return '#38bdf8'
  if (s >= 4) return '#f59e0b'
  return '#ef4444'
}

// ── FeedbackCard ──────────────────────────────────────
function FeedbackCard({ attempt, expanded, onToggle }) {
  const fb = attempt.feedback || {}
  const score = fb.score_1to10

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-right"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
            محاولة #{attempt.attempt_number}
          </span>
          {score != null && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold font-['Tajawal']"
              style={{ background: scoreBg(score), color: scoreColor(score) }}
            >
              {score}/10
            </span>
          )}
          {fb.encouragement && (
            <span className="text-[11px] font-['Tajawal'] truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
              {fb.encouragement}
            </span>
          )}
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {attempt.transcript && (
                <div>
                  <p className="text-[10px] font-bold font-['Tajawal'] mb-1" style={{ color: 'var(--text-muted)' }}>ما قلته:</p>
                  <p className="text-xs font-['Inter'] leading-relaxed" dir="ltr" style={{ color: 'var(--text-secondary)' }}>
                    "{attempt.transcript}"
                  </p>
                </div>
              )}
              {fb.pronunciation_notes && (
                <p className="text-xs font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  🎙 {fb.pronunciation_notes}
                </p>
              )}
              {fb.fluency_note && (
                <p className="text-xs font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  ⚡ {fb.fluency_note}
                </p>
              )}
              {fb.suggestion && (
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: 'rgba(168,85,247,0.08)', borderRight: '3px solid rgba(168,85,247,0.4)' }}
                >
                  <p className="text-xs font-bold font-['Tajawal']" style={{ color: '#a855f7' }}>
                    💡 {fb.suggestion}
                  </p>
                </div>
              )}
              {attempt.audio_path && (
                <AudioReplay audioPath={attempt.audio_path} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Signed URL audio replay ───────────────────────────
function AudioReplay({ audioPath }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.storage.from('voice-notes').createSignedUrl(audioPath, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setSrc(data.signedUrl) })
    return () => { cancelled = true }
  }, [audioPath])

  if (!src) return null
  return (
    <div className="flex items-center gap-2 pt-1">
      <Volume2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <audio controls src={src} className="w-full h-8" style={{ filter: 'invert(0.7)' }} />
    </div>
  )
}

// ── Main PracticeMode ─────────────────────────────────
export default function PracticeMode({ taskId, studentId, taskTitle }) {
  const [recordState, setRecordState] = useState(RECORD_STATE.IDLE)
  const [elapsed, setElapsed] = useState(0)
  const [attempts, setAttempts] = useState([])
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [loadingPast, setLoadingPast] = useState(true)

  const recorderRef = useRef(null)
  const streamRef   = useRef(null)
  const timerRef    = useRef(null)
  const isMounted   = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // Load past attempts from DB
  useEffect(() => {
    if (!studentId || !taskId) { setLoadingPast(false); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('speaking_practice_attempts')
        .select('*')
        .eq('student_id', studentId)
        .eq('task_id', taskId)
        .order('attempt_number', { ascending: true })
      if (cancelled || !isMounted.current) return
      if (data) setAttempts(data)
      setLoadingPast(false)
    })()
    return () => { cancelled = true }
  }, [studentId, taskId])

  const attemptsLeft = Math.max(0, PRACTICE_CAP - attempts.length)
  const capReached = attempts.length >= PRACTICE_CAP

  // ── Recording ─────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (capReached) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      })
      streamRef.current = stream

      const RecordRTC = (await import('recordrtc')).default
      const mimeType = getSupportedMimeType()
      const recorder = new RecordRTC(stream, {
        type: 'audio', mimeType,
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1, desiredSampRate: 16000,
      })
      recorder.startRecording()
      recorderRef.current = recorder

      setElapsed(0)
      setRecordState(RECORD_STATE.RECORDING)

      const start = Date.now()
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - start) / 1000)
        if (!isMounted.current) { clearInterval(timerRef.current); return }
        setElapsed(secs)
        if (secs >= MAX_DURATION_SEC) stopRecording()
      }, 1000)
    } catch (e: any) {
      toast({ type: 'error', title: 'تعذر الوصول للمايكروفون' })
    }
  }, [capReached])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.stopRecording(async () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const blob = recorder.getBlob()
      if (!isMounted.current) return
      setRecordState(RECORD_STATE.PROCESSING)
      await uploadAndEvaluate(blob)
    })
  }, [])

  const uploadAndEvaluate = useCallback(async (blob) => {
    try {
      const mimeType = blob.type || getSupportedMimeType()
      const ext = getExtension(mimeType)
      const ts = Date.now()
      const audioPath = `practice/${studentId}/${taskId}/${ts}.${ext}`
      const durationSec = elapsed || 0

      // Duration guard (client-side)
      if (durationSec < 2) {
        toast({ type: 'warning', title: 'تسجيل قصير جداً. سجل جملة كاملة' })
        setRecordState(RECORD_STATE.IDLE)
        return
      }

      // Upload to voice-notes bucket
      const uploadMime = mimeType.split(';')[0]
      const { error: uploadErr } = await supabase.storage
        .from('voice-notes')
        .upload(audioPath, blob, { contentType: uploadMime, upsert: false })
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      // Invoke edge function
      const { data, error } = await supabase.functions.invoke('evaluate-practice-attempt', {
        body: { student_id: studentId, task_id: taskId, audio_path: audioPath, duration_sec: durationSec },
      })

      if (error) throw new Error(error.message)

      // Handle Arabic error messages from edge function
      if (data?.error && data?.message_ar) {
        toast({ type: 'warning', title: data.message_ar })
        setRecordState(RECORD_STATE.IDLE)
        return
      }

      // Add new attempt to state
      if (isMounted.current && data?.ok) {
        const newAttempt = {
          id: `local-${ts}`,
          attempt_number: data.attempt_number,
          audio_path: audioPath,
          audio_duration_sec: durationSec,
          transcript: data.transcript,
          feedback: data.feedback,
        }
        setAttempts(prev => [...prev, newAttempt])
        setExpandedIdx(data.attempt_number - 1)  // auto-expand latest
      }
    } catch (e: any) {
      console.error('[PracticeMode]', e.message)
      toast({ type: 'error', title: 'حدث خطأ أثناء المعالجة — حاول مرة ثانية' })
    } finally {
      if (isMounted.current) setRecordState(RECORD_STATE.IDLE)
    }
  }, [studentId, taskId, elapsed])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          🎯 وضع التدريب
        </p>
        <span
          className="px-2.5 py-1 rounded-full text-[11px] font-bold font-['Tajawal']"
          style={{ background: capReached ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', color: capReached ? '#ef4444' : 'var(--text-muted)' }}
        >
          {attemptsLeft} / {PRACTICE_CAP} محاولات متبقية
        </span>
      </div>

      <p className="text-[13px] font-['Tajawal'] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        سجل جملة قصيرة (أقل من 30 ثانية) واستلم ملاحظات فورية. مرّن نفسك قبل التسجيل النهائي.
      </p>

      {/* Record button */}
      {!capReached && recordState !== RECORD_STATE.PROCESSING && (
        <div className="flex flex-col items-center gap-3 py-4">
          {recordState === RECORD_STATE.IDLE ? (
            <>
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-colors"
                style={{ background: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.35)' }}
              >
                <Mic size={24} style={{ color: '#a855f7' }} />
              </button>
              <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>اضغط للتسجيل</p>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-[-6px] rounded-full border-2 border-red-500/40 animate-ping" style={{ animationDuration: '1.5s' }} />
                <button
                  onClick={stopRecording}
                  className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 border-red-500/30"
                  style={{ background: 'rgba(239,68,68,0.12)' }}
                >
                  <Square size={20} fill="currentColor" style={{ color: '#ef4444' }} />
                </button>
              </div>
              <p className="text-lg font-bold tabular-nums" style={{ color: elapsed >= 25 ? '#ef4444' : 'var(--text-primary)' }}>
                {formatTime(elapsed)} / {formatTime(MAX_DURATION_SEC)}
              </p>
              <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>اضغط لإيقاف التسجيل</p>
            </>
          )}
        </div>
      )}

      {/* Processing state */}
      {recordState === RECORD_STATE.PROCESSING && (
        <div className="flex items-center justify-center gap-3 py-6">
          <Loader2 size={20} className="animate-spin" style={{ color: '#a855f7' }} />
          <span className="text-sm font-bold font-['Tajawal']" style={{ color: '#a855f7' }}>نسمعك ونعطيك ملاحظات...</span>
        </div>
      )}

      {/* Cap reached */}
      {capReached && (
        <div
          className="rounded-xl p-4 text-center space-y-1"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <p className="text-sm font-bold font-['Tajawal']" style={{ color: '#a855f7' }}>
            انتهت محاولاتك التدريبية ({PRACTICE_CAP}/{PRACTICE_CAP}) ✓
          </p>
          <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
            انتقل الآن للتسجيل النهائي!
          </p>
        </div>
      )}

      {/* Past attempts */}
      {!loadingPast && attempts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold font-['Tajawal'] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            محاولاتك السابقة
          </p>
          {attempts.map((a, i) => (
            <FeedbackCard
              key={a.id}
              attempt={a}
              expanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
