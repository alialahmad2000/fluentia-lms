import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star, Flame, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDashboardCounts } from '../../services/vocab'

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

// Inline-styled premium "continue building your vocabulary" card.
// Rendered on the dashboard OUTSIDE any `.vocab-cosmos` scope, so it uses
// INLINE styles (indigo / gold / dark surfaces) — no vc-* utility classes.
const INDIGO = '#818cf8'
const INDIGO_LIGHT = '#a5b4fc'
const GOLD = '#fbbf24'

function Stat({ icon, value, label, color }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}1f`, border: `1px solid ${color}33` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-bold leading-none" style={{ color: '#f8fafc' }}>
          {value}
        </div>
        <div className="text-[11px] mt-1 leading-none" style={{ color: '#94a3b8' }}>
          {label}
        </div>
      </div>
    </div>
  )
}

export default function SrsReviewCard({ studentId }) {
  const { data } = useQuery({
    queryKey: ['vocab-dashboard-counts', studentId],
    queryFn: () => getDashboardCounts(studentId, 20),
    enabled: !!studentId,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })

  const wordsKnown = data?.wordsKnown ?? 0
  const dueCount = data?.dueCount ?? 0
  const streak = data?.streak ?? 0

  const subtitle =
    dueCount > 0
      ? `${toArabicNum(dueCount)} كلمة جاهزة للمراجعة`
      : 'واصل بناء حصيلتك من المفردات'

  return (
    <motion.div variants={fadeUp}>
      <Link
        to="/student/srs"
        className="block relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:translate-y-[-1px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(129,140,248,0.10) 0%, rgba(15,23,42,0.6) 55%, rgba(10,15,30,0.85) 100%)',
          border: '1px solid rgba(129,140,248,0.22)',
          boxShadow: '0 8px 32px -12px rgba(129,140,248,0.35)',
        }}
      >
        {/* top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${INDIGO}, transparent)` }}
        />

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-tight" style={{ color: '#f8fafc' }}>
              واصل بناء مفرداتك
            </h3>
            <p className="text-[12px] mt-1 leading-tight" style={{ color: INDIGO_LIGHT }}>
              {subtitle}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl shrink-0"
            style={{ background: 'rgba(129,140,248,0.16)', border: '1px solid rgba(129,140,248,0.3)' }}
          >
            <span className="text-[13px] font-semibold" style={{ color: INDIGO_LIGHT }}>
              تابع
            </span>
            <ArrowLeft size={14} style={{ color: INDIGO_LIGHT }} />
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <Stat
            icon={<Star size={16} strokeWidth={2} fill={GOLD} style={{ color: GOLD }} />}
            value={toArabicNum(wordsKnown)}
            label="كلمة أتقنتها"
            color={GOLD}
          />
          <Stat
            icon={<ArrowLeft size={16} strokeWidth={2} style={{ color: INDIGO }} />}
            value={toArabicNum(dueCount)}
            label="للمراجعة اليوم"
            color={INDIGO}
          />
          <Stat
            icon={<Flame size={16} strokeWidth={2} style={{ color: '#fb923c' }} />}
            value={toArabicNum(streak)}
            label="يوم متتالي"
            color="#fb923c"
          />
        </div>
      </Link>
    </motion.div>
  )
}
