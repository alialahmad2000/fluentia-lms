export function ABLoopControls({ markerA, markerB, isLooping, onSetA, onSetB, onClear, onToggleLoop }) {
  const fmt = (ms) => {
    if (ms === null) return '--:--'
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 flex-wrap" dir="ltr">
      <span className="text-xs text-slate-400 font-['Tajawal']">A-B:</span>

      <button
        onClick={onSetA}
        className={`px-2 py-1 text-xs rounded font-mono transition-colors ${markerA !== null ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
      >
        A: {fmt(markerA)}
      </button>

      <button
        onClick={onSetB}
        className={`px-2 py-1 text-xs rounded font-mono transition-colors ${markerB !== null ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
      >
        B: {fmt(markerB)}
      </button>

      {markerA !== null && markerB !== null && (
        <button
          onClick={onToggleLoop}
          className={`px-2 py-1 text-xs rounded transition-colors ${isLooping ? 'bg-amber-400/30 text-amber-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}
        >
          {isLooping ? '⟳ تكرار' : '⟳'}
        </button>
      )}

      {(markerA !== null || markerB !== null) && (
        <button onClick={onClear} className="px-2 py-1 text-xs rounded bg-white/5 text-slate-500 hover:text-red-400 transition-colors">
          ✕
        </button>
      )}
    </div>
  )
}
