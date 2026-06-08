import { Link } from 'react-router-dom'
import { Users, Activity, ClipboardCheck, Flame, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTeacherRoster, useRosterActivity, studentName, fmtMinutes, riyadhDate } from '@/hooks/teacher/useTeacherRoster'
import { useGradingQueue } from '@/hooks/trainer/useGradingQueue'
import NeedsAttentionPanel from '@/components/teacher/home/NeedsAttentionPanel'

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', hour: 'numeric', hour12: false }).format(new Date()))
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'مساء الخير'
  return 'مساء الخير'
}

function StatCard({ icon: Icon, value, label, tone = '#38bdf8', to }) {
  const inner = (
    <div className="tea-card tea-card--hover flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${tone}1f`, color: tone }}><Icon size={18} /></span>
      <div><div className="text-[22px] font-extrabold text-slate-100 leading-none">{value}</div><div className="text-[12px] text-slate-400 mt-1">{label}</div></div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function StudentMini({ s, activity }) {
  const a = activity?.[s.id]
  const today = a?.today
  const name = studentName(s)
  return (
    <Link to={`/trainer/students/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
      <div className="w-9 h-9 rounded-lg grid place-items-center font-bold text-[13px] text-[#06121f] shrink-0" style={{ background: 'linear-gradient(135deg,#38bdf8,#7dd3fc)' }}>{(name || 'ط').charAt(0)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-slate-200 truncate">{name}</div>
        <div className="text-[11.5px] text-slate-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><Flame size={11} className="text-amber-400/80" />{s.current_streak || 0}</span>
          <span>المستوى {s.academic_level ?? '—'}</span>
        </div>
      </div>
      {today ? (
        <span className="text-[11px] font-bold text-emerald-300 shrink-0">{today.sections_completed || 0} مهمة · {fmtMinutes(today.learning_seconds)}</span>
      ) : (
        <span className="text-[11px] text-slate-600 shrink-0">لا نشاط اليوم</span>
      )}
      <ChevronLeft size={15} className="text-slate-700 shrink-0" />
    </Link>
  )
}

export default function TeacherHome() {
  const profile = useAuthStore((s) => s.profile)
  const { groups, students, studentIds, isLoading } = useTeacherRoster()
  const { data: activity } = useRosterActivity(studentIds, 7)
  const { data: queue = [] } = useGradingQueue(50)

  const today = riyadhDate()
  const activeToday = activity ? Object.values(activity).filter((a) => a.today).length : 0
  const name = profile?.display_name || profile?.full_name || ''

  const byGroup = groups.map((g) => ({ group: g, list: students.filter((s) => s.group_id === g.id) }))
  const ungrouped = students.filter((s) => !groups.some((g) => g.id === s.group_id))
  if (ungrouped.length) byGroup.push({ group: { id: '__none__', name: 'بدون مجموعة' }, list: ungrouped })

  return (
    <div className="tea-page space-y-6">
      <div>
        <div className="text-[26px] font-extrabold text-slate-100">{greeting()}{name ? `، ${name}` : ''}</div>
        <div className="text-[13.5px] text-slate-400 mt-1">{new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} — متابعة طلابك اليوم</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Users} value={students.length} label="إجمالي طلابي" tone="#38bdf8" to="/trainer/students" />
        <StatCard icon={Activity} value={activeToday} label="نشِطون اليوم" tone="#4ade80" />
        <StatCard icon={ClipboardCheck} value={queue.length} label="بانتظار التقييم" tone="#fbbf24" to="/trainer/work" />
      </div>

      <NeedsAttentionPanel />

      {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="tea-skel h-40" />)}</div>}

      <div className="space-y-5">
        {byGroup.filter((g) => g.list.length).map(({ group, list }) => {
          const activeCount = list.filter((s) => activity?.[s.id]?.today).length
          return (
            <section key={group.id} className="tea-card !p-3">
              <div className="flex items-center justify-between px-2 pt-1 pb-2">
                <div className="tea-section-title !mb-0"><Users size={15} /> {group.name}</div>
                <span className="text-[12px] text-slate-500">{activeCount}/{list.length} نشِط اليوم</span>
              </div>
              <div className="divide-y divide-white/5">
                {list
                  .slice()
                  .sort((a, b) => (activity?.[b.id]?.today ? 1 : 0) - (activity?.[a.id]?.today ? 1 : 0))
                  .map((s) => <StudentMini key={s.id} s={s} activity={activity} />)}
              </div>
            </section>
          )
        })}
        {!isLoading && students.length === 0 && (
          <div className="tea-empty"><Users size={32} className="tea-empty__icon" /><div className="font-bold text-slate-200">لا يوجد طلاب في مجموعاتك بعد</div></div>
        )}
      </div>
    </div>
  )
}
