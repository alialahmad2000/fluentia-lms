import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MessageCircle, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'

// Soft subscription gate. When the displayed (or impersonated) profile is a STUDENT
// whose students.access_expires_at is in the past, the whole app is blurred behind a
// centered, indirect "renew to continue" card. The student can still SEE their account
// (it shows through the blur) but cannot use anything until they renew.
// NULL access_expires_at = unlimited → gate never shows. Staff are never gated.
const WHATSAPP = 'https://wa.me/966558669974'

export default function SubscriptionGate() {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const signOut = useAuthStore((s) => s.signOut)
  const g = useG()

  const role = profile?.role
  const expiresAt = studentData?.access_expires_at
  const expired = role === 'student' && expiresAt && new Date(expiresAt).getTime() < Date.now()

  // Lock body scroll while gated so nothing behind can be interacted with.
  useEffect(() => {
    if (!expired) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [expired])

  return (
    <AnimatePresence>
      {expired && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 flex items-center justify-center p-5"
          style={{
            zIndex: 2147483000, // above everything incl. FABs/sidebar/header
            background: 'rgba(6, 14, 28, 0.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            // respect notches / safe areas
            paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-md rounded-3xl p-8 text-center"
            style={{
              fontFamily: 'Tajawal, sans-serif',
              background: 'var(--ds-bg-elevated, #0a1225)',
              border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.10)',
            }}
          >
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(56,189,248,0.12))',
                border: '1px solid rgba(251,191,36,0.30)',
              }}
            >
              <Sparkles className="h-8 w-8" style={{ color: '#fbbf24' }} />
            </div>

            <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              {g('اشتقنا لك 🌿', 'اشتقنا لكِ 🌿')}
            </h2>

            <p className="mb-1 text-base leading-relaxed" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              {g(
                'انتهت فترة وصولك الحالية إلى المنصّة. رحلتك في تعلّم الإنجليزية بانتظارك من حيث توقّفت — وكل تقدّمك محفوظ.',
                'انتهت فترة وصولكِ الحالية إلى المنصّة. رحلتكِ في تعلّم الإنجليزية بانتظاركِ من حيث توقّفتِ — وكل تقدّمكِ محفوظ.',
              )}
            </p>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}>
              {g('جدّد لمواصلة التعلّم معنا للشهر القادم.', 'جدّدي لمواصلة التعلّم معنا للشهر القادم.')}
            </p>

            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1a1205',
                boxShadow: '0 10px 30px -8px rgba(251,191,36,0.45)',
              }}
            >
              <MessageCircle className="h-5 w-5" />
              {g('تواصل معنا للمتابعة', 'تواصلي معنا للمتابعة')}
            </a>

            <button
              onClick={() => signOut?.()}
              className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--ds-text-tertiary, #94a3b8)' }}
            >
              <LogOut className="h-4 w-4" />
              {g('تسجيل الخروج', 'تسجيل الخروج')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
