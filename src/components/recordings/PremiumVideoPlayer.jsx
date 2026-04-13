import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Loader2, PictureInPicture2,
  Bookmark, List, Repeat, X, AlertCircle, RefreshCw,
} from 'lucide-react'
import { resolveStreamUrl, resolveStreamUrlSync, invalidateStreamUrl, extractFileId } from '../../lib/driveStream'
import { toast } from '../ui/FluentiaToast'
import { supabase } from '../../lib/supabase'

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

function mapErrorToArabic(code) {
  switch (code) {
    case 1: return 'توقف التحميل — حاول مرة أخرى'
    case 2: return 'مشكلة في الاتصال — تأكد من الإنترنت'
    case 3: return 'صيغة الفيديو غير مدعومة على هذا الجهاز'
    case 4: return 'تعذر الوصول للتسجيل — أعد المحاولة'
    default: return 'حدث خطأ أثناء تحميل الفيديو'
  }
}

export default function PremiumVideoPlayer({
  recording,
  onProgress,
  onComplete,
  onXPAwarded,
  initialPosition = 0,
  chapters = [],
  bookmarks = [],
  onAddBookmark,
  onTogglePanel,
  showPanel = false,
  xpAwarded = false,
}) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressBarRef = useRef(null)
  const controlsTimerRef = useRef(null)
  const saveIntervalRef = useRef(null)
  const hasCompletedRef = useRef(false)
  const doubleTapTimerRef = useRef({ left: null, right: null })
  const thumbnailCapturedRef = useRef(false)
  const cumulativeWatchRef = useRef(0) // real seconds watched (not seeked)
  const lastTimeRef = useRef(0)

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
  const [playbackError, setPlaybackError] = useState(null) // { code, message }
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverPos, setHoverPos] = useState(0)
  const [showBigPlay, setShowBigPlay] = useState(true)
  const [doubleTapSide, setDoubleTapSide] = useState(null)
  const retryAttemptedRef = useRef(false)
  const [bookmarkInput, setBookmarkInput] = useState(null)
  const [bookmarkLabel, setBookmarkLabel] = useState('')
  const [hoveredChapter, setHoveredChapter] = useState(null)

  // A-B Loop state
  const [loopA, setLoopA] = useState(null)
  const [loopB, setLoopB] = useState(null)
  const loopActive = loopA !== null && loopB !== null

  const fileId = useMemo(() => extractFileId(recording?.google_drive_url), [recording?.google_drive_url])
  const isDebugMode = typeof window !== 'undefined' && localStorage.getItem('fluentia_debug') === '1'

  // resolveStreamUrl is now async (fetches auth token) — use sync fallback initially, then async with token
  const [streamUrl, setStreamUrl] = useState(() => resolveStreamUrlSync(fileId))
  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    if (isDebugMode) console.log('[Player] Resolving stream URL for fileId:', fileId)
    resolveStreamUrl(fileId).then(url => {
      if (!cancelled && url) {
        if (isDebugMode) console.log('[Player] Stream URL resolved (first 100):', url.substring(0, 100))
        setStreamUrl(url)
      }
    })
    return () => { cancelled = true }
  }, [fileId, isDebugMode])

  // ─── Deep logging for mobile debugging ─────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isDebugMode) return

    const log = (event) => {
      console.log(`[Player:${event}]`, {
        recordingId: recording?.id,
        fileId,
        src: video.src?.substring(0, 100),
        currentTime: video.currentTime,
        readyState: video.readyState,
        networkState: video.networkState,
        error: video.error ? { code: video.error.code, message: video.error.message } : null,
        userAgent: navigator.userAgent,
        isOnline: navigator.onLine,
        connectionType: navigator.connection?.effectiveType,
      })
    }

    const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay',
                    'play', 'playing', 'waiting', 'stalled', 'error', 'abort', 'suspend']
    const handlers = events.map(ev => {
      const handler = () => log(ev)
      video.addEventListener(ev, handler)
      return { ev, handler }
    })

    return () => handlers.forEach(({ ev, handler }) => video.removeEventListener(ev, handler))
  }, [recording?.id, fileId, isDebugMode])

  // Current chapter
  const currentChapter = useMemo(() => {
    if (!chapters.length || !currentTime) return null
    return [...chapters].reverse().find(c => currentTime >= c.start_seconds)
  }, [chapters, currentTime])

  // ─── A-B Loop logic ─────────────────────────────────
  const setLoopPoint = useCallback((point) => {
    const v = videoRef.current
    if (!v) return
    const t = Math.floor(v.currentTime * 10) / 10

    if (point === 'A') {
      setLoopA(t)
      if (loopB !== null && t >= loopB - 0.5) {
        setLoopB(null)
        toast({ type: 'error', title: 'يجب أن تكون نقطة B بعد نقطة A' })
      }
    } else {
      if (loopA === null) {
        toast({ type: 'error', title: 'حدد نقطة A أولاً' })
        return
      }
      if (t <= loopA + 0.5) {
        toast({ type: 'error', title: 'يجب أن تكون نقطة B بعد نقطة A' })
        return
      }
      setLoopB(t)
    }
  }, [loopA, loopB])

  const clearLoop = useCallback(() => {
    setLoopA(null)
    setLoopB(null)
  }, [])

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
        onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: false })
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
        onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: percent >= 90 })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Thumbnail capture ──────────────────────────────
  const captureThumbnail = useCallback(async () => {
    if (thumbnailCapturedRef.current) return
    if (recording?.thumbnail_url) return
    const v = videoRef.current
    if (!v || !v.videoWidth || !v.duration) return

    thumbnailCapturedRef.current = true

    try {
      // Seek to 10% mark for capture
      const captureTime = v.duration * 0.1
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 360
      const ctx = canvas.getContext('2d')

      // Use current frame if close enough, otherwise we use what we have
      ctx.drawImage(v, 0, 0, 640, 360)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)

      // Send to edge function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-recording-thumbnail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ recording_id: recording.id, image_base64: base64 }),
        }
      )
      const result = await res.json()
      if (result.success) {
        console.log('[Thumbnail] Saved:', result.url)
      }
    } catch (e) {
      console.error('[Thumbnail] Capture error:', e)
    }
  }, [recording?.id, recording?.thumbnail_url])

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
    const ct = v.currentTime
    setCurrentTime(ct)
    setDuration(v.duration || 0)
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))

    // Cumulative watch time tracker (only counts real playback, not seeks)
    const delta = ct - lastTimeRef.current
    if (delta > 0 && delta < 2) {
      // Normal playback: delta is small and positive
      cumulativeWatchRef.current += delta
    }
    lastTimeRef.current = ct

    // A-B Loop enforcement
    if (loopActive && ct >= loopB) {
      v.currentTime = loopA
      return
    }

    // Completion check (only if cumulative watch >= 80% of duration)
    if (v.duration && !hasCompletedRef.current) {
      const pct = (ct / v.duration) * 100
      const realWatchPct = (cumulativeWatchRef.current / v.duration) * 100
      if (pct >= 90 && realWatchPct >= 80) {
        hasCompletedRef.current = true
        onComplete?.()
        onProgress?.({ position: ct, percent: pct, speed: v.playbackRate, completed: true })
      }
    }

    // Trigger thumbnail capture after a few seconds of playback
    if (ct > 5 && !thumbnailCapturedRef.current) {
      captureThumbnail()
    }
  }, [onComplete, onProgress, loopActive, loopA, loopB, captureThumbnail])

  const handlePlay = useCallback(() => {
    setPlaying(true)
    setShowBigPlay(false)
    resetControlsTimer()
  }, [resetControlsTimer])

  const handlePause = useCallback(() => {
    setPlaying(false)
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    const v = videoRef.current
    if (v && onProgress) {
      const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
      onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: percent >= 90 })
    }
  }, [onProgress])

  const handleError = useCallback(async () => {
    const v = videoRef.current
    const err = v?.error
    const code = err?.code
    console.error('[PremiumVideoPlayer] Video error:', {
      code, message: err?.message,
      recordingId: recording?.id, fileId,
      currentTime: v?.currentTime,
    })

    // Auto-retry once with fresh URL for network/src errors
    if ((code === 2 || code === 4 || !code) && !retryAttemptedRef.current && fileId) {
      retryAttemptedRef.current = true
      const savedTime = v?.currentTime || 0
      invalidateStreamUrl(fileId)
      resolveStreamUrl(fileId, { forceRefresh: true }).then(freshUrl => {
        if (v && freshUrl) {
          v.src = freshUrl
          setStreamUrl(freshUrl)
          v.load()
          v.addEventListener('loadedmetadata', () => {
            if (savedTime > 1) v.currentTime = savedTime
            v.play().catch(() => {})
          }, { once: true })
        }
      })
      return
    }

    // Show error UI
    const msg = mapErrorToArabic(code)
    setPlaybackError({ code, message: msg })
  }, [fileId, recording?.id])

  const handleManualRetry = useCallback(() => {
    retryAttemptedRef.current = false
    setPlaybackError(null)
    setLoading(true)
    const v = videoRef.current
    if (v && fileId) {
      invalidateStreamUrl(fileId)
      resolveStreamUrl(fileId, { forceRefresh: true }).then(freshUrl => {
        if (v && freshUrl) {
          v.src = freshUrl
          setStreamUrl(freshUrl)
          v.load()
          v.play().catch(() => {})
        }
      })
    }
  }, [fileId])

  // ─── Controls ────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}) } else { v.pause() }
  }, [])

  const skip = useCallback((seconds) => {
    const v = videoRef.current
    if (!v) return
    const newTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
    // If seeking outside A-B loop range, clear loop
    if (loopActive && (newTime < loopA || newTime > loopB)) {
      clearLoop()
      toast({ type: 'info', title: 'تم إلغاء التكرار' })
    }
    v.currentTime = newTime
  }, [loopActive, loopA, loopB, clearLoop])

  const seekTo = useCallback((seconds) => {
    const v = videoRef.current
    if (v) {
      const newTime = Math.max(0, Math.min(v.duration || 0, seconds))
      // Clear loop if seeking outside range
      if (loopActive && (newTime < loopA || newTime > loopB)) {
        clearLoop()
        toast({ type: 'info', title: 'تم إلغاء التكرار' })
      }
      v.currentTime = newTime
      if (onProgress) {
        const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0
        onProgress({ position: v.currentTime, percent, speed: v.playbackRate, completed: percent >= 90 })
      }
    }
  }, [onProgress, loopActive, loopA, loopB, clearLoop])

  const seek = useCallback((e) => {
    const v = videoRef.current
    const bar = progressBarRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(Math.max(0, Math.min(1, ratio)) * (v.duration || 0))
  }, [seekTo])

  const handleProgressHover = useCallback((e) => {
    const bar = progressBarRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    setHoverTime(formatTime(Math.max(0, Math.min(1, ratio)) * duration))
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
        const v = videoRef.current
        if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
      }
    } catch {}
  }, [])

  const togglePiP = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else if (v.requestPictureInPicture) await v.requestPictureInPicture()
    } catch {}
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (v) { v.muted = !v.muted; setMuted(v.muted) }
  }, [])

  const changeVolume = useCallback((val) => {
    const v = videoRef.current
    if (v) {
      v.volume = val
      setVolume(val)
      if (val > 0 && v.muted) { v.muted = false; setMuted(false) }
    }
  }, [])

  // ─── Bookmark inline add ────────────────────────────
  const startBookmarkAdd = useCallback(() => {
    const v = videoRef.current
    if (v) {
      setBookmarkInput({ seconds: Math.floor(v.currentTime) })
      setBookmarkLabel('')
    }
  }, [])

  const confirmBookmarkAdd = useCallback(() => {
    if (bookmarkInput && onAddBookmark) {
      onAddBookmark({ position_seconds: bookmarkInput.seconds, label: bookmarkLabel.trim() || null })
    }
    setBookmarkInput(null)
    setBookmarkLabel('')
  }, [bookmarkInput, bookmarkLabel, onAddBookmark])

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
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const v = videoRef.current
      if (!v) return

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault(); togglePlay(); break
        case 'ArrowLeft':
          e.preventDefault(); skip(-5); break
        case 'ArrowRight':
          e.preventDefault(); skip(5); break
        case 'j':
        case 'J':
          e.preventDefault(); skip(-10); break  // J = backward (YouTube standard)
        case 'l':
        case 'L':
          e.preventDefault(); skip(10); break   // L = forward (YouTube standard)
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
        case 'b':
        case 'B':
          e.preventDefault(); startBookmarkAdd(); break
        case 'n':
        case 'N':
          e.preventDefault()
          if (onTogglePanel) onTogglePanel('notes', true)
          break
        case '[':
          e.preventDefault(); setLoopPoint('A'); break
        case ']':
          e.preventDefault(); setLoopPoint('B'); break
        case '\\':
          e.preventDefault(); clearLoop(); break
        case 'Escape':
          if (bookmarkInput) { setBookmarkInput(null); break }
          if (isFullscreen) { e.preventDefault(); toggleFullscreen() }
          break
        default:
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
  }, [togglePlay, skip, changeVolume, toggleMute, toggleFullscreen, isFullscreen, resetControlsTimer, startBookmarkAdd, onTogglePanel, bookmarkInput, setLoopPoint, clearLoop])

  // ─── Mobile double-tap ──────────────────────────────
  const handleDoubleTap = useCallback((side) => {
    const key = side === 'left' ? 'left' : 'right'
    const timer = doubleTapTimerRef.current[key]
    if (timer) {
      clearTimeout(timer)
      doubleTapTimerRef.current[key] = null
      const seconds = side === 'left' ? -10 : 10
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
  const loopAPct = duration && loopA !== null ? (loopA / duration) * 100 : null
  const loopBPct = duration && loopB !== null ? (loopB / duration) * 100 : null

  // Expose currentTime + seekTo for parent
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.__playerApi = { getCurrentTime: () => currentTime, seekTo }
    }
  }, [currentTime, seekTo])

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
      dir="ltr"
    >
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => { setLoading(false); setPlaybackError(null) }}
        onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
        onError={handleError}
      />

      {/* Double-tap zones */}
      <div className="absolute inset-0 flex pointer-events-auto" style={{ zIndex: 5 }}>
        <div className="w-1/2 h-full" onDoubleClick={() => handleDoubleTap('left')} />
        <div className="w-1/2 h-full" onDoubleClick={() => handleDoubleTap('right')} />
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

      {/* Top-right badge: A-B loop indicator */}
      {loopActive && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold font-['Inter'] pointer-events-none" style={{ zIndex: 14 }}>
          A-B
        </div>
      )}

      {/* Top-left badge: speed indicator */}
      {speed !== 1 && playing && (
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 text-amber-400 text-xs font-bold font-['Inter'] pointer-events-none" style={{ zIndex: 14 }}>
          {speed}x
        </div>
      )}

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
      {playbackError && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center flex-col gap-4 p-6 text-center" style={{ zIndex: 20 }} dir="rtl">
          <AlertCircle className="w-16 h-16 text-red-400" />
          <p className="text-white text-lg font-['Tajawal']">تعذر تشغيل التسجيل</p>
          <p className="text-white/60 text-sm font-['Tajawal']">تأكد من اتصالك بالإنترنت ثم أعد المحاولة</p>
          {playbackError.code && (
            <p className="text-white/30 text-xs font-['Inter']">Error code: {playbackError.code}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={handleManualRetry}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-xl text-white font-medium font-['Tajawal'] flex items-center gap-2 transition"
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
            <a
              href="https://wa.me/966558669974?text=%D9%85%D8%B4%D9%83%D9%84%D8%A9%20%D9%81%D9%8A%20%D8%AA%D8%B4%D8%BA%D9%8A%D9%84%20%D8%A7%D9%84%D8%AA%D8%B3%D8%AC%D9%8A%D9%84"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white/70 text-sm font-['Tajawal'] transition"
            >
              تواصل مع الدعم
            </a>
          </div>
        </div>
      )}

      {/* Debug state button (visible only in debug mode) */}
      {isDebugMode && (
        <button
          onClick={() => {
            const v = videoRef.current
            console.log('[Manual] Video element state:', {
              src: v?.src?.substring(0, 120),
              currentSrc: v?.currentSrc?.substring(0, 120),
              error: v?.error ? { code: v.error.code, message: v.error.message } : null,
              readyState: v?.readyState,
              networkState: v?.networkState,
              paused: v?.paused,
              duration: v?.duration,
              currentTime: v?.currentTime,
              buffered: v?.buffered ? Array.from({ length: v.buffered.length }, (_, i) =>
                [v.buffered.start(i).toFixed(1), v.buffered.end(i).toFixed(1)]) : [],
              userAgent: navigator.userAgent,
              online: navigator.onLine,
              connection: navigator.connection?.effectiveType,
            })
          }}
          className="absolute top-2 right-2 px-2 py-1 rounded bg-yellow-500/80 text-black text-[10px] font-bold"
          style={{ zIndex: 30 }}
        >
          🔍 Log State
        </button>
      )}

      {/* Bookmark inline input */}
      <AnimatePresence>
        {bookmarkInput && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/90 border border-sky-500/30 shadow-xl"
            style={{ zIndex: 25 }}
            dir="rtl"
          >
            <Bookmark size={14} className="text-sky-400 flex-shrink-0" />
            <span className="text-xs text-sky-400 font-mono flex-shrink-0">{formatTime(bookmarkInput.seconds)}</span>
            <input
              autoFocus
              value={bookmarkLabel}
              onChange={e => setBookmarkLabel(e.target.value)}
              placeholder="ملاحظة (اختياري)"
              className="bg-transparent text-sm text-white/90 placeholder:text-white/30 outline-none w-40 font-['Tajawal']"
              onKeyDown={e => {
                if (e.key === 'Enter') confirmBookmarkAdd()
                if (e.key === 'Escape') { setBookmarkInput(null); setBookmarkLabel('') }
              }}
            />
            <button onClick={confirmBookmarkAdd} className="text-xs text-sky-400 font-bold font-['Tajawal'] hover:text-sky-300">حفظ</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay — dir="ltr" so progress bar fills left-to-right (time axis is universal) */}
      <motion.div
        initial={false}
        animate={{ opacity: showControls || !playing ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-3 px-3"
        style={{ zIndex: 12, pointerEvents: showControls || !playing ? 'auto' : 'none' }}
        dir="ltr"
      >
        {/* Current chapter label */}
        {currentChapter && (
          <div className="mb-1.5 px-1">
            <span className="text-xs text-amber-400/80 font-['Tajawal']">{currentChapter.title_ar}</span>
          </div>
        )}

        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="relative h-1.5 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          onClick={seek}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => { setHoverTime(null); setHoveredChapter(null) }}
        >
          {/* A-B Loop highlight range */}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute top-0 h-full bg-amber-400/30 pointer-events-none rounded-full"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
            />
          )}

          {/* Buffered */}
          <div className="absolute top-0 rounded-full h-full bg-white/40 pointer-events-none" style={{ left: 0, width: `${bufferedPct}%` }} />
          {/* Played */}
          <div className="absolute top-0 rounded-full h-full bg-sky-400 pointer-events-none" style={{ left: 0, width: `${playedPct}%` }} />
          {/* Scrubber dot */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-sky-400 shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${playedPct}% - 7px)` }} />

          {/* Chapter markers */}
          {duration > 0 && chapters.map(ch => {
            const pct = (ch.start_seconds / duration) * 100
            return (
              <div
                key={ch.id}
                className="absolute -top-1 w-0.5 h-3 bg-amber-400 pointer-events-auto cursor-pointer"
                style={{ left: `${pct}%` }}
                title={ch.title_ar}
                onMouseEnter={() => setHoveredChapter(ch)}
                onMouseLeave={() => setHoveredChapter(null)}
                onClick={(e) => { e.stopPropagation(); seekTo(ch.start_seconds) }}
              />
            )
          })}

          {/* Bookmark markers */}
          {duration > 0 && bookmarks.map(bm => {
            const pct = (bm.position_seconds / duration) * 100
            return (
              <div key={bm.id} className="absolute -top-3 pointer-events-auto cursor-pointer" style={{ left: `calc(${pct}% - 6px)` }} title={bm.label || 'علامة مرجعية'} onClick={(e) => { e.stopPropagation(); seekTo(bm.position_seconds) }}>
                <Bookmark size={12} className="text-sky-400 fill-sky-400/50" />
              </div>
            )
          })}

          {/* Hovered chapter tooltip */}
          {hoveredChapter && (
            <div className="absolute -top-10 px-2 py-1 rounded bg-black/90 border border-amber-400/20 text-amber-400 text-xs font-['Tajawal'] pointer-events-none whitespace-nowrap" style={{ left: `${(hoveredChapter.start_seconds / duration) * 100}%`, transform: 'translateX(-50%)' }}>
              {hoveredChapter.title_ar}
            </div>
          )}

          {/* Hover time tooltip */}
          {hoverTime && !hoveredChapter && (
            <div className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-xs font-['Inter'] pointer-events-none whitespace-nowrap" style={{ left: hoverPos }}>
              {hoverTime}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center gap-1">
          <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-white/10 transition text-white" aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
            {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>

          <button onClick={() => skip(-10)} className="p-2 rounded-lg hover:bg-white/10 transition text-white" aria-label="رجوع ١٠ ثواني">
            <SkipBack size={18} />
          </button>

          <button onClick={() => skip(10)} className="p-2 rounded-lg hover:bg-white/10 transition text-white" aria-label="تقديم ١٠ ثواني">
            <SkipForward size={18} />
          </button>

          <span className="text-white/80 text-xs font-['Inter'] tabular-nums mx-1 select-none" dir="ltr">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* A-B Loop buttons */}
          <button
            onClick={() => setLoopPoint('A')}
            className={`px-1.5 py-1 rounded-lg text-xs font-bold font-['Inter'] transition ${
              loopA !== null ? 'text-amber-400 bg-amber-400/15' : 'text-white/50 hover:text-amber-400 hover:bg-white/10'
            }`}
            aria-label="تعيين نقطة البداية للتكرار"
            title="كرر مقطعاً لممارسة النطق"
          >
            A
          </button>
          <button
            onClick={() => setLoopPoint('B')}
            className={`px-1.5 py-1 rounded-lg text-xs font-bold font-['Inter'] transition ${
              loopB !== null ? 'text-amber-400 bg-amber-400/15' : 'text-white/50 hover:text-amber-400 hover:bg-white/10'
            }`}
            aria-label="تعيين نقطة النهاية للتكرار"
          >
            B
          </button>
          {loopActive && (
            <button
              onClick={clearLoop}
              className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/15 transition"
              aria-label="إلغاء التكرار"
            >
              <X size={14} />
            </button>
          )}

          {/* Speed menu */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className={`px-2 py-1 rounded-lg hover:bg-white/10 transition text-xs font-bold font-['Inter'] ${speed !== 1 ? 'text-amber-400' : 'text-white/80'}`}
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
                    <button key={s} onClick={() => { setSpeed(s); setShowSpeedMenu(false) }} className={`block w-full px-4 py-1.5 text-xs font-['Inter'] text-center hover:bg-white/10 transition whitespace-nowrap ${speed === s ? 'text-amber-400 font-bold' : 'text-white/70'}`}>
                      {s}x
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1 group/vol">
            <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-white/10 transition text-white" aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}>
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-sky-400 h-1 cursor-pointer" dir="ltr" />
          </div>

          {onAddBookmark && (
            <button onClick={startBookmarkAdd} className="p-2 rounded-lg hover:bg-white/10 transition text-white/70 hover:text-sky-400" aria-label="إضافة علامة">
              <Bookmark size={16} />
            </button>
          )}

          {onTogglePanel && (
            <button onClick={() => onTogglePanel()} className={`p-2 rounded-lg hover:bg-white/10 transition ${showPanel ? 'text-sky-400' : 'text-white/70'}`} aria-label="اللوحة الجانبية">
              <List size={16} />
            </button>
          )}

          {document.pictureInPictureEnabled && (
            <button onClick={togglePiP} className="p-2 rounded-lg hover:bg-white/10 transition text-white hidden sm:block" aria-label="صورة في صورة">
              <PictureInPicture2 size={18} />
            </button>
          )}

          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10 transition text-white" aria-label={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}>
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
