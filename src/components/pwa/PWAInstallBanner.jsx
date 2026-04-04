import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X, Share, MoreVertical, Plus, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../ui/FluentiaToast'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function getDeviceType() {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

export default function PWAInstallBanner() {
  const { user, profile } = useAuthStore()
  const [showFullGuide, setShowFullGuide] = useState(false)
  const [showSmallBanner, setShowSmallBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const deferredPromptRef = useRef(null)
  const checkedRef = useRef(false)

  const isStudent = profile?.role === 'student'
  const device = getDeviceType()

  // Capture Android beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Main logic: decide what to show
  useEffect(() => {
    if (!user || !profile || !isStudent || checkedRef.current) return
    checkedRef.current = true

    // Already running as PWA — auto-mark
    if (isStandalone()) {
      if (!profile.pwa_installed) {
        supabase.from('profiles')
          .update({ pwa_installed: true, pwa_installed_at: new Date().toISOString() })
          .eq('id', user.id)
          .then()
      }
      return
    }

    // Already marked as installed
    if (profile.pwa_installed) return

    // Check session dismissal
    const sessionDismissed = sessionStorage.getItem('pwa-banner-dismissed')
    if (sessionDismissed) {
      setDismissed(true)
    }

    // Never prompted or prompted > 3 days ago → full screen
    const lastPrompt = profile.pwa_install_prompted_at
      ? new Date(profile.pwa_install_prompted_at).getTime()
      : 0

    if (!lastPrompt || (Date.now() - lastPrompt > THREE_DAYS_MS)) {
      setShowFullGuide(true)
    } else {
      // Prompted recently — show small banner
      if (!sessionDismissed) {
        setShowSmallBanner(true)
      }
    }
  }, [user, profile, isStudent])

  const handleInstalled = useCallback(async () => {
    await supabase.from('profiles')
      .update({ pwa_installed: true, pwa_installed_at: new Date().toISOString() })
      .eq('id', user.id)
    setShowFullGuide(false)
    setShowSmallBanner(false)
    toast({ type: 'success', title: 'ممتاز! الحين بتوصلك الإشعارات 🎉' })
  }, [user])

  const handleRemindLater = useCallback(async () => {
    await supabase.from('profiles')
      .update({ pwa_install_prompted_at: new Date().toISOString() })
      .eq('id', user.id)
    setShowFullGuide(false)
    setShowSmallBanner(true)
  }, [user])

  const handleDismissBanner = useCallback(() => {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
    setShowSmallBanner(false)
  }, [])

  const handleNativeInstall = useCallback(async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt()
      const { outcome } = await deferredPromptRef.current.userChoice
      deferredPromptRef.current = null
      if (outcome === 'accepted') {
        await handleInstalled()
      }
    }
  }, [handleInstalled])

  if (!isStudent || !user || !profile) return null
  if (isStandalone() || profile.pwa_installed) return null

  return (
    <>
      {/* Full screen install guide */}
      <AnimatePresence>
        {showFullGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(6,14,28,0.95)', backdropFilter: 'blur(8px)' }}
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md rounded-2xl p-6 sm:p-8 space-y-6"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center mx-auto">
                  <Smartphone size={28} className="text-sky-400" />
                </div>
                <h2 className="text-xl font-bold text-white font-['Tajawal']">
                  ثبّت طلاقة كتطبيق
                </h2>
                <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
                  عشان توصلك الإشعارات وتفتح التطبيق بسرعة
                </p>
              </div>

              {/* Instructions */}
              {device === 'ios' && <IOSInstructions />}
              {device === 'android' && <AndroidInstructions />}
              {device === 'desktop' && <DesktopMessage />}

              {/* Actions */}
              <div className="space-y-3">
                {device === 'android' && deferredPromptRef.current ? (
                  <button
                    onClick={handleNativeInstall}
                    className="w-full h-12 rounded-xl bg-sky-500 text-white text-sm font-bold font-['Tajawal'] hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    ثبّت التطبيق الآن
                  </button>
                ) : device !== 'desktop' ? (
                  <button
                    onClick={handleInstalled}
                    className="w-full h-12 rounded-xl bg-sky-500 text-white text-sm font-bold font-['Tajawal'] hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                  >
                    تم، ثبّتها!
                  </button>
                ) : null}

                <button
                  onClick={handleRemindLater}
                  className="w-full h-12 rounded-xl text-[#94a3b8] text-sm font-['Tajawal'] hover:text-white transition-colors flex items-center justify-center gap-2"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  ذكّرني لاحقاً
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small persistent banner */}
      <AnimatePresence>
        {showSmallBanner && !showFullGuide && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
            style={{ background: 'rgba(56,189,248,0.1)', borderBottom: '1px solid rgba(56,189,248,0.2)' }}
            dir="rtl"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone size={16} className="text-sky-400 flex-shrink-0" />
              <span className="text-xs text-[#94a3b8] font-['Tajawal'] truncate">
                ثبّت طلاقة كتطبيق عشان ما يفوتك شي
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowFullGuide(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-bold font-['Tajawal'] hover:bg-sky-500/30 transition-colors"
              >
                ثبّت الآن
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1 rounded-lg text-[#94a3b8] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function IOSInstructions() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-sky-400">1</span>
        </div>
        <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
          اضغط زر المشاركة <Share size={14} className="inline text-sky-400 mx-1" /> في أسفل الشاشة
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-sky-400">2</span>
        </div>
        <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
          مرر للأسفل واختر <span className="text-white font-bold">"إضافة إلى الشاشة الرئيسية"</span> <Plus size={14} className="inline text-sky-400 mx-1" />
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-sky-400">3</span>
        </div>
        <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
          اضغط <span className="text-white font-bold">"إضافة"</span> في الأعلى
        </p>
      </div>
    </div>
  )
}

function AndroidInstructions() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-sky-400">1</span>
        </div>
        <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
          اضغط <MoreVertical size={14} className="inline text-sky-400 mx-1" /> في أعلى المتصفح
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold text-sky-400">2</span>
        </div>
        <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
          اختر <span className="text-white font-bold">"تثبيت التطبيق"</span> أو <span className="text-white font-bold">"إضافة إلى الشاشة الرئيسية"</span>
        </p>
      </div>
    </div>
  )
}

function DesktopMessage() {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <p className="text-sm text-[#94a3b8] font-['Tajawal'] leading-relaxed">
        التطبيق مصمم للجوال — افتحه من جوالك للحصول على أفضل تجربة
      </p>
    </div>
  )
}
