import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const toArabicNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function SrsReviewCard({ studentId }) {
  const { data: dueCount = 0 } = useQuery({
    queryKey: ['srs-due-count', studentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('curriculum_vocabulary_srs')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .lte('next_review_at', new Date().toISOString())

      if (error) return 0
      return count || 0
    },
    enabled: !!studentId,
    refetchOnWindowFocus: true,
  })

  return (
    <motion.div variants={fadeUp}>
      <Link
        to={dueCount > 0 ? '/student/daily-review' : '#'}
        className={`block fl-card-static p-5 relative overflow-hidden transition-all duration-200 ${dueCount > 0 ? 'hover:translate-y-[-1px]' : ''}`}
        style={dueCount > 0 ? { cursor: 'pointer' } : { cursor: 'default' }}
      >
        <div className="card-top-line" style={{ opacity: 0.3, background: dueCount > 0 ? 'var(--accent-violet)' : 'var(--accent-emerald)' }} />
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: dueCount > 0 ? 'var(--accent-violet-glow)' : 'rgba(52,211,153,0.1)' }}
          >
            <Brain size={22} strokeWidth={1.5} style={{ color: dueCount > 0 ? 'var(--accent-violet)' : 'rgb(52,211,153)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
              مراجعة اليوم
            </h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {dueCount > 0
                ? `${toArabicNum(dueCount)} كلمة جاهزة — تقريباً ${toArabicNum(Math.max(1, Math.ceil(dueCount * 0.3)))} دقائق`
                : 'ما في مراجعة اليوم — ارجع بكرة!'
              }
            </p>
          </div>
          {dueCount > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl shrink-0" style={{ background: 'var(--accent-violet-glow)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-violet)' }}>ابدأ</span>
              <ArrowLeft size={14} style={{ color: 'var(--accent-violet)' }} />
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
