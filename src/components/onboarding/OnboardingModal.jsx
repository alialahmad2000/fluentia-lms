import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { sendWelcomeMessage } from '../../utils/autoMessages'

const ONBOARDED_KEY = 'fluentia_onboarded'

export default function OnboardingModal() {
  const { profile, studentData, user, fetchProfile, impersonation } = useAuthStore()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Only show for students who haven't been onboarded.
  // Guard profile?.id so we never read/write the key "fluentia_onboarded_undefined".
  // Skip entirely when admin is impersonating — they should land on the student's
  // actual dashboard immediately, not be blocked by the student's welcome flow.
  const isStudent = profile?.role === 'student'
  const alreadyOnboarded = profile?.id
    ? localStorage.getItem(`${ONBOARDED_KEY}_${profile.id}`)
    : true // treat as onboarded while profile is loading to avoid flash
  const needsOnboarding = isStudent && !alreadyOnboarded && !dismissed && !impersonation

  if (!needsOnboarding) return null

  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups

  async function handleComplete() {
    if (!profile?.id) return // safety guard — should never happen but prevents undefined key writes
    setSaving(true)
    try {
      const trimmedName = displayName.trim()
      if (trimmedName) {
        await supabase.from('profiles').update({ display_name: trimmedName }).eq('id', profile.id).select()
      }
      localStorage.setItem(`${ONBOARDED_KEY}_${profile.id}`, 'true')
      setDismissed(true)
      // Re-fetch using the current user from the store (not the potentially stale closure var)
      if (user) await fetchProfile(user)

      // Send auto-welcome message to group chat + notifications
      const studentName = trimmedName || profile?.full_name || 'طالب جديد'
      if (studentData?.group_id) {
        sendWelcomeMessage(profile.id, studentData.group_id, studentName).catch(() => {})
      }
    } catch (err) {
      console.error('Onboarding error:', err)
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center space-y-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-semibold text-[var(--text-primary)]">مرحباً في أكاديمية طلاقة!</h2>
      <p className="text-muted">
        أهلاً {profile?.full_name || 'بك'}، نسعد بانضمامك لنا.
        <br />
        خلينا نعرفك على النظام بسرعة.
      </p>
    </div>,

    // Step 1: Your Info + Display Name (merged)
    <div key="info-name" className="space-y-5">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center">معلوماتك</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="fl-card-static p-4 text-center">
          <p className="text-xs text-muted">المستوى</p>
          <p className="text-sm font-semibold text-sky-400 mt-1">{academicLevel.cefr}</p>
          <p className="text-xs text-muted">{academicLevel.name_ar}</p>
        </div>
        <div className="fl-card-static p-4 text-center">
          <p className="text-xs text-muted">الباقة</p>
          <p className="text-sm font-semibold text-gold-400 mt-1">{pkg.name_ar}</p>
        </div>
        {group && (
          <div className="fl-card-static p-4 text-center col-span-2">
            <p className="text-xs text-muted">المجموعة</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{group.name}</p>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted text-center mb-2">اختر اسم يظهر للمدرب والزملاء</p>
        <input
          className="input-field text-center text-lg"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={profile?.full_name || 'اسمك...'}
        />
        <p className="text-xs text-muted text-center mt-1.5">يمكنك تغييره لاحقاً من الملف الشخصي</p>
      </div>
    </div>,

    // Step 2: Quick Tips
    <div key="tips" className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center">نصائح سريعة</h2>
      <div className="space-y-3">
        {[
          { icon: '📝', title: 'الواجبات', desc: 'سلّمها بالوقت واحصل على نقاط إضافية' },
          { icon: '⚡', title: 'نقاط XP', desc: 'كل فعل يعطيك نقاط — الواجبات، الحضور، التفاعل' },
          { icon: '🔥', title: 'السلسلة', desc: 'ادخل كل يوم وحافظ على سلسلة الأيام المتتالية' },
          { icon: '🏆', title: 'الإنجازات', desc: 'اجمع شارات واحتل المراكز الأولى في مجموعتك' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 fl-card-static p-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-base)] flex items-center justify-center text-xl shrink-0">{item.icon}</div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="text-xs text-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,
  ]

  const isLast = step === steps.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md fl-card-static rounded-2xl overflow-hidden"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2.5 pt-6 pb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-sky-400 w-8' : i < step ? 'bg-sky-400/40 w-2' : 'bg-[var(--surface-raised)] w-2'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-6 min-h-[280px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="w-full"
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost text-sm text-muted transition-all duration-200 px-3 py-1.5 rounded-xl">
                رجوع
              </button>
            ) : <div />}

            <button
              onClick={isLast ? handleComplete : () => setStep(s => s + 1)}
              disabled={saving}
              className="btn-primary text-sm py-2 px-6 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isLast ? (
                <>
                  <Sparkles size={16} />
                  يلا نبدأ!
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
