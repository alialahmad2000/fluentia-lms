// /student/retention/homework/result/:setId — completion summary with score + XP
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, ChevronLeft, RotateCcw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { useG } from '../../../i18n/gender'

export default function HomeworkResult() {
  const { setId } = useParams()
  const navigate = useNavigate()
  const g = useG()

  const summary = useQuery({
    queryKey: ['retention-homework-result', setId],
    queryFn: async () => {
      const { data: setRow, error: setErr } = await supabase
        .from('retention_homework_sets')
        .select('*')
        .eq('id', setId)
        .single()
      if (setErr) throw setErr
      const { data: attempts, error: aErr } = await supabase
        .from('retention_homework_attempts')
        .select('exercise_id, is_correct, time_seconds')
        .eq('homework_set_id', setId)
      if (aErr) throw aErr
      return { set: setRow, attempts: attempts || [] }
    },
    enabled: Boolean(setId),
  })

  if (summary.isLoading) {
    return <div className="p-8" dir="rtl"><div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} /></div>
  }
  if (!summary.data) return null

  const total = summary.data.set.total_count || 0
  const correct = (summary.data.attempts || []).filter((a) => a.is_correct).length
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const xp = summary.data.set.xp_awarded || 0
  const totalSeconds = (summary.data.attempts || []).reduce((s, a) => s + (a.time_seconds || 0), 0)
  const minutes = Math.max(1, Math.round(totalSeconds / 60))

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-xl mx-auto px-4 py-10 relative">
        <GlassPanel padding="xl" className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-20 h-20 flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-gold) 18%, transparent)',
              color: 'var(--ds-accent-gold)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <Trophy size={40} />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--ds-text-primary)' }}>
            {pct >= 90 ? 'ممتاز!' : pct >= 70 ? g('أحسنت!', 'أحسنتِ!') : 'تمارين قيّمة'}
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--ds-text-secondary)' }}>
            {g('أكملت', 'أكملتِ')} {correct} من {total} تمارين في {minutes} دقيقة
          </p>

          {/* Score ring */}
          <div className="flex items-center justify-center gap-8 mb-7">
            <div className="text-center">
              <div className="text-4xl font-extrabold" style={{ color: 'var(--ds-accent-primary)' }}>
                {pct}%
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                الدقة
              </div>
            </div>
            <div className="w-px h-12" style={{ background: 'var(--ds-border-subtle)' }} />
            <div className="text-center">
              <div className="text-4xl font-extrabold" style={{ color: 'var(--ds-accent-gold)' }}>
                +{xp}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                XP مكتسبة
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/student/retention/homework')}
              className="w-full font-semibold py-3"
              style={{
                background: 'var(--ds-accent-primary)',
                color: 'var(--ds-text-inverse)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <RotateCcw size={16} className="inline ml-2" />
              مجموعة جديدة
            </button>
            <button
              onClick={() => navigate('/student')}
              className="w-full font-semibold py-3"
              style={{
                color: 'var(--ds-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <ChevronLeft size={16} className="inline ml-2" />
              العودة للرئيسية
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
