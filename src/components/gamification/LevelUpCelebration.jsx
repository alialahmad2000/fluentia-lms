import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Zap } from 'lucide-react'
import { GAMIFICATION_LEVELS } from '../../lib/constants'

export default function LevelUpCelebration({ newLevel, onClose }) {
  if (!newLevel) return null

  const levelInfo = GAMIFICATION_LEVELS.find(l => l.level === newLevel) || GAMIFICATION_LEVELS[0]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Stars / particles */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: (Math.random() - 0.5) * 500,
              y: (Math.random() - 0.5) * 500,
              scale: [0, 1.5, 0],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5 }}
            className="absolute z-[101] text-gold-400"
          >
            <Star size={8 + Math.random() * 12} fill="currentColor" />
          </motion.div>
        ))}

        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 12, stiffness: 150 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[102] w-full max-w-sm"
        >
          <div className="fl-card-static p-8 text-center border-sky-500/30 shadow-2xl shadow-sky-500/10">
            <button onClick={onClose} className="absolute top-3 left-3 text-muted hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>

            {/* Level badge */}
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(56,189,248,0.3)', '0 0 50px rgba(56,189,248,0.5)', '0 0 20px rgba(56,189,248,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-sky-500/20 to-sky-400/10 border-2 border-sky-400/40 flex items-center justify-center mx-auto mb-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 8 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-sky-400">{newLevel}</p>
                <p className="text-xs text-sky-300">LEVEL</p>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sky-400 text-sm font-medium mb-1"
            >
              ترقية مستوى!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-[var(--text-primary)] mb-2"
            >
              {levelInfo.title_ar}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted mb-4"
            >
              وصلت المستوى {newLevel} — {levelInfo.title_en}!
              <br />
              استمر في التعلم!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-xl text-sm font-bold"
            >
              <Zap size={14} /> المستوى {newLevel} من 20
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
