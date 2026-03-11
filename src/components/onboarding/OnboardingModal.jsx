import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'

const ONBOARDED_KEY = 'fluentia_onboarded'

export default function OnboardingModal() {
  const { profile, studentData, user, fetchProfile } = useAuthStore()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Only show for students who haven't been onboarded
  const isStudent = profile?.role === 'student'
  const alreadyOnboarded = localStorage.getItem(`${ONBOARDED_KEY}_${profile?.id}`)
  const needsOnboarding = isStudent && !alreadyOnboarded && !dismissed

  if (!needsOnboarding) return null

  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups

  async function handleComplete() {
    setSaving(true)
    try {
      const trimmedName = displayName.trim()
      if (trimmedName) {
        await supabase.from('profiles').update({ display_name: trimmedName }).eq('id', profile?.id).select()
      }
      localStorage.setItem(`${ONBOARDED_KEY}_${profile?.id}`, 'true')
      setDismissed(true)
      if (user) await fetchProfile(user)
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
      <h2 className="text-2xl font-bold text-white">مرحباً في أكاديمية طلاقة!</h2>
      <p className="text-muted">
        أهلاً {profile?.full_name?.split(' ')[0]}، نسعد بانضمامك لنا.
        <br />
        خلينا نعرفك على النظام بسرعة.
      </p>
    </div>,

    // Step 1: Your info
    <div key="info" className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">معلوماتك</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-muted">المستوى</p>
          <p className="text-sm font-bold text-sky-400 mt-1">{academicLevel.cefr}</p>
          <p className="text-xs text-muted">{academicLevel.name_ar}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-muted">الباقة</p>
          <p className="text-sm font-bold text-gold-400 mt-1">{pkg.name_ar}</p>
        </div>
        {group && (
          <div className="bg-white/5 rounded-xl p-3 text-center col-span-2">
            <p className="text-xs text-muted">المجموعة</p>
            <p className="text-sm font-bold text-white mt-1">{group.name}</p>
          </div>
        )}
      </div>
    </div>,

    // Step 2: Display name
    <div key="name" className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">الاسم المعروض</h2>
      <p className="text-sm text-muted text-center">اختر اسم يظهر للمدرب والزملاء</p>
      <input
        className="input-field text-center text-lg"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={profile?.full_name?.split(' ')[0] || 'اسمك...'}
      />
      <p className="text-xs text-muted text-center">يمكنك تغييره لاحقاً من الملف الشخصي</p>
    </div>,

    // Step 3: How it works
    <div key="howto" className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">كيف يعمل النظام؟</h2>
      <div className="space-y-3">
        {[
          { icon: '📝', title: 'الواجبات', desc: 'المدرب ينزل واجبات، سلّمها بالوقت واحصل على نقاط' },
          { icon: '⚡', title: 'نقاط XP', desc: 'كل فعل يعطيك نقاط — الواجبات، الحضور، التفاعل' },
          { icon: '🔥', title: 'السلسلة', desc: 'ادخل كل يوم وحافظ على سلسلة الأيام المتتالية' },
          { icon: '🏆', title: 'الإنجازات', desc: 'اجمع شارات واحتل المراكز الأولى في مجموعتك' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
            <span className="text-xl shrink-0">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
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
          className="w-full max-w-md bg-navy-950 border border-border-subtle rounded-2xl overflow-hidden"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-5 pb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-sky-400 w-6' : i < step ? 'bg-sky-400/40' : 'bg-white/10'
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
              <button onClick={() => setStep(s => s - 1)} className="text-sm text-muted hover:text-white transition-colors">
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
