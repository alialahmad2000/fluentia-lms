import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ForgotPassword() {
  // ─── ALL HOOKS AT TOP ───
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [forgotMessage, setForgotMessage] = useState('')

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault()

    // Always reset state on every click — the key fix for the retry bug
    setForgotStatus('sending')
    setForgotMessage('')

    const email = forgotEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotStatus('error')
      setForgotMessage('أدخل بريداً إلكترونياً صحيحاً')
      return
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
        body: JSON.stringify({ email }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        setForgotStatus('error')
        setForgotMessage(
          data?.message || 'تعذّر الإرسال الآن. تواصل معنا واتساب: +966558669974'
        )
        return
      }

      setForgotStatus('sent')
      setForgotMessage(
        data?.message || 'تم إرسال رابط إعادة التعيين إلى بريدك ✉️ تحقق من صندوق الوارد (وأحياناً Spam).'
      )
    } catch {
      setForgotStatus('error')
      setForgotMessage('تعذّر الاتصال. تأكد من الإنترنت وحاول مرة أخرى.')
    }
  }, [forgotEmail])

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted text-center">
              أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
            </p>

            <div>
              <label className="input-label block mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  className="input-field pr-10"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Status messages — every state covered */}
            {forgotStatus === 'sending' && (
              <div className="flex items-center gap-2 text-sm text-sky-400">
                <Loader2 size={14} className="animate-spin shrink-0" />
                <span>جاري الإرسال...</span>
              </div>
            )}

            {forgotStatus === 'sent' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{forgotMessage}</span>
                </div>
                <p className="text-xs text-muted pr-5">تقدر تطلب رابط جديد في أي وقت</p>
              </div>
            )}

            {forgotStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{forgotMessage}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={forgotStatus === 'sending'}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {forgotStatus === 'sending'
                ? <Loader2 size={18} className="animate-spin" />
                : forgotStatus === 'sent'
                  ? 'إرسال رابط جديد'
                  : 'إرسال رابط الاستعادة'
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
