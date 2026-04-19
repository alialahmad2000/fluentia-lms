import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { TRAINER_NAV_V2 } from '../../config/trainerNavigation'
import './TrainerSidebar.css'

export default function TrainerSidebar() {
  const profile = useAuthStore((s) => s.profile)

  const { data: badges = {} } = useQuery({
    queryKey: ['trainer-sidebar-badges', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {}
      const { count: interv } = await supabase
        .from('student_interventions')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', profile.id)
        .eq('status', 'pending')
      const { count: writingGrading } = await supabase
        .from('student_curriculum_progress')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('section_type', 'writing')
        .is('trainer_graded_at', null)
        .not('ai_feedback', 'is', null)
      const { count: speakingGrading } = await supabase
        .from('speaking_recordings')
        .select('*', { count: 'exact', head: true })
        .neq('trainer_reviewed', true)
        .not('ai_evaluation', 'is', null)
        .eq('is_latest', true)
      const gradingCount = (writingGrading || 0) + (speakingGrading || 0)
      return {
        pending_interventions: interv || 0,
        pending_grading: gradingCount,
      }
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
    staleTime: 30000,
  })

  return (
    <nav className="tr-sidebar" aria-label="الملاحة الرئيسية">
      <div className="tr-sidebar__brand">
        <span className="tr-gold-dot" aria-hidden="true" />
        <span className="tr-display tr-sidebar__wordmark">طلاقة</span>
      </div>
      <hr className="tr-sidebar__divider" aria-hidden="true" />

      <div className="tr-sidebar__scroll">
        {TRAINER_NAV_V2.map((section) => (
          <div key={section.section} className="tr-sidebar__section">
            <div className="tr-sidebar__section-label">{section.label}</div>
            <ul className="tr-sidebar__list" role="list">
              {section.items.map((item) => {
                const Icon = item.icon
                const badge = item.badgeKey ? badges[item.badgeKey] : 0
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.href}
                      end={item.primary}
                      className={({ isActive }) =>
                        clsx(
                          'tr-sidebar__link',
                          isActive && 'is-active',
                          item.special === 'gold' && 'tr-sidebar__link--gold',
                        )
                      }
                    >
                      <span className="tr-sidebar__link-icon">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="tr-sidebar__link-text">{item.label}</span>
                      {badge > 0 && (
                        <span className="tr-sidebar__badge" aria-label={`${badge} عنصر`}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
