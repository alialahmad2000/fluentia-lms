import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { GlassPanel } from '../../design-system/components'
import { Award, CheckCircle, XCircle } from 'lucide-react'

export default function RecentMasteryAttemptsWidget() {
  const { profile } = useAuthStore()

  // Get trainer's group students' recent mastery attempts
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['trainer-mastery-attempts', profile?.id],
    queryFn: async () => {
      // Get trainer's group IDs
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('trainer_id', profile.id)

      if (!groups?.length) return []
      const groupIds = groups.map(g => g.id)

      // Get students in those groups
      const { data: students } = await supabase
        .from('active_students')
        .select('id')
        .in('group_id', groupIds)

      if (!students?.length) return []
      const studentIds = students.map(s => s.id)

      // Get recent attempts for those students
      const { data } = await supabase
        .from('unit_mastery_attempts')
        .select(`
          id, student_id, percentage, passed, score, total_possible, created_at,
          profiles:student_id(full_name),
          unit_mastery_assessments:assessment_id(
            curriculum_units:unit_id(unit_number, theme_ar)
          )
        `)
        .in('student_id', studentIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10)

      return data || []
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
  })

  if (isLoading || attempts.length === 0) return null

  return (
    <GlassPanel padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Award size={18} style={{ color: '#fbbf24' }} />
        <h3 className="font-semibold text-sm" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
          اختبارات الإتقان الأخيرة
        </h3>
      </div>

      <div className="space-y-2">
        {attempts.map(att => {
          const unit = att.unit_mastery_assessments?.curriculum_units
          return (
            <div key={att.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {att.passed ? (
                  <CheckCircle size={14} className="flex-shrink-0" style={{ color: '#4ade80' }} />
                ) : (
                  <XCircle size={14} className="flex-shrink-0" style={{ color: '#f87171' }} />
                )}
                <span className="text-sm truncate" style={{ color: 'var(--ds-text-primary)' }}>
                  {att.profiles?.full_name || 'طالب'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                  و{unit?.unit_number}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color: att.passed ? '#4ade80' : '#f87171' }}>
                  {Math.round(att.percentage)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
