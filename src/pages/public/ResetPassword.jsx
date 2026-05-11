import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  // ─── ALL HOOKS AT TOP ───
  const navigate = useNavigate()
  const [sessionReady, setSessionReady] = useState(null) // null=checking, true=ready, false=expired
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const detectSession = async () => {
      // Supabase auto-parses the recovery hash on load if detectSessionInUrl is true (default).
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted && session) {
        setSessionReady(true)
        return
      }

      // Subscribe in case the parse races us
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && s) {
          if (mounted) setSessionReady(true)
        }
      })

      // Timeout: if no session materializes in 3s, the link is expired/invalid
      const timer = setTimeout(() => {
        if (mounted) setSessionReady((prev) => prev === null ? false : prev)
      }, 3000)

      return () => {
        clearTimeout(timer)
        sub.subscription.unsubscribe()
      }
    }

    const cleanup = detectSession()
    return () => {
      mounted = false
      cleanup.then((fn) => fn?.())
    }
  }, [])

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setStatus('submitting')
    setMessage('')

    if (password.length < 8) {
      setStatus('error')
      setMessage('كلمة المرور لازم تكون ٨ أحرف على الأقل')
      return
    }
    if (!/\d/.test(password)) {
      setStatus('error')
      setMessage('كلمة المرور لازم تحتوي رقم واحد على الأقل')
      return
    }
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('كلمتا المرور غير متطابقتين')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus('error')
      setMessage(`تعذّر التحديث: ${error.message || 'حاول مرة أخرى'}`)
      return
    }

    setStatus('success')
    setMessage('تم تحديث كلمة المرور ✅ جاري التحويل لتسجيل الدخول...')
    setTimeout(async () => {
      await supabase.auth.signOut()
      navigate('/login', {
        replace: true,
        state: { flash: 'تم تحديث كلمة المرور بنجاح، سجل دخولك الآن.' },
      })
    }, 1500)
  }

  // ─── Guard renders (AFTER hooks) ───
  if (sessionReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="fl-card-static p-7 text-center space-y-4">
            <Loader2 size={32} className="animate-spin text-sky-400 mx-auto" />
            <p className="text-sm text-muted">جاري التحقق من الرابط...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (sessionReady === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="fl-card-static p-7 text-center space-y-4">
            <div className="text-xl font-bold text-[var(--text-primary)]">الرابط منتهي أو غير صالح</div>
            <p className="text-sm text-muted">اطلب رابطاً جديداً من صفحة تسجيل الدخول.</p>
            <Link
              to="/forgot-password"
              className="btn-primary inline-flex items-center gap-2 text-sm py-2 px-6 mt-4"
            >
              طلب رابط جديد
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="fl-card-static p-7 text-center space-y-4">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
            <h2 className="text-page-title text-[var(--text-primary)]">تم تحديث كلمة المرور</h2>
            <p className="text-sm text-muted">{message}</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Main form ───
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
                  disabled={status === 'submitting'}
                  placeholder="٨ أحرف على الأقل، تحتوي رقماً"
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
                  disabled={status === 'submitting'}
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

            {status === 'error' && message && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {status === 'submitting'
                ? <Loader2 size={18} className="animate-spin" />
                : 'تحديث كلمة المرور'
              }
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
