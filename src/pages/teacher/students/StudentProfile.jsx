import { useParams, Link } from 'react-router-dom'
import { Flame, Trophy, ListChecks, FileText, BarChart3, ChevronLeft, BookOpen, TrendingUp } from 'lucide-react'
import { useStudentDetail, useStudentRecentActivity } from '@/hooks/teacher/useStudentDetail'
import { studentName, fmtMinutes } from '@/hooks/teacher/useTeacherRoster'
import AiInsightSection from '@/components/teacher/students/AiInsightSection'

// This account is read-only by design: no trainer notes, no group moves, no
// grading. Those panels were removed rather than left to fail silently against
// the row-level policies. The routes and data they used are untouched.

// students.package holds English slugs; only render the ones we have Arabic for
// rather than leaking a raw value like "private" into an Arabic surface.
const PACKAGE_AR = {
  private: 'دروس فردية',
  group: 'مجموعة',
  intensive: 'مكثّف',
  standard: 'اعتيادي',
}

const SKILLS = [
  ['reading', 'القراءة', '#38bdf8'], ['grammar', 'القواعد', '#a78bfa'],
  ['listening', 'الاستماع', '#4ade80'], ['writing', 'الكتابة', '#f59e0b'],
  ['speaking', 'المحادثة', '#fb7185'], ['vocabulary', 'المفردات', '#2dd4bf'],
]

function SkillBars({ skill }) {
  if (!skill) return <div className="text-[13px] text-slate-500">لا توجد بيانات مهارات بعد.</div>
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {SKILLS.map(([k, label, color]) => {
        const v = Math.round(skill[k] ?? 0)
        return (
          <div key={k}>
            <div className="flex justify-between text-[12.5px] mb-1"><span className="text-slate-300">{label}</span><span className="text-slate-400 font-bold">{v}%</span></div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} /></div>
          </div>
        )
      })}
    </div>
  )
}

