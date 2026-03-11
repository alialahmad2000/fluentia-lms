import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, X, Zap } from 'lucide-react'

export default function AchievementUnlock({ achievement, onClose }) {
  if (!achievement) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Confetti particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: 0, y: 0, scale: 0, opacity: 1,
            }}
            animate={{
              x: (Math.random() - 0.5) * 400,
              y: (Math.random() - 0.5) * 400,
              scale: [0, 1, 0.5],
              opacity: [1, 1, 0],
              rotate: Math.random() * 720,
            }}
            transition={{ duration: 1.5 + Math.random(), delay: 0.2 + Math.random() * 0.3 }}
            className="absolute z-[101]"
            style={{
              width: 8 + Math.random() * 8,
              height: 8 + Math.random() * 8,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              backgroundColor: ['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#fb923c'][Math.floor(Math.random() * 6)],
            }}
          />
        ))}

        {/* Card */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[102] w-full max-w-sm"
        >
          <div className="glass-card p-8 text-center border-gold-500/30 shadow-2xl shadow-gold-500/10">
            {/* Close */}
            <button onClick={onClose} className="absolute top-3 left-3 text-muted hover:text-white transition-colors">
              <X size={18} />
            </button>

            {/* Badge glow */}
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(251,191,36,0.3)', '0 0 40px rgba(251,191,36,0.5)', '0 0 20px rgba(251,191,36,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-gold-500/10 border-2 border-gold-500/30 flex items-center justify-center mx-auto mb-4"
            >
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', damping: 10 }}
                className="text-5xl"
              >
                {achievement.icon}
              </motion.span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gold-400 text-sm font-medium mb-1"
            >
              إنجاز جديد!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-bold text-white mb-2"
            >
              {achievement.name_ar}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted mb-4"
            >
              {achievement.description_ar}
            </motion.p>

            {achievement.xp_reward > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-bold"
              >
                <Zap size={14} /> +{achievement.xp_reward} XP
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
