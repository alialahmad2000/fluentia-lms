// LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19 — Phase D redesign.
//
// Purpose-built for the listening section. NOT a reading-player variant.
//   - Reading: text is primary, audio is a karaoke layer
//   - Listening: audio IS the content; transcript is hidden by default
//
// Visual priorities (per Phase D spec):
//   - Hero play button (64px) — the player is the focal point of the section
//   - Generous padding, audio-tinted gold glow behind the play button
//   - Color-coded speaker ticks on the scrubber
//   - Speed POPOVER (not an always-visible row) to keep the surface calm
//   - Embedded "إظهار النص" toggle so the player owns the transcript reveal
//   - Sticky-at-bottom positioning is preserved (architecture not changed)
//
// Code-path correctness — kept from the prior version:
//   - Event listeners attach BEFORE `el.src = audioUrl`
//   - useEffect deps [audioUrl] so source changes re-fire load
//   - play() called synchronously from the click handler (iOS Safari rule)
//   - play() rejection is caught and surfaces a visible error
//   - playsInline + preload="metadata"
//   - Conditional render: parent should not mount us with a null audioUrl

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebarWidth } from '../../../hooks/useSidebarWidth'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]
const SPEAKER_COLORS = ['#FBBF24', '#A78BFA', '#34D399', '#F472B6', '#60A5FA']

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function colorForSpeaker(name) {
  if (!name) return SPEAKER_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return SPEAKER_COLORS[Math.abs(h) % SPEAKER_COLORS.length]
}

/**
 * Premium listening player — hero element, fixed-bottom, transcript-toggle aware.
 *
 * Props:
 *   audioUrl                  string  required
 *   speakerSegments           array   optional [{ speaker_name|speaker, start_ms, end_ms, text }]
 *   durationMs                number  optional DB authoritative duration
 *   transcriptShown           bool    optional whether transcript is currently visible
 *   onTranscriptToggle        fn      optional callback when the user toggles transcript visibility
 *   onTimeUpdate              fn      optional (ms) => void
 *   hideTranscriptToggle      bool    optional — set true to suppress the toggle (when the section already owns it)
 */
