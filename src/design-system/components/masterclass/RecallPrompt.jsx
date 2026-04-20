import { useEffect, useRef, useState } from 'react'

const MIC_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

const STOP_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
)

export default function RecallPrompt({
  promptText,
  onSubmit,
  acceptVoice = false,
  acceptText = true,
  timeLimit,
  onSkip,
  className = '',
}) {
  const [answer, setAnswer] = useState('')
  const [recording, setRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(timeLimit ?? null)
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!timeLimit) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          handleSubmit('text')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(mode = 'text') {
    if (submitted) return
    setSubmitted(true)
    onSubmit?.(answer, mode)
  }

  async function toggleRecording() {
    if (recording) {
      mediaRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecording(false)
        onSubmit?.(blob, 'voice')
        setSubmitted(true)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
    } catch {
      // microphone access denied — silently ignore
    }
  }

  const charCount = answer.length
  const maxChars = timeLimit ? timeLimit * 5 : undefined

  return (
    <div
      dir="rtl"
      className={className}
      style={{
        maxWidth: 600,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      {/* Prompt text */}
      <div style={{
        padding: 'var(--space-5)',
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-md)',
        borderInlineStart: '3px solid var(--ds-accent-primary)',
      }}>
        <p style={{
          margin: 0,
          fontSize: 17,
          lineHeight: 1.7,
          color: 'var(--ds-text-primary)',
          fontFamily: "'Tajawal', sans-serif",
          fontWeight: 600,
        }}>
          {promptText}
        </p>
      </div>

      {/* Timer */}
      {secondsLeft != null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span style={{
            fontSize: 13,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontVariantNumeric: 'tabular-nums',
            color: secondsLeft <= 10 ? 'var(--ds-accent-danger)' : 'var(--ds-text-tertiary)',
            fontWeight: 600,
          }}>
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Text input */}
      {acceptText && (
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={submitted || recording}
            maxLength={maxChars}
            placeholder="اكتب إجابتك هنا..."
            aria-label="إجابتك"
            rows={5}
            style={{
              width: '100%',
              padding: 'var(--space-4)',
              background: 'var(--ds-surface-1)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--ds-text-primary)',
              fontSize: 15,
              fontFamily: "'Tajawal', sans-serif",
              lineHeight: 1.7,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color var(--motion-fast) var(--ease-out)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--ds-accent-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--ds-border-subtle)'}
          />
          {maxChars && (
            <span style={{
              position: 'absolute',
              bottom: 'var(--space-2)',
              insetInlineEnd: 'var(--space-3)',
              fontSize: 11,
              color: 'var(--ds-text-tertiary)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              {charCount}/{maxChars}
            </span>
          )}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        {acceptText && (
          <button
            onClick={() => handleSubmit('text')}
            disabled={submitted || !answer.trim()}
            style={{
              flex: 1,
              padding: 'var(--space-3) var(--space-5)',
              background: answer.trim() ? 'var(--ds-accent-primary)' : 'var(--ds-surface-2)',
              color: answer.trim() ? 'var(--ds-text-inverse)' : 'var(--ds-text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              cursor: answer.trim() && !submitted ? 'pointer' : 'default',
              transition: 'all var(--motion-fast) var(--ease-out)',
            }}
          >
            إرسال
          </button>
        )}

        {acceptVoice && (
          <button
            onClick={toggleRecording}
            disabled={submitted}
            aria-label={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              background: recording ? 'var(--ds-accent-danger)' : 'var(--ds-surface-2)',
              border: `1px solid ${recording ? 'var(--ds-accent-danger)' : 'var(--ds-border-subtle)'}`,
              color: recording ? 'white' : 'var(--ds-text-secondary)',
              cursor: submitted ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all var(--motion-fast) var(--ease-out)',
            }}
          >
            {recording ? STOP_ICON : MIC_ICON}
          </button>
        )}

        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'transparent',
              border: 'none',
              color: 'var(--ds-text-tertiary)',
              fontSize: 13,
              fontFamily: "'Tajawal', sans-serif",
              cursor: 'pointer',
            }}
          >
            تخطّ
          </button>
        )}
      </div>
    </div>
  )
}
