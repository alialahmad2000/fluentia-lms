import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import useClassMode from '../../stores/classModeStore'
import { useTranslation } from 'react-i18next'

export default function AttendancePopup({ groupId, onClose }) {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const markAttendance = useClassMode(s => s.markAttendance)
  const attendanceMarked = useClassMode(s => s.attendanceMarked)
  const [statuses, setStatuses] = useState({})
  const [classNumber, setClassNumber] = useState(1)
  const [saved, setSaved] = useState(false)

  // Get group's current unit
  const { data: group } = useQuery({
    queryKey: ['group-current-unit', groupId],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('current_unit_id').eq('id', groupId).single()
      return data
    },
    enabled: !!groupId,
  })

  const unitId = group?.current_unit_id

  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      return data || []
    },
    enabled: !!groupId,
  })

  // Check existing attendance for this unit + class_number
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-popup', groupId, unitId, classNumber],
    queryFn: async () => {
      if (!unitId) return []
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('unit_id', unitId)
        .eq('class_number', classNumber)
        .eq('group_id', groupId)
      return data || []
    },
    enabled: !!groupId && !!unitId,
  })

  // Initialize: all present, or load existing
  useEffect(() => {
    if (!students?.length) return
    const init = {}
    students.forEach(s => { init[s.id] = 'present' })
    if (existingAttendance?.length) {
      existingAttendance.forEach(a => { init[a.student_id] = a.status })
    }
    setStatuses(init)
  }, [students, existingAttendance])

  const getName = (s) => s.profiles?.full_name || s.profiles?.display_name || 'طالب'
  const presentCount = Object.values(statuses).filter(s => s === 'present').length
  const totalCount = students?.length || 0

  const toggleStatus = (id) => {
    setStatuses(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present',
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!unitId) throw new Error('لم يتم تحديد الوحدة الحالية للمجموعة')
      const records = Object.entries(statuses).map(([studentId, status]) => ({
        student_id: studentId,
        unit_id: unitId,
        class_number: classNumber,
        group_id: groupId,
        status,
        checked_in_via: 'trainer',
        recorded_by: profile?.id,
      }))
      const { data, error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,unit_id,class_number' })
        .select()
      if (error) throw error
      if (!data?.length) throw new Error('RLS prevented save')
    },
    onSuccess: () => {
      setSaved(true)
      markAttendance()
      queryClient.invalidateQueries({ queryKey: ['attendance-popup'] })
      queryClient.invalidateQueries({ queryKey: ['unit-attendance'] })
      setTimeout(onClose, 2000)
    },
  })

  const alreadySaved = attendanceMarked || existingAttendance?.length > 0

  if (!unitId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] z-[65] rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)' }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>✋ {t('trainer.students.action_record_attendance')}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">{t('trainer.attendance.no_unit', 'حدد الوحدة الحالية للمجموعة أولاً من لوحة التحكم')}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[320px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', maxHeight: '60vh' }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>✋</span> {t('trainer.students.action_record_attendance')}
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        {/* Class 1 / 2 toggle */}
        <div className="flex gap-1.5 mt-2">
          {[1, 2].map(cn => (
            <button
              key={cn}
              onClick={() => setClassNumber(cn)}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border transition-colors ${
                classNumber === cn
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cn === 1 ? t('trainer.attendance.class_1', 'الحصة ١') : t('trainer.attendance.class_2', 'الحصة ٢')}
            </button>
          ))}
        </div>
      </div>

      {/* Students */}
      <div className="overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 'calc(60vh - 160px)' }}>
        {students?.map(s => {
          const isPresent = statuses[s.id] === 'present'
          return (
            <button
              key={s.id}
              onClick={() => !saved && toggleStatus(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: isPresent ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
              }}
            >
              <span className="text-lg">{isPresent ? '✅' : '❌'}</span>
              <span className="text-[13px] font-medium flex-1 text-right" style={{ color: 'var(--text-primary)' }}>
                {getName(s)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {presentCount}/{totalCount} {t('trainer.debrief.attendance_present')}
        </span>
        {saved || alreadySaved ? (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
            <CheckCircle2 size={14} /> {t('common.saved')}
          </span>
        ) : (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-colors"
            style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {t('trainer.attendance.save_attendance', 'حفظ الحضور')}
          </button>
        )}
      </div>
    </motion.div>
  )
}
