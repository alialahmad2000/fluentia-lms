import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { tracker } from '../../services/activityTracker'

export default function ForcePasswordChange() {
  const { profile, user, fetchProfile } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Only show if must_change_password is true
  if (!profile?.must_change_password || done) return null

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
      setError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور')
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
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-sky-400" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>تغيير كلمة المرور</h2>
          <p className="text-sm text-muted mt-2">يجب تغيير كلمة المرور المؤقتة قبل المتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="input-label">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
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
            <label className="input-label">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              className="input-field"
              dir="ltr"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">كلمتا المرور غير متطابقتين</p>
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
            تأكيد وتسجيل الدخول
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
