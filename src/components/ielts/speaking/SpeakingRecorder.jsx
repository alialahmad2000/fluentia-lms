import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, RotateCcw, AlertTriangle } from 'lucide-react'

function getSupportedMimeType() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}

function getExtension(mimeType) {
  return mimeType.startsWith('audio/mp4') ? 'mp4' : 'webm'
}

const STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  RECORDING: 'recording',
  TOO_SHORT: 'too_short',
  DONE: 'done',
  ERROR: 'error',
}

/**
 * SpeakingRecorder — variant of AudioRecorder for IELTS Speaking Lab.
 * Props:
 *   onRecorded(blob, mimeType, extension, durationSec) — called after valid recording
 *   maxSeconds — auto-stop at this duration (default: 120)
 *   minSeconds — reject recordings shorter than this (default: 8)
 *   disabled — disables all controls
 */
export default function SpeakingRecorder({ onRecorded, maxSeconds = 120, minSeconds = 8, disabled = false }) {
  const [state, setState] = useState(STATES.IDLE)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const elapsedRef = useRef(0)

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const stopRecording = useCallback((cancelled = false) => {
    clearInterval(timerRef.current)
    const duration = elapsedRef.current
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.onstop = () => {
        if (cancelled) { cleanup(); setState(STATES.IDLE); return }
        if (duration < minSeconds) {
          cleanup()
          setState(STATES.TOO_SHORT)
          setTimeout(() => setState(STATES.IDLE), 2500)
          return
        }
        const mime = mediaRecorder.current?.mimeType || 'audio/webm'
        const blob = new Blob(chunks.current, { type: mime })
        cleanup()
        setState(STATES.DONE)
        if (onRecorded) onRecorded(blob, mime, getExtension(mime), duration)
      }
      mediaRecorder.current.stop()
    } else {
      if (!cancelled) cleanup()
      setState(STATES.IDLE)
    }
  }, [minSeconds, onRecorded, cleanup])

  const startRecording = useCallback(async () => {
    if (disabled) return
    setError(null)
    chunks.current = []
    elapsedRef.current = 0
    setElapsed(0)
    setState(STATES.REQUESTING)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = getSupportedMimeType()
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorder.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      mr.start(250)
      setState(STATES.RECORDING)
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(e => {
          const next = e + 1
          if (next >= maxSeconds) stopRecording()
          return next
        })
      }, 1000)
    } catch (err) {
      cleanup()
      const isPermission = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
      setError(isPermission ? 'permission_denied' : 'unsupported')
      setState(STATES.ERROR)
    }
  }, [disabled, maxSeconds, stopRecording, cleanup])

  const reset = useCallback(() => {
    cleanup()
    chunks.current = []
    elapsedRef.current = 0
    setElapsed(0)
    setState(STATES.IDLE)
    setError(null)
  }, [cleanup])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const pct = maxSeconds > 0 ? Math.min((elapsed / maxSeconds) * 100, 100) : 0
  const isRecording = state === STATES.RECORDING

  if (!('MediaRecorder' in window)) {
    return (
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Tajawal' }}>
          متصفحك لا يدعم التسجيل الصوتي. استخدم Chrome أو Firefox أو Edge الحديثة.
        </p>
      </div>
    )
  }

  if (state === STATES.ERROR) {
    return (
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'Tajawal', marginBottom: 4 }}>
              {error === 'permission_denied' ? 'لم يتم السماح باستخدام الميكروفون' : 'الميكروفون غير متاح'}
            </p>
            {error === 'permission_denied' && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
                افتح إعدادات المتصفح → الخصوصية والأمان → الميكروفون → اسمح لهذا الموقع
              </p>
            )}
          </div>
        </div>
        <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (state === STATES.TOO_SHORT) {
    return (
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal' }}>
          التسجيل قصير جداً (أقل من {minSeconds} ثانية) — أعد التسجيل
        </p>
      </div>
    )
  }

  if (state === STATES.DONE) {
    return (
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal' }}>
          ✓ تم التسجيل ({String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')})
        </p>
        <button
          onClick={reset}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer' }}
        >
          <RotateCcw size={13} /> إعادة التسجيل
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isRecording && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'Tajawal', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
              جاري التسجيل
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', fontVariantNumeric: 'tabular-nums' }}>
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')} / {String(Math.floor(maxSeconds/60)).padStart(2,'0')}:{String(maxSeconds%60).padStart(2,'0')}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct > 85 ? '#fb923c' : '#ef4444', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={disabled || state === STATES.REQUESTING}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 12,
              background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.15)',
              color: disabled ? 'var(--text-tertiary)' : '#ef4444',
              border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.35)'}`,
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            <Mic size={18} />
            {state === STATES.REQUESTING ? 'طلب الإذن...' : 'ابدأ التسجيل'}
          </button>
        ) : (
          <button
            onClick={() => stopRecording(false)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 12,
              background: 'rgba(239,68,68,0.2)', color: '#ef4444',
              border: '1.5px solid rgba(239,68,68,0.4)',
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            <Square size={16} />
            إيقاف التسجيل
          </button>
        )}
        {isRecording && (
          <button
            onClick={() => stopRecording(true)}
            style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            title="إلغاء"
          >
            ✕
          </button>
        )}
      </div>
      {!isRecording && state === STATES.IDLE && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', textAlign: 'center' }}>
          الحد الأدنى {minSeconds} ثانية · الحد الأقصى {Math.floor(maxSeconds/60)} دقيقة {maxSeconds%60>0?`و${maxSeconds%60} ثانية`:''}
        </p>
      )}
    </div>
  )
}
