import { useParams, Link } from 'react-router-dom'
import { BookOpen, ChevronRight, CheckCircle2, CircleDashed, Circle, Sparkles, ExternalLink } from 'lucide-react'
import { useStudentContent, sectionLabel } from '@/hooks/teacher/useStudentContent'
import { studentName } from '@/hooks/teacher/useTeacherRoster'

/** completed → started → untouched, so a glance says what is left to teach. */
function sectionState(row) {
  if (!row) return 'none'
  if (row.status === 'completed' || row.completed_at) return 'done'
  return 'started'
}

const STATE_ICON = { done: CheckCircle2, started: CircleDashed, none: Circle }
const STATE_CLASS = { done: 'is-done', started: 'is-started', none: 'is-none' }

function ProgressRing({ value = 0, size = 46 }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct === 100 ? '#4ade80' : '#38bdf8'} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="#e2e8f0" fontSize="12" fontWeight="800">{pct}</text>
    </svg>
  )
}

function UnitCard({ unit, index }) {
  const pct = Math.round(unit.progress?.percentage ?? 0)
  const byType = {}
  for (const s of unit.sections) byType[s.section_type] = s
  // Show the sections this unit actually has evidence for, plus the core six.
  const types = Array.from(new Set([
    'reading', 'listening', 'grammar', 'vocabulary', 'writing', 'speaking',
    ...unit.sections.map((s) => s.section_type),
  ]))

  return (
    <div className="tea-unit">
      <div className="tea-unit__head">
        {unit.cover_image_url
          ? <img src={unit.cover_image_url} alt="" className="tea-unit__cover" loading="lazy" />
          : <div className="tea-unit__cover tea-unit__cover--blank" aria-hidden="true"><BookOpen size={18} /></div>}
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] text-slate-500 font-bold">
            الوحدة {unit.unit_number ?? index + 1}
          </div>
          <div className="text-[15px] font-extrabold text-slate-100 truncate" dir="auto">
            {unit.theme_ar || unit.theme_en || 'وحدة'}
          </div>
          {unit.description_ar && (
            <p className="text-[12.5px] text-slate-400 mt-0.5 line-clamp-2" dir="auto">{unit.description_ar}</p>
          )}
        </div>
        <ProgressRing value={pct} />
      </div>

      <div className="tea-unit__sections">
        {types.map((t) => {
          const row = byType[t]
          const st = sectionState(row)
          const Icon = STATE_ICON[st]
          return (
            <span key={t} className={`tea-sec ${STATE_CLASS[st]}`}>
              <Icon size={12} />
              {sectionLabel(t)}
              {row?.score != null && <b className="tea-sec__score">{Math.round(row.score)}%</b>}
            </span>
          )
        })}
      </div>

      <Link to={`/trainer/curriculum/unit/${unit.id}`} className="tea-unit__open">
        افتح الوحدة كما يراها الطالب <ExternalLink size={13} />
      </Link>
    </div>
  )
}

export default function StudentContent() {
  const { studentId } = useParams()
  const { data, isLoading, error } = useStudentContent(studentId)

  if (isLoading) {
    return <div className="tea-page space-y-3"><div className="tea-skel h-28" /><div className="tea-skel h-40" /><div className="tea-skel h-40" /></div>
  }
  if (error || !data) {
    return <div className="tea-page"><div className="tea-empty">تعذّر تحميل محتوى الطالب.</div></div>
  }

  const name = studentName(data.student)
  const { units, isCustom, level } = data
  const done = units.filter((u) => Math.round(u.progress?.percentage ?? 0) === 100).length
  const started = units.filter((u) => {
    const p = Math.round(u.progress?.percentage ?? 0)
    return p > 0 && p < 100
  }).length

  return (
    <div className="tea-page space-y-5">
      <div className="tea-hero">
        <div className="tea-hero__glow" aria-hidden="true" />
        <div className="relative">
          <Link to={`/trainer/students/${studentId}`} className="text-[12.5px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
            <ChevronRight size={14} /> ملف {name}
          </Link>
          <h1 className="text-[25px] font-extrabold text-slate-100 mt-1.5">محتوى {name}</h1>
          <p className="text-[13.5px] text-slate-400 mt-1">
            هذه هي المادة التي يفتحها {name} فعلاً — لا قائمة عامة. حضّر منها قبل الحصة.
          </p>
          <div className="flex flex-wrap gap-2 mt-3.5">
            {isCustom
              ? <span className="tea-pill tea-pill--gold"><Sparkles size={13} /> مقرّر مُفصَّل خصيصاً</span>
              : <span className="tea-pill tea-pill--sky">{level?.name_ar || `المستوى ${data.student.academic_level ?? '—'}`}</span>}
            <span className="tea-pill">{units.length} وحدة</span>
            {done > 0 && <span className="tea-pill tea-pill--green">{done} مكتملة</span>}
            {started > 0 && <span className="tea-pill tea-pill--amber">{started} قيد التقدّم</span>}
          </div>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="tea-empty">
          <BookOpen size={30} className="tea-empty__icon" />
          <div className="font-bold text-slate-200">لا توجد وحدات منشورة لهذا الطالب بعد</div>
          <div className="text-[12.5px] mt-1">
            {isCustom ? 'مقرّره الخاص لم يُنشر بعد.' : 'لم يُربط الطالب بمستوى فيه وحدات منشورة.'}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {units.map((u, i) => <UnitCard key={u.id} unit={u} index={i} />)}
        </div>
      )}
    </div>
  )
}