export default function StudentProfile() {
  const { studentId } = useParams()
  const { data, isLoading, error } = useStudentDetail(studentId)
  const { data: recent = [] } = useStudentRecentActivity(studentId, 14)

  if (isLoading) return <div className="tea-page space-y-3"><div className="tea-skel h-24" /><div className="tea-skel h-40" /></div>
  if (error || !data?.student) return <div className="tea-page"><div className="tea-empty">تعذّر تحميل ملف الطالب.</div></div>

  const s = data.student
  const name = studentName(s)
  const initial = (name || 'ط').trim().charAt(0)
  const weekSec = recent.reduce((a, r) => a + (r.learning_seconds || 0), 0)
  const weekSections = recent.reduce((a, r) => a + (r.sections_completed || 0), 0)

  return (
    <div className="tea-page space-y-5">
      {/* Header */}
      <div className="tea-card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-extrabold text-xl text-[#06121f] shrink-0"
            style={{ background: 'linear-gradient(135deg,#38bdf8,#7dd3fc)' }}>{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[20px] font-extrabold text-slate-100">{name}</div>
            <div className="text-[13px] text-slate-400 flex flex-wrap items-center gap-2 mt-1">
              <span className="tea-pill tea-pill--sky !py-0.5 !px-2 !text-[11px]">المستوى {s.academic_level ?? '—'}</span>
              {s.groups?.name && <span className="tea-pill !py-0.5 !px-2 !text-[11px]">{s.groups.name}</span>}
              {PACKAGE_AR[s.package] && <span className="tea-pill !py-0.5 !px-2 !text-[11px]">{PACKAGE_AR[s.package]}</span>}
            </div>
          </div>
          <div className="hidden sm:flex gap-4 text-center">
            <div><div className="text-lg font-extrabold text-amber-300 flex items-center gap-1 justify-center"><Flame size={16} />{s.current_streak || 0}</div><div className="text-[11px] text-slate-500">أيام متتالية</div></div>
            <div><div className="text-lg font-extrabold text-sky-300 flex items-center gap-1 justify-center"><Trophy size={16} />{(s.xp_total || 0).toLocaleString('ar')}</div><div className="text-[11px] text-slate-500">نقطة</div></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
          <Link to={`/trainer/students/${studentId}/content`} className="tea-btn tea-btn--primary !justify-between"><span className="flex items-center gap-2"><BookOpen size={16} />محتوى الطالب</span><ChevronLeft size={16} /></Link>
          <Link to={`/trainer/students/${studentId}/performance`} className="tea-btn !justify-between"><span className="flex items-center gap-2"><TrendingUp size={16} />الأداء عبر الوقت</span><ChevronLeft size={16} /></Link>
          <Link to={`/trainer/students/${studentId}/answers`} className="tea-btn !justify-between"><span className="flex items-center gap-2"><FileText size={16} />كل الإجابات</span><ChevronLeft size={16} /></Link>
          <Link to={`/trainer/students/${studentId}/report`} className="tea-btn !justify-between"><span className="flex items-center gap-2"><BarChart3 size={16} />تقرير النشاط</span><ChevronLeft size={16} /></Link>
          <div className="tea-card !p-2.5 text-center"><div className="text-[15px] font-extrabold text-slate-100">{fmtMinutes(weekSec)}</div><div className="text-[11px] text-slate-500">تعلّم (14 يوم)</div></div>
          <div className="tea-card !p-2.5 text-center"><div className="text-[15px] font-extrabold text-slate-100">{weekSections}</div><div className="text-[11px] text-slate-500">مهمة مكتملة</div></div>
        </div>
      </div>

      <AiInsightSection studentId={studentId} />

      {/* Skills */}
      <div className="tea-card">
        <div className="tea-section-title"><BarChart3 size={15} /> المهارات الحالية</div>
        <SkillBars skill={data.skill} />
      </div>

      {/* Unit progress */}
      <div className="tea-card">
        <div className="tea-section-title"><BookOpen size={15} /> التقدّم في الوحدات</div>
        {data.progress.length === 0 ? (
          <div className="text-[13px] text-slate-500">لم يبدأ الطالب أي وحدة بعد.</div>
        ) : (
          <div className="space-y-2.5">
            {data.progress.slice(0, 14).map((u) => (
              <div key={u.unit_id} className="flex items-center gap-3">
                <div className="text-[12.5px] text-slate-300 w-44 shrink-0 truncate">
                  {u.curriculum_units?.unit_number ? `${u.curriculum_units.unit_number}. ` : ''}{u.curriculum_units?.theme_ar || u.curriculum_units?.theme_en || 'وحدة'}
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-sky-400 to-sky-300" style={{ width: `${u.percentage || 0}%` }} />
                </div>
                <div className="text-[12px] font-bold text-slate-400 w-10 text-end">{u.percentage || 0}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="tea-card">
        <div className="tea-section-title"><ListChecks size={15} /> النشاط اليومي (آخر 14 يوم)</div>
        {recent.length === 0 ? (
          <div className="text-[13px] text-slate-500">لا يوجد نشاط مسجّل.</div>
        ) : (
          <div className="space-y-1.5">
            {recent.map((d) => (
              <div key={d.activity_date} className="flex items-center justify-between text-[12.5px] py-1.5 border-b border-white/5 last:border-0">
                <span className="text-slate-400">{d.activity_date}</span>
                <span className="flex items-center gap-3 text-slate-300">
                  <span>{fmtMinutes(d.learning_seconds)}</span>
                  <span className="text-slate-500">·</span>
                  <span>{d.sections_completed || 0} مهمة</span>
                  {d.words_mastered ? <><span className="text-slate-500">·</span><span>{d.words_mastered} كلمة</span></> : null}
                  {d.xp_earned ? <span className="text-amber-300">+{d.xp_earned}</span> : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
