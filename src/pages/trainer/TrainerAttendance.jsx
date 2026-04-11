import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserCheck, UserX, Clock, CheckCircle2, XCircle, AlertCircle, Save, Loader2, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr, formatTime } from '../../utils/dateHelpers'
import { XP_VALUES } from '../../lib/constants'

const STATUS_CONFIG = {
  present: { label: 'حاضر', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  absent:  { label: 'غائب', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  excused: { label: 'معذور', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
}

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TrainerAttendance() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  // NEW: the primary selector is now group + date, not "pick a class".
  // Previously, trainers who didn't pre-create classes in the calendar saw an
  // empty dropdown and had no way to mark attendance at all.
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [selectedClass, setSelectedClass] = useState('') // resolved class_id (from existing class or synthetic)
  const [attendance, setAttendance] = useState({}) // { studentId: 'present' | 'absent' | 'excused' }
  const [saved, setSaved] = useState(false)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role, profile?.id],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Auto-select first group
  useEffect(() => {
    if (groups?.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  // Resolve: is there already a class record for this group + date?
  // If yes, use it. If no, we'll create one the first time attendance is saved.
  const { data: existingClass } = useQuery({
    queryKey: ['attendance-class', selectedGroupId, selectedDate],
    queryFn: async () => {
      if (!selectedGroupId || !selectedDate) return null
      let q = supabase
        .from('classes')
        .select('id, title, topic, group_id, date')
        .eq('group_id', selectedGroupId)
        .eq('date', selectedDate)
        .order('start_time', { ascending: true })
        .limit(1)
      const { data, error } = await q
      if (error) { console.error('[Attendance] class lookup:', error); return null }
      return data?.[0] || null
    },
    enabled: !!selectedGroupId && !!selectedDate,
  })

  useEffect(() => {
    setSelectedClass(existingClass?.id || '')
  }, [existingClass])

  // Students in the selected group — independent of whether a class exists
  const { data: students } = useQuery({
    queryKey: ['group-students-attendance', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', selectedGroupId)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) console.error('[Attendance] Students query error:', error)
      return data || []
    },
    enabled: !!selectedGroupId,
  })

  // Existing attendance for this class (only if class already exists)
  const { data: existingAttendance } = useQuery({
    queryKey: ['class-attendance', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return {}
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', selectedClass)
      const map = {}
      for (const a of data || []) map[a.student_id] = a.status
      return map
    },
    enabled: !!selectedClass,
  })

  // Load existing when class changes — reset otherwise
  useEffect(() => {
    setAttendance(existingAttendance && Object.keys(existingAttendance).length > 0 ? existingAttendance : {})
    setSaved(false)
  }, [existingAttendance, selectedClass, selectedGroupId, selectedDate])

  function toggleStatus(studentId) {
    const current = attendance[studentId] || 'absent'
    const order = ['present', 'absent', 'excused']
    const next = order[(order.indexOf(current) + 1) % order.length]
    setAttendance(prev => ({ ...prev, [studentId]: next }))
    setSaved(false)
  }

  function getStudentName(s) {
    return s.profiles?.full_name || s.profiles?.display_name || 'طالب'
  }

  // Save attendance — if no class exists for this group+date, create one first.
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId || !students?.length) {
        throw new Error('اختر مجموعة وتأكد من وجود طلاب')
      }

      // Step 1: Resolve class_id — reuse existing or create a new one.
      let classId = selectedClass
      if (!classId) {
        const newClass = {
          group_id: selectedGroupId,
          date: selectedDate,
          title: 'حصة ' + selectedDate,
          topic: null,
          trainer_id: profile?.id,
        }
        const { data: created, error: createErr } = await supabase
          .from('classes')
          .insert(newClass)
          .select('id')
          .single()
        if (createErr) throw createErr
        classId = created.id
      }

      // Step 2: Build and upsert attendance records
      const records = students.map(s => ({
        class_id: classId,
        student_id: s.id,
        status: attendance[s.id] || 'absent',
        checked_in_via: 'trainer',
        xp_awarded: attendance[s.id] === 'present' ? XP_VALUES.class_attendance : (attendance[s.id] === 'absent' ? XP_VALUES.penalty_absent : 0),
      }))

      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'class_id,student_id' }).select()
      if (error) throw error

      // Step 3: Award/deduct XP for each student (idempotent per class)
      for (const rec of records) {
        if (rec.xp_awarded !== 0) {
          const { data: existing } = await supabase
            .from('xp_transactions')
            .select('id')
            .eq('student_id', rec.student_id)
            .eq('related_id', classId)
            .in('reason', ['class_attendance', 'penalty_absent'])
            .limit(1)

          if (!existing?.length) {
            await supabase.from('xp_transactions').insert({
              student_id: rec.student_id,
              amount: rec.xp_awarded,
              reason: rec.xp_awarded > 0 ? 'class_attendance' : 'penalty_absent',
              related_id: classId,
              awarded_by: profile?.id,
            }).select()
          }
        }
      }

      return classId
    },
    onSuccess: (classId) => {
      setSaved(true)
      if (classId) setSelectedClass(classId)
      queryClient.invalidateQueries({ queryKey: ['class-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-class'] })
    },
    onError: (err) => {
      console.error('[Attendance] Save error:', err)
      alert('فشل حفظ الحضور: ' + (err.message || 'حاول مرة أخرى'))
    },
  })

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title">تسجيل الحضور</h1>
        <p className="text-muted text-sm mt-1">سجّل حضور وغياب الطلاب</p>
      </div>

      {/* Group + date selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">المجموعة</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="input-field"
          >
            <option value="">اختر مجموعة...</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>
                {g.code ? `${g.code} — ${g.name}` : g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label flex items-center gap-2">
            <CalendarDays size={14} /> التاريخ
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {selectedGroupId && (
        <p className="text-muted text-xs -mt-6">
          {existingClass
            ? `حصة موجودة: ${existingClass.title || existingClass.topic || 'حصة'} — ${formatDateAr(selectedDate)}`
            : `لا توجد حصة لهذا التاريخ — سيتم إنشاؤها عند حفظ الحضور`}
        </p>
      )}

      {selectedGroupId && students?.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="fl-stat-card fl-stat-card--emerald">
              <div className="stat-icon bg-emerald-500/10"><UserCheck size={20} className="text-emerald-400" /></div>
              <p className="stat-number text-3xl font-bold text-[var(--text-primary)]">{presentCount}</p>
              <p className="stat-label">حاضر</p>
            </div>
            <div className="fl-stat-card fl-stat-card--amber">
              <div className="stat-icon bg-red-500/10"><UserX size={20} className="text-red-400" /></div>
              <p className="stat-number text-3xl font-bold text-[var(--text-primary)]">{absentCount}</p>
              <p className="stat-label">غائب</p>
            </div>
            <div className="fl-stat-card fl-stat-card--sky">
              <div className="stat-icon bg-sky-500/10"><Clock size={20} className="text-sky-400" /></div>
              <p className="stat-number text-3xl font-bold text-[var(--text-primary)]">{students.length}</p>
              <p className="stat-label">إجمالي</p>
            </div>
          </div>

          {/* Quick all-present button */}
          <button
            onClick={() => {
              const all = {}
              students.forEach(s => all[s.id] = 'present')
              setAttendance(all)
              setSaved(false)
            }}
            className="btn-secondary text-sm py-2"
          >
            <CheckCircle2 size={14} className="inline ml-1" /> تحديد الكل حاضر
          </button>

          {/* Student list */}
          <div className="space-y-3">
            {students.map((s, i) => {
              const status = attendance[s.id] || 'absent'
              const config = STATUS_CONFIG[status]
              const Icon = config.icon
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => toggleStatus(s.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border hover:translate-y-[-2px] transition-all duration-200 ${config.bg}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-primary)] font-bold">
                      {getStudentName(s)[0]}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{getStudentName(s)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon size={20} className={config.color} />
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary text-sm py-2 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ الحضور
            </button>
            {saved && <span className="text-emerald-400 text-sm">تم الحفظ ✓</span>}
          </div>
        </>
      )}

      {selectedGroupId && !students?.length && (
        <div className="fl-card-static p-12 text-center">
          <p className="text-muted">لا يوجد طلاب في هذه المجموعة</p>
        </div>
      )}
    </div>
  )
}
