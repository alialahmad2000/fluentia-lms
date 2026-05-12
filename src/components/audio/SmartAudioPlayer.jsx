import { useState, useRef, useCallback, useEffect } from 'react'
import { Bookmark, AlertCircle, RefreshCw, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2, Settings, Eye, EyeOff } from 'lucide-react'

import { useAudioEngine } from './hooks/useAudioEngine'
import { useKaraoke } from './hooks/useKaraoke'
import { useABLoop } from './hooks/useABLoop'
import { useBookmarks } from './hooks/useBookmarks'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMobileGestures } from './hooks/useMobileGestures'
import { useDictation } from './hooks/useDictation'
import { useAutoResume } from './hooks/useAutoResume'
import { useAudioNavigationPause } from './hooks/useAudioNavigationPause'

import { ProgressBar } from './parts/ProgressBar'
import { PlayerControls } from './parts/PlayerControls'
import { KaraokeText } from './parts/KaraokeText'
import { SpeakerBadge } from './parts/SpeakerBadge'
import { ABLoopControls } from './parts/ABLoopControls'
import { BookmarkDrawer } from './parts/BookmarkDrawer'
import { DictationPanel } from './parts/DictationPanel'
import { SettingsMenu, SettingsButton } from './parts/SettingsMenu'
import { BottomBarControls } from './parts/BottomBarControls'
import { WordTooltip } from './parts/WordTooltip'
import { ListeningFocusMode } from './parts/ListeningFocusMode'

const DEFAULT_FEATURES = {
  karaoke: true,
  speedControl: true,
  skipButtons: true,
  sentenceNav: true,
  paragraphNav: true,
  sentenceMode: false,
  abLoop: true,
  bookmarks: true,
  speakerLabels: true,
  hideTranscript: true,
  keyboardShortcuts: true,
  mobileGestures: true,
  dictation: false,
  autoResume: true,
  playbackHistory: true,
  wordClickToLookup: true,
  onePlayMode: false,
}

