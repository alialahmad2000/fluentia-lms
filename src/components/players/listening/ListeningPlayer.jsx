// LISTENING-SIMPLIFY-AND-SELF-HEAL 2026-05-20 — minimal player.
//
// Replaces the Phase D 2026-05-19 hero-button / gradient-glow / glass-card
// design at Ali's explicit request: "make it simpler, not make design in the
// audio player itself, and also the audio player itself should work properly."
//
// Visual contract:
//   - Standard play/pause (~44px), no hero button
//   - Standard scrubber, plain time display
//   - Four plain speed buttons (0.75 / 1 / 1.25 / 1.5)
//   - Skip-back 10s, skip-forward 10s
//   - Transcript show/hide toggle (player owns it; section provides state)
//   - Inline card (no fixed-bottom positioning, no sidebar adjustment)
//
// Behaviour preserved from prior versions:
//   - Event listeners attach BEFORE `el.src = audioUrl`
//   - useEffect deps include audioUrl so source changes re-fire load
//   - play() called from the click handler (iOS Safari user-gesture rule)
//   - play() rejection caught and surfaces a visible error
//   - playsInline + preload="metadata"
//   - logAudioFailure() telemetry on both error event AND play() rejection
//
// NEW: silent-failure detection.
//   After every successful play(), watch currentTime for 2 seconds. If it does
//   not advance past 0.1s, treat as silent failure → log telemetry with
//   error_code=-1 and surface a "silent" recovery card (iOS Safari silent
//   switch, locked audio context, autoplay-blocked-without-error).

import { useEffect, useRef, useState } from 'react'
import { logAudioFailure } from '../../../lib/audioTelemetry'

const SPEEDS = [0.75, 1, 1.25, 1.5]

function formatTime(ms) {
  if (!ms || !isFinite(ms) || ms < 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

async function fullRefresh() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {}
  location.reload()
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center" dir="rtl">
      <div className="text-red-200 text-sm mb-2 font-['Tajawal']">⚠️ {message}</div>
      <div className="flex justify-center gap-2">
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-['Tajawal']"
        >
          إعادة المحاولة
        </button>
        <button
          onClick={fullRefresh}
          className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-['Tajawal']"
        >
          تحديث كامل
        </button>
      </div>
    </div>
  )
}

