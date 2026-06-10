// مركز التقارير — the new admin reports hub (replaces the legacy AdminReports
// page, which stays reachable at /admin/reports-legacy per the hide-don't-delete
// rule). Five tabs, each backed by ONE staff-gated report RPC over the tables
// that actually carry production data. Tab + range live in the URL so views are
// shareable and survive refresh.
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Users, MousePointerClick, GraduationCap, HeartPulse,
  History, ScrollText,
} from 'lucide-react'
import { RangePicker } from './reportKit'
import PulseTab from './tabs/PulseTab'
import StudentsTab from './tabs/StudentsTab'
import UsageTab from './tabs/UsageTab'
import LearningTab from './tabs/LearningTab'
import HealthTab from './tabs/HealthTab'

const TABS = [
  { id: 'pulse',    label: 'النبض',          icon: Activity,          Comp: PulseTab },
  { id: 'students', label: 'الطلاب',          icon: Users,             Comp: StudentsTab },
  { id: 'usage',    label: 'الاستخدام',       icon: MousePointerClick, Comp: UsageTab },
  { id: 'learning', label: 'التعلّم',         icon: GraduationCap,     Comp: LearningTab },
  { id: 'health',   label: 'الصحة والتكلفة',  icon: HeartPulse,        Comp: HealthTab },
]

export default function AdminReportsHub() {
  const [params, setParams] = useSearchParams()
  const tabId = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'pulse'
  const days = [14, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const active = TABS.find((t) => t.id === tabId)

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)))
    setParams(next, { replace: true })
  }

  return (
    <div dir="rtl" className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold text-slate-100 tracking-tight">مركز التقارير</h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            من يستخدم المنصة، متى، وفي ماذا — مبني على بيانات الاستخدام الفعلية لحظة بلحظة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RangePicker days={days} onChange={(d) => update({ days: d })} />
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600">
            <Link to="/admin/analytics" className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] hover:text-slate-400 transition-colors">
              <ScrollText size={11} /> سجل الأحداث الخام
            </Link>
            <Link to="/admin/reports-legacy" className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] hover:text-slate-400 transition-colors">
              <History size={11} /> التقارير القديمة
            </Link>
          </div>
        </div>
      </div>

      {/* tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === tabId
          return (
            <button
              key={id}
              onClick={() => update({ tab: id })}
              className={`relative inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
                isActive
                  ? 'text-amber-300 bg-amber-400/10 border-amber-400/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
              }`}
            >
              <Icon size={14} />
              {label}
              {isActive && (
                <motion.span
                  layoutId="rhub-tab-glow"
                  className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* active tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tabId + days}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <active.Comp days={days} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
