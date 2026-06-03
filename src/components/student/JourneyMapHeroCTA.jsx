import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Map, X, ArrowLeft } from 'lucide-react'
import { useAuthProfile, useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export default function JourneyMapHeroCTA() {
  // ── ALL HOOKS FIRST ──────────────────────────────────────────────
  const profile = useAuthProfile()
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
        className="relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent-primary) 10%, transparent), color-mix(in srgb, var(--ds-accent-secondary) 6%, transparent)), var(--ds-surface-1)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 30%, transparent)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--ds-shadow-md)',
        }}
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-1.5 transition-colors hover:opacity-100"
          style={{ color: 'var(--ds-text-tertiary)', borderRadius: 'var(--radius-md)' }}
          aria-label="إغلاق"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-4 p-5 pr-5 pl-10">
          {/* Pulsing icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 flex items-center justify-center flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-primary) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 30%, transparent)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--ds-shadow-glow)',
            }}
          >
            <Map size={24} color="var(--ds-accent-primary)" />
          </motion.div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-bold mb-1"
              style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Tajawal', sans-serif" }}
            >
              رحلتك تنتظرك
            </p>
            <p
              className="text-sm font-bold leading-snug"
              style={{ color: 'var(--ds-text-primary)', fontFamily: "'Tajawal', sans-serif" }}
            >
              ابدأي رحلة طلاقة — الوحدة الأولى بانتظارك
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/student/level-journey')}
            className="relative overflow-hidden flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold flex-shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
              color: 'var(--ds-text-inverse)',
              fontFamily: "'Tajawal', sans-serif",
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 16px 32px -14px var(--ds-accent-primary-glow)',
            }}
          >
            {/* Top inner sheen */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), transparent)',
              }}
            />
            <span className="relative flex items-center gap-1.5">
              افتحي الخريطة
              <ArrowLeft size={14} />
            </span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
