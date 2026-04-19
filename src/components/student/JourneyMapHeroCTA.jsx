import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Map, X, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export default function JourneyMapHeroCTA() {
  // ── ALL HOOKS FIRST ──────────────────────────────────────────────
  const { profile } = useAuthStore()
  const isImpersonating = useAuthStore(s => s.isImpersonating)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    const ts = localStorage.getItem(`fluentia.journeyHeroCTA.dismissed.${profile.id}`)
    if (ts && Date.now() - parseInt(ts) < THREE_DAYS_MS) setDismissed(true)
  }, [profile?.id])

  const { data: snapshotCount } = useQuery({
    queryKey: ['journey-hero-snapshot-count', profile?.id],
    enabled: !!profile?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('student_unit_skill_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profile.id)
      return count ?? 0
    },
  })

  // ── GUARDS (AFTER all hooks) ──────────────────────────────────────
  if (!profile) return null
  if (isImpersonating) return null
  if (dismissed) return null
  if (snapshotCount === undefined) return null
  if (snapshotCount > 0) return null   // already started V3 journey

  const handleDismiss = () => {
    localStorage.setItem(`fluentia.journeyHeroCTA.dismissed.${profile.id}`, Date.now().toString())
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        dir="rtl"
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(139,92,246,0.07) 100%)',
          border: '1px solid rgba(251,191,36,0.22)',
        }}
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-1.5 rounded-lg transition-colors hover:text-white"
          style={{ color: 'rgba(148,163,184,0.7)' }}
          aria-label="إغلاق"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-4 p-5 pr-5 pl-10">
          {/* Pulsing icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(251,191,36,0.10)',
              border: '1px solid rgba(251,191,36,0.22)',
              boxShadow: '0 0 20px rgba(251,191,36,0.12)',
            }}
          >
            <Map size={24} color="#fbbf24" />
          </motion.div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-bold mb-1"
              style={{ color: '#fbbf24', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Tajawal', sans-serif" }}
            >
              رحلتك تنتظرك
            </p>
            <p
              className="text-sm font-bold leading-snug"
              style={{ color: 'rgba(248,250,252,0.88)', fontFamily: "'Tajawal', sans-serif" }}
            >
              ابدأي رحلة طلاقة — الوحدة الأولى بانتظارك
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/student/level-journey')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#0a0a0f',
              fontFamily: "'Tajawal', sans-serif",
              boxShadow: '0 4px 14px rgba(251,191,36,0.25)',
            }}
          >
            افتحي الخريطة
            <ArrowLeft size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
