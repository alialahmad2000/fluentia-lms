import { SpeakerBadge } from './SpeakerBadge'

const BAR_CONFIGS = [
  { delay: '0ms',   duration: '900ms' },
  { delay: '100ms', duration: '700ms' },
  { delay: '200ms', duration: '1100ms' },
  { delay: '150ms', duration: '800ms' },
  { delay: '50ms',  duration: '1000ms' },
  { delay: '250ms', duration: '750ms' },
  { delay: '100ms', duration: '950ms' },
]

/**
 * ListeningFocusMode — shown when transcript is hidden during listening.
 * Displays speaker identity, CSS waveform, segment progress, and a reveal button.
 * The reveal button is disabled in one-play exam mode until playback completes.
 */
export function ListeningFocusMode({
  currentSpeakerLabel,
  currentSegmentIndex,
  totalSegments,
  isPlaying,
  isPaused,
  hasCompleted,
  canReveal,
  onRevealText,
}) {
  return (
    <div
      className="rounded-3xl border border-white/[0.06] p-8 md:p-12 min-h-[380px] flex flex-col items-center justify-center gap-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, rgba(8,12,24,0.55), rgba(8,12,24,0.88))' }}
    >
      {/* Ambient pulse when playing */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Speaker identity */}
      <div className="text-center space-y-2">
        {currentSpeakerLabel ? (
          <>
            <SpeakerBadge label={currentSpeakerLabel} size="lg" />
            <p className="text-xs text-slate-400 font-['Tajawal'] mt-1">
              {isPlaying ? 'يتحدّث الآن...' : isPaused ? 'متوقّف مؤقتاً' : hasCompleted ? 'انتهى التشغيل' : 'استمع'}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400 font-['Tajawal']">
            {isPlaying ? 'جارٍ التشغيل...' : 'جاهز للاستماع'}
          </p>
        )}
      </div>

      {/* CSS-only audio waveform */}
      <AudioWaveform isPlaying={isPlaying} />

      {/* Segment progress dots */}
      {totalSegments > 1 && (
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-400 tabular-nums font-['Inter']">
            {currentSegmentIndex + 1} / {totalSegments}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSegments }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < currentSegmentIndex
                    ? 'w-5 bg-sky-400/60'
                    : i === currentSegmentIndex
                      ? 'w-8 bg-sky-400'
                      : 'w-5 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reveal text button */}
      <button
        onClick={canReveal ? onRevealText : undefined}
        disabled={!canReveal}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all font-['Tajawal'] ${
          canReveal
            ? 'bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.15] text-slate-200 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-white/[0.04] border border-white/[0.08] text-slate-500 cursor-not-allowed'
        }`}
      >
        <span>👁</span>
        <span>
          {canReveal
            ? 'إظهار النص'
            : 'النص متاح بعد انتهاء التشغيل (وضع الامتحان)'}
        </span>
      </button>

      {/* Pedagogical hint */}
      <p className="text-[11px] text-slate-500 text-center max-w-xs leading-relaxed font-['Tajawal']">
        💡 استمع بتركيز أولاً — درّب أذنك على التمييز بين الأصوات
        {!hasCompleted && ' — يمكنك إظهار النص لاحقاً للتحقّق من فهمك'}
      </p>
    </div>
  )
}

function AudioWaveform({ isPlaying }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: 48 }}>
      {BAR_CONFIGS.map((cfg, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full${isPlaying ? ' animate-waveform' : ''}`}
          style={isPlaying ? {
            background: 'linear-gradient(to top, #38bdf8, #7dd3fc)',
            animationDuration: cfg.duration,
            animationDelay: cfg.delay,
            height: '8px',
          } : {
            height: '8px',
            background: 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  )
}
