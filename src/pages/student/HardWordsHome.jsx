import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Shuffle,
  BookOpen,
  Headphones,
  Keyboard,
  CheckCircle,
  ArrowLeft,
  BarChart3,
} from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getHardWords, getHardWordsCount } from '../../services/vocab'
import { useVocabStats } from '../../hooks/useVocabStats'
import VocabShell from '../../components/vocab-cosmos/VocabShell'
import VocabHeader from '../../components/vocab-cosmos/VocabHeader'
import { toArabicNum } from '../../lib/vocabFormat'
import DrillSessionContainer from '../../components/hard-words/DrillSessionContainer'
import {
  DRILL_MODES,
  DRILL_MODE_AR,
  DRILL_MODE_DESCRIPTION_AR,
  deriveAvailableModes,
} from '../../components/hard-words/hardWordsBatch'

const MODE_ICON = {
  matching: Shuffle,
  context_fill: BookOpen,
  listening: Headphones,
  typing_recall: Keyboard,
}

const MODE_REQUIREMENT_AR = {
  matching: 'تحتاجين ٦ كلمات صعبة على الأقل لهذا التدريب',
  context_fill: 'تحتاجين كلمات صعبة لها أمثلة في الجمل',
  listening: 'تحتاجين كلمات صعبة لها صوت',
  typing_recall: 'تحتاجين كلمة صعبة واحدة على الأقل',
}

const DAY_INITIALS_AR = ['أ', 'إ', 'ث', 'ر', 'خ', 'ج', 'س'] // Sun..Sat

export default function HardWordsHome() {
  const profile = useAuthProfile()
  const profileId = profile?.id

  const [activeMode, setActiveMode] = useState(null)
  const [autoplay, setAutoplay] = useState(true)

  const vocabStats = useVocabStats()

  // Hero count — cheap, from the unified store (vocab_cards).
  const { data: hardCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ['hard-words', 'count', profileId],
    queryFn: () => getHardWordsCount(profileId),
    enabled: !!profileId,
    staleTime: 30_000,
  })

  // The hard cards themselves — drives the mode cards + the drill batches.
  const { data: hardCards = [] } = useQuery({
    queryKey: ['hard-words', 'cards', profileId],
    queryFn: () => getHardWords(profileId, 200),
    enabled: !!profileId,
    staleTime: 30_000,
  })

  // 7-day drill activity (still reads hard_words_drill_log, now keyed by student_id).
  const { data: activity } = useQuery({
    queryKey: ['hard-words', 'activity', profileId],
    queryFn: () => getRecentDrillActivity(profileId, 7),
    enabled: !!profileId,
    staleTime: 60_000,
  })

  // Autoplay pref for the listening drill.
  useQuery({
    queryKey: ['hard-words', 'prefs', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('srs_autoplay_audio')
        .eq('id', profileId)
        .maybeSingle()
      if (error) throw error
      setAutoplay(data?.srs_autoplay_audio !== false)
      return data
    },
    enabled: !!profileId,
    staleTime: 5 * 60_000,
  })

  const total = hardCount
  const availableModes = useMemo(() => new Set(deriveAvailableModes(hardCards)), [hardCards])

  // Cause chips, derived from the hard cards (harmonized indigo, red/amber heat kept).
  const causes = useMemo(() => {
    const list = hardCards || []
    return {
      highLapses: list.filter((c) => (c.lapses ?? 0) >= 2).length,
      highDifficulty: list.filter((c) => (c.difficulty ?? 0) >= 7).length,
      lowStreak: list.filter((c) => (c.hw_correct_streak ?? 0) === 0).length,
    }
  }, [hardCards])

  const drillCount7d = useMemo(
    () => (activity || []).reduce((sum, d) => sum + (d.count || 0), 0),
    [activity]
  )

  const maxBar = useMemo(() => {
    const counts = (activity || []).map((a) => a.count)
    return Math.max(1, ...counts)
  }, [activity])

  // ── Empty state ─────────────────────────────────────────────
  if (!countLoading && total === 0) {
    return (
      <VocabShell>
        <VocabHeader
          title="تدريب الكلمات الصعبة"
          subtitle="الكلمات اللي تواجهين معها صعوبة في المراجعة"
          stats={vocabStats?.data}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="vc-card p-8 text-center mt-2"
        >
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
            style={{
              background: 'rgba(52,211,153,0.14)',
              color: 'rgb(52,211,153)',
              boxShadow: '0 12px 30px -10px rgba(52,211,153,0.4)',
            }}
          >
            <CheckCircle size={30} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--vc-text)' }}>
            ما عندك كلمات صعبة الآن ✦
          </h2>
          <p className="mt-2.5 text-sm" style={{ color: 'var(--vc-text-dim)' }}>
            استمري بالمراجعة اليومية، وراح نبيّن لك الصعب أول ما يظهر.
          </p>
          <Link to="/student/srs" className="vc-btn vc-btn-primary mt-6 inline-flex">
            العودة لمراجعة المفردات
            <ArrowLeft size={16} />
          </Link>
        </motion.div>
      </VocabShell>
    )
  }

  // ── Main dashboard ─────────────────────────────────────────
  return (
    <VocabShell>
      <VocabHeader
        title="تدريب الكلمات الصعبة"
        subtitle="الكلمات اللي تواجهين معها صعوبة في المراجعة"
        stats={vocabStats?.data}
      />

      {/* Hero: count + cause chips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="vc-card p-6 sm:p-8"
      >
        <div className="flex items-end gap-4">
          <div
            className="text-5xl sm:text-6xl font-extrabold leading-none tabular-nums"
            style={{ color: 'var(--vc-text)' }}
          >
            {toArabicNum(total)}
          </div>
          <p className="pb-1.5 text-sm" style={{ color: 'var(--vc-text-soft)' }}>
            كلمة تحتاج تدريب
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <CauseChip label="سقطتِ فيها كثيراً" value={causes.highLapses} tone="red" />
          <CauseChip label="صعبة المستوى" value={causes.highDifficulty} tone="amber" />
          <CauseChip label="تحتاج تثبيت" value={causes.lowStreak} tone="indigo" />
        </div>
      </motion.div>

      {/* Mode cards */}
      <div className="mt-6">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--vc-text-soft)' }}>
          اختاري نوع التدريب
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DRILL_MODES.map((mode) => (
            <ModeCard
              key={mode}
              mode={mode}
              available={availableModes.has(mode)}
              requirement={MODE_REQUIREMENT_AR[mode]}
              onStart={() => setActiveMode(mode)}
            />
          ))}
        </div>
      </div>

      {/* 7-day activity chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="vc-card p-5 mt-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-bold flex items-center gap-1.5"
            style={{ color: 'var(--vc-text-soft)' }}
          >
            <BarChart3 size={14} />
            تدربتِ على {toArabicNum(drillCount7d)} كلمة هذا الأسبوع
          </h3>
          <span className="text-xs" style={{ color: 'var(--vc-text-dim)' }}>
            آخر ٧ أيام
          </span>
        </div>
        <div className="flex items-end gap-2 h-24" dir="ltr">
          {(activity || Array.from({ length: 7 })).map((day, i) => {
            const count = day?.count ?? 0
            const heightPct = (count / maxBar) * 100
            const dayDate = day?.date ? new Date(day.date) : null
            const dayLabel = dayDate ? DAY_INITIALS_AR[dayDate.getDay()] : ''
            const isToday = i === (activity?.length ?? 7) - 1
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: `${Math.max(4, heightPct)}%`,
                    background: isToday ? 'var(--vc-indigo)' : 'var(--vc-surface-2)',
                    boxShadow: isToday && count > 0 ? 'var(--vc-glow-indigo)' : 'none',
                    opacity: count === 0 ? 0.4 : 1,
                  }}
                  title={`${count} تدريب`}
                />
                <span className="text-xs" style={{ color: 'var(--vc-text-dim)' }}>
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Drill modal */}
      {activeMode && (
        <DrillSessionContainer
          mode={activeMode}
          cards={hardCards}
          autoplay={autoplay}
          onClose={() => setActiveMode(null)}
        />
      )}
    </VocabShell>
  )
}

