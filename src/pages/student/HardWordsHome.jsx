import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Dumbbell,
  Shuffle,
  BookOpen,
  Headphones,
  Keyboard,
  CheckCircle,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  getHardWordsStats,
  getRecentDrillActivity,
  DRILL_MODES,
  DRILL_MODE_AR,
  DRILL_MODE_DESCRIPTION_AR,
} from '../../services/hardWords'
import DrillSessionContainer from '../../components/hard-words/DrillSessionContainer'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

const MODE_ICON = {
  matching: Shuffle,
  context_fill: BookOpen,
  listening: Headphones,
  typing_recall: Keyboard,
}

const MODE_REQUIREMENT_AR = {
  matching: 'تحتاج على الأقل ٦ كلمات صعبة لهذا التدريب',
  context_fill: 'تحتاج كلمات صعبة لها أمثلة في الجمل',
  listening: 'تحتاج كلمات صعبة لها صوت',
  typing_recall: 'تحتاج على الأقل كلمة صعبة واحدة',
}

const DAY_INITIALS_AR = ['أ', 'إ', 'ث', 'ر', 'خ', 'ج', 'س'] // Sun..Sat

export default function HardWordsHome() {
  const profile = useAuthProfile()
  const profileId = profile?.id

  const [activeMode, setActiveMode] = useState(null)
  const [autoplay, setAutoplay] = useState(true)

  // Stats: total + breakdown + available modes
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hard-words', 'stats', profileId],
    queryFn: () => getHardWordsStats(profileId),
    enabled: !!profileId,
    staleTime: 30_000,
  })

  // 7-day activity bars
  const { data: activity } = useQuery({
    queryKey: ['hard-words', 'activity', profileId],
    queryFn: () => getRecentDrillActivity(profileId, 7),
    enabled: !!profileId,
    staleTime: 60_000,
  })

  // Pull autoplay pref to feed into the listening drill
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

  const total = stats?.totalHard ?? 0
  const byCause = stats?.byCause ?? { highLapses: 0, highDifficulty: 0, recentAgainPattern: 0 }
  const availableModes = useMemo(
    () => new Set(stats?.availableModes ?? []),
    [stats]
  )

  const maxBar = useMemo(() => {
    const counts = (activity || []).map((a) => a.count)
    return Math.max(1, ...counts)
  }, [activity])

  // ── Empty state ─────────────────────────────────────────────
  if (!statsLoading && total === 0) {
    return (
      <div
        className="min-h-screen pb-20"
        style={{ background: 'var(--bg-base, transparent)' }}
        dir="rtl"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.04))',
                color: 'rgb(34,197,94)',
                boxShadow: '0 12px 30px rgba(34,197,94,0.18)',
              }}
            >
              <CheckCircle size={36} />
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold font-['Tajawal'] mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              ما عندك كلمات صعبة الآن! 🎉
            </h1>
            <p
              className="text-base font-['Tajawal'] mb-8"
              style={{ color: 'var(--text-secondary)' }}
            >
              استمر بالمراجعة اليومية وراح نبيّن لك الصعب أول ما يظهر.
            </p>
            <Link
              to="/student/srs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold font-['Tajawal']"
              style={{
                background: 'var(--accent-gold, #fbbf24)',
                color: '#0a1225',
              }}
            >
              العودة لمراجعة المفردات
              <ArrowLeft size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // ── Main dashboard ─────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: 'var(--bg-base, transparent)' }}
      dir="rtl"
    >
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-10 space-y-8">
        {/* Hero */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(245,158,11,0.08))',
                color: 'rgb(239,68,68)',
              }}
            >
              <Dumbbell size={22} />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold font-['Tajawal']"
                style={{ color: 'var(--text-primary)' }}
              >
                تدريب الكلمات الصعبة
              </h1>
              <p
                className="text-sm font-['Tajawal']"
                style={{ color: 'var(--text-tertiary)' }}
              >
                الكلمات اللي تواجه معاها صعوبة في المراجعة اليومية
              </p>
            </div>
          </div>

          {/* Big count */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="p-6 md:p-8 rounded-3xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(168,85,247,0.06))',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div
                  className="text-5xl md:text-6xl font-extrabold leading-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {toArabicNum(total)}
                </div>
                <p
                  className="text-sm font-['Tajawal'] mt-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  كلمة تحتاج تدريب
                </p>
              </div>
            </div>

            {/* Breakdown chips */}
            <div className="flex flex-wrap gap-2 mt-6">
              <CauseChip
                label="سقطت فيها كثيراً"
                value={byCause.highLapses}
                color="rgba(239,68,68,0.9)"
                bg="rgba(239,68,68,0.10)"
                border="rgba(239,68,68,0.25)"
              />
              <CauseChip
                label="صعبة المستوى"
                value={byCause.highDifficulty}
                color="rgba(168,85,247,0.95)"
                bg="rgba(168,85,247,0.10)"
                border="rgba(168,85,247,0.25)"
              />
              <CauseChip
                label="أخطأت فيها مؤخراً"
                value={byCause.recentAgainPattern}
                color="rgba(245,158,11,0.95)"
                bg="rgba(245,158,11,0.10)"
                border="rgba(245,158,11,0.25)"
              />
            </div>
          </motion.div>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
          <h2
            className="text-sm font-bold font-['Tajawal']"
            style={{ color: 'var(--text-secondary)' }}
          >
            اختر نوع التدريب:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {/* Recent activity */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: 'var(--text-tertiary)' }} />
            <h3
              className="text-sm font-bold font-['Tajawal']"
              style={{ color: 'var(--text-secondary)' }}
            >
              تدربت على {toArabicNum(stats?.recentDrillsLast7Days ?? 0)} كلمة هذا الأسبوع
            </h3>
          </div>
          <div className="flex items-end gap-2 h-24" dir="ltr">
            {(activity || Array.from({ length: 7 })).map((day, i) => {
              const count = day?.count ?? 0
              const height = `${Math.max(8, (count / maxBar) * 100)}%`
              const dayDate = day?.date ? new Date(day.date) : null
              const dayLabel = dayDate ? DAY_INITIALS_AR[dayDate.getDay()] : ''
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full rounded-md transition-all"
                    style={{
                      height,
                      minHeight: 8,
                      background:
                        count > 0
                          ? 'linear-gradient(180deg, var(--accent-sky), rgba(56,189,248,0.5))'
                          : 'var(--surface-raised)',
                    }}
                    title={`${count} تدريب`}
                  />
                  <span
                    className="text-[10px] font-['Tajawal']"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {dayLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drill modal */}
      {activeMode && (
        <DrillSessionContainer
          mode={activeMode}
          autoplay={autoplay}
          onClose={() => setActiveMode(null)}
        />
      )}
    </div>
  )
}

function CauseChip({ label, value, color, bg, border }) {
  if (!value) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-['Tajawal']"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <span>{label}</span>
      <span style={{ color, opacity: 0.85 }}>·</span>
      <span>{toArabicNum(value)}</span>
    </span>
  )
}

