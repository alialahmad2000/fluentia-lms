import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Headphones, Eye, BarChart3, Sparkles, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import VocabShell from '../../components/vocab-cosmos/VocabShell'
import VocabHeader from '../../components/vocab-cosmos/VocabHeader'
import { useVocabStats } from '../../hooks/useVocabStats'
import { toArabicNum } from '../../lib/vocabFormat'
import SpellingSession from './spelling-lab/SpellingSession'
import SpellingProgressMap from './spelling-lab/SpellingProgressMap'
import SpellingActivityReport from './spelling-lab/SpellingActivityReport'
import SpellingStrengthReport from './spelling-lab/SpellingStrengthReport'

// ── Spelling Lab (مختبر الإملاء) — Surface 4 of the Constellation identity ────
// Premium, leveled, curriculum-sourced spelling drill. Uses its OWN data
// (spelling_lab_* tables/RPCs) — spelling is a separate skill from the vocab
// review queue. Home shows a progression map (where am I / what's next), the two
// drill modes, and two reports (my activity, my strengths). Calm UI — no XP
// fireworks, no leaderboard. Gold = mastery only.

// A tappable report entry card for the "تقاريري" section.
function ReportCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <motion.button
      type="button" onClick={onClick} whileTap={{ scale: 0.99 }}
      className="vc-card vc-card-hover w-full flex items-center gap-3 px-5 py-4 text-right"
    >
      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}>
        <Icon size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold" style={{ color: 'var(--vc-text)' }}>{title}</span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>{subtitle}</span>
      </span>
      <ChevronLeft size={18} style={{ color: 'var(--vc-text-dim)' }} />
    </motion.button>
  )
}

export default function SpellingLab() {
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const vocabStats = useVocabStats()
  const [view, setView] = useState('home')              // home | session | activity | strength
  const [sessionMode, setSessionMode] = useState('listen_type')
  const [sessionSource, setSessionSource] = useState('session')  // session | weak

  const { data: overview, isLoading } = useQuery({
    queryKey: ['spelling-lab-overview', profile?.id],
    enabled: !!profile?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('spelling_lab_overview')
      if (error) throw error
      return data
    },
  })

  const startSession = useCallback((mode, source = 'session') => {
    setSessionMode(mode)
    setSessionSource(source)
    setView('session')
  }, [])

  const exitSession = useCallback(() => {
    setView('home')
    queryClient.invalidateQueries({ queryKey: ['spelling-lab-overview', profile?.id] })
    queryClient.invalidateQueries({ queryKey: ['spelling-activity-report', profile?.id] })
    queryClient.invalidateQueries({ queryKey: ['spelling-strength-report', profile?.id] })
  }, [queryClient, profile?.id])

  if (!profile?.id) return null

  if (view === 'session') {
    return (
      <VocabShell maxWidth="max-w-2xl">
        <SpellingSession mode={sessionMode} source={sessionSource} onExit={exitSession} />
      </VocabShell>
    )
  }

  if (view === 'activity') {
    return (
      <VocabShell maxWidth="max-w-2xl">
        <SpellingActivityReport onBack={() => setView('home')} />
      </VocabShell>
    )
  }

  if (view === 'strength') {
    return (
      <VocabShell maxWidth="max-w-2xl">
        <SpellingStrengthReport
          onBack={() => setView('home')}
          onPracticeWeak={() => startSession('listen_type', 'weak')}
        />
      </VocabShell>
    )
  }

  const due = overview?.due ?? 0

  return (
    <VocabShell maxWidth="max-w-2xl">
      <VocabHeader
        title="مختبر الإملاء"
        subtitle="درّبي إملاءكِ نجمةً بعد نجمة"
        stats={vocabStats?.data}
      />

      {/* progression map — where am I / what's next */}
      <SpellingProgressMap
        overview={overview}
        loading={isLoading}
        onStart={() => startSession('listen_type')}
      />

      {/* Drill modes */}
      <section className="mt-7 space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--vc-text-soft)' }}>
          اختاري طريقة التدريب
        </h2>

        <motion.button
          type="button" onClick={() => startSession('listen_type')} whileTap={{ scale: 0.99 }}
          className="vc-card vc-card-hover w-full flex items-center gap-3 px-5 py-4 text-right"
        >
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--vc-indigo), var(--vc-violet))', color: '#0a0e1c' }}>
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
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}>
            <Eye size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold" style={{ color: 'var(--vc-text)' }}>تذكّر الكلمة</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>ادرسيها ثوانٍ، ثم تختفي لتكتبيها من الذاكرة</span>
          </span>
        </motion.button>
      </section>

      {/* Reports */}
      <section className="mt-7 space-y-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--vc-text-soft)' }}>
          تقاريري
        </h2>
        <ReportCard
          icon={BarChart3}
          title="نشاطي"
          subtitle="ماذا أنجزتِ منذ البداية"
          onClick={() => setView('activity')}
        />
        <ReportCard
          icon={Sparkles}
          title="نقاط قوّتي وضعفي"
          subtitle="أقوى كلماتكِ وأضعفها"
          onClick={() => setView('strength')}
        />
      </section>

      {/* Due review — only when there's something due */}
      {!isLoading && due > 0 && (
        <section className="mt-7 space-y-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--vc-text-soft)' }}>
            المراجعة المستحقّة
          </h2>
          <div className="vc-card flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-sm" style={{ color: 'var(--vc-text-soft)' }}>
              {due === 1 ? 'كلمة واحدة تنتظر المراجعة' : `${toArabicNum(due)} كلمات تنتظر المراجعة`}
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
