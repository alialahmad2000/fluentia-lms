import { useState, useRef, useCallback, useEffect } from 'react'
import { ExternalLink, Loader2, Play, Pause, Maximize, SkipForward, SkipBack } from 'lucide-react'

const SEEK_SECONDS = 5

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
  // Google Drive direct streaming URL — works for publicly shared videos
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export { getEmbedUrl }

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

// ─── Native video player with tap-to-seek ──────────────

function NativePlayer({ url, streamUrl, onFallback }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [seekSide, setSeekSide] = useState(null) // 'left' | 'right' | null
  const [showControls, setShowControls] = useState(true)
  const seekTimeout = useRef(null)
  const controlsTimeout = useRef(null)
  const tapCount = useRef(0)
  const tapTimer = useRef(null)
  const tapSide = useRef(null)

  // Auto-hide controls after 3s of no interaction
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimeout.current)
    if (playing) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
    }
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

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }, [])

  // Detect single tap (toggle play) vs double tap (seek)
  const handleTap = useCallback((e) => {
    e.preventDefault()
    resetControlsTimer()

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left
    const side = x > rect.width / 2 ? 'right' : 'left'

    tapCount.current++
    tapSide.current = side

    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => {
        // Single tap — toggle play/pause
        if (tapCount.current === 1) togglePlay()
        tapCount.current = 0
      }, 250)
    } else {
      // Double tap — seek
      clearTimeout(tapTimer.current)
      tapCount.current = 0
      handleSeek(side === 'right' ? 1 : -1)
    }
  }, [togglePlay, handleSeek, resetControlsTimer])

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    // Try container fullscreen first (works on most browsers, keeps custom controls)
    if (container.requestFullscreen) { container.requestFullscreen(); return }
    if (container.webkitRequestFullscreen) { container.webkitRequestFullscreen(); return }

    // iOS Safari: use native video fullscreen (only method that works)
    if (video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return }
    if (video.webkitRequestFullscreen) { video.webkitRequestFullscreen(); return }

    // Last resort: try document element
    const doc = document.documentElement
    if (doc.requestFullscreen) { doc.requestFullscreen(); return }
    if (doc.webkitRequestFullscreen) { doc.webkitRequestFullscreen(); return }
  }, [])

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
        className="absolute inset-0 w-full h-full rounded-lg"
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onLoadedData={() => setLoading(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => onFallback()}
      />

      {/* Touch overlay — captures taps for seek / play-pause */}
      <div
        className="absolute inset-0 z-10 rounded-lg"
        onClick={handleTap}
        onTouchEnd={handleTap}
      />

      {/* Seek indicators */}
      <SeekIndicator side="left" visible={seekSide === 'left'} />
      <SeekIndicator side="right" visible={seekSide === 'right'} />

      {/* Center play/pause on single tap */}
      {showControls && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          {!playing && (
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>
          )}
        </div>
      )}

      {/* Bottom controls bar */}
      {showControls && !loading && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 rounded-b-lg pointer-events-none"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}
        >
          <button onClick={togglePlay} className="text-white p-1.5 pointer-events-auto">
            {playing ? <Pause size={18} /> : <Play size={18} fill="white" />}
          </button>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white p-1.5 pointer-events-auto"
            >
              <ExternalLink size={14} />
            </a>
            <button onClick={handleFullscreen} className="text-white p-1.5 pointer-events-auto">
              <Maximize size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Seek hint for first-time users */}
      {showControls && !playing && !loading && (
        <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[10px] text-white/50 font-['Tajawal'] bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
            انقر مرتين على اليمين أو اليسار للتقديم أو الترجيع
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Iframe fallback player ────────────────────────────

function IframePlayer({ embedUrl, onLoad, onError }) {
  const [loading, setLoading] = useState(true)

  return (
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
        onLoad={() => { setLoading(false); onLoad?.() }}
        onError={() => { setLoading(false); onError?.() }}
        style={{ border: 'none' }}
      />
    </div>
  )
}

// ─── Main VideoPlayer ──────────────────────────────────

export default function VideoPlayer({ url, className = '' }) {
  const [useIframe, setUseIframe] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const embedUrl = getEmbedUrl(url)
  const streamUrl = getDirectStreamUrl(url)

  if (!url) return null

  // Try native player first (for Google Drive), fall back to iframe
  const canTryNative = streamUrl && !useIframe

  if (canTryNative) {
    return (
      <div className={className}>
        <NativePlayer
          url={url}
          streamUrl={streamUrl}
          onFallback={() => setUseIframe(true)}
        />
        <div className="mt-2 flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-['Tajawal']"
          >
            <ExternalLink size={10} />
            فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  // Iframe player (fallback or non-Drive URLs)
  if (embedUrl && !iframeError) {
    return (
      <div className={className}>
        <IframePlayer embedUrl={embedUrl} onError={() => setIframeError(true)} />
        <div className="mt-2 flex justify-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[var(--text-muted)] hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-['Tajawal']"
          >
            <ExternalLink size={10} />
            فتح في نافذة جديدة
          </a>
        </div>
      </div>
    )
  }

  // Last resort — direct link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors ${className}`}
    >
      <ExternalLink size={14} />
      فتح التسجيل
    </a>
  )
}
