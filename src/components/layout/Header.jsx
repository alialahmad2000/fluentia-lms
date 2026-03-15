import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, ChevronDown, User, Sparkles } from 'lucide-react'
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
  const level = studentData?.level || profile?.level || null

  const [scrolled, setScrolled] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  const badgeRef = useRef(null)

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

        {/* Avatar — clickable, navigates to profile */}
        <button
          onClick={() => navigate(config.profilePath)}
          aria-label="الملف الشخصي"
          className="w-9 h-9 rounded-xl border-0 flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: config.gradient,
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(56,189,248,0.3)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
        >
          {firstName?.[0] || '?'}
        </button>
      </div>
    </header>
  )
}
