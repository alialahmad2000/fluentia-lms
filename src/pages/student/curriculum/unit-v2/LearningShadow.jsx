import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/**
 * Tiny live counter above Mission Grid: "اليوم: X كلمة · Y دقيقة · Z XP"
 * Hidden when student has no activity today or during impersonation.
 * Refetches on fluentia:activity-completed and fluentia:vocab-added events.
 */
export default function LearningShadow() {
  const profile = useAuthStore(s => s.profile)
  const isImpersonating = useAuthStore(s => s.isImpersonating)
  const studentId = profile?.id

  const { data, refetch } = useQuery({
    queryKey: ['learning-shadow', studentId],
    enabled: !!studentId && !isImpersonating,
    staleTime: 30_000,
    queryFn: async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: xpRows } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('student_id', studentId)
        .gte('created_at', todayStart.toISOString())

      const xpToday = (xpRows || []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

      const { count: vocabToday } = await supabase
        .from('student_saved_words')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .gte('created_at', todayStart.toISOString())

      // Rough time estimate: 25 XP ≈ 15 min
      const minutesToday = Math.round(xpToday * 0.6)

      return { xpToday, vocabToday: vocabToday || 0, minutesToday }
    },
  })

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('fluentia:activity-completed', handler)
    window.addEventListener('fluentia:vocab-added', handler)
    return () => {
      window.removeEventListener('fluentia:activity-completed', handler)
      window.removeEventListener('fluentia:vocab-added', handler)
    }
  }, [refetch])

  if (isImpersonating || !data) return null
  const { xpToday, vocabToday, minutesToday } = data
  if (xpToday === 0 && vocabToday === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      dir="rtl"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 14px',
        borderRadius: '100px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: "'Tajawal', sans-serif",
        fontSize: '13px',
        color: 'rgba(248,250,252,0.6)',
      }}
    >
      <span style={{ color: 'var(--cinematic-accent-gold, #fbbf24)', fontWeight: 700 }}>اليوم:</span>
      <Stat label="كلمة" value={vocabToday} />
      <Dot />
      <Stat label="دقيقة" value={minutesToday} />
      <Dot />
      <Stat label="XP" value={xpToday} />
    </motion.div>
  )
}

function Stat({ label, value }) {
  return (
    <span>
      <strong style={{ color: 'rgba(248,250,252,0.9)' }}>{value}</strong>{' '}{label}
    </span>
  )
}

function Dot() {
  return <span style={{ opacity: 0.3 }}>·</span>
}
