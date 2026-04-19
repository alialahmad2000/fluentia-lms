import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

// One-play mode: once played, seeking is disabled (IELTS listening spec)
// replayEnabled: when true, lifts the one-play restriction (shown post-submit)
export default function AudioPlayer({ src, onEnded, onePlayOnly = false, replayEnabled = false, label }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [canPlay, setCanPlay] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration || 0)
    const onTime = () => setElapsed(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      if (onEnded) onEnded()
    }
    const onCanPlay = () => setCanPlay(true)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('canplay', onCanPlay)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [src, onEnded])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (onePlayOnly && hasPlayed && !playing && !replayEnabled) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
      setHasPlayed(true)
    }
  }

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(Math.floor(s % 60)).padStart(2,'0')}`
  const canToggle = canPlay && !(onePlayOnly && hasPlayed && !playing && !replayEnabled)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: '16px 20px', borderRadius: 14,
      background: 'rgba(56,189,248,0.06)',
      border: '1px solid rgba(56,189,248,0.2)',
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {label && (
        <p style={{ fontSize: 13, fontFamily: 'Tajawal', color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={togglePlay}
          disabled={!canToggle}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: canToggle ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${canToggle ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
            cursor: canToggle ? 'pointer' : 'default',
          }}
        >
          {playing
            ? <Pause size={18} style={{ color: '#38bdf8' }} />
            : <Play size={18} style={{ color: canToggle ? '#38bdf8' : 'rgba(255,255,255,0.3)', marginRight: -2 }} />
          }
        </button>

        {/* Progress track — no seeking in one-play mode */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#38bdf8', borderRadius: 99, transition: 'width 0.5s linear' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Volume2 size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 12, fontFamily: 'Tajawal', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(elapsed)} / {fmt(duration)}
          </span>
        </div>
      </div>

      {onePlayOnly && hasPlayed && !playing && !replayEnabled && (
        <p style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal', textAlign: 'center' }}>
          يمكن تشغيل المقطع مرة واحدة فقط
        </p>
      )}
    </div>
  )
}
