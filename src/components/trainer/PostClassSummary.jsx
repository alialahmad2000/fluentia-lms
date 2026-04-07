import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { toast } from '../ui/FluentiaToast'

export default function PostClassSummary({ groupId, unitId, classStartedAt, pointsGiven, onClose }) {
  const { profile } = useAuthStore()
  const [trainerNote, setTrainerNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Duration
  const durationMinutes = useMemo(() => {
    if (!classStartedAt) return 0
    return Math.round((Date.now() - new Date(classStartedAt).getTime()) / 60000)
  }, [classStartedAt])

  // Get students for names
  const { data: students = [] } = useQuery({
    queryKey: ['post-class-students', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!groupId,
  })

  // Get today's attendance
  const today = new Date().toISOString().split('T')[0]
  const { data: attendance } = useQuery({
    queryKey: ['post-class-attendance', groupId, today],
    queryFn: async () => {
      const classId = `${groupId}_${today}`
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', classId)
      return data || []
    },
    enabled: !!groupId,
  })

  // Get today's notes for this group
  const { data: sessionNotes = [] } = useQuery({
    queryKey: ['post-class-notes', groupId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, student_id, students:student_id(profiles(display_name, full_name))')
        .eq('group_id', groupId)
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!groupId,
  })

  const studentMap = useMemo(() => {
    const map = {}
    students.forEach(s => { map[s.id] = s.profiles?.full_name || s.profiles?.display_name || 'طالب' })
    return map
  }, [students])

  // Points aggregation
  const pointsSummary = useMemo(() => {
    const map = {}
    ;(pointsGiven || []).forEach(p => {
      if (!map[p.student_id]) map[p.student_id] = { points: 0, count: 0 }
      map[p.student_id].points += p.points || 0
      map[p.student_id].count += 1
    })
    return Object.entries(map)
      .map(([id, data]) => ({ student_id: id, name: studentMap[id] || 'طالب', ...data }))
      .sort((a, b) => b.points - a.points)
  }, [pointsGiven, studentMap])

  const attendancePresent = attendance?.filter(a => a.status === 'present').length || 0
  const absentNames = attendance?.filter(a => a.status === 'absent').map(a => studentMap[a.student_id]).filter(Boolean) || []

  // Save summary
  const saveSummary = async (shareWithStudents) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('class_summaries').insert({
        group_id: groupId,
        unit_id: unitId || null,
        class_date: today,
        duration_minutes: durationMinutes,
        attendance_count: attendancePresent,
        total_students: students.length,
        points_summary: pointsSummary,
        trainer_notes: trainerNote || null,
        created_by: profile.id,
        shared_with_students: shareWithStudents,
      })
      if (error) throw error
      toast({ type: 'success', title: shareWithStudents ? 'تم الحفظ والمشاركة مع الطلاب' : 'تم حفظ الملخص' })
      onClose()
    } catch (err) {
      toast({ type: 'error', title: 'خطأ في الحفظ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[440px] sm:max-h-[80vh] z-[71] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-bold font-['Tajawal'] flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>📋</span> ملخص الحصة
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Duration & Attendance */}
          <div className="flex items-center gap-4 text-[13px] font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
            <span>⏱ {durationMinutes} دقيقة</span>
            <span>✋ {attendancePresent}/{students.length} حضور</span>
          </div>
          {absentNames.length > 0 && (
            <p className="text-[11px] font-['Tajawal'] text-amber-400/80">
              غياب: {absentNames.join('، ')}
            </p>
          )}

          {/* Points */}
          {pointsSummary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>🎯 النقاط المعطاة:</p>
              {pointsSummary.map(p => (
                <p key={p.student_id} className="text-[12px] font-['Tajawal'] pr-3" style={{ color: 'var(--text-tertiary)' }}>
                  • {p.name}: +{p.points} ({p.count} مشاركة)
                </p>
              ))}
              {students.filter(s => !pointsSummary.find(p => p.student_id === s.id)).map(s => (
                <p key={s.id} className="text-[12px] font-['Tajawal'] pr-3" style={{ color: 'var(--text-muted)' }}>
                  • {studentMap[s.id]}: ٠ (لم تشارك)
                </p>
              ))}
            </div>
          )}

          {/* Session notes */}
          {sessionNotes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>📝 ملاحظاتك خلال الحصة:</p>
              {sessionNotes.map(n => (
                <p key={n.id} className="text-[12px] font-['Tajawal'] pr-3" style={{ color: 'var(--text-tertiary)' }}>
                  • {n.students?.profiles?.full_name || n.students?.profiles?.display_name || ''}: "{n.message || n.title}"
                </p>
              ))}
            </div>
          )}

          {/* Trainer note */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>✏️ أضف ملاحظة على الحصة:</p>
            <textarea
              value={trainerNote}
              onChange={(e) => setTrainerNote(e.target.value)}
              placeholder="شرحنا القاعدة وتدربنا على..."
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm font-['Tajawal'] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              style={{ background: 'var(--surface-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => saveSummary(true)}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold font-['Tajawal'] transition-colors disabled:opacity-50"
            style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-sky)' }}
          >
            📤 أرسل للطلاب
          </button>
          <button
            onClick={() => saveSummary(false)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-[13px] font-bold font-['Tajawal'] transition-colors disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
          >
            💾 حفظ فقط
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2.5 rounded-xl text-[13px] font-['Tajawal'] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            تخطي
          </button>
        </div>
      </motion.div>
    </>
  )
}
