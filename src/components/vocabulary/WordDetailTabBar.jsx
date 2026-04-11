/**
 * Sticky tab bar for WordDetailModal.
 * Tabs are only rendered if they have content — hide-when-empty logic lives in the parent.
 * Severity dot on النطق tab pulses for high severity.
 */
export default function WordDetailTabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div
      dir="rtl"
      className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-900/70 backdrop-blur-sm shrink-0"
    >
      <div
        className="flex items-center gap-0.5 px-2 sm:px-4 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .wd-tabbar::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="flex items-center gap-0.5 wd-tabbar">
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            const severity = tab.severity
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  'relative shrink-0 px-4 py-3 flex items-center gap-1.5 min-h-[48px]',
                  'text-sm font-medium font-[Tajawal] transition-colors',
                  'border-b-2 -mb-px',
                  active
                    ? 'border-sky-400 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                <span aria-hidden="true" className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="ms-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                    {tab.badge}
                  </span>
                )}
                {severity === 'high' && (
                  <span
                    className="ms-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                    aria-label="تحذير نطق"
                  />
                )}
                {severity === 'medium' && (
                  <span className="ms-1 w-2 h-2 rounded-full bg-yellow-400" />
                )}
                {severity === 'low' && (
                  <span className="ms-1 w-2 h-2 rounded-full bg-slate-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
