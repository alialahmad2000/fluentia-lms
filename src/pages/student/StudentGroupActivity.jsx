import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UsersRound, Activity, Trophy, Heart } from 'lucide-react'
import StudentActivityFeed from './StudentActivityFeed'
import StudentLeaderboard from './StudentLeaderboard'
import StudentPeerRecognition from './StudentPeerRecognition'

const TABS = [
  { key: 'activity', label: 'النشاط', icon: Activity },
  { key: 'leaderboard', label: 'المتصدرين', icon: Trophy },
  { key: 'recognition', label: 'تقدير', icon: Heart },
]

const TAB_COMPONENTS = {
  activity: StudentActivityFeed,
  leaderboard: StudentLeaderboard,
  recognition: StudentPeerRecognition,
}

export default function StudentGroupActivity() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'activity'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Sync with URL param changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && TABS.some(t => t.key === tab)) setActiveTab(tab)
  }, [searchParams])
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
          <UsersRound size={22} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>نشاط المجموعة</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>تحديات وتقدير الأقران ونشاط الفريق</p>
        </div>
      </motion.div>

      {/* Tab pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 overflow-x-auto scrollbar-none pb-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'border border-transparent hover:bg-[var(--surface-raised)]'
            }`}
            style={activeTab !== tab.key ? { color: 'var(--text-tertiary)', background: 'var(--surface-raised)' } : undefined}
          >
            <tab.icon size={16} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content — render each sub-page directly (they already have their own headers, hide them) */}
      <div className="[&>div>div:first-child]:hidden">
        <ActiveComponent />
      </div>
    </div>
  )
}
