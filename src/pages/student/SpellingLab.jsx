import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Headphones, Eye, GraduationCap, CheckCircle2, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import SpellingSession from './spelling-lab/SpellingSession'

// ── Spelling Lab (مختبر الإملاء) — prompt 09, Surface 3 ─────────────────────
// Premium, leveled, curriculum-sourced spelling drill. Net-new, lives alongside
// the legacy "مدرب الإملاء" trainer. Calm UI — no XP fireworks, no leaderboard.
// Velvet Midnight --ds-* tokens; Amiri (AR headings) / Cormorant (EN) / Readex (body).

const GOLD = 'var(--ds-accent-primary, #e9b949)'

function StatTile({ icon: Icon, label, value }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl p-4"
      style={{ background: 'var(--ds-card, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))' }}
    >
      <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ds-text-tertiary, #64748b)', fontFamily: "'Tajawal', sans-serif" }}>
        <Icon size={14} style={{ color: GOLD }} /> {label}
      </span>
      <span className="text-[26px] font-semibold tabular-nums" style={{ color: 'var(--ds-text-primary, #f8fafc)', fontFamily: "'Readex Pro', sans-serif" }}>
        {value}
      </span>
    </div>
  )
}

function Hairline() {
  return <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(233,185,73,0.35), transparent)' }} />
}

export default function SpellingLab() {
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const [view, setView] = useState('home')          // home | session
  const [sessionMode, setSessionMode] = useState('listen_type')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['spelling-lab-stats', profile?.id],
    enabled: !!profile?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString()
      const [lvlRes, masteredRes, dueRes] = await Promise.all([
        supabase.rpc('spelling_lab_student_level'),
        supabase.from('spelling_lab_mastery').select('id', { count: 'exact', head: true }).eq('state', 'mastered'),
        supabase.from('spelling_lab_mastery').select('id', { count: 'exact', head: true })
          .not('due_at', 'is', null).lte('due_at', nowIso).in('state', ['learning', 'reviewing']),
      ])
      return {
        level: lvlRes.data ?? 1,
        mastered: masteredRes.count ?? 0,
        due: dueRes.count ?? 0,
      }
    },
  })

  const startSession = useCallback((mode) => {
    setSessionMode(mode)
    setView('session')
  }, [])

  const exitSession = useCallback(() => {
    setView('home')
    queryClient.invalidateQueries({ queryKey: ['spelling-lab-stats', profile?.id] })
  }, [queryClient, profile?.id])

  if (!profile?.id) return null

  if (view === 'session') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <SpellingSession mode={sessionMode} onExit={exitSession} />
      </div>
    )
  }

  const due = stats?.due ?? 0

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7" dir="rtl">
      {/* Header */}
      <header>
        <h1 style={{ fontFamily: "'Amiri', serif", fontWeight: 700, fontSize: 34, lineHeight: 1.2, color: 'var(--ds-text-primary, #f8fafc)' }}>
          مختبر الإملاء
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: GOLD }}>
          Spelling Training Lab
        </p>
      </header>

      <Hairline />

      {/* Stat tiles — single column under sm, three across above */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={GraduationCap} label="المستوى" value={isLoading ? '—' : stats.level} />
        <StatTile icon={CheckCircle2} label="كلمات متقنة" value={isLoading ? '—' : stats.mastered} />
        <StatTile icon={Clock} label="في المراجعة" value={isLoading ? '—' : due} />
      </div>

      {/* Today's session */}
      <section className="space-y-3">
        <h2 className="text-[16px] font-medium" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
          جلسة اليوم
        </h2>

        <motion.button
          type="button" onClick={() => startSession('listen_type')} whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 text-right"
          style={{ background: GOLD, color: 'var(--ds-primary-ink, #0a0a0f)' }}
        >
          <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.12)' }}>
            <Headphones size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold" style={{ fontFamily: "'Tajawal', sans-serif" }}>استماع وكتابة</span>
            <span className="block text-[12px] opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>اسمع الكلمة ثم اكتبها</span>
          </span>
        </motion.button>

        <motion.button
          type="button" onClick={() => startSession('see_retype')} whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 text-right"
          style={{ background: 'var(--ds-card, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.12))', color: 'var(--ds-text-primary, #f8fafc)' }}
        >
          <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', color: GOLD }}>
            <Eye size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold" style={{ fontFamily: "'Tajawal', sans-serif" }}>عرض وإعادة كتابة</span>
            <span className="block text-[12px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-tertiary, #64748b)' }}>انظر للكلمة لحظة ثم اكتبها من الذاكرة</span>
          </span>
        </motion.button>
      </section>

      {/* Due review — only when there's something due */}
      {!isLoading && due > 0 && (
        <>
          <Hairline />
          <section className="space-y-3">
            <h2 className="text-[16px] font-medium" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
              المراجعة المستحقّة
            </h2>
            <div
              className="flex items-center justify-between rounded-2xl px-5 py-4"
              style={{ background: 'var(--ds-card, rgba(255,255,255,0.03))', border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.07))' }}
            >
              <span className="text-[14px]" style={{ fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-secondary, #94a3b8)' }}>
                {due} {due === 1 ? 'كلمة تنتظر' : 'كلمة تنتظر'} المراجعة
              </span>
              <button
                type="button" onClick={() => startSession('listen_type')}
                className="h-10 px-4 rounded-xl text-[13px] font-medium"
                style={{ border: `1px solid ${GOLD}`, color: GOLD, fontFamily: "'Tajawal', sans-serif" }}
              >
                ابدأ المراجعة
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
