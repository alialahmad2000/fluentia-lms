import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tracker } from '../../services/activityTracker'

/**
 * Bilingual, because this is the FIRST screen a new staff account ever sees and
 * it cannot be dismissed. The coordinator console (2026-08-21) hired an
 * English-speaking, non-Arabic-reading coordinator whose onboarding therefore
 * opened on an entirely Arabic modal — title, labels, placeholders and the
 * submit button. He could not complete his own first login.
 *
 * Keyed on profiles.ui_language, which is loaded by the time this renders
 * (must_change_password comes off the same row). Every Arabic account is
 * byte-identical to before.
 */
const COPY = {
  ar: {
    title: 'تغيير كلمة المرور',
    subtitle: 'يجب تغيير كلمة المرور المؤقتة قبل المتابعة',
    newLabel: 'كلمة المرور الجديدة',
    newPlaceholder: '8 أحرف على الأقل',
    confirmLabel: 'تأكيد كلمة المرور',
    confirmPlaceholder: 'أعد كتابة كلمة المرور',
    mismatch: 'كلمتا المرور غير متطابقتين',
    submit: 'تأكيد وتسجيل الدخول',
    genericError: 'حدث خطأ أثناء تغيير كلمة المرور',
  },
  en: {
    title: 'Change your password',
    subtitle: 'Set your own password before you continue.',
    newLabel: 'New password',
    newPlaceholder: 'At least 8 characters',
    confirmLabel: 'Confirm password',
    confirmPlaceholder: 'Type it again',
    mismatch: 'The two passwords do not match',
    submit: 'Confirm and sign in',
    genericError: 'Something went wrong changing your password',
  },
}

export default function ForcePasswordChange() {
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const impersonation = useAuthStore((s) => s.impersonation)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Only show if must_change_password is true.
  // Skip during impersonation — admin must not be forced to change an
  // impersonated user's password.
  if (!profile?.must_change_password || done || impersonation) return null

  const lang = profile?.ui_language === 'en' ? 'en' : 'ar'
  const t = COPY[lang]
  const isValid = password.length >= 8 && password === confirmPassword

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return

    setError('')
    setSaving(true)
    try {
      // Update auth password
      const { error: authErr } = await supabase.auth.updateUser({ password })
      if (authErr) throw authErr

      // Clear must_change_password flag + record first login
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          first_login_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
      if (profileErr) throw profileErr

      // Clear temp_password from students table
      await supabase
        .from('students')
        .update({ temp_password: null })
        .eq('id', profile.id)
        .select()

      tracker.track('password_changed', { is_first_login: true })
      setDone(true)
      if (user) await fetchProfile(user)
    } catch (err) {
      console.error('Password change error:', err)
      setError(err.message || COPY[profile?.ui_language === 'en' ? 'en' : 'ar'].genericError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md fl-card-static p-8"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
        style={{ textAlign: lang === 'en' ? 'left' : 'right' }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-sky-400" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.title}</h2>
          <p className="text-sm text-muted mt-2">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="input-label">{t.newLabel}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.newPlaceholder}
                className="input-field pl-10"
                dir="ltr"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">{t.confirmLabel}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPlaceholder}
              className="input-field"
              dir="ltr"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{t.mismatch}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || saving}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {t.submit}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
