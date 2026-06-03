import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Sparkles, Settings, Play, BarChart3 } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getDashboardCounts, getDueCards, getNewCards, VOCAB_CONTENT_SELECT } from '../../services/vocab'
import SrsReviewSession from '../../components/srs/SrsReviewSession'
import SrsSettings from '../../components/srs/SrsSettings'
import VocabShell from '../../components/vocab-cosmos/VocabShell'
import VocabHeader from '../../components/vocab-cosmos/VocabHeader'
import { toArabicNum, estMinutes } from '../../lib/vocabFormat'

export default function SrsHome() {
  const profile = useAuthProfile()
  const profileId = profile?.id
  const queryClient = useQueryClient()

  const [sessionOpen, setSessionOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sessionCards, setSessionCards] = useState([])

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

  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['vocab-stats', profileId, dailyNewLimit],
    queryFn: () => getDashboardCounts(profileId, dailyNewLimit),
    enabled: !!profileId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const dueCount = counts?.dueCount ?? 0
  const newAvail = counts?.newAvailable ?? 0

  // last 7 days of review counts
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
    const since = new Date()
    since.setDate(since.getDate() - 14)
    const { data, error } = await supabase
      .from('vocab_cards')
      .select(`*, ${VOCAB_CONTENT_SELECT}`)
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
    queryClient.invalidateQueries({ queryKey: ['vocab-stats', profileId] })
    queryClient.invalidateQueries({ queryKey: ['srs-recent-7', profileId] })
    queryClient.invalidateQueries({ queryKey: ['vocab-due-badge'] })
  }

  // Today's completion ring (snapshot planned at first load).
  const [planned, setPlanned] = useState(null)
  useEffect(() => {
    if (planned == null && counts) setPlanned(Math.max(1, dueCount + newAvail))
  }, [counts, dueCount, newAvail, planned])
  const completed = planned != null ? Math.max(0, planned - dueCount) : 0
  const completionPct = planned ? Math.min(100, Math.round((completed / planned) * 100)) : 0
  const nothingToDo = dueCount === 0 && newAvail === 0

  return (
    <VocabShell>
      <VocabHeader
        title="مراجعة المفردات اليومية"
        subtitle={
          countsLoading
            ? 'جاري التحميل…'
            : nothingToDo
            ? 'خلّصتِ مراجعة اليوم — تعالي بكرة ✦'
            : `جاهزة للمراجعة — تقريباً ${toArabicNum(estMinutes(dueCount + newAvail))} دقائق`
        }
        stats={counts}
        isReviewSurface
        action={
          <button
            onClick={() => setSettingsOpen(true)}
            className="vc-pill vc-card-hover shrink-0"
            style={{ padding: '0.55rem' }}
            aria-label="إعدادات المراجعة"
          >
            <Settings size={16} />
          </button>
        }
      />

      {/* Hero: completion orb + review CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="vc-card p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-9">
          <ProgressOrb pct={completionPct} dueCount={dueCount} />
          <div className="flex-1 text-center sm:text-start w-full">
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto sm:mx-0">
              <HeroStat icon={Brain} label="تستحق المراجعة" value={dueCount} accent="var(--vc-indigo-bright)" />
              <HeroStat icon={Sparkles} label="نجوم جديدة اليوم" value={newAvail} accent="var(--vc-violet)" />
            </div>
            <div className="mt-6">
              {!nothingToDo ? (
                <button onClick={startSession} className="vc-btn vc-btn-primary w-full sm:w-auto">
                  <Play size={16} fill="currentColor" />
                  ابدأ المراجعة
                </button>
              ) : (
                <button onClick={startExtraPractice} className="vc-btn vc-btn-ghost w-full sm:w-auto">
                  خلّيني أراجع نجوماً إضافية
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Last 7 days */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="vc-card p-5 mt-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--vc-text-soft)' }}>
            <BarChart3 size={14} />
            آخر ٧ أيام
          </h2>
          <span className="text-xs" style={{ color: 'var(--vc-text-dim)' }}>مراجعات يومية</span>
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
                    background: isToday ? 'var(--vc-indigo)' : 'var(--vc-surface-2)',
                    boxShadow: isToday && count > 0 ? 'var(--vc-glow-indigo)' : 'none',
                    opacity: count === 0 ? 0.4 : 1,
                  }}
                />
                <span className="text-xs tabular-nums" style={{ color: 'var(--vc-text-dim)' }}>
                  {count > 0 ? toArabicNum(count) : ''}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>

      <SrsReviewSession
        isOpen={sessionOpen}
        cards={sessionCards}
        autoplayAudio={autoplayAudio}
        onComplete={handleSessionEnd}
      />
      <SrsSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </VocabShell>
  )
}

function HeroStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="vc-card p-3.5 text-center sm:text-start">
      <Icon size={15} style={{ color: accent }} className="mx-auto sm:mx-0 mb-1.5" />
      <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--vc-text)' }}>
        {toArabicNum(value)}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>{label}</div>
    </div>
  )
}

function ProgressOrb({ pct, dueCount }) {
  const size = 132
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="vc-orb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--vc-indigo)" />
            <stop offset="100%" stopColor="var(--vc-violet)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--vc-border)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#vc-orb)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(129,140,248,0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--vc-text)' }}>
          {toArabicNum(dueCount)}
        </span>
        <span className="text-xs mt-0.5" style={{ color: 'var(--vc-text-dim)' }}>تنتظر</span>
      </div>
    </div>
  )
}
