import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'

const ERROR_MESSAGES = {
  network: {
    icon: WifiOff,
    title: 'لا يوجد اتصال بالإنترنت',
    description: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى.',
  },
  server: {
    icon: AlertTriangle,
    title: 'حدث خطأ في الخادم',
    description: 'نعتذر عن هذا الخطأ. فريقنا يعمل على حله.',
  },
  notFound: {
    icon: AlertTriangle,
    title: 'لم يتم العثور على البيانات',
    description: 'قد تكون هذه البيانات غير متاحة حالياً.',
  },
  generic: {
    icon: AlertTriangle,
    title: 'حدث خطأ غير متوقع',
    description: 'حاول تحديث الصفحة أو العودة لاحقاً.',
  },
}

/**
 * Inline error state for failed data fetches.
 *
 * @param {Object} props
 * @param {'network'|'server'|'notFound'|'generic'} [props.type='generic']
 * @param {string} [props.title] - Override default title
 * @param {string} [props.description] - Override default description
 * @param {Function} [props.onRetry] - Retry callback
 * @param {string} [props.className]
 */
export default function ErrorState({
  type = 'generic',
  title,
  description,
  onRetry,
  className = '',
}) {
  const preset = ERROR_MESSAGES[type] || ERROR_MESSAGES.generic
  const Icon = preset.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(239, 68, 68, 0.1)' }}
      >
        <Icon size={24} strokeWidth={1.5} style={{ color: '#ef4444' }} />
      </div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title || preset.title}
      </p>
      <p className="text-[13px] max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
        {description || preset.description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-xl transition-all"
          style={{
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            color: 'var(--accent-sky)',
          }}
        >
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
      )}
    </motion.div>
  )
}
