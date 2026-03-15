import { useState, useEffect } from 'react'
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
    avatar: 'bg-sky-500/15 border-sky-500/20 text-sky-400',
  },
  trainer: {
    badge: 'fl-badge emerald',
    avatar: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
  },
  admin: {
    badge: 'fl-badge gold',
    avatar: 'bg-gold-500/15 border-gold-500/20 text-gold-400',
  },
}

export default function Header({ onMenuToggle }) {
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''

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

        <span className={`${config.badge} text-[11px]`}>
          {ROLE_LABELS[role] || role}
        </span>

        <NotificationCenter />

        <div className={`w-9 h-9 rounded-xl ${config.avatar} border flex items-center justify-center text-xs font-bold`}>
          {firstName?.[0] || '?'}
        </div>
      </div>
    </header>
  )
}
