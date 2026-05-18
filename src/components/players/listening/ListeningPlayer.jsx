import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebarWidth } from '../../../hooks/useSidebarWidth';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

function fmt(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Premium listening player — fixed bottom bar, respects sidebar (right-side).
 *
 * Props:
 *   audioUrl         string
 *   speakerSegments  [{ speaker_name|speaker, voice, start_ms, end_ms, text }] (optional)
 *   durationMs       number (optional — DB authoritative duration)
 *   onTimeUpdate     (ms) => void (optional)
 */
export function ListeningPlayer({ audioUrl, speakerSegments = [], durationMs, onTimeUpdate }) {
  const audioRef = useRef(null);
  const sidebarWidth = useSidebarWidth();

  // All state above any conditional
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [actualDurationSec, setActualDurationSec] = useState(durationMs ? durationMs / 1000 : 0);
  const [speed, setSpeed] = useState(1);
  const [ab, setAb] = useState({ a: null, b: null });
  const [collapsed, setCollapsed] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ── Segment timing (only if start_ms is present in DB) ──────────────────
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

  const totalSec = actualDurationSec || (durationMs ? durationMs / 1000 : 0);

  // ── Audio loading — re-runs when audioUrl changes ────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;

    // Reset playback state for new URL
    setPlaying(false);
    setCurrentSec(0);
    setLoadError(null);
    setAb({ a: null, b: null });

    const onError = () => {
      const codes = { 1: 'إلغاء', 2: 'شبكة', 3: 'فك تشفير', 4: 'تنسيق غير مدعوم' };
      const msg = codes[el.error?.code] || 'خطأ غير معروف';
      console.error('[ListeningPlayer] audio error', el.error, audioUrl);
      setLoadError(`تعذّر تحميل الصوت (${msg})`);
      setPlaying(false);
    };
    const onLoadedMetadata = () => {
      setLoadError(null);
      if (isFinite(el.duration) && el.duration > 0) {
        setActualDurationSec(el.duration);
      }
    };

    el.addEventListener('error', onError);
    el.addEventListener('loadedmetadata', onLoadedMetadata);

    // Explicitly set src + load() — iOS Safari requires this
    el.src = audioUrl;
    el.load();

    return () => {
      el.removeEventListener('error', onError);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [audioUrl]);

  // ── Playback listeners — stable (not reset on URL change) ────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      const t = el.currentTime;
      setCurrentSec(t);
      onTimeUpdate?.(t * 1000);
      if (ab.a != null && ab.b != null && t >= ab.b) el.currentTime = ab.a;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => { setPlaying(false); setCurrentSec(0); };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
    };
  }, [ab, onTimeUpdate]);

  // ── Controls ─────────────────────────────────────────────────────────────

  // play() MUST be called directly from the click handler (iOS Safari rule)
  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(err => {
        console.error('[ListeningPlayer] play() rejected:', err);
        setLoadError('تعذّر تشغيل الصوت — حاول مرة أخرى');
      });
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((sec) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, el.duration || totalSec));
  }, [totalSec]);

  const seekTo = useCallback((ms) => seek(ms / 1000), [seek]);

  const setRate = useCallback((s) => {
    const el = audioRef.current;
    if (el) el.playbackRate = s;
    setSpeed(s);
  }, []);

  const retry = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    setLoadError(null);
    el.src = audioUrl;
    el.load();
  }, [audioUrl]);

  const progressPct = totalSec > 0 ? (currentSec / totalSec) * 100 : 0;

  // ── Fixed bottom bar positioning (sidebar on the right in RTL layout) ────
  // sidebarWidth=0 on mobile (no sidebar) or while DOM hasn't measured yet
  const fixedStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: sidebarWidth > 0 ? sidebarWidth : 0,
    zIndex: 40,
    padding: '0 16px 16px',
    // On mobile fall back to accounting for the bottom nav
    paddingBottom: `max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))`,
  };

  return (
    <>
      {/* Hidden audio element — no src here, src set by useEffect */}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        style={{ display: 'none' }}
      />

      {/* Fixed bottom bar */}
      <div dir="ltr" style={fixedStyle}>
        <motion.div
          layout
          style={{
            borderRadius: '1.25rem',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(6,14,28,0.92)',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.4), 0 20px 60px -15px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            overflow: 'hidden',
          }}
        >
          {/* Gold hairline top accent */}
          <div
            className="h-px"
            style={{ background: 'linear-gradient(to right, transparent, var(--accent-gold, #fbbf24), transparent)', opacity: 0.5 }}
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
                  className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                  style={{ background: 'var(--accent-gold, #fbbf24)' }}
                />
                <span className="text-xs font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  يتحدث الآن:{' '}
                  <span className="font-semibold" style={{ color: 'var(--accent-gold, #fbbf24)' }}>
                    {currentSpeaker.name}
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrubber */}
          <div className="px-5 pt-3">
            <div className="relative h-8 flex items-center">
              {/* Track background */}
              <div
                className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(to right, var(--accent-sky, #38bdf8), var(--accent-gold, #fbbf24))',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
              {/* Speaker tick marks */}
              {segMarks.map((s, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-3 rounded-full pointer-events-none"
                  style={{
                    left: `${totalSec > 0 ? (s.startSec / totalSec) * 100 : 0}%`,
                    background: 'var(--accent-gold, #fbbf24)',
                    opacity: 0.45,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  title={s.name}
                />
              ))}
              {/* Seek input (invisible) */}
              <input
                type="range"
                min={0}
                max={totalSec || 0}
                step={0.05}
                value={currentSec}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
                aria-label="موضع التشغيل"
                aria-valuetext={currentSpeaker?.name || fmt(currentSec)}
              />
              {/* Thumb */}
              <div
                className="absolute w-3.5 h-3.5 rounded-full pointer-events-none shadow"
                style={{
                  left: `calc(${progressPct}% - 7px)`,
                  background: 'white',
                  border: '2px solid var(--accent-gold, #fbbf24)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
            <div
              className="flex justify-between -mt-1"
              style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}
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
                <div className="px-5 py-4 flex items-center gap-3">
                  {/* Replay 5s */}
                  <button
                    type="button"
                    onClick={() => seek(currentSec - 5)}
                    aria-label="رجوع 5 ثوانٍ"
                    className="grid place-items-center w-10 h-10 rounded-xl transition-colors hover:bg-white/[0.07]"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4a8 8 0 108 8" />
                      <path d="M11 4L7 1M11 4L7 7" />
                    </svg>
                  </button>

                  {/* Play / Pause */}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={playing ? 'إيقاف' : 'تشغيل'}
                    className="grid place-items-center w-14 h-14 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg"
                    style={{
                      background: loadError
                        ? 'rgba(239,68,68,0.3)'
                        : 'linear-gradient(135deg, var(--accent-gold, #fbbf24), var(--accent-sky, #38bdf8))',
                      color: loadError ? 'white' : 'black',
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
                    type="button"
                    onClick={() => seek(currentSec + 5)}
                    aria-label="تقديم 5 ثوانٍ"
                    className="grid place-items-center w-10 h-10 rounded-xl transition-colors hover:bg-white/[0.07]"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 4a8 8 0 11-8 8" />
                      <path d="M13 4l4-3M13 4l4 3" />
                    </svg>
                  </button>

                  {/* Speed */}
                  <div
                    className="flex items-center gap-0.5 ml-auto p-1 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {SPEEDS.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRate(s)}
                        className="px-2 py-1 rounded-lg text-xs font-mono transition-colors"
                        style={{
                          background: speed === s ? 'var(--accent-sky, #38bdf8)' : 'transparent',
                          color: speed === s ? 'white' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>

                  {/* A-B loop */}
                  <div
                    className="flex items-center gap-1 pl-3"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setAb(p => ({ ...p, a: currentSec }))}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: ab.a != null ? 'var(--accent-gold, #fbbf24)' : 'rgba(255,255,255,0.06)',
                        color: ab.a != null ? 'black' : 'rgba(255,255,255,0.4)',
                      }}
                      aria-label="نقطة البداية A"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setAb(p => ({ ...p, b: currentSec }))}
                      className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
                      style={{
                        background: ab.b != null ? 'var(--accent-gold, #fbbf24)' : 'rgba(255,255,255,0.06)',
                        color: ab.b != null ? 'black' : 'rgba(255,255,255,0.4)',
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
                    className="grid place-items-center w-8 h-8 rounded-lg transition-colors hover:bg-white/[0.07]"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    aria-label="تصغير المشغّل"
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
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-full py-1.5 text-[11px] transition-colors font-['Tajawal'] hover:text-white/50"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                ▲ توسيع المشغّل
              </button>
            )}
          </AnimatePresence>

          {/* Error state */}
          {loadError && (
            <div
              className="px-5 pb-3 flex items-center justify-between gap-3 font-['Tajawal']"
              dir="rtl"
            >
              <span className="text-xs" style={{ color: 'rgba(239,68,68,0.9)' }}>
                {loadError}
              </span>
              <button
                type="button"
                onClick={retry}
                className="text-xs underline transition-opacity hover:opacity-80"
                style={{ color: 'rgba(239,68,68,0.7)' }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom spacer so content isn't hidden behind fixed bar */}
      <div style={{ height: collapsed ? 80 : 160 }} aria-hidden="true" />
    </>
  );
}