function ModeCard({ mode, available, requirement, onStart }) {
  const Icon = MODE_ICON[mode]
  return (
    <motion.div
      whileHover={available ? { y: -2 } : {}}
      className="p-4 rounded-2xl"
      style={{
        background: available ? 'var(--surface)' : 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: available ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: available
              ? 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(56,189,248,0.04))'
              : 'var(--surface-raised)',
            color: available ? 'rgb(56,189,248)' : 'var(--text-tertiary)',
          }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-bold font-['Tajawal']"
            style={{ color: 'var(--text-primary)' }}
          >
            {DRILL_MODE_AR[mode]}
          </h3>
          <p
            className="text-xs mt-1 font-['Tajawal']"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {available ? DRILL_MODE_DESCRIPTION_AR[mode] : requirement}
          </p>
        </div>
      </div>
      {available && (
        <button
          type="button"
          onClick={onStart}
          className="w-full mt-4 py-2.5 rounded-xl font-bold font-['Tajawal']"
          style={{
            background: 'var(--accent-gold, #fbbf24)',
            color: '#0a1225',
          }}
        >
          ابدأ
        </button>
      )}
      {!available && (
        <div
          className="w-full mt-4 py-2.5 rounded-xl font-bold font-['Tajawal'] text-center"
          style={{
            background: 'var(--surface-raised)',
            color: 'var(--text-tertiary)',
            cursor: 'not-allowed',
          }}
        >
          غير متاح حالياً
        </div>
      )}
    </motion.div>
  )
}
