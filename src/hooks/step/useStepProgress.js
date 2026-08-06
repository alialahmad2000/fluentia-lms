import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * The student these queries are ABOUT.
 *
 * Admin "view-as" is a CLIENT-SIDE profile swap: the Supabase session (and so
 * auth.uid() and `user.id`) stays the ADMIN's while `profile` becomes the
 * student's. Reading `user.id` here would quietly return the admin's own STEP
 * progress and render it as the student's. Always `profile.id`.
 */
function useEffectiveStudentId() {
  return useAuthStore((s) => s.profile?.id) ?? null
}

/**
 * STEP — the student's own performance.
 *
 * Every query here is keyed on the EFFECTIVE student id, not auth.uid(). Under
 * admin "view-as", the Supabase session stays the admin's while the in-store
 * profile is swapped, so auth.uid() would silently read the ADMIN's progress and
 * show it as the student's.
 *
 * Nothing here touches step_item_keys — the answer key has no `authenticated`
 * policy and must stay unreachable from the browser.
 */

/** Only `mock` attempts are scores. A drill or a review is practice, and mixing
 *  them in would report a 10/10 drill as a 100 beside a real paper's 62. */
export function useStepHistory(limit = 12) {
  const studentId = useEffectiveStudentId()
  return useQuery({
    queryKey: ['step-history', studentId, limit],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_attempts')
        .select('id,score_total,score_listening,score_reading,score_structure,completed_at')
        .eq('student_id', studentId)
        .eq('kind', 'mock')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

/** The one number the whole section is organised around. */
export function useStepTarget() {
  const studentId = useEffectiveStudentId()
  return useQuery({
    queryKey: ['step-target', studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('step_target_score')
        .eq('id', studentId)
        .maybeSingle()
      if (error) throw error
      return data?.step_target_score ?? null
    },
  })
}

export function useSetStepTarget() {
  const studentId = useEffectiveStudentId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (score) => {
      const n = score == null ? null : Number(score)
      if (n != null && (!Number.isFinite(n) || n < 1 || n > 100)) {
        throw new Error('الهدف لازم يكون بين ١ و١٠٠')
      }
      // .select() so an RLS no-op surfaces as an error instead of silently
      // "succeeding" and leaving the student staring at an unchanged number.
      const { data, error } = await supabase
        .from('students')
        .update({ step_target_score: n })
        .eq('id', studentId)
        .select('step_target_score')
      if (error) throw error
      if (!data?.length) throw new Error('تعذّر حفظ الهدف')
      return data[0].step_target_score
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['step-target', studentId] })
      qc.invalidateQueries({ queryKey: ['step-overview', studentId] })
    },
  })
}

/** Per-(section, grammar point) accuracy, accumulated across every attempt. */
export function useStepPointProgress() {
  const studentId = useEffectiveStudentId()
  return useQuery({
    queryKey: ['step-point-progress', studentId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_student_progress')
        .select('section,grammar_point,attempts_count,correct_count,last_attempt_at')
        .eq('student_id', studentId)
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...r,
        accuracy: r.attempts_count ? r.correct_count / r.attempts_count : null,
      }))
    },
  })
}

/** The mistake bank: what is still open, what is due, and where it clusters. */
export function useStepErrorBank() {
  const studentId = useEffectiveStudentId()
  return useQuery({
    queryKey: ['step-error-bank', studentId],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_error_bank')
        .select('id,item_id,section,grammar_point,question_text,student_answer,correct_answer,explanation,times_seen,times_correct,mastered,next_review_at')
        .eq('student_id', studentId)
        .order('times_seen', { ascending: false })
      if (error) throw error
      const rows = data ?? []
      const open = rows.filter((r) => !r.mastered)
      const now = Date.now()
      const byPoint = {}
      for (const r of open) {
        const k = r.grammar_point || r.section || 'other'
        byPoint[k] = (byPoint[k] ?? 0) + 1
      }
      return {
        rows,
        open,
        mastered: rows.filter((r) => r.mastered),
        due: open.filter((r) => !r.next_review_at || new Date(r.next_review_at).getTime() <= now),
        byPoint,
      }
    },
  })
}

/**
 * Everything the home screen needs, derived rather than stored — a cached
 * "current score" would go stale the moment a paper is submitted.
 */
export function useStepOverview() {
  const { data: history, isLoading: hLoading } = useStepHistory(12)
  const { data: target, isLoading: tLoading } = useStepTarget()
  const { data: bank, isLoading: bLoading } = useStepErrorBank()

  const mocks = history ?? []
  const latest = mocks[0] ?? null
  const previous = mocks[1] ?? null
  const score = latest?.score_total != null ? Number(latest.score_total) : null
  const delta = score != null && previous?.score_total != null
    ? score - Number(previous.score_total)
    : null

  // Which section costs the most marks. Compared on the SHARE of the section a
  // student is losing, not on raw wrong answers — reading and structure are 40
  // questions each while listening is 20, so raw counts would always accuse the
  // big sections.
  const sections = latest
    ? [
        { key: 'listening', pct: latest.score_listening },
        { key: 'reading', pct: latest.score_reading },
        { key: 'structure', pct: latest.score_structure },
      ].filter((s) => s.pct != null).map((s) => ({ ...s, pct: Number(s.pct) }))
    : []
  const weakest = sections.length
    ? sections.reduce((a, b) => (b.pct < a.pct ? b : a))
    : null

  return {
    isLoading: hLoading || tLoading || bLoading,
    score,
    delta,
    target: target ?? null,
    gap: score != null && target != null ? Math.max(0, target - score) : null,
    onTarget: score != null && target != null && score >= target,
    attempts: mocks.length,
    latest,
    history: mocks,
    sections,
    weakest,
    openErrors: bank?.open?.length ?? 0,
    dueErrors: bank?.due?.length ?? 0,
  }
}
