export default function ChannelSidebarItem({ channel, icon: Icon, isActive, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm text-right transition-all
        ${isActive
          ? 'bg-sky-500/15 text-sky-400 font-medium'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
        }
      `}
      style={{ width: 'calc(100% - 16px)', fontFamily: 'Tajawal, sans-serif', minHeight: 40 }}
    >
      <Icon size={16} className="shrink-0 opacity-70" />
      <span className="flex-1 truncate">{channel.label_ar}</span>
      {channel.is_announcement && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 shrink-0">
          إعلانات
        </span>
      )}
    </button>
  )
}
