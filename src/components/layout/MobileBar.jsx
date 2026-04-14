import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'

export default function MobileBar({ nav, onMoreClick, role }) {
  const location = useLocation()

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'var(--ds-bg-overlay, var(--surface-base-alpha, rgba(5,7,13,0.88)))',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.06)))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around w-full max-w-lg mx-auto" style={{ height: 64 }}>
        {nav.mobileBar.map((item) => {
          if (item.id === 'more') {
            return (
              <button
                key="more"
                onClick={onMoreClick}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] min-h-[44px] justify-center"
                style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}
              >
                <MoreHorizontal size={22} />
                <span className="text-[10px] font-medium font-['Tajawal']">{item.label}</span>
              </button>
            )
          }

          const Icon = item.icon
          const isDashboard = item.to === `/${role}` || item.to === '/student' || item.to === '/trainer' || item.to === '/admin'
          const active = isDashboard ? location.pathname === item.to : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={isDashboard}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px] min-h-[44px] justify-center transition-colors duration-150"
              style={{
                color: active ? 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' : 'var(--ds-text-tertiary, var(--text-tertiary))',
              }}
            >
              {/* Active top indicator bar */}
              {active && (
                <motion.div
                  layoutId="active-mobilebar-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: 24,
                    height: 3,
                    borderRadius: 9999,
                    background: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))',
                    boxShadow: '0 2px 12px var(--ds-accent-primary-glow, rgba(233,185,73,0.35))',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={1.75}
                style={active ? { filter: 'drop-shadow(0 0 6px var(--ds-accent-primary-glow, rgba(233,185,73,0.3)))' } : undefined}
              />
              <span className="text-[10px] font-medium font-['Tajawal']">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
