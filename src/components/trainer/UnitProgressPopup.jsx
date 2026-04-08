import { motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function UnitProgressPopup({ groupId, unitId, onClose }) {
  const navigate = useNavigate()

  // Get students in group with their unit progress
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['unit-progress-live', groupId, unitId],
    queryFn: async () => {
      // Get students
      const { data: students } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')

      if (!students?.length) return { students: [], sections: {} }

      const studentIds = students.map(s => s.id)

      // Get progress for all students in this unit
      const { data: progress } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, section_type, status')
        .eq('unit_id', unitId)
        .in('student_id', studentIds)

      // Calculate per-student overall progress
      const sections = ['reading_a', 'reading_b', 'grammar', 'listening', 'vocabulary', 'writing', 'speaking']
      const sectionCounts = {}
      sections.forEach(s => { sectionCounts[s] = { completed: 0, total: students.length } })

      const studentProgress = students.map(s => {
        const myProgress = (progress || []).filter(p => p.student_id === s.id)
        const completed = myProgress.filter(p => p.status === 'completed').length
        const total = sections.length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

        // Count section completions
        myProgress.forEach(p => {
          if (p.status === 'completed' && sectionCounts[p.section_type]) {
            sectionCounts[p.section_type].completed++
          }
        })

        return {
          id: s.id,
          name: s.profiles?.full_name || s.profiles?.display_name || 'طالب',
          percentage,
        }
      })

      // Sort by progress descending
      studentProgress.sort((a, b) => b.percentage - a.percentage)

      return { students: studentProgress, sections: sectionCounts }
    },
    enabled: !!groupId && !!unitId,
    refetchInterval: 60000, // reduced from 30s to 60s
  })

  const SECTION_LABELS = {
    reading_a: { icon: '📖', label: 'قراءة A' },
    reading_b: { icon: '📖', label: 'قراءة B' },
    grammar: { icon: '📝', label: 'قواعد' },
    listening: { icon: '🎧', label: 'استماع' },
    vocabulary: { icon: '📚', label: 'مفردات' },
    writing: { icon: '✍️', label: 'كتابة' },
    speaking: { icon: '🎤', label: 'تحدث' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[340px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', maxHeight: '65vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>📊</span> تقدم الوحدة
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: 'calc(65vh - 56px)' }}>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 w-full rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Per-student progress bars */}
            {progressData?.students?.map(s => (
              <button
                key={s.id}
                onClick={() => { navigate(`/trainer/students/${s.id}`); onClose() }}
                className="w-full flex items-center gap-3 group"
              >
                <span className="text-[12px] font-bold w-20 truncate text-right" style={{ color: 'var(--text-primary)' }}>
                  {s.name}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-overlay)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.percentage}%`,
                      background: s.percentage >= 70 ? 'var(--accent-sky)' : s.percentage >= 40 ? 'var(--accent-gold)' : '#f87171',
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold font-data w-9 text-left" style={{ color: 'var(--text-tertiary)' }}>
                  {s.percentage}%
                </span>
                {s.percentage < 30 && <AlertTriangle size={12} className="text-amber-400 shrink-0" />}
              </button>
            ))}

            {/* Section completion counts */}
            <div className="pt-2 space-y-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {Object.entries(progressData?.sections || {}).map(([key, val]) => {
                const info = SECTION_LABELS[key]
                if (!info) return null
                return (
                  <div key={key} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span>{info.icon}</span>
                    <span className="flex-1">{info.label}</span>
                    <span className="font-bold font-data" style={{ color: 'var(--text-primary)' }}>
                      {val.completed}/{val.total}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>خلصوا</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
