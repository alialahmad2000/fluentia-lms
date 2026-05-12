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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium z-20 shadow-lg"
          style={{
            background: 'color-mix(in srgb, var(--ds-accent-primary) 90%, transparent)',
            color: 'var(--ds-bg-base)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          <ChevronDown size={16} />
          {count} رسائل جديدة
        </motion.button>
      )}
    </AnimatePresence>
  )
}