export function ListeningPlayer({
  audioUrl,
  durationMs,
  // The next two props are preserved from the prior signature — the player owns
  // the rendered toggle UI, the section owns the boolean state.
  transcriptShown,
  onTranscriptToggle,
  hideTranscriptToggle = false,
  listeningId,
  // Accepted but ignored in this minimal player — keep prop name so call sites
  // don't need to change. The decorative ticks/pills were removed by design.
  // eslint-disable-next-line no-unused-vars
  speakerSegments = [],
  onTimeUpdate,
}) {
  // All hooks before any early returns
  const audioRef = useRef(null)
  const silentCheckRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [actualDurationMs, setActualDurationMs] = useState(durationMs || 0)
  const [speed, setSpeed] = useState(1)
  const [loadError, setLoadError] = useState(null)
  const [silentFailure, setSilentFailure] = useState(false)

  // Audio source loading — re-runs when audioUrl changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    setLoadError(null)
    setSilentFailure(false)
    setIsPlaying(false)
    setCurrentMs(0)

    const onError = () => {
      const code = audio.error?.code
      const map = {
        1: 'تم إلغاء التحميل',
        2: 'خطأ في الشبكة',
        3: 'خطأ في فك الترميز',
        4: 'الملف غير مدعوم',
      }
      setLoadError(map[code] || 'تعذّر تحميل الصوت')
      setIsPlaying(false)
      logAudioFailure({
        context: 'listening',
        rowId: listeningId,
        audioUrl,
        errorCode: typeof code === 'number' ? code : null,
        errorMessage: audio.error?.message,
      })
    }
    const onLoadedMetadata = () => {
      setLoadError(null)
      if (isFinite(audio.duration) && audio.duration > 0) {
        setActualDurationMs(Math.round(audio.duration * 1000))
      }
    }
    const onTime = () => {
      const ms = Math.round(audio.currentTime * 1000)
      setCurrentMs(ms)
      onTimeUpdate?.(ms)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentMs(0)
    }

    audio.addEventListener('error', onError)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    audio.src = audioUrl
    audio.load()

    return () => {
      audio.removeEventListener('error', onError)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      if (silentCheckRef.current) {
        clearTimeout(silentCheckRef.current)
        silentCheckRef.current = null
      }
    }
  }, [audioUrl, listeningId, onTimeUpdate])

  // Apply playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // play() must be called from the click handler (iOS Safari user-gesture rule)
  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    setSilentFailure(false)

    if (!audio.paused) {
      audio.pause()
      return
    }

    try {
      const startedAt = audio.currentTime
      await audio.play()
      // play() succeeded — schedule a watchdog to detect silent failure.
      // iOS Safari silent switch / locked audio context: play() resolves but
      // currentTime never advances.
      if (silentCheckRef.current) clearTimeout(silentCheckRef.current)
      silentCheckRef.current = setTimeout(() => {
        const a = audioRef.current
        if (!a) return
        const advanced = a.currentTime - startedAt
        if (advanced < 0.1 && !a.paused) {
          setSilentFailure(true)
          setIsPlaying(false)
          try {
            a.pause()
          } catch {}
          logAudioFailure({
            context: 'listening',
            rowId: listeningId,
            audioUrl,
            errorCode: -1,
            errorMessage: 'silent_failure: play() resolved but currentTime did not advance',
            extra: {
              paused: a.paused,
              readyState: a.readyState,
              currentTime: a.currentTime,
            },
          })
        }
      }, 2000)
    } catch (err) {
      setLoadError('فشل التشغيل — حاول النقر مرة أخرى')
      setIsPlaying(false)
      logAudioFailure({
        context: 'listening',
        rowId: listeningId,
        audioUrl,
        errorCode: 0,
        errorMessage: err?.message || String(err),
      })
    }
  }

  const seekTo = (ms) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(ms, actualDurationMs || durationMs || 0))
    audio.currentTime = clamped / 1000
    setCurrentMs(clamped)
  }

  const seekBy = (deltaMs) => seekTo(currentMs + deltaMs)

  const retry = () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    setLoadError(null)
    setSilentFailure(false)
    audio.src = audioUrl
    audio.load()
  }

  const total = actualDurationMs || durationMs || 0
  const progressPct = total > 0 ? Math.max(0, Math.min(100, (currentMs / total) * 100)) : 0

  if (!audioUrl) return null

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4" dir="rtl">
      {/* Scrubber */}
      <div className="relative h-2 mb-3 bg-white/10 rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-amber-400 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={total || 1}
          value={currentMs}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="موضع التشغيل"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap" dir="ltr">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => seekBy(-10000)}
            className="w-10 h-10 rounded-md hover:bg-white/5 text-white/70 text-xs font-medium transition flex items-center justify-center tabular-nums"
            aria-label="رجوع 10 ثواني"
          >
            -10s
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-md bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-900 font-bold text-lg transition flex items-center justify-center"
            aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10000)}
            className="w-10 h-10 rounded-md hover:bg-white/5 text-white/70 text-xs font-medium transition flex items-center justify-center tabular-nums"
            aria-label="تقدم 10 ثواني"
          >
            +10s
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs tabular-nums text-white/60">
            {formatTime(currentMs)} / {formatTime(total)}
          </span>
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs font-mono transition tabular-nums ${
                  s === speed
                    ? 'bg-amber-400 text-slate-900'
                    : 'text-white/60 hover:bg-white/10'
                }`}
                aria-label={`السرعة ${s}×`}
                aria-pressed={s === speed}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript toggle (suppressed when the section owns it) */}
      {!hideTranscriptToggle && onTranscriptToggle && (
        <div className="flex justify-center mt-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onTranscriptToggle}
            className="text-xs text-white/50 hover:text-white/80 transition font-['Tajawal']"
          >
            {transcriptShown ? 'إخفاء النص' : 'إظهار النص'}
          </button>
        </div>
      )}

      {/* Error surfaces */}
      {loadError && <ErrorCard message={loadError} onRetry={retry} />}
      {silentFailure && (
        <ErrorCard
          message="الصوت لا يصدر — تأكد من رفع صوت الجهاز وإيقاف وضع الصامت ثم أعد المحاولة"
          onRetry={retry}
        />
      )}

      {/* The audio element — src is set by the effect, never inline */}
      <audio ref={audioRef} preload="metadata" playsInline style={{ display: 'none' }} />
    </div>
  )
}
