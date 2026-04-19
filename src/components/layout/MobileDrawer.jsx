import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import UserAvatar from '@/components/common/UserAvatar'
import { hasIELTSAccess } from '@/lib/packageAccess'

const PROFILE_PATHS = { student: '/student/profile', trainer: '/trainer/my-students', admin: '/admin/settings' }

export default function MobileDrawer({ open, onClose, nav }) {
  const { profile, studentData, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const role = profile?.role || 'student'
  const displayName = profile?.display_name || profile?.full_name || 'مستخدم'

  // Close on route change
  useEffect(() => { onClose() }, [location.pathname])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleLogout = async () => {
    onClose()
    try { await signOut() } catch (e) { console.error(e) }
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 w-[280px] z-[81] lg:hidden overflow-y-auto"
            style={{
              background: 'var(--ds-bg-elevated, var(--surface-base, #0b0f18))',
              borderLeft: '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.06)))',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            }}
            dir="rtl"
            aria-modal="true"
            role="dialog"
          >
            {/* Close + user */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={profile} size={36} rounded="xl" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate font-['Tajawal']" style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}>
                    {displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))', background: 'var(--ds-surface-1, var(--surface-raised))' }}
                aria-label="إغلاق القائمة"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ height: 1, margin: '0 16px', background: 'var(--ds-border-subtle, var(--border-subtle))' }} />

            {/* Sections — use drawerSections (full list) when available */}
            <div className="px-3 py-4 space-y-5">
              {(nav.drawerSections || nav.sections).map((section) => {
                const visibleItems = section.items.filter(item => {
                  if (!item.requiresPackage) return true
                  if (item.requiresPackage === 'ielts') return hasIELTSAccess(studentData)
                  return true
                })
                if (visibleItems.length === 0) return null
                return (
                <div key={section.id}>
                  <div
                    className="px-3 mb-2 text-[11px] font-semibold"
                    style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))', letterSpacing: '0.05em' }}
                  >
                    {section.label}
                  </div>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      if (!item || !item.to || !item.icon) return null
                      const Icon = item.icon
                      const isDashboard = item.to === `/${role}` || item.to === '/student' || item.to === '/trainer' || item.to === '/admin'
                      const active = isDashboard ? location.pathname === item.to : location.pathname.startsWith(item.to)

                      return (
                        <NavLink
                          key={item.id}
                          to={item.to}
                          end={isDashboard}
                          className="flex items-center gap-3 rounded-[14px] transition-all duration-200"
                          style={{
                            height: 44,
                            padding: '0 16px',
                            background: active ? 'var(--ds-surface-2, var(--glass-card-active, rgba(255,255,255,0.065)))' : 'transparent',
                            color: active ? 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' : 'var(--ds-text-secondary, var(--text-secondary))',
                          }}
                        >
                          <Icon size={20} strokeWidth={1.75} />
                          <span className="text-[14px] font-medium font-['Tajawal']">{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )
              })}
            </div>

            <div style={{ height: 1, margin: '0 16px', background: 'var(--ds-border-subtle, var(--border-subtle))' }} />

            {/* Bottom actions */}
            <div className="px-3 py-3 space-y-1">
              <button
                onClick={() => { navigate(PROFILE_PATHS[role]); onClose() }}
                className="w-full flex items-center gap-3 rounded-[14px] px-4 transition-colors duration-200 font-['Tajawal']"
                style={{ height: 44, color: 'var(--ds-text-secondary, var(--text-secondary))' }}
              >
                <Settings size={20} strokeWidth={1.75} />
                <span className="text-[14px] font-medium">الإعدادات</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 rounded-[14px] px-4 transition-colors duration-200 font-['Tajawal']"
                style={{ height: 44, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}
              >
                <LogOut size={20} strokeWidth={1.75} />
                <span className="text-[14px] font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
