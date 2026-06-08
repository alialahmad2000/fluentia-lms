import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, XCircle, Clock3, UserCheck, Plus, Sparkles, ChevronLeft, Target, Lock, Unlock } from 'lucide-react'
import { useCurriculumUnits, useTodayAttendance, useMarkAttendance, useCreateAssignment, useGroupAssignments } from '@/hooks/teacher/useClassHub'
import { useGroupUnitLocks, useToggleUnitLock } from '@/hooks/teacher/useUnitLocks'
import { useSetGroupFocus } from '@/hooks/teacher/useRosterActions'
import { useClassInsight } from '@/hooks/teacher/useInsights'
import { useRosterActivity, studentName } from '@/hooks/teacher/useTeacherRoster'

const ATT = [
  ['present', 'حاضر', CheckCircle2, '#4ade80'],
  ['late', 'متأخر', Clock3, '#f59e0b'],
  ['absent', 'غائب', XCircle, '#fb7185'],
]

function FocusPicker({ group, units }) {
  const setFocus = useSetGroupFocus()
  const [editing, setEditing] = useState(false)
  const levelUnits = units.filter((u) => !group.level || u.curriculum_levels?.level_number === group.level)
  const current = units.find((u) => u.id === group.current_unit_id)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Target size={14} className="text-sky-400" />
      <span className="text-[12.5px] text-slate-400">الوحدة الحالية:</span>
      {editing ? (
        <select autoFocus defaultValue={group.current_unit_id || ''}
          onChange={(e) => { setFocus.mutate({ groupId: group.id, unitId: e.target.value || null }); setEditing(false) }}
          onBlur={() => setEditing(false)}
          className="text-[12.5px] bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-slate-200 max-w-[240px]">
          <option value="">— بدون —</option>
          {levelUnits.map((u) => <option key={u.id} value={u.id}>الوحدة {u.unit_number} · {u.theme_ar || u.theme_en}</option>)}
        </select>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-[12.5px] font-bold text-slate-100 hover:text-sky-300">
          {current ? `الوحدة ${current.unit_number} · ${current.theme_ar || current.theme_en}` : 'تعيين وحدة'} ✎
        </button>
      )}
    </div>
  )
}

