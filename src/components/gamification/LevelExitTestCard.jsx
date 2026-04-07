import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Lock, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

export default function LevelExitTestCard({ studentId, academicLevel }) {
  // Get level_id from academic_level number
  const { data: levelData } = useQuery({
    queryKey: ['student-level-data', academicLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, cefr')
        .eq('level_number', academicLevel)
        .single()
      if (error) return null
      return data
    },
    enabled: !!academicLevel,
  })

  const { data: eligibility } = useQuery({
    queryKey: ['exit-test-eligibility-card', studentId, levelData?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_level_exit_eligibility', {
        p_student_id: studentId,
        p_level_id: levelData.id,
      })
      if (error) return null
      return data
    },
    enabled: !!studentId && !!levelData?.id,
    staleTime: 5 * 60 * 1000,
  })

  if (!eligibility || !levelData) return null

  const levelInfo = ACADEMIC_LEVELS[academicLevel]
  const levelLabel = `L${levelData.level_number}`

  // Already passed
  if (eligibility.already_passed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-5 relative"
        style={{ borderColor: 'rgba(16,185,129,0.15)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              اجتزت اختبار {levelLabel}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              أفضل نتيجة: {eligibility.best_score}%
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Can take test — show CTA
  if (eligibility.can_take_test) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-5 relative"
        style={{ borderColor: 'rgba(167,139,250,0.2)' }}
      >
        <div className="card-top-line violet" style={{ opacity: 0.4 }} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Trophy size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                جاهز لاختبار نهاية المستوى
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {eligibility.units_completed} من {eligibility.units_total} وحدة مكتملة
              </p>
            </div>
          </div>
          <Link
            to={`/student/level-exit-test/${levelData.id}`}
            className="fl-btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            <span>ابدأ</span>
            <ArrowLeft size={14} />
          </Link>
        </div>
      </motion.div>
    )
  }

  // Close to threshold (60-80%)
  const ratio = eligibility.completion_ratio || 0
  if (ratio >= 60 && ratio < 80) {
    const remaining = Math.max(0, Math.ceil((eligibility.units_total || 12) * 0.8) - (eligibility.units_completed || 0))
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Lock size={20} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              أنجزت {eligibility.units_completed} من {eligibility.units_total} وحدة
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              خلّص {remaining} وحدات عشان تفتح اختبار نهاية المستوى
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Not close enough — don't show anything
  return null
}
