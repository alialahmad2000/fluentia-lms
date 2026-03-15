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
    badge: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
    avatar: 'bg-sky-500/15 border-sky-500/20 text-sky-400',
  },
  trainer: {
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
    avatar: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
  },
  admin: {
    badge: 'bg-gold-500/10 text-gold-400 border border-gold-500/15',
    avatar: 'bg-gold-500/15 border-gold-500/20 text-gold-400',
  },
}

export default function Header({ onMenuToggle }) {
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''

  return (
    <header role="banner" className="h-16 backdrop-blur-2xl border-b border-border-subtle flex items-center justify-between px-5 lg:px-8 sticky top-0 z-20" style={{ background: 'var(--color-bg-header)' }}>
      {/* Right side: menu + greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          aria-label="فتح القائمة"
          className="lg:hidden btn-icon w-9 h-9"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-muted text-sm">{getGreeting()}،</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{firstName}</span>
        </div>
      </div>

      {/* Left side: theme toggle + role badge + notifications + avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
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
