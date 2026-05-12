// Apple Voice Memos-inspired player: gradient waveform, seek, speed, autoplay
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'

const SPEEDS = [1, 1.5, 2]

function formatSec(s) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

// Singleton: only one voice plays at a time
const singleton = { audio: null, stop: null }

export default function VoicePlayerPremium({ message }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)

  const src = message._signedVoiceUrl
  const waveform = message.voice_waveform ?? []
  const durationMs = message.voice_duration_ms ?? 0
  const durationSec = durationMs / 1000

  useEffect(() => () => { audioRef.current?.pause() }, [])

  function togglePlay() {
    if (!src) return

    if (!audioRef.current) {
      // Stop any other playing instance
      if (singleton.stop) singleton.stop()

      const a = new Audio(src)
      a.playbackRate = SPEEDS[speedIdx]
      setLoading(true)
      a.addEventListener('canplay', () => setLoading(false), { once: true })
      a.addEventListener('timeupdate', () => {
        const dur = a.duration || durationSec
        setProgress(dur > 0 ? a.currentTime / dur : 0)
        setElapsed(a.currentTime)
      })
      a.addEventListener('ended', () => { setPlaying(false); setProgress(0); setElapsed(0) })
      audioRef.current = a
      singleton.audio = a
      singleton.stop = () => { a.pause(); setPlaying(false) }
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  function seek(e) {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const dur = audioRef.current.duration || durationSec
    audioRef.current.currentTime = ratio * dur
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const bars = waveform.length > 0 ? waveform : Array.from({ length: 48 }, () => Math.random() * 0.6 + 0.2)

  return (
    <div
      className="flex items-center gap-3 mt-1 px-3 py-2.5 rounded-2xl"
      style={{
        background: playing
          ? 'color-mix(in srgb, var(--ds-accent-primary) 8%, transparent)'
          : 'var(--ds-surface-1)',
        border: playing
          ? '1px solid color-mix(in srgb, var(--ds-accent-primary) 20%, transparent)'
          : '1px solid var(--ds-border-subtle)',
        maxWidth: 280,
        transition: 'all 0.2s',
      }}
    >
      {/* Play/Pause circle */}
      <button
        onClick={togglePlay}
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
        style={{
          background: playing ? 'var(--ds-accent-primary)' : 'var(--ds-surface-2)',
          color: playing ? 'var(--ds-bg-base)' : 'var(--ds-accent-primary)',
          boxShadow: playing ? '0 4px 16px color-mix(in srgb, var(--ds-accent-primary) 35%, transparent)' : 'none',
        }}
      >
        {loading
          ? <Loader2 size={18} className="animate-spin" />
          : playing ? <Pause size={18} /> : <Play size={18} className="mr-[-1px]" />
        }
      </button>

      {/* Waveform */}
      <button
        onClick={seek}
        className="flex-1 flex items-end justify-center gap-[2px]"
        style={{ height: 36, cursor: 'pointer' }}
        aria-label="تقديم/تأخير"
      >
        {bars.map((amp, i) => {
          const pct = i / bars.length
          const played = pct < progress
          const barH = Math.max(3, amp * 32)
          return (
            <div
              key={i}
              style={{
                width: 2,
                height: barH,
                borderRadius: 2,
                background: played
                  ? `linear-gradient(to top, var(--ds-accent-primary), color-mix(in srgb, var(--ds-accent-primary) 60%, transparent))`
                  : 'var(--ds-border-subtle)',
                opacity: played ? 1 : 0.35,
                transition: 'height 0.05s, opacity 0.1s',
              }}
            />
          )
        })}
      </button>

      {/* Time + speed (left side in RTL = far edge) */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span
          className="tabular-nums text-[11px]"
          style={{ color: 'var(--ds-text-secondary)', fontFamily: 'monospace' }}
        >
          {playing ? formatSec(elapsed) : formatSec(durationSec)}
        </span>
        <button
          onClick={cycleSpeed}
          className="text-[10px] px-1.5 py-0.5 rounded-full transition-colors"
          style={{
            background: 'var(--ds-surface-2)',
            color: 'var(--ds-accent-primary)',
            fontFamily: 'monospace',
          }}
        >
          {SPEEDS[speedIdx]}×
        </button>
      </div>
    </div>
  )
}
