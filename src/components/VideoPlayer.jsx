import { useState, useRef, useCallback, useEffect } from 'react'
import { ExternalLink, Loader2, Play, Pause, Maximize, SkipForward, SkipBack, Bookmark, Clock, BookmarkCheck } from 'lucide-react'

const SEEK_SECONDS = 5
const PROGRESS_SAVE_INTERVAL = 3000
const PROGRESS_STORAGE_PREFIX = 'vp_'
const WATCH_TIME_PREFIX = 'vw_'

// ─── URL helpers ───────────────────────────────────────

function getDriveFileId(url) {
  if (!url) return null
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    || url.match(/drive\.google\.com.*?([a-zA-Z0-9_-]{25,})/)
  return m?.[1] || null
}

function getEmbedUrl(url) {
  if (!url) return null
  const fileId = getDriveFileId(url)
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`

  if (url.includes('drive.google.com') && (url.includes('/preview') || url.includes('/embed'))) return url

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  return null
}

function getDirectStreamUrl(url) {
  const fileId = getDriveFileId(url)
  if (!fileId) return null
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  return `${supabaseUrl}/functions/v1/video-proxy?id=${fileId}`
}

export { getEmbedUrl }

// ─── Progress persistence ──────────────────────────────

function getVideoKey(url) {
  const fileId = getDriveFileId(url)
  return fileId ? `${PROGRESS_STORAGE_PREFIX}${fileId}` : null
}

function getWatchTimeKey(url) {
  const fileId = getDriveFileId(url)
  return fileId ? `${WATCH_TIME_PREFIX}${fileId}` : null
}

function loadProgress(url) {
  const key = getVideoKey(url)
  if (!key) return 0
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (!saved) return 0
    if (saved.duration > 0 && saved.time / saved.duration > 0.95) return 0
    return saved.time || 0
  } catch { return 0 }
}

function saveProgress(url, time, duration) {
  const key = getVideoKey(url)
  if (!key || !time) return
  try {
    localStorage.setItem(key, JSON.stringify({ time, duration: duration || 0, ts: Date.now() }))
  } catch {}
}

// Load/save bookmark (manual timestamp for iframe mode)
function loadBookmark(url) {
  const key = getVideoKey(url)
  if (!key) return null
  try {
    const saved = JSON.parse(localStorage.getItem(key + '_bm'))
    return saved
  } catch { return null }
}

function saveBookmark(url, timestamp) {
  const key = getVideoKey(url)
  if (!key) return
  try {
    localStorage.setItem(key + '_bm', JSON.stringify({ timestamp, ts: Date.now() }))
  } catch {}
}

// Track total watch time
function loadWatchTime(url) {
  const key = getWatchTimeKey(url)
  if (!key) return 0
  try { return parseInt(localStorage.getItem(key) || '0', 10) } catch { return 0 }
}

function addWatchTime(url, seconds) {
  const key = getWatchTimeKey(url)
  if (!key) return
  try {
    const current = parseInt(localStorage.getItem(key) || '0', 10)
    localStorage.setItem(key, String(current + seconds))
  } catch {}
}

// ─── Time formatting ───────────────────────────────────

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function parseTimestamp(str) {
  if (!str) return 0
  const parts = str.trim().split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

// ─── Seek overlay indicator ────────────────────────────

function SeekIndicator({ side, visible }) {
  if (!visible) return null
  const isRight = side === 'right'
  return (
    <div
      className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none z-20"
      style={{
        [isRight ? 'right' : 'left']: 0,
        width: '40%',
        background: isRight
          ? 'linear-gradient(to left, rgba(255,255,255,0.12), transparent)'
          : 'linear-gradient(to right, rgba(255,255,255,0.12), transparent)',
      }}
    >
      <div className="flex flex-col items-center gap-0.5 text-white">
        {isRight ? <SkipForward size={28} /> : <SkipBack size={28} />}
        <span className="text-xs font-bold">{SEEK_SECONDS} ثانية</span>
      </div>
    </div>
  )
}

// ─── Progress bar ──────────────────────────────────────

function ProgressBar({ currentTime, duration, onSeek }) {
  const barRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const seekFromEvent = useCallback((e) => {
    const bar = barRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }, [duration, onSeek])

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    setDragging(true)
    seekFromEvent(e)
  }, [seekFromEvent])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e) => seekFromEvent(e)
    const handleUp = () => setDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [dragging, seekFromEvent])

  return (
    <div
      ref={barRef}
      className="relative w-full h-5 flex items-center cursor-pointer pointer-events-auto"
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      <div className="absolute left-0 right-0 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%`, background: 'var(--accent-sky, #38bdf8)' }}
        />
      </div>
      <div
        className="absolute w-3 h-3 rounded-full -translate-x-1/2 transition-[left] duration-100"
        style={{
          left: `${progress}%`,
          background: 'var(--accent-sky, #38bdf8)',
          boxShadow: '0 0 6px rgba(56,189,248,0.5)',
          transform: `translateX(-50%) scale(${dragging ? 1.4 : 1})`,
        }}
      />
    </div>
  )
}

