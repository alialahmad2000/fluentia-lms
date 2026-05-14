import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Premium listening player — distinct from the reading player.
 * - sticky-in-content positioning (respects sidebar width automatically)
 * - speaker-segment tick marks on the scrubber
 * - live current-speaker label
 * - replay/forward 5s (better for language re-listening than 10s)
 * - elegant speed control, A-B loop, collapse
 *
 * Props:
 *   audioUrl         string
 *   speakerSegments  [{ speaker_name|speaker, voice, start_ms, end_ms, text }] (optional)
 *   durationMs       number (optional — falls back to element duration)
 *   onTimeUpdate     (ms) => void (optional, for transcript karaoke)
 */
export function ListeningPlayer({ audioUrl, speakerSegments = [], durationMs, onTimeUpdate }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [totalSec, setTotalSec] = useState(durationMs ? durationMs / 1000 : 0);
  const [speed, setSpeed] = useState(1);
  const [ab, setAb] = useState({ a: null, b: null });
  const [collapsed, setCollapsed] = useState(false);

  const segMarks = useMemo(
    () => speakerSegments
      .filter(s => typeof s.start_ms === 'number')
      .map(s => ({
        ...s,
        name: s.speaker_name || s.speaker || '',
        startSec: s.start_ms / 1000,
        endSec: typeof s.end_ms === 'number' ? s.end_ms / 1000 : s.start_ms / 1000,
      })),
    [speakerSegments]
  );

  const currentSpeaker = useMemo(() => {
    for (let i = segMarks.length - 1; i >= 0; i--) {
      if (currentSec >= segMarks[i].startSec) return segMarks[i];
    }
    return null;
  }, [segMarks, currentSec]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCurrentSec(el.currentTime);
      onTimeUpdate?.(el.currentTime * 1000);
      if (ab.a != null && ab.b != null && el.currentTime >= ab.b) el.currentTime = ab.a;
    };
    const onMeta = () => setTotalSec(el.duration || (durationMs ? durationMs / 1000 : 0));
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);
    if (el.readyState >= 1) onMeta();
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
    };
  }, [ab, durationMs, onTimeUpdate]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.paused ? el.play().catch(() => {}) : el.pause();
  }, []);

  const seek = useCallback((sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, totalSec || el.duration || 0));
  }, [totalSec]);

  const setRate = useCallback((s) => {
    const el = audioRef.current;
    if (el) el.playbackRate = s;
    setSpeed(s);
  }, []);

  const progressPct = totalSec ? (currentSec / totalSec) * 100 : 0;

  return (
    <div dir="ltr" className="sticky bottom-4 z-30 mt-8">
      <motion.div
        layout
        style={{
          borderRadius: '1.5rem',
          border: '1px solid var(--border-default)',
          background: 'var(--surface-raised)',
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
      >
        {/* Gold hairline accent */}
        <div
          className="h-px"
          style={{ background: 'linear-gradient(to right, transparent, var(--accent-gold), transparent)', opacity: 0.6 }}
        />

        {/* Live current-speaker label */}
        <AnimatePresence mode="wait">
          {currentSpeaker && (
            <motion.div
              key={currentSpeaker.name + currentSpeaker.startSec}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="px-5 pt-3 flex items-center gap-2"
              dir="rtl"
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: 'var(--accent-gold)' }}
              />
              <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                يتحدث الآن:{' '}
                <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
                  {currentSpeaker.name}
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrubber with speaker-segment tick marks */}
        <div className="px-5 pt-3">
          <div className="relative h-8 flex items-center">
            {/* Track */}
            <div
              className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--glass-card)' }}
            >
              <div
                className="h-full"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(to right, var(--accent-sky), var(--accent-gold))',
                }}
              />
            </div>
            {/* Speaker segment tick marks */}
            {segMarks.map((s, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-3 rounded-full pointer-events-none"
                style={{
                  left: `${totalSec ? (s.startSec / totalSec) * 100 : 0}%`,
                  background: 'var(--accent-gold)',
                  opacity: 0.4,
                }}
                title={s.name}
              />
            ))}
            {/* Invisible range input for seeking */}
            <input
              type="range"
              min={0}
              max={totalSec || 0}
              step={0.01}
              value={currentSec}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
              aria-label="Seek"
            />
            {/* Thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full pointer-events-none shadow-lg"
              style={{
                left: `calc(${progressPct}% - 7px)`,
                background: 'white',
                border: '2px solid var(--accent-gold)',
              }}
            />
          </div>
          <div
            className="flex justify-between -mt-1"
            style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}
          >
            <span>{fmt(currentSec)}</span>
            <span>{fmt(totalSec)}</span>
          </div>
        </div>

        {/* Controls */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="px-5 py-4 flex items-center gap-3">
                {/* Replay 5s */}
                <button
                  onClick={() => seek(currentSec - 5)}
                  aria-label="رجوع 5 ثوانٍ"
                  className="grid place-items-center w-10 h-10 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4a8 8 0 108 8" />
                    <path d="M11 4L7 1M11 4L7 7" />
                  </svg>
                </button>

                {/* Play / Pause — large, gold */}
                <button
                  onClick={toggle}
                  aria-label={playing ? 'إيقاف' : 'تشغيل'}
                  className="grid place-items-center w-14 h-14 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-sky))',
                    color: 'black',
                  }}
                >
                  {playing ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  )}
                </button>

                {/* Forward 5s */}
                <button
                  onClick={() => seek(currentSec + 5)}
                  aria-label="تقديم 5 ثوانٍ"
                  className="grid place-items-center w-10 h-10 rounded-xl transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 4a8 8 0 11-8 8" />
                    <path d="M13 4l4-3M13 4l4 3" />
                  </svg>
                </button>

                {/* Speed — segmented control */}
                <div
                  className="flex items-center gap-0.5 ml-auto p-1 rounded-xl"
                  style={{ background: 'var(--glass-card)' }}
                >
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={() => setRate(s)}
                      className="px-2 py-1 rounded-lg text-xs font-mono transition-colors"
                      style={{
                        background: speed === s ? 'var(--accent-sky)' : 'transparent',
                        color: speed === s ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {s}×
                    </button>
                  ))}
                </div>

                {/* A-B loop */}
                <div
                  className="flex items-center gap-1 pl-3"
                  style={{ borderLeft: '1px solid var(--border-subtle)' }}
                >
                  <button
                    onClick={() => setAb(p => ({ ...p, a: currentSec }))}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      background: ab.a != null ? 'var(--accent-gold)' : 'var(--glass-card)',
                      color: ab.a != null ? 'black' : 'var(--text-muted)',
                    }}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setAb(p => ({ ...p, b: currentSec }))}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      background: ab.b != null ? 'var(--accent-gold)' : 'var(--glass-card)',
                      color: ab.b != null ? 'black' : 'var(--text-muted)',
                    }}
                  >
                    B
                  </button>
                  {(ab.a != null || ab.b != null) && (
                    <button
                      onClick={() => setAb({ a: null, b: null })}
                      className="w-6 h-8 text-sm transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="إلغاء التكرار"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Collapse */}
                <button
                  onClick={() => setCollapsed(true)}
                  className="grid place-items-center w-8 h-8 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  aria-label="تصغير"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full py-1.5 text-[11px] transition-colors font-['Tajawal']"
              style={{ color: 'var(--text-muted)' }}
            >
              ▲ توسيع المشغّل
            </button>
          )}
        </AnimatePresence>

        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      </motion.div>
    </div>
  );
}
