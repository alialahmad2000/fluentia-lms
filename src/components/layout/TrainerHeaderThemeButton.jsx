import { useState, useRef, useEffect } from 'react'
import { Palette, Sun, Waves, Aperture } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { applyTrainerTheme } from '@/design-system/applyTheme'
import { supabase } from '@/lib/supabase'
import './TrainerHeaderThemeButton.css'

const THEMES = [
  { id: 'gold-command',   label: 'الديوان الذهبي', icon: Aperture },
  { id: 'deep-teal',      label: 'النيلة الهادئة', icon: Waves },
  { id: 'daylight-study', label: 'النور النهاري',  icon: Sun },
]

export default function TrainerHeaderThemeButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const currentTheme = profile?.theme_preference || 'gold-command'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  async function pickTheme(id) {
    applyTrainerTheme(id)
    setOpen(false)
    if (profile?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ theme_preference: id })
        .eq('id', profile.id)
        .select()
        .single()
      if (!error && data) setProfile({ ...profile, theme_preference: id })
    }
  }

  return (
    <div className="tr-theme-btn" ref={ref}>
      <button
        className="tr-theme-btn__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="تبديل الثيم"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Palette size={18} />
      </button>

      {open && (
        <div className="tr-theme-btn__menu" role="menu" dir="rtl">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={clsx('tr-theme-btn__item', currentTheme === id && 'is-active')}
              onClick={() => pickTheme(id)}
              role="menuitem"
            >
              <Icon size={15} />
              <span>{label}</span>
              {currentTheme === id && <span className="tr-gold-dot" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
