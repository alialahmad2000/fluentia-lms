// LISTENING-NO-GAPS-PREMIUM-BAR 2026-05-20
//
// Premium full-width sticky bottom bar.
//
// Position contract:
//   position: fixed; bottom: 0; left: 0; right: sidebarWidth (px)
// Sidebar awareness via the existing useSidebarWidth() hook (measures the
// `[data-sidebar-root]` element via ResizeObserver, so it tracks expand /
// collapse / mobile-hide automatically).
//
// Behaviour preserved from the prior minimal player (b4830d9):
//   - playsInline + preload="metadata"
//   - Event listeners attached BEFORE el.src = audioUrl
//   - useEffect deps include audioUrl + listeningId
//   - play() called from the click handler (iOS Safari user-gesture rule)
//   - play() rejection caught + logged via logAudioFailure
//   - 2-second silent-failure watchdog (logs error_code -1 if currentTime
//     doesn't advance after a successful play())
//   - hideTranscriptToggle prop suppresses the toggle when the section owns it
//
// Visual premium materials (per the LISTENING-NO-GAPS-PREMIUM-BAR prompt):
//   - bg-slate-950/85 + backdrop-blur-2xl glass surface
//   - Top hairline gradient (amber-400/30) as an accent above the bar
//   - 12 × 12 amber gradient play button (subtle, NOT a 64px hero)
//   - Drop-shadow above the bar
//   - Smooth transitions on state changes
//   - Speed selector hides at <640px to keep mobile touch targets clean

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSidebarWidth } from '../../../hooks/useSidebarWidth'
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
          type="button"
          onClick={onRetry}
          className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-['Tajawal']"
        >
          إعادة المحاولة
        </button>
        <button
          type="button"
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
  speakerSegments = [],
  transcriptShown,
  onTranscriptToggle,
  hideTranscriptToggle = false,
  listeningId,
  onTimeUpdate,
}) {
  // Hooks first — no early returns above any of them
  const audioRef = useRef(null)
  const silentCheckRef = useRef(null)
  const sidebarWidth = useSidebarWidth()

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
  const togglePlay = useCallback(async () => {
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
      // Watchdog — see "silent-failure detection" header comment
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
  }, [audioUrl, listeningId])

  const seekTo = useCallback(
    (ms) => {
      const audio = audioRef.current
      if (!audio) return
      const total = actualDurationMs || durationMs || 0
      const clamped = Math.max(0, Math.min(ms, total))
      audio.currentTime = clamped / 1000
      setCurrentMs(clamped)
    },
    [actualDurationMs, durationMs],
  )

  const seekBy = useCallback((deltaMs) => seekTo(currentMs + deltaMs), [currentMs, seekTo])

  const retry = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return
    setLoadError(null)
    setSilentFailure(false)
    audio.src = audioUrl
    audio.load()
  }, [audioUrl])

  const total = actualDurationMs || durationMs || 0
  const progressPct = total > 0 ? Math.max(0, Math.min(100, (currentMs / total) * 100)) : 0

  // Current speaker — for the subtle pill above the controls
  const currentSpeaker = (() => {
    if (!Array.isArray(speakerSegments) || !speakerSegments.length) return null
    // Walk back-to-front so the most recent segment with start <= now wins
    for (let i = speakerSegments.length - 1; i >= 0; i--) {
      const s = speakerSegments[i]
      const start = typeof s.start_ms === 'number' ? s.start_ms : (s.start_s || 0) * 1000
      if (currentMs >= start) return s
    }
    return null
  })()
  const speakerName =
    currentSpeaker?.speaker_name_ar ||
    currentSpeaker?.speaker_name ||
    currentSpeaker?.speaker ||
    null

  if (!audioUrl) return null

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar */}
      <div className="h-32" aria-hidden="true" />

      {/* PREMIUM STICKY BOTTOM BAR */}
      <div
        className="fixed bottom-0 left-0 z-40 transition-all duration-300 ease-out"
        style={{ right: sidebarWidth > 0 ? sidebarWidth : 0 }}
        dir="rtl"
      >
        {/* Top hairline gradient accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

        {/* Main bar */}
        <div
          className="
            bg-slate-950/85 backdrop-blur-2xl
            border-t border-white/[0.06]
            shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]
            px-4 sm:px-6 py-3 sm:py-4
          "
          style={{
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Speaker pill (only when known) */}
          {speakerName && (
            <div className="flex items-center justify-start mb-2 transition-opacity duration-200">
              <span
                className="
                  inline-flex items-center gap-2
                  px-3 py-1 rounded-full
                  bg-white/[0.04] border border-white/[0.05]
                  text-xs text-white/80 font-medium font-['Tajawal']
                "
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                <span>{speakerName}</span>
              </span>
            </div>
          )}

          {/* Scrubber */}
          <div className="relative h-1.5 mb-3 group">
            <div className="absolute inset-y-0 left-0 right-0 bg-white/[0.06] rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.4)]"
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

          {/* Controls row (LTR so play / time stay in their natural positions) */}
          <div className="flex items-center justify-between gap-4" dir="ltr">
            {/* Left cluster: skip / play / skip */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seekBy(-10000)}
                className="w-10 h-10 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white text-xs font-medium transition flex items-center justify-center tabular-nums"
                aria-label="رجوع 10 ثواني"
              >
                -10s
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="
                  w-12 h-12 rounded-xl
                  bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500
                  text-slate-950 font-bold text-lg
                  shadow-[0_4px_16px_-4px_rgba(251,191,36,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]
                  hover:scale-[1.03] active:scale-95
                  transition-transform
                  flex items-center justify-center
                "
                aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {isPlaying ? '❚❚' : <span className="ms-0.5">▶</span>}
              </button>
              <button
                type="button"
                onClick={() => seekBy(10000)}
                className="w-10 h-10 rounded-lg hover:bg-white/[0.05] text-white/70 hover:text-white text-xs font-medium transition flex items-center justify-center tabular-nums"
                aria-label="تقدم 10 ثواني"
              >
                +10s
              </button>
            </div>

            {/* Right cluster: time + speed + transcript */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
              <span className="font-mono text-xs tabular-nums text-white/55">
                {formatTime(currentMs)} <span className="text-white/30">/</span> {formatTime(total)}
              </span>

              <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] rounded-full p-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-mono tabular-nums transition ${
                      s === speed
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-white/55 hover:text-white/85'
                    }`}
                    aria-label={`السرعة ${s}×`}
                    aria-pressed={s === speed}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {!hideTranscriptToggle && onTranscriptToggle && (
                <button
                  type="button"
                  onClick={onTranscriptToggle}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-white/65 hover:text-white hover:bg-white/[0.04] transition font-['Tajawal']"
                >
                  {transcriptShown ? 'إخفاء النص' : 'إظهار النص'}
                </button>
              )}
            </div>
          </div>

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
      </div>
    </>
  )
}
