import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Sticky bottom audio bar. Reads from a parent-provided <audio> ref.
 *
 * Props:
 *   audioRef      — React ref pointing to an <audio> element rendered by the parent
 *   showABRepeat  — show A-B repeat controls (true for listening, false for reading)
 *   onTimeUpdate  — optional callback fired with currentTime in ms (for karaoke sync)
 */
export function StickyAudioBar({ audioRef, showABRepeat = false, onTimeUpdate }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [minimized, setMinimized] = useState(false)
  const [abPoints, setAbPoints] = useState({ a: null, b: null })
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const el = audioRef?.current
    if (!el) return

    const onTime = () => {
      if (isDraggingRef.current) return
      setCurrentTime(el.currentTime)
      onTimeUpdate?.(el.currentTime * 1000)
      // A-B repeat enforcement
      if (abPoints.a != null && abPoints.b != null && el.currentTime >= abPoints.b) {
        el.currentTime = abPoints.a
      }
    }
    const onMeta = () => setDuration(el.duration || 0)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('durationchange', onMeta)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)

    if (el.readyState >= 1) setDuration(el.duration || 0)

    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('durationchange', onMeta)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [audioRef, abPoints, onTimeUpdate])

  const togglePlay = useCallback(() => {
    const el = audioRef?.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }, [audioRef])

  const seek = useCallback((sec) => {
    const el = audioRef?.current
    if (!el) return
    const clamped = Math.max(0, Math.min(sec, duration || 0))
    el.currentTime = clamped
    setCurrentTime(clamped)
  }, [audioRef, duration])

  const changeSpeed = useCallback((s) => {
    const el = audioRef?.current
    if (!el) return
    el.playbackRate = s
    setSpeed(s)
  }, [audioRef])

  const setA = useCallback(() => setAbPoints(p => ({ ...p, a: currentTime })), [currentTime])
  const setB = useCallback(() => setAbPoints(p => ({ ...p, b: currentTime })), [currentTime])
  const clearAB = useCallback(() => setAbPoints({ a: null, b: null }), [])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      dir="ltr"
    >
      <div className="max-w-4xl mx-auto px-3 pb-3 pointer-events-auto">
        <motion.div
          layout
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Hairline progress strip + scrubber */}
          <div className="px-3 pt-2.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={currentTime}
              onMouseDown={() => { isDraggingRef.current = true }}
              onMouseUp={(e) => { isDraggingRef.current = false; seek(parseFloat(e.currentTarget.value)) }}
              onChange={(e) => setCurrentTime(parseFloat(e.currentTarget.value))}
              onTouchStart={() => { isDraggingRef.current = true }}
              onTouchEnd={(e) => { isDraggingRef.current = false; seek(parseFloat(e.currentTarget.value)) }}
              className="w-full h-1 cursor-pointer accent-purple-500"
              aria-label="Seek"
              style={{ accentColor: '#a855f7' }}
            />
            <div className="flex justify-between text-[10px] font-['Inter'] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!minimized && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <div className="flex items-center gap-2 px-3 pb-3 pt-1 flex-wrap">

                  {/* Skip back 10s */}
                  <button
                    onClick={() => seek(currentTime - 10)}
                    aria-label="رجوع 10 ثوانٍ"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 109-9M3 12l3.5-3.5M3 12l3.5 3.5"/>
                      <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Inter,sans-serif">10</text>
                    </svg>
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
                    className="w-11 h-11 rounded-full grid place-items-center transition-transform active:scale-95"
                    style={{ background: '#a855f7', color: 'white' }}
                  >
                    {playing ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6 4 20 12 6 20 6 4"/>
                      </svg>
                    )}
                  </button>

                  {/* Skip forward 10s */}
                  <button
                    onClick={() => seek(currentTime + 10)}
                    aria-label="تقديم 10 ثوانٍ"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-9-9M21 12l-3.5-3.5M21 12l-3.5 3.5"/>
                      <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Inter,sans-serif">10</text>
                    </svg>
                  </button>

                  {/* Speed chips */}
                  <div className="flex items-center gap-0.5 ml-1">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className="px-1.5 py-0.5 rounded text-[11px] font-['Inter'] font-bold transition-colors"
                        style={{
                          background: speed === s ? '#a855f7' : 'transparent',
                          color: speed === s ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>

                  {/* A-B Repeat (listening only) */}
                  {showABRepeat && (
                    <div className="flex items-center gap-1 border-l border-[var(--border-subtle)] pl-2 ml-1">
                      <button
                        onClick={setA}
                        className="px-2 py-0.5 rounded text-xs font-bold font-['Inter'] transition-colors"
                        style={{
                          background: abPoints.a != null ? '#f5c842' : 'rgba(255,255,255,0.06)',
                          color: abPoints.a != null ? '#000' : 'var(--text-muted)',
                        }}
                      >A</button>
                      <button
                        onClick={setB}
                        className="px-2 py-0.5 rounded text-xs font-bold font-['Inter'] transition-colors"
                        style={{
                          background: abPoints.b != null ? '#f5c842' : 'rgba(255,255,255,0.06)',
                          color: abPoints.b != null ? '#000' : 'var(--text-muted)',
                        }}
                      >B</button>
                      {(abPoints.a != null || abPoints.b != null) && (
                        <button onClick={clearAB} className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>×</button>
                      )}
                    </div>
                  )}

                  {/* Minimize */}
                  <button
                    onClick={() => setMinimized(true)}
                    aria-label="تصغير"
                    className="p-1.5 rounded-lg ml-auto"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {minimized && (
              <motion.button
                key="minimized"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMinimized(false)}
                className="w-full py-1.5 text-center text-xs font-['Tajawal'] transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                ▲ توسيع
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
