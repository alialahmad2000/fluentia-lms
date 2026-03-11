import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Zap, Flame, Calendar, FileText, BarChart3, ChevronLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr } from '../../utils/dateHelpers'

const STATUS_LABELS = {
  present: { label: 'حاضر', color: 'text-emerald-400', icon: CheckCircle2 },
  absent: { label: 'غائب', color: 'text-red-400', icon: XCircle },
  excused: { label: 'معذور', color: 'text-amber-400', icon: AlertCircle },
}

export default function TrainerStudentView() {
  const { profile } = useAuthStore()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

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

  useEffect(() => {
    if (groups?.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id)
    }
  }, [groups, selectedGroup])

  // Students
  const { data: students } = useQuery({
    queryKey: ['group-students-view', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return []
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, current_streak, best_streak, gamification_level, academic_level, package, profiles:id(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .order('xp_total', { ascending: false })
      return data || []
    },
    enabled: !!selectedGroup,
  })

  // Student detail data
  const { data: attendanceHistory } = useQuery({
    queryKey: ['student-attendance', selectedStudent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('id, status, xp_awarded, classes:class_id(title, date)')
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent?.id,
  })

  const { data: submissions } = useQuery({
    queryKey: ['student-submissions', selectedStudent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, grade_numeric, submitted_at, assignments:assignment_id(title)')
        .eq('student_id', selectedStudent.id)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent?.id,
  })

  const { data: xpHistory } = useQuery({
    queryKey: ['student-xp', selectedStudent?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('id, amount, reason, created_at')
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent?.id,
  })

  function getStudentName(s) {
    return s.profiles?.display_name || s.profiles?.full_name || 'طالب'
  }

  const XP_REASON_LABELS = {
    class_attendance: 'حضور حصة',
    assignment_on_time: 'واجب في الوقت',
    assignment_late: 'واجب متأخر',
    correct_answer: 'إجابة صحيحة',
    helped_peer: 'مساعدة زميل',
    shared_summary: 'مشاركة ملخص',
    streak_bonus: 'مكافأة سلسلة',
    achievement: 'إنجاز',
    voice_note_bonus: 'مشاركة صوتية',
    writing_bonus: 'مشاركة كتابية',
    early_bird: 'حضور مبكر',
    daily_challenge: 'تحدي يومي',
    custom: 'مخصص',
    penalty_absent: 'غياب',
    penalty_unknown_word: 'كلمة غير معروفة',
    penalty_pronunciation: 'نطق خاطئ',
  }

  // If a student is selected, show detail view
  if (selectedStudent) {
    const name = getStudentName(selectedStudent)
    const presentCount = attendanceHistory?.filter(a => a.status === 'present').length || 0
    const totalAttendance = attendanceHistory?.length || 0
    const gradedSubs = submissions?.filter(s => s.grade_numeric != null) || []
    const avgGrade = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + s.grade_numeric, 0) / gradedSubs.length) : 0

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedStudent(null)}
          className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> رجوع للقائمة
        </button>

        {/* Student header */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sky-500/20 border-2 border-sky-500/30 flex items-center justify-center text-sky-400 text-2xl font-bold">
              {name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{name}</h2>
              <p className="text-sm text-muted">المستوى {selectedStudent.academic_level} • مستوى {selectedStudent.gamification_level}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Zap size={18} className="text-gold-400 mx-auto" />
              <p className="text-lg font-bold text-white mt-1">{selectedStudent.xp_total}</p>
              <p className="text-xs text-muted">XP</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Flame size={18} className="text-orange-400 mx-auto" />
              <p className="text-lg font-bold text-white mt-1">{selectedStudent.current_streak}</p>
              <p className="text-xs text-muted">سلسلة حالية</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Calendar size={18} className="text-emerald-400 mx-auto" />
              <p className="text-lg font-bold text-white mt-1">{totalAttendance > 0 ? Math.round(presentCount / totalAttendance * 100) : 0}%</p>
              <p className="text-xs text-muted">نسبة الحضور</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <BarChart3 size={18} className="text-sky-400 mx-auto" />
              <p className="text-lg font-bold text-white mt-1">{Math.round(avgGrade)}</p>
              <p className="text-xs text-muted">متوسط الدرجات</p>
            </div>
          </div>
        </div>

        {/* Tabs content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">سجل الحضور</h3>
            {attendanceHistory?.length === 0 && <p className="text-xs text-muted">لا يوجد سجل</p>}
            {attendanceHistory?.map(a => {
              const config = STATUS_LABELS[a.status] || STATUS_LABELS.absent
              const Icon = config.icon
              return (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm text-white">{a.classes?.title || 'حصة'}</p>
                    <p className="text-xs text-muted">{formatDateAr(a.classes?.date)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon size={14} className={config.color} />
                    <span className={`text-xs ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Submissions */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">الواجبات</h3>
            {submissions?.length === 0 && <p className="text-xs text-muted">لا توجد واجبات</p>}
            {submissions?.map(s => (
              <div key={s.id} className="p-3 bg-white/5 rounded-xl">
                <p className="text-sm text-white">{s.assignments?.title || 'واجب'}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted">{formatDateAr(s.submitted_at)}</p>
                  <div className="flex items-center gap-2">
                    {s.grade_numeric != null && (
                      <span className="text-xs font-bold text-sky-400">{s.grade_numeric}/100</span>
                    )}
                    <span className={`text-xs ${s.status === 'graded' ? 'text-emerald-400' : s.status === 'submitted' ? 'text-amber-400' : 'text-muted'}`}>
                      {s.status === 'graded' ? 'مُقيّم' : s.status === 'submitted' ? 'بانتظار التقييم' : s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* XP History */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">سجل النقاط</h3>
            {xpHistory?.length === 0 && <p className="text-xs text-muted">لا توجد نقاط</p>}
            {xpHistory?.map(xp => (
              <div key={xp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm text-white">{XP_REASON_LABELS[xp.reason] || xp.reason}</p>
                  <p className="text-xs text-muted">{formatDateAr(xp.created_at)}</p>
                </div>
                <span className={`text-sm font-bold ${xp.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {xp.amount > 0 ? '+' : ''}{xp.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Student list view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ملفات الطلاب</h1>
        <p className="text-muted text-sm mt-1">اطلع على بيانات وأداء كل طالب</p>
      </div>

      {/* Group selector */}
      {groups?.length > 1 && (
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(null) }}
          className="input-field py-2 px-3 text-sm w-auto"
        >
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      )}

      {/* Student cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students?.map((s, i) => {
          const name = getStudentName(s)
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedStudent(s)}
              className="glass-card p-5 text-right hover:border-sky-500/20 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg font-bold">
                  {name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-muted">المستوى {s.academic_level}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-gold-400">
                  <Zap size={12} /> {s.xp_total} XP
                </div>
                <div className="flex items-center gap-1 text-orange-400">
                  <Flame size={12} /> {s.current_streak} يوم
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {!students?.length && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted">لا يوجد طلاب في هذه المجموعة</p>
        </div>
      )}
    </div>
  )
}