export function ListeningPlayer({
  audioUrl,
  speakerSegments = [],
  durationMs,
  transcriptShown,
  onTranscriptToggle,
  onTimeUpdate,
  hideTranscriptToggle = false,
}) {
  const audioRef = useRef(null)
  const sidebarWidth = useSidebarWidth()

  const [playing, setPlaying] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  const [actualDurationSec, setActualDurationSec] = useState(durationMs ? durationMs / 1000 : 0)
  const [speed, setSpeed] = useState(1)
  const [ab, setAb] = useState({ a: null, b: null })
  const [collapsed, setCollapsed] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [speedOpen, setSpeedOpen] = useState(false)

  const segMarks = useMemo(
    () => speakerSegments
      .filter(s => typeof s.start_ms === 'number')
      .map(s => ({
        ...s,
        name: s.speaker_name || s.speaker || '',
        color: colorForSpeaker(s.speaker_name || s.speaker || ''),
        startSec: s.start_ms / 1000,
        endSec: typeof s.end_ms === 'number' ? s.end_ms / 1000 : s.start_ms / 1000,
      })),
    [speakerSegments]
  )

  const currentSpeaker = useMemo(() => {
    for (let i = segMarks.length - 1; i >= 0; i--) {
      if (currentSec >= segMarks[i].startSec) return segMarks[i]
    }
    return null
  }, [segMarks, currentSec])

  const totalSec = actualDurationSec || (durationMs ? durationMs / 1000 : 0)

  // Audio source loading — re-runs when audioUrl changes
  useEffect(() => {
    const el = audioRef.current
    if (!el || !audioUrl) return

    setPlaying(false)
    setCurrentSec(0)
    setLoadError(null)
    setAb({ a: null, b: null })

    const onError = () => {
      const codes = { 1: 'إلغاء', 2: 'شبكة', 3: 'فك تشفير', 4: 'تنسيق غير مدعوم' }
      const msg = codes[el.error?.code] || 'خطأ غير معروف'
      console.error('[ListeningPlayer] audio error', el.error, audioUrl)
      setLoadError(`تعذّر تحميل الصوت (${msg})`)
      setPlaying(false)
    }
    const onLoadedMetadata = () => {
      setLoadError(null)
      if (isFinite(el.duration) && el.duration > 0) setActualDurationSec(el.duration)
    }

    el.addEventListener('error', onError)
    el.addEventListener('loadedmetadata', onLoadedMetadata)

    el.src = audioUrl
    el.load()

    return () => {
      el.removeEventListener('error', onError)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [audioUrl])

  // Playback listeners — stable across source changes
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTime = () => {
      const t = el.currentTime
      setCurrentSec(t)
      onTimeUpdate?.(t * 1000)
      if (ab.a != null && ab.b != null && t >= ab.b) el.currentTime = ab.a
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => { setPlaying(false); setCurrentSec(0) }

    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnd)

    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnd)
    }
  }, [ab, onTimeUpdate])

  // play() MUST be called synchronously from the click handler (iOS Safari rule)
  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch((err) => {
        console.error('[ListeningPlayer] play() rejected:', err)
        setLoadError('تعذّر تشغيل الصوت — حاول مرة أخرى')
      })
    } else {
      el.pause()
    }
  }, [])

  const seek = useCallback((sec) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(sec, el.duration || totalSec))
  }, [totalSec])

  const setRate = useCallback((s) => {
    const el = audioRef.current
    if (el) el.playbackRate = s
    setSpeed(s)
    setSpeedOpen(false)
  }, [])

  const retry = useCallback(() => {
    const el = audioRef.current
    if (!el || !audioUrl) return
    setLoadError(null)
    el.src = audioUrl
    el.load()
  }, [audioUrl])

  const progressPct = totalSec > 0 ? (currentSec / totalSec) * 100 : 0

  const fixedStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: sidebarWidth > 0 ? sidebarWidth : 0,
    zIndex: 40,
    padding: '0 16px 16px',
    paddingBottom: `max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))`,
  }

  return (
    <>
      {/* Hidden audio — src is set by the effect, never inline */}
      <audio ref={audioRef} preload="metadata" playsInline style={{ display: 'none' }} />

      <div dir="ltr" style={fixedStyle}>
        <motion.div
          layout
          style={{
            position: 'relative',
            borderRadius: '28px',
            border: '1px solid rgba(251, 191, 36, 0.10)',
            background:
              'linear-gradient(180deg, rgba(15, 23, 42, 0.80) 0%, rgba(2, 6, 23, 0.85) 60%, rgba(2, 6, 23, 0.90) 100%)',
            boxShadow:
              '0 24px 64px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
          }}
        >
          {/* Decorative amber glow behind the play button — gives audio-feel */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: '128px',
              background: 'rgba(251, 191, 36, 0.04)',
              filter: 'blur(48px)',
              pointerEvents: 'none',
            }}
          />

          {/* Gold hairline accent */}
          <div
            className="h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(251,191,36,0.4), transparent)' }}
          />

          {/* Current speaker pill (top-right in RTL flow) */}
          <AnimatePresence mode="wait">
            {currentSpeaker && currentSpeaker.name && (
              <motion.div
                key={currentSpeaker.name + currentSpeaker.startSec}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="px-6 pt-4 flex items-center"
                dir="rtl"
              >
                <span
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-['Tajawal']"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{ width: '6px', height: '6px', background: currentSpeaker.color }}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>يتحدث الآن:</span>
                  <span style={{ fontWeight: 600 }}>{currentSpeaker.name}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrubber */}
          <div className="px-6 pt-4">
            <div className="relative h-7 flex items-center group">
              {/* Track */}
              <div
                className="absolute inset-x-0 rounded-full overflow-hidden"
                style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(to right, #fbbf24, #fde68a)',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
              {/* Speaker tick marks — color-coded per Phase D */}
              {segMarks.map((s, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${totalSec > 0 ? (s.startSec / totalSec) * 100 : 0}%`,
                    width: '2px',
                    height: '16px',
                    background: s.color,
                    opacity: 0.65,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  title={s.name}
                />
              ))}
              {/* Invisible range input — preserves accessibility */}
              <input
                type="range"
                min={0}
                max={totalSec || 0}
                step={0.05}
                value={currentSec}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-x-0 w-full h-7 opacity-0 cursor-pointer"
                aria-label="موضع التشغيل"
                aria-valuetext={currentSpeaker?.name || fmt(currentSec)}
              />
              {/* Thumb */}
              <div
                className="absolute rounded-full pointer-events-none shadow"
                style={{
                  left: `calc(${progressPct}% - 8px)`,
                  width: '16px',
                  height: '16px',
                  background: 'white',
                  border: '2px solid #fbbf24',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
            <div
              className="flex justify-between mt-1"
              style={{ fontSize: '11px', fontFamily: 'ui-monospace,monospace', color: 'rgba(255,255,255,0.35)' }}
            >
              <span>{fmt(currentSec)}</span>
              <span>{fmt(totalSec)}</span>
            </div>
          </div>

          {/* Controls row */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="px-6 py-4 flex items-center gap-3">
                  {/* Skip back 5s */}
                  <button
                    type="button"
                    onClick={() => seek(currentSec - 5)}
                    aria-label="رجوع 5 ثوانٍ"
                    className="grid place-items-center w-11 h-11 rounded-xl transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4a8 8 0 108 8" />
                      <path d="M11 4L7 1M11 4L7 7" />
                    </svg>
                  </button>

                  {/* Hero play / pause — 64px */}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={playing ? 'إيقاف' : 'تشغيل'}
                    className="grid place-items-center rounded-full transition-transform hover:scale-[1.03] active:scale-95"
                    style={{
                      width: '64px',
                      height: '64px',
                      background: loadError
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b)',
                      color: loadError ? 'white' : '#0f172a',
                      boxShadow: loadError
                        ? '0 8px 24px -8px rgba(239,68,68,0.4)'
                        : '0 12px 32px -6px rgba(251, 191, 36, 0.5), inset 0 2px 0 rgba(255,255,255,0.4)',
                    }}
                  >
                    {playing ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1.2" />
                        <rect x="14" y="5" width="4" height="14" rx="1.2" />
                      </svg>
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
                        <polygon points="6 4 20 12 6 20 6 4" />
                      </svg>
                    )}
                  </button>

                  {/* Skip forward 5s */}
                  <button
                    type="button"
                    onClick={() => seek(currentSec + 5)}
                    aria-label="تقديم 5 ثوانٍ"
                    className="grid place-items-center w-11 h-11 rounded-xl transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 4a8 8 0 11-8 8" />
                      <path d="M13 4l4-3M13 4l4 3" />
                    </svg>
                  </button>

                  {/* Time display */}
                  <div
                    className="ml-auto font-mono text-xs tabular-nums"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {fmt(currentSec)} <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span> {fmt(totalSec)}
                  </div>

                  {/* Speed popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSpeedOpen((v) => !v)}
                      className="px-3 py-1.5 rounded-full text-xs font-mono transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.85)',
                      }}
                      aria-label={`سرعة ${speed}×`}
                    >
                      {speed}× <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginInlineStart: '2px' }}>▾</span>
                    </button>
                    {speedOpen && (
                      <div
                        className="absolute bottom-full mb-2 right-0 rounded-xl p-1 z-10"
                        style={{
                          minWidth: '76px',
                          background: 'rgba(2,6,23,0.96)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 16px 40px -8px rgba(0,0,0,0.5)',
                        }}
                      >
                        {SPEEDS.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setRate(s)}
                            className="block w-full text-right px-3 py-1.5 rounded-lg text-xs font-mono transition"
                            style={{
                              color: s === speed ? '#fde68a' : 'rgba(255,255,255,0.7)',
                              background: s === speed ? 'rgba(251,191,36,0.18)' : 'transparent',
                            }}
                          >
                            {s}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* A-B loop (compact) */}
                  <div className="flex items-center gap-1 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setAb((p) => ({ ...p, a: currentSec }))}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: ab.a != null ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                        color: ab.a != null ? '#0f172a' : 'rgba(255,255,255,0.4)',
                      }}
                      aria-label="نقطة البداية A"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setAb((p) => ({ ...p, b: currentSec }))}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: ab.b != null ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                        color: ab.b != null ? '#0f172a' : 'rgba(255,255,255,0.4)',
                      }}
                      aria-label="نقطة النهاية B"
                    >
                      B
                    </button>
                    {(ab.a != null || ab.b != null) && (
                      <button
                        type="button"
                        onClick={() => setAb({ a: null, b: null })}
                        className="w-6 h-8 text-sm transition-colors hover:text-white/60"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        aria-label="إلغاء التكرار"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Collapse */}
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="grid place-items-center w-8 h-8 rounded-lg transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    aria-label="تصغير المشغّل"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Transcript toggle — Phase D requirement: lives inside the player */}
                {!hideTranscriptToggle && onTranscriptToggle && (
                  <div
                    className="flex items-center justify-center pb-3 px-6"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}
                  >
                    <button
                      type="button"
                      onClick={onTranscriptToggle}
                      className="inline-flex items-center gap-1.5 text-xs transition-colors font-['Tajawal']"
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                    >
                      <span>{transcriptShown ? '🙈' : '👁'}</span>
                      <span>{transcriptShown ? 'إخفاء النص' : 'إظهار النص'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-full py-2 text-[11px] transition-colors font-['Tajawal']"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                ▲ توسيع المشغّل
              </button>
            )}
          </AnimatePresence>

          {loadError && (
            <div className="px-6 pb-4 flex items-center justify-between gap-3 font-['Tajawal']" dir="rtl">
              <span className="text-xs" style={{ color: 'rgba(252, 165, 165, 0.95)' }}>
                ⚠️ {loadError}
              </span>
              <button
                type="button"
                onClick={retry}
                className="text-xs underline transition-opacity hover:opacity-80"
                style={{ color: 'rgba(252, 165, 165, 0.85)' }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom spacer so content isn't hidden behind the fixed bar */}
      <div style={{ height: collapsed ? 80 : 180 }} aria-hidden="true" />
    </>
  )
}
