import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

// Layer 5 (auto-recovery): invisible when healthy. When the browser is offline
// or the server is unreachable, a calm amber bar tells the student it's a
// connection problem (not the app) — and reassures that saved work is safe.
function NetworkStatusIndicator() {
  const { browserOnline, serverReachable, isHealthy } = useNetworkStatus()
  if (isHealthy) return null

  const message = !browserOnline
    ? '⚠ لا يوجد اتصال بالإنترنت — إجاباتك ستُحفظ عند عودة الاتصال'
    : '⚠ تعذّر الوصول للخادم — جاري إعادة المحاولة...'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="fixed left-0 right-0 z-[9998] flex items-center justify-center shadow-lg"
        dir="rtl"
        style={{
          bottom: 0,
          paddingTop: '10px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          background: 'linear-gradient(to left, rgb(146,64,14), rgb(120,53,15))',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="text-sm font-medium font-['Tajawal'] text-amber-50 text-center">
          {message}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}

export default memo(NetworkStatusIndicator)
