import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Loader2, PictureInPicture2,
} from 'lucide-react'
import { resolveStreamUrl, invalidateStreamUrl, extractFileId } from '../../lib/driveStream'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SPEED_STORAGE_KEY = 'fluentia_playback_speed'

function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00'
  s = Math.floor(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function PremiumVideoPlayer({ recording, onProgress, onComplete, initialPosition = 0 }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressBarRef = useRef(null)
  const controlsTimerRef = useRef(null)
  const saveIntervalRef = useRef(null)
  const hasCompletedRef = useRef(false)
  const doubleTapTimerRef = useRef({ left: null, right: null })

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(() => {
    try { return parseFloat(localStorage.getItem(SPEED_STORAGE_KEY)) || 1 } catch { return 1 }
  })
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverPos, setHoverPos] = useState(0)
  const [showBigPlay, setShowBigPlay] = useState(true)
  const [doubleTapSide, setDoubleTapSide] = useState(null) // 'left' | 'right'
  const [retrying, setRetrying] = useState(false)

  const fileId = useMemo(() => extractFileId(recording?.google_drive_url), [recording?.google_drive_url])
  const streamUrl = useMemo(() => resolveStreamUrl(fileId), [fileId])

  // ─── Auto-resume ─────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v || !initialPosition) return
    const handleCanPlay = () => {
      if (initialPosition > 5 && duration > 0 && (initialPosition / duration) < 0.95) {
        v.currentTime = initialPosition
      }
    }
    v.addEventListener('loadedmetadata', handleCanPlay, { once: true })
    return () => v.removeEventListener('loadedmetadata', handleCanPlay)
  }, [initialPosition, duration])

  // ─── Speed persistence ──────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = speed
    try { localStorage.setItem(SPEED_STORAGE_KEY, String(speed)) } catch {}
  }, [speed])

  // ─── Progress save interval ────────────────────────
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      const v = videoRef.current
      if (v && !v.paused && onProgress) {
        const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
        onProgress({
          position: v.currentTime,
          percent,
          speed: v.playbackRate,
          completed: false,
        })
      }
    }, 5000)
    return () => clearInterval(saveIntervalRef.current)
  }, [onProgress])

  // ─── Save on unmount ────────────────────────────────
  useEffect(() => {
    return () => {
      const v = videoRef.current
      if (v && onProgress) {
        const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
        onProgress({
          position: v.currentTime,
          percent,
          speed: v.playbackRate,
          completed: percent >= 90,
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Controls auto-hide ─────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false)
        setShowSpeedMenu(false)
      }
    }, 3000)
  }, [])

  // ─── Video events ───────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    setDuration(v.duration || 0)

    // Update buffered
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1))
    }

    // Completion check
    if (v.duration && !hasCompletedRef.current) {
      const pct = (v.currentTime / v.duration) * 100
      if (pct >= 90) {
        hasCompletedRef.current = true
        onComplete?.()
        onProgress?.({
          position: v.currentTime,
          percent: pct,
          speed: v.playbackRate,
          completed: true,
        })
      }
    }
  }, [onComplete, onProgress])

  const handlePlay = useCallback(() => {
    setPlaying(true)
    setShowBigPlay(false)
    resetControlsTimer()
  }, [resetControlsTimer])

  const handlePause = useCallback(() => {
    setPlaying(false)
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    // Save on pause
    const v = videoRef.current
    if (v && onProgress) {
      const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
      onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: percent >= 90 })
    }
  }, [onProgress])

  const handleError = useCallback(async () => {
    // On 403, try re-resolving URL
    if (!retrying && fileId) {
      setRetrying(true)
      setError(false)
      invalidateStreamUrl(fileId)
      const newUrl = resolveStreamUrl(fileId)
      const v = videoRef.current
      if (v) {
        const pos = v.currentTime
        v.src = newUrl
        v.currentTime = pos
        try { await v.play() } catch {}
      }
      setRetrying(false)
    } else {
      setError(true)
    }
  }, [fileId, retrying])

  // ─── Controls ────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}) } else { v.pause() }
  }, [])

  const skip = useCallback((seconds) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
  }, [])

  const seek = useCallback((e) => {
    const v = videoRef.current
    const bar = progressBarRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    // RTL: progress fills right-to-left
    const ratio = 1 - ((e.clientX - rect.left) / rect.width)
    v.currentTime = Math.max(0, ratio * (v.duration || 0))
    // Save on seek
    if (onProgress) {
      const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
      onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: percent >= 90 })
    }
  }, [onProgress])

  const handleProgressHover = useCallback((e) => {
    const bar = progressBarRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = 1 - ((e.clientX - rect.left) / rect.width)
    setHoverTime(formatTime(ratio * duration))
    setHoverPos(e.clientX - rect.left)
  }, [duration])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else {
        // iOS Safari fallback
        const v = videoRef.current
        if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
      }
    } catch {}
  }, [])

  const togglePiP = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (v.requestPictureInPicture) {
        await v.requestPictureInPicture()
      }
    } catch {}
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (v) {
      v.muted = !v.muted
      setMuted(v.muted)
    }
  }, [])

  const changeVolume = useCallback((val) => {
    const v = videoRef.current
    if (v) {
      v.volume = val
      setVolume(val)
      if (val > 0 && v.muted) { v.muted = false; setMuted(false) }
    }
  }, [])

  // ─── Fullscreen change listener ──────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  // ─── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Don't capture if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const v = videoRef.current
      if (!v) return

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault(); togglePlay(); break
        case 'ArrowLeft':
          e.preventDefault(); skip(5); break // RTL: left = forward
        case 'ArrowRight':
          e.preventDefault(); skip(-5); break // RTL: right = backward
        case 'j':
        case 'J':
          e.preventDefault(); skip(-10); break
        case 'l':
        case 'L':
          e.preventDefault(); skip(10); break
        case 'ArrowUp':
          e.preventDefault(); changeVolume(Math.min(1, v.volume + 0.1)); break
        case 'ArrowDown':
          e.preventDefault(); changeVolume(Math.max(0, v.volume - 0.1)); break
        case 'm':
        case 'M':
          e.preventDefault(); toggleMute(); break
        case 'f':
        case 'F':
          e.preventDefault(); toggleFullscreen(); break
        case 'Escape':
          if (isFullscreen) { e.preventDefault(); toggleFullscreen() }
          break
        default:
          // 0-9 jump to percentage
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault()
            const pct = parseInt(e.key) * 10
            v.currentTime = (pct / 100) * (v.duration || 0)
          }
      }
      resetControlsTimer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, skip, changeVolume, toggleMute, toggleFullscreen, isFullscreen, resetControlsTimer])

  // ─── Mobile double-tap ──────────────────────────────
  const handleDoubleTap = useCallback((side) => {
    const key = side === 'left' ? 'left' : 'right'
    const timer = doubleTapTimerRef.current[key]

    if (timer) {
      clearTimeout(timer)
      doubleTapTimerRef.current[key] = null
      // Double tap detected — in RTL, left=forward, right=backward
      const seconds = side === 'left' ? 10 : -10
      skip(seconds)
      setDoubleTapSide(side)
      setTimeout(() => setDoubleTapSide(null), 500)
    } else {
      doubleTapTimerRef.current[key] = setTimeout(() => {
        doubleTapTimerRef.current[key] = null
        togglePlay()
      }, 250)
    }
  }, [skip, togglePlay])

  // ─── Progress bar values ────────────────────────────
  const playedPct = duration ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration ? (buffered / duration) * 100 : 0

  if (!streamUrl) {
    return (
      <div className="rounded-2xl bg-black flex items-center justify-center h-64">
        <p className="text-white/40 text-sm font-['Tajawal']">لا يمكن تشغيل الفيديو</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="player-shell relative rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 group select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      dir="ltr" // Video controls are LTR internally, RTL mirroring done via layout
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => { setLoading(false); setError(false) }}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onError={handleError}
      />

      {/* Double-tap zones (mobile) */}
      <div className="absolute inset-0 flex pointer-events-auto" style={{ zIndex: 5 }}>
        <div
          className="w-1/2 h-full"
          onDoubleClick={() => handleDoubleTap('left')}
          onClick={(e) => { if (e.detail === 1) setTimeout(() => {}, 250) }}
        />
        <div
          className="w-1/2 h-full"
          onDoubleClick={() => handleDoubleTap('right')}
          onClick={(e) => { if (e.detail === 1) setTimeout(() => {}, 250) }}
        />
      </div>

      {/* Double-tap ripple */}
      <AnimatePresence>
        {doubleTapSide && (
          <motion.div
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 pointer-events-none ${
              doubleTapSide === 'left' ? 'left-[20%]' : 'right-[20%]'
            }`}
            style={{ zIndex: 15 }}
          />
        )}
      </AnimatePresence>

      {/* Center overlay: big play + loading */}
      <AnimatePresence>
        {(showBigPlay || loading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {loading ? (
              <Loader2 size={40} className="text-white/80 animate-spin" />
            ) : showBigPlay ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-sky-400/90 flex items-center justify-center shadow-xl pointer-events-auto cursor-pointer"
              >
                <Play size={36} className="text-white ml-1" fill="white" />
              </motion.button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80" style={{ zIndex: 20 }}>
          <div className="text-center space-y-3">
            <p className="text-white/60 text-sm font-['Tajawal']">حدث خطأ في تحميل الفيديو</p>
            <button
              onClick={() => { setError(false); handleError() }}
              className="px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 text-sm font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/30 transition"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls || !playing ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-3 px-3"
        style={{ zIndex: 12, pointerEvents: showControls || !playing ? 'auto' : 'none' }}
        dir="rtl"
      >
        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="relative h-1.5 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          onClick={seek}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Buffered */}
          <div
            className="absolute top-0 rounded-full h-full bg-white/40 pointer-events-none"
            style={{ right: 0, width: `${bufferedPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute top-0 rounded-full h-full bg-sky-400 pointer-events-none"
            style={{ right: 0, width: `${playedPct}%` }}
          />
          {/* Scrubber dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-sky-400 shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"
            style={{ right: `calc(${playedPct}% - 7px)` }}
          />
          {/* Hover time tooltip */}
          {hoverTime && (
            <div
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-xs font-['Inter'] pointer-events-none whitespace-nowrap"
              style={{ left: hoverPos }}
            >
              {hoverTime}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center gap-1.5">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
            aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>

          {/* Skip back (RTL: on the RIGHT of play = after play button) */}
          <button
            onClick={() => skip(-10)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
            aria-label="رجوع ١٠ ثواني"
          >
            <SkipBack size={18} />
          </button>

          {/* Skip forward (RTL: on the LEFT) */}
          <button
            onClick={() => skip(10)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
            aria-label="تقديم ١٠ ثواني"
          >
            <SkipForward size={18} />
          </button>

          {/* Time display */}
          <span className="text-white/80 text-xs font-['Inter'] tabular-nums mx-1 select-none" dir="ltr">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Speed menu */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className={`px-2 py-1 rounded-lg hover:bg-white/10 transition text-xs font-bold font-['Inter'] ${
                speed !== 1 ? 'text-amber-400' : 'text-white/80'
              }`}
              aria-label="سرعة التشغيل"
            >
              {speed}x
            </button>
            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/95 rounded-xl border border-white/10 overflow-hidden shadow-xl"
                  style={{ zIndex: 30 }}
                >
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSpeed(s); setShowSpeedMenu(false) }}
                      className={`block w-full px-4 py-1.5 text-xs font-['Inter'] text-center hover:bg-white/10 transition whitespace-nowrap ${
                        speed === s ? 'text-amber-400 font-bold' : 'text-white/70'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1 group/vol">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white"
              aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-sky-400 h-1 cursor-pointer"
              dir="ltr"
            />
          </div>

          {/* PiP */}
          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePiP}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white hidden sm:block"
              aria-label="صورة في صورة"
            >
              <PictureInPicture2 size={18} />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white"
            aria-label={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
