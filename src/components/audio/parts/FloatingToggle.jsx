export function FloatingToggle({ karaokeEnabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-20 left-4 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-sm font-bold transition-colors ${
        karaokeEnabled ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-400'
      }`}
      title="تبديل الكاريوكي"
    >
      K
    </button>
  )
}
