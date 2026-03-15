import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react'

const MAX_DURATION = 180 // 3 minutes max

// Safari/iOS uses audio/mp4, everything else uses audio/webm
function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

function getFileExtension(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('aac')) return 'aac'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export default function VoiceRecorder({ onRecordingComplete, existingUrl }) {
  const [state, setState] = useState('idle') // idle | recording | recorded | playing
  const [duration, setDuration] = useState(0)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [error, setError] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(existingUrl || null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const durationRef = useRef(0)
  const mimeTypeRef = useRef('')

  // Cleanup on unmount — auto-save if recording is in progress
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      // If still recording on unmount, stop and save
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close().catch(() => {})
      }
      if (audioUrl && !existingUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  // Handle visibility change (tab switch, lock screen on iOS)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && mediaRecorderRef.current?.state === 'recording') {
        // Auto-stop and save when tab/app goes to background
        stopRecording()
      }
    }

    // Handle iOS Safari audio interruption (phone call, etc.)
    function handlePause() {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    // iOS fires 'pause' on audio interruption
    window.addEventListener('blur', handlePause)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handlePause)
    }
  }, [])

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const styles = getComputedStyle(document.documentElement)
    const canvasBg = styles.getPropertyValue('--canvas-bg').trim() || 'rgba(6, 14, 28, 0.3)'
    const canvasStroke = styles.getPropertyValue('--canvas-stroke').trim() || '#38bdf8'

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = canvasBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = canvasStroke
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
  }, [])

  function finishRecording(blob, finalDuration) {
    const mimeType = mimeTypeRef.current
    const url = URL.createObjectURL(blob)
    setAudioBlob(blob)
    setAudioUrl(url)
    setState('recorded')

    const ext = getFileExtension(mimeType)
    onRecordingComplete({ blob, mimeType, ext, duration: finalDuration })
  }

  async function startRecording() {
    setError('')
    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('متصفحك لا يدعم التسجيل الصوتي')
      return
    }
    mimeTypeRef.current = mimeType

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup analyser for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const finalDuration = durationRef.current
        finishRecording(blob, finalDuration)

        // Cleanup stream
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        cancelAnimationFrame(animFrameRef.current)
        audioContext.close().catch(() => {})
      }

      // Handle stream ending unexpectedly (mic disconnected)
      stream.getAudioTracks()[0].addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setError('تم قطع التسجيل — تم حفظ ما سُجّل')
          stopRecording()
        }
      })

      recorder.start(100) // collect data every 100ms
      setState('recording')
      setDuration(0)
      durationRef.current = 0

      // Timer with max duration enforcement
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setDuration(elapsed)
        durationRef.current = elapsed

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION) {
          clearInterval(timerRef.current)
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
        }
      }, 200)

      // Waveform
      drawWaveform()
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('السماح بالوصول للمايكروفون مطلوب')
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على مايكروفون')
      } else if (err.name === 'NotReadableError') {
        setError('المايكروفون مستخدم من تطبيق آخر')
      } else {
        setError('خطأ في التسجيل — حاول مرة أخرى')
      }
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return
    if (state === 'playing') {
      audioRef.current.pause()
      setState('recorded')
    } else {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      setState('playing')
    }
  }

  function deleteRecording() {
    if (audioUrl && !existingUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setState('idle')
    setDuration(0)
    setPlaybackTime(0)
    onRecordingComplete(null)
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const remainingTime = MAX_DURATION - duration
  const isNearLimit = state === 'recording' && remainingTime <= 30

  return (
    <div className="space-y-3">
      <label className="input-label flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Mic size={14} className="text-red-400" />
        </div>
        تسجيل صوتي
        <span className="text-xs text-muted/60 mr-1">(حد أقصى {MAX_DURATION / 60} دقائق)</span>
      </label>

      {/* Waveform canvas — visible during recording */}
      {state === 'recording' && (
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          className="w-full h-[60px] rounded-lg"
          style={{ background: 'var(--surface-raised)' }}
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            className="btn-danger flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm hover:translate-y-[-2px] transition-all duration-200"
          >
            <Mic size={16} />
            <span>ابدأ التسجيل</span>
          </button>
        )}

        {state === 'recording' && (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all text-sm animate-pulse"
            >
              <Square size={14} fill="currentColor" />
              <span>إيقاف</span>
            </button>
            <span className={`text-sm font-mono tabular-nums ${isNearLimit ? 'text-red-400' : 'text-muted'}`}>
              {formatTime(duration)}
            </span>
            {isNearLimit && (
              <span className="text-xs text-red-400 animate-pulse">
                متبقي {formatTime(remainingTime)}
              </span>
            )}
          </>
        )}

        {(state === 'recorded' || state === 'playing') && (
          <>
            <button
              type="button"
              onClick={togglePlayback}
              className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm hover:translate-y-[-2px] transition-all duration-200"
            >
              {state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
              <span>{state === 'playing' ? 'إيقاف' : 'تشغيل'}</span>
            </button>
            <span className="text-muted text-sm font-mono tabular-nums">{formatTime(duration)}</span>
            <button
              type="button"
              onClick={deleteRecording}
              className="btn-ghost p-2 text-muted hover:text-red-400 transition-all duration-200 rounded-xl hover:bg-red-500/10"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setState('recorded')}
          onTimeUpdate={() => audioRef.current && setPlaybackTime(Math.floor(audioRef.current.currentTime))}
        />
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
