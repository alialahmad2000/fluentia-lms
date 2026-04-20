import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileCheck, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { CommandCard } from '@/design-system/trainer'

function useGradingCount() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer-grading-preview', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('trainer_id', profile.id)
        .eq('is_active', true)
      const groupIds = (groups || []).map(g => g.id)
      if (!groupIds.length) return 0
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)
      const studentIds = (students || []).map(s => s.id)
      if (!studentIds.length) return 0
      const { count } = await supabase
        .from('student_curriculum_progress')
        .select('*', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .eq('status', 'completed')
        .eq('section_type', 'writing')
        .is('trainer_graded_at', null)
      return count || 0
    },
    enabled: !!profile?.id,
    staleTime: 60000,
  })
}

export default function GradingPreviewStrip() {
  const { data: count = 0, isLoading } = useGradingCount()

  return (
    <CommandCard className={`tr-grading-strip ${count > 0 ? 'tr-grading-strip--active' : ''}`}>
      <div className="tr-grading-strip__icon">
        <FileCheck size={18} aria-hidden="true" />
      </div>
      <div className="tr-grading-strip__body">
        <span className="tr-grading-strip__label">محطة التصحيح</span>
        {isLoading ? (
          <span className="tr-grading-strip__count">...</span>
        ) : count > 0 ? (
          <span className="tr-grading-strip__count tr-grading-strip__count--active">
            {count} {count === 1 ? 'واجب ينتظر' : 'واجبات تنتظر'}
          </span>
        ) : (
          <span className="tr-grading-strip__count tr-grading-strip__count--clear">
            لا واجبات بانتظار التصحيح
          </span>
        )}
      </div>
      {count > 0 && (
        <Link to="/trainer/grading" className="tr-grading-strip__cta" aria-label="فتح محطة التصحيح">
          فتح
          <ArrowLeft size={12} aria-hidden="true" />
        </Link>
      )}
    </CommandCard>
  )
}
