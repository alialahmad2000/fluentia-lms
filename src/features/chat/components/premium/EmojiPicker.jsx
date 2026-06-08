// Lightweight emoji picker (curated popular set + recents). No external deps.
// Used by the reaction bar and the composer.
const POPULAR = [
  '😀', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰',
  '😘', '😋', '😎', '🤩', '🥳', '😏', '😴', '🤔', '🤗', '🙄', '😬', '😇',
  '🙃', '😢', '😭', '😤', '😠', '🥺', '😳', '🙏', '👍', '👎', '👏', '🙌',
  '👌', '✌️', '🤝', '💪', '👋', '🔥', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '💔', '💯', '⭐', '✨', '🎉', '🎊', '🏆', '✅', '❌', '⚡',
  '💡', '📌', '📚', '📝', '🎯', '💬', '🎙️', '👀', '🤷', '🤦', '🌟', '🌿',
]

const RECENTS_KEY = 'fluentia:emoji-recents'
function getRecents() { try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]') } catch { return [] } }

export default function EmojiPicker({ onPick }) {
  const recents = getRecents()
  const choose = (e) => {
    try {
      const next = [e, ...recents.filter((x) => x !== e)].slice(0, 16)
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch { /* ignore */ }
    onPick(e)
  }
  const Cell = (e) => (
    <button key={e} onClick={() => choose(e)} className="flex items-center justify-center rounded-lg"
      style={{ width: 34, height: 34, fontSize: 20, background: 'transparent' }}
      onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--ds-surface-2)')}
      onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}>
      {e}
    </button>
  )
  return (
    <div dir="rtl" style={{ width: 270, maxHeight: 230, overflowY: 'auto', padding: 6 }}>
      {recents.length > 0 && (
        <>
          <div className="px-1 pb-1 text-[10px]" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>الأخيرة</div>
          <div className="flex flex-wrap mb-1" style={{ borderBottom: '1px solid var(--ds-border-subtle)', paddingBottom: 4 }}>{recents.map(Cell)}</div>
        </>
      )}
      <div className="flex flex-wrap">{POPULAR.map(Cell)}</div>
    </div>
  )
}
