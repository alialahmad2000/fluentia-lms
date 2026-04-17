import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, User, LogOut, Settings, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import NotificationCenter from './NotificationCenter'
import HeaderThemeButton from '@/design-system/HeaderThemeButton'
import UserAvatar from '@/components/common/UserAvatar'
import HardRefreshButton from '@/components/ui/HardRefreshButton'
import ResetPageButton from '@/components/ResetPageButton'

const ROLE_LABELS = { student: 'طالبة', trainer: 'مدربة', admin: 'مدير' }
const PROFILE_PATHS = { student: '/student/profile', trainer: '/trainer/my-students', admin: '/admin/settings' }

function Header({ showMenuButton, onMenuClick }) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const displayName = profile?.display_name || profile?.full_name || 'مستخدم'
  const email = user?.email || ''

  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Scroll detection — rAF-throttled so it runs at most once per frame
  useEffect(() => {
    let ticking = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8)
        ticking = false
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  // Close on ESC
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e) => { if (e.key === 'Escape') setProfileOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [profileOpen])

  const handleLogout = useCallback(async () => {
    setProfileOpen(false)
    try { await signOut() } catch (e) { console.error('signOut:', e) }
    navigate('/login')
  }, [signOut, navigate])

  return (
    <header
      role="banner"
      className="h-16 flex items-center justify-between px-5 lg:px-8 sticky z-20 transition-all duration-[240ms]"
      style={{
        top: 'var(--impersonation-banner-height, 0px)',
        background: scrolled ? 'var(--ds-bg-overlay, var(--surface-base-alpha, rgba(5,7,13,0.78)))' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--ds-border-subtle, var(--border-subtle, rgba(255,255,255,0.06)))' : '1px solid transparent',
      }}
    >
      {/* Right side (RTL start) */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            aria-label="فتح القائمة"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: 'var(--ds-surface-1, var(--surface-raised, rgba(255,255,255,0.04)))',
              color: 'var(--ds-text-secondary, var(--text-secondary))',
            }}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Left side (RTL end) — icon row */}
      <div className="flex items-center gap-2">
        {/* Reset page (zoom/scroll/selection) */}
        <ResetPageButton />

        {/* Hard refresh (clear caches + reload) */}
        <HardRefreshButton compact />

        {/* Theme */}
        <HeaderThemeButton />

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((p) => !p)}
            aria-label="الملف الشخصي"
            className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent-primary)]"
            style={{
              boxShadow: profileOpen ? '0 0 0 2px var(--ds-accent-primary-glow, rgba(233,185,73,0.35))' : 'none',
            }}
          >
            <UserAvatar user={profile} size={36} rounded="xl" />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full end-0 mt-2 w-[260px] rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'var(--ds-bg-elevated, var(--color-dropdown-bg, #0b0f18))',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--ds-border-subtle, var(--border-default, rgba(255,255,255,0.1)))',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}
                dir="rtl"
              >
                {/* User info */}
                <div className="p-4 flex items-center gap-3">
                  <UserAvatar user={profile} size={40} rounded="xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate font-['Tajawal']" style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}>
                      {displayName}
                    </p>
                    <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
                      {ROLE_LABELS[role] || role}
                    </p>
                    {email && (
                      <p className="text-[10px] truncate mt-0.5" dir="ltr" style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
                        {email}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--ds-border-subtle, var(--border-subtle))' }} />

                <div className="p-2">
                  {/* Profile */}
                  <button
                    onClick={() => { navigate(PROFILE_PATHS[role] || '/student/profile'); setProfileOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--ds-text-secondary, var(--text-secondary))' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-surface-1, var(--surface-raised))' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <div className="flex items-center gap-2">
                      <User size={15} strokeWidth={1.5} />
                      الملف الشخصي
                    </div>
                    <ChevronLeft size={14} />
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => { navigate(PROFILE_PATHS[role] || '/student/profile'); setProfileOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--ds-text-secondary, var(--text-secondary))' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-surface-1, var(--surface-raised))' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <Settings size={15} strokeWidth={1.5} />
                    الإعدادات
                  </button>
                </div>

                <div style={{ height: 1, background: 'var(--ds-border-subtle, var(--border-subtle))' }} />

                {/* Logout */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--ds-text-tertiary, var(--text-tertiary))' }}
                  >
                    <LogOut size={15} strokeWidth={1.5} />
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default memo(Header)
