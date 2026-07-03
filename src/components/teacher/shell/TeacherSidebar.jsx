import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { TEACHER_NAV } from '@/config/teacherNavigation'
import { useIELTSRoster } from '@/hooks/trainer/useTrainerIELTSStudents'

/** Pending-grading badge: writing rows awaiting trainer grade + speaking rows
 *  awaiting review. RLS already lets a trainer read both (staff_read_progress,
 *  trainers_select_group_recordings). */
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

export default function TeacherSidebar() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  const { data: badges = {} } = useQuery({
    queryKey: ['teacher-grading-badge', profile?.id],
    queryFn: fetchGradingBadge,
    enabled: !!profile?.id,
    refetchInterval: 60000,
    staleTime: 30000,
  })

  // Only show the IELTS entry to trainers who actually have IELTS-track students.
  const { data: ieltsRoster = [] } = useIELTSRoster()
  const navItems = TEACHER_NAV.filter(
    (i) => i.visibleWhen !== 'ielts-students' || ieltsRoster.length > 0
  )

  const name = profile?.display_name || profile?.full_name || 'المدرّب'
  const initial = (name || 'م').trim().charAt(0)

  return (
    <nav className="tea-sidebar" aria-label="القائمة الرئيسية">
      <div className="tea-brand">
        <span className="tea-brand__dot" aria-hidden="true" />
        <span className="tea-brand__name">طلاقة</span>
        <span className="tea-brand__role">مساحة المدرّب</span>
      </div>

      <ul className="tea-nav" role="list">
        {navItems.map((item) => {
          const Icon = item.icon
          const badge = item.badgeKey ? badges[item.badgeKey] : 0
          return (
            <li key={item.id}>
              <NavLink
                to={item.href}
                end={item.primary}
                className={({ isActive }) => clsx('tea-nav-link', isActive && 'is-active')}
              >
                <span className="tea-nav-link__icon"><Icon size={19} aria-hidden="true" /></span>
                <span className="tea-nav-link__text">{item.label}</span>
                {badge > 0 && <span className="tea-nav-badge">{badge > 99 ? '99+' : badge}</span>}
              </NavLink>
            </li>
          )
        })}
      </ul>

      <div className="tea-foot">
        <div className="tea-foot__avatar" aria-hidden="true">{initial}</div>
        <div className="tea-foot__meta">
          <div className="tea-foot__name">{name}</div>
          <div className="tea-foot__sub">مدرّب</div>
        </div>
        <button className="tea-foot__signout" onClick={signOut} aria-label="تسجيل الخروج" type="button">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
