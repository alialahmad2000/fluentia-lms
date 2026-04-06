import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'

export default function AudioPlayer({ src, duration: knownDuration, compact = false }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrent] = useState(0)
  const [duration, setDuration] = useState(knownDuration || 0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoad = () => {
      setLoading(false)
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration)
    }
    const onTime = () => setCurrent(audio.currentTime)
    const onEnd = () => setPlaying(false)
    const onErr = () => { setError(true); setLoading(false) }

    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('canplay', onLoad)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onErr)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('canplay', onLoad)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onErr)
    }
  }, [src])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }, [playing])

  const seek = useCallback((e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    // RTL: invert position
    const isRtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl'
    const x = isRtl ? rect.right - e.clientX : e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audio.currentTime = pct * duration
  }, [duration])

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-lg`} style={{ background: 'rgba(239,68,68,0.1)' }}>
        <span className="text-xs text-red-400 font-['Tajawal']">تعذر تشغيل الصوت</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'} rounded-xl`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" playsInline />

      {/* Play/Pause */}
      <button
        onClick={toggle}
        disabled={loading}
        className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          playing ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
        }`}
      >
        {loading ? <Loader2 size={compact ? 14 : 18} className="animate-spin" /> : playing ? <Pause size={compact ? 14 : 18} /> : <Play size={compact ? 14 : 18} />}
      </button>

      {/* Progress bar */}
      <div className="flex-1 min-w-0 space-y-1">
        <div
          className="w-full h-1.5 rounded-full cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{fmt(currentTime)}</span>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}