function AttendanceRow({ s, groupId, classNumber, unitId, record }) {
  const mark = useMarkAttendance()
  const name = studentName(s)
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="flex-1 text-[13px] text-slate-200 truncate">{name}</span>
      <div className="flex gap-1">
        {ATT.map(([val, label, Icon, color]) => {
          const active = record?.status === val
          return (
            <button key={val} type="button" disabled={mark.isPending}
              onClick={() => mark.mutate({ existingId: record?.id, studentId: s.id, groupId, classNumber, status: val, unitId })}
              title={label}
              className="w-8 h-8 rounded-lg grid place-items-center border transition-colors"
              style={active ? { background: `${color}22`, borderColor: `${color}55`, color } : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' }}>
              <Icon size={15} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClassInsightPanel({ groupId }) {
  const [on, setOn] = useState(false)
  const { data, isLoading, error } = useClassInsight(groupId, { enabled: on })
  const ins = data?.insights || data
  if (!on) return <button type="button" onClick={() => setOn(true)} className="tea-btn !text-[13px] flex items-center gap-2"><Sparkles size={14} /> تحليل المجموعة بالذكاء</button>
  if (isLoading) return <div className="tea-skel h-24" />
  if (error || !ins) return <div className="text-[13px] text-slate-500">تعذّر تحليل المجموعة الآن.</div>
  const List = ({ title, items, color }) => Array.isArray(items) && items.length ? (
    <div><div className="text-[12px] font-bold mb-1" style={{ color }}>{title}</div><ul className="text-[12.5px] text-slate-300 space-y-0.5 list-disc ps-5" dir="rtl">{items.slice(0, 5).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  ) : null
  return (
    <div className="space-y-2.5" dir="rtl">
      {ins.summary_ar && <p className="text-[13px] text-slate-200 leading-relaxed">{ins.summary_ar}</p>}
      <List title="نقاط القوة" items={ins.group_strengths} color="#4ade80" />
      <List title="نقاط تحتاج عمل" items={ins.group_weaknesses} color="#fb7185" />
      <List title="تركيز الدروس القادمة" items={ins.lesson_focus} color="#38bdf8" />
    </div>
  )
}

function AssignForm({ groupId }) {
  const create = useCreateAssignment()
  const { data: assignments = [] } = useGroupAssignments(groupId)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  return (
    <div>
      {assignments.length > 0 && (
        <div className="space-y-1 mb-2">
          {assignments.slice(0, 4).map((a) => (
            <div key={a.id} className="text-[12px] text-slate-400 flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-sky-400" />{a.title}{a.deadline && <span className="text-slate-600">· {new Date(a.deadline).toLocaleDateString('ar')}</span>}</div>
          ))}
        </div>
      )}
      {open ? (
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة…" dir="auto"
            className="w-full text-[13px] rounded-lg bg-black/25 border border-white/10 px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none" />
          <div className="flex items-center gap-2">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="text-[12.5px] rounded-lg bg-black/25 border border-white/10 px-2 py-1.5 text-slate-300" />
            <button type="button" disabled={create.isPending || !title.trim()}
              onClick={() => create.mutate({ groupId, title: title.trim(), deadline: deadline || null }, { onSuccess: () => { setTitle(''); setDeadline(''); setOpen(false) } })}
              className="tea-btn tea-btn--primary !py-1.5 !px-3 !text-[13px] disabled:opacity-50">{create.isPending ? '…' : 'إسناد'}</button>
            <button type="button" onClick={() => setOpen(false)} className="tea-btn tea-btn--ghost !py-1.5 !px-3 !text-[13px]">إلغاء</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="tea-btn !text-[13px] flex items-center gap-2"><Plus size={14} /> إسناد مهمة للمجموعة</button>
      )}
    </div>
  )
}

function UnitLockControl({ group, units }) {
  const { data: locked = new Set() } = useGroupUnitLocks(group.id)
  const toggle = useToggleUnitLock()
  const [open, setOpen] = useState(false)
  const levelUnits = units.filter((u) => !group.level || u.curriculum_levels?.level_number === group.level)
  if (!levelUnits.length) return null
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="tea-btn !text-[13px] flex items-center gap-2">
        <Lock size={14} /> التحكم في الوصول للوحدات
        {locked.size > 0 && <span className="tea-pill tea-pill--amber !py-0 !px-1.5 !text-[10px]">{locked.size} مقفلة</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-0.5 max-h-64 overflow-y-auto rounded-lg bg-black/15 border border-white/8 p-2">
          {levelUnits.map((u) => {
            const isLocked = locked.has(u.id)
            return (
              <div key={u.id} className="flex items-center gap-2 text-[12.5px] py-1">
                <span className="flex-1 text-slate-300 truncate">الوحدة {u.unit_number} · {u.theme_ar || u.theme_en}</span>
                <button type="button" disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ groupId: group.id, unitId: u.id, locked: !isLocked })}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] ${isLocked ? 'bg-amber-500/12 border-amber-500/30 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
                  {isLocked ? <><Lock size={11} /> مقفلة</> : <><Unlock size={11} /> مفتوحة</>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function GroupClassCard({ group, students }) {
  const { data: units = [] } = useCurriculumUnits()
  const [classNumber, setClassNumber] = useState(1)
  const { data: attendance = {} } = useTodayAttendance(group.id, classNumber)
  const studentIds = useMemo(() => students.map((s) => s.id), [students])
  const { data: activity } = useRosterActivity(studentIds, 7)
  const activeToday = activity ? students.filter((s) => activity[s.id]?.today).length : 0
  const focusUnitId = group.current_unit_id

  return (
    <section className="tea-card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="tea-section-title !mb-0"><BookOpen size={15} /> {group.name} <span className="text-slate-500 font-medium">· {students.length} طالب</span></div>
        <span className="text-[12px] text-emerald-300">{activeToday}/{students.length} نشِط اليوم</span>
      </div>

      <FocusPicker group={group} units={units} />

      {/* Attendance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-bold text-slate-300 flex items-center gap-1.5"><UserCheck size={14} className="text-sky-400" /> الحضور</div>
          <div className="flex gap-1">
            {[1, 2].map((n) => (
              <button key={n} type="button" onClick={() => setClassNumber(n)}
                className={`text-[11.5px] px-2.5 py-1 rounded-md border ${classNumber === n ? 'bg-sky-500/15 border-sky-500/35 text-sky-200' : 'bg-white/[0.03] border-white/8 text-slate-400'}`}>كلاس {n}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {students.map((s) => <AttendanceRow key={s.id} s={s} groupId={group.id} classNumber={classNumber} unitId={focusUnitId} record={attendance[s.id]} />)}
        </div>
      </div>

      {/* Control + insight */}
      <div className="space-y-3 pt-1">
        <AssignForm groupId={group.id} />
        <UnitLockControl group={group} units={units} />
        <ClassInsightPanel groupId={group.id} />
      </div>

      <Link to="/trainer/students" className="text-[12px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">عرض ملفات الطلاب <ChevronLeft size={13} /></Link>
    </section>
  )
}
