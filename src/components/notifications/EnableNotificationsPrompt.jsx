import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Smartphone } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { isPushSupported, getPushPermission, subscribeUserToPush, detectDeviceLabel } from '../../utils/pushSubscribe'
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
    if (!isPushSupported()) return

    const permission = getPushPermission()

    // Auto-retry: permission already granted — always validate the browser subscription
    // This handles expired subscriptions, cleared browser data, or VAPID key changes
    if (permission === 'granted') {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription()
      ).then(async (sub) => {
        if (!sub) {
          // No active browser subscription — re-attempt silently
          try {
            await subscribeUserToPush(profile.id)
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribedAt: new Date().toISOString() }))
          } catch {
            // Silent fail — will retry on next page load
            localStorage.removeItem(STORAGE_KEY)
          }
        } else {
          // Browser subscription exists — check if server-side is still active
          // (push service may have returned 410 and edge function deactivated it)
          const subJson = sub.toJSON()
          const { supabase } = await import('../../lib/supabase')
          try {
            const { data: dbSub } = await supabase
              .from('push_subscriptions')
              .select('is_active')
              .eq('user_id', profile.id)
              .eq('endpoint', subJson.endpoint)
              .maybeSingle()

            if (dbSub && !dbSub.is_active) {
              // Server deactivated this subscription (FCM returned 410/404)
              // Unsubscribe the stale browser subscription and create a fresh one
              await sub.unsubscribe()
              await subscribeUserToPush(profile.id)
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribedAt: new Date().toISOString() }))
            } else {
              // Subscription is active or new — upsert to ensure DB is in sync
              await supabase.from('push_subscriptions').upsert({
                user_id: profile.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
                user_agent: navigator.userAgent,
                device_label: detectDeviceLabel(),
                is_active: true,
                last_used_at: new Date().toISOString(),
              }, { onConflict: 'user_id,endpoint' })
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribedAt: new Date().toISOString() }))
            }
          } catch {
            // Silent fail
          }
        }
      })
      return
    }

    if (permission === 'denied') return

    // Check dismiss state
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const { dismissed, subscribedAt, remindAfter } = JSON.parse(stored)
      if (subscribedAt) return
      if (dismissed && remindAfter && new Date(remindAfter) > new Date()) return
    }

    setIsIOS(isIOSSafari())
    setVisible(true)
  }, [profile?.id])

  const handleEnable = async () => {
    setLoading(true)
    try {
      // Step 1: Request permission (shows system popup)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast({ type: 'error', title: 'تم رفض الإذن — يمكنك تغييره من إعدادات المتصفح' })
        setVisible(false)
        setLoading(false)
        return
      }

      // Step 2: Permission granted — immediately show success and hide prompt
      toast({ type: 'success', title: 'تم تفعيل الإشعارات ✓' })
      setVisible(false)
      setLoading(false)

      // Step 3: Complete push subscription in background (silent)
      try {
        await subscribeUserToPush(profile.id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribedAt: new Date().toISOString() }))
      } catch {
        // Subscription will be retried automatically on next page load via the auto-retry logic
      }
    } catch (err) {
      toast({ type: 'error', title: 'حدث خطأ في تفعيل الإشعارات' })
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
