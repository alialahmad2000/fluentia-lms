import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Send, Check, Loader2, X } from 'lucide-react'
import { useRecordingNotification } from '../../hooks/useRecordingNotification'
import { toast } from '../ui/FluentiaToast'

/**
 * Trainer-facing button that notifies every active student at a
 * given curriculum level that a class recording has been uploaded.
 *
 * Shows only when a recording URL is present. Requires a confirmation
 * tap before sending to avoid accidental mass notifications.
 */
export default function RecordingNotificationButton({
  unitId,
  unitNumber,
  unitTitle,
  levelNumber,
  part,          // 'a' or 'b'
  recordingUrl,
  classDate,
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const {
    sendRecordingNotification,
    isLoading,
    isSuccess,
    error,
    data,
    reset,
  } = useRecordingNotification()

  // Auto-reset success state after 5s so the trainer can re-notify
  // later (e.g. if they update the link) without reloading the tab.
  useEffect(() => {
    if (!isSuccess) return
    const t = setTimeout(() => reset(), 5000)
    return () => clearTimeout(t)
  }, [isSuccess, reset])

  // Toast feedback
  useEffect(() => {
    if (isSuccess && data) {
      toast({
        type: 'success',
        title: data.sent_count > 0
          ? `تم إرسال الإشعار لـ ${data.sent_count} طالب`
          : 'لا يوجد طلاب في هذا المستوى',
      })
    }
  }, [isSuccess, data])

  useEffect(() => {
    if (error) {
      toast({ type: 'error', title: 'فشل إرسال الإشعار', description: error.message })
    }
  }, [error])

  // Hide when no URL, no level context, or no unit
  if (!recordingUrl || !String(recordingUrl).trim() || !unitId || !levelNumber) {
    return null
  }

  const handleSend = () => {
    sendRecordingNotification({
      unitId,
      unitNumber,
      unitTitle,
      levelNumber,
      part,
      classDate: classDate || null,
    })
    setShowConfirm(false)
  }

  // Success state (brief)
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold font-['Tajawal']"
        style={{ background: 'rgba(16,185,129,0.12)', color: 'rgb(52,211,153)', border: '1px solid rgba(16,185,129,0.3)' }}
      >
        <Check size={12} />
        تم الإرسال{data?.sent_count ? ` (${data.sent_count})` : ''}
      </motion.div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <AnimatePresence mode="wait" initial={false}>
        {!showConfirm ? (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold font-['Tajawal'] transition-colors disabled:opacity-40"
            style={{ background: 'rgba(56,189,248,0.12)', color: 'rgb(56,189,248)', border: '1px solid rgba(56,189,248,0.3)' }}
            title="إرسال إشعار لكل طلاب هذا المستوى"
          >
            <Bell size={12} />
            إشعار الطلاب
          </motion.button>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            className="flex items-center gap-1.5"
          >
            <span className="text-[11px] text-[var(--text-muted)] font-['Tajawal']">
              إرسال لطلاب المستوى {levelNumber}؟
            </span>
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-bold font-['Tajawal'] transition-colors disabled:opacity-40"
              style={{ background: 'rgba(16,185,129,0.15)', color: 'rgb(52,211,153)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              نعم
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 h-8 rounded-lg text-xs text-[var(--text-muted)] font-['Tajawal'] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={12} />
              إلغاء
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
