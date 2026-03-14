import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { parseSupabaseError, logError } from '../../utils/errors'
import { ACADEMY } from '../../lib/constants'

export default function LoginPage() {
  const { user, profile, loading: authLoading } = useAuthStore()
  const signIn = useAuthStore((s) => s.signIn)
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme)

  const [email, setEmail] = useState('')
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

    if (!email.trim()) {
      setError('أدخل البريد الإلكتروني')
      return
    }
    if (!password) {
      setError('أدخل كلمة المرور')
      return
    }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      const msg = parseSupabaseError(err)
      setError(msg)
      logError('auth', 'login', err.message, { email: email.trim() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg-base)' }}>
      {/* Background ambient gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sky-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-[100px]" />
        {/* Decorative wing — ultra-subtle */}
        <svg className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.025]" viewBox="0 0 200 200" fill="none">
          <path d="M100 20 C60 50, 20 80, 10 140 C30 120, 60 100, 100 100 C140 100, 170 120, 190 140 C180 80, 140 50, 100 20Z" fill="currentColor" />
          <path d="M100 60 C75 75, 45 95, 35 130 C50 115, 70 105, 100 105 C130 105, 150 115, 165 130 C155 95, 125 75, 100 60Z" fill="currentColor" />
        </svg>
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
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ACADEMY.name_ar}</p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="backdrop-blur-2xl rounded-2xl p-8 sm:p-10"
          style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', boxShadow: '0 8px 32px var(--color-card-shadow), inset 0 1px 0 var(--color-card-inset)' }}
        >
          <h2 className="text-page-title mb-8 text-center" style={{ color: 'var(--color-text-primary)' }}>
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="input-label">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="example@fluentia.academy"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="input-label">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
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
                  style={{ color: 'var(--color-text-placeholder)' }}
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
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span>{loading ? 'جاري الدخول...' : 'دخول'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/forgot-password" className="text-sm text-muted hover:text-sky-400 transition-colors">
              نسيت كلمة المرور؟
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
          {ACADEMY.name} &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
