import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDueCount } from '../../services/srs'
import { useG } from '../../i18n/gender'

const toArabicNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function SrsReviewCard({ studentId }) {
  const g = useG()
  const { data: dueCount = 0 } = useQuery({
    queryKey: ['srs-due-count', studentId],
    queryFn: () => getDueCount(studentId),
    enabled: !!studentId,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  return (
    <motion.div variants={fadeUp}>
      <Link
        to={dueCount > 0 ? '/student/daily-review' : '#'}
        className={`block fl-card-static p-5 relative overflow-hidden transition-all duration-200 w-full ${dueCount > 0 ? 'hover:translate-y-[-1px]' : ''}`}
        style={{
          width: '100%',
          background: 'var(--ds-surface-1)',
          border: '1px solid var(--ds-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05)',
          cursor: dueCount > 0 ? 'pointer' : 'default',
        }}
      >
        <div className="card-top-line" style={{ opacity: 0.3, background: 'var(--ds-accent-primary)' }} />
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: dueCount > 0 ? 'color-mix(in srgb, var(--ds-accent-secondary) 18%, transparent)' : 'color-mix(in srgb, var(--ds-accent-success) 16%, transparent)' }}
          >
            <Brain size={22} strokeWidth={1.5} style={{ color: dueCount > 0 ? 'var(--ds-accent-secondary)' : 'var(--ds-accent-success)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
              مراجعة اليوم
            </h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
              {dueCount > 0
                ? `${toArabicNum(dueCount)} كلمة جاهزة — تقريباً ${toArabicNum(Math.max(1, Math.ceil(dueCount * 0.3)))} دقائق`
                : g('ما في مراجعة اليوم — ارجع بكرة!', 'ما في مراجعة اليوم — ارجعي بكرة!')
              }
            </p>
          </div>
          {dueCount > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl shrink-0" style={{ background: 'color-mix(in srgb, var(--ds-accent-secondary) 18%, transparent)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--ds-accent-secondary)' }}>{g('ابدأ', 'ابدئي')}</span>
              <ArrowLeft size={14} style={{ color: 'var(--ds-accent-secondary)' }} />
            </div>
          )}
          {dueCount === 0 && (
            <span className="text-lg">✅</span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
