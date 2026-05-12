import { useCallback } from 'react'

function fmt(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

export function ProgressBar({ currentTime, duration, markerA, markerB, isLooping, bookmarks, onSeek, onSetMarkerA, onSetMarkerB }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const aPct = (markerA !== null && duration > 0) ? (markerA / duration) * 100 : null
  const bPct = (markerB !== null && duration > 0) ? (markerB / duration) * 100 : null

  const handleClick = useCallback((e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickPct = Math.max(0, Math.min(1, x / rect.width))
    onSeek(clickPct * duration)
  }, [duration, onSeek])

  return (
    <div className="px-4 pb-2">
      {/* Bar */}
      <div
        className="relative w-full h-2 rounded-full cursor-pointer group"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        onClick={handleClick}
      >
        {/* Played */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />

        {/* A-B region */}
        {aPct !== null && bPct !== null && (
          <div
            className={`absolute inset-y-0 rounded-full ${isLooping ? 'bg-amber-400/40' : 'bg-amber-400/20'}`}
            style={{ left: `${aPct}%`, width: `${bPct - aPct}%` }}
          />
        )}

        {/* Marker A */}
        {aPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm bg-amber-400 cursor-pointer -ml-1"
            style={{ left: `${aPct}%` }}
            title="Marker A"
          />
        )}
        {/* Marker B */}
        {bPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm bg-amber-500 cursor-pointer -ml-1"
            style={{ left: `${bPct}%` }}
            title="Marker B"
          />
        )}

        {/* Bookmarks */}
        {bookmarks?.map(bm => {
          const bmPct = duration > 0 ? (bm.position_ms / duration) * 100 : 0
          return (
            <div
              key={bm.id}
              className="absolute top-1/2 -translate-y-1/2 text-yellow-400 -ml-1.5 text-[10px]"
              style={{ left: `${bmPct}%` }}
              title={bm.label || fmt(bm.position_ms)}
            >★</div>
          )
        })}

        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow -ml-1.5"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }} dir="ltr">{fmt(currentTime)}</span>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }} dir="ltr">{fmt(duration)}</span>
      </div>
    </div>
  )
}
