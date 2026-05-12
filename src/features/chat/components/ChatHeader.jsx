import { Search, Hash, Megaphone } from 'lucide-react'

export default function ChatHeader({ channel, groupName, onSearchOpen, onlineCount = 0 }) {
  return (
    <header
      className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]"
      style={{ direction: 'rtl' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {channel?.is_announcement
          ? <Megaphone size={18} className="text-amber-400 shrink-0" />
          : <Hash size={18} className="text-[var(--text-muted)] shrink-0" />
        }
        <span
          className="font-semibold text-[var(--text-primary)] truncate"
          style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 17 }}
        >
          {channel?.label_ar ?? '...'}
        </span>
        {groupName && (
          <span className="text-xs text-[var(--text-muted)] hidden sm:block">
            — {groupName}
          </span>
        )}
        {onlineCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {onlineCount} متصل
          </span>
        )}
      </div>

      <button
        onClick={onSearchOpen}
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
        style={{ minWidth: 36, minHeight: 36 }}
        aria-label="بحث في المحادثة"
      >
        <Search size={18} />
      </button>
    </header>
  )
}
