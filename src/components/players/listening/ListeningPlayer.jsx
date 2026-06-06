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
import { AudioDebugOverlay } from './AudioDebugOverlay'

// Flag gate (prompt 15): the debug overlay renders ONLY when the URL has
// ?debug=audio. Read straight off window.location so this low-level player stays
// decoupled from the router; the flag never changes within a session. Students
// never pass ?debug=audio, so they never see the overlay.
const AUDIO_DEBUG =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === 'audio'

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
  // Re-entrancy guard for play(): true from the moment a tap calls play() until
  // that play() promise settles. A second tap (or a double-fired click on Mac
  // Safari) must NOT hit the pause() branch while the first play() is still
  // pending — calling pause() on a pending play() rejects it with AbortError,
  // which the player swallows ⇒ "press play, nothing happens, no sound". The
  // real-device telemetry showed bursts of AbortError on every press; this guard
  // is what stops the self-interrupting loop. (LISTENING-ABORT-FIX 2026-06-03)
  const isStartingRef = useRef(false)
  // Blob-source plumbing: the object URL for the current source + the in-flight
  // fetch's AbortController, so a source swap cancels a stale download.
  const blobUrlRef = useRef(null)
  const sourceAbortRef = useRef(null)
  const sidebarWidth = useSidebarWidth()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [actualDurationMs, setActualDurationMs] = useState(durationMs || 0)
  const [speed, setSpeed] = useState(1)
  const [loadError, setLoadError] = useState(null)
  const [silentFailure, setSilentFailure] = useState(false)

  // Keep the latest onTimeUpdate in a ref so the load effect does NOT depend on
  // it. If onTimeUpdate were in the effect deps and a parent passed an unstable
  // callback, every parent re-render would re-run the effect → audio.load() →
  // which ABORTS any in-flight play() (the dominant "press play, nothing
  // happens" cause on iOS Safari). Keying the effect on [audioUrl, listeningId]
  // only makes the audio element stable across re-renders.
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onTimeUpdateRef.current = onTimeUpdate

  // Resolve the audio source to an in-memory blob: URL and attach it. A blob is
  // immune to the two iOS-Safari killers behind the long "no sound on iPhone"
  // saga: (1) a stale CacheFirst service worker that breaks HTTP Range streaming,
  // and (2) Range quirks inside an installed PWA. A FULL fetch() returns the whole
  // body even through a CacheFirst SW, so listening plays WITHOUT a reinstall —
  // the same blob approach that already made word pronunciation reliable on these
  // devices (audio_event_log: word blobs play, raw-URL <audio> listening stays
  // silent). Falls back to streaming the raw URL if the fetch fails, so it is
  // never worse than the previous direct-URL behaviour. (LISTENING-BLOB-FIX 2026-06-06)
  const loadSource = useCallback(
    async (audio) => {
      if (!audio || !audioUrl) return
      if (sourceAbortRef.current) sourceAbortRef.current.abort()
      const ac = new AbortController()
      sourceAbortRef.current = ac
      try {
        const resp = await fetch(audioUrl, { signal: ac.signal })
        if (!resp.ok) throw new Error('http_' + resp.status)
        const blob = await resp.blob()
        if (ac.signal.aborted) return
        // Don't clobber a source the student already started (e.g. an early tap
        // fell back to the raw URL and it's running).
        if (!audio.paused || audio.currentTime > 0) return
        const burl = URL.createObjectURL(blob)
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = burl
        audio.src = burl
      } catch (e) {
        if (ac.signal.aborted) return
        // Fallback to direct streaming (the pre-blob behaviour) if not already set.
        if (!audio.getAttribute('src')) audio.src = audioUrl
        logAudioFailure({
          context: 'listening',
          rowId: listeningId,
          audioUrl,
          errorCode: null,
          errorMessage: ('blob_fallback_raw:' + (e?.message || e)).slice(0, 200),
        })
      }
    },
    [audioUrl, listeningId],
  )

  // Audio source loading — re-runs ONLY when the source row changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    setLoadError(null)
    setSilentFailure(false)
    setIsPlaying(false)
    setIsBuffering(false)
    setCurrentMs(0)
    // Source row changed — any pending play() guard is stale; clear it so the
    // play button can never get permanently stuck after a source swap.
    isStartingRef.current = false

    const onError = () => {
      const code = audio.error?.code
      // code 1 = MEDIA_ERR_ABORTED — benign (load() interrupted a previous
      // load/play). Log it for telemetry but never show the scary red card,
      // otherwise a normal source-swap looks like a failure to the student.
      if (code === 1) {
        logAudioFailure({
          context: 'listening',
          rowId: listeningId,
          audioUrl,
          errorCode: 1,
          errorMessage: audio.error?.message || 'aborted',
        })
        return
      }
      const map = {
        2: 'خطأ في الشبكة',
        3: 'خطأ في فك الترميز',
        4: 'الملف غير مدعوم',
      }
      setLoadError(map[code] || 'تعذّر تحميل الصوت')
      setIsPlaying(false)
      setIsBuffering(false)
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
      setIsBuffering(false)
      onTimeUpdateRef.current?.(ms)
    }
    const onWaiting = () => setIsBuffering(true)
    const onPlaying = () => {
      setIsBuffering(false)
      setSilentFailure(false)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setIsBuffering(false)
      setCurrentMs(0)
    }

    audio.addEventListener('error', onError)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    // iOS Safari fix (prompt 10): set src but do NOT eagerly call audio.load() here.
    // Real-device audio_telemetry shows MEDIA_ERR_SRC_NOT_SUPPORTED (code 4) +
    // NotSupportedError on iPhone/iPad/Safari for files that play fine in headless
    // WebKit + Chrome (e.g. s0_layla.mp3). Eager load() OUTSIDE a user gesture — with
    // preload="metadata", and across the several keyed ListeningPlayers a unit mounts —
    // pushes iOS into a spurious source-error state before the first tap, so play()
    // then rejects ("nothing happens"). Setting src lets preload="metadata" fetch the
    // header for the scrubber; the gesture-driven play() performs the full load inside
    // the user-gesture context, which iOS honors. (Chrome/WebKit-headless unaffected.)
    // The source itself is resolved to a blob: URL (Safari/stale-SW immune) via
    // loadSource; on slow connections the user can still tap before it resolves,
    // and togglePlay then falls back to streaming the raw URL inside the gesture.
    loadSource(audio)

    return () => {
      audio.removeEventListener('error', onError)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      if (silentCheckRef.current) {
        clearTimeout(silentCheckRef.current)
        silentCheckRef.current = null
      }
      if (sourceAbortRef.current) {
        sourceAbortRef.current.abort()
        sourceAbortRef.current = null
      }
    }
  }, [audioUrl, listeningId, loadSource])

  // Apply playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // Revoke the blob URL + cancel any in-flight fetch when the player unmounts.
  useEffect(
    () => () => {
      if (sourceAbortRef.current) sourceAbortRef.current.abort()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    },
    [],
  )

  // Begin playback + arm the silent-failure watchdog. Separated so the
  // canplay-gated path and the ready path share one implementation.
  const startPlayback = useCallback(
    async (audio) => {
      // Re-entrancy guard: if a play() is already pending, do nothing. Prevents a
      // second tap / double-fired click from interrupting the in-flight play()
      // (which would reject it with AbortError → silent no-sound).
      if (isStartingRef.current) return
      isStartingRef.current = true
      try {
        // Call play() exactly once, synchronously within the user gesture (no
        // awaits/timers before it) — iOS Safari only honors gesture-initiated
        // playback. The earlier timer-based AbortError retry is GONE: a setTimeout
        // play() runs OUTSIDE the gesture, so iOS rejects it (NotAllowedError) →
        // silent. The real root cause of "no sound on Safari/iPhone" was the
        // service worker caching media with CacheFirst and breaking Range requests
        // (now fixed in vite.config.js → NetworkOnly for media), so the audio loads
        // normally and the cold-tap AbortError collision no longer occurs. If
        // play() is ever rejected the catch below resets cleanly and the next tap
        // (a fresh gesture, metadata already loaded) succeeds. (LISTENING-SW-FIX 2026-06-03)
        await audio.play()
        // play() resolved — playback is authorized and (re)started. Sample the
        // baseline NOW (after resolve), not before play(), so resuming from a
        // non-zero position can't make a genuinely-advancing clock look frozen.
        const baseline = audio.currentTime
        // Watchdog: confirm the clock is TRULY stuck before surfacing anything.
        // It must (a) still be unpaused, (b) have enough data, and (c) NOT have
        // advanced — re-checked twice ~1s apart to rule out a momentary stall.
        // It NEVER calls pause(): pausing here used to kill perfectly good audio
        // and abort concurrent play() calls (the silent_failure telemetry showed
        // currentTime had actually advanced to 1–3.5s on every "failure").
        if (silentCheckRef.current) clearTimeout(silentCheckRef.current)
        silentCheckRef.current = setTimeout(() => {
          const a = audioRef.current
          if (!a || a.paused) return
          const firstAdvance = a.currentTime - baseline
          if (firstAdvance >= 0.1 || a.readyState < 3 /* HAVE_FUTURE_DATA */) return
          // Looked frozen — re-sample once more before deciding (avoid false positive
          // on a brief stall). Do NOT pause; let playback keep trying on its own.
          const stuckAt = a.currentTime
          silentCheckRef.current = setTimeout(() => {
            const a2 = audioRef.current
            if (!a2 || a2.paused) return
            const stillStuck = a2.currentTime - stuckAt < 0.05 && a2.readyState >= 3
            if (!stillStuck) return
            setSilentFailure(true)
            logAudioFailure({
              context: 'listening',
              rowId: listeningId,
              audioUrl,
              errorCode: -1,
              errorMessage: 'silent_failure: play() resolved but currentTime did not advance',
              extra: { paused: a2.paused, readyState: a2.readyState, currentTime: a2.currentTime },
            })
          }, 1200)
        }, 2500)
      } catch (err) {
        // AbortError = play() interrupted by a load()/pause() (benign, retryable).
        // NotAllowedError = autoplay/user-gesture policy (retryable on next tap).
        // Neither should surface the scary error card.
        const name = err?.name
        if (name === 'AbortError' || name === 'NotAllowedError') {
          setIsPlaying(false)
          setIsBuffering(false)
          logAudioFailure({
            context: 'listening',
            rowId: listeningId,
            audioUrl,
            errorCode: 0,
            errorMessage: `${name}: ${err?.message || ''}`.slice(0, 200),
          })
          return
        }
        setLoadError('فشل التشغيل — حاول النقر مرة أخرى')
        setIsPlaying(false)
        setIsBuffering(false)
        logAudioFailure({
          context: 'listening',
          rowId: listeningId,
          audioUrl,
          errorCode: 0,
          errorMessage: err?.message || String(err),
        })
      } finally {
        isStartingRef.current = false
      }
    },
    [audioUrl, listeningId],
  )

  // play() must be called from the click handler (iOS Safari user-gesture rule)
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    // A play() is still pending (Safari is starting it). Ignore this tap rather
    // than pausing — pausing a pending play() aborts it (AbortError → no sound).
    // The user can tap again once playback has actually started.
    if (isStartingRef.current) return
    setSilentFailure(false)

    if (!audio.paused) {
      audio.pause()
      return
    }

    // iOS Safari requires play() to be invoked SYNCHRONOUSLY inside the user-gesture
    // handler. The previous code deferred play() to an async 'canplay' listener when
    // readyState < 2 — but with preload="metadata" readyState is ALWAYS < 2 on the
    // first iOS tap, so play() ran outside the gesture and iOS rejected it
    // (NotAllowedError, swallowed) → "press play, nothing happens".
    // Fix: call play() now. The tap authorizes both the fetch and playback; play()
    // itself kicks buffering. startPlayback is async but invokes audio.play()
    // synchronously (no await before it), so the gesture context is preserved.
    // Ensure a source is attached synchronously inside the gesture. Normally the
    // blob: URL is already set by loadSource; if the student tapped before the blob
    // finished downloading, fall back to streaming the raw URL in-gesture so iOS
    // still honours play() (loadSource then sees a playing element and won't swap).
    if (!audio.getAttribute('src')) audio.src = audioUrl

    if (audio.readyState < 2 /* HAVE_CURRENT_DATA */) setIsBuffering(true)
    startPlayback(audio)
  }, [startPlayback, audioUrl])

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
    // Re-resolve via blob (with raw-URL fallback) instead of re-streaming the URL.
    loadSource(audio)
  }, [audioUrl, loadSource])

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
      {/* Flag-gated audio debug overlay — observes this player's real <audio>.
          Renders ONLY with ?debug=audio in the URL; invisible to students. */}
      {AUDIO_DEBUG && (
        <AudioDebugOverlay
          audioRef={audioRef}
          audioUrl={audioUrl}
          wordPronInfo="Tier 1 MP3 via <audio>, Tier 2 Web Speech (speechSynthesis) — Tier 2 bypasses Safari tab-mute"
        />
      )}

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
                aria-label={isBuffering ? 'جارٍ التحميل' : isPlaying ? 'إيقاف' : 'تشغيل'}
                aria-busy={isBuffering}
              >
                {isBuffering && !isPlaying ? (
                  <span className="block w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  '❚❚'
                ) : (
                  <span className="ms-0.5">▶</span>
                )}
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

          {/* The audio element — src is set by the effect, never inline.
              Visually-hidden (NOT display:none): iOS Safari is finicky about
              playing media elements removed from the layout tree. */}
          <audio
            ref={audioRef}
            preload="metadata"
            playsInline
            aria-hidden="true"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
    </>
  )
}
