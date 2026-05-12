import { Hash, Megaphone, Book, Mic, Headphones, PenLine, BookOpen, Library, SpellCheck } from 'lucide-react'
import { useGroupChannels } from '../queries/useGroupChannels'
import ChannelSidebarItem from './ChannelSidebarItem'

const ICON_MAP = {
  hash: Hash,
  megaphone: Megaphone,
  book: Book,
  mic: Mic,
  headphones: Headphones,
  'pen-line': PenLine,
  'book-open': BookOpen,
  library: Library,
  'spell-check': SpellCheck,
}

export default function ChannelSidebar({ groupId, activeSlug, onSelect, onlineUserIds = [], className = '' }) {
  const { data: channels = [], isLoading } = useGroupChannels(groupId)

  return (
    <aside
      className={`flex flex-col border-l border-[var(--border)] bg-[var(--bg-card)] ${className}`}
      style={{ width: 220, minWidth: 180, direction: 'rtl' }}
    >
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)] font-medium tracking-wide uppercase">
          القنوات
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="space-y-1 px-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-9 rounded-lg" />
            ))}
          </div>
        )}
        {channels.map((ch) => {
          const IconComp = ICON_MAP[ch.icon] ?? Hash
          return (
            <ChannelSidebarItem
              key={ch.id}
              channel={ch}
              icon={IconComp}
              isActive={ch.slug === activeSlug}
              hasOnlineUsers={onlineUserIds.length > 0 && ch.slug === activeSlug}
              onSelect={() => onSelect(ch)}
            />
          )
        })}
      </nav>
    </aside>
  )
}
