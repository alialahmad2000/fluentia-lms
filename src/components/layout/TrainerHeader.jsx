import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import TrainerHeaderThemeButton from './TrainerHeaderThemeButton'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

function LanguageQuickSwitch() {
  const { i18n } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function pick(lang) {
    setOpen(false)
    if (lang === profile?.ui_language) return
    await supabase.from('profiles').update({ ui_language: lang }).eq('id', profile.id).select().single()
    i18n.changeLanguage(lang)
    localStorage.setItem('fluentia_ui_language', lang)
    if (user) fetchProfile(user)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-white/5 transition"
        aria-label="Language"
      >
        <Globe className="w-5 h-5 text-[var(--text-muted)]" />
      </button>
      {open && (
        <div
          className="absolute end-0 mt-2 rounded-xl p-1 min-w-[140px] z-50"
          style={{ background: 'var(--surface-overlay, #0d1a30)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          <button
            onClick={() => pick('ar')}
            className={`w-full text-start px-3 py-2 rounded-lg text-sm transition hover:bg-white/5 font-['Tajawal'] ${profile?.ui_language === 'ar' ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}
          >
            العربية
          </button>
          <button
            onClick={() => pick('en')}
            className={`w-full text-start px-3 py-2 rounded-lg text-sm transition hover:bg-white/5 font-['Inter'] ${profile?.ui_language === 'en' ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}
          >
            English
          </button>
        </div>
      )}
    </div>
  )
}

export default function TrainerHeader() {
  return (
    <header className="tr-header">
      <div className="tr-header__brand">
        <span className="tr-gold-dot" />
        <span className="tr-display">طلاقة</span>
      </div>
      <div className="tr-header__actions">
        <LanguageQuickSwitch />
        <TrainerHeaderThemeButton />
      </div>
    </header>
  )
}
