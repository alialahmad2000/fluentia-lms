const COLORS = ['yellow', 'green', 'pink', 'blue', 'purple']
const COLOR_HEX = { yellow: '#facc15', green: '#34d399', pink: '#f472b6', blue: '#60a5fa', purple: '#c084fc' }

export function WordActionMenu({ word, position, existingHighlight, onAction, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[59]" onClick={onClose} />

      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          left: Math.min(position?.x ?? 100, window.innerWidth - 240),
          top: Math.min(position?.y ?? 100, window.innerHeight - 280),
          zIndex: 60,
          background: 'rgba(10,18,32,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          minWidth: 220,
        }}
        dir="rtl"
      >
        {/* Lookup */}
        <button
          onClick={() => onAction('lookup')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-t-2xl hover:bg-white/5 transition-colors"
        >
          <span className="text-lg">📖</span>
          <span className="text-sm text-slate-100 font-['Tajawal']">المعنى</span>
        </button>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '0 12px' }} />

        {/* Color picker */}
        <div className="px-4 py-3">
          <p className="text-[11px] text-slate-400 mb-2 font-['Tajawal']">تمييز بلون</p>
          <div className="flex gap-2 justify-center">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => onAction('highlight', color)}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  existingHighlight?.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110' : ''
                }`}
                style={{ background: COLOR_HEX[color] + 'bb' }}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        {existingHighlight && (
          <>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '0 12px' }} />
            <button
              onClick={() => onAction('remove-highlight')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 transition-colors"
            >
              <span className="text-lg">🗑️</span>
              <span className="text-sm text-rose-300 font-['Tajawal']">إزالة التمييز</span>
            </button>
          </>
        )}

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '0 12px' }} />

        {/* Note */}
        <button
          onClick={() => onAction('note')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-b-2xl hover:bg-white/5 transition-colors"
        >
          <span className="text-lg">📝</span>
          <span className="text-sm text-slate-100 font-['Tajawal']">
            {existingHighlight?.note ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
          </span>
        </button>
      </div>
    </>
  )
}
