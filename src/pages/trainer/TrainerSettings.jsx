import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, User, Bell, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../components/ui/FluentiaToast'

export default function TrainerSettings() {
  const { t, i18n } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const [saving, setSaving] = useState(false)

  async function setLanguage(lang) {
    if (saving || lang === profile?.ui_language) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ui_language: lang })
      .eq('id', profile.id)
      .select()
      .single()
    if (error) {
      toast.error(t('common.error_generic'))
      setSaving(false)
      return
    }
    i18n.changeLanguage(lang)
    localStorage.setItem('fluentia_ui_language', lang)
    if (user) await fetchProfile(user)
    toast.success(t('settings.language.saved'))
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold font-['Tajawal'] text-[var(--text-primary)]">{t('settings.title')}</h1>
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{t('settings.subtitle')}</p>
      </header>

      {/* Language section */}
      <section className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Globe className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-bold font-['Tajawal'] text-[var(--text-primary)]">{t('settings.language.title')}</h2>
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{t('settings.language.description')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {['ar', 'en'].map((lang) => {
            const active = (profile?.ui_language ?? 'ar') === lang
            return (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                disabled={saving}
                className={`rounded-xl border p-4 text-start transition-all disabled:opacity-50 ${
                  active
                    ? 'border-sky-400 bg-sky-400/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="font-semibold text-sm font-['Tajawal'] text-[var(--text-primary)]">
                  {t(`settings.language.option_${lang}`)}
                </div>
                {active && (
                  <div className="text-xs text-sky-300 mt-1 font-['Tajawal']">
                    ✓ {t('common.active')}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Account section */}
      <section className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold font-['Tajawal'] text-[var(--text-primary)]">{t('settings.account.title')}</h2>
        </div>
        <dl className="space-y-3 text-sm font-['Tajawal']">
          <div className="flex justify-between items-center">
            <dt className="text-[var(--text-muted)]">{t('settings.account.full_name')}</dt>
            <dd className="text-[var(--text-primary)] font-medium">{profile?.full_name || '—'}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-[var(--text-muted)]">{t('settings.account.email')}</dt>
            <dd className="text-[var(--text-primary)] font-mono text-xs">{profile?.email || '—'}</dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-[var(--text-muted)]">{t('settings.account.role')}</dt>
            <dd className="text-[var(--text-primary)]">{t('settings.account.role_trainer')}</dd>
          </div>
        </dl>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{t('settings.account.contact_admin_to_change')}</p>
      </section>

      {/* Notifications placeholder */}
      <section className="rounded-2xl p-6 opacity-50" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-[var(--text-muted)]" />
          <h2 className="text-base font-bold font-['Tajawal'] text-[var(--text-primary)]">{t('settings.notifications.title')}</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-3">{t('common.coming_soon')}</p>
      </section>

      {/* Security placeholder */}
      <section className="rounded-2xl p-6 opacity-50" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--text-muted)]" />
          <h2 className="text-base font-bold font-['Tajawal'] text-[var(--text-primary)]">{t('settings.security.title')}</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-3">{t('common.coming_soon')}</p>
      </section>
    </div>
  )
}
