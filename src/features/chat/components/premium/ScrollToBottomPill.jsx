import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { popIn } from '../../lib/motion'

export default function ScrollToBottomPill({ count, onClick }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          {...popIn}
          onClick={onClick}
          className="absolute flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold"
          style={{
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 8,
            background: 'color-mix(in srgb, var(--ds-accent-primary) 92%, transparent)',
            color: 'var(--ds-text-inverse)',
            fontFamily: 'Tajawal, sans-serif',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid color-mix(in srgb, white 22%, transparent)',
            boxShadow: '0 10px 30px -8px color-mix(in srgb, var(--ds-accent-primary) 55%, transparent)',
          }}
        >
          <ChevronDown size={16} />
          {count === 1 ? 'رسالة جديدة' : `${count > 99 ? '99+' : count} رسائل جديدة`}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
