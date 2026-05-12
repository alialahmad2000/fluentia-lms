import { useState, useRef, useCallback, useEffect } from 'react'
import { Bookmark, AlertCircle, RefreshCw } from 'lucide-react'

import { useAudioEngine } from './hooks/useAudioEngine'
import { useKaraoke } from './hooks/useKaraoke'
import { useABLoop } from './hooks/useABLoop'
import { useBookmarks } from './hooks/useBookmarks'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMobileGestures } from './hooks/useMobileGestures'
import { useDictation } from './hooks/useDictation'
import { useAutoResume } from './hooks/useAutoResume'

import { ProgressBar } from './parts/ProgressBar'
import { PlayerControls } from './parts/PlayerControls'
import { KaraokeText } from './parts/KaraokeText'
import { SpeakerBadge } from './parts/SpeakerBadge'
import { ABLoopControls } from './parts/ABLoopControls'
import { BookmarkDrawer } from './parts/BookmarkDrawer'
import { DictationPanel } from './parts/DictationPanel'
import { SettingsMenu, SettingsButton } from './parts/SettingsMenu'
import { BottomBarControls } from './parts/BottomBarControls'

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
  onWordTap,          // tap = seek (bottom-bar mode primary)
  onWordLongPress,    // long-press = vocab popup (bottom-bar mode primary)
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
  const [showTranscript, setShowTranscript] = useState(showTranscriptByDefault)
  const [mutedBeforeToggle, setMutedBeforeToggle] = useState(null)
  const [localFeatures, setLocalFeatures] = useState(features)

  const engine = useAudioEngine({
    audioUrl,
    segments,
    onSegmentComplete,
    onPlaybackComplete,
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

        {/* Karaoke text — premium typography for reading */}
        <div className="max-w-2xl mx-auto px-1" style={{ paddingBottom: 120 }}>
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
                onWordLongPress={localFeatures.wordClickToLookup ? onWordLongPress : null}
                setWordRef={setWordRef}
                large
              />
            ))
          ) : (
            <p className="leading-[2] text-[19px] md:text-[20px] text-slate-100 mb-8" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {segments?.[0]?.text_content || ''}
            </p>
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

        {/* Fixed bottom bar */}
        <BottomBarControls
          isPlaying={engine.isPlaying}
          isLoading={engine.isLoading}
          currentTime={engine.currentTime}
          duration={engine.duration}
          playbackRate={engine.playbackRate}
          RATES={engine.RATES}
          markerA={abLoop.markerA}
          markerB={abLoop.markerB}
          isLooping={abLoop.isLooping}
          bookmarks={localFeatures.bookmarks ? bookmarks : []}
          localFeatures={localFeatures}
          onToggle={engine.toggle}
          onSkip={engine.skip}
          onSetRate={engine.setRate}
          onSeek={engine.seek}
          onSetMarkerA={abLoop.setMarkerA}
          onSetMarkerB={abLoop.setMarkerB}
          onClearMarkers={abLoop.clearMarkers}
          onToggleLoop={abLoop.toggleLoop}
          onAddBookmark={addBookmark}
          onRemoveBookmark={removeBookmark}
          onJumpToBookmark={jumpToBookmark}
          onKaraokeToggle={karaokeToggle}
          karaokeEnabled={karaokeEnabled}
          showSettings={showSettings}
          onSettingsOpen={setShowSettings}
          onToggleFeature={toggleFeature}
        />
      </div>
    )
  }

  // ── Default variant ───────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-visible ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      tabIndex={0}
      onFocus={() => { document.body.dataset.audioPlayerActive = 'true' }}
      onBlur={() => { document.body.dataset.audioPlayerActive = 'false' }}
    >
      {/* Settings menu */}
      <SettingsMenu
        open={showSettings}
        onClose={() => setShowSettings(false)}
        features={localFeatures}
        onToggleFeature={toggleFeature}
      />

      {/* Topbar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <SettingsButton onClick={() => setShowSettings(v => !v)}/>
        <div className="flex items-center gap-2">
          {localFeatures.speakerLabels && speakerLabel && <SpeakerBadge label={speakerLabel}/>}
          {localFeatures.bookmarks && (
            <button
              onClick={() => setShowBookmarks(v => !v)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative"
            >
              <Bookmark size={16}/>
              {bookmarks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-500 text-[9px] text-white flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Auto-resume prompt */}
      {autoResume.resumePrompt && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-3 font-['Tajawal']"
          style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
        >
          <span className="text-sky-300">هل تريد الاستمرار من حيث توقفت؟</span>
          <div className="flex gap-2">
            <button onClick={autoResume.acceptResume} className="text-sky-400 hover:text-sky-300">نعم</button>
            <button onClick={autoResume.dismissResume} className="text-slate-500 hover:text-slate-400">لا</button>
          </div>
        </div>
      )}

      {/* Error state */}
      {engine.error && (
        <div className="mx-4 mb-2 px-3 py-3 rounded-xl flex items-center justify-between gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0"/>
            <span className="text-sm text-red-300 font-['Tajawal']">تعذّر تحميل الصوت. تحقّق من اتصالك.</span>
          </div>
          <button onClick={engine.retry} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-['Tajawal']">
            <RefreshCw size={12}/> إعادة
          </button>
        </div>
      )}

      {/* Transcript / Karaoke area */}
      {showTranscript && !engine.error && (
        <div className="px-4 pt-2 pb-1 max-h-60 overflow-y-auto">
          {isMulti ? (
            segments.map((seg, i) => (
              <KaraokeText
                key={i}
                segment={seg}
                segmentIndex={i}
                currentWordIndex={i === engine.currentSegmentIndex ? currentWordIndex : -1}
                karaokeEnabled={localFeatures.karaoke && karaokeEnabled}
                onWordTap={localFeatures.wordClickToLookup && onWordTap
                  ? (word, segIdx, wordIdx, startMs) => {
                      engine.seek(startMs)
                      if (!engine.isPlaying) engine.play()
                      onWordTap(word, segIdx, wordIdx, startMs)
                    }
                  : null}
                onWordLongPress={localFeatures.wordClickToLookup ? (onWordLongPress ?? onWordClick) : null}
                setWordRef={setWordRef}
              />
            ))
          ) : (
            <p className="leading-loose text-[17px] text-slate-100" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {text}
            </p>
          )}
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

      {/* Dictation start button */}
      {localFeatures.dictation && !dictation.active && (
        <div className="px-4 pb-2">
          <button
            onClick={dictation.start}
            className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors font-['Tajawal']"
          >
            ابدأ الإملاء
          </button>
        </div>
      )}

      {/* A-B loop controls */}
      {localFeatures.abLoop && (
        <ABLoopControls
          markerA={abLoop.markerA}
          markerB={abLoop.markerB}
          isLooping={abLoop.isLooping}
          onSetA={() => abLoop.setMarkerA(engine.currentTime)}
          onSetB={() => abLoop.setMarkerB(engine.currentTime)}
          onClear={abLoop.clearMarkers}
          onToggleLoop={abLoop.toggleLoop}
        />
      )}

      {/* Progress bar */}
      {!engine.error && (
        <ProgressBar
          currentTime={engine.currentTime}
          duration={engine.duration}
          markerA={abLoop.markerA}
          markerB={abLoop.markerB}
          isLooping={abLoop.isLooping}
          bookmarks={localFeatures.bookmarks ? bookmarks : []}
          onSeek={engine.seek}
        />
      )}

      {/* Controls */}
      {!engine.error && (
        <PlayerControls
          isPlaying={engine.isPlaying}
          isLoading={engine.isLoading}
          playbackRate={engine.playbackRate}
          RATES={engine.RATES}
          onToggle={engine.toggle}
          onSkip={engine.skip}
          onSetRate={engine.setRate}
          onPrevSegment={() => engine.jumpToSegment(Math.max(0, engine.currentSegmentIndex - 1))}
          onNextSegment={() => engine.jumpToSegment(Math.min((segments?.length || 1) - 1, engine.currentSegmentIndex + 1))}
          hasSegments={isMulti && segments.length > 1}
          karaokeEnabled={karaokeEnabled}
          onKaraokeToggle={karaokeToggle}
          showTranscript={showTranscript}
          onTranscriptToggle={() => setShowTranscript(v => !v)}
          volume={engine.volume}
          onVolumeToggle={toggleVolumeHandler}
          features={localFeatures}
        />
      )}

      {/* Bookmark drawer */}
      <div className="relative">
        <BookmarkDrawer
          open={showBookmarks}
          bookmarks={bookmarks}
          onAdd={addBookmark}
          onRemove={removeBookmark}
          onJump={jumpToBookmark}
          onClose={() => setShowBookmarks(false)}
          currentTime={engine.currentTime}
        />
      </div>
    </div>
  )
}
