import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Settings, Bookmark, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { ABLoopControls } from './ABLoopControls'
import { SettingsMenu, SettingsButton } from './SettingsMenu'
import { BookmarkDrawer } from './BookmarkDrawer'
import { useBarVisibility } from '../hooks/useBarVisibility'

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export function BottomBarControls({
  isPlaying, isLoading,
  currentTime, duration,
  playbackRate, RATES,
  markerA, markerB, isLooping,
  bookmarks,
  localFeatures,
  onToggle, onSkip, onSetRate, onSeek,
  onSetMarkerA, onSetMarkerB, onClearMarkers, onToggleLoop,
  onAddBookmark, onRemoveBookmark, onJumpToBookmark,
  onKaraokeToggle, karaokeEnabled,
  showSettings, onSettingsOpen,
  onToggleFeature,
}) {
  const [expanded, setExpanded] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const barRef = useRef(null)
  const { hidden, HIDE_OFFSET } = useBarVisibility()

  // Swipe up/down gesture on the bar
  const touchStartY = useRef(null)
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    if (dy > 40) setExpanded(true)
    if (dy < -40) setExpanded(false)
    touchStartY.current = null
  }

  // Long-press for speed selector
  const longPressTimer = useRef(null)
  const [showSpeedSelector, setShowSpeedSelector] = useState(false)
  const onPressStart = () => {
    longPressTimer.current = setTimeout(() => setShowSpeedSelector(true), 500)
  }
  const onPressEnd = () => { clearTimeout(longPressTimer.current) }

  const translateY = hidden ? HIDE_OFFSET : 0

  return (
    <div
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 z-40 select-none"
      style={{
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(6,14,28,0.88)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -8px 32px -4px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: `translateY(${translateY}px)`,
        transition: 'transform 200ms ease-out',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
    >
      {/* Settings menu (portal-like — inside bar but absolute */}
      {showSettings && (
        <SettingsMenu
          open={showSettings}
          onClose={() => onSettingsOpen(false)}
          features={localFeatures}
          onToggleFeature={onToggleFeature}
        />
      )}

      {/* Thin progress bar at very top */}
      <div
        className="w-full cursor-pointer"
        style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
          onSeek(pct * duration)
        }}
      >
        <div
          className="h-full bg-sky-500 transition-[width] duration-75"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
        {/* A-B region */}
        {markerA !== null && markerB !== null && duration > 0 && (
          <div
            className="absolute top-0 h-full bg-amber-400/40"
            style={{
              left: `${(markerA / duration) * 100}%`,
              width: `${((markerB - markerA) / duration) * 100}%`,
            }}
          />
        )}
      </div>

      {/* Collapsed bar — always visible */}
      <div
        className="flex items-center gap-2 px-4 py-3 md:py-4"
        dir="ltr"
        onClick={(e) => {
          // Expand if clicking empty area (not a button or progress)
          if (e.target === e.currentTarget || e.target.closest('[data-bar-action]') === null) {
            setExpanded(v => !v)
          }
        }}
      >
        {/* Skip back */}
        <button data-bar-action onClick={() => onSkip(-10000)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
          <SkipBack size={18}/>
        </button>

        {/* Play/Pause */}
        <button data-bar-action onClick={onToggle} className="w-11 h-11 flex items-center justify-center bg-sky-500 hover:bg-sky-400 text-white rounded-full transition-colors flex-shrink-0">
          {isLoading ? <Loader2 size={18} className="animate-spin"/> : isPlaying ? <Pause size={18}/> : <Play size={18}/>}
        </button>

        {/* Skip forward */}
        <button data-bar-action onClick={() => onSkip(10000)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
          <SkipForward size={18}/>
        </button>

        {/* Time */}
        <div className="flex-1 text-center text-[12px] tabular-nums text-slate-400 select-none" dir="ltr">
          <span className="text-slate-200">{fmt(currentTime)}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span>{fmt(duration)}</span>
        </div>

        {/* Speed */}
        <button
          data-bar-action
          onClick={() => {
            const idx = RATES.indexOf(playbackRate)
            onSetRate(RATES[(idx + 1) % RATES.length])
          }}
          className="text-[11px] font-mono px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          {playbackRate}x
        </button>

        {/* Settings */}
        <button
          data-bar-action
          onClick={() => onSettingsOpen(!showSettings)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
        >
          <Settings size={15}/>
        </button>

        {/* Expand indicator */}
        <button data-bar-action onClick={() => setExpanded(v => !v)} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
          {expanded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
        </button>
      </div>

      {/* Expanded controls — animate height */}
      <div
        style={{
          maxHeight: expanded ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="px-4 pb-3 space-y-2 border-t border-white/5" dir="ltr">
          {/* Full progress bar */}
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            markerA={markerA}
            markerB={markerB}
            isLooping={isLooping}
            bookmarks={bookmarks}
            onSeek={onSeek}
          />

          {/* A-B loop controls */}
          {localFeatures.abLoop && (
            <ABLoopControls
              markerA={markerA} markerB={markerB} isLooping={isLooping}
              onSetA={() => onSetMarkerA(currentTime)}
              onSetB={() => onSetMarkerB(currentTime)}
              onClear={onClearMarkers}
              onToggleLoop={onToggleLoop}
            />
          )}

          {/* Extra controls row */}
          <div className="flex items-center gap-2 flex-wrap" dir="ltr">
            {localFeatures.karaoke && (
              <button
                onClick={onKaraokeToggle}
                className={`px-2 py-1 text-xs rounded font-bold transition-colors ${karaokeEnabled ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 text-slate-500'}`}
              >
                K
              </button>
            )}
            {localFeatures.bookmarks && (
              <button
                onClick={() => setShowBookmarks(v => !v)}
                className="relative px-2 py-1 text-xs rounded text-slate-400 hover:text-white bg-white/5 transition-colors"
              >
                🔖
                {bookmarks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-sky-500 rounded-full text-[9px] text-white flex items-center justify-center">{bookmarks.length}</span>
                )}
              </button>
            )}
            <button
              onClick={() => setExpanded(false)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ▼ طيّ
            </button>
          </div>
        </div>
      </div>

      {/* Bookmark drawer above bar */}
      {showBookmarks && (
        <div className="absolute bottom-full left-0 right-0 mb-1 px-4">
          <BookmarkDrawer
            open={true}
            bookmarks={bookmarks}
            onAdd={() => onAddBookmark(currentTime)}
            onRemove={onRemoveBookmark}
            onJump={onJumpToBookmark}
            onClose={() => setShowBookmarks(false)}
            currentTime={currentTime}
          />
        </div>
      )}

      {/* Long-press speed selector */}
      {showSpeedSelector && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-1 rounded-xl p-2"
          style={{ background: 'rgba(6,14,28,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => setShowSpeedSelector(false)}
          dir="ltr"
        >
          {RATES.map(r => (
            <button
              key={r}
              onClick={() => { onSetRate(r); setShowSpeedSelector(false) }}
              className={`px-3 py-1 text-xs rounded-lg font-mono transition-colors ${r === playbackRate ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {r}x
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
