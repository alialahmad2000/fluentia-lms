import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Flame, Trophy, ListChecks, FileText, BarChart3, StickyNote, ChevronLeft, BookOpen, ArrowLeftRight } from 'lucide-react'
import { useStudentDetail, useStudentRecentActivity } from '@/hooks/teacher/useStudentDetail'
import { useStudentNotes, useAddTrainerNote } from '@/hooks/trainer/useStudent360'
import { studentName, fmtMinutes } from '@/hooks/teacher/useTeacherRoster'
import MoveStudentDialog from '@/components/teacher/students/MoveStudentDialog'
import AiInsightSection from '@/components/teacher/students/AiInsightSection'

const NOTE_TYPES = [
  ['observation', 'ملاحظة', 'tea-pill'],
  ['encouragement', 'تشجيع', 'tea-pill--green'],
  ['warning', 'تنبيه', 'tea-pill--rose'],
]

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

function NotesPanel({ studentId }) {
  const { data: notes = [] } = useStudentNotes(studentId)
  const add = useAddTrainerNote(studentId)
  const [text, setText] = useState('')
  const [type, setType] = useState('observation')
  const typeMeta = (t) => NOTE_TYPES.find(([k]) => k === t) || NOTE_TYPES[0]
  return (
    <div className="tea-card">
      <div className="tea-section-title"><StickyNote size={15} /> ملاحظاتي ومتابعتي للطالب</div>
      <div className="flex gap-1.5 mb-2.5">
        {NOTE_TYPES.map(([k, label, cls]) => (
          <button key={k} type="button" onClick={() => setType(k)}
            className={`tea-pill ${type === k ? cls : ''} !text-[12px] cursor-pointer ${type === k ? '' : 'opacity-70'}`}>{label}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أضف ملاحظة أو تنبيه متابعة…" dir="auto"
          className="flex-1 text-[13px] rounded-lg bg-black/25 border border-white/10 px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none" />
        <button type="button" disabled={add.isPending || !text.trim()}
          onClick={() => add.mutate({ text: text.trim(), type }, { onSuccess: () => setText('') })}
          className="tea-btn tea-btn--primary !py-2 !px-3 !text-[13px] disabled:opacity-50">{add.isPending ? '…' : 'إضافة'}</button>
      </div>
      <div className="space-y-2">
        {notes.length === 0 && <div className="text-[12.5px] text-slate-500">لا توجد ملاحظات بعد.</div>}
        {notes.map((n) => (
          <div key={n.id} className="text-[13px] text-slate-300 bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2" dir="auto">
            <div className="flex items-center gap-2 mb-1">
              <span className={`tea-pill ${typeMeta(n.note_type)[2]} !py-0.5 !px-2 !text-[10.5px]`}>{typeMeta(n.note_type)[1]}</span>
              <span className="text-[11px] text-slate-500">{new Date(n.created_at).toLocaleDateString('ar')}</span>
            </div>
            {n.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StudentProfile() {
  const { studentId } = useParams()
  const { data, isLoading, error } = useStudentDetail(studentId)
  const { data: recent = [] } = useStudentRecentActivity(studentId, 14)
  const [moveOpen, setMoveOpen] = useState(false)

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
              {s.package && <span className="text-slate-500">{s.package}</span>}
            </div>
            <button type="button" onClick={() => setMoveOpen(true)}
              className="mt-2 text-[12px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
              <ArrowLeftRight size={13} /> نقل لمجموعة أخرى
            </button>
          </div>
          <div className="hidden sm:flex gap-4 text-center">
            <div><div className="text-lg font-extrabold text-amber-300 flex items-center gap-1 justify-center"><Flame size={16} />{s.current_streak || 0}</div><div className="text-[11px] text-slate-500">أيام متتالية</div></div>
            <div><div className="text-lg font-extrabold text-sky-300 flex items-center gap-1 justify-center"><Trophy size={16} />{(s.xp_total || 0).toLocaleString('ar')}</div><div className="text-[11px] text-slate-500">نقطة</div></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <Link to={`/trainer/students/${studentId}/answers`} className="tea-btn tea-btn--primary !justify-between"><span className="flex items-center gap-2"><FileText size={16} />كل الإجابات</span><ChevronLeft size={16} /></Link>
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

      <NotesPanel studentId={studentId} />

      {moveOpen && (
        <MoveStudentDialog
          studentId={studentId}
          currentGroupId={s.group_id}
          studentName={name}
          onClose={() => setMoveOpen(false)}
        />
      )}
    </div>
  )
}
