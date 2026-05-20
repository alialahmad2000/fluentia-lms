import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Flame, Sparkles } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { getDashboardCounts } from '../../services/srs'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * Compact SRS dashboard summary — due / new / streak in one horizontal block.
 * Drop into any page; navigates to /student/srs on tap.
 */
export default function SrsStatsCard({ dailyNewLimit = 20, compact = false }) {
  const profile = useAuthProfile()
  const profileId = profile?.id

  const { data } = useQuery({
    queryKey: ['srs-dashboard', profileId, dailyNewLimit],
    queryFn: () => getDashboardCounts(profileId, dailyNewLimit),
    enabled: !!profileId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const due = data?.dueCount ?? 0
  const newAvail = data?.newAvailable ?? 0
  const streak = data?.streak ?? 0
  const active = due > 0 || newAvail > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/student/srs"
        className="block fl-card-static p-5 relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px]"
        style={{ cursor: 'pointer' }}
        aria-label="مراجعة المفردات اليومية"
      >
        <div
          className="card-top-line"
          style={{
            opacity: 0.4,
            background: active ? 'var(--accent-violet)' : 'var(--accent-emerald)',
          }}
        />

        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: active ? 'var(--accent-violet-glow, rgba(167,139,250,0.12))' : 'rgba(52,211,153,0.1)',
            }}
          >
            <Brain
              size={22}
              strokeWidth={1.5}
              style={{ color: active ? 'var(--accent-violet)' : 'rgb(52,211,153)' }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
              مراجعة المفردات اليومية
            </h3>
            {!compact && (
              <div className="flex items-center gap-3 mt-1 text-[12px] font-['Tajawal']" style={{ color: 'var(--text-tertiary)' }}>
                <span>
                  <span className="font-bold" style={{ color: 'var(--accent-violet)' }}>
                    {toArabicNum(due)}
                  </span>{' '}
                  للمراجعة
                </span>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="opacity-70" />
                  {toArabicNum(newAvail)} جديدة
                </span>
                {streak > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <Flame size={11} className="text-orange-400" />
                      {toArabicNum(streak)} يوم
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {active && (
            <span
              className="text-xs font-semibold px-3 py-1 rounded-lg shrink-0 font-['Tajawal']"
              style={{
                background: 'var(--accent-violet-glow, rgba(167,139,250,0.18))',
                color: 'var(--accent-violet)',
              }}
            >
              ابدأ
            </span>
          )}
          {!active && <span className="text-base">✅</span>}
        </div>
      </Link>
    </motion.div>
  )
}