// Red/amber heat for "difficulty" kept, harmonized with indigo.
const CHIP_TONES = {
  red: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.28)', fg: 'rgb(248,113,113)' },
  amber: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)', fg: 'rgb(251,191,36)' },
  indigo: { bg: 'var(--vc-surface-2)', border: 'var(--vc-border)', fg: 'var(--vc-indigo-bright)' },
}

function CauseChip({ label, value, tone = 'indigo' }) {
  if (!value) return null
  const t = CHIP_TONES[tone] || CHIP_TONES.indigo
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
    >
      <span>{label}</span>
      <span className="tabular-nums" style={{ opacity: 0.85 }}>
        {toArabicNum(value)}
      </span>
    </span>
  )
}

function ModeCard({ mode, available, requirement, onStart }) {
  const Icon = MODE_ICON[mode]
  return (
    <div
      className={`vc-card ${available ? 'vc-card-hover' : ''} p-4`}
      style={{ opacity: available ? 1 : 0.55 }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: available ? 'var(--vc-surface-2)' : 'var(--vc-surface)',
            color: available ? 'var(--vc-indigo-bright)' : 'var(--vc-text-dim)',
          }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold" style={{ color: 'var(--vc-text)' }}>
            {DRILL_MODE_AR[mode]}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--vc-text-dim)' }}>
            {available ? DRILL_MODE_DESCRIPTION_AR[mode] : requirement}
          </p>
        </div>
      </div>
      {available ? (
        <button type="button" onClick={onStart} className="vc-btn vc-btn-primary w-full mt-4">
          ابدئي
        </button>
      ) : (
        <div
          className="w-full mt-4 py-2.5 rounded-2xl font-bold text-center text-sm"
          style={{
            background: 'var(--vc-surface)',
            color: 'var(--vc-text-dim)',
            border: '1px solid var(--vc-border)',
            cursor: 'not-allowed',
          }}
        >
          غير متاح حالياً
        </div>
      )}
    </div>
  )
}

/**
 * 7-day drill activity buckets from hard_words_drill_log (nullable vocabulary_id +
 * vocab_card_id), filtered by student_id. Returns oldest → newest.
 */
async function getRecentDrillActivity(studentId, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('hard_words_drill_log')
    .select('attempted_at')
    .eq('student_id', studentId)
    .gte('attempted_at', since.toISOString())
  if (error) throw error

  const buckets = new Map()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of data || []) {
    const day = new Date(row.attempted_at).toISOString().slice(0, 10)
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) || 0) + 1)
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}
