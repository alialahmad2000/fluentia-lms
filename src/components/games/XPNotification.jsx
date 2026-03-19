import { motion, AnimatePresence } from 'framer-motion'

export default function XPNotification({ xp }) {
  return (
    <AnimatePresence>
      {xp > 0 && (
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 text-amber-400 font-bold text-lg px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/10 font-['Tajawal']"
        >
          +{xp} نقطة XP
        </motion.div>
      )}
    </AnimatePresence>
  )
}
