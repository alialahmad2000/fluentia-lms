import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { parseSupabaseError, logError } from '../../utils/errors'
import { ACADEMY } from '../../lib/constants'

export default function LoginPage() {
  const { user, profile, loading: authLoading } = useAuthStore()
  const signIn = useAuthStore((s) => s.signIn)

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

    // Basic validation
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
    <div className="min-h-screen bg-darkest flex items-center justify-center p-4">
      {/* Background gradient decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-4xl font-playfair font-bold text-gradient mb-2"
          >
            Fluentia
          </motion.h1>
          <p className="text-muted text-sm">{ACADEMY.name_ar}</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm text-muted mb-2">
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
              <label htmlFor="password" className="block text-sm text-muted mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-12"
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
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
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span>{loading ? 'جاري الدخول...' : 'دخول'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-muted text-xs mt-6">
          {ACADEMY.name} &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
