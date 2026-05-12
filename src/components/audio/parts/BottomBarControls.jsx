/**
 * BottomBarControls — slim premium sticky bar (Spotify-mini-player style)
 * Single row, 60px content height, no expand/collapse.
 * Advanced controls (A-B, dictation, bookmarks) live in SettingsPopover.
 */
import { useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Settings, Loader2 } from 'lucide-react'
import { SpeakerBadge } from './SpeakerBadge'
import { ProgressBar } from './ProgressBar'
import { SettingsPopover } from './SettingsPopover'

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export function BottomBarControls({
  isPlaying, isLoading, currentTime, duration,
  playbackRate, RATES,
  speakerLabel, isMultiSpeaker,
  localFeatures, playerLocked,
  markerA, markerB, isLooping,
  bookmarks,
  onToggle, onSkip, onSetRate, onSeek,
  onSetMarkerA, onSetMarkerB, onClearMarkers, onToggleLoop,
  onAddBookmark, onRemoveBookmark, onJumpToBookmark,
  onKaraokeToggle, karaokeEnabled,
  onToggleFeature,
  dictation,
}) {
  const [showSettings, setShowSettings] = useState(false)
  const locked = playerLocked
  const skipDisabled = locked || (localFeatures.onePlayMode && !playerLocked)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[52] select-none"
      style={{
        background: 'linear-gradient(to bottom, rgba(6,12,26,0.88), rgba(4,8,20,0.96))',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 -12px 40px -8px rgba(0,0,0,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Hairline progress strip */}
      <div dir="ltr" className="relative h-[3px] w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          markerA={markerA}
          markerB={markerB}
          isLooping={isLooping}
          bookmarks={[]}
          onSeek={skipDisabled ? undefined : onSeek}
          hairline
        />
      </div>

      {/* Main row — single centered cluster, both bar edges left empty */}
      <div className="h-[60px] flex items-center justify-center px-3" dir="ltr">
        <div className="flex items-center gap-2 md:gap-3">

          {/* Speaker pill (listening multi-speaker only) */}
          {isMultiSpeaker && speakerLabel && (
            <SpeakerBadge label={speakerLabel} />
          )}

          {/* Skip back */}
          <button
            onClick={() => onSkip?.(-10000)}
            disabled={skipDisabled || !onSkip}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 shrink-0"
            aria-label="رجوع 10 ثواني"
          >
            <SkipBack size={17}/>
          </button>

          {/* Hero play */}
          <button
            onClick={locked ? undefined : onToggle}
            disabled={isLoading}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
              locked
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 text-white shadow-md shadow-sky-500/25 hover:scale-[1.06] active:scale-[0.95]'
            } disabled:opacity-50`}
            aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {isLoading
              ? <Loader2 size={20} className="animate-spin"/>
              : isPlaying
                ? <Pause size={20}/>
                : <Play size={20} style={{ marginLeft: 1 }}/>
            }
          </button>

          {/* Skip forward */}
          <button
            onClick={() => onSkip?.(10000)}
            disabled={skipDisabled || !onSkip}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 shrink-0"
            aria-label="تقدم 10 ثواني"
          >
            <SkipForward size={17}/>
          </button>

          {/* Time display (sm+ only — hidden on mobile, shown on hairline strip) */}
          <span
            dir="ltr"
            className="text-xs tabular-nums text-slate-300 font-medium whitespace-nowrap px-1 hidden sm:inline"
          >
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          {/* Speed selector — tap to cycle */}
          {localFeatures.speedControl && !localFeatures.onePlayMode && RATES && (
            <button
              onClick={() => {
                const idx = RATES.indexOf(playbackRate)
                onSetRate?.(RATES[(idx + 1) % RATES.length])
              }}
              className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-colors shrink-0"
              aria-label="سرعة التشغيل"
            >
              {playbackRate}x
            </button>
          )}

          {/* Settings gear */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSettings(v => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إعدادات"
            >
              <Settings size={16}/>
            </button>

            {showSettings && (
              <SettingsPopover
                onClose={() => setShowSettings(false)}
                localFeatures={localFeatures}
                onToggleFeature={onToggleFeature}
                karaokeEnabled={karaokeEnabled}
                onKaraokeToggle={onKaraokeToggle}
                markerA={markerA}
                markerB={markerB}
                isLooping={isLooping}
                onSetMarkerA={onSetMarkerA}
                onSetMarkerB={onSetMarkerB}
                onClearMarkers={onClearMarkers}
                onToggleLoop={onToggleLoop}
                bookmarks={bookmarks}
                onAddBookmark={onAddBookmark}
                onRemoveBookmark={onRemoveBookmark}
                onJumpToBookmark={onJumpToBookmark}
                currentTime={currentTime}
                dictation={dictation}
                fmt={fmt}
              />
            )}
          </div>

        </div>
      </div>

      {/* Mobile time — tiny centered display on hairline strip, sm:hidden */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 sm:hidden pointer-events-none" style={{ top: 4 }}>
        <span dir="ltr" className="text-[10px] tabular-nums text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>
    </div>
  )
}
