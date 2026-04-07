import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { hardRefresh } from '../../utils/hardRefresh'

export default function HardRefreshModal({ open, onClose }) {
  const [phase, setPhase] = useState('confirm') // confirm | running | error
  const [progress, setProgress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleRefresh = useCallback(async () => {
    setPhase('running')
    setErrorMsg('')
    try {
      await hardRefresh({ onProgress: setProgress })
    } catch (err) {
      setPhase('error')
      setErrorMsg(err.message || 'حدث خطأ غير متوقع')
    }
  }, [])

  const handleClose = useCallback(() => {
    if (phase === 'running') return
    setPhase('confirm')
    setProgress('')
    setErrorMsg('')
    onClose()
  }, [phase, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={phase !== 'running' ? handleClose : undefined}
          dir="rtl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: phase === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              }}>
                {phase === 'error'
                  ? <AlertCircle size={24} className="text-red-400" />
                  : <RefreshCw size={24} className={phase === 'running' ? 'animate-spin text-amber-400' : 'text-amber-400'} />
                }
              </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              تحديث التطبيق
            </h3>

            {/* Confirm phase */}
            {phase === 'confirm' && (
              <>
                <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  سيتم تحميل أحدث نسخة من التطبيق. لن يتم تسجيل خروجك.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'var(--accent-gold, #f59e0b)', color: '#0f172a' }}
                  >
                    نعم، حدّث الآن
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}

            {/* Running phase */}
            {phase === 'running' && (
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                {progress || 'جاري التحديث...'}
              </p>
            )}

            {/* Error phase */}
            {phase === 'error' && (
              <>
                <p className="text-sm text-center" style={{ color: '#ef4444' }}>
                  {errorMsg}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'var(--accent-gold, #f59e0b)', color: '#0f172a' }}
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
