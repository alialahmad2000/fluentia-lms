import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Dumbbell, ChevronLeft } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { getHardWordsCount } from '../../services/hardWords'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/**
 * Compact widget for dashboards / sidebars.
 * Hidden when count is 0 — doesn't clutter UI for caught-up students.
 */
export default function HardWordsStatsCard() {
  const profile = useAuthProfile()
  const profileId = profile?.id

  const { data: count = 0 } = useQuery({
    queryKey: ['hard-words', 'count', profileId],
    queryFn: () => getHardWordsCount(profileId),
    enabled: !!profileId,
    staleTime: 60_000,
  })

  if (!count || count <= 0) return null

  return (
    <Link
      to="/student/hard-words"
      className="block p-4 rounded-2xl group"
      style={{
        background:
          'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.04))',
        border: '1px solid rgba(239,68,68,0.18)',
      }}
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(239,68,68,0.16)',
            color: 'rgb(239,68,68)',
          }}
        >
          <Dumbbell size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-bold font-['Tajawal']"
            style={{ color: 'var(--text-tertiary)' }}
          >
            كلمات صعبة
          </p>
          <p
            className="text-xl font-extrabold font-['Tajawal']"
            style={{ color: 'var(--text-primary)' }}
          >
            {toArabicNum(count)}{' '}
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--text-secondary)' }}
            >
              تحتاج تدريب
            </span>
          </p>
        </div>
        <ChevronLeft
          size={18}
          className="opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
        />
      </div>
    </Link>
  )
}
