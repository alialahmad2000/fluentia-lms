import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Smartphone } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { isPushSupported, getPushPermission, subscribeUserToPush } from '../../utils/pushSubscribe'
import { toast } from '../ui/FluentiaToast'

const STORAGE_KEY = 'fluentia_push_prompt'
const DISMISS_DAYS = 7

function isIOSSafari() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !window.navigator.standalone
}

function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
}

export default function EnableNotificationsPrompt() {
  const { profile } = useAuthStore()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (!profile?.id) return

    // Check if already granted or not supported
    if (!isPushSupported()) return
    const permission = getPushPermission()
    if (permission === 'granted' || permission === 'denied') return

    // Check dismiss state
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const { dismissed, subscribedAt, remindAfter } = JSON.parse(stored)
      if (subscribedAt) return // already subscribed
      if (dismissed && remindAfter && new Date(remindAfter) > new Date()) return // still in cooldown
    }

    setIsIOS(isIOSSafari())
    setVisible(true)
  }, [profile?.id])

  const handleEnable = async () => {
    setLoading(true)
    try {
      await subscribeUserToPush(profile.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribedAt: new Date().toISOString() }))
      toast({ type: 'success', title: 'تم تفعيل الإشعارات' })
      setVisible(false)
    } catch (err) {
      if (err.message?.includes('denied')) {
        toast({ type: 'error', title: 'تم رفض الإذن — يمكنك تغييره من إعدادات المتصفح' })
        setVisible(false)
      } else {
        toast({ type: 'error', title: 'حدث خطأ في تفعيل الإشعارات' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    const remindAfter = new Date()
    remindAfter.setDate(remindAfter.getDate() + DISMISS_DAYS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true, remindAfter: remindAfter.toISOString() }))
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="fl-card-static p-4 overflow-hidden"
          style={{ borderColor: 'rgba(56,189,248,0.15)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(56,189,248,0.1)' }}>
              <Bell size={20} className="text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                خلّيك على اطلاع
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                فعّل الإشعارات عشان تعرف لما يكون عندك مراجعة جديدة، تقييم جاهز، أو إعلان من الأكاديمية.
              </p>

              {isIOS && !isPWAInstalled() && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
                  <Smartphone size={14} className="text-amber-400 shrink-0" />
                  <p className="text-[11px]" style={{ color: 'var(--accent-gold)' }}>
                    على iPhone، لازم تضيف التطبيق للشاشة الرئيسية أولاً عشان تشتغل الإشعارات.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleEnable}
                  disabled={loading || (isIOS && !isPWAInstalled())}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))', color: '#fff' }}
                >
                  {loading ? 'جاري التفعيل...' : 'فعّل الإشعارات'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  مش الحين
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
