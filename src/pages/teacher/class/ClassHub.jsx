import { Users } from 'lucide-react'
import { useTeacherRoster } from '@/hooks/teacher/useTeacherRoster'
import GroupClassCard from '@/components/teacher/class/GroupClassCard'

export default function ClassHub() {
  const { groups, students, isLoading, error } = useTeacherRoster()

  if (isLoading) return <div className="tea-page space-y-4">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="tea-skel h-64" />)}</div>
  if (error) return <div className="tea-page"><div className="tea-empty">تعذّر تحميل بيانات الكلاس.</div></div>
  if (!groups.length) return (
    <div className="tea-page"><div className="tea-empty"><Users size={32} className="tea-empty__icon" /><div className="font-bold text-slate-200">لا توجد مجموعات مُسندة إليك بعد</div></div></div>
  )

  return (
    <div className="tea-page space-y-5">
      <div className="tea-pagehead">
        <div className="tea-pagehead__title">الكلاس</div>
        <div className="tea-pagehead__sub">تحضير الدرس · الحضور · إسناد المهام لكل مجموعة</div>
      </div>
      {groups.map((g) => (
        <GroupClassCard key={g.id} group={g} students={students.filter((s) => s.group_id === g.id)} />
      ))}
    </div>
  )
}
