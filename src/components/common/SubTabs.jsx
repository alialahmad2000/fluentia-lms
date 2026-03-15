import { motion } from 'framer-motion'

/**
 * SubTabs — reusable tab bar for consolidated pages.
 *
 * Props:
 *   tabs: [{ key: string, label: string, icon?: LucideIcon }]
 *   activeTab: string
 *   onChange: (key) => void
 *   accent?: 'sky' | 'emerald' | 'gold' (default 'sky')
 */
export default function SubTabs({ tabs, activeTab, onChange, accent = 'sky' }) {
  const accentColors = {
    sky: { active: 'text-sky-400 border-sky-400', bg: 'bg-sky-500/10' },
    emerald: { active: 'text-emerald-400 border-emerald-400', bg: 'bg-emerald-500/10' },
    gold: { active: 'text-gold-400 border-gold-400', bg: 'bg-gold-500/10' },
  }
  const colors = accentColors[accent] || accentColors.sky

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
              isActive
                ? `${colors.active} ${colors.bg}`
                : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover-bg)]'
            }`}
          >
            {tab.icon && <tab.icon size={16} className="shrink-0" />}
            <span>{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="subtab-indicator"
                className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                  accent === 'sky' ? 'bg-sky-400' : accent === 'emerald' ? 'bg-emerald-400' : 'bg-gold-400'
                }`}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
