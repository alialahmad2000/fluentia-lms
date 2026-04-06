import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import useClassMode from '../../stores/classModeStore'

export default function AttendancePopup({ groupId, onClose }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const markAttendance = useClassMode(s => s.markAttendance)
  const attendanceMarked = useClassMode(s => s.attendanceMarked)
  const [statuses, setStatuses] = useState({}) // studentId -> 'present' | 'absent'
  const [saved, setSaved] = useState(false)
  const today = new Date().toISOString().split('T')[0]

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

  // Check if already marked today
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-today', groupId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', `${groupId}_${today}`)
      return data || []
    },
    enabled: !!groupId,
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

  const getName = (s) => s.profiles?.display_name || s.profiles?.full_name || 'طالب'
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
      const classId = `${groupId}_${today}`
      const records = Object.entries(statuses).map(([studentId, status]) => ({
        class_id: classId,
        student_id: studentId,
        status,
        checked_in_via: 'trainer',
      }))
      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'class_id,student_id' })
      if (error) throw error
    },
    onSuccess: () => {
      setSaved(true)
      markAttendance()
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      setTimeout(onClose, 2000)
    },
  })

  const alreadySaved = attendanceMarked || existingAttendance?.length > 0

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
            <span>✋</span> تسجيل الحضور
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Students */}
      <div className="overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 'calc(60vh - 140px)' }}>
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
          {presentCount}/{totalCount} حاضرين
        </span>
        {saved || alreadySaved ? (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
            <CheckCircle2 size={14} /> تم الحفظ
          </span>
        ) : (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-colors"
            style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            حفظ الحضور
          </button>
        )}
      </div>
    </motion.div>
  )
}
