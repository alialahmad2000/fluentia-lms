import { Link } from 'react-router-dom'
import { Users, Activity, Flame, ChevronLeft, BookOpen, TrendingUp, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTeacherRoster, useRosterActivity, studentName, fmtMinutes } from '@/hooks/teacher/useTeacherRoster'

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', hour: 'numeric', hour12: false }).format(new Date()))
  return h < 12 ? 'صباح الخير' : 'مساء الخير'
}

/**
 * A stable accent per student. With a handful of private students the teacher
 * scans by person, not by row, so each panel carries that student's own colour —
 * identical cards forced you to read every name to find anyone.
 *
 * Drawn from a fixed palette rather than a free hue: a hashed hue wandered into
 * red, and a red primary action reads as "danger" in this design system. Rose is
 * reserved for paused/warning states, so it is deliberately absent here.
 */
const ACCENTS = [
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#4ade80', // emerald
  '#fbbf24', // gold
  '#2dd4bf', // teal
  '#818cf8', // indigo
  '#22d3ee', // cyan
  '#a3e635', // lime
]

function accentFor(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973
  return ACCENTS[h % ACCENTS.length]
}

function relTime(iso) {
  if (!iso) return 'لم يدخل بعد'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d <= 0) return 'اليوم'
  if (d === 1) return 'أمس'
  if (d < 7) return `قبل ${d} أيام`
  if (d < 30) return `قبل ${Math.floor(d / 7)} أسابيع`
  return `قبل ${Math.floor(d / 30)} أشهر`
}

/**
 * One student = one panel. A teacher with four private students wants depth on
 * each of them, not a cohort dashboard — so the roster IS the home page.
 */
function StudentPanel({ s, activity }) {
  const name = studentName(s)
  const a = activity?.[s.id]
  const today = a?.today
  const initial = (name || 'ط').trim().charAt(0)
  const week = a?.weekLearningSec || 0
  const peak = Math.max(1, ...(a?.days || []).map((d) => d.learning_seconds || 0))
  const accent = accentFor(s.id)

  return (
    <div className="tea-student" style={{ '--accent': accent, '--accent-soft': `${accent}22` }}>
      <span className="tea-student__edge" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <div className="tea-student__avatar">{initial}</div>
        <div className="flex-1 min-w-0">
          <Link to={`/trainer/students/${s.id}`} className="text-[16px] font-extrabold text-slate-100 hover:text-sky-300 truncate block">
            {name}
          </Link>
          <div className="text-[12px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
            <span className="tea-pill tea-pill--sky !py-0.5 !px-2 !text-[11px]">المستوى {s.academic_level ?? '—'}</span>
            {s.uses_custom_curriculum && <span className="tea-pill tea-pill--gold !py-0.5 !px-2 !text-[11px]">مقرّر خاص</span>}
            {s.paused_at && <span className="tea-pill tea-pill--rose !py-0.5 !px-2 !text-[11px]">موقوف</span>}
            <span className="inline-flex items-center gap-1"><Flame size={12} className="text-amber-400" />{s.current_streak || 0}</span>
          </div>
        </div>
        {today
          ? <span className="tea-pill tea-pill--green !py-0.5 !px-2 !text-[11px] shrink-0">نشِط اليوم</span>
          : <span className="text-[11.5px] text-slate-500 shrink-0">{relTime(s.last_active_at)}</span>}
      </div>

      {/* Seven-day pulse — the shape of the week at a glance. */}
      <div className="tea-spark" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' })
            .format(new Date(Date.now() - (6 - i) * 86_400_000))
          const row = (a?.days || []).find((d) => d.activity_date === date)
          const sec = row?.learning_seconds || 0
          const h = sec ? Math.max(10, Math.round((sec / peak) * 100)) : 0
          return <span key={date} className="tea-spark__slot">{h > 0 && <span className="tea-spark__bar" style={{ height: `${h}%` }} />}</span>
        })}
      </div>

      <div className="text-[12px] text-slate-400 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1"><Clock size={12} />{fmtMinutes(week)} هذا الأسبوع</span>
        <span className="text-slate-600">·</span>
        <span>{a?.weekSections || 0} مهمة</span>
      </div>

      <div className="tea-student__actions">
        <Link to={`/trainer/students/${s.id}/content`} className="tea-act tea-act--lead">
          <BookOpen size={14} /> محتواه
        </Link>
        <Link to={`/trainer/students/${s.id}/performance`} className="tea-act">
          <TrendingUp size={14} /> أداؤه
        </Link>
        <Link to={`/trainer/students/${s.id}`} className="tea-act tea-act--icon" aria-label={`ملف ${name}`}>
          <ChevronLeft size={15} />
        </Link>
      </div>
    </div>
  )
}

export default function TeacherHome() {
  const profile = useAuthStore((s) => s.profile)
  const { students, studentIds, isLoading } = useTeacherRoster()
  const { data: activity } = useRosterActivity(studentIds, 7)

  const name = profile?.display_name || profile?.full_name || ''
  const activeToday = activity ? Object.values(activity).filter((a) => a.today).length : 0
  const weekSec = activity ? Object.values(activity).reduce((acc, a) => acc + (a.weekLearningSec || 0), 0) : 0

  return (
    <div className="tea-page space-y-5">
      <div className="tea-hero">
        <div className="tea-hero__glow" aria-hidden="true" />
        <div className="relative">
          <div className="text-[26px] font-extrabold text-slate-100">
            {greeting()}{name ? `، ${name}` : ''}
          </div>
          <div className="text-[13.5px] text-slate-400 mt-1">
            {new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            {students.length > 0 && ` — ${students.length} ${students.length === 1 ? 'طالب' : 'طلاب'} تحت متابعتك`}
          </div>
          {students.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              <span className="tea-pill tea-pill--green"><Activity size={13} /> {activeToday} نشِط اليوم</span>
              <span className="tea-pill tea-pill--sky"><Clock size={13} /> {fmtMinutes(weekSec)} هذا الأسبوع</span>
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="tea-skel h-52" />)}</div>}

      {!isLoading && students.length === 0 && (
        <div className="tea-empty">
          <Users size={32} className="tea-empty__icon" />
          <div className="font-bold text-slate-200">لم يُسنَد إليك أي طالب بعد</div>
          <div className="text-[12.5px] mt-1">بمجرّد إسناد طالب إليك سيظهر هنا بمحتواه وأدائه كاملاً.</div>
        </div>
      )}

      {students.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {students.map((s) => <StudentPanel key={s.id} s={s} activity={activity} />)}
        </div>
      )}
    </div>
  )
}
