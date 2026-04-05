import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, RotateCcw, Send, Loader2, CheckCircle, AlertCircle, Bot } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invokeWithRetry } from '../lib/invokeWithRetry'
import AudioPlayer from './AudioPlayer'

// ─── Helpers ──────────────────────────────────────
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

const formatTime = (s) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── States ───────────────────────────────────────
const STATE = { IDLE: 'idle', RECORDING: 'recording', RECORDED: 'recorded', UPLOADING: 'uploading', UPLOADED: 'uploaded', ERROR: 'error' }

// ─── Component ────────────────────────────────────
export default function VoiceRecorder({
  onUploadComplete,
  maxDuration = 180,
  studentId,
  unitId,
  questionIndex = 0,
  disabled = false,
  existingRecording = null,
}) {
  const [state, setState] = useState(existingRecording ? STATE.UPLOADED : STATE.IDLE)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(existingRecording?.audio_url || null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState(existingRecording?.ai_evaluation || null)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const barsRef = useRef([0, 0, 0, 0, 0, 0, 0, 0])
  const animFrameRef = useRef(null)
  const canvasRef = useRef(null)

  // Update existing recording when prop changes
  useEffect(() => {
    if (existingRecording) {
      if (existingRecording.audio_url) {
        setAudioUrl(existingRecording.audio_url)
      }
      if (existingRecording.ai_evaluation) {
        setEvaluation(existingRecording.ai_evaluation)
      }
      if (state === STATE.IDLE) setState(STATE.UPLOADED)

      // If no audio_url but have audio_path, regenerate signed URL
      if (!existingRecording.audio_url && existingRecording.audio_path) {
        supabase.storage
          .from('voice-notes')
          .createSignedUrl(existingRecording.audio_path, 60 * 60)
          .then(({ data }) => {
            if (data?.signedUrl) setAudioUrl(data.signedUrl)
          })
      }
    }
  }, [existingRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  // Warn before navigating away during recording
  useEffect(() => {
    if (state !== STATE.RECORDING) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state])

  // ─── Waveform visualization ───
  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return

    const ctx = canvas.getContext('2d')
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)

    const bars = 10
    const w = canvas.width
    const h = canvas.height
    const barW = w / bars - 2

    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * dataArray.length)
      const val = dataArray[idx] / 255
      const barH = Math.max(4, val * h * 0.8)
      const x = i * (barW + 2)
      const y = (h - barH) / 2

      ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + val * 0.6})`
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, 2)
      ctx.fill()
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }, [])

  // ─── Start Recording ───
  const startRecording = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      })
      streamRef.current = stream

      // Audio context for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Use RecordRTC for Safari compatibility
      const RecordRTC = (await import('recordrtc')).default
      const mimeType = getSupportedMimeType()

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType,
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
      })

      recorder.startRecording()
      recorderRef.current = recorder

      setState(STATE.RECORDING)
      setElapsed(0)

      // Timer
      const start = Date.now()
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - start) / 1000)
        setElapsed(secs)
        // Warning at 2:30
        if (secs === 150) setError('باقي 30 ثانية!')
        // Auto-stop at max
        if (secs >= maxDuration) stopRecording()
      }, 1000)

      // Start waveform
      drawWaveform()
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('يرجى السماح بالوصول للمايكروفون من إعدادات المتصفح')
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على مايكروفون — تأكد من توصيل سماعة')
      } else {
        setError('حدث خطأ أثناء بدء التسجيل')
      }
      setState(STATE.ERROR)
    }
  }, [maxDuration, drawWaveform])

  // ─── Stop Recording ───
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)

    const recorder = recorderRef.current
    if (!recorder) return

    recorder.stopRecording(() => {
      const blob = recorder.getBlob()
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      setState(STATE.RECORDED)

      // Stop mic stream
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    })
  }, [])

  // ─── Upload Recording ───
  const uploadRecording = useCallback(async () => {
    if (!audioBlob || !studentId || !unitId) return
    setState(STATE.UPLOADING)
    setUploadProgress(10)
    setError('')

    try {
      const mimeType = audioBlob.type || getSupportedMimeType()
      const ext = getExtension(mimeType)
      const timestamp = Date.now()
      const filePath = `${studentId}/${unitId}_${questionIndex}_${timestamp}.${ext}`

      // Check file size (5MB limit)
      if (audioBlob.size > 5 * 1024 * 1024) {
        setError('التسجيل كبير جداً — حاول تسجيل أقصر')
        setState(STATE.RECORDED)
        return
      }

      setUploadProgress(30)

      // 1. Upload to storage (strip codec params for Supabase bucket MIME matching)
      const uploadContentType = mimeType.split(';')[0]
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, audioBlob, { contentType: uploadContentType, upsert: false })

      if (uploadError) throw uploadError
      setUploadProgress(60)

      // 2. Get signed URL
      const { data: urlData } = await supabase.storage
        .from('voice-notes')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365)

      const signedUrl = urlData?.signedUrl
      if (!signedUrl) throw new Error('Failed to get signed URL')
      setUploadProgress(75)

      // 3. Save to speaking_recordings
      const { data: recording, error: dbError } = await supabase
        .from('speaking_recordings')
        .insert({
          student_id: studentId,
          unit_id: unitId,
          question_index: questionIndex,
          audio_url: signedUrl,
          audio_path: filePath,
          audio_duration_seconds: Math.round(elapsed),
          audio_format: mimeType,
          audio_size_bytes: audioBlob.size,
        })
        .select()
        .single()

      if (dbError) throw dbError
      setUploadProgress(85)

      // 4. XP — only for first recording per question
      const { data: existing } = await supabase
        .from('speaking_recordings')
        .select('id')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .eq('question_index', questionIndex)

      if (existing && existing.length === 1) {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: 10,
          reason: 'voice_note_bonus',
          description: 'تسجيل نشاط تحدث',
          related_id: recording.id,
        })
      }

      // 5. Notify trainer
      const { data: studentData } = await supabase
        .from('students')
        .select('group_id, groups(trainer_id)')
        .eq('id', studentId)
        .single()

      if (studentData?.groups?.trainer_id) {
        await supabase.from('notifications').insert({
          user_id: studentData.groups.trainer_id,
          type: 'speaking_recorded',
          title: 'تسجيل تحدث جديد',
          body: 'قام طالب بتسجيل نشاط تحدث جديد',
          data: { recording_id: recording.id, unit_id: unitId, student_id: studentId },
        })
      }

      setUploadProgress(100)
      setAudioUrl(signedUrl)
      setState(STATE.UPLOADED)
      onUploadComplete?.(signedUrl, recording.id)

      // Trigger AI evaluation (non-blocking)
      triggerEvaluation(recording.id)
    } catch (err) {
      console.error('Upload failed:', err?.message || err, {
        studentId,
        unitId,
        questionIndex,
        fileSize: audioBlob?.size,
        mimeType: audioBlob?.type,
      })
      setError('فشل رفع التسجيل — اضغط لإعادة المحاولة')
      setState(STATE.RECORDED) // Keep the blob so they can retry
    }
  }, [audioBlob, studentId, unitId, questionIndex, elapsed, onUploadComplete])

  // ─── Trigger AI Evaluation ───
  const triggerEvaluation = useCallback(async (recordingId) => {
    if (!recordingId) return
    setEvaluating(true)
    setEvaluation(null)
    try {
      const { data, error } = await invokeWithRetry('evaluate-speaking', {
        body: { recording_id: recordingId },
      }, { timeoutMs: 90000, retries: 0 })

      if (error) {
        console.error('[VoiceRecorder] Evaluation error:', error)
        return
      }

      // Handle different response formats (data could be Blob, string, or object)
      let parsed = data
      if (data instanceof Blob) {
        try { parsed = JSON.parse(await data.text()) } catch { parsed = null }
      } else if (typeof data === 'string') {
        try { parsed = JSON.parse(data) } catch { parsed = null }
      }

      if (parsed?.evaluation) {
        setEvaluation(parsed.evaluation)
        // Invalidate recordings query so evaluation persists on refresh
        onUploadComplete?.()
      }
    } catch (err) {
      console.error('[VoiceRecorder] Evaluation invoke failed:', err)
    } finally {
      setEvaluating(false)
    }
  }, [onUploadComplete])

  // ─── Re-record ───
  const reRecord = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setElapsed(0)
    setError('')
    setState(STATE.IDLE)
  }, [])

  // ─── Render ───
  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {/* IDLE */}
        {state === STATE.IDLE && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <button
              onClick={startRecording}
              disabled={disabled}
              className="w-20 h-20 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center hover:bg-sky-500/25 transition-colors border border-sky-500/20 disabled:opacity-40"
            >
              <Mic size={32} />
            </button>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">اضغط للتسجيل</p>
          </motion.div>
        )}

        {/* RECORDING */}
        {state === STATE.RECORDING && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4 py-4"
          >
            {/* Pulsing red ring + stop button */}
            <div className="relative">
              <div className="absolute inset-[-8px] rounded-full border-2 border-red-500/40 animate-ping" style={{ animationDuration: '1.5s' }} />
              <button
                onClick={stopRecording}
                className="relative w-20 h-20 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center border-2 border-red-500/30 hover:bg-red-500/25 transition-colors"
              >
                <Square size={24} fill="currentColor" />
              </button>
            </div>

            {/* Timer */}
            <p className="text-lg font-bold tabular-nums font-['Inter']" style={{ color: elapsed >= 150 ? '#ef4444' : 'var(--text-primary)' }}>
              {formatTime(elapsed)}
            </p>

            {/* Waveform */}
            <canvas
              ref={canvasRef}
              width={200}
              height={40}
              className="w-full max-w-[200px]"
            />

            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">اضغط لإيقاف التسجيل</p>
          </motion.div>
        )}

        {/* RECORDED */}
        {state === STATE.RECORDED && (
          <motion.div
            key="recorded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {audioUrl && <AudioPlayer src={audioUrl} duration={elapsed} />}
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={reRecord}
                className="flex items-center gap-1.5 px-4 h-11 rounded-xl text-xs font-bold font-['Tajawal'] text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw size={14} />
                إعادة التسجيل
              </button>
              <button
                onClick={uploadRecording}
                className="flex items-center gap-1.5 px-6 h-11 rounded-xl text-sm font-bold font-['Tajawal'] text-white bg-sky-500 hover:bg-sky-600 transition-colors"
              >
                <Send size={14} />
                إرسال
              </button>
            </div>
          </motion.div>
        )}

        {/* UPLOADING */}
        {state === STATE.UPLOADING && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <Loader2 size={28} className="text-sky-400 animate-spin" />
            <p className="text-sm font-bold text-sky-400 font-['Tajawal']">جاري الرفع...</p>
            <div className="w-48 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] tabular-nums">{uploadProgress}%</p>
          </motion.div>
        )}

        {/* UPLOADED */}
        {state === STATE.UPLOADED && (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {audioUrl && <AudioPlayer src={audioUrl} duration={existingRecording?.audio_duration_seconds || elapsed} />}
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle size={16} />
              <span className="text-sm font-bold font-['Tajawal']">تم الرفع بنجاح</span>
            </div>

            {/* AI Evaluation status */}
            {evaluating && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 size={14} className="text-sky-400 animate-spin" />
                <span className="text-xs text-sky-400 font-['Tajawal']">جاري التقييم بالذكاء الاصطناعي...</span>
              </div>
            )}
            {!evaluating && evaluation && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Bot size={13} className="text-sky-400" />
                  <span className="text-xs font-bold text-sky-400 font-['Tajawal']">تقييم الذكاء الاصطناعي</span>
                  {evaluation.overall_score != null && (
                    <span className="mr-auto text-sm font-bold tabular-nums" style={{ color: evaluation.overall_score >= 8 ? '#22c55e' : evaluation.overall_score >= 6 ? '#38bdf8' : '#f59e0b' }}>
                      {evaluation.overall_score}/10
                    </span>
                  )}
                </div>
                {evaluation.feedback_ar && (
                  <p className="text-[11px] text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed">{evaluation.feedback_ar}</p>
                )}
              </motion.div>
            )}
            {!evaluating && !evaluation && state === STATE.UPLOADED && !existingRecording?.ai_evaluation && (
              <p className="text-[10px] text-center text-[var(--text-muted)] font-['Tajawal']">التقييم سيكون متاحاً قريباً</p>
            )}

            <div className="flex justify-center">
              <button
                onClick={reRecord}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-xs font-bold font-['Tajawal'] text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw size={13} />
                إعادة التسجيل
              </button>
            </div>
          </motion.div>
        )}

        {/* ERROR (standalone, when no blob) */}
        {state === STATE.ERROR && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-red-400 font-['Tajawal'] text-center max-w-xs">{error}</p>
            <button
              onClick={() => { setError(''); setState(STATE.IDLE) }}
              className="px-4 h-10 rounded-xl text-xs font-bold font-['Tajawal'] text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 transition-colors"
            >
              حاول مرة أخرى
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline error (for non-fatal errors like "30 seconds left") */}
      {error && state !== STATE.ERROR && (
        <p className="text-xs text-center text-amber-400 font-['Tajawal']">{error}</p>
      )}
    </div>
  )
}
