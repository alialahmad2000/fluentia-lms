import { X, Bookmark } from 'lucide-react'

const fmt = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export function BookmarkDrawer({ open, bookmarks, onAdd, onRemove, onJump, onClose, currentTime }) {
  if (!open) return null

  return (
    <div
      className="absolute left-0 right-0 bottom-full mb-2 rounded-xl p-4 z-20"
      style={{ background: 'var(--bg-card, #1c1c1e)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200 font-['Tajawal']">إشارات مرجعية</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16}/></button>
      </div>

      <button
        onClick={() => onAdd(currentTime)}
        className="w-full mb-3 py-1.5 text-xs rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors font-['Tajawal']"
      >
        + إضافة إشارة عند {fmt(currentTime)}
      </button>

      {bookmarks.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-2 font-['Tajawal']">لا توجد إشارات مرجعية</p>
      ) : (
        <ul className="space-y-1">
          {bookmarks.map(bm => (
            <li key={bm.id} className="flex items-center gap-2 group">
              <button
                onClick={() => onJump(bm.id)}
                className="flex-1 text-right text-xs py-1 px-2 rounded hover:bg-white/5 transition-colors flex items-center gap-2"
                dir="ltr"
              >
                <Bookmark size={12} className="text-yellow-400"/>
                <span className="font-mono text-slate-300">{fmt(bm.position_ms)}</span>
                {bm.label && <span className="text-slate-400 truncate">{bm.label}</span>}
              </button>
              <button
                onClick={() => onRemove(bm.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"
              >
                <X size={12}/>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
