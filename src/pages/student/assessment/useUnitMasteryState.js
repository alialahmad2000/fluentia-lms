import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

function computeState(assessment, attempts, canStartResult) {
  if (!assessment) return { type: 'loading' }

  const now = Date.now()
  const MAX_ATTEMPTS = assessment.max_attempts ?? 3
  const COOLDOWN_MIN = assessment.retake_cooldown_minutes ?? 60
  const LOCKOUT_HOURS = assessment.pre_pass_lockout_hours ?? 24
  const RETAKE_DAYS = assessment.post_pass_retake_days ?? 7

  const finishedAttempts = (attempts || []).filter(a =>
    a.status === 'completed' || a.status === 'timed_out'
  )
  const passedAttempt = finishedAttempts.find(a => a.passed) || null
  const failedAttempts = finishedAttempts.filter(a => !a.passed)

  // ─── POST-PASS BRANCH ───
  if (passedAttempt) {
    const passedAt = new Date(passedAttempt.started_at).getTime()
    const daysSince = (now - passedAt) / 86400000
    const attemptsAfterPass = finishedAttempts.filter(
      a => new Date(a.started_at).getTime() > passedAt
    )

    if (attemptsAfterPass.length >= 1) {
      const allPassed = finishedAttempts.filter(a => a.passed)
      const bestScore = Math.max(...allPassed.map(a => a.percentage || 0))
      return { type: 'complete', bestScore }
    }

    const retakeAvailableAt = new Date(passedAt + RETAKE_DAYS * 86400000).toISOString()
    if (daysSince < RETAKE_DAYS) {
      return {
        type: 'passed_cooling',
        score: passedAttempt.percentage,
        retakeAvailableAt,
        daysLeft: Math.ceil(RETAKE_DAYS - daysSince),
      }
    }

    return { type: 'retake_available', bestScore: passedAttempt.percentage }
  }

  // ─── PRE-PASS BRANCH ───

  // Activity gate
  if (canStartResult?.reason === 'activities_incomplete') {
    return {
      type: 'locked',
      currentPct: canStartResult.current_pct ?? 0,
      requiredPct: canStartResult.required_pct ?? 70,
    }
  }

  // Cycle computation
  let cyclePos = 0
  for (let i = 0; i < failedAttempts.length; i++) {
    if (i > 0) {
      const prev = new Date(failedAttempts[i - 1].started_at).getTime()
      const cur = new Date(failedAttempts[i].started_at).getTime()
      if ((cur - prev) / 3600000 >= LOCKOUT_HOURS) cyclePos = 0
    }
    cyclePos++
  }

  const lastFail = failedAttempts.length > 0 ? failedAttempts[failedAttempts.length - 1] : null

  if (cyclePos >= MAX_ATTEMPTS && lastFail) {
    const lastFailAt = new Date(lastFail.started_at).getTime()
    const hoursSince = (now - lastFailAt) / 3600000
    if (hoursSince < LOCKOUT_HOURS) {
      return {
        type: 'locked_out',
        lockoutEndsAt: new Date(lastFailAt + LOCKOUT_HOURS * 3600000).toISOString(),
        maxAttempts: MAX_ATTEMPTS,
      }
    }
    cyclePos = 0 // cycle reset
  }

  if (cyclePos > 0 && lastFail) {
    const lastFailTime = new Date(lastFail.completed_at || lastFail.started_at).getTime()
    const minSince = (now - lastFailTime) / 60000
    if (minSince < COOLDOWN_MIN) {
      return {
        type: 'cooldown',
        cooldownEndsAt: new Date(lastFailTime + COOLDOWN_MIN * 60000).toISOString(),
        minutesLeft: Math.ceil(COOLDOWN_MIN - minSince),
      }
    }
  }

  return {
    type: 'ready',
    attemptNumber: cyclePos + 1,
    maxAttempts: MAX_ATTEMPTS,
    timeLimitSeconds: assessment.time_limit_seconds,
    totalQuestions: assessment.total_questions,
  }
}

export function useUnitMasteryState(unitId, studentId) {
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['uma-assessment', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_assessments')
        .select('id, unit_id, pass_score_percent, unlock_threshold_percent, total_questions, retake_cooldown_minutes, xp_on_pass, xp_on_attempt, time_limit_seconds, is_published, max_attempts, post_pass_retake_days, pre_pass_lockout_hours')
        .eq('unit_id', unitId)
        .eq('is_published', true)
        .maybeSingle()
      return data
    },
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['uma-attempts', assessment?.id, studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_attempts')
        .select('id, passed, percentage, started_at, completed_at, variant_id, status, attempt_number')
        .eq('assessment_id', assessment.id)
        .eq('student_id', studentId)
        .in('status', ['completed', 'timed_out'])
        .order('started_at', { ascending: true })
      return data || []
    },
    enabled: !!assessment?.id && !!studentId,
    refetchInterval: 60000,
  })

  // Activity gate check — only needed pre-pass (skip if already passed)
  const passedAttempt = attempts.find(a => a.passed) || null

  const { data: canStartResult } = useQuery({
    queryKey: ['uma-can-start', assessment?.id, studentId],
    queryFn: async () => {
      const { data } = await supabase.rpc('fn_can_start_unit_assessment', {
        p_student_id: studentId,
        p_assessment_id: assessment.id,
      })
      return data
    },
    enabled: !!assessment?.id && !!studentId && !passedAttempt,
    refetchInterval: 30000,
  })

  const state = useMemo(
    () => computeState(assessment, attempts, canStartResult),
    [assessment, attempts, canStartResult]
  )

  return {
    assessment,
    state,
    loading: assessmentLoading || (!!assessment && attemptsLoading),
  }
}
