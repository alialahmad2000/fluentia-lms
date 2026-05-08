import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { parseSupabaseError, logError } from '../../utils/errors'
import { ACADEMY } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import FloatingParticles from '../../components/illustrations/FloatingParticles'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, profile, loading: authLoading } = useAuthStore()
  const signIn = useAuthStore((s) => s.signIn)
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme)

  const [loginMode, setLoginMode] = useState('email') // 'email' or 'username'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, redirect based on role
  if (!authLoading && user && profile) {
    switch (profile.role) {
      case 'student': return <Navigate to="/student" replace />
      case 'trainer': return <Navigate to="/trainer" replace />
      case 'admin':   return <Navigate to="/admin" replace />
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (loginMode === 'email' && !email.trim()) {
      setError(t('auth.login.error.email_required'))
      return
    }
    if (loginMode === 'username' && !username.trim()) {
      setError(t('auth.login.error.username_required'))
      return
    }
    if (!password) {
      setError(t('auth.login.error.password_required'))
      return
    }

    setLoading(true)
    try {
      let loginEmail = email.trim()

      if (loginMode === 'username') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username.trim().toLowerCase())
          .single()

        if (profileError || !profileData?.email) {
          setError(t('auth.login.error.username_not_found'))
          setLoading(false)
          return
        }

        loginEmail = profileData.email
      }

      await signIn(loginEmail, password)
    } catch (err) {
      const msg = parseSupabaseError(err)
      setError(msg)
      logError('auth', 'login', err.message, { email: loginMode === 'email' ? email.trim() : username.trim() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] glow-breathe" style={{ background: 'var(--accent-sky-glow)' }} />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] glow-breathe" style={{ background: 'var(--accent-violet-glow)', animationDelay: '1s' }} />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] glow-breathe" style={{ background: 'var(--accent-gold-glow)', opacity: 0.3, animationDelay: '2s' }} />
        <FloatingParticles count={15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <img
              src={effectiveTheme === 'light' ? '/logo-full-light.png' : '/logo-full-dark.png'}
              alt="Fluentia Academy"
              className="h-16 w-auto mx-auto mb-5"
            />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{ACADEMY.name_ar}</p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="fl-card-static backdrop-blur-2xl p-8 sm:p-10 aurora-border"
          style={{ boxShadow: 'var(--shadow-xl), inset 0 1px 0 var(--color-card-inset)' }}
        >
          <h2 className="text-page-title mb-8 text-center text-shimmer">
            {t('auth.login.title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login mode toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setLoginMode(loginMode === 'email' ? 'username' : 'email'); setError('') }}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                {loginMode === 'email' ? t('auth.login.toggle_username') : t('auth.login.toggle_email')}
              </button>
            </div>

            {/* Email or Username */}
            <div>
              <label htmlFor={loginMode === 'email' ? 'email' : 'username'} className="input-label">
                {loginMode === 'email' ? t('auth.login.email') : t('auth.login.username')}
              </label>
              {loginMode === 'email' ? (
                <input
                  id="email"
                  type="email"
                  className="fl-input"
                  placeholder="example@fluentia.academy"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  autoComplete="email"
                  disabled={loading}
                />
              ) : (
                <input
                  id="username"
                  type="text"
                  className="fl-input"
                  placeholder={t('auth.login.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  dir="ltr"
                  autoComplete="username"
                  disabled={loading}
                />
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="input-label">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="fl-input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="fl-btn-primary w-full"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span>{loading ? t('auth.login.submitting') : t('auth.login.submit')}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/forgot-password" className="text-sm text-muted hover:text-sky-400 transition-colors">
              {t('auth.login.forgot_password')}
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>
          {ACADEMY.name} &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
