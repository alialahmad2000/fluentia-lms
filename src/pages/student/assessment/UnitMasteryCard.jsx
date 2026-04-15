import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { GlassPanel } from '../../../design-system/components'
import { motion } from 'framer-motion'
import { Lock, Hourglass, Award, Sparkles } from 'lucide-react'

export default function UnitMasteryCard({ unitId, studentId }) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(null)

  // Fetch assessment for this unit
  const { data: assessment } = useQuery({
    queryKey: ['unit-mastery-assessment', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_assessments')
        .select('id, pass_score_percent, unlock_threshold_percent, is_published')
        .eq('unit_id', unitId)
        .eq('is_published', true)
        .maybeSingle()
      return data
    },
    enabled: !!unitId,
  })

  // Check can_start via RPC
  const { data: canStartResult } = useQuery({
    queryKey: ['unit-mastery-can-start', assessment?.id, studentId],
    queryFn: async () => {
      const { data } = await supabase.rpc('fn_can_start_unit_assessment', {
        p_student_id: studentId,
        p_assessment_id: assessment.id,
      })
      return data
    },
    enabled: !!assessment?.id && !!studentId,
    refetchInterval: countdown ? 10000 : false,
  })

  // Best attempt
  const { data: bestAttempt } = useQuery({
    queryKey: ['unit-mastery-best', assessment?.id, studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_attempts')
        .select('percentage, passed')
        .eq('assessment_id', assessment.id)
        .eq('student_id', studentId)
        .eq('passed', true)
        .order('percentage', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!assessment?.id && !!studentId,
  })

  // Countdown timer for cooldown
  useEffect(() => {
    if (!canStartResult?.cooldown_ends_at) { setCountdown(null); return }
    const endTime = new Date(canStartResult.cooldown_ends_at).getTime()
    const tick = () => {
      const diff = endTime - Date.now()
      if (diff <= 0) { setCountdown(null); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [canStartResult?.cooldown_ends_at])

  if (!assessment) return null

  const reason = canStartResult?.reason
  const canStart = canStartResult?.can_start === true

  // STATE: ALREADY_PASSED
  if (reason === 'already_passed' || bestAttempt?.passed) {
    return (
      <GlassPanel padding="md" glow>
        <div className="flex items-center gap-3">
          <Award size={24} style={{ color: '#fbbf24' }} />
          <div>
            <p className="font-semibold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              أتقنتِ هذه الوحدة بنسبة {bestAttempt?.percentage || '—'}%
            </p>
            <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              اختبار الإتقان — ممتازة!
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  // STATE: LOCKED_COOLDOWN
  if (reason === 'cooldown' && countdown) {
    return (
      <GlassPanel padding="md">
        <div className="flex items-center gap-3">
          <Hourglass size={22} style={{ color: 'var(--ds-text-tertiary, #64748b)' }} />
          <div>
            <p className="font-medium" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              حاولتِ قبل قليل
            </p>
            <p className="text-sm" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
              عودي بعد <span className="font-mono font-bold" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>{countdown}</span>
            </p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  // STATE: LOCKED_ACTIVITIES
  if (reason === 'activities_incomplete') {
    const currentPct = canStartResult.current_pct || 0
    const requiredPct = canStartResult.required_pct || 70
    return (
      <GlassPanel padding="md">
        <div className="flex items-center gap-3 mb-3">
          <Lock size={20} style={{ color: 'var(--ds-text-tertiary, #64748b)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
            أكملي {requiredPct}% من أنشطة الوحدة لفتح الاختبار
          </p>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-surface-1, rgba(255,255,255,0.04))' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, currentPct)}%`,
              background: 'var(--ds-accent-primary, #38bdf8)',
            }}
          />
        </div>
        <p className="text-xs mt-1.5 text-right" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
          {Math.round(currentPct)}% مكتمل
        </p>
      </GlassPanel>
    )
  }

  // STATE: READY
  if (canStart) {
    return (
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(56,189,248,0)', '0 0 20px rgba(56,189,248,0.15)', '0 0 0px rgba(56,189,248,0)'] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <GlassPanel padding="md" hover glow>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={22} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                  اختبار إتقان الوحدة
                </p>
                <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  هل أنتِ جاهزة؟
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/student/unit-mastery/${assessment.id}`)}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{
                background: 'var(--ds-accent-primary, #38bdf8)',
                color: '#060e1c',
              }}
            >
              ابدئي الاختبار
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  return null
}
