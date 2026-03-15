import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getGreeting } from '../../utils/dateHelpers'
import NotificationCenter from './NotificationCenter'
import ThemeToggle from '../ThemeToggle'

const ROLE_LABELS = {
  student: 'طالب',
  trainer: 'مدرب',
  admin: 'مدير',
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
  const { profile, studentData } = useAuthStore()
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''
  const packageName = studentData?.package_name || profile?.package_name || null

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
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

        {/* Role badge — shows package on hover */}
        <span
          className={`${config.badge} text-[11px] cursor-default select-none transition-all duration-200 hover:scale-105`}
          title={packageName ? `الباقة: ${packageName}` : ROLE_LABELS[role]}
        >
          {ROLE_LABELS[role] || role}
        </span>

        <NotificationCenter />

        {/* Avatar — clickable, navigates to profile */}
        <button
          onClick={() => navigate(config.profilePath)}
          aria-label="الملف الشخصي"
          className="w-9 h-9 rounded-xl border-0 flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
          style={{
            background: config.gradient,
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {firstName?.[0] || '?'}
        </button>
      </div>
    </header>
  )
}
