// Full implementation wired in Phase G — this renders a minimal playable stub
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'

export default function MessageBubbleVoice({ message }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)

  const src = message._signedVoiceUrl
  const durationSec = message.voice_duration_ms ? message.voice_duration_ms / 1000 : 0
  const waveform = message.voice_waveform ?? []

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [])

  function togglePlay() {
    if (!src) return
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
      audioRef.current.playbackRate = speed
      setLoading(true)
      audioRef.current.addEventListener('canplay', () => setLoading(false), { once: true })
      audioRef.current.addEventListener('timeupdate', () => {
        const dur = audioRef.current.duration || durationSec
        setProgress(dur > 0 ? audioRef.current.currentTime / dur : 0)
      })
      audioRef.current.addEventListener('ended', () => { setPlaying(false); setProgress(0) })
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
    audioRef.current.currentTime = ratio * (audioRef.current.duration || durationSec)
  }

  function cycleSpeed() {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const elapsed = audioRef.current ? audioRef.current.currentTime : 0

  return (
    <div
      className="flex items-center gap-2.5 mt-1 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      style={{ maxWidth: 300, minWidth: 200 }}
    >
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0 hover:bg-sky-400 transition-colors"
        disabled={!src}
      >
        {loading ? <Loader2 size={16} className="animate-spin" />
          : playing ? <Pause size={16} />
          : <Play size={16} className="mr-[-1px]" />}
      </button>

      {/* Waveform bars */}
      <button
        onClick={seek}
        className="flex-1 flex items-center gap-px h-8"
        aria-label="تقديم/تأخير"
      >
        {waveform.length > 0
          ? waveform.map((amp, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${Math.max(4, amp * 28)}px`,
                  borderRadius: 2,
                  background: i / waveform.length < progress ? '#38bdf8' : 'var(--border)',
                  transition: 'background 0.1s',
                }}
              />
            ))
          : <div className="w-full h-1 rounded-full bg-[var(--border)]">
              <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
        }
      </button>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
          {playing ? formatTime(elapsed) : formatTime(durationSec)}
        </span>
        <button
          onClick={cycleSpeed}
          className="text-[11px] text-sky-400 hover:text-sky-300 font-mono"
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}
