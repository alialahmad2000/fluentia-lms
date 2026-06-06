import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { TEACHER_MOBILE_BAR } from '@/config/teacherNavigation'

async function fetchGradingBadge() {
  const [{ count: writing }, { count: speaking }] = await Promise.all([
    supabase.from('student_curriculum_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed').eq('section_type', 'writing')
      .is('trainer_graded_at', null).not('ai_feedback', 'is', null),
    supabase.from('speaking_recordings')
      .select('*', { count: 'exact', head: true })
      .neq('trainer_reviewed', true).eq('is_latest', true),
  ])
  return { pending_grading: (writing || 0) + (speaking || 0) }
}

export default function TeacherMobileBar() {
  const profile = useAuthStore((s) => s.profile)
  const { data: badges = {} } = useQuery({
    queryKey: ['teacher-grading-badge', profile?.id],
    queryFn: fetchGradingBadge,
    enabled: !!profile?.id,
    refetchInterval: 60000,
    staleTime: 30000,
  })

  return (
    <nav className="tea-mobilebar" aria-label="القائمة السريعة" data-role="mobile-bottom-nav">
      {TEACHER_MOBILE_BAR.map((item) => {
        const Icon = item.icon
        const badge = item.badgeKey ? badges[item.badgeKey] : 0
        return (
          <NavLink
            key={item.id}
            to={item.href}
            end={item.primary}
            className={({ isActive }) => clsx('tea-mb-item', isActive && 'is-active')}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
            {badge > 0 && <span className="tea-mb-badge">{badge > 9 ? '9+' : badge}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}
