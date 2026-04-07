import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, ChevronDown, User, Sparkles, Settings, LogOut, Zap, Flame, Package, Mail, ChevronLeft, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getGreeting } from '../../utils/dateHelpers'
import NotificationCenter from './NotificationCenter'
import ThemeToggle from '../ThemeToggle'
import UserAvatar from '../common/UserAvatar'
import HardRefreshModal from '../common/HardRefreshModal'

const ROLE_LABELS = {
  student: 'طالب',
  trainer: 'مدرب',
  admin: 'مدير',
}

const PACKAGE_NAMES = {
  asas: 'أساس',
  talaqa: 'طلاقة',
  tamayuz: 'تميّز',
  ielts: 'IELTS',
}

const LEVEL_NAMES = {
  0: 'تأسيس',
  1: 'أساسيات',
  2: 'تطوير',
  3: 'طلاقة',
  4: 'تمكّن',
  5: 'احتراف',
}

const ROLE_CONFIG = {
  student: {
    badge: 'fl-badge sky',
    gradient: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
    profilePath: '/student/profile',
  },
  trainer: {
    badge: 'fl-badge emerald',
    gradient: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-sky))',
    profilePath: '/trainer/students',
  },
  admin: {
    badge: 'fl-badge gold',
    gradient: 'linear-gradient(135deg, var(--accent-gold), var(--accent-amber))',
    profilePath: '/admin/settings',
  },
}

