import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event that fires when the user
    // arrives via the Supabase recovery link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if the user already has a valid session (recovery token
    // may have already been exchanged before this component mounted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isValid = password.length >= 8 && password === confirmPassword

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return

    setError('')
    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setDone(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="fl-card-static p-7 text-center space-y-4">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
            <h2 className="text-page-title text-[var(--text-primary)]">تم تحديث كلمة المرور</h2>
            <p className="text-sm text-muted">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 text-sm py-2 px-6 mt-4"
            >
              تسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Not ready — no recovery session detected
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="fl-card-static p-7 text-center space-y-4">
            <Loader2 size={32} className="animate-spin text-sky-400 mx-auto" />
            <p className="text-sm text-muted">جارٍ التحقق من رابط الاستعادة...</p>
            <Link to="/forgot-password" className="block text-sm text-sky-400 hover:text-sky-300 mt-4">
              طلب رابط جديد
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Password entry form
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold text-gradient">Fluentia</h1>
          <p className="text-muted text-sm mt-2">إعادة تعيين كلمة المرور</p>
        </div>

        <div className="fl-card-static p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label block mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  className="input-field pr-10 pl-10"
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
              <label className="input-label block mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="input-field pr-10"
                  dir="ltr"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">كلمتا المرور غير متطابقتين</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'تحديث كلمة المرور'}
            </button>

            <Link to="/login" className="block text-center text-sm text-sky-400 hover:text-sky-300 mt-3">
              العودة لتسجيل الدخول
            </Link>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