// ─── Resume banner (native player) ────────────────────

function ResumeBanner({ savedTime, onResume, onDismiss }) {
  if (!savedTime || savedTime < 5) return null
  return (
    <div
      className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-xs text-white/80 font-['Tajawal']">
        أكمل من {formatTime(savedTime)}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={onResume} className="text-xs font-bold px-3 py-1 rounded-lg text-black" style={{ background: 'var(--accent-sky, #38bdf8)' }}>
          متابعة
        </button>
        <button onClick={onDismiss} className="text-xs px-2 py-1 rounded-lg text-white/60 hover:text-white">
          من البداية
        </button>
      </div>
    </div>
  )
}

// ─── Bookmark toolbar (iframe mode) ───────────────────

function BookmarkToolbar({ url }) {
  const [bookmark, setBookmark] = useState(() => loadBookmark(url))
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [watchTime, setWatchTime] = useState(() => loadWatchTime(url))
  const watchInterval = useRef(null)

  // Track watch time every 10 seconds while visible
  useEffect(() => {
    watchInterval.current = setInterval(() => {
      addWatchTime(url, 10)
      setWatchTime(prev => prev + 10)
    }, 10000)
    return () => clearInterval(watchInterval.current)
  }, [url])

  const handleSave = useCallback(() => {
    const seconds = parseTimestamp(input)
    if (seconds > 0) {
      saveBookmark(url, seconds)
      setBookmark({ timestamp: seconds, ts: Date.now() })
      setEditing(false)
      setInput('')
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }, [input, url])

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" dir="rtl">
      {/* Existing bookmark */}
      {bookmark && !editing && (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Tajawal']"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', color: 'var(--accent-sky, #38bdf8)' }}
        >
          <BookmarkCheck size={13} />
          <span>توقفت عند <strong dir="ltr">{formatTime(bookmark.timestamp)}</strong></span>
        </div>
      )}

      {/* Save bookmark button / form */}
      {editing ? (
        <div className="inline-flex items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="مثلاً 30:50"
            dir="ltr"
            className="w-24 h-8 px-2 rounded-lg text-xs text-center font-['IBM Plex Sans',monospace]"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          />
          <button
            onClick={handleSave}
            className="h-8 px-3 rounded-lg text-xs font-bold font-['Tajawal']"
            style={{ background: 'var(--accent-sky, #38bdf8)', color: '#0f172a' }}
          >
            حفظ
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-8 px-2 rounded-lg text-xs font-['Tajawal']"
            style={{ color: 'var(--text-tertiary)' }}
          >
            إلغاء
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] transition-colors"
          style={{
            background: justSaved ? 'rgba(16,185,129,0.08)' : 'var(--surface-raised)',
            border: `1px solid ${justSaved ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
            color: justSaved ? '#10b981' : 'var(--text-secondary)',
          }}
        >
          {justSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {justSaved ? 'تم الحفظ' : 'حفظ موضعي'}
        </button>
      )}

      {/* Watch time */}
      {watchTime >= 60 && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-['Tajawal']"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Clock size={11} />
          شاهدت {formatTime(watchTime)}
        </span>
      )}
    </div>
  )
}

// ─── Native video player with full controls ────────────

function NativePlayer({ url, streamUrl, onFallback }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seekSide, setSeekSide] = useState(null)
  const [showControls, setShowControls] = useState(true)
  const [showResume, setShowResume] = useState(false)
  const savedTimeRef = useRef(0)
  const seekTimeout = useRef(null)
  const controlsTimeout = useRef(null)
  const saveInterval = useRef(null)
  const tapCount = useRef(0)
  const tapTimer = useRef(null)
  const isTouchRef = useRef(false)

  useEffect(() => {
    const saved = loadProgress(url)
    if (saved > 5) { savedTimeRef.current = saved; setShowResume(true) }
  }, [url])

  useEffect(() => {
    if (playing) {
      saveInterval.current = setInterval(() => {
        const video = videoRef.current
        if (video) saveProgress(url, video.currentTime, video.duration)
      }, PROGRESS_SAVE_INTERVAL)
    }
    return () => clearInterval(saveInterval.current)
  }, [playing, url])

  useEffect(() => {
    return () => {
      const video = videoRef.current
      if (video && video.currentTime > 0) saveProgress(url, video.currentTime, video.duration)
    }
  }, [url])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    if (playing) controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  useEffect(() => {
    if (!playing) setShowControls(true)
    else resetControlsTimer()
    return () => clearTimeout(controlsTimeout.current)
  }, [playing, resetControlsTimer])

  const handleSeek = useCallback((direction) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + direction * SEEK_SECONDS))
    const side = direction > 0 ? 'right' : 'left'
    setSeekSide(side)
    clearTimeout(seekTimeout.current)
    seekTimeout.current = setTimeout(() => setSeekSide(null), 400)
  }, [])

  const handleProgressSeek = useCallback((time) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    resetControlsTimer()
  }, [resetControlsTimer])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }, [])

  const handleTap = useCallback((e) => {
    if (e.type === 'touchend') { e.preventDefault(); isTouchRef.current = true }
    else if (isTouchRef.current) { isTouchRef.current = false; return }
    resetControlsTimer()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const touch = e.changedTouches?.[0]
    const x = (touch?.clientX ?? e.clientX) - rect.left
    const side = x > rect.width / 2 ? 'right' : 'left'
    tapCount.current++
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => { if (tapCount.current === 1) togglePlay(); tapCount.current = 0 }, 250)
    } else {
      clearTimeout(tapTimer.current); tapCount.current = 0
      handleSeek(side === 'right' ? 1 : -1)
    }
  }, [togglePlay, handleSeek, resetControlsTimer])

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return
    if (container.requestFullscreen) { container.requestFullscreen(); return }
    if (container.webkitRequestFullscreen) { container.webkitRequestFullscreen(); return }
    if (video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return }
    if (video.webkitRequestFullscreen) { video.webkitRequestFullscreen(); return }
    const doc = document.documentElement
    if (doc.requestFullscreen) { doc.requestFullscreen(); return }
    if (doc.webkitRequestFullscreen) { doc.webkitRequestFullscreen(); return }
  }, [])

  const handleResume = useCallback(() => {
    const video = videoRef.current
    if (video && savedTimeRef.current) video.currentTime = savedTimeRef.current
    setShowResume(false)
    video?.play()
  }, [])

  const handlePause = useCallback(() => {
    setPlaying(false)
    const video = videoRef.current
    if (video) saveProgress(url, video.currentTime, video.duration)
  }, [url])

  return (
    <div ref={containerRef} className="video-player-container relative w-full rounded-lg select-none" style={{ aspectRatio: '16 / 9', background: '#000' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-sky-400 animate-spin" />
            <span className="text-xs text-white/60 font-['Tajawal']">جاري تحميل التسجيل...</span>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={streamUrl}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full rounded-lg"
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onLoadedData={() => setLoading(false)}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={handlePause}
        onEnded={() => { setPlaying(false); const key = getVideoKey(url); if (key) localStorage.removeItem(key) }}
        onError={() => { console.warn('[VideoPlayer] Native player failed, using iframe'); onFallback() }}
      />

      {showResume && !loading && !playing && (
        <ResumeBanner savedTime={savedTimeRef.current} onResume={handleResume} onDismiss={() => setShowResume(false)} />
      )}

      <div className="absolute inset-0 z-10 rounded-lg" onClick={handleTap} onTouchEnd={handleTap} />

      <SeekIndicator side="left" visible={seekSide === 'left'} />
      <SeekIndicator side="right" visible={seekSide === 'right'} />

      {showControls && !loading && !playing && !showResume && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {showControls && !loading && (
        <div className="absolute bottom-0 left-0 right-0 z-20 rounded-b-lg pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
          <div className="px-3"><ProgressBar currentTime={currentTime} duration={duration} onSeek={handleProgressSeek} /></div>
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white p-1 pointer-events-auto">
                {playing ? <Pause size={18} /> : <Play size={18} fill="white" />}
              </button>
              <span className="text-[11px] text-white/70 font-['IBM Plex Sans',monospace] tabular-nums pointer-events-none" dir="ltr">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white p-1 pointer-events-auto">
                <ExternalLink size={14} />
              </a>
              <button onClick={handleFullscreen} className="text-white p-1 pointer-events-auto"><Maximize size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {showControls && !playing && !loading && !showResume && (
        <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[10px] text-white/50 font-['Tajawal'] bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
            انقر مرتين على اليمين أو اليسار للتقديم أو الترجيع
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Iframe player with bookmark toolbar ───────────────

function IframePlayer({ url, embedUrl }) {
  const [loading, setLoading] = useState(true)

  return (
    <div>
      <div className="relative w-full rounded-lg" style={{ aspectRatio: '16 / 9', background: 'rgba(0,0,0,0.3)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-sky-400 animate-spin" />
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">جاري تحميل التسجيل...</span>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          onLoad={() => setLoading(false)}
          style={{ border: 'none' }}
        />
      </div>
      <BookmarkToolbar url={url} />
    </div>
  )
}

// ─── Main VideoPlayer ──────────────────────────────────

export default function VideoPlayer({ url, className = '' }) {
  const [useIframe, setUseIframe] = useState(false)
  const embedUrl = getEmbedUrl(url)
  const streamUrl = getDirectStreamUrl(url)

  if (!url) return null

  const canTryNative = streamUrl && !useIframe

  if (canTryNative) {
    return (
      <div className={className}>
        <NativePlayer url={url} streamUrl={streamUrl} onFallback={() => setUseIframe(true)} />
        <div className="mt-2 flex justify-end">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-['Tajawal']">
            <ExternalLink size={10} /> فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  if (embedUrl) {
    return (
      <div className={className}>
        <IframePlayer url={url} embedUrl={embedUrl} />
        <div className="mt-2 flex justify-end">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-['Tajawal']">
            <ExternalLink size={10} /> فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors ${className}`}>
      <ExternalLink size={14} /> فتح التسجيل
    </a>
  )
}