export default function SmartAudioPlayer({
  audioUrl,
  text,
  wordTimestamps,
  segments,
  contentId,
  contentType = 'reading',
  studentId,
  features: featuresProp = {},
  onWordClick,        // legacy: single-click vocab popup (used in default/compact)
  onWordTap,          // tap = seek (regular words)
  onWordLongPress,    // long-press = action menu
  onVocabWordTap,     // tap on vocab-highlighted word = instant tooltip
  onWordHover,        // desktop hover tooltip
  onWordHoverEnd,     // desktop hover tooltip end
  highlightLookup,    // Map<`${segIdx}:${wordIdx}`, highlight> for student highlights
  vocabSet,           // Set<string> lowercase vocab words for marking
  onSegmentComplete,
  onPlaybackComplete,
  onDictationSubmit,
  onPlayCountChange,
  variant = 'default',
  showTranscriptByDefault = true,
  className = '',
}) {
  // ── All hooks declared before any conditional returns ──────────────────────
  const features = { ...DEFAULT_FEATURES, ...featuresProp }

  const containerRef = useRef(null)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTranscript, setShowTranscript] = useState(() => {
    if (contentId && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`fluentia:listening:transcript-visible:${contentId}`)
      if (stored !== null) return stored === 'true'
    }
    return showTranscriptByDefault
  })
  const [mutedBeforeToggle, setMutedBeforeToggle] = useState(null)
  const [localFeatures, setLocalFeatures] = useState(features)
  const [playerLocked, setPlayerLocked] = useState(false)
  const [hoveredVocab, setHoveredVocab] = useState(null) // { word, ipa, definition_ar, anchorEl }
  const [hasPlayedComplete, setHasPlayedComplete] = useState(false)
  const [autoRevealedOnce, setAutoRevealedOnce] = useState(false)

  const engine = useAudioEngine({
    audioUrl,
    segments,
    onSegmentComplete,
    onPlaybackComplete: () => {
      setHasPlayedComplete(true)
      if (localFeatures.onePlayMode) setPlayerLocked(true)
      onPlaybackComplete?.()
    },
  })

  const { enabled: karaokeEnabled, toggle: karaokeToggle, currentWordIndex, setWordRef } = useKaraoke({
    currentTime: engine.currentTime,
    currentSegmentIndex: engine.currentSegmentIndex,
    segments,
    audioUrl,
    wordTimestamps,
    isBottomBarMode: variant === 'bottom-bar',
  })

  const abLoop = useABLoop({ currentTime: engine.currentTime, seek: engine.seek })

  const { bookmarks, addBookmark, removeBookmark, jumpToBookmark } = useBookmarks({
    contentId,
    seek: engine.seek,
  })

  const dictation = useDictation({
    enabled: localFeatures.dictation,
    segments,
    currentSegmentIndex: engine.currentSegmentIndex,
    seek: engine.seek,
    pause: engine.pause,
    play: engine.play,
    onDictationSubmit,
  })

  const autoResume = useAutoResume({
    enabled: localFeatures.autoResume,
    studentId,
    contentId,
    currentTime: engine.currentTime,
    isPlaying: engine.isPlaying,
    seek: engine.seek,
    duration: engine.duration,
  })

  useKeyboardShortcuts({
    enabled: localFeatures.keyboardShortcuts,
    containerRef,
    toggle: engine.toggle,
    skip: engine.skip,
    setRate: engine.setRate,
    playbackRate: engine.playbackRate,
    seek: engine.seek,
    duration: engine.duration,
    karaokeToggle,
    setMarkerA: abLoop.setMarkerA,
    setMarkerB: abLoop.setMarkerB,
    toggleLoop: abLoop.toggleLoop,
    currentTime: engine.currentTime,
  })

  useMobileGestures({
    enabled: localFeatures.mobileGestures,
    containerRef,
    toggle: engine.toggle,
    skip: engine.skip,
  })

  // ── Derived ────────────────────────────────────────────────────────────────
  const isMulti = Array.isArray(segments) && segments.length > 0
  const currentSegment = isMulti ? segments[engine.currentSegmentIndex] : null
  const speakerLabel = currentSegment?.speaker_label || null

  const toggleVolumeHandler = useCallback(() => {
    if (engine.volume > 0) {
      setMutedBeforeToggle(engine.volume)
      engine.setVolume(0)
    } else {
      engine.setVolume(mutedBeforeToggle || 1)
    }
  }, [engine, mutedBeforeToggle])

  const toggleFeature = useCallback((key) => {
    setLocalFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Push floating FABs (PageHelp, etc.) up when bottom-bar is mounted
  useEffect(() => {
    if (variant !== 'bottom-bar') return
    const BAR_H = window.innerWidth < 768 ? 72 : 96
    document.documentElement.style.setProperty('--fab-bottom', `${BAR_H + 16}px`)
    return () => document.documentElement.style.removeProperty('--fab-bottom')
  }, [variant])

  // Auto-pause on navigation (route change or unmount)
  useAudioNavigationPause({ isPlaying: engine.isPlaying, pause: engine.pause })

  // Transcript can only be revealed in one-play mode after playback completes
  const canRevealText = !localFeatures.onePlayMode || hasPlayedComplete

  // Persist transcript visibility per content item
  function toggleTranscript() {
    const next = !showTranscript
    setShowTranscript(next)
    if (contentId) localStorage.setItem(`fluentia:listening:transcript-visible:${contentId}`, String(next))
  }

  // Auto-reveal transcript 1.5s after completion (ear-training reward pattern)
  useEffect(() => {
    if (!hasPlayedComplete || showTranscript || autoRevealedOnce) return
    const t = setTimeout(() => {
      setShowTranscript(true)
      if (contentId) localStorage.setItem(`fluentia:listening:transcript-visible:${contentId}`, 'true')
      setAutoRevealedOnce(true)
    }, 1500)
    return () => clearTimeout(t)
  }, [hasPlayedComplete, showTranscript, autoRevealedOnce, contentId])

  // ── Minimal variant ───────────────────────────────────────────────────────
  if (variant === 'minimal') {
    return (
      <button
        onClick={engine.toggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors ${className}`}
      >
        {engine.isLoading
          ? <span className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"/>
          : engine.isPlaying
            ? <span>⏸</span>
            : <span>▶</span>
        }
      </button>
    )
  }

  // ── Compact variant ───────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        ref={containerRef}
        className={`rounded-xl overflow-hidden ${className}`}
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {engine.error && (
          <div className="px-3 py-2 text-xs text-red-400 font-['Tajawal']">تعذّر تحميل الصوت</div>
        )}
        {!engine.error && (
          <>
            <ProgressBar
              currentTime={engine.currentTime}
              duration={engine.duration}
              markerA={null} markerB={null} isLooping={false}
              bookmarks={[]}
              onSeek={engine.seek}
            />
            <PlayerControls
              isPlaying={engine.isPlaying}
              isLoading={engine.isLoading}
              playbackRate={engine.playbackRate}
              RATES={engine.RATES}
              onToggle={engine.toggle}
              onSkip={engine.skip}
              onSetRate={engine.setRate}
              hasSegments={false}
              karaokeEnabled={karaokeEnabled}
              onKaraokeToggle={karaokeToggle}
              showTranscript={showTranscript}
              onTranscriptToggle={() => setShowTranscript(v => !v)}
              volume={engine.volume}
              onVolumeToggle={toggleVolumeHandler}
              features={{ ...localFeatures, paragraphNav: false }}
            />
          </>
        )}
      </div>
    )
  }

  // ── Bottom-bar variant ────────────────────────────────────────────────────
  if (variant === 'bottom-bar') {
    return (
      <div ref={containerRef} className={`${className}`}
        tabIndex={0}
        onFocus={() => { document.body.dataset.audioPlayerActive = 'true' }}
        onBlur={() => { document.body.dataset.audioPlayerActive = 'false' }}
      >
        {/* Error state */}
        {engine.error && (
          <div className="mx-2 mb-3 px-3 py-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="text-sm text-red-300 font-['Tajawal']">تعذّر تحميل الصوت. تحقّق من اتصالك.</span>
            <button onClick={engine.retry} className="text-xs text-sky-400 font-['Tajawal']">إعادة</button>
          </div>
        )}

        {/* Auto-resume prompt */}
        {autoResume.resumePrompt && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-3 font-['Tajawal']"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            <span className="text-sky-300">هل تريد الاستمرار من حيث توقفت؟</span>
            <div className="flex gap-2">
              <button onClick={autoResume.acceptResume} className="text-sky-400">نعم</button>
              <button onClick={autoResume.dismissResume} className="text-slate-500">لا</button>
            </div>
          </div>
        )}

        {/* Karaoke text — premium typography for reading; or Listening Focus Mode */}
        <div className="max-w-2xl mx-auto px-1" style={{ paddingBottom: 120 }}>
          {/* Hide/show transcript toggle (visible when text is shown) */}
          {showTranscript && (
            <div className="flex justify-end mb-3">
              <button
                onClick={toggleTranscript}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-white/5 border-white/8 text-slate-300 hover:bg-white/8 font-['Tajawal']"
              >
                <EyeOff size={13}/>
                إخفاء النص
              </button>
            </div>
          )}

          {showTranscript ? (
            isMulti ? (
              segments.map((seg, i) => (
                <KaraokeText
                  key={i}
                  segment={seg}
                  segmentIndex={i}
                  currentWordIndex={i === engine.currentSegmentIndex ? currentWordIndex : -1}
                  karaokeEnabled={localFeatures.karaoke && karaokeEnabled}
                  onWordTap={localFeatures.wordClickToLookup
                    ? (word, segIdx, wordIdx, startMs) => {
                        engine.seek(startMs)
                        if (!engine.isPlaying) engine.play()
                        onWordTap?.(word, segIdx, wordIdx, startMs)
                      }
                    : null}
                  onWordLongPress={localFeatures.wordClickToLookup ? onWordLongPress : null}
                  onVocabWordTap={localFeatures.wordClickToLookup ? onVocabWordTap : null}
                  onWordHover={onWordHover
                    ? (w, sIdx, wIdx, el) => {
                        onWordHover(w, sIdx, wIdx, el, (vocab) => setHoveredVocab(vocab ? { ...vocab, anchorEl: el } : null))
                      }
                    : null}
                  onWordHoverEnd={() => setHoveredVocab(null)}
                  setWordRef={setWordRef}
                  large
                  highlightLookup={highlightLookup}
                  vocabSet={vocabSet}
                />
              ))
            ) : (
              <p className="leading-[2] text-[19px] md:text-[20px] text-slate-100 mb-8" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {segments?.[0]?.text_content || ''}
              </p>
            )
          ) : (
            <ListeningFocusMode
              currentSpeakerLabel={isMulti ? currentSegment?.speaker_label || null : null}
              currentSegmentIndex={engine.currentSegmentIndex}
              totalSegments={isMulti ? segments.length : 1}
              isPlaying={engine.isPlaying}
              isPaused={!engine.isPlaying && engine.currentTime > 0}
              hasCompleted={hasPlayedComplete}
              canReveal={canRevealText}
              onRevealText={toggleTranscript}
            />
          )}

          {/* Hover tooltip */}
          {hoveredVocab && (
            <WordTooltip
              word={hoveredVocab.word}
              definition_ar={hoveredVocab.definition_ar}
              ipa={hoveredVocab.pronunciation_ipa || hoveredVocab.ipa}
              anchorEl={hoveredVocab.anchorEl}
            />
          )}
        </div>

        {/* Dictation */}
        {localFeatures.dictation && (
          <DictationPanel
            active={dictation.active}
            sentenceIdx={dictation.sentenceIdx}
            totalSentences={dictation.totalSentences}
            currentSentence={dictation.currentSentence}
            typed={dictation.typed}
            onTyped={dictation.setTyped}
            lastDiff={dictation.lastDiff}
            onSubmit={dictation.submit}
            onNext={dictation.nextSentence}
            onStop={dictation.stop}
          />
        )}

        {/* Slim sticky bar */}
        <BottomBarControls
          isPlaying={engine.isPlaying}
          isLoading={engine.isLoading}
          currentTime={engine.currentTime}
          duration={engine.duration}
          playbackRate={engine.playbackRate}
          RATES={engine.RATES}
          speakerLabel={speakerLabel}
          isMultiSpeaker={isMulti}
          markerA={abLoop.markerA}
          markerB={abLoop.markerB}
          isLooping={abLoop.isLooping}
          bookmarks={localFeatures.bookmarks ? bookmarks : []}
          localFeatures={localFeatures}
          playerLocked={playerLocked}
          onToggle={engine.toggle}
          onSkip={localFeatures.onePlayMode ? undefined : engine.skip}
          onSetRate={localFeatures.onePlayMode ? undefined : engine.setRate}
          onSeek={localFeatures.onePlayMode ? undefined : engine.seek}
          onSetMarkerA={() => abLoop.setMarkerA(engine.currentTime)}
          onSetMarkerB={() => abLoop.setMarkerB(engine.currentTime)}
          onClearMarkers={abLoop.clearMarkers}
          onToggleLoop={abLoop.toggleLoop}
          onAddBookmark={addBookmark}
          onRemoveBookmark={removeBookmark}
          onJumpToBookmark={jumpToBookmark}
          onKaraokeToggle={karaokeToggle}
          karaokeEnabled={karaokeEnabled}
          onToggleFeature={toggleFeature}
          dictation={dictation}
        />
      </div>
    )
  }

  // ── Default variant — Premium Inline ─────────────────────────────────────
  const fmt = (ms) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  const btnBase = 'rounded-full flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 active:scale-95'
  const locked = playerLocked && localFeatures.onePlayMode
  const examActive = localFeatures.onePlayMode && !playerLocked
  const skipDisabled = locked || examActive

  return (
    <div
      ref={containerRef}
      className={`${className}`}
      tabIndex={0}
      onFocus={() => { document.body.dataset.audioPlayerActive = 'true' }}
      onBlur={() => { document.body.dataset.audioPlayerActive = 'false' }}
    >
      {/* ── Settings menu ──────────────────────────────────────────────────── */}
      <SettingsMenu
        open={showSettings}
        onClose={() => setShowSettings(false)}
        features={localFeatures}
        onToggleFeature={toggleFeature}
      />

      {/* ── Premium player card ─────────────────────────────────────────────── */}
      <div
        className="rounded-3xl border border-white/[0.08] p-5 md:p-6 mb-8 space-y-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px -12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Auto-resume */}
        {autoResume.resumePrompt && (
          <div className="px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-3 font-['Tajawal']"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            <span className="text-sky-300">هل تريد الاستمرار من حيث توقفت؟</span>
            <div className="flex gap-2">
              <button onClick={autoResume.acceptResume} className="text-sky-400">نعم</button>
              <button onClick={autoResume.dismissResume} className="text-slate-500">لا</button>
            </div>
          </div>
        )}

        {/* Error */}
        {engine.error && (
          <div className="px-3 py-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
              <span className="text-sm text-red-300 font-['Tajawal']">تعذّر تحميل الصوت. تحقّق من اتصالك.</span>
            </div>
            <button onClick={engine.retry} className="flex items-center gap-1 text-xs text-sky-400 font-['Tajawal']">
              <RefreshCw size={12}/> إعادة
            </button>
          </div>
        )}

        {/* ── TOP ROW: speaker + hide-transcript + settings ─────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {localFeatures.speakerLabels && speakerLabel && <SpeakerBadge label={speakerLabel}/>}
          </div>
          <div className="flex items-center gap-1.5">
            {localFeatures.hideTranscript && (
              <button
                onClick={() => setShowTranscript(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border font-['Tajawal'] ${
                  !showTranscript
                    ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                    : 'bg-white/5 border-white/8 text-slate-300 hover:bg-white/8'
                }`}
              >
                {showTranscript ? <Eye size={13}/> : <EyeOff size={13}/>}
                {showTranscript ? 'إخفاء النص' : 'إظهار النص'}
              </button>
            )}
            <button
              onClick={() => setShowSettings(v => !v)}
              className="p-2 rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:bg-white/8 transition-colors"
              aria-label="إعدادات"
            >
              <Settings size={15}/>
            </button>
          </div>
        </div>

        {/* ── PROGRESS SECTION ──────────────────────────────────────────────── */}
        {!engine.error && (
          <div className="space-y-3" dir="ltr">
            {/* Bar + time */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar
                  currentTime={engine.currentTime}
                  duration={engine.duration}
                  markerA={abLoop.markerA}
                  markerB={abLoop.markerB}
                  isLooping={abLoop.isLooping}
                  bookmarks={localFeatures.bookmarks ? bookmarks : []}
                  onSeek={skipDisabled ? undefined : engine.seek}
                />
              </div>
              <span className="text-sm tabular-nums text-slate-300 font-medium whitespace-nowrap min-w-[88px] text-right font-['Inter']">
                {fmt(engine.currentTime)} / {fmt(engine.duration)}
              </span>
            </div>

            {/* A-B + bookmarks row */}
            {!examActive && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {localFeatures.abLoop && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => abLoop.setMarkerA(engine.currentTime)}
                      className={`px-2 py-1 text-[11px] rounded font-mono transition-colors ${abLoop.markerA !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
                    >A: {abLoop.markerA !== null ? fmt(abLoop.markerA) : '--:--'}</button>
                    <button
                      onClick={() => abLoop.setMarkerB(engine.currentTime)}
                      className={`px-2 py-1 text-[11px] rounded font-mono transition-colors ${abLoop.markerB !== null ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
                    >B: {abLoop.markerB !== null ? fmt(abLoop.markerB) : '--:--'}</button>
                    {abLoop.markerA !== null && abLoop.markerB !== null && (
                      <button
                        onClick={abLoop.toggleLoop}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${abLoop.isLooping ? 'bg-amber-400/30 text-amber-300 border border-amber-400/40' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}
                      >⟳</button>
                    )}
                    {(abLoop.markerA !== null || abLoop.markerB !== null) && (
                      <button onClick={abLoop.clearMarkers} className="text-[11px] text-slate-500 hover:text-slate-300 font-['Tajawal']">مسح</button>
                    )}
                  </div>
                )}
                {localFeatures.bookmarks && (
                  <div className="relative">
                    <button
                      onClick={() => setShowBookmarks(v => !v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/8 text-xs transition-colors relative"
                    >
                      <Bookmark size={13}/>
                      <span className="font-['Tajawal']">إشارة{bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}</span>
                    </button>
                    <div className="absolute bottom-full mb-2 left-0 right-0">
                      <BookmarkDrawer
                        open={showBookmarks}
                        bookmarks={bookmarks}
                        onAdd={() => addBookmark(engine.currentTime)}
                        onRemove={removeBookmark}
                        onJump={jumpToBookmark}
                        onClose={() => setShowBookmarks(false)}
                        currentTime={engine.currentTime}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MAIN CONTROLS ─────────────────────────────────────────────────── */}
        {!engine.error && (
          <div className="flex items-center justify-center gap-3 md:gap-4" dir="ltr">
            <button
              disabled={skipDisabled}
              onClick={() => engine.skip(-10000)}
              className={`${btnBase} w-11 h-11 md:w-12 md:h-12 ${skipDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              aria-label="رجوع 10 ثواني"
            >
              <SkipBack size={18}/>
            </button>

            {isMulti && segments.length > 1 && (
              <button
                disabled={skipDisabled}
                onClick={() => engine.jumpToSegment(Math.max(0, engine.currentSegmentIndex - 1))}
                className={`${btnBase} w-10 h-10 md:w-11 md:h-11 ${skipDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                aria-label="المقطع السابق"
              >
                <SkipBack size={15}/>
              </button>
            )}

            {/* Hero play button */}
            <button
              onClick={locked ? undefined : engine.toggle}
              disabled={engine.isLoading}
              className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-full flex items-center justify-center transition-all ${
                locked
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-br from-sky-400 to-sky-600 hover:from-sky-300 hover:to-sky-500 shadow-lg shadow-sky-500/30 hover:scale-[1.04] active:scale-[0.97]'
              } disabled:opacity-50`}
              aria-label={engine.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {engine.isLoading
                ? <Loader2 size={26} className="animate-spin text-white"/>
                : engine.isPlaying
                  ? <Pause size={26} className="text-white"/>
                  : <Play size={26} className="text-white ml-0.5"/>
              }
            </button>

            {isMulti && segments.length > 1 && (
              <button
                disabled={skipDisabled}
                onClick={() => engine.jumpToSegment(Math.min((segments?.length || 1) - 1, engine.currentSegmentIndex + 1))}
                className={`${btnBase} w-10 h-10 md:w-11 md:h-11 ${skipDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                aria-label="المقطع التالي"
              >
                <SkipForward size={15}/>
              </button>
            )}

            <button
              disabled={skipDisabled}
              onClick={() => engine.skip(10000)}
              className={`${btnBase} w-11 h-11 md:w-12 md:h-12 ${skipDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              aria-label="تقدم 10 ثواني"
            >
              <SkipForward size={18}/>
            </button>
          </div>
        )}

        {/* ── SECONDARY ROW ─────────────────────────────────────────────────── */}
        {!engine.error && (
          <div className="flex items-center justify-between gap-3 flex-wrap" dir="ltr">
            <div className="flex items-center gap-2">
              {/* Speed */}
              {localFeatures.speedControl && !examActive && (
                <button
                  onClick={() => {
                    const idx = engine.RATES.indexOf(engine.playbackRate)
                    engine.setRate(engine.RATES[(idx + 1) % engine.RATES.length])
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/10 transition-colors"
                >
                  {engine.playbackRate}x
                </button>
              )}
              {/* Volume */}
              <button
                onClick={toggleVolumeHandler}
                className={`${btnBase} w-9 h-9`}
                aria-label="صوت"
              >
                {engine.volume > 0 ? <Volume2 size={16}/> : <VolumeX size={16}/>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Dictation */}
              {localFeatures.dictation && !examActive && !dictation.active && (
                <button
                  onClick={dictation.start}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/8 transition-colors font-['Tajawal']"
                >
                  <span>📝</span> وضع الإملاء
                </button>
              )}
              {/* One-play locked state */}
              {locked && (
                <span className="text-xs text-amber-300/70 font-['Tajawal']">انتهى التشغيل (وضع الامتحان)</span>
              )}
            </div>
          </div>
        )}

        {/* Dictation panel */}
        {localFeatures.dictation && (
          <DictationPanel
            active={dictation.active}
            sentenceIdx={dictation.sentenceIdx}
            totalSentences={dictation.totalSentences}
            currentSentence={dictation.currentSentence}
            typed={dictation.typed}
            onTyped={dictation.setTyped}
            lastDiff={dictation.lastDiff}
            onSubmit={dictation.submit}
            onNext={dictation.nextSentence}
            onStop={dictation.stop}
          />
        )}
      </div>

      {/* ── KARAOKE / PASSAGE TEXT ──────────────────────────────────────────── */}
      {showTranscript && !engine.error && (
        <div>
          {isMulti ? (
            segments.map((seg, i) => (
              <KaraokeText
                key={i}
                segment={seg}
                segmentIndex={i}
                currentWordIndex={i === engine.currentSegmentIndex ? currentWordIndex : -1}
                karaokeEnabled={localFeatures.karaoke && karaokeEnabled}
                onWordTap={localFeatures.wordClickToLookup
                  ? (word, segIdx, wordIdx, startMs) => {
                      engine.seek(startMs)
                      if (!engine.isPlaying) engine.play()
                      onWordTap?.(word, segIdx, wordIdx, startMs)
                    }
                  : null}
                onWordLongPress={localFeatures.wordClickToLookup ? (onWordLongPress ?? onWordClick) : null}
                onVocabWordTap={localFeatures.wordClickToLookup ? onVocabWordTap : null}
                onWordHover={onWordHover
                  ? (w, sIdx, wIdx, el) => {
                      onWordHover(w, sIdx, wIdx, el, (vocab) => setHoveredVocab(vocab ? { ...vocab, anchorEl: el } : null))
                    }
                  : null}
                onWordHoverEnd={() => setHoveredVocab(null)}
                setWordRef={setWordRef}
                highlightLookup={highlightLookup}
                vocabSet={vocabSet}
                large
              />
            ))
          ) : (
            <p className="leading-loose text-[17px] text-slate-100" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {text}
            </p>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredVocab && (
        <WordTooltip
          word={hoveredVocab.word}
          definition_ar={hoveredVocab.definition_ar}
          ipa={hoveredVocab.pronunciation_ipa || hoveredVocab.ipa}
          anchorEl={hoveredVocab.anchorEl}
        />
      )}
    </div>
  )
}

export const PLAYER_VARIANTS = Object.freeze({
  DEFAULT: 'default',
  COMPACT: 'compact',
  MINIMAL: 'minimal',
  BOTTOM_BAR: 'bottom-bar',
})
