// Error Bank hook — reads ielts_error_bank, writes SM-2 review state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const SKILL_LABELS = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }

// ─── SM-2 lite intervals ──────────────────────────────────────────────────────
// 'hard' → +1 day, 'good' → +7 days, 'mastered' → status mastered
function nextReviewDate(difficulty) {
  const now = new Date()
  if (difficulty === 'hard') now.setDate(now.getDate() + 1)
  else if (difficulty === 'good') now.setDate(now.getDate() + 7)
  return now.toISOString()
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function useErrorStats(studentId) {
  return useQuery({
    queryKey: ['v3-error-stats', studentId],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('skill_type, mastered, next_review_at')
        .eq('student_id', studentId)
      if (error) throw error
      const rows = data || []
      const now = new Date()
      const total     = rows.length
      const mastered  = rows.filter(r => r.mastered).length
      const due       = rows.filter(r => !r.mastered && (!r.next_review_at || new Date(r.next_review_at) <= now)).length
      const inReview  = rows.filter(r => !r.mastered && r.next_review_at && new Date(r.next_review_at) > now).length
      const bySkill   = {}
      for (const r of rows) {
        if (!bySkill[r.skill_type]) bySkill[r.skill_type] = { total: 0, mastered: 0 }
        bySkill[r.skill_type].total++
        if (r.mastered) bySkill[r.skill_type].mastered++
      }
      return { total, mastered, due, inReview, bySkill }
    },
  })
}

// ─── List with filters ────────────────────────────────────────────────────────

export function useErrorList(studentId, { skill = null, status = 'all', sort = 'due' } = {}) {
  return useQuery({
    queryKey: ['v3-error-list', studentId, skill, status, sort],
    enabled: !!studentId,
    staleTime: 15 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_error_bank')
        .select('id, skill_type, question_type, question_text, student_answer, correct_answer, explanation, times_seen, times_correct, mastered, next_review_at, first_seen_at, last_reviewed_at')
        .eq('student_id', studentId)

      if (skill) q = q.eq('skill_type', skill)
      if (status === 'unreviewed') q = q.eq('mastered', false).is('last_reviewed_at', null)
      else if (status === 'review') q = q.eq('mastered', false).not('last_reviewed_at', 'is', null)
      else if (status === 'mastered') q = q.eq('mastered', true)
      else q = q.eq('mastered', false)  // default: show non-mastered

      if (sort === 'due') q = q.order('next_review_at', { ascending: true, nullsFirst: true })
      else if (sort === 'newest') q = q.order('first_seen_at', { ascending: false })
      else q = q.order('first_seen_at', { ascending: true })

      q = q.limit(100)
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

// ─── Due items (for Review Session) ──────────────────────────────────────────

export function useDueErrors(studentId, limit = 20) {
  return useQuery({
    queryKey: ['v3-errors-due', studentId, limit],
    enabled: !!studentId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('id, skill_type, question_type, question_text, student_answer, correct_answer, explanation, times_seen, times_correct, next_review_at')
        .eq('student_id', studentId)
        .eq('mastered', false)
        .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
        .order('next_review_at', { ascending: true, nullsFirst: true })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// ─── Writing/Speaking improvement tips (from ielts_submissions) ───────────────

export function useImprovementTips(studentId, limit = 20) {
  return useQuery({
    queryKey: ['v3-improvement-tips', studentId],
    enabled: !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('id, submission_type, band_score, ai_feedback, evaluated_at')
        .eq('student_id', studentId)
        .not('evaluated_at', 'is', null)
        .order('evaluated_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      // Extract improvement tips from ai_feedback
      const tips = []
      for (const sub of (data || [])) {
        const fb = sub.ai_feedback || {}
        const bullets = fb.improvement_tips_ar || fb.weaknesses || []
        bullets.forEach((b, i) => {
          tips.push({
            id: `${sub.id}_tip_${i}`,
            source_id: sub.id,
            skill_type: sub.submission_type?.startsWith('writing') ? 'writing' : 'speaking',
            text: typeof b === 'string' ? b : b?.text || String(b),
            band_score: sub.band_score,
            evaluated_at: sub.evaluated_at,
          })
        })
      }
      return tips
    },
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMarkReviewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, studentId, difficulty }) => {
      const isMastered = difficulty === 'mastered'
      const { error } = await supabase
        .from('ielts_error_bank')
        .update({
          mastered: isMastered,
          next_review_at: isMastered ? null : nextReviewDate(difficulty),
          last_reviewed_at: new Date().toISOString(),
          times_seen: supabase.rpc ? undefined : undefined, // increment via app logic below
        })
        .eq('id', id)
        .eq('student_id', studentId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v3-error-stats', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['v3-errors-due', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['v3-error-list', vars.studentId] })
    },
  })
}

export function useAddNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, studentId, notes }) => {
      const { error } = await supabase
        .from('ielts_error_bank')
        .update({ notes })
        .eq('id', id)
        .eq('student_id', studentId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v3-error-list', vars.studentId] })
    },
  })
}

export { SKILL_LABELS }
