// Apple Voice Memos-inspired player: gradient waveform, seek, speed, autoplay
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Loader2, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

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
  const [transcript, setTranscript] = useState(message.voice_transcript || '')
  const [transcribing, setTranscribing] = useState(false)
  const [showTranscript, setShowTranscript] = useState(!!message.voice_transcript)
  const [err, setErr] = useState(false)
  const audioRef = useRef(null)

  const src = message._signedVoiceUrl
  const waveform = message.voice_waveform ?? []
  const durationMs = message.voice_duration_ms ?? 0
  const durationSec = durationMs / 1000

  useEffect(() => () => { audioRef.current?.pause() }, [])

  async function handleTranscribe() {
    if (transcribing) return
    setTranscribing(true)
    setErr(false)
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-voice-message', {
        body: { message_id: message.id },
      })
      if (error) throw error
      if (data?.transcript != null && !data.error) {
        setTranscript(data.transcript)
        setShowTranscript(true)
      } else {
        throw new Error(data?.error || 'failed')
      }
    } catch (_) {
      setErr(true)
    } finally {
      setTranscribing(false)
    }
  }

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
    <div className="mt-1" style={{ maxWidth: 280 }}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
        style={{
          background: playing
            ? 'color-mix(in srgb, var(--ds-accent-primary) 8%, transparent)'
            : 'var(--ds-surface-1)',
          border: playing
            ? '1px solid color-mix(in srgb, var(--ds-accent-primary) 20%, transparent)'
            : '1px solid var(--ds-border-subtle)',
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
            // Playhead bar: the bar being played right now
            const isPlayhead = playing && Math.abs(pct - progress) < (1 / bars.length)
            const barH = Math.max(3, amp * 32) * (isPlayhead ? 1.5 : 1)
            return (
              <div
                key={i}
                style={{
                  width: 2,
                  height: barH,
                  borderRadius: 2,
                  background: played
                    ? `linear-gradient(to top, var(--ds-accent-primary), color-mix(in srgb, var(--ds-accent-primary) 60%, transparent))`
                    : 'var(--ds-text-muted)',
                  opacity: played ? 1 : 0.30,
                  boxShadow: isPlayhead
                    ? `0 0 6px 2px color-mix(in srgb, var(--ds-accent-gold) 60%, transparent)`
                    : 'none',
                  transition: 'height 0.08s ease, opacity 0.12s',
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

      {/* Transcription — تفريغ نصي */}
      <div className="mt-1.5 px-1">
        {transcript ? (
          <>
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}
            >
              <FileText size={12} />
              {showTranscript ? 'إخفاء النص' : 'عرض النص'}
            </button>
            {showTranscript && (
              <div
                className="mt-1 px-2.5 py-2 rounded-xl text-[13px] leading-relaxed"
                dir="auto"
                style={{
                  background: 'var(--ds-surface-1)',
                  border: '1px solid var(--ds-border-subtle)',
                  color: 'var(--ds-text-secondary)',
                  fontFamily: 'Tajawal, sans-serif',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {transcript || '—'}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{
              color: err ? 'var(--ds-accent-danger, #e26)' : 'var(--ds-accent-primary)',
              fontFamily: 'Tajawal, sans-serif',
              opacity: transcribing ? 0.6 : 1,
            }}
          >
            {transcribing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            {transcribing ? 'جارٍ التفريغ…' : (err ? 'تعذّر التفريغ — إعادة المحاولة' : 'تفريغ نصي')}
          </button>
        )}
      </div>
    </div>
  )
}
