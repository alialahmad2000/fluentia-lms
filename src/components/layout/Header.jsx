import { Menu } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getGreeting } from '../../utils/dateHelpers'
import NotificationCenter from './NotificationCenter'

const ROLE_LABELS = {
  student: 'طالب',
  trainer: 'مدرب',
  admin: 'مدير',
}

const ROLE_COLORS = {
  student: 'badge-blue',
  trainer: 'badge-green',
  admin: 'badge-gold',
}

export default function Header({ onMenuToggle }) {
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = profile?.display_name || displayName.split(' ')[0]

  return (
    <header role="banner" className="h-16 bg-navy-950/60 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Right side: menu + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="فتح القائمة"
          className="lg:hidden text-muted hover:text-white transition-colors p-1"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:block">
          <span className="text-muted text-sm">{getGreeting()}، </span>
          <span className="text-white font-medium text-sm">{firstName}</span>
        </div>
      </div>

      {/* Left side: role badge + notifications + avatar */}
      <div className="flex items-center gap-3">
        <span className={ROLE_COLORS[role]}>
          {ROLE_LABELS[role]}
        </span>

        <NotificationCenter />

        <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xs font-bold">
          {firstName?.[0] || '?'}
        </div>
      </div>
    </header>
  )
}
