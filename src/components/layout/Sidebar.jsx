import { useCallback, memo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import UserAvatar from '@/components/common/UserAvatar'
import { getGreeting } from '@/utils/dateHelpers'
import { hasIELTSAccess } from '@/lib/packageAccess'
import { toast } from '@/components/ui/FluentiaToast'

const ROLE_DASHBOARDS = { student: '/student', trainer: '/trainer', admin: '/admin' }

function Sidebar({ nav, collapsed, onToggle }) {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const role = profile?.role || 'student'
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = profile?.display_name || profile?.full_name || 'مستخدم'
  const level = studentData?.level ?? profile?.level ?? null
  const xp = studentData?.xp_total || 0

  const isActive = useCallback((to) => {
    if (to === `/${role}` || to === '/student' || to === '/trainer' || to === '/admin') {
      return location.pathname === to
    }
    return location.pathname.startsWith(to)
  }, [location.pathname, role])

  return (
    <aside
      role="navigation"
      aria-label="القائمة الرئيسية"
      className="hidden lg:flex flex-col fixed right-0 z-30 transition-all duration-300"
      style={{
        top: 'var(--impersonation-banner-height, 0px)',
        height: 'calc(100vh - var(--impersonation-banner-height, 0px))',
        width: collapsed ? 76 : 264,
        background: 'var(--ds-bg-elevated, var(--surface-base, #0b0f18))',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderLeft: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.06)))',
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center shrink-0 px-5 cursor-pointer"
        style={{ height: 72 }}
        onClick={() => navigate(ROLE_DASHBOARDS[role] || '/student')}
      >
        {collapsed ? (
          <span className="mx-auto text-xl font-bold" style={{ color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))', fontFamily: "'Playfair Display', serif" }}>ط</span>
        ) : (
          <span className="text-lg font-bold" style={{ color: 'var(--ds-text-primary, var(--text-primary, #faf5e6))', fontFamily: "'Tajawal', sans-serif" }}>
            <span style={{ color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))', fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900 }}>ط</span>لاقة
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-5">
        {nav.sections.map((section) => {
          const visibleItems = section.items.filter(item => {
            if (!item.requiresPackage) return true
            if (item.requiresPackage === 'ielts') {
              return studentData?.package === 'ielts' ||
                (Array.isArray(studentData?.custom_access) && studentData?.custom_access.includes('ielts'))
            }
            return true
          })
          if (visibleItems.length === 0) return null
          return (
          <div key={section.id}>
            {!collapsed && (
              <div
                className="px-3 mb-2 text-[11px] font-semibold"
                style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary, #6b6557))', letterSpacing: '0.05em' }}
              >
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                if (!item || !item.to || !item.icon) return null
                const active = isActive(item.to)
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === `/${role}` || item.to === '/student' || item.to === '/trainer' || item.to === '/admin'}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      if (item.requiresPackage === 'ielts' && !hasIELTSAccess(studentData)) {
                        e.preventDefault()
                        toast({ type: 'error', title: 'هذي الميزة لباقة IELTS فقط 🔒' })
                      }
                    }}
                    className="relative flex items-center gap-3 rounded-[14px] transition-all duration-[240ms] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent-primary,var(--accent-sky))] focus-visible:ring-offset-2"
                    style={{
                      height: 44,
                      padding: collapsed ? '0 0' : '0 16px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active ? 'var(--ds-surface-2, var(--glass-card-active, rgba(255,255,255,0.065)))' : 'transparent',
                      color: active ? 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' : 'var(--ds-text-secondary, var(--text-secondary, #c9c3b0))',
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active glow bar */}
                    {active && (
                      <motion.div
                        layoutId="active-sidebar-indicator"
                        className="absolute right-0 top-2 bottom-2"
                        style={{
                          width: 3,
                          borderRadius: 9999,
                          background: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))',
                          boxShadow: '0 0 16px var(--ds-accent-primary-glow, rgba(233,185,73,0.35))',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      style={active ? { filter: 'drop-shadow(0 0 8px var(--ds-accent-primary-glow, rgba(233,185,73,0.35)))' } : undefined}
                    />
                    {!collapsed && (
                      <span className="text-[14px] font-medium truncate font-['Tajawal']">{item.label}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
          )
        })}
      </div>

      {/* User card */}
      <div className="shrink-0 p-3">
        <div
          className="rounded-[var(--ds-radius-lg,20px)] p-3 flex items-center gap-3"
          style={{
            background: 'var(--ds-surface-1, var(--glass-card, rgba(255,255,255,0.035)))',
            border: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.06)))',
          }}
        >
          <UserAvatar user={profile} size={collapsed ? 32 : 40} rounded="xl" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate font-['Tajawal']" style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}>
                {displayName}
              </div>
              <div className="text-[11px] truncate font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
                {level != null ? `المستوى ${level}` : ''}{level != null && xp > 0 ? ' · ' : ''}{xp > 0 ? `${xp.toLocaleString('ar-SA')} XP` : ''}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(role === 'admin' ? '/admin/settings' : role === 'trainer' ? '/trainer/my-students' : '/student/profile') }}
              className="shrink-0 p-1.5 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}
              aria-label="الإعدادات"
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center z-40 transition-all duration-200 cursor-pointer"
        style={{
          background: 'var(--ds-bg-elevated, var(--surface-raised, #0b0f18))',
          border: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.08)))',
          color: 'var(--ds-text-tertiary, var(--text-tertiary))',
        }}
        aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
      >
        <ChevronLeft
          size={14}
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
        />
      </button>
    </aside>
  )
}

export default memo(Sidebar)
