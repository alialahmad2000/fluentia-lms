import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserCheck, UserX, Clock, CheckCircle2, XCircle, AlertCircle, Save, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr, formatTime } from '../../utils/dateHelpers'
import { XP_VALUES } from '../../lib/constants'

const STATUS_CONFIG = {
  present: { label: 'حاضر', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  absent:  { label: 'غائب', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  excused: { label: 'معذور', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
}

export default function TrainerAttendance() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedClass, setSelectedClass] = useState('')
  const [attendance, setAttendance] = useState({}) // { studentId: 'present' | 'absent' | 'excused' }
  const [saved, setSaved] = useState(false)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Recent classes (for dropdown)
  const { data: classes } = useQuery({
    queryKey: ['trainer-recent-classes', role],
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select('id, title, topic, date, start_time, group_id, groups(name, code)')
        .order('date', { ascending: false })
        .limit(20)
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Students for the selected class's group
  const selectedClassObj = classes?.find(c => c.id === selectedClass)
  const { data: students } = useQuery({
    queryKey: ['group-students-attendance', selectedClassObj?.group_id],
    queryFn: async () => {
      if (!selectedClassObj?.group_id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', selectedClassObj.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) console.error('[Attendance] Students query error:', error)
      return data || []
    },
    enabled: !!selectedClassObj?.group_id,
  })

  // Existing attendance for this class
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

  // Load existing when class changes
  useEffect(() => {
    if (existingAttendance && Object.keys(existingAttendance).length > 0) {
      setAttendance(existingAttendance)
    }
  }, [existingAttendance])

  function handleClassChange(classId) {
    setSelectedClass(classId)
    setAttendance({})
    setSaved(false)
  }

  function toggleStatus(studentId) {
    const current = attendance[studentId] || 'absent'
    const order = ['present', 'absent', 'excused']
    const next = order[(order.indexOf(current) + 1) % order.length]
    setAttendance(prev => ({ ...prev, [studentId]: next }))
    setSaved(false)
  }

  function getStudentName(s) {
    return s.profiles?.display_name || s.profiles?.full_name || 'طالب'
  }

  // Save attendance
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClass || !students?.length) return

      const records = students.map(s => ({
        class_id: selectedClass,
        student_id: s.id,
        status: attendance[s.id] || 'absent',
        checked_in_via: 'trainer',
        xp_awarded: attendance[s.id] === 'present' ? XP_VALUES.class_attendance : (attendance[s.id] === 'absent' ? XP_VALUES.penalty_absent : 0),
      }))

      // Upsert attendance records
      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'class_id,student_id' }).select()
      if (error) throw error

      // Award/deduct XP for each student
      for (const rec of records) {
        if (rec.xp_awarded !== 0) {
          // Check if XP already awarded for this class
          const { data: existing } = await supabase
            .from('xp_transactions')
            .select('id')
            .eq('student_id', rec.student_id)
            .eq('related_id', selectedClass)
            .in('reason', ['class_attendance', 'penalty_absent'])
            .limit(1)

          if (!existing?.length) {
            await supabase.from('xp_transactions').insert({
              student_id: rec.student_id,
              amount: rec.xp_awarded,
              reason: rec.xp_awarded > 0 ? 'class_attendance' : 'penalty_absent',
              related_id: selectedClass,
              awarded_by: profile?.id,
            }).select()
          }
        }
      }
    },
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['class-attendance'] })
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

      {/* Class selector */}
      <div>
        <label className="input-label">اختر الحصة</label>
        <select
          value={selectedClass}
          onChange={(e) => handleClassChange(e.target.value)}
          className="input-field"
        >
          <option value="">اختر حصة...</option>
          {classes?.map(c => (
            <option key={c.id} value={c.id}>
              {c.groups?.code} — {c.title || c.topic || 'حصة'} — {formatDateAr(c.date)}
            </option>
          ))}
        </select>
      </div>

      {selectedClass && students?.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="stat-card">
              <div className="stat-icon bg-emerald-500/10"><UserCheck size={20} className="text-emerald-400" /></div>
              <p className="stat-number text-3xl font-bold text-white">{presentCount}</p>
              <p className="stat-label">حاضر</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-red-500/10"><UserX size={20} className="text-red-400" /></div>
              <p className="stat-number text-3xl font-bold text-white">{absentCount}</p>
              <p className="stat-label">غائب</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-sky-500/10"><Clock size={20} className="text-sky-400" /></div>
              <p className="stat-number text-3xl font-bold text-white">{students.length}</p>
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
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
                      {getStudentName(s)[0]}
                    </div>
                    <span className="text-sm font-medium text-white">{getStudentName(s)}</span>
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

      {selectedClass && !students?.length && (
        <div className="glass-card p-12 text-center">
          <p className="text-muted">لا يوجد طلاب في مجموعة هذه الحصة</p>
        </div>
      )}
    </div>
  )
}
