import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Headphones, Eye, GraduationCap, CheckCircle2, Clock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import VocabShell from '../../components/vocab-cosmos/VocabShell'
import VocabHeader from '../../components/vocab-cosmos/VocabHeader'
import { useVocabStats } from '../../hooks/useVocabStats'
import { toArabicNum } from '../../lib/vocabFormat'
import SpellingSession from './spelling-lab/SpellingSession'

// ── Spelling Lab (مختبر الإملاء) — Surface 4 of the Constellation identity ────
// Premium, leveled, curriculum-sourced spelling drill. Uses its OWN data
// (spelling_lab_* tables/RPCs) — spelling is a separate skill from the vocab
// review queue. This surface is harmonized into the indigo/gold "constellation"
// world so it feels like one product with the other vocab surfaces.
// Calm UI — no XP fireworks, no leaderboard. Gold = mastery only.

// The English display word keeps its premium serif pairing via .vc-word.

function StatTile({ icon: Icon, label, value, gold = false }) {
  // Gold is reserved for mastery — the "متقنة" tile gets a warm gold wash;
  // the others stay in the indigo field.
  const goldStyle = gold
    ? {
        background: 'rgba(251, 191, 36, 0.07)',
        borderColor: 'rgba(251, 191, 36, 0.28)',
      }
    : undefined
  return (
    <div className="vc-card p-4 flex flex-col gap-1.5" style={goldStyle}>
      <span
        className="flex items-center gap-2 text-xs"
        style={{ color: 'var(--vc-text-dim)' }}
      >
        <Icon size={14} style={{ color: gold ? 'var(--vc-gold)' : 'var(--vc-indigo-bright)' }} />
        {label}
      </span>
      <span
        className="text-2xl sm:text-[26px] font-bold tabular-nums"
        style={{ color: gold ? 'var(--vc-gold-soft)' : 'var(--vc-text)' }}
      >
        {value}
      </span>
    </div>
  )
}

export default function SpellingLab() {
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const vocabStats = useVocabStats()
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
      <VocabShell maxWidth="max-w-2xl">
        <SpellingSession mode={sessionMode} onExit={exitSession} />
      </VocabShell>
    )
  }

  const due = stats?.due ?? 0

  return (
    <VocabShell maxWidth="max-w-2xl">
      <VocabHeader
        title="مختبر الإملاء"
        subtitle="درّبي إملاءكِ نجمةً بعد نجمة"
        stats={vocabStats?.data}
      />

      {/* Stat tiles — single column under sm, three across above */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={GraduationCap} label="المستوى" value={isLoading ? '—' : toArabicNum(stats.level)} />
        <StatTile icon={CheckCircle2} label="كلمات متقنة" value={isLoading ? '—' : toArabicNum(stats.mastered)} gold />
        <StatTile icon={Clock} label="تنتظر المراجعة" value={isLoading ? '—' : toArabicNum(due)} />
      </div>

      {/* Today's session */}
      <section className="mt-7 space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--vc-text-soft)' }}>
          جلسة اليوم
        </h2>

        <motion.button
          type="button" onClick={() => startSession('listen_type')} whileTap={{ scale: 0.99 }}
          className="vc-card vc-card-hover w-full flex items-center gap-3 px-5 py-4 text-right"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--vc-indigo), var(--vc-violet))',
              color: '#0a0e1c',
            }}
          >
            <Headphones size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold" style={{ color: 'var(--vc-text)' }}>استماع وكتابة</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>اسمعي الكلمة ثم اكتبيها</span>
          </span>
        </motion.button>

        <motion.button
          type="button" onClick={() => startSession('see_retype')} whileTap={{ scale: 0.99 }}
          className="vc-card vc-card-hover w-full flex items-center gap-3 px-5 py-4 text-right"
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}
          >
            <Eye size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold" style={{ color: 'var(--vc-text)' }}>عرض وإعادة كتابة</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>انظري للكلمة لحظة ثم اكتبيها من الذاكرة</span>
          </span>
        </motion.button>
      </section>

      {/* Due review — only when there's something due */}
      {!isLoading && due > 0 && (
        <section className="mt-7 space-y-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--vc-text-soft)' }}>
            المراجعة المستحقّة
          </h2>
          <div className="vc-card flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-sm" style={{ color: 'var(--vc-text-soft)' }}>
              {due === 1
                ? 'كلمة واحدة تنتظر المراجعة'
                : `${toArabicNum(due)} كلمات تنتظر المراجعة`}
            </span>
            <button
              type="button" onClick={() => startSession('listen_type')}
              className="vc-btn vc-btn-primary shrink-0"
              style={{ padding: '0.6rem 1.1rem', fontSize: '0.8125rem' }}
            >
              ابدئي المراجعة
            </button>
          </div>
        </section>
      )}
    </VocabShell>
  )
}
