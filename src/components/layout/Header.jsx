import { Menu } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getGreeting } from '../../utils/dateHelpers'
import NotificationCenter from './NotificationCenter'

const ROLE_LABELS = {
  student: 'طالب',
  trainer: 'مدرب',
  admin: 'مدير',
}

const ROLE_CONFIG = {
  student: {
    badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/25',
    avatar: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
  },
  trainer: {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    avatar: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  },
  admin: {
    badge: 'bg-gold-500/15 text-gold-400 border border-gold-500/25',
    avatar: 'bg-gold-500/20 border-gold-500/30 text-gold-400',
  },
}

export default function Header({ onMenuToggle }) {
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''

  return (
    <header role="banner" className="h-16 bg-navy-950/60 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Right side: menu + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="فتح القائمة"
          className="lg:hidden text-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-muted text-sm">{getGreeting()}،</span>
          <span className="text-white font-semibold text-sm">{firstName}</span>
        </div>
      </div>

      {/* Left side: role badge + notifications + avatar */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${config.badge}`}>
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
