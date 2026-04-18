import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, CheckCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { CommandCard } from '@/design-system/trainer'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'طاب يومك'
  return 'مساء الخير'
}

export default function MorningRitualCard({ todayRitual, trainerName }) {
  const [processing, setProcessing] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()

  const isDone = !!todayRitual?.morning_completed_at

  async function startRitual() {
    if (processing || !profile?.id) return
    setProcessing(true)
    const { data, error } = await supabase.rpc('start_morning_ritual', {
      p_trainer_id: profile.id,
    })
    setProcessing(false)
    if (!error && data?.success) {
      setJustCompleted(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['trainer-cockpit'] })
        queryClient.invalidateQueries({ queryKey: ['trainer-sidebar-badges'] })
      }, 600)
    }
  }

  if (isDone && !justCompleted) {
    return (
      <div className="tr-ritual-done">
        <CheckCircle size={14} className="tr-ritual-done__icon" />
        <span>
          بدأت يومك ·{' '}
          {new Date(todayRitual.morning_completed_at).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    )
  }

  return (
    <CommandCard elevated className="tr-ritual-card">
      <div className="tr-ritual-card__sun">
        <Sun size={26} aria-hidden="true" />
      </div>
      <div className="tr-ritual-card__body">
        <h3 className="tr-display tr-ritual-card__greeting">
          {getGreeting()}{trainerName ? `، ${trainerName}` : ''}
        </h3>
        <p className="tr-ritual-card__sub">ابدأ يومك — اطّلع على ما ينتظرك</p>
      </div>
      <button
        className="tr-ritual-card__btn"
        onClick={startRitual}
        disabled={processing}
        aria-busy={processing}
      >
        {processing ? '...' : 'ابدأ اليوم +٣ XP'}
      </button>
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            className="tr-ritual-card__burst"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            aria-live="polite"
          >
            +٣ XP 🌅
          </motion.div>
        )}
      </AnimatePresence>
    </CommandCard>
  )
}
