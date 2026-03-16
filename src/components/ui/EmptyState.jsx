import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

/**
 * Reusable empty-state placeholder with icon, title, and optional description/action.
 *
 * @param {Object} props
 * @param {import('lucide-react').LucideIcon} [props.icon] - Custom icon (default: Inbox)
 * @param {string} props.title - Arabic title text
 * @param {string} [props.description] - Optional description
 * @param {React.ReactNode} [props.action] - Optional action button/link
 * @param {string} [props.className] - Extra classes
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-sky-glow)' }}
      >
        <Icon size={24} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
      </div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      {description && (
        <p className="text-[13px] max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}
