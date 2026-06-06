import { Link } from 'react-router-dom'
import { Users, Flame, ChevronLeft } from 'lucide-react'
import { useTeacherRoster, useRosterActivity, studentName, fmtMinutes } from '@/hooks/teacher/useTeacherRoster'

function relTime(iso) {
  if (!iso) return 'لم يدخل بعد'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d <= 0) return 'اليوم'
  if (d === 1) return 'أمس'
  if (d < 7) return `قبل ${d} أيام`
  if (d < 30) return `قبل ${Math.floor(d / 7)} أسابيع`
  return `قبل ${Math.floor(d / 30)} أشهر`
}

function StudentCard({ s, activity }) {
  const name = studentName(s)
  const a = activity?.[s.id]
  const today = a?.today
  const initial = (name || 'ط').trim().charAt(0)
  return (
    <Link to={`/trainer/students/${s.id}`} className="tea-card tea-card--hover block">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl grid place-items-center font-extrabold text-[#06121f] shrink-0"
          style={{ background: 'linear-gradient(135deg,#38bdf8,#7dd3fc)' }}>{initial}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] truncate text-slate-100">{name}</div>
          <div className="text-[12px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
            <span className="tea-pill tea-pill--sky !py-0.5 !px-2 !text-[11px]">المستوى {s.academic_level ?? '—'}</span>
            {s.paused_at && <span className="tea-pill tea-pill--rose !py-0.5 !px-2 !text-[11px]">موقوف</span>}
            <span className="inline-flex items-center gap-1"><Flame size={12} className="text-amber-400" />{s.current_streak || 0}</span>
            <span>{(s.xp_total || 0).toLocaleString('ar')} نقطة</span>
          </div>
        </div>
        <div className="text-end shrink-0">
          {today ? (
            <span className="tea-pill tea-pill--green !py-0.5 !px-2 !text-[11px]">
              نشِط اليوم · {today.sections_completed || 0} مهمة
            </span>
          ) : (
            <span className="text-[11.5px] text-slate-500">{relTime(s.last_active_at)}</span>
          )}
          {a && a.weekLearningSec > 0 && (
            <div className="text-[11px] text-slate-500 mt-1">{fmtMinutes(a.weekLearningSec)} هذا الأسبوع</div>
          )}
        </div>
        <ChevronLeft size={18} className="text-slate-600 shrink-0" />
      </div>
    </Link>
  )
}

export default function StudentsList() {
  const { groups, students, studentIds, isLoading, error } = useTeacherRoster()
  const { data: activity } = useRosterActivity(studentIds, 7)

  if (isLoading) {
    return <div className="tea-page space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="tea-skel h-[76px]" />)}</div>
  }
  if (error) {
    return <div className="tea-page"><div className="tea-empty">تعذّر تحميل قائمة الطلاب.</div></div>
  }
  if (!students.length) {
    return (
      <div className="tea-page">
        <div className="tea-empty">
          <Users size={34} className="tea-empty__icon" />
          <div className="font-bold text-slate-200 mb-1">لا يوجد طلاب في مجموعاتك بعد</div>
          <div className="text-[13px]">سيظهر الطلاب هنا فور إسنادهم إلى مجموعاتك.</div>
        </div>
      </div>
    )
  }

  const byGroup = groups.map((g) => ({ group: g, list: students.filter((s) => s.group_id === g.id) }))
  const ungrouped = students.filter((s) => !groups.some((g) => g.id === s.group_id))
  if (ungrouped.length) byGroup.push({ group: { id: '__none__', name: 'بدون مجموعة' }, list: ungrouped })

  return (
    <div className="tea-page">
      <div className="tea-pagehead">
        <div className="tea-pagehead__title">طلابي</div>
        <div className="tea-pagehead__sub">{students.length} طالب في {groups.length} مجموعة</div>
      </div>
      <div className="space-y-7">
        {byGroup.filter((g) => g.list.length).map(({ group, list }) => (
          <section key={group.id}>
            <div className="tea-section-title">
              <Users size={15} /> {group.name} <span className="text-slate-500 font-medium">· {list.length}</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {list.map((s) => <StudentCard key={s.id} s={s} activity={activity} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
