import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Flame, Sparkles, Settings, Play, BarChart3 } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getDashboardCounts, getDueCards, getNewCards } from '../../services/srs'
import SrsReviewSession from '../../components/srs/SrsReviewSession'
import SrsSettings from '../../components/srs/SrsSettings'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

export default function SrsHome() {
  const profile = useAuthProfile()
  const profileId = profile?.id
  const queryClient = useQueryClient()

  const [sessionOpen, setSessionOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessionCards, setSessionCards] = useState([])

  // Fetch user prefs for daily new limit + autoplay
  const { data: prefs } = useQuery({
    queryKey: ['srs-prefs', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('srs_daily_new_cards, srs_daily_max_reviews, srs_review_order, srs_autoplay_audio')
        .eq('id', profileId)
        .maybeSingle()
      if (error) throw error
      return data ?? {}
    },
    enabled: !!profileId,
    staleTime: 60_000,
  })
  const dailyNewLimit = prefs?.srs_daily_new_cards ?? 20
  const dailyMaxReviews = prefs?.srs_daily_max_reviews ?? 200
  const autoplayAudio = prefs?.srs_autoplay_audio ?? true

  // Dashboard counts
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['srs-dashboard', profileId, dailyNewLimit],
    queryFn: () => getDashboardCounts(profileId, dailyNewLimit),
    enabled: !!profileId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const dueCount = counts?.dueCount ?? 0
  const newAvail = counts?.newAvailable ?? 0
  const streak = counts?.streak ?? 0

  // Recent activity — last 7 days of review counts (queried from srs_review_logs)
  const { data: recent7 } = useQuery({
    queryKey: ['srs-recent-7', profileId],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 6)
      since.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('srs_review_logs')
        .select('reviewed_at')
        .eq('student_id', profileId)
        .gte('reviewed_at', since.toISOString())
      if (error) throw error
      // Bucket by day
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(since)
        d.setDate(d.getDate() + i)
        return { day: d, count: 0 }
      })
      for (const row of data ?? []) {
        const d = new Date(row.reviewed_at)
        const idx = Math.floor((d.setHours(0, 0, 0, 0) - since.getTime()) / 86_400_000)
        if (idx >= 0 && idx < 7) buckets[idx].count += 1
      }
      return buckets
    },
    enabled: !!profileId,
    staleTime: 60_000,
  })

  const maxRecent = useMemo(() => Math.max(1, ...(recent7?.map((r) => r.count) ?? [0])), [recent7])

  async function startSession() {
    if (!profileId) return
    // Pull due cards + a portion of new cards (capped by max_reviews)
    const due = await getDueCards(profileId, Math.max(0, dailyMaxReviews))
    const newSlotsLeft = Math.max(0, dailyMaxReviews - due.length)
    const newCardsLimit = Math.min(newAvail, newSlotsLeft)
    const fresh = newCardsLimit > 0 ? await getNewCards(profileId, newCardsLimit) : []

    let cards = [...due, ...fresh]
    if ((prefs?.srs_review_order ?? 'level') === 'random') {
      cards = cards.slice().sort(() => Math.random() - 0.5)
    }
    if (cards.length === 0) return
    setSessionCards(cards)
    setSessionOpen(true)
  }

  async function startExtraPractice() {
    if (!profileId) return
    // Pull 20 cards reviewed in the last 14 days regardless of due
    const since = new Date()
    since.setDate(since.getDate() - 14)
    const { data, error } = await supabase
      .from('curriculum_vocabulary_srs')
      .select(`
        *,
        curriculum_vocabulary!inner (
          id, word, definition_en, definition_ar, example_sentence,
          part_of_speech, pronunciation_ipa, audio_url, cefr_level, tier,
          pronunciation_alert
        )
      `)
      .eq('student_id', profileId)
      .gte('last_review', since.toISOString())
      .order('last_review', { ascending: false })
      .limit(20)
    if (error || !data?.length) return
    setSessionCards(data)
    setSessionOpen(true)
  }

  function handleSessionEnd() {
    setSessionOpen(false)
    setSessionCards([])
    queryClient.invalidateQueries({ queryKey: ['srs-dashboard', profileId] })
    queryClient.invalidateQueries({ queryKey: ['srs-recent-7', profileId] })
    queryClient.invalidateQueries({ queryKey: ['srs-due-cards'] })
    queryClient.invalidateQueries({ queryKey: ['srs-due-count'] })
  }

  // Animated progress orb: shows fraction of today's reviews completed.
  // We approximate "today's planned" as initial dueCount + new available (snapshotted at first load).
  const [planned, setPlanned] = useState(null)
  useEffect(() => {
    if (planned == null && counts) {
      setPlanned(Math.max(1, dueCount + newAvail))
    }
  }, [counts, dueCount, newAvail, planned])

  const completed = planned != null ? Math.max(0, planned - dueCount) : 0
  const completionPct = planned ? Math.min(100, Math.round((completed / planned) * 100)) : 0
  const nothingToDo = dueCount === 0 && newAvail === 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" dir="rtl">
      {/* Hero block */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden p-7 sm:p-10"
        style={{
          background:
            'linear-gradient(140deg, var(--accent-violet-glow, rgba(167,139,250,0.18)) 0%, var(--surface-raised, rgba(255,255,255,0.04)) 60%)',
          border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
        }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          {/* Progress orb */}
          <div className="relative shrink-0">
            <ProgressOrb pct={completionPct} dueCount={dueCount} />
          </div>

          {/* Headline + stats */}
          <div className="flex-1 text-center sm:text-right">
            <h1
              className="text-2xl sm:text-3xl font-bold font-['Tajawal']"
              style={{ color: 'var(--text-primary)' }}
            >
              مراجعة المفردات اليومية
            </h1>
            <p
              className="mt-2 text-sm font-['Tajawal']"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {countsLoading
                ? 'جاري التحميل…'
                : nothingToDo
                ? 'خلصت مراجعة اليوم — تعالي بكرة'
                : `جاهز للمراجعة — تقريباً ${toArabicNum(Math.max(1, Math.ceil((dueCount + newAvail) * 0.3)))} دقائق`}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 max-w-md mx-auto sm:mx-0">
              <HeroStat icon={Brain} label="تستحق المراجعة" value={toArabicNum(dueCount)} color="var(--accent-violet)" />
              <HeroStat icon={Sparkles} label="كلمات جديدة اليوم" value={toArabicNum(newAvail)} color="var(--accent-sky)" />
              <HeroStat icon={Flame} label="السلسلة" value={toArabicNum(streak)} color="rgb(251,146,60)" suffix={streak > 0 ? '🔥' : ''} />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {!nothingToDo ? (
                <button
                  onClick={startSession}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold font-['Tajawal'] transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'var(--accent-gold, #fbbf24)',
                    color: '#0a0e18',
                    boxShadow: '0 14px 36px -14px rgba(251,191,36,0.55)',
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  ابدأ المراجعة
                </button>
              ) : (
                <button
                  onClick={startExtraPractice}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold font-['Tajawal'] transition-all hover:scale-[1.01]"
                  style={{
                    background: 'var(--surface-raised, rgba(255,255,255,0.05))',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
                  }}
                >
                  خلّيني أراجع كلمات إضافية
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent activity row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 fl-card-static p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" />
            آخر ٧ أيام
          </h2>
          <span className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
            مراجعات يومية
          </span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {(recent7 ?? Array.from({ length: 7 })).map((bucket, i) => {
            const count = bucket?.count ?? 0
            const heightPct = (count / maxRecent) * 100
            const isToday = i === 6
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: `${Math.max(4, heightPct)}%`,
                    background: isToday ? 'var(--accent-violet)' : 'var(--surface-raised, rgba(255,255,255,0.08))',
                    opacity: count === 0 ? 0.35 : 1,
                  }}
                />
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {count > 0 ? toArabicNum(count) : ''}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Floating settings */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed bottom-5 left-5 lg:bottom-7 lg:left-7 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'var(--surface-raised, rgba(255,255,255,0.05))',
          border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
          backdropFilter: 'blur(12px)',
          color: 'var(--text-secondary)',
        }}
        aria-label="إعدادات المراجعة"
      >
        <Settings size={18} />
      </button>

      {/* Review session */}
      <SrsReviewSession
        isOpen={sessionOpen}
        cards={sessionCards}
        autoplayAudio={autoplayAudio}
        onComplete={handleSessionEnd}
      />

      {/* Settings drawer */}
      <SrsSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function HeroStat({ icon: Icon, label, value, color, suffix }) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: 'var(--surface-raised, rgba(255,255,255,0.04))',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
      }}
    >
      <Icon size={14} style={{ color }} className="mx-auto sm:mx-0 mb-1" />
      <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value} {suffix && <span className="text-base">{suffix}</span>}
      </div>
      <div className="text-[10px] mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
    </div>
  )
}

function ProgressOrb({ pct, dueCount }) {
  const size = 130
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border-default, rgba(255,255,255,0.08))"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--accent-gold, #fbbf24)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {toArabicNum(dueCount)}
        </span>
        <span className="text-[10px] mt-0.5 font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
          باقي
        </span>
      </div>
    </div>
  )
}
