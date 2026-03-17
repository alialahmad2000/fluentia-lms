import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setError('أدخل البريد الإلكتروني')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetErr) throw resetErr
      setSent(true)
    } catch (err) {
      setError('حدث خطأ — تأكد من البريد الإلكتروني')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-playfair font-bold text-gradient">Fluentia</h1>
          <p className="text-muted text-sm mt-2">استعادة كلمة المرور</p>
        </div>

        <div className="fl-card-static p-7">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
              <h2 className="text-page-title text-[var(--text-primary)]">تم إرسال الرابط</h2>
              <p className="text-sm text-muted">
                تحقق من بريدك الإلكتروني <span className="text-[var(--text-primary)]" dir="ltr">{email}</span> واتبع الرابط لإعادة تعيين كلمة المرور.
              </p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm py-2 px-6 mt-4">
                <ArrowRight size={14} />
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted text-center">أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور</p>

              <div>
                <label className="input-label block mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    className="input-field pr-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'إرسال رابط الاستعادة'}
              </button>

              <Link to="/login" className="block text-center text-sm text-sky-400 hover:text-sky-300 mt-3">
                العودة لتسجيل الدخول
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
