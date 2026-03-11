import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react'

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioUrl && !existingUrl) URL.revokeObjectURL(audioUrl)
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

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgba(6, 14, 28, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#38bdf8'
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

  async function startRecording() {
    setError('')
    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('متصفحك لا يدعم التسجيل الصوتي')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Setup analyser for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setState('recorded')

        // Notify parent
        const ext = getFileExtension(mimeType)
        onRecordingComplete({ blob, mimeType, ext, duration })

        // Cleanup stream
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        cancelAnimationFrame(animFrameRef.current)
        audioContext.close()
      }

      recorder.start(100) // collect data every 100ms
      setState('recording')
      setDuration(0)

      // Timer
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 200)

      // Waveform
      drawWaveform()
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('السماح بالوصول للمايكروفون مطلوب')
      } else if (err.name === 'NotFoundError') {
        setError('لم يتم العثور على مايكروفون')
      } else {
        setError('خطأ في التسجيل: ' + err.message)
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

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1 text-sm text-muted">
        <Mic size={14} />
        تسجيل صوتي
      </label>

      {/* Waveform canvas — visible during recording */}
      {state === 'recording' && (
        <canvas
          ref={canvasRef}
          width={400}
          height={60}
          className="w-full h-[60px] rounded-lg bg-navy-900"
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm"
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
            <span className="text-red-400 text-sm font-mono tabular-nums">{formatTime(duration)}</span>
          </>
        )}

        {(state === 'recorded' || state === 'playing') && (
          <>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all text-sm"
            >
              {state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
              <span>{state === 'playing' ? 'إيقاف' : 'تشغيل'}</span>
            </button>
            <span className="text-muted text-sm font-mono tabular-nums">{formatTime(duration)}</span>
            <button
              type="button"
              onClick={deleteRecording}
              className="p-2 text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
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
