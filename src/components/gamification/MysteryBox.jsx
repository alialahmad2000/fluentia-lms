import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Zap, Star, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useG } from '../../i18n/gender'

// Reward pool
const REWARDS = [
  { type: 'xp', value: 25, label: '+25 XP مكافأة', icon: '⚡', color: 'sky' },
  { type: 'xp', value: 50, label: '+50 XP مكافأة', icon: '💎', color: 'violet' },
  { type: 'xp', value: 100, label: '+100 XP مكافأة كبرى!', icon: '🌟', color: 'gold' },
  { type: 'xp', value: 15, label: '+15 XP مكافأة', icon: '✨', color: 'sky' },
  { type: 'streak_freeze', value: 1, label: 'تجميد السلسلة!', icon: '🧊', color: 'sky' },
  { type: 'xp', value: 30, label: '+30 XP مكافأة', icon: '🎉', color: 'gold' },
]

function getRandomReward() {
  // Weighted: smaller rewards more likely
  const weights = [30, 20, 5, 30, 10, 15]
  const total = weights.reduce((a, b) => a + b, 0)
  let rand = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return REWARDS[i]
  }
  return REWARDS[0]
}

export default function MysteryBox() {
  const g = useG()
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const queryClient = useQueryClient()
  const [showReward, setShowReward] = useState(null)
  const [isOpening, setIsOpening] = useState(false)

  const studentId = profile?.id

  // Check consecutive submissions (every 5 = 1 mystery box)
  const { data: boxAvailable } = useQuery({
    queryKey: ['mystery-box-status', studentId],
    queryFn: async () => {
      // Count total submissions
      const { count: totalSubmissions } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .is('deleted_at', null)

      // Count boxes already opened (stored as xp_transactions with reason 'mystery_box')
      const { count: boxesOpened } = await supabase
        .from('xp_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('reason', 'mystery_box')

      const boxesEarned = Math.floor((totalSubmissions || 0) / 5)
      const available = boxesEarned - (boxesOpened || 0)

      return {
        available: Math.max(0, available),
        totalSubmissions: totalSubmissions || 0,
        nextBoxAt: ((boxesOpened || 0) + 1) * 5,
      }
    },
    enabled: !!studentId,
  })

  // Open box
  const openBox = useMutation({
    mutationFn: async () => {
      setIsOpening(true)

      // Wait for animation
      await new Promise(r => setTimeout(r, 1500))

      const reward = getRandomReward()

      if (reward.type === 'xp') {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: reward.value,
          reason: 'mystery_box',
          description: `صندوق الغموض: ${reward.label}`,
        })
      } else if (reward.type === 'streak_freeze') {
        await supabase.from('xp_transactions').insert({
          student_id: studentId,
          amount: 0,
          reason: 'mystery_box',
          description: 'صندوق الغموض: تجميد السلسلة',
        })
        // Grant streak freeze
        await supabase
          .from('students')
          .update({ streak_freeze_available: true })
          .eq('id', studentId)
      }

      setIsOpening(false)
      return reward
    },
    onSuccess: (reward) => {
      setShowReward(reward)
      queryClient.invalidateQueries({ queryKey: ['mystery-box-status'] })
      queryClient.invalidateQueries({ queryKey: ['student-xp-history'] })
    },
  })

  if (!boxAvailable || boxAvailable.available <= 0) {
    const remaining = (boxAvailable?.nextBoxAt || 5) - (boxAvailable?.totalSubmissions || 0)
    if (remaining <= 0 || remaining > 5) return null

    return (
      <div
        className="fl-card-static p-7"
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--ds-surface-1)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-gold, var(--ds-accent-primary)) 30%, transparent)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">🎁</div>
          <div className="flex-1">
            <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>صندوق الغموض</p>
            <p className="text-sm text-violet-400">{remaining} واجبات متبقية للصندوق التالي</p>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < (5 - remaining) ? 'bg-violet-400' : 'bg-[var(--surface-raised)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card p-7 cursor-pointer hover:translate-y-[-2px] transition-all duration-200"
        style={{
          width: '100%',
          height: '100%',
          background: 'var(--ds-surface-1)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onClick={() => !isOpening && openBox.mutate()}
      >
        <div className="flex items-center gap-5">
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-gold, var(--ds-accent-primary)) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-accent-gold, var(--ds-accent-primary)) 20%, transparent)',
            }}
          >
            {isOpening ? '✨' : '🎁'}
          </motion.div>
          <div className="flex-1">
            <p className="text-lg font-semibold" style={{ color: 'var(--ds-text-primary)' }}>صندوق الغموض!</p>
            <p className="text-sm" style={{ color: 'var(--ds-accent-gold, var(--ds-accent-primary))' }}>
              {boxAvailable.available} صندوق متاح — {g('اضغط', 'اضغطي')} لفتحه
            </p>
          </div>
          <Gift size={20} style={{ color: 'var(--ds-accent-gold, var(--ds-accent-primary))' }} />
        </div>

        {isOpening && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5 }}
            className="h-1 bg-gradient-to-l from-gold-400 to-gold-500 rounded-full mt-3"
          />
        )}
      </motion.div>

      {/* Reward reveal modal */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowReward(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.2, delay: Math.random() * 0.3 }}
                className="absolute z-[101]"
                style={{
                  fontSize: 16 + Math.random() * 16,
                }}
              >
                {['⭐', '✨', '💎', '🎉', '🌟'][Math.floor(Math.random() * 5)]}
              </motion.div>
            ))}

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-[102] w-full max-w-xs"
            >
              <div className="fl-card-static p-8 text-center border-gold-500/30">
                <button onClick={() => setShowReward(null)} className="absolute top-3 left-3 btn-ghost p-1.5 rounded-xl text-muted hover:text-[var(--text-primary)] transition-all duration-200">
                  <X size={18} />
                </button>

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                  className="text-6xl mb-4"
                >
                  {showReward.icon}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gold-400 text-sm font-medium mb-1"
                >
                  مبروك!
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg font-bold text-[var(--text-primary)]"
                >
                  {showReward.label}
                </motion.h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
