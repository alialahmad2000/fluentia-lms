import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { TRAINER_MOBILE_BAR } from '../../config/trainerNavigation'
import './TrainerMobileBar.css'

export default function TrainerMobileBar() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [quickXpOpen, setQuickXpOpen] = useState(false)

  const { data: badges = {} } = useQuery({
    queryKey: ['trainer-mobile-badges', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {}
      const { count: interv } = await supabase
        .from('student_interventions')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', profile.id)
        .eq('status', 'pending')
      return { pending_interventions: interv || 0 }
    },
    enabled: !!profile?.id,
    refetchInterval: 60000,
    staleTime: 30000,
  })

  function handleAction(action) {
    if (action === 'quickXp') setQuickXpOpen(true)
    if (action === 'openDrawer') navigate('/trainer/students')
  }

  return (
    <>
      <nav
        className="tr-mobile-bar"
        aria-label="الملاحة السريعة"
        data-role="mobile-bottom-nav"
      >
        {TRAINER_MOBILE_BAR.map((item) => {
          const Icon = item.icon
          const badge = item.badgeKey ? badges[item.badgeKey] : 0

          if (item.floating) {
            return (
              <button
                key={item.id}
                className="tr-mobile-bar__float"
                onClick={() => handleAction(item.action)}
                aria-label={item.label}
                type="button"
              >
                <span className="tr-mobile-bar__float-ring" aria-hidden="true" />
                <Icon size={22} aria-hidden="true" />
              </button>
            )
          }

          if (item.action) {
            return (
              <button
                key={item.id}
                className="tr-mobile-bar__item"
                onClick={() => handleAction(item.action)}
                type="button"
              >
                <Icon size={20} aria-hidden="true" />
                <span className="tr-mobile-bar__label">{item.label}</span>
              </button>
            )
          }

          return (
            <NavLink
              key={item.id}
              to={item.href}
              end={item.id === 'cockpit'}
              className={({ isActive }) =>
                clsx('tr-mobile-bar__item', isActive && 'is-active')
              }
            >
              <span className="tr-mobile-bar__icon-wrap">
                <Icon size={20} aria-hidden="true" />
                {badge > 0 && (
                  <span className="tr-mobile-bar__badge" aria-label={`${badge} عنصر`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="tr-mobile-bar__label">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Quick XP stub modal — fleshed out in T3 */}
      {quickXpOpen && (
        <div
          className="tr-quick-xp-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="نقاط سريعة"
          onClick={(e) => { if (e.target === e.currentTarget) setQuickXpOpen(false) }}
        >
          <div className="tr-quick-xp-sheet">
            <div className="tr-quick-xp-handle" aria-hidden="true" />
            <h2 className="tr-display tr-quick-xp-title">نقاط سريعة</h2>
            <p className="tr-quick-xp-blurb">
              سيتيح لك هذا في T3 منح نقاط لطالب أثناء الكلاس مباشرةً.
            </p>
            <button
              className="tr-quick-xp-close"
              onClick={() => setQuickXpOpen(false)}
              type="button"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  )
}
