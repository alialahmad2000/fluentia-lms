// Compact avatar cluster showing who's currently in the channel
export default function ActiveUsersDots({ userIds = [], profiles = [] }) {
  if (!userIds.length) return null

  const visible = profiles.slice(0, 3)
  const extra = userIds.length - visible.length

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5" style={{ direction: 'ltr' }}>
        {visible.map((p, i) => (
          <div
            key={p?.id ?? i}
            className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold overflow-hidden"
            style={{
              borderColor: 'var(--ds-bg-base)',
              background: 'var(--ds-accent-primary)',
              color: 'var(--ds-bg-base)',
              fontFamily: 'Tajawal, sans-serif',
            }}
            title={p?.display_name || p?.full_name}
          >
            {p?.avatar_url
              ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              : (p?.display_name?.[0] || p?.full_name?.[0] || '?')
            }
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span
          className="text-[11px] tabular-nums"
          style={{ color: 'var(--ds-accent-success)', fontFamily: 'Tajawal, sans-serif' }}
        >
          +{extra} متصل
        </span>
      )}
    </div>
  )
}
