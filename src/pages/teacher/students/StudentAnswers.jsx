import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Inbox } from 'lucide-react'
import { useStudentAnswers } from '@/hooks/teacher/useStudentAnswers'
import { useStudentDetail } from '@/hooks/teacher/useStudentDetail'
import { studentName } from '@/hooks/teacher/useTeacherRoster'
import AnswerItem from '@/components/teacher/answers/AnswerItem'

const FILTERS = [
  ['all', 'الكل'], ['reading', 'القراءة'], ['grammar', 'القواعد'], ['listening', 'الاستماع'],
  ['writing', 'الكتابة'], ['speaking', 'المحادثة'], ['vocabulary', 'المفردات'],
]

export default function StudentAnswers() {
  const { studentId } = useParams()
  const { data, isLoading, error } = useStudentAnswers(studentId)
  const { data: detail } = useStudentDetail(studentId)
  const [filter, setFilter] = useState('all')

  const groups = useMemo(() => {
    const gs = data?.unitGroups || []
    if (filter === 'all') return gs
    const match = (st) => filter === 'vocabulary'
      ? (st === 'vocabulary' || st === 'vocabulary_exercise')
      : st === filter
    return gs
      .map((g) => ({ ...g, items: g.items.filter((it) => match(it.section_type)) }))
      .filter((g) => g.items.length)
  }, [data, filter])

  const name = detail?.student ? studentName(detail.student) : ''

  return (
    <div className="tea-page">
      <div className="tea-pagehead flex items-start justify-between gap-3">
        <div>
          <div className="tea-pagehead__title">كل إجابات الطالب</div>
          <div className="tea-pagehead__sub">{name ? `${name} · ` : ''}{data?.totalItems ?? 0} نشاط</div>
        </div>
        <Link to={`/trainer/students/${studentId}`} className="tea-btn !py-1.5 !px-3 !text-[13px] flex items-center gap-1">
          <ChevronRight size={15} /> الملف
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-bold border transition-colors ${
              filter === k ? 'bg-sky-500/15 border-sky-500/35 text-sky-200' : 'bg-white/[0.03] border-white/8 text-slate-400 hover:text-slate-200'
            }`}>{label}</button>
        ))}
      </div>

      {isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="tea-skel h-28" />)}</div>}
      {error && <div className="tea-empty">تعذّر تحميل الإجابات.</div>}
      {!isLoading && !error && groups.length === 0 && (
        <div className="tea-empty">
          <Inbox size={32} className="tea-empty__icon" />
          <div className="font-bold text-slate-200 mb-1">لا توجد إجابات لعرضها</div>
          <div className="text-[13px]">لم يُسجّل الطالب أي عمل ضمن هذا التصفية بعد.</div>
        </div>
      )}

      <div className="space-y-7">
        {groups.map((g) => (
          <section key={g.unitId}>
            <div className="tea-section-title">
              {g.unit ? `${g.unit.unit_number ? `الوحدة ${g.unit.unit_number} · ` : ''}${g.unit.theme_ar || g.unit.theme_en || ''}` : 'أنشطة أخرى'}
              <span className="text-slate-500 font-medium">· {g.items.length}</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {g.items.map((it) => <AnswerItem key={`${it.kind}-${it.id}`} item={it} readingQ={data.readingQ} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
