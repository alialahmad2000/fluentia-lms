import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square, RotateCcw } from 'lucide-react'

// MediaRecorder MIME detection — iOS Safari → audio/mp4; else try webm variants
function getSupportedMimeType() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  if (isIOS) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}

function getExtension(mimeType) {
  if (mimeType.startsWith('audio/mp4')) return 'mp4'
  return 'webm'
}

const STATES = { IDLE: 'IDLE', RECORDING: 'RECORDING', RECORDED: 'RECORDED', ERROR: 'ERROR' }

export default function AudioRecorder({ onRecorded, maxSeconds = 180, label = 'اضغط للتسجيل' }) {
  const [state, setState] = useState(STATES.IDLE)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState(null)
  const [blob, setBlob] = useState(null)
  const [mimeType, setMimeType] = useState('')

  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const startRecording = useCallback(async () => {
    setError(null)
    setBlob(null)
    setElapsed(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = getSupportedMimeType()
      setMimeType(mime)
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorder.current = recorder
      chunks.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = () => {
        const b = new Blob(chunks.current, { type: mime })
        setBlob(b)
        setState(STATES.RECORDED)
        if (onRecorded) onRecorded(b, mime, getExtension(mime))
        cleanup()
      }
      recorder.start(250)
      setState(STATES.RECORDING)
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= maxSeconds) {
            recorder.stop()
            clearInterval(timerRef.current)
            return prev + 1
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      setError('لا يمكن الوصول للميكروفون. تأكد من منح الإذن.')
      setState(STATES.ERROR)
    }
  }, [maxSeconds, onRecorded, cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setBlob(null)
    setElapsed(0)
    setState(STATES.IDLE)
    setError(null)
  }, [cleanup])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const progress = Math.min(100, (elapsed / maxSeconds) * 100)
  const maxMins = Math.floor(maxSeconds / 60)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Main button */}
      <div
        onClick={state === STATES.IDLE ? startRecording : state === STATES.RECORDING ? stopRecording : undefined}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: state === STATES.RECORDED ? 'default' : 'pointer',
          background: state === STATES.RECORDING
            ? 'rgba(239,68,68,0.2)'
            : state === STATES.RECORDED
            ? 'rgba(74,222,128,0.15)'
            : 'rgba(56,189,248,0.15)',
          border: state === STATES.RECORDING
            ? '2px solid rgba(239,68,68,0.6)'
            : state === STATES.RECORDED
            ? '2px solid rgba(74,222,128,0.5)'
            : '2px solid rgba(56,189,248,0.4)',
          animation: state === STATES.RECORDING ? 'pulse-mic 1.2s ease-in-out infinite' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        {state === STATES.RECORDING
          ? <Square size={28} style={{ color: '#ef4444' }} />
          : state === STATES.RECORDED
          ? <Mic size={28} style={{ color: '#4ade80' }} />
          : state === STATES.ERROR
          ? <MicOff size={28} style={{ color: '#ef4444' }} />
          : <Mic size={28} style={{ color: '#38bdf8' }} />
        }
      </div>

      {/* Status text */}
      <p style={{ fontSize: 14, fontFamily: 'Tajawal', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
        {state === STATES.IDLE && label}
        {state === STATES.RECORDING && `جاري التسجيل — ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} / ${maxMins}:00`}
        {state === STATES.RECORDED && 'تم التسجيل ✓'}
        {state === STATES.ERROR && (error || 'حدث خطأ')}
      </p>

      {/* Progress bar while recording */}
      {state === STATES.RECORDING && (
        <div style={{ width: '100%', maxWidth: 240, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#ef4444', borderRadius: 99, transition: 'width 1s linear' }} />
        </div>
      )}

      {/* Reset if recorded */}
      {state === STATES.RECORDED && (
        <button
          onClick={reset}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer' }}
        >
          <RotateCcw size={14} />
          إعادة التسجيل
        </button>
      )}

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