export default function Header({ onMenuToggle }) {
  const { user, profile, studentData, signOut } = useAuthStore()
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''
  const packageName = studentData?.package_name || profile?.package_name || null
  const level = studentData?.level ?? profile?.level ?? null
  const email = user?.email || profile?.email || ''
  const xpTotal = studentData?.xp_total || 0
  const currentStreak = studentData?.current_streak || 0

  const [scrolled, setScrolled] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [refreshOpen, setRefreshOpen] = useState(false)
  const badgeRef = useRef(null)
  const avatarRef = useRef(null)
  const popoverRef = useRef(null)
  const hoverTimeout = useRef(null)
  const leaveTimeout = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close badge dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (badgeRef.current && !badgeRef.current.contains(e.target)) {
        setBadgeOpen(false)
      }
    }
    if (badgeOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [badgeOpen])

  // Close avatar popover on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        avatarRef.current && !avatarRef.current.contains(e.target)
      ) {
        setAvatarOpen(false)
      }
    }
    if (avatarOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [avatarOpen])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      clearTimeout(hoverTimeout.current)
      clearTimeout(leaveTimeout.current)
    }
  }, [])

  const handleAvatarEnter = useCallback(() => {
    clearTimeout(leaveTimeout.current)
    hoverTimeout.current = setTimeout(() => setAvatarOpen(true), 200)
  }, [])

  const handleAvatarLeave = useCallback(() => {
    clearTimeout(hoverTimeout.current)
    leaveTimeout.current = setTimeout(() => setAvatarOpen(false), 300)
  }, [])

  const handlePopoverEnter = useCallback(() => {
    clearTimeout(leaveTimeout.current)
  }, [])

  const handlePopoverLeave = useCallback(() => {
    leaveTimeout.current = setTimeout(() => setAvatarOpen(false), 300)
  }, [])

  const handleLogout = useCallback(async () => {
    setAvatarOpen(false)
    try { await signOut() } catch (e) { console.error('signOut error:', e) }
    navigate('/login')
  }, [signOut, navigate])

  return (
    <>
    <header
      role="banner"
      className={`h-16 flex items-center justify-between px-5 lg:px-8 sticky top-0 z-20 transition-all duration-300 ${
        scrolled ? 'header-scrolled' : ''
      }`}
      style={{ background: scrolled ? undefined : 'transparent' }}
    >
      {/* Right side: menu + greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          aria-label="فتح القائمة"
          className="lg:hidden btn-icon w-10 h-10"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{getGreeting()}،</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{firstName}</span>
        </div>
      </div>

      {/* Left side: theme toggle + role badge + notifications + avatar */}
      <div className="flex items-center gap-2.5">
        <ThemeToggle />

        {/* Role badge with dropdown */}
        <div className="relative" ref={badgeRef}>
          <button
            onClick={() => setBadgeOpen(!badgeOpen)}
            className={`${config.badge} text-[11px] select-none transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1`}
          >
            {ROLE_LABELS[role] || role}
            <ChevronDown size={10} className={`transition-transform duration-200 ${badgeOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {badgeOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full end-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--color-dropdown-bg)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 8px 32px var(--shadow-sm)',
                }}
              >
                <div className="p-4 space-y-3">
                  {/* Package name */}
                  {packageName && (
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} style={{ color: 'var(--accent-sky)' }} />
                      <div>
                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>الباقة</p>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{packageName}</p>
                      </div>
                    </div>
                  )}

                  {/* XP Level */}
                  {level && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{ background: config.gradient, color: '#fff' }}
                      >
                        {level}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>المستوى</p>
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Level {level}</p>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                  {/* Profile link */}
                  <button
                    onClick={() => {
                      navigate(config.profilePath)
                      setBadgeOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <User size={14} strokeWidth={1.5} />
                    عرض الملف الشخصي
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <NotificationCenter />

        {/* Avatar with popover */}
        <div
          className="relative"
          onMouseEnter={handleAvatarEnter}
          onMouseLeave={handleAvatarLeave}
          ref={avatarRef}
        >
          <button
            onClick={() => setAvatarOpen(prev => !prev)}
            aria-label="الملف الشخصي"
            className="cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              boxShadow: avatarOpen ? '0 4px 16px rgba(56,189,248,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
              borderRadius: 12,
            }}
          >
            <UserAvatar user={profile} size={36} rounded="xl" gradient={config.gradient} />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onMouseEnter={handlePopoverEnter}
                onMouseLeave={handlePopoverLeave}
                className="absolute top-full end-0 mt-2.5 w-[280px] rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'var(--color-dropdown-bg, var(--surface-raised))',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--border-default, var(--border-subtle))',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                }}
                dir="rtl"
              >
                {/* Arrow */}
                <div
                  className="absolute -top-1.5 end-3 w-3 h-3 rotate-45"
                  style={{
                    background: 'var(--color-dropdown-bg, var(--surface-raised))',
                    borderTop: '1px solid var(--border-default, var(--border-subtle))',
                    borderRight: '1px solid var(--border-default, var(--border-subtle))',
                  }}
                />

                <div className="p-4 space-y-3 relative">
                  {/* Name + status */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <UserAvatar user={profile} size={40} rounded="xl" gradient={config.gradient} />
                      <div className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2" style={{ borderColor: 'var(--color-dropdown-bg, var(--surface-raised))' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                        {displayName || 'مستخدم'}
                      </p>
                      <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                        {ROLE_LABELS[role] || role}
                        {level != null && ` · المستوى ${level}`}
                        {level != null && LEVEL_NAMES[level] && ` (${LEVEL_NAMES[level]})`}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  {role === 'student' && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium font-['Tajawal']">
                        <Zap size={13} className="text-amber-400" />
                        <span style={{ color: 'var(--text-secondary)' }}>{xpTotal} نقطة</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium font-['Tajawal']">
                        <Flame size={13} className="text-orange-400" />
                        <span style={{ color: 'var(--text-secondary)' }}>{currentStreak} أيام</span>
                      </div>
                    </div>
                  )}

                  {/* Package */}
                  {packageName && (
                    <div className="flex items-center gap-1.5 text-xs font-medium font-['Tajawal']">
                      <Package size={13} style={{ color: 'var(--accent-sky)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        باقة {PACKAGE_NAMES[packageName] || packageName}
                      </span>
                    </div>
                  )}

                  {/* Email */}
                  {email && (
                    <div className="flex items-center gap-1.5 text-xs font-['Tajawal']" dir="ltr">
                      <Mail size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <span className="truncate" style={{ color: 'var(--text-tertiary)' }}>{email}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

                  {/* Profile link */}
                  <button
                    onClick={() => { navigate(config.profilePath); setAvatarOpen(false) }}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <User size={14} strokeWidth={1.5} />
                      الملف الشخصي
                    </div>
                    <ChevronLeft size={14} />
                  </button>

                  {/* Hard refresh */}
                  <button
                    onClick={() => { setAvatarOpen(false); setRefreshOpen(true) }}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} strokeWidth={1.5} />
                      تحديث التطبيق
                    </div>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer font-['Tajawal']"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>

    <HardRefreshModal open={refreshOpen} onClose={() => setRefreshOpen(false)} />
    </>
  )
}
